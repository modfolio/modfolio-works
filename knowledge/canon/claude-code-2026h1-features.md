---
title: Claude Code 2026 H1 Features — 권고 (Adopt/Trial/Watch)
version: 1.2.0
last_updated: 2026-07-02
source: [Anthropic Claude Fable 5 announcement 2026-06-09, code.claude.com/docs/en/changelog, code.claude.com/docs/en/workflows, code.claude.com/docs/en/memory, code.claude.com/docs/en/model-config (fallback-model-chains, 2026-06-14 검증), claude-api skill (model ground truth)]
sync_to_siblings: true
applicability: always
consumers: [preflight, harness-evolve, modfolio, claude-api]
---

# Claude Code 2026 H1 Features — 권고

> 이 문서는 **권고**이며 강제가 아니다 (Hub-not-enforcer, `evergreen-principle.md`). 각 항목은 harness-evolve 관례의 **Adopt / Trial / Watch / Skip** 분류 + 근거 + 출처. 분류는 작성 시점(2026-06-10) 판단 — 채택·시기는 각 repo 자율. 실제 도입(agent frontmatter·settings.json 변경)은 **별도 gated 결정**이며 이 canon 작성 자체가 도입은 아니다.

## 요약

| 기능 | 분류 | 한 줄 | 영향 범위 |
|------|------|-------|-----------|
| **Fable 5** (`claude-fable-5`) | **Adopt / opt-in** (2026-07-02 재평가 완료) | Mythos-class(Opus 상위)·$10/$50. 무료창 6/22 종료. baseline=Opus 유지, **오너 세션 opt-in** `/model fable` 로 심층작업. | 모델 레지스트리 (`ecosystem.json`) |
| **Dynamic Workflows** (`Workflow` tool) | **Trial (2026-07-02 G15 실사용)** | 대규모 fan-out (100+ 파일 마이그레이션·전수 감사). 토큰 폭증 주의. per-agent `model`/`effort` 로 비용 조정. | 사용자 명시 호출 시 |
| **`/goal`** | Trial | 완료조건 기반 자율 반복. long-running 작업. | 세션 운영 |
| **Fallback models** | **Adopt** (ecosystem 적용 v3.7.0) | 과부하(429/529) 시 최대 3 모델 자동 폴백. 가용성·복원력↑. | `.claude/settings.json.fallbackModel` |
| **Subagent memory** (`memory:` frontmatter) | Watch | agent별 격리 메모리. 24 agent 영향 → 신중. | agent frontmatter |
| 3-layer memory / `/cd` / Agent View | Watch | 점진 개선. 기록만. | — |

> baseline 무변: 모델 = `claude-opus-4-8`(+`[1m]`)/`claude-haiku-4-5-*`, effort = max3/xhigh13/high5/medium3 (`opus-4-7-effort-policy.md`). 이 canon 은 그 위에 **추가 가능성**을 기록할 뿐 기존 calibration 을 바꾸지 않는다.

## 모델 — Fable 5 (Adopt / opt-in, 오너 승인 사용 — 2026-07-02 재평가 완료)

