---
title: Model Escalation — task-class → effort/model 사다리 (권고)
version: 2.0.0
last_updated: 2026-07-26
source: [opus-4-7-effort-policy.md v2.0.0 (effort precedence·agent 분포 baseline), platform.claude.com whats-new-opus-5 (effort 변환률·1M default·thinking 기본 ON), Frontier-Bench v0.1 (Opus 5 43.3 / Fable 5 33.7 / Opus 4.8 21.1 — 에이전틱 코딩), code.claude.com model-config (effort 우선순위·모델 기본 high·ultracode), velocity-mode.md (semantic 판단은 결정적 hook 불가), ecosystem.json pricing.genai + distillation.frontierEquivalent (단가·티어 SoT), reasoning-playbooks.md (rung 사전 질의 + escalate→debrief, Inter-Cascade arXiv 2509.22984)]
sync_to_siblings: true
applicability: always
consumers: [plan, modfolio, generate-review]
---

# Model Escalation — 사다리

> **권고이며 강제가 아니다** (Hub-not-enforcer, `evergreen-principle.md`). 목표: **Opus 를 똑똑하게 최대로 쓰되, 값어치가 있을 때만 위로 올린다.** baseline 모델·effort 는 `opus-4-7-effort-policy.md` 가 SoT — 이 canon 은 "언제 위/아래로 움직이나"만 정의한다.

## v2.0.0 에서 바뀐 것 (2026-07-26, Opus 5)

**Fable 이 더 이상 코딩의 상단이 아니다.** Frontier-Bench v0.1 에이전틱 코딩에서 **Opus 5 43.3 > Fable 5 33.7 > Opus 4.8 21.1**, 그런데 Opus 5 는 Fable 의 **절반 값**($5/$25 vs $10/$50). 즉 코딩형 작업에서 `/model fable` 은 **더 비싸고 더 나쁜** 선택이 됐다.

동시에 Anthropic 은 Fable 5 를 여전히 최고 역량 티어로 규정한다 — 순수 프론티어 추론(신규 설계·미지 문제)에서는 Fable 이 위다. 그래서 사다리를 **작업 성격으로 갈라** 올린다: 코딩형은 Opus 5 안에서 effort 로 올리고, Fable 은 추론형 전용 최상단으로 남긴다. (같은 이원화가 Muse 등급 축에도 적용된다 — `ecosystem.json distillation.frontierEquivalent`, `reasoning-playbooks.md`.)

**effort 가 이전보다 값을 한다.** Opus 5 는 "추가 effort → 더 나은 결과" 변환률이 역대 Opus 중 가장 높다(Anthropic 명시). 그래서 rung-2 가 `/model fable` 이 아니라 **`/effort max` on Opus 5** 다.

## 사다리 (task-class → effort / 모델)

| rung | 태스크 클래스 | effort / 모델 | 근거 |
|---|---|---|---|
| **1 (기본)** | 구조화 코딩·리뷰 — 컴포넌트·API·스키마·contract·리뷰 | **`xhigh`** · Opus 5 (`claude-opus-5`) | 코딩·agentic sweet spot. **의심되면 여기 머문다.** |
| **2 (상향)** | expensive-if-wrong — 보안 코드·결제/돈 이동·아키텍처 tradeoff·P0 장애 triage·비가역 마이그레이션 | **`/effort max`** · Opus 5 | Opus 5 는 max 를 실제 품질로 바꾼다. **추가 비용 0**(같은 단가, 토큰만 증가). **근거 명시 필수.** |
| **3 (프론티어)** | 추론형 최상단 — 신규 아키텍처 설계·미지 문제·GEPA reflection | `/model fable` (`claude-fable-5`, **2× 단가**) | **추론형 task-class 한정.** 코딩형은 rung-2 에서 끝낸다(Opus 5 가 Fable 초과). |
| **0 (하향)** | 기계적 fan-out — 포매팅·의존성 bump·대량 전파·검색/요약 | `high`/`medium` · 또는 Sonnet 5 / Haiku **서브에이전트** | **Opus lead + Sonnet subagent**: 비용↓·품질 유지. |

