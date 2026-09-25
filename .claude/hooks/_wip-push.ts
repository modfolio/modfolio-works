/**
 * scripts/hooks/_wip-push.ts — `wip/*` push 판정 (ADR-029 §7 · 오너 2026-09-23 저녁 `/modfolio-moon`).
 *
 * ## 판정하는 곳은 git pre-push 훅 하나다
 *
 * git 은 pre-push 훅에 **실제로 갱신할 ref 목록**을 stdin 으로 준다(`<local ref> <local sha> <remote ref> <remote sha>`).
 * 명령줄은 그 목록이 아니다 — `push.default=upstream`·`remote.<n>.push`·`push.followTags` 가 대상을 바꾼다(3.93.0 후보
 * 독립 리뷰 P1). 그래서 판정(`judgeWipPush`)은 git 이 준 줄로만 한다. Claude 쪽 `pre-push-guard` 는 명령이 wip push 로
 * **보이고** 우리 git 훅이 래퍼로 설치돼 있을 때만 판정을 넘긴다(`gitPrePushMode`) — 명령 해석이 틀려도 git 훅이 실제
 * ref 로 다시 가르므로, 해석의 오류는 «넘길까 말까» 에만 영향을 준다.
 *
 * ## 무엇을 스캔하나
 *
 * 보내는 ref 가 **전부** `refs/heads/wip/*` 일 때만 wip 규칙이다(태그·다른 브랜치가 한 줄이라도 섞이면 호출자는 풀 영수증).
 * 원격에 아직 없는 **모든 커밋**의 **추가된 줄**을 스캔한다 — 끝 커밋의 파일만 보면 중간 커밋에 들어갔다가 지워진 비밀이
 * 그대로 게시된다(리뷰 P0). 병합은 결합 diff(`--cc`)로 병합이 들인 줄만 본다. 바이너리는 그 커밋의 blob 을 읽어 본다.
 * 선언(`.claude/rules/secret-sweep-allowlist.json`)은 **보내는 끝 커밋에 커밋된 것**을 쓴다 — 작업 트리의 미커밋 선언은
 * 면제가 아니다(리뷰 P3). 범위가 크거나(원격 추적 ref 가 없거나 낡음) 읽지 못하면 **막는다** — 판정 불능은 통과가 아니다.
 *
 * 이 파일은 공유 lib 이라 멤버의 `.claude/hooks/` 에도 착지한다 — 동기화되는 형제(`./secret-patterns.ts`)만 임포트한다.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parseSecretAllowlist, scanSecrets } from "./secret-patterns.ts";

export type PushVerdict =
	| { readonly allow: true; readonly message: string }
	| { readonly allow: false; readonly message: string };

export const WIP_REF = /^refs\/heads\/wip\//;
const ZERO_SHA = /^0+$/;
/** 한 번의 wip push 가 보낼 수 있는 커밋 상한 — 넘으면 원격 추적 ref 가 없거나 낡은 것이다(전체 히스토리를 훑지 않는다). */
export const MAX_WIP_COMMITS = 300;
/** 패치 출력 상한 — 넘으면 판정 불능(막는다). */
const MAX_PATCH_BYTES = 128 * 1024 * 1024;
/** 바이너리 blob 하나의 스캔 상한 — 넘으면 못 읽은 것으로 막는다. */
const MAX_BLOB_BYTES = 8 * 1024 * 1024;
const ALLOWLIST_PATH = ".claude/rules/secret-sweep-allowlist.json";
/** 메시지에 싣는 위반 줄 상한 — stderr 는 모델 컨텍스트로 들어간다(리뷰 P3). */
const MAX_LISTED = 10;

/**
 * git 훅 설치 표식 — `install-git-hooks.ts` 의 `MARKER`·`CHAIN_BEGIN` 과 같아야 한다(`git-pre-push-wip.test.ts` 가 대조한다).
 * 이 파일은 동기화되는 lib 이라 동기화되지 않는 `install-git-hooks.ts` 를 임포트할 수 없다.
 */
