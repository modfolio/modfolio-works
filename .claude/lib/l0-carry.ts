/**
 * scripts/lib/l0-carry.ts — L0 이월: 직전 풀 영수증 뒤 바뀐 것이 **전부 L0 문서**면 그 델타에만 검사를 돌려 영수증을 이어받는다 (3.93.1).
 *
 * 오너 결정 2026-09-24(L0 이월 채택 · 델타 검사 셋 유지 · atelier-and-folio 요청 2): 인계·원장·저널만 바뀐 push 가 전체 게이트(허브 실측 5~6분)를
 * 다시 돌지 않게 한다. 3.93.0 게시 밤, 인계만 고친 push 두 번이 각각 전체 게이트를 다시 돌았다.
 *
 * 이어받는 조건 — 하나라도 아니면 `ok: false`(평소 규칙 = 풀 게이트):
 *  ① 영수증이 풀 수트(`gate:full`·`gate:release`)이고 그 내용 트리가 저장소에 있다
 *  ② 영수증 트리 → 지금 트리의 변경이 **전부** L0 — `reviewPolicy.l0Paths` 아래의 문서 확장자(리뷰 실행기와 같은 `isL0Path`)
 *  ③ 델타 검사 셋(풀 게이트가 이 파일들에 하는 것):
 *     · 비밀 스윕 — 델타의 **추가된 줄**(선언 `secret-sweep-allowlist.json` 반영)
 *     · NUL — 추가·수정된 파일에 NUL 바이트가 없다
 *     · 오너 원문 — 인계(`knowledge/HANDOFF.md`·`knowledge/handoff/**`)가 바뀌면 풀 게이트의 그 테스트를 **그대로** 돌린다
 *       (`voice-quote-privacy` · 원장 ID 가 어딘가에서 쓰이는지까지). 원장이 없는 멤버는 «해당 없음».
 *
 * ⚠ 못 보는 것: L0 문서를 읽는 다른 풀 게이트 단계가 생기면 이월이 그것을 건너뛴다 — L0 경로는 문서(인계·원장·저널·계획)라 제품·정책
 *   검사가 읽지 않는다는 전제다. 전제가 깨지면 `reviewPolicy.l0Paths` 에서 그 경로를 뺀다(이월도 리뷰 L0 도 함께 좁아진다).
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { collectAdded } from "../hooks/_wip-push.ts";
import { parseSecretAllowlist, scanSecrets } from "../hooks/secret-patterns.ts";
import type { GateReceipt } from "./gate-receipt.ts";

/**
 * L0 로 칠 수 있는 확장자 — 문서와 **기록**뿐이다. 문서 폴더 아래의 SQL·스크립트·JSON 은 L0 가 아니다.
 * `jsonl` 은 debrief 코퍼스(`memory/debriefs/*.jsonl`)다 — 정책이 그 폴더를 L0 로 적었는데 확장자가
 * 받지 않아 그 커밋이 늘 L1 로 떨어졌다(정책과 판정의 모순 · 2026-09-24). 실행되는 파일이 아니다.
 */
export const DOC_EXT = /\.(md|mdx|txt|jsonl)$/i;

/** L0 경로인가 — 리뷰 실행기(`review:run`)와 push 이월이 **같은 판정**을 쓴다. */
export function isL0Path(path: string, l0Paths: readonly string[]): boolean {
	return (
		DOC_EXT.test(path) &&
		l0Paths.some((l0) => path === l0 || path.startsWith(l0))
	);
}

/** 정책의 L0 경로 — 멤버 투영(`.modfolio/ai-routing.json`) 다음 허브 정본(`config/ai-routing.json`). 못 읽으면 null. */
export function readL0Paths(root: string): string[] | null {
	for (const rel of [".modfolio/ai-routing.json", "config/ai-routing.json"]) {
		const p = join(root, rel);
		if (!existsSync(p)) continue;
		try {
			const l0 = (
				JSON.parse(readFileSync(p, "utf8")) as {
					reviewPolicy?: { l0Paths?: unknown };
				}
			).reviewPolicy?.l0Paths;
			if (
				Array.isArray(l0) &&
				l0.length > 0 &&
				l0.every((x) => typeof x === "string")
			)
				return l0 as string[];
		} catch {
			// 다음 후보
		}
	}
	return null;
}

