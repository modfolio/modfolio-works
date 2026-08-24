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
// CLI 동작 불변 — `bun run <file>` 은 `import.meta.main` 이 참이다.
// 가드가 없으면 이 모듈을 **import 하는 테스트가 프로세스째 종료**된다
// (2026-08-25 실측: `payment-ledger-clean` 을 import 하자 훅 스위트 15개가 돌았다).
if (import.meta.main) {
	if (!cmd) process.exit(0);

	if (/\bgh\s+(api|pr|issue|run)\b/.test(cmd)) {
		console.log(
			"WARNING: GitHub API call detected. Prefer local alternatives first (git log, gh repo view --json). Watch rate limits.",
		);
	}

	process.exit(0);
}