- **ID** `claude-fable-5` — GA **2026-06-09**. 1M context 기본, **128K max output**, reasoning 지원, text/image/file 입력. **Mythos-class** 티어(Opus 상위) — "가장 강력한 generally-available 모델", SWE·지식업무·비전·과학연구 거의 전 벤치 SOTA. (Mythos 5 = 동일 underlying 모델, 세이프가드 해제판, Project Glasswing 한정. Fable 5 = 세이프가드 분류기 포함 — 일부 주제 쿼리는 보수적으로 **Opus 4.8 로 라우팅**, 평균 세션의 <5% 발동.)
- **가격** $10 / $50 per MTok (input/output) = Opus 4.8($5/$25)의 **2배**. Fable=Mythos 동일가.
- **무료창 종료** 2026-06-22 (Pro/Max 무료 사용 창 종료 — 이제 유료). 출처: Anthropic 발표 2026-06-09.
- **Claude Code 사용** `/model fable` (또는 `claude-fable-5`) 로 세션 선택. agent frontmatter `model: claude-fable-5` 도 유효.
- **API surface** Opus 4.7/4.8 과 동일 (adaptive thinking only, `budget_tokens`/`temperature`/`top_p`/`top_k` 제거 = 400). **단 하나 차이**: explicit `thinking: {type: "disabled"}` 가 400 → `thinking` 파라미터를 **생략**해야 함.
- **universe 정책 (2026-07-02 재평가 확정)**: baseline agent 기본 모델은 여전히 **Opus 4.8**(비용 효율·대량 fan-out 용). **Fable 5 = 오너 세션 opt-in**(`/model fable`) — 오너가 세션별로 명시 선택 시 그 세션의 심층 작업(설계·보안·auth-critical·복잡 리팩)에 사용. 2026-07-02 G15 세션이 첫 대규모 Fable 실사용(오너 "fable로 작업해줘 다 허락"). `ecosystem.json.harnessFableStatus: "available-optin"` 유지.
- **선택 기준(재평가 결론)**: Fable 값어치가 비용(2×)을 정당화하는 곳 = (a) auth/payment/secret 등 **틀리면 비싼** 코드의 설계·구현(connect eject·athsra E2EE·pay idempotency), (b) 다차원 트레이드오프 판단(아키텍처·마이그 경로). **기계적 fan-out**(TS6 전파·dep bump·포맷)은 Opus/Sonnet 로 내려 비용 절감 — Workflow 스테이지에서 `model`/`effort` per-agent 조정. cost-attribution.md 정합. task-class → effort/모델 사다리(sweet spot 유지·언제 max/Fable·fan-out 은 Sonnet subagent) = `model-escalation.md`.

## Dynamic Workflows (Trial)

- Opus 4.8 의 대규모 병렬 subagent 자동 조율 (수십~수백). **명시 호출**(사용자가 "workflow"/"ultracode" opt-in) 시에만 — 자동 발동 아님.
- **적합** 100+ 파일 마이그레이션, 전수 audit, 다각 stress-test 처럼 한 컨텍스트로 안 되는 fan-out.
- **주의** "substantially more tokens" → 크레딧/비용 모니터링 필수. attention-budget.md 의 economy 원칙과 긴장 — 큰 작업에만.
- **우리 자산과의 관계** 기존 `modfolio`/`harness-evolve` 메타 skill 이 이미 다중 진단 fan-out 을 한다. Dynamic Workflows 는 그보다 깊은 결정적 orchestration 층 — 중복 도입 전 두 경로의 경계 정의 필요. `multi-agent-research-pattern.md`(Lead Planner trifecta 분리) 정합 확인 후 Trial.
- 출처: claude.com/blog/introducing-dynamic-workflows-in-claude-code, code.claude.com/docs/en/workflows.

## `/goal` (Trial)

- 완료조건(success criteria) 설정 → Claude 가 충족까지 반복. long-horizon 작업의 "목표 고정" 장치.
- `long-running-harness.md`(state-outside-context, initializer/coding/evaluator)와 cross-link — `/goal` 은 그 evaluator-loop 의 사용자측 진입점에 해당.
- **Trial** 근거: solo-main-workflow 의 자율 main 작업과 결합 시 무인 장세션 안정성↑ 기대. 측정 후 채택.

## Fallback models (Adopt — ecosystem v3.7.0 적용)

