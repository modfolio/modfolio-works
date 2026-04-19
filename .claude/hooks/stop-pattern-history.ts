/**
 * scripts/hooks/stop-pattern-history.ts
 *
 * Stop hook. Scans changed files for common pattern violations and updates
 * memory/pattern-history.{md,jsonl}. Deterministic replacement for the
 * previous Claude agent hook — no tokens burned per session, no probabilistic
 * output. Reported by gistcore (Issue 4, 2026-04-16): the agent version wrote
 * empty jsonl and skipped real violations.
 *
 * V2.4: honors PATTERN_HISTORY_MODE env (off|warn|block). warn and block are
 * informational at this hook stage — the actual commit block happens in
 * pre-commit-guard.ts. Here we add a prominent stderr banner when block mode
 * is on and an ESCALATE row is newly added or updated, so Claude sees the
 * signal before the next commit.
 *
 * Self-skip: changedFiles() in _lib excludes memory/pattern-history.* so this
 * hook does not loop by detecting its own writes.
 */

import {
	existsSync,
	mkdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { changedFiles, DETECTOR_SOURCE_FILES, gitRoot } from "./_lib.ts";

interface PatternRule {
	id: string;
	test: (file: string, content: string) => boolean;
}

const UI_EXT = /\.(css|svelte|tsx|jsx|astro|vue)$/i;
const TS_EXT = /\.(ts|tsx)$/i;
const CODE_EXT = /\.(ts|tsx|svelte|astro|vue)$/i;

const RULES: PatternRule[] = [
	{
		id: "hardcoded_color",
		test: (file, content) => {
			if (!UI_EXT.test(file)) return false;
			const lines = content.split(/\r?\n/);
			for (const line of lines) {
				if (/var\(/.test(line)) continue;
				if (/#[0-9a-fA-F]{3,8}(?:[^a-zA-Z]|$)|rgb\(|hsl\(|oklch\(/.test(line))
					return true;
			}
			return false;
		},
	},
	{
		id: "ts_ignore_or_any",
		// Self-exclusion: the pattern regex is a string literal inside the detector
		// sources themselves — a naive scan treats those strings as violations.
		test: (file, content) =>
			TS_EXT.test(file) &&
			!DETECTOR_SOURCE_FILES.has(file) &&
			/@ts-ignore|as\s+any\b/.test(content),
	},
	{
		id: "biome_ignore_file",
		test: (file, content) =>
			CODE_EXT.test(file) &&
			/biome-ignore\s+(?:lint|assist)\s+file/.test(content),
	},
];

interface PatternRow {
	pattern: string;
	count: number;
	lastSeen: string;
	status: "TRACKING" | "ESCALATE";
	files: string[];
}

function today(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ensureDir(path: string): void {
	const dir = dirname(path);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJsonl(path: string): PatternRow[] {
	if (!existsSync(path)) return [];
	try {
		const rows: PatternRow[] = [];
		for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
			if (!line.trim()) continue;
			try {
				const parsed = JSON.parse(line) as Partial<PatternRow>;
				if (typeof parsed.pattern !== "string") continue;
				rows.push({
					pattern: parsed.pattern,
					count: typeof parsed.count === "number" ? parsed.count : 1,
					lastSeen:
						typeof parsed.lastSeen === "string" ? parsed.lastSeen : today(),
					status: parsed.status === "ESCALATE" ? "ESCALATE" : "TRACKING",
					files: Array.isArray(parsed.files)
						? parsed.files.filter((x) => typeof x === "string")
						: [],
				});
			} catch {}
		}
		return rows;
	} catch {
		return [];
	}
}

function renderMarkdown(rows: PatternRow[]): string {
	const header =
		"| Pattern | Count | Last Seen | Status |\n|---------|-------|-----------|--------|";
	const body = rows
		.slice()
		.sort((a, b) => a.pattern.localeCompare(b.pattern))
		.map((r) => `| ${r.pattern} | ${r.count} | ${r.lastSeen} | ${r.status} |`)
		.join("\n");
	return `# Pattern History\n\n> Stop hook auto-update. Violation pattern tracking + escalation.\n\n${header}\n${body}\n`;
}

function writeJsonl(path: string, rows: PatternRow[]): void {
	const lines = rows.map((r) => JSON.stringify(r)).join("\n");
	writeFileSync(path, `${lines}\n`, "utf-8");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const cwd = gitRoot();
const files = changedFiles(cwd);
if (files.length === 0) process.exit(0);

const violationsPerFile = new Map<string, Set<string>>();
for (const file of files) {
	const abs = join(cwd, file);
	if (!existsSync(abs)) continue;
	try {
		if (!statSync(abs).isFile()) continue;
	} catch {
		continue;
	}
	let content: string;
	try {
		content = readFileSync(abs, "utf-8");
	} catch {
		continue;
	}

	for (const rule of RULES) {
		if (rule.test(file, content)) {
			let set = violationsPerFile.get(rule.id);
			if (!set) {
				set = new Set<string>();
				violationsPerFile.set(rule.id, set);
			}
			set.add(file);
		}
	}
}

if (violationsPerFile.size === 0) process.exit(0);

const jsonlPath = join(cwd, "memory", "pattern-history.jsonl");
const mdPath = join(cwd, "memory", "pattern-history.md");
ensureDir(jsonlPath);

const existing = new Map<string, PatternRow>();
for (const row of readJsonl(jsonlPath)) {
	existing.set(row.pattern, row);
}

const stamp = today();
for (const [patternId, fileSet] of violationsPerFile) {
	const prior = existing.get(patternId);
	const mergedFiles = new Set([...(prior?.files ?? []), ...fileSet]);
	const nextCount = (prior?.count ?? 0) + 1;
	existing.set(patternId, {
		pattern: patternId,
		count: nextCount,
		lastSeen: stamp,
		status: nextCount >= 3 ? "ESCALATE" : "TRACKING",
		files: [...mergedFiles].sort(),
	});
}

const rows = [...existing.values()];
writeJsonl(jsonlPath, rows);
writeFileSync(mdPath, renderMarkdown(rows), "utf-8");

// V2.4: surface a banner for ESCALATE rows when PATTERN_HISTORY_MODE=block.
const mode = (process.env.PATTERN_HISTORY_MODE ?? "warn").toLowerCase();
if (mode === "block") {
	const escalated = rows.filter((r) => r.status === "ESCALATE");
	if (escalated.length > 0) {
		const names = escalated.map((r) => r.pattern).join(", ");
		console.error(
			`[pattern-history] ESCALATE in block mode — ${escalated.length} pattern(s): ${names}. Next commit will be blocked.`,
		);
	}
}

process.exit(0);
