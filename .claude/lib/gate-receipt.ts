#!/usr/bin/env bun

/**
 * scripts/lib/gate-receipt.ts — **완주 영수증**. 게이트를 두 번 돌지 않기 위한 것.
 *
 * ## 왜 (atelier-and-folio 2026-09-15 제안 · 실측 동봉)
 *
 * `pre-push-guard` 는 push 직전에 그 repo 의 최종 게이트를 부른다. 그런데 atelier 실측:
 *
 *     quality:all 실측    **~40분** (e2e 단독 13~19분)
 *     훅 러너 예산        **60초**  (Claude Code 훅 기본 timeout)
 *
 * **40분짜리를 60초 예산으로 부르니 매 `git push` 가 60초를 태우고 «판정 불능» 으로 끝난다.**
 * 아무것도 말해 주지 않으면서 비용만 낸다. 그리고 그런 훅은 «무시하도록 훈련»시킨다.
 *
 * ⚠ 제공된 레버(`harness-lock.json` `extraHooks.timeout`)로는 **못 푼다** — 예산을 40분으로
 * 올리면 push 마다 40분이다. 「좁은 게이트 + push 직전 1회」 정책과 정면으로 어긋난다.
 *
 * ## 이 모듈의 계약
 *
 * 러너가 완주하면 영수증을 남긴다. 훅은 **영수증의 지문이 지금 push 하는 트리와 같은지만**
 * 본다(밀리초). 그러면 ① **타임아웃이 초록을 위장할 수 없고** ② **무엇이 검사됐는지가 기록에
 * 남는다**(좁은 수트의 영수증을 풀게이트로 인정하지 않는다 — `suite` 로 가른다).
 *
 * ## ⚠ 지문에서 무엇을 빼는가 — connect 2026-09-15 이 보고한 자리
 *
 * connect: *"«게이트 초록 → 커밋 → 매듭(tick)» 다음에 푸시하면 `tick` 이 원장 파일을 고쳐
 * 놓은 채 푸시가 시작된다"* → 원격이 둘인 repo 는 pre-push 중복제거가 깨져 게이트를 **두 번**
 * 문다(그쪽 실측 약 16분 → 2배).
 *
 * 그래서 지문은 **에이전트가 관리하는 원장·기록 경로를 제외**한다. 그 파일들은 제품이 아니고
 * 게이트가 보는 대상도 아니다 — 그것 때문에 게이트를 다시 도는 것은 순수한 낭비다.
 * ⚠ 다만 **제외 목록은 좁게** 둔다. 넓히면 «게이트가 안 본 변경» 이 영수증을 통과한다.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const RECEIPT_RELPATH = join(".claude", "gate-receipt.json");

/**
 * 지문에서 빼는 경로. **에이전트가 매 턴 쓰는 기록**이고 게이트의 검사 대상이 아니다.
 * ⚠ 넓히지 않는다 — 여기 들어간 경로의 변경은 영수증을 무효화하지 못한다.
 */
export const FINGERPRINT_EXCLUDE = [
	".claude/gate-receipt.json", // 자기 자신
	".modfolio-nonstop-active",
	"knowledge/runs/", // nonstop 원장 (tick 이 매듭마다 쓴다)
	"plans/modfolio-nonstop-", // 멤버 쪽 원장
	"memory/debriefs/",
	".claude/debriefs/",
	".claude/.playbook-injections.jsonl",
	// 러너가 매 실행 뒤에 쓰는 소요 이력 — `.gitignore` 안 된 멤버에서 `gate:quick` 한 번이
	// 영수증을 무효화하지 않도록 정체에서 뺀다(`TIMINGS_RELPATH` 와 같은 값 · 테스트가 잠근다).
	".claude/gate-timings.json",
	// ── 허브 트리에 **다른 프로세스**가 쓰는 기록 (2026-09-15 실측 — 게이트 507초 동안 형제의 pull 이
	//    `feedback/modfolio-admin/pull-manifest.json` 을, 전파의 Writ 가 `memory/orbit/*` 를 바꿔 영수증이 죽었다).
	//    셋 다 quick/full tier 34단계 중 어느 스크립트도 읽지 않는다(`gate-receipt.test.ts` 가 grep 으로 잠근다).
	//    ⚠ `scripts/knowledge/.rag-manifest.json` 은 `push-judgment-gate.ts`(full) 가 읽으므로 **제외하지 않는다.**
	"**/pull-manifest.json", // 멤버 harness-pull 이 허브 sink 에 남기는 보고 — 허브의 산출물이 아니다
	"memory/orbit/", // Orbit Writ 원장(current.json · writ-audit.jsonl) — 전파가 repo 마다 쓴다
	"knowledge/playbooks/", // Muse 코퍼스 카운터 — Stop 훅이 매 턴 갱신한다 (release tier 만 읽는다)
] as const;

