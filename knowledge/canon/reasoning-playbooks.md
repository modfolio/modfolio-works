---
title: Muse (뮤즈) — 프론티어 사고 증류·축적·주입 프로토콜 (reasoning playbooks)
version: 1.5.0
last_updated: 2026-07-26
source: [ACE arXiv 2510.04618 (결정적 delta-merge·context collapse), ReasoningBank arXiv 2509.25140 (전략 카드·실패 채굴), Inter-Cascade arXiv 2509.22984 (escalation debrief·strong 호출 -48%), Memp arXiv 2508.06433 (top-k 캡·과다주입 저하), H2T arXiv 2408.09365 (검증 통과 규칙만 채택), model-escalation.md v2.0.0, debrief-format.md (authoring prior), contracts/debrief (카드 스키마 SoT), Frontier-Bench v0.1 (Opus 5 코딩 > Fable 5 — 티어 이원화 근거)]
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

> **v3.26.0 — 이 절의 대부분은 이제 자동이다.** 아래 규율은 여전히 옳지만, **기억해서 실행할 필요가 없다.** 2026-07-26 실측이 이유를 말해준다: 카드 238장 중 `used_playbook_ids` 를 채운 건 **2장(0.8%)** 이었고, `/playbooks`·RAG·필드가 전부 존재하는데도 그랬다. 규율을 문서에 적어두는 것만으로는 실행되지 않는다 — 이 저장소가 `managed-artifacts`·`fact-ownership`·`concurrency-safety` 에서 반복해 배운 것과 같다. **방법은 기억이 아니라 도구에 있어야 한다.**

- **주입은 자동**: `UserPromptSubmit` 훅(`user-prompt-playbook-inject.ts`)이 매 프롬프트를 결정적으로 분류해 해당 class 의 Active bullet top-k(≤5)를 주입한다. 분류 미달이면 주입 0·비용 0. 수동 `/playbooks` 는 이제 **주입이 놓친 것을 직접 팔 때**만 쓴다.
- **escalation rung-2 진입 전 필수 1스텝**: `model-escalation.md` 의 "max/Fable escalate" 판단이 서면, 올리기 **전에** 해당 task-class playbook 을 먼저 질의한다 — 과거 프론티어 카드가 이미 답을 갖고 있으면 xhigh 로 해결되고 escalation 비용이 사라진다 (Inter-Cascade: strong 호출 -48%).
- 질의 키 = `"<task_class> <error_class> <framework> <repo>"` 류 facet 문자열. **top-k 3-5 초과 주입 금지.**
- 사용한 bullet 의 `PB-*` ID 는 debrief 의 `used_playbook_ids` 에 기록한다. **주입된 것을 전부 적지 않는다** — 아래 §카운터의 3층 참조.

## 언제 debrief 하나 (capture 규율)

| 트리거 | 의무 수준 |
|---|---|
| **escalation 사용 후** (`/effort max`·`/model fable`·프론티어 모델 세션) | **필수** — `escalation` 블록 포함 ("하위 모델이 뭘 놓쳤나" = 최고가치 캡처) |
| P0/P1 해결, incident 종결 | 강력 권고 (실패 카드 포함 — 실패는 guardrail 이 된다) |
| plan-mode 산출물이 승인된 큰 설계 | 권고 (`artifacts.plan_file` 포인터) |
| 일상 태스크 gate-green 완료 | 선택 (standard tier 로 축적, 확증 후 승격) |

outcome 증거(commit sha·gate-green·live-200)가 **없으면** `status: unverified` 로 정직하게 — 승격은 어차피 증거 필수라 부풀려도 소용없다.

## 거버넌스 (librarian 규율 — 캡처보다 중요)