export const PRIVACY_TEST = "scripts/__tests__/voice-quote-privacy.test.ts";
const QUOTES_LEDGER = "knowledge/voice/_quotes.md";
const ALLOWLIST = ".claude/rules/secret-sweep-allowlist.json";
const FULL_SUITES: ReadonlySet<string> = new Set(["gate:full", "gate:release"]);

export type CarryVerdict =
	| { readonly ok: true; readonly message: string }
	| { readonly ok: false; readonly reason: string };

export type PrivacyRunner = (root: string) => { ok: boolean; detail: string };

/** 풀 게이트의 오너 원문 테스트를 그대로 — 허브 실측 9.3초. */
export const runPrivacyTest: PrivacyRunner = (root) => {
	const r = spawnSync(process.execPath, ["test", PRIVACY_TEST], {
		cwd: root,
		encoding: "utf8",
		timeout: 45_000,
		stdio: ["ignore", "pipe", "pipe"],
	});
	return {
		ok: r.status === 0,
		detail: r.status === null ? "시간 초과" : `exit ${r.status}`,
	};
};

function git(root: string, args: readonly string[]) {
	return spawnSync("git", ["-c", "core.quotePath=false", ...args], {
		cwd: root,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
		stdio: ["ignore", "pipe", "pipe"],
	});
}

/**
 * 판정 — `currentTree` 는 지금 작업 트리의 내용 트리(`contentTree(root)`)다. 영수증과 같으면 이월이 아니라 그냥 인정이므로
 * 호출자가 먼저 가른다.
 */
