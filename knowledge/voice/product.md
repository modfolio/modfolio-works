# Voice — 제품 방향

> 규약·형식·우선순위는 canon **`owner-voice.md`**. 이 파일은 **관측 본문**이다.

---

### 이 말뭉치의 목적은 저장이 아니라 **성향**

- **observed**: 2026-08-05
- **quote**: 비공개 — knowledge/voice/_quotes.md#PD-01
- **scope**: fleet
- **applies**: 항목은 보관용 요약이 아니라 **행동 지시**로 적는다(`applies` 필수 —
  «그래서 무엇을 다르게 하는가»). 대상은 **개발 하네스와 제품 AI(visualize) 둘 다**이고,
  후자로는 파일 복사가 아니라 **계약**(`@modfolio/contracts`)으로만 간다
  (Zero Physical Sharing · `assembly-law`).
  ⚠ 성향이 쌓이려면 **어디서 판단이 갈렸는지가 보여야** 한다 — 되돌릴 만한 판단(선언으로
  남긴 미해결, 외부 제약 수용, 범위 축소)은 보고에서 한 줄로 명시한다. 조용히 좁히면
  오너가 교정할 수 없다.
- **status**: active

---

### 지금 목표는 «운영 가능한 프로덕션 MVP» — 훈련·축적은 뒤

- **observed**: 2026-08-04
- **quote**: 비공개 — knowledge/voice/_quotes.md#PD-02
- **scope**: fleet
- **applies**: 모델 학습·데이터 축적처럼 «나중에 효과가 나는» 작업보다 **지금 운영할 수
  있는 상태**를 먼저 만든다. 실사용 개시가 우선.
  ⚠ 2026-08-05 의 말뭉치 축적 요청과 **부딪히지 않는다** — 그쪽은 *제품 AI 의 훈련*이고
  이쪽은 *개발 하네스의 일관성*이다. 축이 다르다.
- **status**: active

---

### 요금제의 축은 AI 다 — 하위 요금제는 «잘린 것» 이 아니라 «손으로 한다»

- **observed**: 2026-09-16 (pay 세션 · 앱 10개 구술 중 · pay 편지로 전달 — `feedback/modfolio-pay/modfolio-pay-request-20260916-owner-described-all-apps-hub-records-are-narrower.md`)
- **quote**: 비공개 — knowledge/voice/_quotes.md#PD-03
- **scope**: fleet — 요금제가 있는 앱 전부. 구술한 10개 중 8개가 AI 유무·깊이로 상위 요금제를 가른다
  (sincheong 만 양 — 이벤트 수·인원). A&F 는 pay 카탈로그 밖.
- **applies**: 요금제·entitlement·가격 문구를 설계할 때 하위 요금제를 **기능 결핍**(«Pro 에서만 가능»)으로
  쓰지 않는다 — **«직접 설정 ↔ AI 제안»** 으로 쓴다. 수동 경로는 끝까지 동작해야 한다(AI 가 없어도 같은 일을 할 수 있다).
  앱별 한도·개수는 **정해지지 않았다** — 지어내지 않는다.
- **status**: active

---

## 이미 집행되고 있어 여기 없는 것

| 무엇 | 정본 |
|---|---|
| 결제·법적 표시를 지어내지 않는다 (없는 번호·SLA·평균) | canon (실측 축) + `.claude/rules/agent-evidence.md` |
| 돈이 움직이는 경로의 게이트를 우회하지 않는다 | `knowledge/canon/payment-safety.md` — `pre-payment-guard` 가 결정적으로 집행 |

⚠ 둘 다 **내용이 틀려서가 아니라 자리가 틀려서** 빠졌다. voice 는 «사람이 말한 것» 이고
저 둘은 «실측·규칙» 이다. 사본을 두면 원본이 바뀔 때 둘이 갈린다(canon `owner-voice.md`
— 「이미 canon·contracts 에 있는 사실은 안 쌓는다」).
