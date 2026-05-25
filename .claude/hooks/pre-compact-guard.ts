/**
 * scripts/hooks/pre-compact-guard.ts
 *
 * PreCompact hook.
 *
 * v3.1 (2026-05-18 — solo pre-production). NO LONGER blocks compaction.
 * The hard block (`{ decision: "block" }`) wedged long sessions: hook writes
 * (pattern-history, feedback log) and normal multi-file work routinely cross
 * the 10-file threshold, so compaction kept getting denied and context
 * filled up. For a solo dev whose work is continuously committed to main and
 * fully in git history, that block protects very little and costs a lot.
 *
 * It now only prints an informational notice (stderr) when plan/journal
 * drafts are unstaged or a user lock is present, then ALWAYS allows
 * compaction (exit 0, no decision). The user can still commit drafts first
 * if they want — the choice stays with them, nothing is forced.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readHookInput } from "./_lib.ts";

await readHookInput();

const cwd = process.cwd();
const reasons: string[] = [];

const lockPath = join(cwd, ".claude", "plans", ".active.lock");
if (existsSync(lockPath)) {
	reasons.push("active plan lock present (.claude/plans/.active.lock)");
}

const status = spawnSync("git", ["status", "--porcelain"], {
	encoding: "utf-8",
	shell: process.platform === "win32",
});

if (status.status === 0) {
	const lines = (status.stdout ?? "").split("\n").filter(Boolean);
	const planOrJournal = lines.some(
		(l) =>
			/\.claude\/plans\/.*\.md\s*$/.test(l) ||
			/knowledge\/journal\/.*\.md\s*$/.test(l),
	);
	if (planOrJournal) {
		reasons.push("unstaged plan or journal edit detected (draft loss risk)");
	}
	if (lines.length >= 10) {
		reasons.push(`${lines.length} uncommitted changes (threshold: 10)`);
	}
}

if (reasons.length > 0) {
	// Informational only — NEVER block. No `decision` field is emitted, so
	// Claude Code proceeds with compaction normally.
	console.error(
		`[pre-compact-guard] notice (non-blocking): ${reasons.join("; ")}. ` +
			"Commit drafts first if you want them preserved verbatim — your call.",
	);
}

process.exit(0);
