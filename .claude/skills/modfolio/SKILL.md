---
name: modfolio
description: modfolio universe 의 **정체성·법칙 점검** — 어느 시점에서든 부른다. 나침반 카드(법·조합 규약·경계·lock·게이트 배선) + 5법칙 · 구성 준수(effort 정책·압축 창·리뷰 정책·세 표면 명령) · 못 재는 축은 «미검사» 로. --card 는 카드만, --intent 는 이 일의 주인·기존 부품, --deep 은 14 트랙 진단. 세션 시작은 /modfolio-sun, 마무리는 /modfolio-moon.
effort: medium
user-invocable: true
---

# /modfolio — 정체성·법칙 점검 (언제든) · 카드만 (`--card`) · 깊은 진단 (`--deep`)

우리 방식은 하나다: **기능은 소유 repo 에서 만들어 게시하고, 앱은 조합만 한다.** 이 스킬은 그 방식을 산문으로 반복하지 않고 **지금 트리를 재서** 다시 말한다(canon `instruction-drift.md` — 규칙은 구조로 지킨다).

오너 2026-09-23 저녁(원문 비공개 — _quotes.md#WF-27 · ADR-029): `/modfolio` 는 어느 시점에서든 universe 의 규칙·법칙·구성·구조가
지켜지는지, 기능이 소유한 곳에서만 만들어지고 같은 기능이 여러 곳에서 따로 자라지 않는지를 보는 점검이다.
세션을 여는 일은 **`/modfolio-sun`**, 닫는 일은 **`/modfolio-moon`** 이 맡는다. 이것이 대체한 결정: 2026-09-22 /modfolio = 세션
시작점(원문 비공개 — _quotes.md#SK-01) · 2026-09-23 자율 루프 중의 /modfolio = 마무리(_quotes.md#SK-02).

## 기본 — 점검

```bash
bun run modfolio:compass                       # 허브
bun node_modules/@modfolio/harness/scripts/modfolio/compass.ts   # 멤버 (harness-pull 이 배선한다)
```

카드 뒤에 **정체성·법칙 점검** 절이 붙는다(`scripts/modfolio/conformance.ts` — 이미 있는 검사기만 배선한다):

| 줄 | 무엇 |
|---|---|
| 5법칙 | `validate-law-compliance.ts` — 오류는 위반(exit 1) · 권고는 `bun run modfolio -- --laws` |
| effort | 실효값(주입 env) ↔ 정책 `sessionEffort` · 주입원이 이미 고쳐졌으면 «재시작만 남았다» |
| 압축 창 | `autoCompactWindow` 실효값 — 400K(ADR-029) · 1M 기본값이면 ⚠ |
| 리뷰 정책 | `reviewPolicy`(L0~L3 · 라운드 한도) 유무 · 실행기 `bun run review:run` |
| 세 표면 명령 | `/modfolio`·`/modfolio-sun`·`/modfolio-moon` 이 Claude·Antigravity 스킬과 헌장 표에 같이 있는가 |
| **미검사** | 형제 간 같은 기능 중복 구현 · 소유자 우회(허브 `atlas:scan` · 새 기능 전 `--intent`) · 형제 코드 복제 지문 · 계약 없는 신규 이벤트 |

무거운 검사를 **다시 돌리지 않는다** — 증거를 읽는다. 네트워크는 packument 1회(6시간 캐시 · 1.5초 타임아웃)뿐이다.

### 이 스킬이 당신에게 시키는 것 (MUST)

1. 판정은 **exit code**(0 규약 안 · 1 위반 · 2 판정 불능). 출력 문자열이 아니다. 위반과 판정 불능이 같이 있으면 1.
2. **`?` 는 「이상 없음」이 아니라 「못 쟀다」이다.** 초록으로 요약하지 않는다 — «미검사» 줄은 그대로 전한다.
3. **스크립트가 원리적으로 못 보는 둘을 당신이 채운다** — MCP 연결(실패 서버 보고) · 훅 층(첫 Bash 로 `true # hook-probe`).
4. ⚠/✗ 에는 처방이 붙어 있다 — 하던 일을 끊지 않고 그 처방을 끼워 넣는다(아래 amend). 단 **정비**(하네스·설치·버전업)와
   오너가 요청해 켜 둔 **예외**(예: `modfolio:effort -- --set`)는 오너가 고른다 — 처방을 보고하고 묻는다.

### `--card` — 대화 중간 리마인더 (네트워크 0 · 0.1초 실측)

```bash
bun run modfolio:compass -- --card
```

카드 한 장만. 커밋 전에 찜찜할 때·새 기능을 말한 직후에 쓴다.

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

## amend — 카드는 중단이 아니라 «삽입» 이다 (2026-09-07)

오너 지적(원문 비공개 — _quotes.md#SK-03): 재서 알려주는 데서 그치지 말고, 작업을 끊지 않은 채 제대로 되도록
고칠 지시를 줘야 한다 — 맞다. 나침반이 「30도 틀어졌다」만 말하고
「우현으로」를 안 말하면 절반이다.

그래서 **모든 ⚠/✗ 에 처방 한 줄**이 붙고(`▶ 이어서`), 카드는 «하던 일 계속하십시오» 로 끝난다.
`--intent` 를 주면 **지시 3줄이 실제 이름으로 채워진다**(종전에는 `<앱>`·`<part>` 플레이스홀더로
남았다 — 바로 아래 `plan:build` 가 답을 계산해 둔 채로).

**처방과 자동 수정은 다르다:**

| | 언제 | 왜 |
|---|---|---|
| **처방(지시)** | **항상** | 무엇을 하면 되는지는 언제나 말할 수 있다 |
| **자동 수정** | 결정적인 것만 · opt-in | 경계 위반은 「주인 repo 에 부품을 만들어 게시하고 소비로 바꾼다」는 **설계 작업**이라 치환으로 안 된다. 자동으로 손대면 잘못된 봉합만 남는다 |

판정 불능도 «할 일 없음» 이 아니다 — **무엇을 못 쟀는지가 곧 다음 행동**이다.

## 안 하는 것

- **파일을 고치지 않는다**(처방은 주되 손은 대지 않는다). 다른 repo 를 건드리지 않는다(허브는 Writ 없이 sibling 수정 없음).
- 규칙 문장을 늘리지 않는다 — 새 교훈은 게이트(가능하면)나 `/debrief` 로 간다. 이 파일에 append 하지 않는다.

## 관련

- canon `assembly-law` · `atlas` · `registry-redundancy` · `knowledge-sovereignty` · `account-projection`(법 — `tier: law` 전부) · `instruction-drift`
- `/plan`(plan:build) · `/adopt-laws`(법 자가 진단) · `/contracts`(계약 변경) · `/orbit`(허브의 cross-repo 순회)
- `/modfolio-sun`(세션 시작 → 계획 모드) · `/modfolio-moon`(언제든 마무리 · 세션별 인계) · ADR-029
