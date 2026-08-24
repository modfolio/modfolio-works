#!/usr/bin/env bun
/**
 * scripts/hooks/pre-new-part-notice.ts
 *
 * PreToolUse(Write|Edit) — **새 부품을 만들려는 순간**에 한 번 알려 준다.
 *
 * ## 왜 이 순간인가
 *
 * 2026-08-25 실측: 공개 부품 **43종 중 33종을 만든 repo 자신조차 안 쓴다.**
 * 「채택 실패」가 아니라 **한 번도 배선된 적 없음**이다. 그리고 같은 날 `atlas:scan` 은
 * 소유자 없이 3곳 이상이 각자 만드는 역량을 **6건** 셌다(HWP 는 pdgd 355 · muje 113 ·
 * infra 37 파일).
 *
 * 둘 다 **짓기 전에 물어봤으면 안 생겼을 일**이다. 그 순간은 규칙을 읽는 시간이 아니라
 * `package.json` 을 쓰는 시간이고, 그래서 알림이 거기 있어야 한다.
 *
 * ## 막지 않는다 (exit 0)
 *
 * Hub-not-enforcer. 새 부품이 옳은 답인 경우가 많고, 판단은 그 repo 의 것이다.
 * 이 훅이 하는 일은 **한 줄 질문을 그 자리에 놓는 것**뿐이다.
 *
 * ⚠ **velocity 프로필이 자동 배선하지 않는다** — `constants.ts` 의 정책 그대로다.
 *   켜려면 멤버 `harness-lock.json`:
 *     { "extraHooks": [{ "file": "pre-new-part-notice.ts", "event": "PreToolUse",
 *                        "matcher": "Write|Edit" }] }
 *
 * ⚠ 못 보는 축: `bun init`·복사로 만든 부품 · `provides` 만 먼저 선언하는 경우 ·
 *   부품이 아닌 형태(엔드포인트·MCP)로 만드는 경우.
 */

import { editedFiles, readHookInput } from "./_lib.ts";

const input = await readHookInput();
const files = editedFiles(input);

// 부품의 정체성은 `packages/<name>/package.json` 이다. 앱(`apps/`)은 대상이 아니다 —
// 앱은 소비자이지 공급자가 아니고, 그쪽까지 물으면 알림이 잡음이 된다.
const NEW_PART = /(?:^|\/)packages\/[^/]+\/package\.json$/;

// CLI 동작 불변 — `bun run <file>` 은 `import.meta.main` 이 참이다.
// 가드가 없으면 이 모듈을 **import 하는 테스트가 프로세스째 종료**된다
// (2026-08-25 실측: `payment-ledger-clean` 을 import 하자 훅 스위트 15개가 돌았다).
if (import.meta.main) {
	if (files.some((f) => NEW_PART.test(f.replace(/\\/g, "/")))) {
		console.error(
			[
				"NOTICE (pre-new-part-notice): 새 부품(`packages/*/package.json`)을 건드리고 있습니다.",
				"",
				"  짓기 전에 한 번만 물어보면 두 가지를 피합니다 —",
				"    · 이미 있는 것을 다시 만들기 (atlas:scan 실측: 소유자 없이 3곳 이상이 각자 만드는 역량 6건)",
				"    · 아무도 안 쓸 것 만들기 (part:adoption 실측: 공개 부품 43종 중 33종은 만든 repo 자신도 안 씀)",
				"",
				'    mcp__ecosystem-state__plan_build  { query: "<만들려는 것>" }',
				'    또는  bun run plan:build "<만들려는 것>"',
				"",
				"  네 축을 한 번에 답합니다: 이미 정한 canon · 이미 선언된 부품 · fleet 실물 소비 · 위치 제안.",
				"  ⚠ 소유는 단정하지 않습니다 — 「그 repo 의 제품인가」는 그쪽만 압니다(atlas 법칙 2).",
				"",
				"  막지 않습니다. 새로 만드는 것이 옳은 답인 경우가 많습니다.",
			].join("\n"),
		);
	}

	process.exit(0);
}
