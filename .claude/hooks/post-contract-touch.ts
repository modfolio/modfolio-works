/**
 * scripts/hooks/post-contract-touch.ts
 *
 * PostToolUse Edit|Write hook. Flags contract schema changes with a reminder
 * to run schema-impact before completing the change. Records hook duration
 * to OTLP collector (silent when offline).
 */

import { editedFiles, readHookInput, recordHookDuration } from "./_lib.ts";

const start = performance.now();

const input = await readHookInput();
const files = editedFiles(input);
if (files.some((f) => f.includes("contracts/"))) {
	console.log(
		"Contract change detected. Run `bun run schema-impact` after completion to check ripple effects.",
	);
}

await recordHookDuration("post-contract-touch", performance.now() - start);

process.exit(0);
