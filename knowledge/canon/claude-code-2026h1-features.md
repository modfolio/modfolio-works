---
title: Claude Code 2026 H1 Features — 권고 (Adopt/Trial/Watch)
version: 1.4.0
last_updated: 2026-09-06
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
| **Fable 5.1** (`claude-fable-5-1`) | **Adopt / opt-in** (2026-09-02 갱신) | Mythos-class · $10/$50 · **cache read $0.25**(0.025× — Opus 5 $0.50 의 절반). 2026-09-01 출시. baseline=Opus 5 유지, 세션이 5.1 이면 `.claude/rules/fable-5-1-behavior.md`. Fable 5 는 legacy(동일 단가, cache read $1). | 모델 레지스트리 (`ecosystem.json`) |
| **Dynamic Workflows** (`Workflow` tool) | **Trial (2026-07-02 G15 실사용)** | 대규모 fan-out (100+ 파일 마이그레이션·전수 감사). 토큰 폭증 주의. per-agent `model`/`effort` 로 비용 조정. | 사용자 명시 호출 시 |
| **`/goal`** | Trial | 완료조건 기반 자율 반복. long-running 작업. | 세션 운영 |
| **Fallback models** | **Adopt** (ecosystem 적용 v3.7.0) | 과부하(429/529) 시 최대 3 모델 자동 폴백. 가용성·복원력↑. | `.claude/settings.json.fallbackModel` |
| **Subagent memory** (`memory:` frontmatter) | Watch | agent별 격리 메모리. 24 agent 영향 → 신중. | agent frontmatter |
| 3-layer memory / `/cd` / Agent View | Watch | 점진 개선. 기록만. | — |
| **scope-aware `permissions.defaultMode`** (2.1.257) | **Adopt** (허브 v3.83.0 후보) | `bypassPermissions`·`auto` 는 project/local 스코프에서 **무시** → 운반체는 user 스코프 + `--permission-mode`. `settings-adapt` 가 멤버 잔재를 걷어낸다. | `permission-mode.md` v2.0.0 |
| **`PreModelSwitch` / `PostCompact` 훅** (2.1.24x) | **Adopt-hub** | 허브 전용: 모델 전환 원장(deny 안 함) · 압축 뒤 런 로그 재정독 상기. 멤버엔 안 흘린다. | `.claude/settings.json` hooks |
| **`bashOutputMaxChars` / `taskOutputMaxChars`** | **Adopt-hub** | 판정 출력 절단 상한 100,000(≤128K). «판정 출력을 자르지 않는다»(agent-evidence §C). | `.claude/settings.json` |
| **`modelSettings`** (모델별 effort, 2.1.257) | Watch | `/effort` 가 쓰는 숫자 인코딩 · 미문서 → 손으로 쓰지 않는다. | `opus-4-7-effort-policy.md` §modelSettings |
| `Setup(--maintenance)` · `StopFailure` · `SubagentStart/Stop` · 훅 `async/asyncRewake/if` | Trial | 적응형 currency 루프(Wave 5)에서 `Setup` + `SessionStart async` 를 쓴다. `asyncRewake` 는 기각(요청 없는 모델 턴). | 허브 전용 |
| `skillListingBudgetFraction` · `skillOverrides` · `/skill-doctor` (2.1.252) | Trial | 스킬 정리(Wave 6) 의 계측·처방. `/context` Skills 행 실측 뒤에만. | `.claude/settings.local.json` |
| `attribution` (`includeCoAuthoredBy` 폐기) · 제거 키 `disableArtifact`·`keybindingFlavor`·`permissionExplainerEnabled` | Adopt | 설정할 것 없음 — `verify:claude-code-currency` 가 폐기 키 사용을 잡는다. | 게이트 |

> baseline: 모델 = `claude-opus-5`/`claude-haiku-4-5-*`, effort = max7/xhigh12/high2/medium3 (`opus-4-7-effort-policy.md` v2.0.0, 2026-07-26). ⚠ 이 각주는 2026-09-02 까지 낡은 값(`claude-opus-4-8`, max3/xhigh13/high5/medium3)을 적고 있었다. 이 canon 은 그 위에 **추가 가능성**을 기록할 뿐 기존 calibration 을 바꾸지 않는다.

## 모델 — Fable 5.1 / Fable 5 (Adopt / opt-in)

