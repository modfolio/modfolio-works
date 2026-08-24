---
title: Eval Patterns — 우리가 실제로 도는 계측 + 6-Layer Test Stack
version: 2.0.0
last_updated: 2026-08-17
source:
  [
    Atlan 6-layer guide,
    "허브 실측 구현 — scripts/debrief/eval/{ab-gate,leak-lint,run-pack}.ts · scripts/debrief/counter-gate.ts",
    "tech-trends-2026-08.md §4 (1차 출처 전건 확인)",
    Harness v2.4 Phase 3,
  ]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [preflight]
related_canon: [reasoning-playbooks, process-reward-model, tech-trends-2026-08]
related_rules: [agent-evidence]
---

> ## 🔴 2026-08-17 v2.0.0 — **canon 이 우리 실천보다 약했다** (반대 방향 결함)
>
> v1.0.0(2026-04-17)은 일반적인 6-layer + LLM-judge 를 가르쳤다. 그 사이 허브는 **실제로
> 도는 계측기**를 만들었고 그것들이 진짜 결함을 잡았는데, 이 canon 에는 **한 줄도 없었다**:
> `McNemar` · `holdout` · `leak-lint` · `counter-gate` · `blind arm` · `ICC` **전부 0건**.
>
> 「canon 을 *덜* 집행하는 도구」의 문서 판(版)이다 — 33 repo 가 받는 문서가 우리가 아는
> 것보다 적게 가르치고 있었다. 아래 §0 이 그 격차를 메운다.
>
> ⚠ **그리고 v1 이 «실제 도구» 로 지목한 Langfuse 는 어디에도 통합돼 있지 않다.**
> 실측 2026-08-17:
>
> ```
> SDK import (from 'langfuse' | @langfuse/*)   fleet 전체 0건
> package.json 의 langfuse 의존성               0 repo
> 실행 중 컨테이너                              0  (전체 5개 중 · otel/grafana/clickhouse 도 0)
> compose 정의                                  modfolio-infra/nodes/workstation/…override.modfolio.yml:62
> 허브 도구                                     scripts/obs/langfuse-export.ts (HTTP push · 키 없으면 exit 1)
> ```
>
> 즉 **부분 배포가 아니라 계획**이다. `langfuse-export.ts` 는 키가 없으면 **명확히
> exit 1** 이라 조용한 무동작은 아니다(옳은 동작). NAS 쪽 daemon 은 여기서 판정 불가.
>
> ⚠ **이 항목을 v2.0.0 초판에서 「SDK 참조는 4 repo 16파일」이라고 적었고, 그건 틀렸다.**
> `grep -i langfuse` 로 **문자열 언급**을 센 것이고 그 대부분은 하네스가 배포하는
> 시크릿 패턴 **테스트 픽스처**다(32 repo 에 있다). **언급을 사용으로 오분류**했다 —
> 「매처가 이름보다 넓으면 남의 것을 우리 결함으로 만든다」의 거울상으로, 이번엔
> **없는 통합을 있다고 말했다.** import 축으로 다시 재서 0건을 확인했다.

## §0 우리가 실제로 도는 것 (허브 구현 — 인용 가능)

일반론이 아니라 **이 저장소에서 exit code 를 내는 코드**다. 각 항목은 그 파일을 읽으면 된다.

### ① 1차 계측기는 A/B 가 아니라 **종단 카운터**다

`scripts/debrief/counter-gate.ts`. 실사용 outcome(helpful/harmful)을 센다. 왜 1차인가 —
**문항이 없으므로 answer-shape 누출이 구조적으로 불가능**하다. A/B v1 이 천장효과로
무의미한 FAIL 을 낸 뒤(2026-07-12) 1차를 여기로 옮겼다.

### ② A/B 는 **이득 증명이 아니라 무해 확인**용이다

`scripts/debrief/eval/ab-gate.ts` — 결정적, LLM 0.

