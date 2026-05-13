/**
 * scripts/hooks/post-contract-touch.ts
 *
 * PostToolUse Edit|Write hook. Flags contract schema changes with a reminder
 * to run schema-impact before completing the change. Records hook duration
 * to OTLP collector (silent when offline).
 *
 * Augment mode (CONTRACT_TOUCH_AUGMENT=1, v2.34 P0.4):
 *   hookSpecificOutput.updatedToolOutput 으로 reminder 를 tool_response 에 inline.
 *   Claude Code v2.1.x 의 PostToolUse hookSpecificOutput.updatedToolOutput schema
 *   활용. opt-in (default off) — augment 활성 시 모델이 즉시 reminder 봄.
 */

import { editedFiles, readHookInput, recordHookDuration } from "./_lib.ts";

const start = performance.now();

const input = await readHookInput();
const files = editedFiles(input);

if (files.some((f) => f.includes("contracts/"))) {
	const reminder =
		"Contract change detected. Run `bun run schema-impact` after completion to check ripple effects.";
	const augment = process.env.CONTRACT_TOUCH_AUGMENT === "1";

	if (augment) {
		// v2.34 P0.4: PostToolUse hookSpecificOutput.updatedToolOutput 으로 reminder inline
		const tr = input.tool_response ?? {};
		const augmented: Record<string, unknown> = { ...tr };
		const inlineMsg = `\n\n[post-contract-touch]\n${reminder}`;
		let appended = false;
		for (const key of ["content", "stdout", "output", "message"] as const) {
			const v = tr[key];
			if (typeof v === "string") {
				augmented[key] = `${v}${inlineMsg}`;
				appended = true;
				break;
			}
		}
		if (!appended) augmented.message = inlineMsg.trim();

		const output = {
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				updatedToolOutput: augmented,
			},
		};
		process.stdout.write(JSON.stringify(output));
	} else {
		console.log(reminder);
	}
}

await recordHookDuration("post-contract-touch", performance.now() - start);

process.exit(0);
