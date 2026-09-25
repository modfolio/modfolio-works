/**
 * scripts/hooks/_sessions.ts — 같은 체크아웃·워크트리에서 도는 **다른 Claude 세션**을 센다(Linux `/proc`).
 *
 * moon(«같은 체크아웃의 다른 세션»)·sun(충돌 관측)·편집 경고 훅(`pre-shared-edit-notice.ts`)이 **같은 판정**을 쓴다.
 * 훅이 멤버의 `.claude/hooks/` 에서 임포트할 수 있게 공유 lib 으로 둔다(`SHARED_LIBS`) — moon 에 두면 멤버 훅이 못 닿는다.
 *
 * ⚠ 못 보는 것: node 로 설치한 Claude·Codex·Antigravity 세션 · `/proc` 이 없는 OS(→ null, «0» 으로 접지 않는다).
 */
import { existsSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Claude Code 세션 프로세스의 실행 파일인가(설치판 · Desktop 의 ccd-cli). */
export const CLAUDE_EXE = /claude\/(versions|remote\/ccd-cli)\//;

export interface ProcInfo {
	readonly pid: number;
	readonly ppid: number;
	readonly exe: string;
	readonly cwd: string;
}

/** `/proc/<pid>/stat` 의 부모 pid — 못 읽으면 0. */
export function parentOf(pid: number): number {
	try {
		const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
		return Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]) || 0;
	} catch {
		return 0;
	}
}

/** 프로세스 표 — `/proc` 이 없거나 못 읽으면 null. */
export function readProcs(): ProcInfo[] | null {
	if (!existsSync("/proc/self")) return null;
	const procs: ProcInfo[] = [];
	try {
		for (const d of readdirSync("/proc")) {
			const pid = Number(d);
			if (!Number.isInteger(pid)) continue;
			let exe = "";
			let cwd = "";
			try {
				exe = readlinkSync(`/proc/${pid}/exe`);
				cwd = readlinkSync(`/proc/${pid}/cwd`);
			} catch {
				// 권한 없는 프로세스 — 부모 사슬에는 남긴다(내 조상일 수 있다)
			}
			procs.push({ pid, ppid: parentOf(pid), exe, cwd });
		}
	} catch {
		return null;
	}
	return procs;
}

/**
 * «남의 세션» 판정기(순수). **이 세션** = 내 조상 사슬에서 가장 가까운 Claude 프로세스 하나이고, 그 자손(이 세션이 띄운
 * 리뷰 워커 `claude -p` 등)만 뺀다. 조상 전부의 자손을 빼면 tmux 서버·VS Code ptyHost·WSL `/init` 을 공유하는 다른
 * 세션까지 빠져 이 확인이 조용히 꺼진다(리뷰 dD P1). Claude 조상이 없으면(Codex·터미널에서 실행) 모든 Claude 세션이 남이다.
 */
export function otherClaudeSessions(
	procs: readonly ProcInfo[],
	myPid: number,
): ProcInfo[] {
	const byPid = new Map(procs.map((p) => [p.pid, p]));
	const parent = (pid: number): number => byPid.get(pid)?.ppid ?? 0;
	let self = 0;
	for (let p = myPid, hops = 0; p > 1 && hops < 64; p = parent(p), hops++)
		if (CLAUDE_EXE.test(byPid.get(p)?.exe ?? "")) {
			self = p;
			break;
		}
	const underSelf = (pid: number): boolean => {
		if (self === 0) return false;
		for (let p = pid, hops = 0; p > 1 && hops < 64; p = parent(p), hops++)
			if (p === self) return true;
		return false;
	};
	return procs.filter((p) => CLAUDE_EXE.test(p.exe) && !underSelf(p.pid));
}

/** 하위 폴더에서 띄운 세션도 같은 체크아웃이다(3.93.0 리뷰 dF P2 — `apps/web` 에서 뜬 세션을 못 봤다). */
function inside(cwd: string, root: string): boolean {
	return cwd === root || cwd.startsWith(`${root}/`);
}

/** 같은 체크아웃의 다른 Claude 세션 수(순수). */
export function countOtherSessions(
	procs: readonly ProcInfo[],
	myPid: number,
	root: string,
): number {
	return otherClaudeSessions(procs, myPid).filter((p) => inside(p.cwd, root))
		.length;
}

/**
 * 체크아웃(주 체크아웃 + 워크트리)마다 다른 세션 수(순수). 한 세션은 **가장 깊은** 체크아웃 하나에만 센다 — 워크트리가
 * 주 체크아웃 폴더 안에 있어도 두 곳에 겹쳐 세지 않는다.
 */
export function sessionsPerCheckout(
	procs: readonly ProcInfo[],
	myPid: number,
	roots: readonly string[],
): Map<string, number> {
	const out = new Map(roots.map((r) => [r, 0]));
	const deepestFirst = [...roots].sort((a, b) => b.length - a.length);
	for (const p of otherClaudeSessions(procs, myPid)) {
		const r = deepestFirst.find((root) => inside(p.cwd, root));
		if (r !== undefined) out.set(r, (out.get(r) ?? 0) + 1);
	}
	return out;
}

/** 같은 체크아웃에서 도는 다른 Claude 세션 수 — 못 재면 null. */
export function otherSessionsInCheckout(root: string): number | null {
	const procs = readProcs();
	return procs === null ? null : countOtherSessions(procs, process.pid, root);
}

/** sun 이 남기는 Loom 리스 사본 — 편집 경고 훅이 네트워크 없이 읽는다(`scripts/modfolio/collisions.ts`). */
export function leaseCachePath(repo: string, home = homedir()): string {
	return join(home, ".modfolio", "sessions", "loom-leases", `${repo}.json`);
}

/**
 * 리스 경로 명세가 이 파일과 겹칠 수 있나(순수 · **충돌 쪽으로** 접는다 — 경고라서). 같거나 한쪽이 다른 쪽의 폴더이거나,
 * 와일드카드(`*?[{`)가 있으면 그 앞 리터럴 접두가 맞을 때. 정확한 교집합은 Loom 의 `loom_check_conflict` 가 판정한다.
 */
export function leaseCovers(spec: string, rel: string): boolean {
	const norm = (s: string) =>
		s
			.trim()
			.replace(/\\/g, "/")
			.replace(/^\.\//, "")
			.replace(/\/{2,}/g, "/")
			.replace(/^\/+|\/+$/g, "");
	const a = norm(spec);
	const b = norm(rel);
	if (a === "" || b === "") return false;
	const wild = a.search(/[*?[{]/);
	if (wild >= 0) return b.startsWith(a.slice(0, wild));
	return a === b || b.startsWith(`${a}/`) || a.startsWith(`${b}/`);
}
