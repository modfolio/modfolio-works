/**
 * scripts/hooks/pre-commit-guard.ts
 *
 * PreToolUse Bash hook for `git commit`.
 *
 * v3.1 (2026-05-18 — solo pre-production speed): this hook NO LONGER runs the
 * project quality gate (quality:all / check / typecheck) and NEVER exits 2.
 * Running the 30-check matrix on every single commit — with --no-verify also
 * blocked — was the single dominant velocity tax and had no escape hatch.
 *
 * 정공법 is preserved, not deleted: full quality enforcement moved off the
 * per-commit hot path to `pre-push-guard.ts` (non-blocking summary on push)
 * and the hard `/release` gate. See knowledge/canon/solo-main-workflow.md.
 *
 * What remains here: a FAST staged-file pattern notice for
 * `ts_ignore_or_any`. Default `PATTERN_HISTORY_MODE=warn` → log only, exit 0.
 * Only an explicit opt-in `PATTERN_HISTORY_MODE=block` (plus no
 * `patternExceptions` in .claude/harness-lock.json) will short-circuit a
 * commit — that is a deliberate user choice, not the default.
 *
 * OWASP Agentic 2026 매핑:
 *   - ASI06 Memory Poisoning — 패턴 history 추적 (PATTERN_HISTORY_MODE) 으로 anomaly 검출
 */

import { execSync } from "node:child_process";
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

// ─── No quality gate here (v3.1) ─────────────────────────────────────────────
//
// quality:all / check / typecheck no longer run on commit. They moved to the
// non-blocking pre-push-guard.ts and the hard `/release` gate so that the
// commit hot path is instant. Commits never block on quality in solo
// pre-production. Run `bun run quality:all` manually or rely on push/release.

process.exit(0);