```
harm         = McNemar(harm 방향) one-sided exact p ≤ 0.05
no-harm      = (correctB − correctA ≥ −2) ∧ not harm
insufficient = n < MIN_N(20) 또는 baseline 교정 밴드[0.4, 0.8] 밖 (천장/바닥)
종료코드      0 no-harm · 1 harm · 2 판정 불능(insufficient·사용 오류)
```

n=40 급에서 +5pp lift 검출력이 **10~15%** 뿐이라 «이득» 을 물으면 답이 안 나온다.
**무해만 묻는다.** 이득은 ①이 답한다.

⚠ **사후 교정**을 쓴다(`calibrationFilter`) — arm A 의 연속 rubric 점수가 밴드 밖인 문항을
제외한다. 별도 교정 런이 필요 없고, v1 의 천장효과 재발을 막는다.

### ③ 누출은 **문항 레벨에서** 끊는다

`scripts/debrief/eval/leak-lint.ts` — 4중, 결정적.

```
① prompt ↔ rubric 토큰 jaccard ≤ 0.25      (해결책 어휘는 rubric 에만)
② forbidden_terms 가 prompt 에 미출현
③ source_ref 경로 문자열이 prompt 에 미출현
④ 주입 카드(title+action) ↔ prompt jaccard ≤ 0.30   (역누출 차단)
```

### ④ 블라인드는 파일명까지만 — **생성자 ≠ 채점자**가 본체다

`scripts/debrief/eval/run-pack.ts` 의 `blindMapFor` 는 itemId sha256 으로 X/Y 를 결정적
매핑한다. 그것이 막는 것은 «채점자가 파일 이름으로 arm 을 아는 것» **뿐**이다.

⚠ **한 컨텍스트가 양쪽 arm 을 만든 뒤 자기가 채점하면 블라인드는 무효다.** 파일명이 X/Y
여도 생성자는 자기가 무엇을 썼는지 기억한다. 그러면 McNemar 표는 계측이 아니라 자기
채점이고, **숫자는 정직한 개선과 구분되지 않는 형태로 나온다.**
→ 채점은 응답을 만들지 않은 별개 컨텍스트가 한다. 불가능하면 **`--answers` 까지만 하고
멈춘다** — 「반쪽 계측으로 no-harm 을 기록하는 것보다 «아직 재지 않았다» 가 정확하다」.

### ⑤ holdout 을 **먼저** 뗀다

`bun run muse:eval:holdout`. 실패 목록을 본 뒤 그 항목을 고치면 오른 수치는 **답을 본
시험의 점수**다. 개선안은 독립 출처에서 만들고, 평가셋으로는 한 번만 판정한다.

### ⑥ ⚠ 우리 평가셋은 실사용을 **17pp 과대평가**한다 (실측)

```
dev 41%  ·  holdout 42%  ·  실트래픽 24.2%      (precision 4.4% · false-fire 54.4%)
```

**합성은 회귀를 보고 실트래픽은 분포를 본다.** 소표본이 «불변» 이라고 말하면 큰 표본으로
다시 재고, 갈리면 큰 쪽을 따른다.

### ⑦ ✅ A/B 인과 검증이 **실제로 돌았다** — 독립 채점자로 (2026-08-17)

§④가 요구한 **생성자 ≠ 채점자**를 오너 승인으로 충족했다: 응답은 Claude 가 만든 기존
페어드 런을 그대로 쓰고, **채점만 다른 벤더 모델(`codex exec`, codex-cli 0.145.0)** 이
blinded X/Y 에 대해 다시 했다(78/78 · 실패 0).

```
                     7-12 채점자      codex(독립)     codex · echo 4건 제외
verdict              no-harm          no-harm         no-harm
n (사후 교정 후)      39               31              30
arm A → arm B        0.673 → 0.962    0.669 → 0.973   0.669 → 0.972
rubric delta         +0.288           +0.304          +0.303
better / worse       35 / 0           28 / 0          27 / 0
Wilcoxon p           2.5e-7           3.8e-6          < 1e-5
이진(McNemar harm)    39/39 · p=1.0    31/31 · p=1.0   —
```

