/**
 * scripts/hooks/pre-shared-edit-notice.ts — PreToolUse(Edit|Write): **남의 것일 수 있는 파일**을 고치기 직전에 한 줄 경고.
 *
 * 오너 2026-09-25(eco-close 헌장 ② 충돌 없음): 형제 세션이 같은 체크아웃에 상시 여럿 돈다(허브 주 체크아웃 실측 6).
 * 헌장의 작업 공간당 작성자 하나 규칙(남의 WIP 를 덮지 않는다)은 문장뿐이었고, 편집 순간에 그것을 알려 주는 자리가 없었다.
 *
 * 경고 조건(하나라도):
 *  ① 그 파일에 **이미 미커밋 변경**이 있고 같은 체크아웃에 **다른 Claude 세션**이 살아 있다(`_sessions.ts` 판정).
 *  ② sun 이 남긴 **Loom 리스** 사본(`~/.modfolio/sessions/loom-leases/<repo>.json`)에서 살아 있는 리스가 그 경로를 덮는다.
 *
 * 한 세션에서 한 파일은 **한 번만** 본다 — 이 세션이 이미 고친 파일은 조용하다(`~/.modfolio/sessions/edits/`).
 * **막지 않는다**(exit 0 · 차단 결정 없음). 무엇이든 실패하면 조용히 통과한다 — 경고 훅이 편집을 막으면 안 된다.
 *
 * ⚠ 못 보는 것: Bash(sed·python)로 고친 파일(이 세션 것도 첫 Edit 에 한 번 경고될 수 있다) · node 로 설치한 Claude·Codex·
 *   Antigravity 세션 · sun 을 안 연 세션의 리스 사본(없으면 ②는 미검사로 조용하다 — sun 이 «미검사» 를 보인다).
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import {
	basename,
	dirname,
	isAbsolute,
	join,
	relative,
	resolve,
} from "node:path";
import { editedFiles, readHookInput } from "./_lib.ts";
import {
	countOtherSessions,
	leaseCachePath,
	leaseCovers,
	type ProcInfo,
	readProcs,
} from "./_sessions.ts";

/** 리스 사본을 믿는 시간 — 그보다 오래되면 «미검사» 로 두고 조용하다. */
const LEASE_CACHE_MAX_MS = 12 * 60 * 60 * 1000;

interface LeaseCache {
	at?: unknown;
	items?: { holder?: unknown; paths?: unknown; expiresAt?: unknown }[];
}

function git(cwd: string, args: string[]): { ok: boolean; out: string } {
	const r = spawnSync("git", ["-c", "core.quotePath=false", ...args], {
		cwd,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "ignore"],
		timeout: 3000,
	});
	return { ok: r.status === 0, out: (r.stdout ?? "").trim() };
}

/** 살아 있는 리스 중 이 경로를 덮는 것(순수). */
export function coveringLeases(
	cache: LeaseCache,
	rel: string,
	nowMs: number,
): string[] {
	const at = typeof cache.at === "string" ? Date.parse(cache.at) : Number.NaN;
	if (!Number.isFinite(at) || nowMs - at > LEASE_CACHE_MAX_MS) return [];
	const out: string[] = [];
	for (const it of cache.items ?? []) {
		const exp =
			typeof it.expiresAt === "string" ? Date.parse(it.expiresAt) : Number.NaN;
		if (Number.isFinite(exp) && exp < nowMs) continue;
		const paths = Array.isArray(it.paths)
			? it.paths.filter((p): p is string => typeof p === "string")
			: [];
		if (paths.some((p) => leaseCovers(p, rel)))
			out.push(`${String(it.holder ?? "?")} [${paths.slice(0, 3).join(", ")}]`);
	}
	return out;
}

function touchedFile(sessionId: string, home = homedir()): string {
	return join(
		home,
		".modfolio",
		"sessions",
		"edits",
		`${createHash("sha256").update(sessionId).digest("hex").slice(0, 16)}.txt`,
	);
}

export interface JudgeDeps {
	readonly nowMs?: number;
	readonly home?: string;
	readonly procs?: () => readonly ProcInfo[] | null;
}

export function judge(
	file: string,
	sessionId: string,
	deps: JudgeDeps = {},
): string[] {
	const nowMs = deps.nowMs ?? Date.now();
	const home = deps.home ?? homedir();
	const abs = isAbsolute(file) ? file : resolve(file);
	let dir = dirname(abs);
	while (!existsSync(dir) && dir !== dirname(dir)) dir = dirname(dir);
	const top = git(dir, ["rev-parse", "--show-toplevel"]);
	if (!top.ok) return [];
	const root = top.out;
	const rel = relative(root, abs);
	if (rel.startsWith("..")) return [];

	const ledger = touchedFile(`${sessionId}\0${root}`, home);
	try {
		if (
			existsSync(ledger) &&
			readFileSync(ledger, "utf8").split("\n").includes(rel)
		)
			return [];
	} catch {
		// 못 읽으면 처음 보는 것으로 — 경고가 한 번 더 뜰 뿐이다
	}
	const warnings: string[] = [];

	const status = existsSync(abs)
		? git(root, ["status", "--porcelain", "--", rel])
		: { ok: true, out: "" };
	if (status.ok && status.out !== "") {
		const procs = (deps.procs ?? readProcs)();
		const others =
			procs === null ? 0 : countOtherSessions(procs, process.pid, root);
		if (others > 0)
			warnings.push(
				`${rel} 에 이미 미커밋 변경이 있고 같은 체크아웃에 다른 Claude 세션 ${others}개가 돈다 — 이 세션이 만든 변경이 아니면 남의 WIP 다. 덮지 말고 워크트리로 옮기거나 그 세션과 조율한다.`,
			);
	}

	const url = git(root, ["remote", "get-url", "origin"]).out.replace(
		/\/+$/,
		"",
	);
	const repo =
		url
			.split(/[/:]/)
			.pop()
			?.replace(/\.git$/, "") || basename(root);
	const cachePath = leaseCachePath(repo, home);
	if (existsSync(cachePath)) {
		try {
			const held = coveringLeases(
				JSON.parse(readFileSync(cachePath, "utf8")) as LeaseCache,
				rel,
				nowMs,
			);
			if (held.length > 0)
				warnings.push(
					`${rel} 은 Loom 리스가 덮는 경로다 — ${held.slice(0, 2).join(" · ")}. 이 세션의 리스가 아니면 편집 전에 \`loom_check_conflict\` 로 확인한다.`,
				);
		} catch {
			// 사본이 깨졌으면 미검사 — 조용하다
		}
	}

	try {
		mkdirSync(dirname(ledger), { recursive: true });
		appendFileSync(ledger, `${rel}\n`);
	} catch {
		// 기록을 못 해도 다음 편집에서 한 번 더 볼 뿐이다
	}
	return warnings;
}

if (import.meta.main) {
	try {
		const input = await readHookInput();
		const sessionId =
			typeof input.session_id === "string" ? input.session_id : "unknown";
		const warnings = editedFiles(input).flatMap((f) => judge(f, sessionId));
		if (warnings.length > 0) {
			const text = `⚠ 공유 편집 — ${warnings.join(" / ")}`;
			console.log(
				JSON.stringify({
					systemMessage: text,
					hookSpecificOutput: {
						hookEventName: "PreToolUse",
						additionalContext: text,
					},
				}),
			);
		}
	} catch {
		// 경고 훅은 편집을 막지 않는다
	}
	process.exit(0);
}
