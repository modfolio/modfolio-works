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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

/**
 * 편집 도구 호출 수 — «이 세션이 실제로 무언가를 했는가» 의 결정적 대리 지표.
 *
 * **0 토큰·LLM 없음**(velocity 정합). 세는 것은 *assistant 메시지의 `tool_use` 블록*이다.
 *
 * ## 문자열 계수에서 구조 파싱으로 바꾼 이유 (2026-09-18 실측)
 *
 * 종전 구현은 전사록 전체에서 `"name":"Edit"` 같은 **문자열**을 셌다. 그런데 Claude Code 는
 * 전사록에 `type:"attachment"` · `attachment.type:"prompt_snapshot"` 행을 남기고, 그 안의
 * `tools[]` 가 도구 **스키마**(`{name:"Edit", description, schema}`)를 통째로 담는다. 그래서
 * 편집 도구를 **한 번도 호출하지 않은** 세션이 «편집 4건» 으로 집계돼 발동했다 — 위 헤더의
 * `modfolio-debrief` 사고와 같은 부류다(관측자가 자기 소음을 신호로 셌다). 그 세션의 실제
 * 호출은 Bash 8 · MCP 3 · ToolSearch 1 · Workflow 1 이었다.
 *
 * ⚠ «정확한 도구명만 센다» 로는 부족했다 — 이름은 정확했고 **자리가 틀렸다.**
 */
const EDIT_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);

function editCount(transcript: string): number {
	let n = 0;
	for (const line of transcript.split("\n")) {
		// 값싼 사전 필터 — `tool_use` 가 없는 줄은 파싱하지 않는다(수백 MB 전사록 대비).
		if (!line.includes('"tool_use"')) continue;
		let row: { type?: unknown; message?: { content?: unknown } };
		try {
			row = JSON.parse(line) as typeof row;
		} catch {
			continue; // 깨진 줄은 «편집» 의 증거가 아니다
		}
		if (row.type !== "assistant") continue;
		const content = row.message?.content;
		if (!Array.isArray(content)) continue;
		for (const block of content as { type?: unknown; name?: unknown }[]) {
			if (
				block?.type === "tool_use" &&
				typeof block.name === "string" &&
				EDIT_TOOLS.has(block.name)
			)
				n++;
		}
	}
	return n;
}

/**
 * 세션당 1회 — 안내 문구가 약속한 계약(«1회 안내 — 다음 종료는 차단하지 않음»)의 집행.
 *
 * `stop_hook_active` 는 **한 번의 종료 시도 안에서만** 참이다. 사용자가 다음 메시지를 보내면
 * 다시 거짓이 되므로, 그것만으로는 대화형 세션의 **매 턴**이 한 번씩 차단됐다(2026-09-18 실측:
 * 같은 세션에서 4턴 연속). 매 턴 울리는 안내는 세리머니이고, 무시하도록 훈련시킨다.
 *
 * 표식은 저장소가 아니라 **임시 디렉터리**에 둔다 — 세션 수명의 상태이고, 멤버 repo 의
 * .gitignore 에 기대지 않으며, 재부팅으로 사라져도 안내가 한 번 더 나갈 뿐이다.
 */
function nudgeMarker(sessionId: string): string {
	const dir =
		process.env.MODFOLIO_DEBRIEF_NUDGE_DIR ??
		join(tmpdir(), "modfolio-debrief-nudged");
	return join(dir, sessionId.replace(/[^A-Za-z0-9_-]/g, "_"));
}

function alreadyNudged(sessionId: string | undefined): boolean {
	return sessionId !== undefined && existsSync(nudgeMarker(sessionId));
}

function recordNudge(sessionId: string | undefined): void {
	if (sessionId === undefined) return;
	try {
		const path = nudgeMarker(sessionId);
		mkdirSync(join(path, ".."), { recursive: true });
		writeFileSync(path, `${new Date().toISOString()}\n`);
	} catch {
		// 표식을 못 남겨도 안내는 나간다 — 다음 턴에 한 번 더 울릴 뿐이다.
	}
}

/**
 * 실작업 문턱. **이 값이 이 훅의 전부**이므로 근거를 남긴다 — 30일 세션 382개 실측
 * (2026-08-14, `~/.claude/projects/*​/*.jsonl`):
 *
 *     편집 0회        192건   ← 대화형. 여기 울리면 세리머니가 된다
 *     편집 3회 이상   188건   ← 실작업
 *     중앙값 0 · 상위10% 140
 *
 * 중앙값이 0 이라 문턱을 0 초과 어디에 두든 대화형은 걸러진다. 3 을 고른 것은 «한두 번
 * 고쳐 본 것» 과 «작업» 사이의 보수적 경계다. 올리면 놓치고, 내리면 소음이 된다.
 */
const SUBSTANTIVE_EDITS = 3;

/**
 * 프론티어 «가족» 정규식 — `modelTiers.frontier` 정확 목록의 보완.
 *
 * 종전 판정은 `transcript.includes(\`"model":"${id}"\`)` — **닫는 따옴표까지 정확 일치**라
 * `claude-fable-5-1` 이 목록의 `claude-fable-5` 에 안 걸렸다(2026-09-02 pdgd 제보). 정확
 * 목록은 모델이 나올 때마다 낡고, 그 사이 `frontierUsed` 는 조용히 거짓이다.
 *
 * ⚠ 이 리터럴은 `contracts/debrief/tiering.ts` 의 frontier 가족 정규식과 **동일해야** 한다.
 * 훅은 멤버 repo 에 단독 파일로 배포되어 contracts 를 import 할 수 없으므로 리터럴을 두고,
 * `scripts/hooks/tests/stop-debrief-check.test.ts` 의 동일성 테스트가 두 소스를 대조한다.
 */
