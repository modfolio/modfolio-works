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
if (files.some((f) => UI_EXT.test(f))) {
	console.log(
		"UI file modified. Recommended: /design-tokens + /layout-patterns 확인.",
	);
}

process.exit(0);