- **결정적 merge 만**: playbook 파일을 LLM 이 전체 재작성하는 것 금지 — ACE 실측: 1스텝에 18,282→122 토큰 붕괴.
- **카운터 신호의 3층 (v3.26.0)** — 자동화하면서 **무엇이 h/x 를 움직이는가**를 층으로 갈랐다. 뭉치면 게이트가 거짓 통과한다:

  | 층 | 필드 | 채우는 주체 | h/x 를 움직이나 |
  |---|---|---|---|
  | **노출** | `injected_playbook_ids` | 훅 (결정적 사실) | ❌ — `exposure` 만 올린다 |
  | **행동 지명** | (Stop 훅 원장) | 훅 (transcript 실행 흔적) | ❌ — **후보 목록만** |
  | **명시 판단** | `used_playbook_ids` | 세션 (판단) | ✅ **유일 경로** |

  - **노출이 h/x 를 움직이면 안 되는 이유**: "컨텍스트에 있었다"는 주입된 모든 bullet 에 참이라 아무것도 구분하지 못한다. 자동 기록하면 게이트가 그 무의미한 신호로 통과하고 **코퍼스가 28 repo 에 나간다** — 0.8% 라는 정직한 숫자보다 나쁘다.
  - **⚠ 행동 귀속을 h/x 에 연결하려다 실측으로 기각했다 (2026-07-26)**: 원래 설계는 transcript 실행 흔적을 h/x 에 직결하는 것이었다. 실제 4.9MB 세션으로 측정하니 **판별력이 없었다** — 세션이 진짜로 적용한 bullet 0.40–0.46 vs 무관한 bullet 0.44–0.48, IDF 가중을 넣어도 섞였다. 게이트 전체가 얹혀 있는 카운터에 **오탐 40–50%** 를 주입하는 것은 이 설계가 막으려던 바로 그 인플레이션이다. **이미 구현했다는 것은 채택 사유가 아니다.**
    → 살아남은 쓸모: 지명 목록은 적용된 것을 **포함**한다(재현율은 높다). 그래서 "무엇을 썼는지 기억해내라"가 "해당되는 것을 고르라"로 바뀐다 — `used_playbook_ids` 를 채우는 비용이 실제로 낮아진 지점이 여기다.
    → 인과 질문은 여전히 `ab-gate`(반사실 A/B) 담당. 코퍼스 수준에서 답한다.
  - 여전히 **수동·LLM 인플레 금지**. LLM 이 "도움이 됐나"를 채점하는 경로는 만들지 않는다(결정적 curator 원칙 + 사후 재구성 문제).
  - **교훈 (테스트 규율)**: 첫 구현의 단위 테스트는 **전부 통과**했다 — fixture 가 2줄짜리 가짜 transcript 였기 때문이다. **작은 fixture 는 규모에서 무너지는 채점 함수를 탐지할 수 없다.** 실데이터 측정이 유일한 발견 경로였고, 회귀 테스트는 이제 400-액션 합성 세션을 쓴다.
- **자율 집행 2건 (v3.26.0)** — 오너가 이 repo 를 열지 않아도 코퍼스가 건강을 유지해야 하므로, **기준이 완전히 결정적이고 실패해도 복구 가능한** 두 결정만 집행된다:
  - **은퇴**: `exposure ≥ 20 ∧ h=0 ∧ x=0` — 반복 제시에도 한 번도 쓰이지 않은 bullet. `exposure` 는 코퍼스에 없던 **분모**다(없으면 "죽은 bullet"과 "아직 안 쓰인 bullet"이 같은 숫자). 부정 신호라 인플레 위험이 구조적으로 없고, tombstone 이라 되돌릴 수 있다.
  - **승격**: `h ≥ 1 ∧ x = 0` — **등급이 아니라 실적으로** 승격한다. 기존 `grade A ∨ support ≥ 2` 는 제안으로 남는다(그걸 자동 집행하면 미검토 A 등급 후보 ~181개가 한 번에 Active 로 쏟아져 주입 top-k 가 아무도 검증하지 않은 것으로 채워진다).
  - 그 외(축출·quarantine)는 **제안 유지 → /dream 게이트**.
- **코퍼스 유계**: class 당 50 bullet / 전체 600 (`ecosystem.json distillation.corpusCap`). 초과 시 score `h−2x` 최하부터 축출 **제안**.
- **충실성**: debrief 는 사후 재구성이지 내부 사고의 충실한 기록이 아니다 (Anthropic 자체 연구). 절차적 내용(when→action)만 신뢰하고, Active 승격은 outcome 증거 + (standard tier 는) 반복 확증 필수.
- **ToS/provenance**: 모든 카드·bullet 에 provider 태그. 용도는 **내부 컨텍스트 주입 한정** — 어떤 provider 의 output 으로도 경쟁 모델을 학습시키지 않는다 (3사 ToS 공통 금지). cross-provider 카드는 태그로 필터 가능하게 유지.
- 티어: `frontier`(Fable/Mythos/GPT-5.x급) > `baseline`(Opus) > `subagent`(Sonnet/Haiku) — CLI 가 `ecosystem.json distillation.modelTiers` 로 산정, 자기신고 불신. 등급 A(frontier+검증)만 즉시 Active 후보, D(subagent+미검증)는 merge 불가.
- **티어 이원화 (v1.3.0, 2026-07-26 — schemaVersion 2)**: `modelTiers` 는 원래 **두 축을 하나의 선형 리스트로 뭉개고** 있었다 — ①역량 라우팅(어느 모델로 올릴까) ②출처 등급(이 카드를 얼마나 믿을까). Opus 5 는 두 축에서 위치가 다르다: 에이전틱 코딩은 Fable 5 **초과**(Frontier-Bench 43.3 vs 33.7)지만 순수 프론티어 추론은 Fable **미만**. 하나의 티어로는 둘 중 하나가 반드시 거짓말이 된다.
  → **등급 축에서만** `distillation.frontierEquivalent.baseline.taskClasses` 에 속한 코딩형 class(`api·schema·ui·deploy·infra·testing·refactor·ops·docs`)에 한해 baseline 을 frontier 로 승격한다(`effectiveTierFor`). 추론형(`architecture·security·incident·payment·other`)은 Fable 이 여전히 기준. **`provenance.tier` 는 건드리지 않는다** — 어느 모델이 만들었나는 불변 기록이고, 승격되는 건 등급뿐이다.
  → 판정 입력이 `task_class` 인 이유: 카드의 **필수 필드이자 닫힌 enum** 이라 결정적이다. `effort` 는 CLI 가 검증할 수 없어(자기신고) 입력으로 쓰지 않는다 — 자기신고 불신 원칙 유지.
  → **왜 지금 필요한가**: 코퍼스가 굶고 있다. live bullet 484개 중 카운터가 붙은 건 **1개**, 카드 501장 중 baseline-tier 는 **2장**, usage rate 는 25%→17% 하락. 복합 게이트의 1차 축인 counter-gate 가 6/6 기준 미달이다. Opus 5 가 전 agent 기본이 되고 코딩형 verified 카드가 A 등급을 받으면 **유기적 성장이 재개**된다 — 그게 이 이원화의 실질 목적이다.
