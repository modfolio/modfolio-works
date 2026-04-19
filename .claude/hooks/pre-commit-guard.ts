/**
 * scripts/hooks/pre-commit-guard.ts
 *
 * PreToolUse Bash hook. Before `git commit` runs, execute the project's
 * quality gate (quality:all if available, otherwise check + typecheck).
 *
 * V2.4 addition: when `PATTERN_HISTORY_MODE=block`, also inspect staged
 * files for the `ts_ignore_or_any` CRITICAL pattern before quality gates
 * run — short-circuits the commit with an actionable message instead of
 * waiting for the full test matrix. Honors per-repo `patternExceptions`
 * in `.claude/harness-lock.json`. Default mode is `warn` (log only).
 *
 * On gate failure we exit 2 so Claude Code cancels the commit.
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { bashCommand, DETECTOR_SOURCE_FILES, readHookInput } from "./_lib.ts";

const input = await readHookInput();
const cmd = bashCommand(input);
if (!cmd || !/\bgit\s+commit\b/i.test(cmd)) process.exit(0);

// ─── Pattern block (V2.4) ────────────────────────────────────────────────────

type PatternMode = "off" | "warn" | "block";
function resolvePatternMode(): PatternMode {
	const raw = (process.env.PATTERN_HISTORY_MODE ?? "warn").toLowerCase();
	if (raw === "off" || raw === "block" || raw === "warn") return raw;
	return "warn";
}

function stagedFiles(): string[] {
	try {
		const out = execSync("git diff --name-only --cached", {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		});
		return out
			.split(/\r?\n/)
			.map((s) => s.trim())
			.filter(Boolean);
	} catch {
		return [];
	}
}

function loadPatternExceptions(): Set<string> {
	const lockPath = join(process.cwd(), ".claude", "harness-lock.json");
	if (!existsSync(lockPath)) return new Set();
	try {
		const parsed = JSON.parse(readFileSync(lockPath, "utf-8")) as {
			patternExceptions?: unknown;
		};
		if (Array.isArray(parsed.patternExceptions)) {
			return new Set(
				parsed.patternExceptions.filter(
					(x): x is string => typeof x === "string",
				),
			);
		}
	} catch {
		// ignore malformed lock
	}
	return new Set();
}

const mode = resolvePatternMode();
if (mode !== "off") {
	const exceptions = loadPatternExceptions();
	if (!exceptions.has("ts_ignore_or_any")) {
		const TS_EXT = /\.(ts|tsx)$/i;
		const hits: Array<{ file: string; line: number; text: string }> = [];
		for (const file of stagedFiles()) {
			if (!TS_EXT.test(file)) continue;
			// Self-exclusion: detector source files carry the pattern regex as a
			// string literal — false positive. See DETECTOR_SOURCE_FILES for list.
			if (DETECTOR_SOURCE_FILES.has(file)) continue;
			const abs = join(process.cwd(), file);
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
			const lines = content.split(/\r?\n/);
			for (let i = 0; i < lines.length; i += 1) {
				const text = lines[i] ?? "";
				if (/@ts-ignore|@ts-expect-error|as\s+any\b/.test(text)) {
					hits.push({ file, line: i + 1, text: text.trim().slice(0, 160) });
				}
			}
		}
		if (hits.length > 0) {
			console.error(
				`\n[pattern-guard] ts_ignore_or_any (${mode.toUpperCase()} mode) — ${hits.length} hit(s):`,
			);
			for (const hit of hits) {
				console.error(`  ${hit.file}:${hit.line}  ${hit.text}`);
			}
			if (mode === "block") {
				console.error(
					'\nBLOCKED: fix the root cause or add "ts_ignore_or_any" to harness-lock.json patternExceptions.',
				);
				process.exit(2);
			}
		}
	}
}

// ─── Quality gate (existing behavior) ────────────────────────────────────────

function availableScripts(): Set<string> {
	try {
		const pkg = JSON.parse(
			readFileSync(join(process.cwd(), "package.json"), "utf-8"),
		) as {
			scripts?: Record<string, string>;
		};
		return new Set(Object.keys(pkg.scripts ?? {}));
	} catch {
		return new Set();
	}
}

const scripts = availableScripts();
const steps: string[][] = [];
if (scripts.has("quality:all")) {
	steps.push(["bun", "run", "quality:all"]);
} else {
	if (scripts.has("check")) steps.push(["bun", "run", "check"]);
	if (scripts.has("typecheck")) steps.push(["bun", "run", "typecheck"]);
}

if (steps.length === 0) process.exit(0);

for (const step of steps) {
	const run = spawnSync(step[0] as string, step.slice(1), {
		stdio: "inherit",
		// Windows needs shell:true so the OS resolves `bun` via PATHEXT /
		// where lookups rather than failing on native cmd.exe.
		shell: process.platform === "win32",
	});
	if (run.status !== 0) {
		console.error(`BLOCKED: pre-commit gate failed — ${step.join(" ")}`);
		process.exit(2);
	}
}

process.exit(0);