- 과부하(**429/529**)·unavailable·non-retryable server error 시 다음 모델로 자동 폴백 → 가용성·복원력↑. auth/billing/rate-limit/size 에러는 폴백 **안 함**(일반 retry).
- **검증된 키명** (2026-06-14, code.claude.com/docs/en/model-config#fallback-model-chains): `.claude/settings.json` 의 **`fallbackModel`** (단수, **배열** — 최대 3, 초과 무시). element = 모델 ID/alias(`"opus"`/`"sonnet"`/`"fable"`) 또는 `"default"`. CLI `--fallback-model sonnet,haiku` 가 settings 보다 우선. 전용 env var 없음. v2.1.153+.
- **ecosystem 적용**: `.claude/settings.json` 에 cost-safe 체인 `["claude-sonnet-4-6", "claude-haiku-4-5-20251001"]` 추가 — 폴백은 **항상 동급 이하**(비용 상승 없음). 옛 canon 스니펫의 `fallbackModels`(복수)는 오기 — 정정함.

```jsonc
// .claude/settings.json — ecosystem 적용값 (cost-safe: 폴백이 더 싼 모델만)
{ "fallbackModel": ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"] }
```

- **sibling 은 opt-in** (블랭킷 push 안 함): sonnet/haiku-primary sibling 이 opus 로 폴백하면 비용 상승 → 각 repo 가 자기 primary 보다 동급 이하 체인을 선택 (Hub-not-enforcer + cost-safety). 권고 체인 = primary 보다 싼 모델들.

## 이번 release(v3.7.0) 구현 — Dreaming / payment guardrails

`tech-trends-2026-06.md` 의 Adopt 3건이 v3.7.0 에 구현됨: **Claude Dreaming**(self-improving memory → `harness-dreaming.md` + `/dream`), **AI payment guardrails**(산업표준 → `payment-safety.md` + `pre-payment-guard`), **app URL registry**(`app-registry.md`). 이 canon 의 "신기능 권고" 와 달리 그 3건은 즉시 도입 완료(human-gate·결정적 게이트 유지).

## Subagent memory `memory:` frontmatter (Watch)

- subagent 별 격리 메모리 저장소 (2026 Feb+). multi-agent 작업의 turn-간 연속성.
- **Watch** 근거: 도입 시 24 agent frontmatter 전반 영향 + `memory-architecture.md`(커스텀 Memory Tool) 와의 설계 정합 필요. lethal-trifecta(private×untrusted×outward) 노출면 재검토 필수. 이번 pass 도입 X — 별도 gated plan.

## 기타 (Watch — 기록만)

- **3-layer memory**: CLAUDE.md(commit) + auto memory(자기주도) + subagent memory. 우리는 이미 CLAUDE.md + `.claude/projects/.../memory/` 사용 — auto/subagent 층 확대는 Watch.
- **`/cd` 캐시보존**: 워킹디렉토리 이동 시 prompt cache 유지. prompt-caching.md 정합, 편의 개선.
- **Agent View** (`claude agents`): 배경 세션 통합 대시보드. loop/schedule skill 운영과 시너지 — Watch.

## Anthropic 엔지니어링 블로그 → 기존 canon 매핑 (신규 작성 X)

2026 상반기 Anthropic 글은 우리 기존 canon 을 **재확인·보강**한다. 신규 canon 만들지 말고 cross-link:

| 블로그 | 기존 canon |
|--------|-----------|
| Effective Context Engineering for AI Agents | `context-engineering.md`, `attention-budget.md` |
| Effective Harnesses for Long-Running Agents | `long-running-harness.md` |
| Scaling Managed Agents (brain/hands 분리) | `agent-runtime-layers.md` (+ Managed Agents 자체는 P3 보류, `project_harness-v3-managed-agents-p3`) |
| Building Agents with the Claude Agent SDK | `agentic-engineering.md` (gather→act→verify) |

## 재평가 trigger

- ✅ **2026-06-22 Fable 무료창 종료 → 2026-07-02 재평가 완료**: Fable 5 = Adopt/opt-in(오너 세션 선택), baseline Opus 유지, 심층작업만 Fable·기계작업 Opus/Sonnet. (위 모델 섹션.)
- **Dynamic Workflows Trial 진행 중** (2026-07-02 G15 첫 실사용 — fleet TS6 전파·evergreen 배치·platform-adapter 스윕에 적용). 결과·비용을 이 canon 에 기록 후 Trial→Adopt 재분류 판단.
- Claude Code changelog 신 릴리스 시 이 표 갱신 (harness-evolve `/evolve` 경로).

## 관련

- `opus-4-7-effort-policy.md` — 모델 티어·effort·thinking_budget 정책 (baseline)
- `context-engineering.md`, `attention-budget.md` — context 유한자원 관리
- `long-running-harness.md`, `agentic-engineering.md`, `multi-agent-research-pattern.md` — agentic 패턴
- `harness-freeze.md`, `evergreen-principle.md` — latest=canonical, 권고-not-enforce
- `cost-attribution.md` — 모델 비용 평가