> 단가는 `ecosystem.json` `pricing.genai` 가 SoT (Opus 5 $5/$25 · Fable $10/$50 = **2×** · Sonnet 5 $3/$15 · Haiku $1/$5). 위 표는 사람용 미러 — 스크립트는 SoT 를 읽는다 (`cost-attribution.md`).

## rung 상세

**1. sweet spot (`xhigh`·Opus 5).** 메인 세션은 `.claude/settings.json` `effortLevel: xhigh`(Claude Code 의 모델 기본값은 `high` 라 xhigh 는 **명시 opt-in** 이어야 한다), subagent 는 보정된 frontmatter effort. 판단이 애매하면 escalate 하지 말고 **여기 머문다**.

**2. escalate — `/effort max` on Opus 5.** "틀리면 비싼"이 트리거다: secret leak, 잘못된 돈 이동, 되돌리기 힘든 아키텍처 결정, production downtime. **올리기 전 사전 1스텝: 해당 task-class 의 reasoning playbook 을 먼저 질의한다**(`/playbooks` 또는 `knowledge_query` top-k 3-5) — 과거 카드가 답을 갖고 있으면 xhigh 로 끝나고 escalation 비용이 사라진다(Inter-Cascade 실측: strong 호출 −48%). rung-2 는 **단가가 오르지 않는다**(같은 모델, 토큰만 증가) → rung-3 보다 훨씬 싼 상향이므로 먼저 시도한다. **Haiku 는 `max`/`xhigh` 미지원.**

> ⚠ `thinking: disabled` 와 `xhigh`/`max` 는 **동시 사용 불가**(Opus 5 는 400). Claude Code 세션에서는 문제되지 않지만 SDK 를 직접 부르는 sibling 은 주의 — `MAX_THINKING_TOKENS=0` 을 쓰면서 effort 를 올리면 깨진다.

**3. 프론티어 (`/model fable`).** **추론형 task-class 에서만** — `architecture`·`security`·`incident` 의 *신규 설계*, GEPA reflection(`/harness-compile`), 미지 문제. 코딩형(`api`·`schema`·`testing`·`refactor`·`deploy`·`infra`·`ops`·`ui`·`docs`)에서 Fable 을 쓰는 것은 **더 비싸고 더 나쁜** 선택이다. Fable 은 thinking 을 끌 수 없고 턴이 길다.

**0. de-escalate.** 포매팅·dep bump·대량 전파·검색/요약처럼 결정론적이거나 저-위험인 fan-out 은 `high`/`medium` 로 내리거나 **Opus lead 가 Sonnet 5 / Haiku 서브에이전트로 위임**한다. ⚠ Opus 5 는 4.8 과 **반대로 위임을 과하게** 하므로, de-escalate 는 "위임을 늘려라"가 아니라 "이 *특정* 기계적 작업을 싼 모델로"다 (`opus-5-behavior.md` §2).

## 규칙

- **(a) 전역 env 로 강제하지 말 것.** `CLAUDE_CODE_EFFORT_LEVEL` 은 env > subagent frontmatter > session 우선순위라, 전역 값은 각 subagent 의 보정된 frontmatter effort 를 **전부 덮어써** fleet-wide overthinking 을 만든다. escalation 은 **메인 세션 `/effort` per-session 토글**로만. subagent 는 자기 frontmatter 를 존중받는다 (`opus-4-7-effort-policy.md` §환경변수 정책). — 이건 이론이 아니다: `.mise.toml` 의 env-max 가 2026-07-12~26 사이 24개 agent 의 보정을 실제로 무효화했다.
- **(b) escalation 은 근거를 남긴다.** `max`/Fable 로 올렸으면 **왜** 인지(어떤 실패 비용이 판단 비용을 정당화하나)를 응답·커밋 메시지·journal 에 1줄 명시. 근거 없는 상향은 비용만 태운다.
- **(c) 의심되면 xhigh(sweet spot)에 머문다.** escalate 는 명시적 정당화가 있을 때의 예외지 기본이 아니다.
- **(e) 코딩형에서 Fable 로 올리지 않는다.** rung-3 는 추론형 전용이다. 코딩형에서 Fable 은 Opus 5 보다 **비싸면서 성능이 낮다**(Frontier-Bench 33.7 vs 43.3). 코딩 상향은 rung-2(`/effort max`)에서 끝낸다.
- **(d) escalation 은 debrief 로 끝난다.** `max`/Fable/프론티어 모델을 썼으면 세션 종료 전 `/debrief` 로 `escalation` 블록(trigger = rule (b) 의 근거 1줄, `what_weaker_missed` = 하위 모델이 놓친 것) 포함 카드를 남긴다 — escalation 비용을 1회성 소비에서 영속 자산으로 바꾸는 단계다. 다음 유사 태스크가 이 카드 덕에 escalate 없이 풀리는 것이 목표 (`reasoning-playbooks.md` §capture). opt-in `harness-lock.json {"autoDebrief":true}` 시 Stop hook 이 누락을 1회 차단으로 상기.

