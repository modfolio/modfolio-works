---
title: Muse (뮤즈) — 프론티어 사고 증류·축적·주입 프로토콜 (reasoning playbooks)
version: 1.2.1
last_updated: 2026-07-12
source: [ACE arXiv 2510.04618 (결정적 delta-merge·context collapse), ReasoningBank arXiv 2509.25140 (전략 카드·실패 채굴), Inter-Cascade arXiv 2509.22984 (escalation debrief·strong 호출 -48%), Memp arXiv 2508.06433 (top-k 캡·과다주입 저하), H2T arXiv 2408.09365 (검증 통과 규칙만 채택), model-escalation.md v1.1.0, debrief-format.md (authoring prior), contracts/debrief (카드 스키마 SoT)]
sync_to_siblings: true
applicability: always
consumers: [debrief, playbooks, plan, modfolio, generate-review, harness-dream]
---

# Muse (뮤즈) — distillation 루프

> **호칭 (오너 명명, 2026-07-12)**: 이 시스템의 이름은 **Muse(뮤즈)** — 시인이 부르는 영감의 원천. Jonson 이 Volpone 헌사에서 말한 진실한 시인("interpreter and arbiter of nature, a teacher of things divine no less than human")의 계보에서: 최상위 정신들이 남긴 노래가 다음 목소리들의 뮤즈가 된다. 점검 = "**뮤즈 점검해줘**" 또는 `/dream`. 기술 식별자(파일명 `reasoning-playbooks.md`·`knowledge/playbooks/`·`PB-*` id·스킬명)는 안정성 위해 유지 — 이 파일명이 stable cross-ref id 다 (`opus-4-7-effort-policy.md` 선례).

> **무엇**: 프론티어 모델(Fable 5, GPT 5.x, Gemini)이 태스크를 풀 때마다 그 **판단 원리**를 구조화 카드로 캡처해 영속 축적하고, 이후 세션의 하위 모델(Opus/Sonnet)이 이를 주입받아 프론티어 없이도 같은 판단을 재현한다. weight training 아님 — 컨텍스트 레벨 distillation. **권고이며 강제가 아니다** (Hub-not-enforcer).

> **속도 불변 (오너 2026-07-11)**: 이 루프의 목적은 **더 스마트한 사고 알고리즘**이지 검토 세리머니가 아니다. 캡처 = 카드 1장(수 분), 주입 = top-k 3-5(1스텝), 그 이상 없음. 이 루프를 이유로 검토·점검·반복확인 단계를 **추가하지 않는다** — 치명적 유출·지출은 기존 결정적 가드(pre-payment/pre-destructive/secrets-policy)가 이미 막고, 그 외에는 정공법이되 속도감 있게 (velocity-mode). playbook 도메인 우선순위도 보안 세리머니가 아닌 **판단·디버깅·아키텍처·속도** 계열 위주로.

## 루프 (4단계)

1. **캡처** — 태스크 종료 시 `/debrief` 로 DebriefCard 작성 → `bunx modfolio-debrief` 가 검증·append (스키마 = `@modfolio/contracts/debrief`, 작성법 = `debrief-format.md`). 싱크 = 허브 `memory/debriefs/<repo>.jsonl` (append-only, 영속).
   **수집 범위 (2026-07-12 명문화)**: 허브-중심 집계다 — ① sibling 자발 `/debrief` (CLI 가 허브 싱크 직행, detached 면 로컬 outbox → 다음 허브-가시 실행에서 flush) ② feedback rail 로 허브에 합류한 자료 ③ 허브 기록(journal·feedback·decisions-log·incidents) 소급 채굴 (`batch-export mine`). **허브가 sibling repo·세션 로그를 직접 스캔하지 않는다** (Hub-not-enforcer — 수집도 pull 이 아니라 sibling 의 자발 push).
2. **큐레이션** — `bun run debrief:curate` (허브, 결정적 스크립트·LLM 0) 가 카드를 `knowledge/playbooks/<task-class>.md` 의 ID bullet 로 delta-merge. 승격(Candidate→Active)·은퇴는 **인간만** (/dream 게이트).
3. **주입** — 태스크 시작 시 관련 bullet 을 **top-k 3-5 개만** 가져온다 (초과 주입은 실측 성능 저하 — Memp). 경로: `/playbooks` 스킬(정적, 어디서나) 또는 `knowledge_query` MCP(RAG, 신선).
4. **컴파일** — 축적된 실패 증거가 임계에 달하면 `/harness-compile` (프론티어 전용) 이 배포되는 agent/skill 프롬프트에 판단을 굽는다.

## 언제 질의하나 (consult 규율)

- **escalation rung-2 진입 전 필수 1스텝**: `model-escalation.md` 의 "max/Fable escalate" 판단이 서면, 올리기 **전에** 해당 task-class playbook 을 먼저 질의한다 — 과거 프론티어 카드가 이미 답을 갖고 있으면 xhigh 로 해결되고 escalation 비용이 사라진다 (Inter-Cascade: strong 호출 -48%).
- 익숙하지 않은 error-class·처음 보는 서브시스템·expensive-if-wrong 태스크 시작 시.
- 질의 키 = `"<task_class> <error_class> <framework> <repo>"` 류 facet 문자열. **top-k 3-5 초과 주입 금지.**
- 사용한 bullet 의 `PB-*` ID 는 이후 debrief 의 `used_playbook_ids` 에 기록 — helpful/harmful 카운터가 이것으로만 갱신된다.

## 언제 debrief 하나 (capture 규율)

