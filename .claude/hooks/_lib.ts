/**
 * scripts/hooks/_lib.ts
 *
 * Shared helpers for Claude Code hook scripts. All hooks read a JSON payload
 * from stdin and signal intent via exit code — no reliance on $TOOL_INPUT
 * shell variables, tail/grep/sed/od, or HEREDOCs. Runs unchanged on Windows
 * PowerShell, macOS, Linux, and WSL since bun is the only runtime dependency.
 *
 * Reported by: atelier-and-folio (Issue 3, 2026-04-16) — unix-only hook
 * commands silently failed on member projects using a native Windows shell.
 */

import { execSync, type SpawnSyncOptions, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stdin } from "node:process";

// hooks/_lib 는 hook 프로세스가 spawnSync stdin pipe 로 실행돼 boot-sensitive.
// relative import 가 stdin race 를 유발했던 회귀 (release-gate pre-destructive-guard
// exit 0 회귀, 2026-04-22 v2.10) 를 피하기 위해 ecosystem-paths 의
// FOLDER_CANDIDATES 를 **여기서는 리터럴로 유지**. 다른 scripts 는
// `lib/ecosystem-paths.ts` 에서 동일 리스트를 import 한다.
const ECOSYSTEM_FOLDER_CANDIDATES_INLINE = [
	"modfolio-ecosystem",
	"modfolio-universe",
] as const;

export interface HookInput {
	tool_name?: string;
	tool_input?: Record<string, unknown>;
	tool_response?: Record<string, unknown>;
	stop_hook_active?: boolean;
	hook_event_name?: string;
	/** Stop/SessionEnd events — absolute path to the session jsonl transcript. */
	transcript_path?: string;
	session_id?: string;
}

/** Maximum ms to wait for the Claude Code hook runner to close stdin. */
const STDIN_TIMEOUT_MS = 5000;

/**
 * Read the JSON hook event from stdin. Returns empty object if stdin is
 * empty, unparseable, or not closed within STDIN_TIMEOUT_MS. The timeout
 * is defensive — in practice Claude Code pipes the JSON and closes stdin
 * immediately, but a misconfigured runner must never hang the commit.
 *
 * ⚠ FAIL-OPEN RACE, fixed 2026-07-21 — read this before "simplifying" it.
 *
 * The old implementation attached `for await (const chunk of stdin)` to the
 * Node-compat stream. When the hook's module graph took slightly longer to
 * resolve (one extra non-builtin import is enough), the parent had already
 * written the payload AND closed the pipe before the async iterator attached,
 * and the iterator then yielded ZERO chunks — `readHookInput()` returned `{}`,
 * every field came back undefined, and the guard exited 0. A *guard that
 * silently allows* is worse than no guard.
 *
 * Measured on the hub: `pre-orbit-writ-guard` blocked only 25/30 identical
 * spawnSync invocations; `pre-destructive-guard` passed 30/30 purely because
 * its module graph was smaller — i.e. every hook carried the same latent bug,
 * masked by boot speed. This is the same failure family as the v2.10 note
 * above about a relative import; the real variable was never "which import"
 * but "how long until the first stdin read".
 *
 * `Bun.stdin.text()` reads the whole stream from its buffered start, so a
 * closed-but-buffered pipe still yields its bytes regardless of boot timing.
 * The iterator path stays as a fallback for non-Bun runtimes.
 */
export async function readHookInput(): Promise<HookInput> {
	const read = (async () => {
		// Preferred: Bun's whole-stream read — immune to late-attach data loss.
		const bunStdin = (
			globalThis as { Bun?: { stdin?: { text?: () => Promise<string> } } }
		).Bun?.stdin;
		if (typeof bunStdin?.text === "function") {
			return await bunStdin.text();
		}
		let data = "";
		for await (const chunk of stdin) data += chunk;
		return data;
	})();

	const timer = new Promise<string>((resolveTimer) => {
		setTimeout(() => resolveTimer(""), STDIN_TIMEOUT_MS).unref?.();
	});

	const data = await Promise.race([read, timer]).catch(() => "");
	if (!data.trim()) return {};
	try {
		return JSON.parse(data) as HookInput;
	} catch {
		return {};
	}
}

/** Extract the Bash command, if the input was for a Bash tool. */
export function bashCommand(input: HookInput): string {
	const cmd = input.tool_input?.command;
	return typeof cmd === "string" ? cmd : "";
}

/** Extract file paths for Edit / Write / MultiEdit tools. */
export function editedFiles(input: HookInput): string[] {
	const out: string[] = [];
	const fp = input.tool_input?.file_path;
	if (typeof fp === "string") out.push(fp);
	const edits = input.tool_input?.edits;
	if (Array.isArray(edits) && typeof fp === "string") {
		// MultiEdit already captured by file_path above
	}
	return out;
}