## escalate-if / stay-down-if 신호 (S5 v1 — 2026-07-12, 증거 기반 시드)

하위 모델이 **자가 체크 가능한** 구체 신호. 전부 실측 증거에서 유도 (debrief 카드·사건 인용):

**escalate-if** (신호가 켜지면 rung-2 검토 — 단, 먼저 playbook 질의):
- 리뷰가 **>500줄 auth/payment 급 diff 에서 P0/P1 을 0건** 보고 — under-reporting 의심, max 재실행 또는 escalate (2026-07-09 실사건, v3.18 coverage-first 의 근원).
- **같은 error-class 가 활성 카드가 있는데도 ≥2회 재발** — 카드가 못 잡는 경계 밖 문제 (frontier-queue enqueue 조건과 동일축, `reasoning-playbooks.md`).
- 결정이 **로컬에서 검증 불가능한 경험적 주장**에 걸려 있고, 그럴듯한 두 대안이 반대 방향 — "자연스러운 기본 선택"이 실증과 반대인 함정 클래스 (실측: LLM-재작성 큐레이션·무캡 주입·소형 reflection 전부 겉보기 합리 + 실증 실패. 카드 32cba6c9 escalation 관찰).
- **비가역 cutover** (도메인/트래픽/registry 전환)인데 선례 카드가 코퍼스에 없음 — 파괴 단계가 신규 경로 검증보다 앞서면 이미 위반 (PB-DEP 계열, S4a diff 근거).

**stay-down-if** (escalate 불필요 — sweet spot 유지):
- 해당 task-class 의 **verified Active 카드가 상황과 매칭** — 카드 적용이 우선, escalation 은 카드 실패 후 (Inter-Cascade: 사전 질의가 strong 호출 -48%).
- 실패 비용이 **revert 한 번** — 정정 가능성이 판단 비용보다 쌈 (solo-main-workflow).
- 기계적 fan-out·검색·요약 — rung-3 로 내린다.

## 왜 canon/rule 이고 hook 이 아닌가

task-class 판정("이건 보안 코드인가? 기계적 fan-out 인가?")은 **의미론적 판단**이다. harness hook 은 전부 결정적 스크립트(0 토큰)라 이런 분류를 할 수 없다 — grep 으로 "expensive-if-wrong"을 매칭할 수 없다. 그래서 escalation 은 **rule/canon 레버**로 산다(동시성·폴링 예산 선례와 동일축, `velocity-mode.md` §훅은 토큰을 쓰지 않는다).

## 관련

- `opus-4-7-effort-policy.md` (v2.0.0) — effort 5단계·agent 분포(max=7·xhigh=12·high=2·medium=3)·env precedence **baseline SoT**
- `.claude/rules/opus-5-behavior.md` — Opus 5 행동 보정(자기검증 과잉·위임 과다·scope 확장·출력 길이)
- `claude-code-2026h1-features.md` — Fable 5 = Adopt/opt-in(오너 세션 선택), 기계 fan-out 은 Opus/Sonnet 로
- `velocity-mode.md` — semantic 판단은 결정적 hook 불가 → rule/canon 이 레버
- `cost-attribution.md` — 단가 SoT(`ecosystem.json` `pricing.genai`)·모델 비용 평가
- `attention-budget.md` — context 유한자원 (fan-out 남용 경계)
- `reasoning-playbooks.md` — rung-2 사전 질의·escalate→debrief 루프 (frontier 판단의 영속 축적·주입)