- **fleet 개통 복합 게이트 (2026-07-12, A/B v1 천장효과 FAIL 의 재설계)**: 코퍼스의 sibling 주입(harness publish)은 이진 A/B 단독이 아니라 — `PASS = counter-gate pass(1차 필수: 실전 종단 h/x 카운터 성숙, bun run debrief:counter-gate) AND ab-gate no-harm(보조: 난도 보정 evalset non-inferiority)`. FAIL(harmful ratio 초과·harm 유의) → 코퍼스 재설계 분기(카드 무가치 가설 채택). 그 외 = HOLD (창 연장, publish 보류). 1차가 카운터인 이유: 실전 outcome 은 answer-shape 누출이 구조적으로 불가능한 유일한 계측이다.
- **계측기 v2.1 정정 + ab-gate 본 런 결과 (2026-07-12 실측)**: 이진 correct 는 임계 종속이라 계측 불가(동일 채점에서 임계 하나로 baseline 94%↔36% — 교정 런 실측) → **1차 판정 = 연속 rubric 점수**(point별 boolean → 가중 충족비 → Wilcoxon signed-rank), 이진 McNemar 는 2차 참고. 사전 이진 교정 폐기, **사후 교정** = 같은 페어드 런의 arm A 연속 점수 band [0.4,0.8] (`calibrationFilter`). **본 런 판정 (n=39, 78문항 leak-lint PASS·은닉 X/Y·Opus 채점): ab-gate no-harm PASS — gain 유의** (A 0.673→B 0.962, delta +0.288, p=2.5e-7, better 35/worse 0). 레코드 = `.evolve-state/ab-playbooks-2026-07-12-v2.json`. **복합 게이트 잔여 = counter-gate 성숙뿐** (~3주 관측, 최초 신호 PB-TST-0085 h=1) — 코퍼스 fleet publish 는 여전히 보류.
- **멤버에서 무엇이 켜져 있나 — 캡처는 ON, 소비는 게이트 뒤 (2026-07-26 카나리아 실측)**: 신설 멤버에 `harness pull --apply` 만 한 상태를 실측하니 `.claude/hooks/` 에 `stop-debrief-check.ts`(캡처 넛지)는 있고 `user-prompt-playbook-inject.ts`(주입)는 **없다**. 이건 누락이 아니라 위 복합 게이트의 직접 귀결이다 — 코퍼스가 `!knowledge/playbooks/**` 로 미동봉인데 주입 훅만 보내면 **매 프롬프트마다 없는 디렉터리를 뒤지고 지연만 더한다**(velocity 가 피하려는 비용) + 게이트를 앞질러 fleet 배포를 결정하는 셈이 된다. 따라서 현 상태의 정확한 문장은 **"멤버는 지금도 카드를 쌓을 수 있다(캡처 ON). 못 하는 것은 소비뿐이다"**. 게이트가 PASS 하는 순간 코퍼스·주입훅·그 lib 3개가 **함께** 가야 하며, 그 커플링은 사람 기억이 아니라 `scripts/__tests__/muse-rail-coupling.test.ts` 가 강제한다(한쪽만 움직이면 실패 — 3.22.2 SHARED_LIBS 폐포 사고의 재발 방지와 같은 처방).
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
