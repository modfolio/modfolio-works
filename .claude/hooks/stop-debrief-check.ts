#!/usr/bin/env bun
/**
 * scripts/hooks/stop-debrief-check.ts
 *
 * Stop hook (opt-in) — frontier 모델을 쓴 세션이 /debrief 없이 끝나려 하면
 * **1회 차단** + 안내. escalation 비용을 1회성 소비가 아닌 영속 자산(playbook
 * 카드)으로 바꾸는 캡처 규율의 자동 상기 장치. canon: reasoning-playbooks.md.
 *
 * 결정성 (velocity 정합 — 0 토큰, LLM 없음):
 *   - frontier 사용 감지 = transcript 에서 frontier model id 문자열 grep
 *     (id 목록 = ecosystem.json `distillation.modelTiers.frontier`).
 *   - debrief 수행 감지 = 같은 transcript 에 debrief CLI 실행 흔적
 *     (`modfolio-debrief` / `scripts/debrief/cli.ts`) 존재 여부 — clock 비교
 *     없이 세션-범위로 정확.
 *   - block-once = `stop_hook_active` 재진입 시 무조건 통과 (세리머니 방지 —
 *     안내 1회 후에는 사용자/모델 판단에 맡긴다).
 *
 * 안전: opt-in 전용 (`harness-lock.json {"autoDebrief":true}` — settings-adapt
 * 가 게이트하지만 방어적 재확인). config/transcript 부재 등 모든 이상 경로는
 * exit 0 (절대 세션을 막는 원인이 되지 않는다).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findEcosystemRoot, gitRoot, readHookInput } from "./_lib.ts";

/** Transcript fragments that prove /debrief ran this session. */
const DEBRIEF_MARKERS = ["modfolio-debrief", "scripts/debrief/cli.ts"];

function frontierIds(cwd: string, ecoRoot: string | undefined): string[] {
	const candidates = [
		ecoRoot ? join(ecoRoot, "ecosystem.json") : undefined,
		join(cwd, "node_modules", "@modfolio", "harness", "ecosystem.json"),
		join(cwd, "ecosystem.json"),
	].filter((p): p is string => p !== undefined);
	for (const path of candidates) {
		if (!existsSync(path)) continue;
		try {
			const raw = JSON.parse(readFileSync(path, "utf-8")) as {
				distillation?: { modelTiers?: { frontier?: unknown } };
			};
			const frontier = raw.distillation?.modelTiers?.frontier;
			if (Array.isArray(frontier)) {
				const ids = frontier.filter(
					(m): m is string => typeof m === "string" && m.length >= 3,
				);
				if (ids.length > 0) return ids;
			}
		} catch {
			// malformed config — try the next candidate
		}
	}
	return [];
}

try {
	const input = await readHookInput();
	// block-once: 이미 한 번 차단된 재진입이면 무조건 통과.
	if (input.stop_hook_active === true) process.exit(0);

	const cwd = gitRoot();
	// opt-in 재확인 — wiring 이 게이트하지만 방어적 재확인.
	let optIn = false;
	try {
		const lock = JSON.parse(
			readFileSync(join(cwd, ".claude", "harness-lock.json"), "utf-8"),
		) as {
			autoDebrief?: boolean;
		};
		optIn = lock.autoDebrief === true;
	} catch {
		optIn = false;
	}
	if (!optIn) process.exit(0);

	const transcriptPath = input.transcript_path;
	if (!transcriptPath || !existsSync(transcriptPath)) process.exit(0);
	const transcript = readFileSync(transcriptPath, "utf-8");

	const ids = frontierIds(cwd, findEcosystemRoot(cwd));
	if (ids.length === 0) process.exit(0);
	const frontierUsed = ids.some((id) => transcript.includes(`"model":"${id}"`));
	if (!frontierUsed) process.exit(0);

	const debriefed = DEBRIEF_MARKERS.some((marker) =>
		transcript.includes(marker),
	);
	if (debriefed) process.exit(0);

	console.log(
		JSON.stringify({
			decision: "block",
			reason:
				"frontier 모델을 사용한 세션인데 /debrief 카드가 없습니다 — escalation 비용을 영속 자산으로 바꾸는 마지막 단계입니다. `/debrief` 로 카드 1장(escalation 블록 포함)을 남기고 종료하세요. 규범: knowledge/canon/debrief-format.md (1회 안내 — 다음 종료는 차단하지 않음).",
		}),
	);
	process.exit(0);
} catch {
	// 어떤 이상 경로도 세션 종료를 막지 않는다.
	process.exit(0);
}
