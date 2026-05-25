/**
 * scripts/hooks/pre-push-guard.ts
 *
 * PreToolUse Bash hook for `git push`.
 *
 * v3.1 (2026-05-18 — solo pre-production speed). This is where the project
 * quality gate moved to after it was removed from pre-commit-guard.ts. It
 * runs `quality:all` (or `check` + `typecheck`) once, right before code
 * leaves the machine, and prints a concise PASS/FAIL summary the model and
 * user can see — but it NEVER exits 2, so a push is never blocked.
 *
 * Rationale (정공법 정합): code-quality enforcement is not deleted, only
 * moved off the per-commit hot path. The HARD gate remains the `/release`
 * pipeline (`bun run release:gate`). Pre-push gives an early, visible signal
 * without taxing every commit and without an inescapable block (--no-verify
 * is also no longer blocked by pre-destructive-guard).
 *
 * Cross-platform: preserves the WSL PATH-sanitisation and Windows-UNC skip
 * that the old pre-commit gate carried (2026-04-26 WSL regression fix) so we
 * do not regress those environments.
 *
 * OWASP Agentic 2026 매핑:
 *   - ASI02 Tool Misuse — quality 가시화 (비차단, 사용자 판단 보존)
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	bashCommand,
	isSvelteKitProject,
	readHookInput,
	spawnSyncWithSvelteKitRetry,
} from "./_lib.ts";

const input = await readHookInput();
const cmd = bashCommand(input);
// Only act on a real `git push`. `git push --help`, `git push-something`, etc.
// fall through untouched.
if (!cmd || !/\bgit\s+push\b/i.test(cmd)) process.exit(0);

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

// WSL 호스트의 PATH 에서 Windows mount (`/mnt/c/...`) 항목 제거 — `bun run`
// 이 child spawn 시 Windows bun shim 을 잡아 cmd.exe 를 trigger 하는 회귀
// 방지 (2026-04-26 WSL 발견). linux 일 때만 적용.
function sanitizePath(): NodeJS.ProcessEnv {
	if (process.platform !== "linux") return process.env;
	const filtered = (process.env.PATH ?? "")
		.split(":")
		.filter(
			(p) =>
				p.length > 0 && !p.startsWith("/mnt/c/") && !p.startsWith("/mnt/d/"),
		)
		.join(":");
	return { ...process.env, PATH: filtered };
}

const sanitizedEnv = sanitizePath();

// Windows host 가 WSL repo 를 UNC path (`\\wsl.localhost\...`) 로 접근하면
// Windows bun 이 cmd.exe 를 child shell 로 써 UNC 를 거부 → hook 이 quality
// 를 실행할 수 없는 platform 한계. 비차단 informational SKIP.
const isWindowsWslRepo =
	process.platform === "win32" && /^\\\\wsl/i.test(process.cwd());
if (isWindowsWslRepo) {
	console.error(
		"[pre-push-guard] Windows host + WSL UNC path — quality 자동 실행 platform 한계. WSL native shell 에서 `bun run quality:all` 권고. push 진행 (비차단).",
	);
	process.exit(0);
}

const projectRoot = process.cwd();
const isSvelteKit = isSvelteKitProject(projectRoot);

let anyFailed = false;
for (const step of steps) {
	const bin = step[0] === "bun" ? process.execPath : (step[0] as string);
	const isTypecheck = step.includes("typecheck") || step.includes("check");
	if (isSvelteKit && isTypecheck) {
		// `.svelte-kit/types/` 생성 race 회피 (modfolio-pay / modfolio-press WSL2).
		spawnSync(process.execPath, ["x", "svelte-kit", "sync"], {
			stdio: "ignore",
			env: sanitizedEnv,
			shell: process.platform === "win32",
		});
	}
	const run = spawnSyncWithSvelteKitRetry(bin, step.slice(1), {
		encoding: "utf-8",
		env: sanitizedEnv,
		shell: process.platform === "win32",
	});
	const label = step.join(" ");
	if (run.status === 0) {
		console.error(`[pre-push-guard] ✓ ${label} passed`);
	} else {
		anyFailed = true;
		const tail = `${run.stdout ?? ""}${run.stderr ?? ""}`
			.split(/\r?\n/)
			.filter((l) => l.trim())
			.slice(-15)
			.join("\n");
		console.error(
			`[pre-push-guard] ⚠ ${label} FAILED (non-blocking — push proceeds).\n${tail}\n` +
				"→ 정공법: fix the root cause before `/release` (release:gate is the hard gate).",
		);
	}
}

if (anyFailed) {
	console.error(
		"[pre-push-guard] quality not green — code is being pushed anyway (solo pre-production policy). Address before shipping via /release.",
	);
}

// NEVER block a push. Quality is visible; the decision stays with the user.
process.exit(0);
