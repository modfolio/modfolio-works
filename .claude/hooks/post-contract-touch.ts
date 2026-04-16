/**
 * scripts/hooks/post-contract-touch.ts
 *
 * PostToolUse Edit|Write hook. Flags contract schema changes with a reminder
 * to run schema-impact before completing the change.
 */

import { editedFiles, readHookInput } from "./_lib.ts";

const input = await readHookInput();
const files = editedFiles(input);
if (files.some((f) => f.includes("contracts/"))) {
	console.log(
		"Contract change detected. Run `bun run schema-impact` after completion to check ripple effects.",
	);
}

process.exit(0);