export interface GateReceipt {
	/** 어느 수트가 완주했나. 좁은 수트를 풀게이트로 인정하지 않기 위해 반드시 적는다. */
	readonly suite: string;
	readonly stepCount: number;
	/** 건너뛴 단계 — 침묵한 스킵은 「전부 검사됨」으로 읽힌다. */
	readonly skipped: readonly string[];
	readonly head: string;
	/** 워킹트리 지문(제외 목록 반영). 트리가 깨끗하면 `clean`. 표시·진단용 — 판정 축이 아니다. */
	readonly dirty: string;
	/** **판정 축** — 내용 트리 OID(`contentTree`). 옛 영수증(3.88.7 이전)엔 없다 → 인정하지 않는다. */
	readonly tree?: string;
	readonly at: string;
}

function git(root: string, args: string[]): string {
	const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
	return r.status === 0 ? r.stdout : "";
}

/**
 * 제외 항목의 네 형태: `dir/`(디렉터리 접두) · `…-`(파일명 접두 — 멤버 원장 `plans/modfolio-nonstop-*`) ·
 * `**\/name`(어느 깊이든 그 파일명) · 그 밖(정확히 그 파일).
 * ⚠ 초판은 접두형을 정확 일치로 읽어 멤버 원장이 **한 번도 제외되지 않았다.**
 */
export function isExcluded(path: string): boolean {
	return FINGERPRINT_EXCLUDE.some((p) => {
		if (p.startsWith("**/")) {
			const base = p.slice(3);
			return path === base || path.endsWith(`/${base}`);
		}
		return p.endsWith("/") || p.endsWith("-") ? path.startsWith(p) : path === p;
	});
}

/** 같은 네 형태를 git pathspec 으로 (`**\/` 형태는 glob 매직이 필요하다). */
function excludePathspecs(): string[] {
	return FINGERPRINT_EXCLUDE.map((p) =>
		p.startsWith("**/")
			? `:(glob)${p}`
			: p.endsWith("/")
				? `${p}**`
				: p.endsWith("-")
					? `${p}*`
					: p,
	);
}

/** `add -A` 의 제외 pathspec — glob 매직이 붙은 항목은 `:(exclude,glob)` 로 합친다. */
function addExcludePathspecs(): string[] {
	return excludePathspecs().map((p) =>
		p.startsWith(":(glob)")
			? `:(exclude,glob)${p.slice(":(glob)".length)}`
			: `:(exclude)${p}`,
	);
}

/**
 * **내용의 정체** — 워킹트리(추적 변경 + 미추적 · `.gitignore` 존중 · 제외 경로 제거)를 임시
 * 인덱스에 얹어 `write-tree` 한 트리 OID. HEAD 와 무관하다.
 *
 * 왜 HEAD 가 아니라 내용인가(허브 2026-09-15): 영수증이 HEAD 를 축으로 삼으면 «게이트 → 커밋 →
 * push» 에서 커밋이 HEAD 를 바꿔 영수증이 죽고, 훅이 배선된 repo 는 **같은 내용에 게이트를 두 번**
 * 돌린다 — 사람이 훅을 끄게 만드는 정확한 형태다. 같은 내용을 커밋해도 트리 OID 는 같고, 한
 * 글자를 고치면 달라진다. 그것이 «게이트가 잰 것이 지금 push 되는 것인가» 의 옳은 축이다.
 *
 * 임시 인덱스는 **`read-tree HEAD` 로 시작한다 — stat 캐시를 믿지 않는다.** 초판은 실제 인덱스를 복사해
 * (stat 캐시로 바뀐 파일만 해시 · 148ms) 빨랐지만, 부하 속 실측(2026-09-15 · gate:full 4샤드 동시)에서
 * 영수증 뒤 **같은 크기·같은 초**의 편집을 «내용 그대로» 로 읽어 push 훅이 exit 0 을 냈다 — racy-git 창의
 * **거짓 초록**이고 이 장치의 존재 이유를 정확히 뒤집는 결함이다. 전부 재해시하면 3,135 파일에 589ms
 * (실측) — push 훅·게이트 끝에 붙어도 되는 값이다. `--renormalize` 는 clean 필터를 다시 적용해 트리가
 * HEAD 내용과 달라지므로 쓰지 않는다. HEAD 가 없으면 빈 인덱스.
 */
