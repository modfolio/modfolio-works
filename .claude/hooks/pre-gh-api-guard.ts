/**
 * scripts/hooks/pre-gh-api-guard.ts
 *
 * PreToolUse Bash hook. Non-blocking notice when `gh api|pr|issue|run` is
 * invoked, because these count against GitHub rate limits faster than local
 * alternatives (git, gh repo view --json, ...).
 */

import { bashCommand, readHookInput } from "./_lib.ts";

const input = await readHookInput();
const cmd = bashCommand(input);
if (!cmd) process.exit(0);

if (/\bgh\s+(api|pr|issue|run)\b/.test(cmd)) {
	console.log(
		"WARNING: GitHub API call detected. Prefer local alternatives first (git log, gh repo view --json). Watch rate limits.",
	);
}

process.exit(0);
