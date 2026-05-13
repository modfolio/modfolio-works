/**
 * scripts/hooks/post-biome-check.ts
 *
 * PostToolUse Edit|Write hook. Runs `bun run check` after a file edit and
 * prints the last few lines of output so the model sees immediate feedback.
 * Records hook duration to OTLP collector (silent when offline).
 *
 * Augment mode (BIOME_CHECK_AUGMENT=1, v2.34 P0.4):
 *   hookSpecificOutput.updatedToolOutput 으로 lint 결과를 tool_response 에 inline.
 *   Claude Code v2.1.x 의 PostToolUse hookSpecificOutput.updatedToolOutput schema
 *   활용. opt-in (default off) — augment 활성 시 모델이 즉시 lint warning 봄.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readHookInput, recordHookDuration } from "./_lib.ts";

function hasCheckScript(): boolean {
	try {
		const pkg = JSON.parse(
			readFileSync(join(process.cwd(), "package.json"), "utf-8"),
		) as {
			scripts?: Record<string, string>;
		};
		return Boolean(pkg.scripts?.check);
	} catch {
		return false;
	}
}

if (!hasCheckScript()) process.exit(0);

const augment = process.env.BIOME_CHECK_AUGMENT === "1";

const start = performance.now();

const result = spawnSync("bun", ["run", "check"], {
	encoding: "utf-8",
	// Windows needs shell:true so the OS resolves `bun` via PATHEXT rather
	// than failing on native cmd.exe.
	shell: process.platform === "win32",
});

const combined = `${result.stdout ?? ""}${result.stderr ?? ""}`;
const lastLines = combined
	.split(/\r?\n/)
	.filter((l) => l.trim())
	.slice(-5)
	.join("\n");

if (augment && lastLines) {
	// v2.34 P0.4: PostToolUse hookSpecificOutput.updatedToolOutput 으로 lint 결과 inline
	const input = await readHookInput();
	const tr = input.tool_response ?? {};
	const augmented: Record<string, unknown> = { ...tr };
	const inlineMsg = `\n\n[post-biome-check]\n${lastLines}`;
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
} else if (lastLines) {
	console.log(lastLines);
}

await recordHookDuration("post-biome-check", performance.now() - start);

process.exit(0);
