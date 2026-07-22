---
title: Attention Budget — Context as Finite Resource
version: 1.4.0
last_updated: 2026-07-09
source: [Anthropic 2026 Agentic Coding Trends Report (https://resources.anthropic.com/2026-agentic-coding-trends-report), Anthropic Engineering "Effective context engineering for AI agents" (https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), Claude Cookbook "Context engineering: memory, compaction, and tool clearing" 2026-03-20 (https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools), harness-evolve 첫 dogfood Adopt P0 #4, 2026-05-13 v2.0 dogfood Trial P1 (Memory tool L3), harness v2.34 P0.2 (context-engineering canon 분리)]
sync_to_siblings: true
consumers: [harness-evolve, modfolio, preflight, claude-api, multi-review, generate-review, plan, ralph-loop, context-engineering]
applicability: always
---

# Attention Budget — Context as Finite Resource

> **핵심 정의** (Anthropic 인용): "LLMs have an 'attention budget' that they draw on when parsing large volumes of context. Every new token introduced depletes this budget by some amount, increasing the need to carefully curate the tokens available to the LLM."
>
> 즉 1M token context 도 **finite resource**. 정공법 5원칙 중 "장기 시야 + 확장성" 의 직접 정합 — 단순히 더 많은 token 을 욱여넣는 게 아니라 **highest-signal tokens** 만 선별.

## 왜 universe 표준인가

modfolio universe 는:
- **23 agent** (각자 system prompt + tools + skill content read) — v2.35 P1.5 lead-planner + evaluator 신설
- **44 skill** + **49 canon** + **15 rule** + 누적 **~50+ journal**
- **multi-agent orchestration** (design-engineer, code-reviewer, page-builder, lead-planner 등이 sub-agent 분기)

→ context 누적 압력이 매일 증가. 1M context Opus 4.7 도 finite. **attention budget = 모든 agent/skill/canon 설계의 measurable 기준**.

## Context Engineering 5 criteria (2026-05-24 추가, Anthropic + 사이드 plan a645d7f4ee5b1b395)

attention budget 운영의 5 가지 평가 축. agent / skill / canon 추가 시 다음 5 criteria 로 점검:

| Criterion | 정의 | 측정 / 점검 |
|-----------|------|------------|
| **Relevance** | 현재 task 에 직접 기여하는 token 비율 | "이 canon 의 80% 가 현 task 와 무관" 이면 분할 또는 prefix-cached non-essential |
| **Sufficiency** | task 완료에 필요한 context 가 전부 들어왔는지 | 부족 시 multi-turn 또는 추가 search — context 부족이 hallucination 의 1순위 원인 |
| **Isolation** | 다른 task 의 context 가 누설되지 않는지 | subagent / worktree 분리 + system prompt 의 scope 명시 |
| **Economy** | 동일 효과를 최소 token 으로 | cache_control 적극 활용, 중복 information 제거, 짧은 reference 우선 |
| **Provenance** | 각 context piece 의 출처 + 신뢰도 추적 | source 명시 (canon link, raw HTTP response, web URL) + agent-evidence.md 정합 |

이 5 축은 attention budget 의 **정공법 운영 원칙**. 단순 token 절감이 아니라 highest-signal token 만 선별의 framework.

## 측정 메트릭 (modfolio universe 도입)

| 메트릭 | 측정 대상 | 권장 한계 |
|---|---|---|
| **agent system prompt 길이** | `.claude/agents/*.md` 의 frontmatter + body | < 5,000 token (작은 agent) / < 15,000 (전문 agent) |
| **skill content 누적 read** | 같은 SKILL.md 가 한 세션에 N번 read | cache_control 적용 시 N=1, 미적용 시 N>1 = budget 낭비 |
| **canon 누적 read** | `knowledge/canon/*.md` 참조 빈도 | 각 canon < 5 회/세션, 초과 시 분할 또는 cache |
| **cache hit rate** | `usage.cache_read_input_tokens / usage.input_tokens` | > 50% (장시간 세션) / > 80% (multi-agent reuse) |
| **context budget consumed** | 매 turn 의 token 사용률 | < 70% of context window (compaction trigger 안 걸리도록) |

**cache_read_input_tokens** > 0 검증이 가장 빠른 sanity check. 0 이면 cache_control 미적용 = budget 낭비.

## Context Rot — 토큰이 늘수록 recall 이 저하된다 (2026-07-09 추가, Anthropic "Effective context engineering for AI agents")

> **핵심** (Anthropic, "Effective context engineering for AI agents"): context window 의 토큰 수가 늘어날수록 모델이 그 안에서 **정확히 recall 하는 능력이 저하**된다. 하드 리밋(1M)에 닿기 전에도 이미 **토큰당 가치(value-per-token)가 떨어진다** — 더 채울수록 채운 것의 신뢰도가 낮아지는 **context rot**.

attention budget 이 "매 토큰이 예산을 소모한다"는 **총량** 관점이라면, context rot 은 그 소모의 **질적 저하** 면이다 — 같은 원리의 두 얼굴. budget 이 남아 있어도 (hard limit 미도달) 신호는 이미 희석된다. 그래서 정공법은 context window 를 키우는 게 아니라 **highest-signal token 만 유지**하고 나머지를 외부로 밀어내는 것 (정공법 3원칙 "장기 시야 + 확장성"의 직접 근거).

**long-horizon 대응 3축** — 긴 세션·다단계 작업에서 rot 을 구조적으로 막는 Anthropic 권장 기법이 곧 아래 §"권장 패턴 3종": **Compaction** (stale history 요약 제거) · **Structured note-taking** (`knowledge/journal/`·`knowledge/canon/`·plan 파일을 외부 memory 로 cement) · **Multi-agent isolation** (sub-agent 마다 깨끗한 독립 컨텍스트 창). 세 기법의 modfolio universe 적용은 다음 절에 상술 — 이 절은 *왜* (rot 이라는 실패 모드), 다음 절은 *어떻게*.

## 권장 패턴 3종 (Anthropic 인용)

세 기법 모두 **context rot 의 long-horizon 대응** (위 §Context Rot) — stale·저신호 토큰을 활성 컨텍스트에서 밀어내 recall 을 보존한다.

### 1. Compaction (대화 history 요약)

긴 세션의 context bloat 방지. modfolio universe 적용:
- Claude Code 의 자동 compaction (PreCompact hook 으로 제어)
- 우리 hook = `.claude/plans/*.md` + `knowledge/journal/*.md` unstaged draft 차단 (draft 손실 방지)
- compaction 직전 critical state 를 plan/journal 로 cement → handoff prompt dual-write 패턴

### 2. Structured note-taking (외부 memory file)

session-internal 메모리 의존 X, 명시적 파일에 cement. modfolio universe 적용:
- `knowledge/journal/*.md` — 의사결정 + 발견 기록 (`/journal` skill)
- `knowledge/canon/*.md` — 표준/원칙 (현 attention-budget.md 도 이 layer)
- `~/.claude/plans/*.md` — user-local in-flight plan
- handoff prompt dual-write — git remote sync (다른 머신 이어가기)

### 3. Multi-agent architectures (specialized sub-agents, clean context window)

각 sub-agent 가 자기 집중 영역만 봄. modfolio universe 적용:
- 20 agent 가 각자 specialized (design-engineer / code-reviewer / page-builder / security-hardener / accessibility-auditor / ...)
- 메인 스레드는 orchestration only — 큰 결과는 sub-agent 안에서 종결, 메인은 요약만 받음
- `Task` 도구의 fork/return 패턴

## modfolio universe 의 attention budget 위반 패턴 (정공법 안티패턴)

❌ **다음은 budget 낭비**:
- 같은 canon 을 한 세션에 5번 이상 read (cache_control 미적용)
- agent system prompt 에 모든 rule 을 inline 복사 (참조로 충분)
- skill SKILL.md 에 대용량 example 코드 inline (별도 파일 + 참조)
- sub-agent 가 대용량 결과 (예: 50KB+ output) 를 메인 스레드로 그대로 return (요약 후 return)
- journal 본문이 코드 dump 로 가득 (사실 + 의사결정만, 코드는 git diff 참조)

✅ **정공법 패턴**:
- cache_control 적극 활용 (canon `claude-api` skill 참조)
- agent prompt 는 link/reference 위주 (read 시점에 sub-agent 가 fetch)
- 큰 결과는 sub-agent 안에서 종결 (메인 = orchestration only)
- 외부 memory file (journal/canon/plan) 으로 정기 cement

## 정공법 5원칙 정합

| 원칙 | attention budget 정합 |
|---|---|
| 1. 근본 원인 수정 | budget 부족 = 단순히 context window 늘리는 게 아님. 구조 문제 (예: agent 분리, canon 분할) 수정 |
| 2. 에러·경고 0 | cache miss / context overflow 도 warning. 측정 + mitigation |
| 3. **장기 시야 + 확장성** | **attention budget = "장기 시야" 의 직접 측정. 1M token 도 finite 하다는 인식이 곧 확장성 설계의 baseline** |
| 4. 신기술 포텐셜 감안 | 모델 발전 (Claude 4.x → 5.x) 으로 context 가 늘어나도 budget 개념은 여전 valid (단가만 변함) |
| 5. 리소스·시간 투자 허용 | budget 절감 = 비용 절감. 정공법 투자 ROI 직접 측정 가능 |

## consumers 활용 path

| consumer | 사용 |
|---|---|
| `/harness-evolve` | Phase 1 진단 baseline. cache_control 적용률 / agent prompt 길이 / canon read 패턴 측정 |
| `/modfolio` | 14-track 진단에 context budget 메트릭 추가 |
| `/preflight` | 세션 시작 시 budget warning (직전 세션 cache hit < 50% 등) |
| `/claude-api` skill | cache_control 4-tier 정렬 표준 (이 canon 의 측정 기준 만족 위해) |
| `/multi-review` | sub-agent 의 결과 size 자동 검증 (메인 스레드 budget 보호) |
| `/plan` | plan 파일 작성 시 attention budget 영향 평가 (예: "이 변경이 agent prompt 를 N% 늘림" 명시) |

## L3 — Persistent Memory (Memory tool, 2026-05+ Trial)

L1 (in-context) / L2 (structured external file: journal/canon/plan) / L3 (persistent memory directory) 의 3-tier memory frame 에서 **L3 는 agent 가 자율 read/write 하는 file-based memory directory**. L2 (외부 파일) 와 차이: agent 가 자기 의지로 invocation 간 정보 cement.

### Anthropic memory tool 실증 (2026-05)
- 100-turn eval 에서 **84% token 감소** ([memory-tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool))
- file-based — model 이 read/write 명령으로 자율 관리

### modfolio universe 적용 (Trial 단계, 2026-05-13 dogfood)
- 1차 trial: `ralph-loop` skill (multi-iteration) + `generate-review` (review history 누적)
- memory directory 위치: `.claude/memory/{agent-name}/` (gitignore)
- size 한계: 10MB per agent (recommended), 50MB hard cap
- sync 정책: local-only (cross-machine 동기는 R2 또는 git, 별도 plan)

### 측정
- `scripts/budget/cache-hit-report.ts --memory-tool` 모드 — token saving 추적 (Trial 단계)
- 목표: saving > 0.5 → Adopt-1-cement. 0.3-0.5 → Trial 유지. < 0.3 → Skip.

### 분류 결정
- Trial spike 후 cement / skip 결정 — plan: `~/.claude/plans/20260513-evolve-memory-tool-l3.md`

## 측정 도구 (Phase 2 — 별도 plan)

- `scripts/evolve/diagnose-current.ts` 에 cache_control 적용률 측정 로직 추가 (이미 일부 있음 — 강화 필요)
- 신규 `scripts/budget/measure-prompts.ts` — 각 agent system prompt token count 측정
- 신규 `scripts/budget/cache-hit-report.ts` — Anthropic Usage&Cost API 활용 (Trial P1 #3)
- 신규 `scripts/budget/cache-hit-report.ts --memory-tool` — L3 Trial 측정
- ecosystem-dashboard 에 weekly budget panel (Trial P1 #3 의 cost panel 과 합성)

## 다음 분기점

- **Phase 1**: 본 canon cement (현재) + fundamentals-first.md 1 line + harness-evolve baseline (현재)
- **Phase 2**: cache_control rollout (P0 plan 별도) — measurable cache hit rate 도입
- **Phase 3**: 측정 도구 자동화 (`scripts/budget/*`)
- **Phase 4**: ecosystem-dashboard panel (Anthropic Usage&Cost API 도입 시)

## 외부 출처

- [Anthropic 2026 Agentic Coding Trends Report](https://resources.anthropic.com/2026-agentic-coding-trends-report) — 보고서 본문
- [Effective context engineering for AI agents (Anthropic Engineering)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — 핵심 정의 출처
- [Claude Cookbook: Context engineering — memory, compaction, tool clearing (2026-03-20)](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools) — 3 권장 패턴 출처
- [Context rot: the emerging challenge (Understanding AI)](https://www.understandingai.org/p/context-rot-the-emerging-challenge) — context bloat 외부 분석
- [Anthropic Claude Cookbook — context engineering tools](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools) — 도구 패턴

## 관련 canon

- `context-engineering.md` — **설계** 차원 (system / tool / examples 설계 패턴). 본 canon = **측정**, context-engineering = **설계** 의 boundary 명시 (2026-05-13 v1.2 cement)
- `agentic-engineering.md` — 더 넓은 agentic 패턴 (이 canon 은 그 안의 특정 metric 영역)
- `opus-4-7-effort-policy.md` — effort tier 결정 (max effort 가 budget 영향 큰. v1.2 부터 thinking budget 직교 dimension)
- `prompt-caching.md` / `prompt-caching-strategy.md` — caching 배치 (본 canon 의 §"권장 패턴 3종" 중 Compaction 의 구현 기반)
- `tech-trends-2026-05.md` — Adopt P0 #4 출처
