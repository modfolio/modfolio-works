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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
] as const;

export interface GateReceipt {
	/** 어느 수트가 완주했나. 좁은 수트를 풀게이트로 인정하지 않기 위해 반드시 적는다. */
	readonly suite: string;
	readonly stepCount: number;
	/** 건너뛴 단계 — 침묵한 스킵은 「전부 검사됨」으로 읽힌다. */
	readonly skipped: readonly string[];
	readonly head: string;
	/** 워킹트리 지문(제외 목록 반영). 트리가 깨끗하면 `clean`. */
	readonly dirty: string;
	readonly at: string;
}

function git(root: string, args: string[]): string {
	const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
	return r.status === 0 ? r.stdout : "";
}

export function isExcluded(path: string): boolean {
	return FINGERPRINT_EXCLUDE.some((p) =>
		p.endsWith("/") ? path.startsWith(p) : path === p,
	);
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
	now: { head: string; dirty: string; suite: string },
): ReceiptVerdict {
	if (receipt === null)
		return { usable: false, why: "영수증이 없다 — 아직 완주한 적이 없다" };
	if (receipt.suite !== now.suite) {
		return {
			usable: false,
			why: `영수증은 \`${receipt.suite}\` 의 것이고 지금 필요한 것은 \`${now.suite}\` 다 — 좁은 수트를 풀게이트로 인정하지 않는다`,
		};
	}
	if (receipt.head !== now.head) {
		return {
			usable: false,
			why: `영수증의 HEAD(${receipt.head.slice(0, 8)}) 가 지금(${now.head.slice(0, 8)}) 과 다르다`,
		};
	}
	if (receipt.dirty !== now.dirty) {
		return {
			usable: false,
			why:
				receipt.dirty === "clean" || now.dirty === "clean"
					? "영수증을 낸 뒤 워킹트리가 바뀌었다"
					: `워킹트리 지문이 다르다 (${receipt.dirty} → ${now.dirty})`,
		};
	}
	return { usable: true, receipt };
}