const FRONTIER_FAMILY = /fable|mythos|gpt-5\.\d|gemini-\d+-ultra/i;

/** 전사록에 실린 `"model":"…"` 값 전부 — 어떤 모델이 이 세션에서 한 번이라도 답했는가. */
function modelsUsed(transcript: string): string[] {
	const seen = new Set<string>();
	for (const m of transcript.matchAll(/"model":"([^"]+)"/g)) {
		if (m[1]) seen.add(m[1]);
	}
	return [...seen];
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

	// ── 발동 조건 (2026-08-14 교체) ────────────────────────────────────────────
	//
	// 종전 조건은 **frontier 모델 사용**뿐이었다(`modelTiers.frontier`). 그런데 그 목록은
	// `["claude-fable-5", "claude-mythos-5", "gpt-5.6-sol"]` 이고 **이 universe 의 기본
	// 모델인 `claude-opus-5` 는 거기 없다.** 그래서 Opus 세션은 이 훅에 닿지도 못했다.
	//
	// 그 전제를 실측이 반증한다 (2026-08-14):
	//
	//     최근 30일 세션 382 · debrief 카드 32  → **캡처율 8.4%**
	//     실작업(편집 3회+) 188건 중 **162건이 frontier 아님 = 완전 무감**
	//     카드 530장 중 opus 출처는 14장(2.6%)뿐인데, 그 14장이 남긴 bullet 은 **69개** —
	//     증류분 138개의 **50%**. 즉 증류 지식의 절반을 만드는 세션이 안내를 못 받았다.
	//
	// 그리고 그 침묵이 상류를 막고 있었다: 승격은 `helpful ≥ 1` 을 요구하고 helpful 은
	// **카드에서만** 온다. 카드가 없으니 증류 bullet 은 **한 건도 Active 에 오른 적이 없다**
	// (Active 286 = 전부 2026-07-11 일괄 유입분). 캡처를 고치지 않으면 그 위 전부가 멈춘다.
	//
	// ⇒ 조건을 «비싼 모델을 썼나» 에서 «무언가를 했나» 로 바꾼다. debrief 를 해야 할 이유는
	//   escalation 비용이 아니라 **배운 것**이고, 후자는 편집 수로 결정적으로 잴 수 있다.
	//   frontier 경로는 남긴다 — 편집이 적어도 escalation 자체가 캡처 가치를 갖는다.
	const ids = frontierIds(cwd, findEcosystemRoot(cwd));
	// 정확 목록 ∪ 가족 정규식. 목록이 비어도(ecosystem.json 미발견) 가족만으로 판정한다 —
	// 종전엔 목록이 비면 frontierUsed 가 무조건 거짓이었다.
	const frontierUsed = modelsUsed(transcript).some(
		(m) => ids.includes(m) || FRONTIER_FAMILY.test(m),
	);
	const substantive = editCount(transcript) >= SUBSTANTIVE_EDITS;
	if (!frontierUsed && !substantive) process.exit(0);

	const debriefed =
		debriefedByArtifact(cwd, sessionStartMs(transcript)) ||
		DEBRIEF_SUCCESS_MARKERS.some((marker) => transcript.includes(marker));
	if (debriefed) process.exit(0);

	// 세션당 1회 — 이미 안내한 세션은 다시 막지 않는다(위 `nudgeMarker` 주석).
	const sessionId =
		typeof input.session_id === "string" && input.session_id.length > 0
			? input.session_id
			: undefined;
	if (alreadyNudged(sessionId)) process.exit(0);

	// ⚠ **발동한 가지를 그대로 말한다.** 종전 문구는 조건과 무관하게 언제나
	//   *"frontier 모델을 사용한 세션인데…(escalation 블록 포함)"* 이었다. 그런데 위 조건은
	//   2026-08 에 «비싼 모델을 썼나» → «무언가를 했나(편집 수)» 로 **바뀌었고 문구만 남았다.**
	//   실측 2026-09-07: `claude-opus-5` 단독 세션(assistant 623턴 · frontier id 0)에서 발동해
	//   「frontier 를 썼다」고 단언했다 — 조건이 재지 않은 사실이다.
	//   대가가 크다: 없는 escalation 블록을 **지어내도록** 유도한다(카드 오염 = 코퍼스 오염).
	//   게이트의 빨간불도 초록불과 같은 규율을 진다 — **잰 것만 말한다.**
	const reason = frontierUsed
		? "frontier 모델을 사용한 세션인데 /debrief 카드가 없습니다 — escalation 비용을 영속 자산으로 바꾸는 마지막 단계입니다. `/debrief` 로 카드 1장(**escalation 블록 포함**)을 남기고 종료하세요. 규범: knowledge/canon/debrief-format.md (1회 안내 — 다음 종료는 차단하지 않음)."
		: `편집 ${editCount(transcript)}건의 세션인데 /debrief 카드가 없습니다 — 배운 것을 영속 자산으로 바꾸는 마지막 단계입니다. \`/debrief\` 로 카드 1장을 남기고 종료하세요. ⚠ 이 세션에서 frontier 모델은 감지되지 않았습니다 — **escalation 블록은 실제 escalation 이 있었을 때만** 채우십시오(없는 것을 지어내면 코퍼스가 오염됩니다). 규범: knowledge/canon/debrief-format.md (1회 안내 — 다음 종료는 차단하지 않음).`;
	recordNudge(sessionId);
	console.log(JSON.stringify({ decision: "block", reason }));
	process.exit(0);
} catch {
	// 어떤 이상 경로도 세션 종료를 막지 않는다.
	process.exit(0);
}
