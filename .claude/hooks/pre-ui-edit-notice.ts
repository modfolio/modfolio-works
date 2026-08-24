/**
 * scripts/hooks/pre-ui-edit-notice.ts
 *
 * PreToolUse Edit|Write hook. Non-blocking reminder when editing a UI file,
 * pointing to the design-tokens + layout-patterns skills.
 */

import { editedFiles, readHookInput } from "./_lib.ts";

const UI_EXT = /\.(css|svelte|tsx|jsx|astro|vue)$/i;

const input = await readHookInput();
const files = editedFiles(input);
// CLI 동작 불변 — `bun run <file>` 은 `import.meta.main` 이 참이다.
// 가드가 없으면 이 모듈을 **import 하는 테스트가 프로세스째 종료**된다
// (2026-08-25 실측: `payment-ledger-clean` 을 import 하자 훅 스위트 15개가 돌았다).
if (import.meta.main) {
	if (files.some((f) => UI_EXT.test(f))) {
		console.log(
			"UI file modified. Recommended: /design-tokens + /layout-patterns 확인.",
		);
	}

	process.exit(0);
}
