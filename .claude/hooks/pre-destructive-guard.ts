/**
 * scripts/hooks/pre-destructive-guard.ts
 *
 * PreToolUse Bash hook. Blocks destructive git operations and hook-skipping
 * flags. Exit 2 signals Claude Code to cancel the command.
 *
 * Matches: git reset --hard, git clean -f, git checkout -- , --force, --no-verify
 */

import { bashCommand, readHookInput } from "./_lib.ts";

const DESTRUCTIVE = [
	/\bgit\s+reset\s+--hard\b/i,
	/\bgit\s+clean\s+-f\b/i,
	/\bgit\s+checkout\s+--\s/i,
	/\b--force\b/,
	/\b--no-verify\b/,
];

const input = await readHookInput();
const cmd = bashCommand(input);
if (!cmd) process.exit(0);

for (const pattern of DESTRUCTIVE) {
	if (pattern.test(cmd)) {
		console.error(
			`BLOCKED: destructive command detected (pattern ${pattern}).`,
		);
		process.exit(2);
	}
}

process.exit(0);