export const GIT_HOOK_MARKER = "# modfolio-harness git hook (managed)";
export const GIT_HOOK_CHAIN_BEGIN =
	"# BEGIN modfolio-harness pre-push chain (managed by harness-pull)";

export type PushLine = {
	readonly localRef: string;
	readonly localSha: string;
	readonly remoteRef: string;
	readonly remoteSha: string;
};

/** git 이 pre-push 훅 stdin 으로 주는 줄: `<local ref> <local sha> <remote ref> <remote sha>`. */
export function parsePushLines(stdin: string): PushLine[] {
	return stdin
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean)
		.map((l) => {
			const [localRef = "", localSha = "", remoteRef = "", remoteSha = ""] =
				l.split(/\s+/);
			return { localRef, localSha, remoteRef, remoteSha };
		});
}

/** 보내는 ref 가 **전부** `wip/*` 브랜치일 때만 wip 규칙이다. 빈 목록은 wip 가 아니다(판정 근거가 없다). */
export function isWipPush(lines: readonly PushLine[]): boolean {
	return lines.length > 0 && lines.every((l) => WIP_REF.test(l.remoteRef));
}

/** git 의 C 인용 경로(`"a\tb"`)를 푼다 — 인용이 아니면 그대로. */
export function unquoteGitPath(raw: string): string {
	if (!(raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2))
		return raw;
	const body = raw.slice(1, -1);
	const bytes: number[] = [];
	for (let i = 0; i < body.length; i++) {
		const c = body[i] ?? "";
		if (c !== "\\") {
			for (const b of Buffer.from(c, "utf8")) bytes.push(b);
			continue;
		}
		const n = body[i + 1] ?? "";
		if (/[0-7]/.test(n)) {
			bytes.push(Number.parseInt(body.slice(i + 1, i + 4), 8));
			i += 3;
			continue;
		}
		const map: Record<string, number> = {
			n: 10,
			t: 9,
			r: 13,
			'"': 34,
			"\\": 92,
			a: 7,
			b: 8,
			f: 12,
			v: 11,
		};
		bytes.push(map[n] ?? n.charCodeAt(0));
		i += 1;
	}
	return Buffer.from(bytes).toString("utf8");
}

export interface AddedBlock {
	readonly commit: string;
	readonly file: string;
	readonly text: string;
}

/**
 * `git log -p --diff-merges=cc --no-renames --format=commit %H` 출력에서 커밋·파일별 **추가된 줄**과 바이너리 변경을 모은다.
 * 일반 diff 는 부모 1칸, 결합 diff 는 부모 수만큼의 칸이 줄 앞에 붙는다 — 그 칸에 `+` 가 하나라도 있으면 추가된 줄이다.
 */