/** Return the current git top-level directory, or cwd on failure. */
export function gitRoot(): string {
	try {
		return execSync("git rev-parse --show-toplevel", {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return process.cwd();
	}
}

/**
 * Walk up from startDir looking for any ecosystem sibling alias (current name
 * first, then legacy `modfolio-universe`). Returns `undefined` when not found
 * — callers decide whether that is fatal.
 */
export function findEcosystemRoot(startDir: string): string | undefined {
	let current = resolve(startDir);
	for (let i = 0; i < 10; i++) {
		for (const folderName of ECOSYSTEM_FOLDER_CANDIDATES_INLINE) {
			const candidate = join(current, folderName);
			if (existsSync(join(candidate, "ecosystem.json"))) return candidate;
		}
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}
	return undefined;
}

/**
 * Detector source files whose regex literals would match their own rules
 * if naively scanned. The ts_ignore_or_any pattern hit 4 times over three
 * weeks because the suppression-directive regex sits as a string literal
 * inside these two files — a regex scanning for TS suppression directives
 * matches the directive text when it appears quoted in source. Rule test
 * functions consult this set to self-exclude.
 */
export const DETECTOR_SOURCE_FILES: ReadonlySet<string> = new Set([
	"scripts/hooks/stop-pattern-history.ts",
	"scripts/hooks/pre-commit-guard.ts",
]);

/**
 * Is `file` one of the detector sources, in EITHER location?
 *
 * The set above lists hub paths (`scripts/hooks/…`), but harness-pull installs
 * these same two files into members at **`.claude/hooks/…`**. A plain
 * `DETECTOR_SOURCE_FILES.has(file)` therefore never matched inside a member, so
 * every member repo has been logging its own synced detector sources as
 * `ts_ignore_or_any` / `biome_ignore_file` violations — the exact false positive
 * the set was created to stop, reintroduced by the sync path.
 *
 * Measured 2026-07-22 across the fleet: 27/27 member repos showed exactly 2
 * ts-ignore files and 1 biome-ignore file, and in every case they were these
 * two synced hooks. That noise fed `memory/pattern-history.jsonl`, which feeds
 * `/dream` and the Muse corpus — so the learning signal was being polluted.
 *
 * Matching on the trailing `hooks/<name>` segment is location-agnostic and
 * survives any future move of the sync target.
 */
export function isDetectorSource(file: string): boolean {
	const normalized = file.replace(/\\/g, "/");
	for (const known of DETECTOR_SOURCE_FILES) {
		const base = known.slice(known.indexOf("hooks/")); // "hooks/<name>.ts"
		if (
			normalized === known ||
			normalized.endsWith(`/${base}`) ||
			normalized === base
		) {
			return true;
		}
	}
	return false;
}

/**
 * Record a hook execution duration to the OTLP collector when reachable.
 * Silent fail when the toolkit is offline — hook latency must not regress
 * (caps at 500ms timeout). Used by post-* hooks to trace timing for
 * agentic-engineering canon §2.3 untrusted-verification chain.
 *
 * Convention: `service.name=modfolio-ecosystem-hooks`, metric name
 * `hook.duration_ms` with attribute `hook.name=<id>`. Aggregation as gauge
 * (collector converts to histogram on ingest if configured).
 */
export async function recordHookDuration(
	hookName: string,
	durationMs: number,
): Promise<void> {
	const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
	if (!endpoint) return;
	try {
		const url = new URL("/v1/metrics", endpoint);
		await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				resourceMetrics: [
					{
						resource: {
							attributes: [
								{
									key: "service.name",
									value: { stringValue: "modfolio-ecosystem-hooks" },
								},
							],
						},
						scopeMetrics: [
							{
								metrics: [
									{
										name: "hook.duration_ms",
										unit: "ms",
										gauge: {
											dataPoints: [
												{
													attributes: [
														{
															key: "hook.name",
															value: { stringValue: hookName },
														},
													],
													asDouble: durationMs,
													timeUnixNano: String(Date.now() * 1_000_000),
												},
											],
										},
									},
								],
							},
						],
					},
				],
			}),
			signal: AbortSignal.timeout(500),
		});
	} catch {
		// silent — toolkit unreachable. Hook must not regress when OTEL is offline.
	}
}

/**
 * Git diff names, excluding pattern-history so the Stop pattern hook does
 * not detect itself and loop forever.
 */
