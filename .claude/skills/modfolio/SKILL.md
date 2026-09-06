---
name: modfolio
description: modfolio universe 나침반 — 세션 시작·새 기능 지시 직전·찜찜할 때 아무 때나. 5초 카드로 «어디에 있나 · 무엇을 지켜야 하나 · 지금 트리가 규약 안인가(경계·lock·게이트)» 를 실측으로 말하고, --intent 로 «이 일의 주인·기존 부품» 을 답한다. --deep 은 14 트랙 진단.
effort: medium
user-invocable: true
---

# /modfolio — 나침반 (기본) · 깊은 진단 (`--deep`) · 법 게이트 (`--laws`)

우리 방식은 하나다: **기능은 소유 repo 에서 만들어 게시하고, 앱은 조합만 한다.** 이 스킬은 그 방식을 산문으로 반복하지 않고 **지금 트리를 재서** 다시 말한다(canon `instruction-drift.md` — 규칙은 구조로 지킨다).

## 기본 — 나침반 카드 (0 네트워크 · <5s)

```bash
bun run modfolio:compass                       # 허브
bun node_modules/@modfolio/harness/scripts/modfolio/compass.ts   # 멤버 (harness-pull 이 `modfolio:compass` 로 배선한다)
```

카드 한 장: 법 4편 · 조합 규약 1줄 · 지시 3줄(고정, 짧다) + **실측** — 하네스 버전 · lock 추적/packageManager · 게이트 배선 · **다른 앱 코드 직접 import**(위반이면 파일:줄) · 제공/소비 부품 · 트리 상태 · (허브) 활성 Writ. 종료 코드 0 규약 안 · 1 위반 · 2 판정 불능.

**언제**: 세션 시작에 한 번 · 사용자가 «새 기능» 을 말한 직후 · 커밋 전에 찜찜할 때. 카드가 ✗ 를 내면 그 줄부터 고치고 계속한다.

## 새 기능 지시 직전 — `--intent`

```bash
bun run modfolio:compass -- --intent "장바구니 쿠폰"
```

카드 + `plan:build` 위임: 이미 정한 canon/ADR · 이미 만든 부품(79건 등록) · fleet 실물 소비 · 주인 판정. **패키지·API 이름처럼 좁혀 물을수록 정확하다**(넓은 문장은 «판정 불능» 을 낸다 — 그건 도구가 옳은 것이다). 멤버에 plan:build 가 없으면 허브 세션이나 MCP `ecosystem-state.plan_build` 로 안내한다.

지시는 세 줄로 낸다 — 카드에 그대로 찍힌다:
1. 결과를 앱 기준으로 · 2. 소유를 재거나 명시 · 3. 조합 형태(부품·엔드포인트·이벤트)를 명시, 직접 import 금지.

## 깊은 진단 — `--deep` (5–10분 · effort 높음)

```bash
bun run modfolio -- --deep        # = scripts/modfolio/check.ts (14 트랙: harness-coherence · knowledge-coverage · skill-agent · stack-evergreen · effort-policy · feedback-cycle · secrets-ops · temporal · smart-triage · action-preview · meta-diagnosis · external-signal · attention-budget …)
bun run modfolio -- --quick       # 핵심 5 트랙 (1–2분)
bun run modfolio -- --laws        # 법 준수 게이트 (stable bin · errors fail)
```

plan mode 안에서 `--deep` 을 부르면 plan 파일에 수정 절차를 자동으로 적는다. read-only 진단이 기본이고 외부 영향 작업(push·publish·send)은 자동으로 하지 않는다. 산출물 `.modfolio-report.json` · `.modfolio-history/`.

## 안 하는 것

- 파일을 고치지 않는다(카드는 진단이다). 다른 repo 를 건드리지 않는다(허브는 Writ 없이 sibling 수정 없음).
- 규칙 문장을 늘리지 않는다 — 새 교훈은 게이트(가능하면)나 `/debrief` 로 간다. 이 파일에 append 하지 않는다.

## 관련

- canon `assembly-law` · `atlas` · `registry-redundancy` · `knowledge-sovereignty`(법 4편) · `instruction-drift`
- `/plan`(plan:build) · `/adopt-laws`(법 자가 진단) · `/contracts`(계약 변경) · `/orbit`(허브의 cross-repo 순회)
