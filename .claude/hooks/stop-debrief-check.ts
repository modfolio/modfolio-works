#!/usr/bin/env bun
/**
 * scripts/hooks/stop-debrief-check.ts
 *
 * Stop hook (fleet-default since 3.43.0) — frontier 모델을 쓴 세션이 /debrief
 * 없이 끝나려 하면 **1회 차단** + 안내. escalation 비용을 1회성 소비가 아닌
 * 영속 자산(playbook 카드)으로 바꾸는 캡처 규율의 자동 상기 장치.
 * canon: reasoning-playbooks.md. opt-out = harness-lock `{"autoDebrief":false}`.
 *
 * ## 감지가 v3.20 → 3.43.0 에서 교체된 이유 (관측자가 자기 소음을 신호로 셌다)
 *
 * 종전 판정은 transcript 전체에 `"modfolio-debrief"` 가 **등장하기만 하면**
 * debrief 완료로 봤다. 그런데 `bun install` 이 하네스 bin 목록을 출력하며
 * `- modfolio-debrief` 줄을 찍는다 — **하네스를 설치/갱신한 모든 세션이 nudge 를
 * 무장해제**했다. 실측: atelier 가 opt-in 을 켜고도 frontier 20-커밋 밤샘에서
 * 카드 0장, 훅은 76ms 로 돌고 통과(2026-07-28). `scripts/debrief/cli.ts` marker
 * 도 같았다 — 그 파일을 읽기만 해도 발화 해제.
 *
 * 새 판정 (산출물 우선, 결정적):
 *   1. `.claude/last-debrief` 의 ISO timestamp ≥ 세션 시작 시각 — debrief CLI 가
 *      성공 append 마다 쓰는 마커라, 세션-범위로 정확하고 위조 유인이 없다.
 *   2. fallback: CLI 성공 출력 **원문**(`debrief: appended` / queued) 만 —
 *      dry-run(`debrief: valid (dry-run)`)은 카드가 아니므로 세지 않는다.
 *
 * 결정성 (velocity 정합 — 0 토큰, LLM 없음):
 *   - frontier 사용 감지 = transcript 에서 frontier model id 문자열 grep
 *     (id 목록 = ecosystem.json `distillation.modelTiers.frontier`).
 *   - block-once = `stop_hook_active` 재진입 시 무조건 통과 (세리머니 방지 —
 *     안내 1회 후에는 사용자/모델 판단에 맡긴다).
 *
 * 안전: config/transcript 부재·판정 불능 등 모든 이상 경로는 exit 0
 * (절대 세션을 막는 원인이 되지 않는다).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findEcosystemRoot, gitRoot, readHookInput } from "./_lib.ts";

/**
 * CLI 성공 출력의 원문 접두 — 이 둘만 debrief 의 증거다. 넓은 단어 매칭은 위
 * 헤더의 사고로 금지: marker 는 "그 일이 일어났을 때만 나타나는 문자열" 이어야
 * 하고, 패키지 bin 이름은 그 조건을 만족하지 않는다.
 */
const DEBRIEF_SUCCESS_MARKERS = [
	"debrief: appended ",
	"debrief: ecosystem root not visible — queued ",
];

/** transcript 첫 timestamp = 세션 시작. 못 읽으면 undefined(판정 불능 → 억제). */
function sessionStartMs(transcript: string): number | undefined {
	const m = /"timestamp"\s*:\s*"([^"]+)"/.exec(transcript);
	if (!m?.[1]) return undefined;
	const ms = Date.parse(m[1]);
	return Number.isFinite(ms) ? ms : undefined;
}

/** `.claude/last-debrief` 가 세션 시작 이후를 가리키면 true. */
function debriefedByArtifact(
	cwd: string,
	startMs: number | undefined,
): boolean {
	if (startMs === undefined) return false;
	try {
		const raw = readFileSync(
			join(cwd, ".claude", "last-debrief"),
			"utf-8",
		).trim();
		const ms = Date.parse(raw);
		return Number.isFinite(ms) && ms >= startMs;
	} catch {
		return false;
	}
}

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
	// fleet-default (3.43.0) — settings-adapt 이 autoDebrief:false 면 배선 자체를
	// 빼지만, 방어적으로 opt-OUT 을 여기서도 존중한다(배선 잔재 대비).
	try {
		const lock = JSON.parse(
			readFileSync(join(cwd, ".claude", "harness-lock.json"), "utf-8"),
		) as {
			autoDebrief?: boolean;
		};
		if (lock.autoDebrief === false) process.exit(0);
	} catch {
		// lock 부재/파손 = 기본(켜짐)
	}

	const transcriptPath = input.transcript_path;
	if (!transcriptPath || !existsSync(transcriptPath)) process.exit(0);
	const transcript = readFileSync(transcriptPath, "utf-8");

	const ids = frontierIds(cwd, findEcosystemRoot(cwd));
	if (ids.length === 0) process.exit(0);
	const frontierUsed = ids.some((id) => transcript.includes(`"model":"${id}"`));
	if (!frontierUsed) process.exit(0);

	const debriefed =
		debriefedByArtifact(cwd, sessionStartMs(transcript)) ||
		DEBRIEF_SUCCESS_MARKERS.some((marker) => transcript.includes(marker));
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