export function changedFiles(cwd: string): string[] {
	try {
		const staged = execSync("git diff --name-only --cached", {
			cwd,
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		const unstaged = execSync("git diff --name-only", {
			cwd,
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		const merged = new Set<string>();
		for (const line of `${staged}\n${unstaged}`.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			if (trimmed === "memory/pattern-history.md") continue;
			if (trimmed === "memory/pattern-history.jsonl") continue;
			merged.add(trimmed);
		}
		return [...merged].sort();
	} catch {
		return [];
	}
}

/**
 * Bun 동기 sleep — Atomics.wait spec 으로 모든 runtime (Bun, Node.js, Deno) 호환.
 * SharedArrayBuffer 의 Int32Array 0 위치를 0 과 비교 → 항상 timeout 분기 → ms 후 반환.
 * setTimeout 은 microtask 큐에 등록 → for-loop 동기 흐름 차단 X (race 잔존).
 * spawnSync child 와 deadlock 무관 (자기 worker 의 wait, child 와 별개).
 */
function sleepSync(ms: number): void {
	const buf = new SharedArrayBuffer(4);
	const view = new Int32Array(buf);
	Atomics.wait(view, 0, 0, ms);
}

/**
 * spawnSync + 1 회 retry. svelte-kit `.svelte-kit/types/...` race 발생 시
 * (typecheck 가 .svelte-kit/types 가 아직 build 중인데 stat → ENOENT) 100ms 대기
 * 후 1 회 재시도. 일반 ENOENT (e.g. node_modules 부재) 는 retry 무의미 → 명시
 * svelte-kit 패턴만 매치. max retry 1 — 무한 루프 방지.
 *
 * 정공법 — race 해소 root cause = svelte-kit sync 가 비동기 file 생성 중. 짧은
 * wait 으로 충분. 100ms 후에도 잔존하면 실 build 에러 → typecheck 가 자체 진단.
 */
export function spawnSyncWithSvelteKitRetry(
	cmd: string,
	args: readonly string[],
	options: SpawnSyncOptions,
) {
	const result = spawnSync(cmd, args, options);
	if (result.status === 0) return result;
	const stderr = result.stderr?.toString() ?? "";
	const isSvelteKitRace =
		/\.svelte-kit\/.*ENOENT|ENOENT.*\.svelte-kit\/|svelte-kit.*not found|Cannot find module.*\.svelte-kit/.test(
			stderr,
		);
	if (!isSvelteKitRace) return result;
	sleepSync(100);
	return spawnSync(cmd, args, options);
}

/**
 * Absolute path to the bun binary running THIS process — use it instead of the
 * bare string `"bun"` when spawning child processes.
 *
 * Why (2026-07-21, WSL workstation 실측): a bare `spawnSync("bun", …)` resolves
 * through `$PATH`, and `$PATH` is not ours to trust. On this WSL box the Claude
 * Code Bash-tool shell snapshot pins `export PATH=…` **without** `~/.bun/bin`,
 * so `bun` resolved to the Windows npm shim at
 * `/mnt/c/Users/…/Roaming/npm/bun` — a *different, older* bun (1.3.11 vs the
 * native 1.3.14) that spawns its children through cmd.exe and dies on WSL paths
 * with "UNC paths are not supported". The failure is silent-ish and worse than a
 * crash: a gate spawned that way reports FAIL for an environment reason, not a
 * code reason.
 *
 * `process.execPath` is whatever bun is actually executing us, so the child gets
 * the same runtime as the parent — no PATH lookup, no version skew. Falls back
 * to `"bun"` when execPath is not a bun binary (e.g. a script run under node),
 * which keeps behaviour identical to before on every other host.
 *
 * `bunx foo` → `spawnSync(bunExec(), ["x", "foo", …])` (`bunx` is an alias of
 * `bun x`).
 *
 * NOTE this helper is duplicated in `scripts/lib/bun-exec.ts` for hub scripts.
 * The duplication is deliberate: `_lib.ts` is copied standalone into member
 * `.claude/hooks/`, where `scripts/lib/` does not exist. Keep the two in sync.
 */
export function bunExec(): string {
	const exec = process.execPath;
	return exec && /(?:^|[\\/])bun(?:\.exe)?$/i.test(exec) ? exec : "bun";
}

/**
 * svelte-kit 사용 sibling 검출 — typecheck 직전 svelte-kit sync 사전 호출 시 사용.
 * svelte.config.{js,ts} 존재 = svelte-kit project (Astro 등 sibling 은 svelte
 * 만 dep, config 없음).
 */
export function isSvelteKitProject(projectRoot: string): boolean {
	return (
		existsSync(join(projectRoot, "svelte.config.js")) ||
		existsSync(join(projectRoot, "svelte.config.ts"))
	);
}
