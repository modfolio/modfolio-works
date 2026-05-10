/**
 * scripts/hooks/pre-commit-guard.ts
 *
 * PreToolUse Bash hook. Before `git commit` runs, execute the project's
 * quality gate (quality:all if available, otherwise check + typecheck).
 *
 * V2.4 addition: when `PATTERN_HISTORY_MODE=block`, also inspect staged
 * files for the `ts_ignore_or_any` CRITICAL pattern before quality gates
 * run — short-circuits the commit with an actionable message instead of
 * waiting for the full test matrix. Honors per-repo `patternExceptions`
 * in `.claude/harness-lock.json`. Default mode is `warn` (log only).
 *
 * On gate failure we exit 2 so Claude Code cancels the commit.
 *
 * OWASP Agentic 2026 매핑:
 *   - ASI02 Tool Misuse — quality gate 강제 + --no-verify 차단 (canon agent-governance.md ASI02)
 *   - ASI04 Supply Chain — ts_ignore_or_any PATTERN 차단으로 정공법 정합
 *   - ASI06 Memory Poisoning — 패턴 history 추적 (PATTERN_HISTORY_MODE) 으로 anomaly 검출
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
	bashCommand,
	DETECTOR_SOURCE_FILES,
	isSvelteKitProject,
	readHookInput,
	spawnSyncWithSvelteKitRetry,
} from "./_lib.ts";

const input = await readHookInput();
const cmd = bashCommand(input);
if (!cmd || !/\bgit\s+commit\b/i.test(cmd)) process.exit(0);

// ─── Pattern block (V2.4) ────────────────────────────────────────────────────

type PatternMode = "off" | "warn" | "block";
function resolvePatternMode(): PatternMode {
	const raw = (process.env.PATTERN_HISTORY_MODE ?? "warn").toLowerCase();
	if (raw === "off" || raw === "block" || raw === "warn") return raw;
	return "warn";
}

function stagedFiles(): string[] {
	try {
		const out = execSync("git diff --name-only --cached", {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		});
		return out
			.split(/\r?\n/)
			.map((s) => s.trim())
			.filter(Boolean);
	} catch {
		return [];
	}
}

function loadPatternExceptions(): Set<string> {
	const lockPath = join(process.cwd(), ".claude", "harness-lock.json");
	if (!existsSync(lockPath)) return new Set();
	try {
		const parsed = JSON.parse(readFileSync(lockPath, "utf-8")) as {
			patternExceptions?: unknown;
		};
		if (Array.isArray(parsed.patternExceptions)) {
			return new Set(
				parsed.patternExceptions.filter(
					(x): x is string => typeof x === "string",
				),
			);
		}
	} catch {
		// ignore malformed lock
	}
	return new Set();
}

const mode = resolvePatternMode();
if (mode !== "off") {
	const exceptions = loadPatternExceptions();
	if (!exceptions.has("ts_ignore_or_any")) {
		const TS_EXT = /\.(ts|tsx)$/i;
		const hits: Array<{ file: string; line: number; text: string }> = [];
		for (const file of stagedFiles()) {
			if (!TS_EXT.test(file)) continue;
			// Self-exclusion: detector source files carry the pattern regex as a
			// string literal — false positive. See DETECTOR_SOURCE_FILES for list.
			if (DETECTOR_SOURCE_FILES.has(file)) continue;
			const abs = join(process.cwd(), file);
			if (!existsSync(abs)) continue;
			try {
				if (!statSync(abs).isFile()) continue;
			} catch {
				continue;
			}
			let content: string;
			try {
				content = readFileSync(abs, "utf-8");
			} catch {
				continue;
			}
			const lines = content.split(/\r?\n/);
			for (let i = 0; i < lines.length; i += 1) {
				const text = lines[i] ?? "";
				if (/@ts-ignore|@ts-expect-error|as\s+any\b/.test(text)) {
					hits.push({ file, line: i + 1, text: text.trim().slice(0, 160) });
				}
			}
		}
		if (hits.length > 0) {
			console.error(
				`\n[pattern-guard] ts_ignore_or_any (${mode.toUpperCase()} mode) — ${hits.length} hit(s):`,
			);
			for (const hit of hits) {
				console.error(`  ${hit.file}:${hit.line}  ${hit.text}`);
			}
			if (mode === "block") {
				console.error(
					'\nBLOCKED: fix the root cause or add "ts_ignore_or_any" to harness-lock.json patternExceptions.',
				);
				process.exit(2);
			}
		}
	}
}

// ─── Quality gate (existing behavior) ────────────────────────────────────────

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

// WSL 호스트의 PATH 에서 Windows mount (`/mnt/c/...`) 항목 제거.
// `bun run` 이 bun 의 child process spawn 시 두 번째 PATH 의 Windows bun
// shim 을 잡아 cmd.exe 를 trigger 하는 회귀 방지 (2026-04-26 WSL 발견).
// process.platform === "linux" 일 때만 적용 — Windows native 환경 영향 없음.
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

// Windows host 가 WSL repo 를 UNC path (`\\wsl.localhost\...`) 로 접근 시,
// Windows bun 은 cmd.exe 를 child shell 로 사용해 UNC path 를 거부한다.
// wsl.exe 위임도 PATH translation 실패 (Windows PATH 가 그대로 전달).
// 이 환경에서는 hook 이 quality:all 을 실행할 수 없는 platform 한계 →
// informational SKIP. 사용자는 WSL native shell 에서 사전 quality:all
// 실행을 권고 (CLAUDE.md 의 정공법 워크플로우).
const isWindowsWslRepo =
	process.platform === "win32" && /^\\\\wsl/i.test(process.cwd());

if (isWindowsWslRepo) {
	console.error(
		"[pre-commit-guard] Windows host + WSL UNC path 감지 — quality:all 자동 실행 platform 한계. 사용자가 WSL native shell 에서 `bun run quality:all` 사전 실행 권고. exit 0.",
	);
	process.exit(0);
}

// svelte-kit sibling 이면 typecheck 단계 직전에 svelte-kit sync 사전 호출 (race 회피).
// .svelte-kit/types/src/routes/proxy+layout.server.ts 가 아직 build 중인데 typecheck
// 가 stat → ENOENT 회귀 (modfolio-pay / modfolio-press WSL2 보고).
const projectRoot = process.cwd();
const isSvelteKit = isSvelteKitProject(projectRoot);

for (const step of steps) {
	// Bun 명령은 process.execPath (현재 hook 실행 중인 bun 자체) 로 강제.
	const cmd = step[0] === "bun" ? process.execPath : (step[0] as string);
	const isTypecheck = step.includes("typecheck") || step.includes("check");
	if (isSvelteKit && isTypecheck) {
		// svelte-kit sync — `.svelte-kit/types/` 생성 wait. exit !== 0 면 진행 (typecheck 가 자체 진단).
		spawnSync(process.execPath, ["x", "svelte-kit", "sync"], {
			stdio: "inherit",
			env: sanitizedEnv,
			shell: process.platform === "win32",
		});
	}
	const run = spawnSyncWithSvelteKitRetry(cmd, step.slice(1), {
		stdio: "inherit",
		env: sanitizedEnv,
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