**두 독립 채점자가 효과 크기를 2pp 안에서 일치**시키고, **양쪽 다 회귀 0** 이다.
양성 대조도 있었다 — 첫 문항에서 codex 가 **7-12 채점과 바이트 단위로 같은 판정**을 냈다.

**교란 하나를 재고 배제했다.** ④의 자매 축인 **카드↔rubric 어휘 중첩**이 `leak-lint` 에
**없었다**(있던 것은 카드↔prompt). 신설해 재니(카드 1334개 파싱 · 78문항 전수)
중위 **0.172** · 최대 0.316 이고 0.30 초과가 **4건**이다. 그 4건을 빼도 **delta +0.303 ·
회귀 0** — **이득은 어휘 반향으로 설명되지 않는다.**

> ### ⚠ 이 결과를 과대 읽지 않기 위한 경계
>
> - **이진 축은 세 실행 전부 천장**(31/31 · 39/39)이라 불일치가 0 이고 **McNemar 는 정보가
>   없다.** 판정은 전부 **연속 rubric** 에 실려 있다. 「no-harm」은 참이지만 그 근거는
>   이진 정확도가 아니다
> - **jaccard 는 어휘 측정**이다. 의미 중첩은 **미검사** — 이 검사의 초록을 「누출 없음」으로
>   읽지 않는다
> - **n = 30~39.** 사후 교정이 78 → 30 대로 줄인다(codex 는 더 엄격해 floor 38 을 떨궜다).
>   이 리그는 설계상 **무해 확인**용이고 이득의 **크기**를 정밀 추정하는 도구가 아니다
> - 응답은 **재사용**했다. 즉 검증된 것은 **채점의 독립성**이고 생성의 재현성은 아니다

## §0.5 2026 증거가 바꾼 것 (1차 출처 — 레이더 §4)

| 실측 | 처방 |
|---|---|
| 수학 PRM → 도구사용 판정 **49.2~52.8%** (우연=50%) | **범용 PRM 도입 안 함** |
| 프론티어 LLM judge **74~75%** · LLM-jury 는 수학 밖 1위 | judge 는 **프론티어 + 교차모델 합의** |
| 굳이 단계 점수를 매기면 | **`min` 풀링** — `mean` 은 악용 표면이 **44×** |
| exact-match 일치도가 Cohen's κ 대비 **33~41pp 과대** | 임계는 **ICC ≥ 0.70** (중대도별 0.67/0.70/0.80) |
| **스타일(마크다운) 편향 0.10~0.76 > 위치 편향 ≤0.04** | ⚠ **우리는 이 축을 잰 적이 없다** — 미검사로 명시 |
| judge 출력을 정답으로 쓰면 **점추정 자체가 편향** | plug-in 보정 |
| 정답 누출은 **양쪽 arm 을 함께** 부풀린다 → 짝지은 A/B 가 **깨끗해 보인다** | **hypothesis-only 절제**(입력을 지우고 채점 → 우연 이상이면 누출). ⚠ leak-lint 가 원리적으로 못 잡는 형태다 |
| **scaffold 만 바꿔도 정확도 28pp 이동** | arm 간 scaffold **고정** |
| 평가셋을 «역사적 통과율 30~70%» 로 가지치기 | 비용 44~70% 절감, 순위 충실도 유지 |

⚠ **Anthropic 자신의 지침은 «경로가 아니라 결과를 채점하라»** 다 — 단계별 채점과 정면
충돌한다. 단계 신호가 필요하면 학습 PRM 이 아니라 **부분점수 결과 분해**를 쓴다
(`process-reward-model.md` v2.0.0 §축소).

## §0.9 도입 순서 (0/33 인 앱에게)

