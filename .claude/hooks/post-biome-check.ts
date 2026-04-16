/**
 * scripts/hooks/post-biome-check.ts
 *
 * PostToolUse Edit|Write hook. Runs `bun run check` after a file edit and
 * prints the last few lines of output so the model sees immediate feedback.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
if (lastLines) console.log(lastLines);

process.exit(0);