| 트리거 | 의무 수준 |
|---|---|
| **escalation 사용 후** (`/effort max`·`/model fable`·프론티어 모델 세션) | **필수** — `escalation` 블록 포함 ("하위 모델이 뭘 놓쳤나" = 최고가치 캡처) |
| P0/P1 해결, incident 종결 | 강력 권고 (실패 카드 포함 — 실패는 guardrail 이 된다) |
| plan-mode 산출물이 승인된 큰 설계 | 권고 (`artifacts.plan_file` 포인터) |
| 일상 태스크 gate-green 완료 | 선택 (standard tier 로 축적, 확증 후 승격) |

outcome 증거(commit sha·gate-green·live-200)가 **없으면** `status: unverified` 로 정직하게 — 승격은 어차피 증거 필수라 부풀려도 소용없다.

## 거버넌스 (librarian 규율 — 캡처보다 중요)

- **결정적 merge 만**: playbook 파일을 LLM 이 전체 재작성하는 것 금지 — ACE 실측: 1스텝에 18,282→122 토큰 붕괴. 의미 변경(승격/은퇴/축출)은 전부 제안 → 인간 게이트 (/dream).
- **카운터는 outcome-연동 텔레메트리로만**: `used_playbook_ids` × 검증된 outcome 이 유일한 h/x 변이 경로. 수동·LLM 인플레 금지.
- **코퍼스 유계**: class 당 50 bullet / 전체 600 (`ecosystem.json distillation.corpusCap`). 초과 시 score `h−2x` 최하부터 축출 **제안**.
- **충실성**: debrief 는 사후 재구성이지 내부 사고의 충실한 기록이 아니다 (Anthropic 자체 연구). 절차적 내용(when→action)만 신뢰하고, Active 승격은 outcome 증거 + (standard tier 는) 반복 확증 필수.
- **ToS/provenance**: 모든 카드·bullet 에 provider 태그. 용도는 **내부 컨텍스트 주입 한정** — 어떤 provider 의 output 으로도 경쟁 모델을 학습시키지 않는다 (3사 ToS 공통 금지). cross-provider 카드는 태그로 필터 가능하게 유지.
- 티어: `frontier`(Fable/GPT-5.x급) > `baseline`(Opus) > `subagent`(Sonnet/Haiku) — CLI 가 `ecosystem.json distillation.modelTiers` 로 산정, 자기신고 불신. 등급 A(frontier+검증)만 즉시 Active 후보, D(subagent+미검증)는 merge 불가.
- **fleet 개통 복합 게이트 (2026-07-12, A/B v1 천장효과 FAIL 의 재설계)**: 코퍼스의 sibling 주입(harness publish)은 이진 A/B 단독이 아니라 — `PASS = counter-gate pass(1차 필수: 실전 종단 h/x 카운터 성숙, bun run debrief:counter-gate) AND ab-gate no-harm(보조: 난도 보정 evalset non-inferiority)`. FAIL(harmful ratio 초과·harm 유의) → 코퍼스 재설계 분기(카드 무가치 가설 채택). 그 외 = HOLD (창 연장, publish 보류). 1차가 카운터인 이유: 실전 outcome 은 answer-shape 누출이 구조적으로 불가능한 유일한 계측이다.
- **계측기 v2.1 정정 + ab-gate 본 런 결과 (2026-07-12 실측)**: 이진 correct 는 임계 종속이라 계측 불가(동일 채점에서 임계 하나로 baseline 94%↔36% — 교정 런 실측) → **1차 판정 = 연속 rubric 점수**(point별 boolean → 가중 충족비 → Wilcoxon signed-rank), 이진 McNemar 는 2차 참고. 사전 이진 교정 폐기, **사후 교정** = 같은 페어드 런의 arm A 연속 점수 band [0.4,0.8] (`calibrationFilter`). **본 런 판정 (n=39, 78문항 leak-lint PASS·은닉 X/Y·Opus 채점): ab-gate no-harm PASS — gain 유의** (A 0.673→B 0.962, delta +0.288, p=2.5e-7, better 35/worse 0). 레코드 = `.evolve-state/ab-playbooks-2026-07-12-v2.json`. **복합 게이트 잔여 = counter-gate 성숙뿐** (~3주 관측, 최초 신호 PB-TST-0085 h=1) — 코퍼스 fleet publish 는 여전히 보류.
- **피드백→지식 2-rail (오너 지시 2026-07-12)**: 인바운드 피드백과 그 처리 과정은 전부 지식으로 주입되어야 한다 — 단 raw 피드백을 RAG 에 직접 색인하지 않고(poisoning 표면 최소화), ① 처리 결과(projects 미러·journal)→RAG ② 판단(소급 채굴 + 처리 세션 debrief 카드)→playbooks 의 2-rail 로. 인바운드 처리(feedback-collect) 세션도 debrief 대상이다.

## 프론티어 부재 시 (자가성장 지속)

- 일상 Opus/Sonnet 세션도 gate-green debrief 로 카드 축적 (standard tier — helpful≥3 ∧ harmful=0 시 승격).
- escalate 하고 싶은데 프론티어가 없으면 **frontier-queue** 에 질문 적재: 허브는 `memory/frontier-queue.jsonl`, sibling 은 `feedback/<repo>/frontier-question-*.md` (기존 feedback rail). 다음 frontier day 에 drain — `frontier-day.md` 참조.

## 관련

- `debrief-format.md` — 카드 작성법 (authoring prior, 좋은 카드의 조건)
- `model-escalation.md` v1.1.0 — rung-2 사전 질의 + rule (d) escalate→debrief
- `frontier-day.md` — 프론티어 복귀 시 표준 agenda
- `.claude/skills/debrief/SKILL.md` · `.claude/skills/playbooks/SKILL.md` — 실행 표면
- `contracts/debrief/` — 카드 Zod 스키마 SoT · `scripts/debrief/curate.ts` — 결정적 curator