export function collectAdded(patch: string): {
	blocks: AddedBlock[];
	binaries: { commit: string; file: string }[];
} {
	const blocks: AddedBlock[] = [];
	const binaries: { commit: string; file: string }[] = [];
	let commit = "";
	let file: string | null = null;
	let parents = 1;
	let inHunk = false;
	let buf: string[] = [];
	const flush = () => {
		if (file !== null && buf.length > 0)
			blocks.push({ commit, file, text: buf.join("\n") });
		buf = [];
	};
	for (const line of patch.split("\n")) {
		const c = /^commit ([0-9a-f]{40,64})$/.exec(line);
		if (c) {
			flush();
			commit = c[1] ?? "";
			file = null;
			inHunk = false;
			continue;
		}
		if (line.startsWith("diff --git ")) {
			flush();
			// `a/P b/P` — `--no-renames` 라 두 쪽이 같다. 공백이 든 경로도 가운데서 가른다.
			const rest = line.slice("diff --git ".length);
			file = rest.startsWith('"')
				? unquoteGitPath(rest.slice(rest.indexOf('"b/'))).replace(/^b\//, "")
				: rest.slice(2, (rest.length - 1) / 2);
			parents = 1;
			inHunk = false;
			continue;
		}
		if (line.startsWith("diff --cc ") || line.startsWith("diff --combined ")) {
			flush();
			file = unquoteGitPath(line.replace(/^diff --(cc|combined) /, ""));
			inHunk = false;
			continue;
		}
		if (!inHunk && line.startsWith("+++ ")) {
			// 경로에 공백이 있으면 git 이 헤더 끝에 TAB 을 붙인다(diff.c) — 떼지 않으면 선언 키와 영영 안 맞는다(리뷰 dA P2).
			const target = line.slice(4).replace(/\t$/, "");
			file =
				target === "/dev/null"
					? null
					: unquoteGitPath(target).replace(/^b\//, "");
			continue;
		}
		const bin = /^Binary files (?:(.+) and (.+) )?differ$/.exec(line);
		if (bin) {
			// 결합 diff 는 «Binary files differ» 만 적는다 — 그때도 이 커밋의 blob 을 읽는다.
			if (file !== null && bin[2] !== "/dev/null")
				binaries.push({ commit, file });
			continue;
		}
		const h = /^(@{2,}) /.exec(line);
		if (h) {
			parents = (h[1] ?? "@@").length - 1;
			inHunk = true;
			continue;
		}
		if (
			inHunk &&
			file !== null &&
			line.length >= parents &&
			line.slice(0, parents).includes("+")
		)
			buf.push(line.slice(parents));
	}
	flush();
	return { blocks, binaries };
}

function git(root: string, args: readonly string[], input?: string) {
	return spawnSync("git", ["-c", "core.quotePath=false", ...args], {
		cwd: root,
		encoding: "utf8",
		input,
		maxBuffer: MAX_PATCH_BYTES,
	});
}

/** 보내는 끝 커밋에 커밋된 선언 — 없으면 빈 목록 · 손상되면 던진다. */
function allowlistAt(root: string, sha: string): Set<string> {
	const r = git(root, ["show", `${sha}:${ALLOWLIST_PATH}`]);
	if (r.status !== 0) return new Set();
	return new Set(
		parseSecretAllowlist(r.stdout ?? "").map((a) => `${a.file}::${a.id}`),
	);
}

/** 바이너리 blob 들을 한 프로세스(`cat-file --batch`)로 읽는다. 읽지 못한 것은 null. */
function readBlobs(root: string, specs: readonly string[]): (string | null)[] {
	if (specs.length === 0) return [];
	const r = spawnSync("git", ["cat-file", "--batch"], {
		cwd: root,
		input: `${specs.join("\n")}\n`,
		maxBuffer: MAX_PATCH_BYTES,
	});
	if (r.status !== 0 || !r.stdout) return specs.map(() => null);
	const out: (string | null)[] = [];
	const buf = r.stdout as Buffer;
	let pos = 0;
	for (let i = 0; i < specs.length; i++) {
		const nl = buf.indexOf(10, pos);
		if (nl < 0) {
			out.push(null);
			continue;
		}
		const header = buf.subarray(pos, nl).toString("utf8");
		const m = /^[0-9a-f]+ (\w+) (\d+)$/.exec(header);
		if (!m) {
			out.push(null); // `<spec> missing` 등
			pos = nl + 1;
			continue;
		}
		const size = Number(m[2]);
		const body = buf.subarray(nl + 1, nl + 1 + size);
		out.push(size > MAX_BLOB_BYTES ? null : body.toString("utf8"));
		pos = nl + 1 + size + 1;
	}
	return out;
}

/**
 * «이미 게시됨» 으로 뺄 원격 추적 ref 의 범위. git 은 훅에 `$1` = 원격 **이름**(이름 없는 push 면 URL)을 준다.
 *   · 설정된 원격 이름 → 그 원격의 추적 ref 만(`--remotes=<이름>`) — 다른 원격에만 있는 커밋은 여기 없다.
 *   · URL·경로(이름 없는 push) → 추적 ref 가 없다 — 줄의 remote sha 만 뺀다(null).
 *   · 인자를 못 받음(옛 래퍼·손으로 부름) → 종전대로 모든 원격(`--remotes`). 호출자가 그 사실을 메시지에 적는다.
 * 2026-09-24 실측: 래퍼가 `"$@"` 를 넘기지 않아 이 함수의 첫 갈래가 한 번도 돌지 않았다 — 빈 원격으로 보내는 wip
 * push 가 «원격에 없는 커밋 0개» 로 스윕 없이 통과했다.
 */
export function remoteScope(
	root: string,
	remote: string | null,
): string | null {
	if (remote === null || remote === "") return "--remotes";
	if (!/^[A-Za-z0-9._-]+$/.test(remote)) return null;
	const names = git(root, ["remote"]);
	// 목록을 못 읽으면 덜 뺀다(더 많이 스캔한다) — 못 읽음을 «이미 게시됨» 쪽으로 접지 않는다.
	if (names.status !== 0) return null;
	return (names.stdout ?? "").split("\n").some((n) => n.trim() === remote)
		? `--remotes=${remote}`
		: null;
}

/**
 * `wip/*` push — 원격에 아직 없는 커밋들의 추가된 줄을 비밀 스윕한다. `remote` 는 git 이 훅에 준 원격 이름($1) —
 * 그 원격의 추적 ref 와 줄의 remote sha 를 범위에서 뺀다(다른 원격에만 있는 커밋을 «이미 게시됨» 으로 치지 않는다).
 */
export function judgeWipPush(
	root: string,
	lines: readonly PushLine[],
	remote: string | null = null,
	maxCommits: number = MAX_WIP_COMMITS,
): PushVerdict {
	const undeclared: string[] = [];
	let scannedBlocks = 0;
	let scannedCommits = 0;
	for (const l of lines) {
		if (ZERO_SHA.test(l.localSha)) continue; // 삭제 push — 보낼 내용이 없다
		let allowed: Set<string>;
		try {
			allowed = allowlistAt(root, l.localSha);
		} catch (e) {
			return {
				allow: false,
				message: `⛔ wip push — 보내는 커밋의 비밀 스윕 선언이 손상됐다(${(e as Error).message}) · 판정 불능은 통과가 아니다`,
			};
		}
		const excl: string[] = [];
		if (
			!ZERO_SHA.test(l.remoteSha) &&
			git(root, ["cat-file", "-e", `${l.remoteSha}^{commit}`]).status === 0
		)
			excl.push(l.remoteSha);
		const scope = remoteScope(root, remote);
		if (scope !== null) excl.push(scope);
		const count = git(root, [
			"rev-list",
			"--count",
			l.localSha,
			"--not",
			...excl,
		]);
		const n = Number((count.stdout ?? "").trim());
		if (count.status !== 0 || !Number.isFinite(n))
			return {
				allow: false,
				message: `⛔ wip push — 보낼 커밋을 셀 수 없다(${l.localRef}) · 판정 불능은 통과가 아니다`,
			};
		if (n > maxCommits)
			return {
				allow: false,
				message:
					`⛔ wip push — 원격에 없는 커밋이 ${n}개다(상한 ${maxCommits}) · 원격 추적 ref 가 없거나 낡았다 → ` +
					`\`git fetch ${remote ?? "<원격>"}\` 뒤 다시 · 전체 히스토리를 훑지 않는다(판정 불능은 통과가 아니다)`,
			};
		scannedCommits += n;
		const log = git(root, [
			"log",
			"-p",
			"--no-color",
			"--no-ext-diff",
			"--no-textconv",
			"--no-renames",
			"--diff-merges=cc",
			// 사용자 설정 `log.showRoot=false` 면 루트 커밋의 diff 가 빠져 그 내용이 스캔 없이 나간다(리뷰 dA P2).
			"--root",
			"--format=commit %H",
			l.localSha,
			"--not",
			...excl,
		]);
		if (log.status !== 0 || log.error)
			return {
				allow: false,
				message: `⛔ wip push — 보낼 커밋의 패치를 못 읽었다(${l.localRef}) · 판정 불능은 통과가 아니다`,
			};
		const { blocks, binaries } = collectAdded(log.stdout ?? "");
		const bodies = readBlobs(
			root,
			binaries.map((b) => `${b.commit}:${b.file}`),
		);
		const unreadable = binaries
			.filter((_, i) => bodies[i] === null)
			.map((b) => b.file);
		if (unreadable.length > 0)
			return {
				allow: false,
				message: `⛔ wip push — 읽지 못한 바이너리 ${unreadable.length}개(${unreadable.slice(0, 3).join(" · ")}) · 판정 불능은 통과가 아니다`,
			};
		const all: AddedBlock[] = [
			...blocks,
			...binaries.map((b, i) => ({
				commit: b.commit,
				file: b.file,
				text: bodies[i] ?? "",
			})),
		];
		scannedBlocks += all.length;
		for (const b of all)
			for (const h of scanSecrets(b.text))
				if (!allowed.has(`${b.file}::${h.id}`))
					undeclared.push(`${b.file} [${h.id}] @${b.commit.slice(0, 8)}`);
	}
	if (undeclared.length > 0)
		return {
			allow: false,
			message:
				`⛔ wip push — 선언되지 않은 시크릿 모양 ${undeclared.length}건:\n` +
				undeclared
					.slice(0, MAX_LISTED)
					.map((u) => `    ${u}`)
					.join("\n") +
				(undeclared.length > MAX_LISTED
					? `\n    … 외 ${undeclared.length - MAX_LISTED}건`
					: "") +
				"\n  실제 시크릿이면 즉시 회전하고 그 커밋에서 뺀다(나중 커밋에서 지워도 앞 커밋은 게시된다) · 픽스처면 사유와 함께 선언을 커밋한다",
		};
	return {
		allow: true,
		message: `✓ wip push — 원격에 없는 커밋 ${scannedCommits}개의 추가 내용 ${scannedBlocks}건 비밀 스윕 통과(통합 후보가 아니다 · main 통합은 여전히 풀 영수증)${
			remote === null || remote === ""
				? "\n  ⚠ 원격 이름을 못 받았다(옛 래퍼 · 손으로 부름) — 모든 원격의 추적 ref 를 «이미 게시됨» 으로 뺐다 → `bun run modfolio:install-guards`"
				: ""
		}`,
	};
}

/** 이 repo 의 git pre-push 훅이 무엇인가 — 우리 래퍼(ref 목록을 받는다) · 체인(못 받는다) · 남의 것 · 없음. */
export function gitPrePushMode(
	root: string,
): "wrapper" | "chain" | "foreign" | "none" {
	const r = git(root, ["rev-parse", "--git-path", "hooks/pre-push"]);
	if (r.status !== 0) return "none";
	const path = resolve(root, (r.stdout ?? "").trim());
	if (!existsSync(path)) return "none";
	// git 은 실행 비트가 없는 훅을 돌리지 않는다 — 표식만 보고 «래퍼» 라 하면 가드가 아무도 안 보는 곳에 판정을 넘긴다(리뷰 dA P2).
	if (process.platform !== "win32") {
		try {
			if ((statSync(path).mode & 0o111) === 0) return "none";
		} catch {
			return "none";
		}
	}
	let text: string;
	try {
		text = readFileSync(path, "utf8");
	} catch {
		return "none";
	}
	if (text.includes(GIT_HOOK_CHAIN_BEGIN)) return "chain";
	return text.includes(GIT_HOOK_MARKER) ? "wrapper" : "foreign";
}

/**
 * 명령줄에서 읽은 대상이 wip 브랜치로 **보이는가** — Claude 쪽 가드가 판정을 git 훅에 넘길지 정할 때만 쓴다.
 * 틀려도 안전하다: 넘긴 뒤 git 훅이 실제 ref 로 다시 가른다.
 */
export function looksLikeWipPush(
	root: string,
	targets: { readonly refspecs: readonly string[]; readonly deletion: boolean },
): boolean {
	const current = (): string => {
		const r = git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
		return r.status === 0 ? (r.stdout ?? "").trim() : "";
	};
	const specs = targets.refspecs.length > 0 ? targets.refspecs : [current()];
	if (specs.length === 0) return false;
	return specs.every((raw) => {
		const spec = raw.replace(/^\+/, "");
		const dst = spec.includes(":") ? spec.slice(spec.indexOf(":") + 1) : spec;
		const name = (dst === "HEAD" || dst === "" ? current() : dst).replace(
			/^refs\/heads\//,
			"",
		);
		return name.startsWith("wip/");
	});
}