fleet 실측 2026-08-17: `evals/` 디렉터리를 가진 repo **0/33**. 골격을 새로 발명하기 전에
**싼 것부터** — 아래는 비용 오름차순이고, ①만으로도 지금보다 낫다.

1. **종단 카운터** — 실사용 outcome 1개. 문항이 없으니 누출이 불가능하다
2. **holdout 분리** — 평가셋을 만들기 *전에* 뗀다
3. **leak-lint 4중** — 문항이 생기면 바로
4. **A/B 는 무해 확인만** — `n < 20` 이면 **판정 불능(2)**, 통과가 아니다
5. ICC · 스타일 편향 — 판정자가 둘 이상이 된 뒤

> ⚠ **강제하지 않는다**(Hub-not-enforcer). 위는 허브에서 **작동이 확인된** 형태이고,
> 각 앱의 채택·순서·범위는 그 repo 판단이다.

<!--
v1.0.0 본문(6-layer + LLM-judge)은 아래에 그대로 둔다 — 틀린 게 아니라 불완전했다.
-->

# Eval Patterns — 6-Layer Test Stack

AI 시스템(우리 하네스 + 앱 내 AI 기능) 품질을 분리 계층으로 평가한다. 한 층이 무너져도 다른 층이 잡을 수 있다.

---

## Layer 0 — Data Foundation

Eval 결과를 신뢰하려면 먼저 데이터가 깨끗해야 한다.

- Fixture/golden dataset이 stable한가? (`tests/fixtures/*.json` + `contracts/` Zod 검증)
- 시드 데이터가 reproducible한가?
- PII가 dataset에 없는가?

**도구**: 우리는 `contracts/` Zod 스키마를 fixture 검증에 직접 사용. mock-server (Tier 1) 가 자동 생성.

## Layer 1 — Unit

특정 함수/에이전트 프롬프트의 개별 입출력 검증.

- Vitest + Bun test (각 레포의 기본 test runner)
- Agent system prompt를 snapshot으로 보존 (drift 감지)

**기준**: 커버리지 ≥ 60% on critical path.

## Layer 2 — Integration (Multi-step)

여러 에이전트/스킬이 이어지는 워크플로우의 end-to-end:

- `harness-pull` 전체 + 각 phase
- `component` → `code-reviewer` → `quality-fixer` 파이프라인
- `design-engineer` → `page-builder` → `visual-qa`

**도구**: Langfuse (self-host Tier 1) — session 단위로 묶은 trace 수집 + golden run 비교.

## Layer 3 — E2E 시뮬레이션

실제 사용자 시나리오 재현.

- 22 repo의 critical path: 로그인(SSO) → 메인 feature 사용 → 로그아웃
- modfolio-pay 결제 flow (Toss 테스트 키)
- gistcore 학습 세션 (실제 TTS 호출)

**도구**: Playwright/Vitest + Langfuse trace. 자동화는 n8n modfolio 템플릿 (Tier 1).

## Layer 4 — Adversarial / Red Team

의도적 악성 입력에 대한 저항성.

- Prompt injection (우리 agent 시스템 프롬프트 탈취 시도)
- SQL injection (drizzle 쿼리)
- XSS (사용자 입력 렌더링)

**도구**: Promptfoo (Phase 7 Trial). `security-hardener` agent의 스캔 리스트.

## Layer 5 — Production CI/CD Regression

배포 직전 gate + 배포 후 모니터링.

- `bun run quality:all` (check + typecheck + test:harness + neutral-framing + audit)
- CF Workers 배포 후 1시간 Langfuse error rate 관측
- `scripts/hooks/stop-pattern-history.ts` ESCALATE 감지

**우리 기본 gate 순서**:
1. pre-commit: biome + typecheck + ts_ignore_or_any 스캔 (block 모드 시)
2. PR: quality:all 완주 + 22 harness-pull dry-run
3. 배포 후: Langfuse error rate + Airtable Pattern History

## LLM-as-Judge 패턴

