---
title: Model Escalation — task-class → effort/model 사다리 (권고)
version: 1.2.0
last_updated: 2026-07-12
source: [opus-4-7-effort-policy.md v1.4.0 (effort precedence·agent 분포 baseline), claude-code-2026h1-features.md (Fable 5 opt-in 재평가), velocity-mode.md (semantic 판단은 결정적 hook 불가), claude-api skill (모델 surface·effort 지원), ecosystem.json pricing.genai (단가 SoT), Anthropic 2026 H1 effort/multi-agent 권고 (xhigh sweet spot·Opus lead + Sonnet subagent), reasoning-playbooks.md v1.0.0 (rung-2 사전 질의 + escalate→debrief, Inter-Cascade arXiv 2509.22984)]
sync_to_siblings: true
applicability: always
consumers: [plan, modfolio, generate-review]
---

# Model Escalation — 사다리

> **권고이며 강제가 아니다** (Hub-not-enforcer, `evergreen-principle.md`). 목표: **Opus 를 똑똑하게 최대로 쓰되, 값어치가 있을 때만 위로 올린다.** 기본은 sweet spot(`xhigh`)에 머물고, "틀리면 비싼" 곳에서만 `max`/Fable 로 escalate 하고, 기계적 fan-out 은 아래로 내린다. baseline 모델·effort 는 `opus-4-7-effort-policy.md` 가 SoT — 이 canon 은 "언제 위/아래로 움직이나"만 정의한다.

## 사다리 (task-class → effort / 모델)

| 태스크 클래스 | effort / 모델 | 근거 |
|---|---|---|
| **구조화 코딩·리뷰 (기본)** | **`xhigh`** · Opus 4.8 (`claude-opus-4-8`) | Anthropic 코딩·agentic **sweet spot**. 대부분의 컴포넌트·API·스키마·contract·리뷰가 여기. **의심되면 여기 머문다.** |
| **최난도·expensive-if-wrong** — 보안 코드·결제/돈 이동 로직·아키텍처 tradeoff·P0 장애 triage·대용량 Figma/diff (1M) | `/effort max` · 또는 `/model fable` (`claude-fable-5`, **2× Opus**) | 판단 비용 < 실패 비용일 때만. `max`=overthinking 위험이라 최난도 한정. Fable=오답이 비싼 설계·구현에서만. **근거 명시 필수.** |
| **기계적 fan-out** — 포매팅·의존성 bump·대량 전파·검색/요약 | **`high`** · 또는 Sonnet 5(`claude-sonnet-5`) / Haiku(`claude-haiku-4-5-20251001`) **서브에이전트** | **Opus lead + Sonnet subagent** 패턴: 비용↓·품질 유지 (Anthropic multi-agent 권고). |

> 단가는 `ecosystem.json` `pricing.genai` 가 SoT (Opus $5/$25 · Fable $10/$50 = **2×** · Sonnet 5 $3/$15 · Haiku $1/$5). 위 표의 비율은 사람용 미러 — 스크립트는 SoT 를 읽는다 (`cost-attribution.md`).

## 세 rung 상세

**1. sweet spot (기본, `xhigh`·Opus 4.8).** 구조화된 작업은 max 의 overthinking 없이 xhigh 가 가장 좋다. 메인 세션은 `/effort xhigh`, subagent 는 보정된 frontmatter effort(코딩·리뷰=xhigh). 판단이 애매하면 escalate 하지 말고 **여기 머문다**.

**2. escalate (위로, `max` 또는 Fable).** "틀리면 비싼"이 escalate 트리거다 — secret leak, 잘못된 돈 이동, 되돌리기 힘든 아키텍처 결정, production downtime, 1M 컨텍스트가 필요한 대형 diff/Figma. **올리기 전 사전 1스텝: 해당 task-class 의 reasoning playbook 을 먼저 질의한다** (`/playbooks` 또는 `knowledge_query` top-k 3-5) — 과거 frontier 카드가 이미 답을 갖고 있으면 xhigh 로 해결되고 escalation 비용이 사라진다 (Inter-Cascade 실측: strong 호출 -48%, `reasoning-playbooks.md` §consult). 그래도 필요하면 `/effort max` 를 먼저 시도하고, 판단 비용이 2× 단가를 정당화하는 auth/payment/secret 급 설계·구현에서만 `/model fable`. **Haiku 는 `max`/`xhigh` 미지원** — 이 rung 은 Opus/Sonnet/Fable 만.

**3. de-escalate (아래로, `high` 또는 Sonnet/Haiku subagent).** 포매팅·dep bump·대량 전파·검색/요약처럼 결정론적이거나 저-위험인 fan-out 은 Opus 를 `high` 로 내리거나, **Opus lead 가 Sonnet 5 / Haiku 서브에이전트로 위임**한다(비용↓, 품질 유지). Haiku subagent 는 `high`/`medium` 로 돈다.

## 규칙

- **(a) 전역 env 로 강제하지 말 것.** `CLAUDE_CODE_EFFORT_LEVEL` 은 env > subagent frontmatter > session 우선순위라, 전역 값은 각 subagent 의 보정된 frontmatter effort 를 **전부 덮어써** fleet-wide overthinking 을 만든다. escalation 은 **메인 세션 `/effort` per-session 토글**로만. subagent 는 자기 frontmatter 를 존중받는다 (`opus-4-7-effort-policy.md` §환경변수 정책).
- **(b) escalation 은 근거를 남긴다.** `max`/Fable 로 올렸으면 **왜** 인지(어떤 실패 비용이 판단 비용을 정당화하나)를 응답·커밋 메시지·journal 에 1줄 명시. 근거 없는 상향은 비용만 태운다.
- **(c) 의심되면 xhigh(sweet spot)에 머문다.** escalate 는 명시적 정당화가 있을 때의 예외지 기본이 아니다.
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

- `opus-4-7-effort-policy.md` (v1.4.0) — effort 5단계·agent 분포(max=3·xhigh=13·high=5·medium=3)·env precedence **baseline SoT**
- `claude-code-2026h1-features.md` — Fable 5 = Adopt/opt-in(오너 세션 선택), 기계 fan-out 은 Opus/Sonnet 로
- `velocity-mode.md` — semantic 판단은 결정적 hook 불가 → rule/canon 이 레버
- `cost-attribution.md` — 단가 SoT(`ecosystem.json` `pricing.genai`)·모델 비용 평가
- `attention-budget.md` — context 유한자원 (fan-out 남용 경계)
- `reasoning-playbooks.md` — rung-2 사전 질의·escalate→debrief 루프 (frontier 판단의 영속 축적·주입)
