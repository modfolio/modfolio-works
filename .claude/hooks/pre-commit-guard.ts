/**
 * scripts/hooks/pre-commit-guard.ts
 *
 * PreToolUse Bash hook. Before `git commit` runs, execute the project's
 * quality gate (quality:all if available, otherwise check + typecheck).
 *
 * On gate failure we exit 2 so Claude Code cancels the commit.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bashCommand, readHookInput } from "./_lib.ts";

const input = await readHookInput();
const cmd = bashCommand(input);
if (!cmd || !/\bgit\s+commit\b/i.test(cmd)) process.exit(0);

function availableScripts(): Set<string> {
	try {
		const pkg = JSON.parse(
			readFileSync(join(process.cwd(), "package.json"), "utf-8"),
		) as {
			scripts?: Record<string, string>;
		};
		return new Set(Object.keys(pkg.scripts ?? {}));
	} catch {
		return new Set();
	}
}

const scripts = availableScripts();
const steps: string[][] = [];
if (scripts.has("quality:all")) {
	steps.push(["bun", "run", "quality:all"]);
} else {
	if (scripts.has("check")) steps.push(["bun", "run", "check"]);
	if (scripts.has("typecheck")) steps.push(["bun", "run", "typecheck"]);
}

if (steps.length === 0) process.exit(0);

for (const step of steps) {
	const run = spawnSync(step[0] as string, step.slice(1), {
		stdio: "inherit",
		// Windows needs shell:true so the OS resolves `bun` via PATHEXT /
		// where lookups rather than failing on native cmd.exe.
		shell: process.platform === "win32",
	});
	if (run.status !== 0) {
		console.error(`BLOCKED: pre-commit gate failed — ${step.join(" ")}`);
		process.exit(2);
	}
}

process.exit(0);