특정 agent 출력의 "품질"을 자동 평가할 때:

```
입력: agent 호출 결과 (예: code-reviewer의 리뷰 리포트)
judge: Claude Haiku 4.5 (medium effort)
rubric:
  - 1-5 scale
  - 항목: 정확성, 구체성, 실행 가능성, 근거 인용, 톤
output: JSON {scores: {...}, avg: number, critique: string}
```

Langfuse의 `evaluations` 기능으로 기록. 일정 샘플(5-10%) 자동 judge → 평균이 점진적 drift 감지.

**주의**: LLM-judge 자체의 편향. 같은 모델 계열 judge는 생성자와 동일한 맹점을 가질 수 있음 → 가끔 사람 샘플 검토 필수.

## 회귀 방지 체크리스트

새 agent 추가 시:
- [ ] Layer 1: 대표 입력 3개 unit test
- [ ] Layer 2: 실제 skill과의 integration test 최소 1개
- [ ] Layer 3: 하나의 실제 시나리오 기반 trace
- [ ] Langfuse dataset에 golden run 저장

## 관련

- [cost-attribution.md](cost-attribution.md) — quality / cost 메트릭
- [observability.md](observability.md) — trace 수집 기반
- [local-dev-infra.md](local-dev-infra.md) — Langfuse self-host
- [incident-response.md](incident-response.md) — 품질 회귀 incident 절차

## 갱신 이력

- **2026-08-17 v2.0.0** — **canon 이 우리 실천보다 약했던 것을 메웠다**(반대 방향 결함).
  v1 에 `McNemar`·`holdout`·`leak-lint`·`counter-gate`·`blind`·`ICC` 가 **전부 0건**이었고,
  그 여섯은 이 저장소에서 **실제로 돌며 진짜 결함을 잡고 있었다.** §0 에 구현 파일과 함께
  등재 — 1차 계측기는 A/B 가 아니라 **종단 카운터**(문항이 없어 누출이 구조적으로 불가능),
  A/B 는 **무해 확인 전용**(n=40 급 lift 검출력 10~15%), 블라인드는 파일명까지이므로
  **생성자 ≠ 채점자**가 본체. §0.5 에 2026 증거 8건(범용 PRM 미도입 · ICC ≥ 0.70 ·
  스타일 편향 > 위치 편향[**우리 미검사**] · 누출은 양쪽 arm 을 함께 부풀려 짝지은 A/B 를
  깨끗해 보이게 함 · scaffold 28pp). §0.9 에 0/33 인 앱을 위한 비용 오름차순 도입 순서.
  ⚠ **우리 평가셋이 실사용을 17pp 과대평가**한다는 자체 실측도 명시(dev 41 · holdout 42 ·
  실트래픽 24.2).
  ⚠ **v1 이 «실제 도구» 로 지목한 Langfuse 는 어디에도 통합돼 있지 않다** — 실측:
  **SDK import fleet 전체 0건 · package.json 의존성 0 repo · 실행 컨테이너 0**(전체 5개 중,
  otel/grafana/clickhouse 도 0). compose 정의와 허브 도구(`scripts/obs/langfuse-export.ts`,
  키 없으면 exit 1)만 있다. 즉 **부분 배포가 아니라 계획**이다. 아래 §관련·체크리스트의
  Langfuse 항목은 **계획이지 현황이 아니다.**
  ⚠ **v2.0.0 초판은 이 자리에 「SDK 참조 4 repo 16파일」이라고 적었고 그건 틀렸다** —
  `grep -i langfuse` 로 **문자열 언급**(대부분 하네스가 배포하는 시크릿 패턴 테스트 픽스처,
  32 repo)을 센 것이다. **언급을 사용으로 오분류**했고, import 축으로 다시 재서 0건을 확인했다.
- 2026-04-17: v1.0.0 초판. 6-layer eval stack + LLM-judge 패턴 명문화. Langfuse/Promptfoo 역할 매핑.
