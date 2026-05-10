/**
 * scripts/hooks/pre-destructive-guard.ts
 *
 * PreToolUse Bash hook. Blocks destructive git operations and hook-skipping
 * flags. Exit 2 signals Claude Code to cancel the command.
 *
 * Matches: git reset --hard, git clean -f, git checkout -- , --force, --no-verify
 *
 * OWASP Agentic 2026 매핑:
 *   - ASI02 Tool Misuse — destructive Bash 차단 (canon agent-governance.md ASI02)
 *   - ASI09 Human-Agent Trust — 사용자 승인 없는 destructive action 차단
 *
 * Test 자동화: `scripts/modfolio/governance.ts` 의 ASI09 (Bash allowlist 광도 점수)
 * 와 정합. 실 차단 = hook (이 파일), 검사 보고 = governance.ts.
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