export function judgeL0Carry(
	root: string,
	receipt: GateReceipt | null,
	currentTree: string,
	runPrivacy: PrivacyRunner = runPrivacyTest,
): CarryVerdict {
	const no = (reason: string): CarryVerdict => ({ ok: false, reason });
	if (receipt === null || !FULL_SUITES.has(receipt.suite))
		return no("직전 풀 영수증(gate:full·gate:release)이 없다");
	const base = receipt.tree;
	// 인정 조건은 `judgeReceipt` 와 같다(수트 · 내용 트리 · 지금 트리를 구했음) — 트리 **같음** 대신 «델타가 전부 L0» 를 본다.
	// `skipped`·`stepCount` 는 거기서도 인정 조건이 아니다(가드가 출력만 한다 · 3.93.1 리뷰 P2).
	if (!base) return no("영수증에 내용 트리가 없다(옛 판)");
	if (currentTree.length === 0)
		return no("지금 트리의 내용 정체를 못 구했다(git 실패)");
	if (base === currentTree) return no("이어받을 델타가 없다");
	const l0 = readL0Paths(root);
	if (l0 === null) return no("L0 경로 정책(reviewPolicy.l0Paths)을 못 읽었다");
	if (git(root, ["cat-file", "-e", `${base}^{tree}`]).status !== 0)
		return no("영수증의 내용 트리가 저장소에 없다");

	const ns = git(root, [
		"diff",
		"--name-status",
		"-z",
		"--no-renames",
		base,
		currentTree,
	]);
	if (ns.status !== 0) return no("델타를 못 읽었다");
	const parts = (ns.stdout ?? "").split("\0").filter((s) => s.length > 0);
	const entries: { status: string; path: string }[] = [];
	for (let i = 0; i + 1 < parts.length; i += 2)
		entries.push({ status: parts[i] ?? "", path: parts[i + 1] ?? "" });
	if (entries.length === 0) return no("델타가 비었다(모드만 바뀜 등)");
	const outside = entries.filter((e) => !isL0Path(e.path, l0));
	if (outside.length > 0)
		return no(
			`L0 밖 변경 ${outside.length}개(${outside
				.slice(0, 3)
				.map((e) => e.path)
				.join(" · ")})`,
		);

	// 비밀 스윕 — 델타의 추가된 줄 · 선언은 지금 트리의 것(선언 파일은 L0 가 아니라 바뀌었으면 이미 위에서 떨어졌다)
	const patch = git(root, [
		"diff",
		"-p",
		"--no-color",
		"--no-ext-diff",
		"--no-textconv",
		"--no-renames",
		base,
		currentTree,
	]);
	if (patch.status !== 0) return no("델타 패치를 못 읽었다");
	const { blocks, binaries } = collectAdded(patch.stdout ?? "");
	if (binaries.length > 0) return no("L0 델타에 바이너리 변경이 있다");
	let allowed: Set<string>;
	try {
		const decl = git(root, ["show", `${currentTree}:${ALLOWLIST}`]);
		allowed =
			decl.status === 0
				? new Set(
						parseSecretAllowlist(decl.stdout ?? "").map(
							(a) => `${a.file}::${a.id}`,
						),
					)
				: new Set();
	} catch {
		return no("비밀 스윕 선언이 손상됐다");
	}
	const hits = blocks.flatMap((b) =>
		scanSecrets(b.text)
			.filter((h) => !allowed.has(`${b.file}::${h.id}`))
			.map((h) => `${b.file} [${h.id}]`),
	);
	if (hits.length > 0)
		return no(
			`선언되지 않은 비밀 모양 ${hits.length}건 — ${hits.slice(0, 3).join(" · ")}`,
		);

	// NUL — 추가·수정된 파일
	for (const e of entries.filter((x) => x.status !== "D")) {
		const blob = spawnSync(
			"git",
			["cat-file", "blob", `${currentTree}:${e.path}`],
			{
				cwd: root,
				maxBuffer: 64 * 1024 * 1024,
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
		if (blob.status !== 0) return no(`${e.path} 를 못 읽었다`);
		if ((blob.stdout as Buffer).includes(0))
			return no(`${e.path} 에 NUL 바이트가 있다`);
	}

	// 오너 원문 — 인계가 바뀌면 풀 게이트의 그 테스트를 그대로
	const handoff = entries.some(
		(e) =>
			e.path === "knowledge/HANDOFF.md" ||
			e.path.startsWith("knowledge/handoff/"),
	);
	let privacy = "해당 없음(인계 변경 없음)";
	if (handoff) {
		if (
			!existsSync(join(root, PRIVACY_TEST)) ||
			!existsSync(join(root, QUOTES_LEDGER))
		)
			privacy = "해당 없음(원장 없음)";
		else {
			// 원문 검사는 **작업 트리**에서 돈다 — 판정 대상(currentTree · push 하는 커밋)과 인계 파일이 다르면
			// 그 통과는 보내는 내용의 통과가 아니다. 다르면 이월하지 않는다(3.93.3 리뷰 · 풀 게이트로).
			for (const e of entries.filter(
				(x) =>
					x.path === "knowledge/HANDOFF.md" ||
					x.path.startsWith("knowledge/handoff/"),
			)) {
				const inTree = git(root, ["rev-parse", `${currentTree}:${e.path}`]);
				const onDisk = existsSync(join(root, e.path))
					? git(root, ["hash-object", "--", e.path])
					: null;
				const want = e.status === "D" ? null : (inTree.stdout ?? "").trim();
				const have = onDisk === null ? null : (onDisk.stdout ?? "").trim();
				if (want !== have)
					return no(
						`${e.path} 가 보내는 커밋과 작업 트리에서 다르다 — 원문 검사가 보내는 내용을 재지 못한다`,
					);
			}
			const r = runPrivacy(root);
			if (!r.ok) return no(`오너 원문 검사 실패 — ${r.detail}`);
			privacy = "통과";
		}
	}
	return {
		ok: true,
		message:
			`L0 이월 — \`${receipt.suite}\` 영수증(tree ${base.slice(0, 8)}) 뒤 L0 문서 ${entries.length}개만 바뀌었다 · ` +
			`비밀 스윕 추가 블록 ${blocks.length}개 · NUL 0 · 오너 원문 ${privacy}`,
	};
}