export function contentTree(root: string): string {
	const tmpIndex = join(
		tmpdir(),
		`gate-receipt-index-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	);
	const env = { ...process.env, GIT_INDEX_FILE: tmpIndex };
	const g = (args: string[]) =>
		spawnSync("git", args, { cwd: root, encoding: "utf8", env });
	try {
		// stat 없는 인덱스 → `add -A` 가 모든 추적 파일의 내용을 다시 해시한다(위 머리말).
		if (g(["read-tree", "HEAD"]).status !== 0) g(["read-tree", "--empty"]);
		// 제외 경로는 정체에서 **뺀다** — HEAD 에 있어도, 워킹트리에 있어도. 안 빼면 커밋으로
		// HEAD 에 들어간 원장이 다음 push 의 트리를 바꾼다.
		g([
			"rm",
			"-r",
			"--cached",
			"-q",
			"--ignore-unmatch",
			"--",
			...excludePathspecs(),
		]);
		g(["add", "-A", "--", ".", ...addExcludePathspecs()]);
		const tree = g(["write-tree"]);
		return tree.status === 0 ? tree.stdout.trim() : "";
	} finally {
		rmSync(tmpIndex, { force: true });
		rmSync(`${tmpIndex}.lock`, { force: true });
	}
}

/**
 * 지금 트리의 지문 — **경로가 아니라 내용**이다.
 *
 * ⚠ 초판은 `git status --porcelain` 의 **경로 목록만** 해싱했다. 그래서 **이미 dirty 이던
 * 파일을 또 고치면 지문이 안 바뀌었고**, 영수증이 그대로 인정됐다. 종단 대조쌍이 그것을
 * 잡았다(제품 파일에 한 줄 추가 → 훅이 0.03초에 통과 · 기대는 거부).
 *
 * 「게이트가 잰 것이 지금 push 되는 것과 같은가」를 물으려면 **변경 내용**을 봐야 한다:
 *   · tracked: `git diff HEAD` (staged + unstaged 를 함께)
 *   · untracked: 파일 내용을 직접 읽어 해시
 *
 * 깨끗한 트리는 문자열 `clean` 이다 — 빈 해시와 «못 읽었다» 를 구분하기 위해서다.
 */
export function treeFingerprint(root: string): string {
	const excludeSpecs = FINGERPRINT_EXCLUDE.map(
		(p) => `:(exclude)${p.endsWith("/") ? `${p}**` : p}`,
	);
	const diff = git(root, ["diff", "HEAD", "--", ".", ...excludeSpecs]);

	const untracked = git(root, [
		"status",
		"--porcelain",
		"--untracked-files=all",
	])
		.split("\n")
		.filter((l) => l.startsWith("?? "))
		.map((l) => l.slice(3).trim())
		.filter((p) => p.length > 0 && !isExcluded(p))
		.sort();

	const h = createHash("sha256");
	h.update(diff);
	for (const p of untracked) {
		h.update(`\n?? ${p}\n`);
		try {
			h.update(readFileSync(join(root, p)));
		} catch {
			// 읽기 실패는 «변화 없음» 이 아니다 — 경로만이라도 지문에 남겨 둔다(위 update).
			h.update("<unreadable>");
		}
	}
	if (diff.length === 0 && untracked.length === 0) return "clean";
	return h.digest("hex").slice(0, 16);
}

export function headSha(root: string): string {
	return git(root, ["rev-parse", "HEAD"]).trim();
}

export function writeReceipt(
	root: string,
	r: Omit<GateReceipt, "head" | "dirty" | "at">,
): GateReceipt {
	const receipt: GateReceipt = {
		...r,
		head: headSha(root),
		dirty: treeFingerprint(root),
		tree: contentTree(root),
		at: new Date().toISOString(),
	};
	const abs = join(root, RECEIPT_RELPATH);
	mkdirSync(dirname(abs), { recursive: true });
	writeFileSync(abs, `${JSON.stringify(receipt, null, 2)}\n`);
	return receipt;
}

export function readReceipt(root: string): GateReceipt | null {
	const abs = join(root, RECEIPT_RELPATH);
	if (!existsSync(abs)) return null;
	try {
		const d = JSON.parse(readFileSync(abs, "utf8")) as GateReceipt;
		if (typeof d.suite !== "string" || typeof d.head !== "string") return null;
		return d;
	} catch {
		return null;
	}
}

export type ReceiptVerdict =
	| { readonly usable: true; readonly receipt: GateReceipt }
	| { readonly usable: false; readonly why: string };

/**
 * 이 영수증을 **지금 push 에 쓸 수 있는가**.
 *
 * ⚠ «쓸 수 없다» 는 «실패» 가 아니라 «게이트를 돌려야 한다» 다 — 호출자가 그렇게 다뤄야 한다.
 */
export function judgeReceipt(
	receipt: GateReceipt | null,
	now: { tree: string; suite: string },
): ReceiptVerdict {
	if (receipt === null)
		return { usable: false, why: "영수증이 없다 — 아직 완주한 적이 없다" };
	if (receipt.suite !== now.suite) {
		return {
			usable: false,
			why: `영수증은 \`${receipt.suite}\` 의 것이고 지금 필요한 것은 \`${now.suite}\` 다 — 좁은 수트를 풀게이트로 인정하지 않는다`,
		};
	}
	if (typeof receipt.tree !== "string" || receipt.tree.length === 0) {
		return {
			usable: false,
			why: "영수증이 옛 형식이다(내용 트리 OID 없음) — 게이트를 한 번 완주하면 새 형식이 된다",
		};
	}
	if (now.tree.length === 0) {
		return {
			usable: false,
			why: "지금 트리의 내용 정체를 못 구했다(git 실패) — 판정 불능이지 통과가 아니다",
		};
	}
	if (receipt.tree !== now.tree) {
		return {
			usable: false,
			why: `영수증을 낸 뒤 내용이 바뀌었다 (tree ${receipt.tree.slice(0, 8)} → ${now.tree.slice(0, 8)})`,
		};
	}
	return { usable: true, receipt };
}