- **Fable 5.1** `claude-fable-5-1` — **2026-09-01 출시**(retirement not sooner than 2027-09-01). Fable 5 와 같은 단가($10/$50)에 **cache read $0.25**(0.025× · Opus 5 $0.50 의 절반 — pricing 페이지 각주, Mythos 5.1 도 동일). 같은 토크나이저. 1M context · 128K output · thinking 항상 ON · 기본 effort `high`. **API 차이**(Fable 5 대비): 강제 `tool_choice`(`any`/`tool`) 400 · thinking 블록은 생성 모델에 귀속(다른 모델은 조용히 버림) · 이력 편집 시 사고 블록 무효(append-only 하네스) · 30일 보존 필수(ZDR 불가). **행동 차이**: 턴이 길다 · 위임을 억제하지 말 것 · fresh-context 검증자 · 산문 조밀·서식 절제 · 전면 재작성 경향 → 하네스 규칙 `.claude/rules/fable-5-1-behavior.md`(UNIVERSAL, 3.82.0). 세션 선택: `/model fable` 이 가리키는 모델(pdgd 2.1.258 관측) 또는 `--model claude-fable-5-1` 명시(허브 2.1.255 세션 실측). 출처: platform.claude.com/docs/en/about-claude/pricing · models/overview (2026-09-02 fetch) · claude-api 스킬 번들(2.1.255) `shared/model-migration.md`.
- **Fable 5** 아래 원문은 2026-07-02 재평가 기록 — 단가·opt-in 정책은 5.1 에도 그대로 적용된다.

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
- **ecosystem 적용**: `.claude/settings.json` 에 cost-safe 체인 추가 — 폴백은 **항상 동급 이하**(비용 상승 없음). 옛 canon 스니펫의 `fallbackModels`(복수)는 오기 — 정정함.
- ⚠ **컨텍스트 창 제약 (2026-07-26 추가)**: Claude Code 는 compaction 시 **primary 보다 작은 컨텍스트 창을 가진 모델로는 폴백하지 않는다**(요약 단계에서 대화가 잘리므로). primary=Opus 5(1M)일 때 Sonnet 5(1M)는 유효하지만 Haiku 4.5(200K)는 compaction 폴백에서 제외된다 — 일반 폴백으로는 여전히 유효.

```jsonc
// .claude/settings.json — ecosystem 적용값 (cost-safe: 폴백이 더 싼 모델만)
{ "fallbackModel": ["claude-sonnet-5", "claude-haiku-4-5-20251001"] }
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

## 2.1.257 ~ 2.1.261 — 설정·훅 (2026-09-06 · v1.4.0)

`verify:claude-code-currency`(2026-09-06 신설)가 처음 돈 날 **살아 있는 결함 50건**을 냈다 — 위 표의 Adopt 행은 그 수정의 기록이다. 요지 셋:

- **효과 없는 선언이 가장 오래 산다.** 24 agent 의 `cache_control:` 은 문서에 없는 키라 no-op 이었고, project 스코프 `defaultMode` 는 2.1.257 부터 무시되는데 이 머신은 user 설정이 받쳐서 아무것도 안 깨졌다. 둘 다 «잘못 설정하면 무엇이 실패하는가 → 아무것도» 부류(agent-evidence 판별 질문 ②).
- **허브 전용과 배포용을 가른다.** `PreModelSwitch`·`PostCompact`·`bashOutputMaxChars` 는 허브 `.claude/settings.json` 에만 있고 `settings-adapt` 가 멤버에 흘리지 않는다(멤버 hooks 는 harness-pull 소유). 멤버가 원하면 자기 settings 에 적는다(Hub-not-enforcer).
- **미터는 주간 한도 여유.** 모델·effort 선택은 `bun run currency:budget` 의 여유 비율이 하향을 **권고**한다 — `model-escalation.md` §사용량 거버너.

## 재평가 trigger

- ✅ **2026-06-22 Fable 무료창 종료 → 2026-07-02 재평가 완료**: Fable 5 = Adopt/opt-in(오너 세션 선택), baseline Opus 유지, 심층작업만 Fable·기계작업 Opus/Sonnet. (위 모델 섹션.)
- **Dynamic Workflows Trial 진행 중** (2026-07-02 G15 첫 실사용 — fleet TS6 전파·evergreen 배치·platform-adapter 스윕에 적용). 결과·비용을 이 canon 에 기록 후 Trial→Adopt 재분류 판단.
- Claude Code changelog 신 릴리스 시 이 표 갱신 — `verify:claude-code-currency`(오프라인) 가 우리 설정 쪽 드리프트를, `currency:probe`(Wave 5) 가 상류 변경로그 쪽을 잡는다.

## 관련

- `opus-4-7-effort-policy.md` — 모델 티어·effort·thinking_budget 정책 (baseline)
- `context-engineering.md`, `attention-budget.md` — context 유한자원 관리
- `long-running-harness.md`, `agentic-engineering.md`, `multi-agent-research-pattern.md` — agentic 패턴
- `harness-freeze.md`, `evergreen-principle.md` — latest=canonical, 권고-not-enforce
- `cost-attribution.md` — 모델 비용 평가
