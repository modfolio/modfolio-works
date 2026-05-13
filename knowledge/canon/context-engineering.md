---
title: Context Engineering — System / Tool / Examples 설계 패턴
version: 1.0.0
last_updated: 2026-05-13
source: [Anthropic Engineering "Effective context engineering for AI agents" 2026-04 (https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), Anthropic Engineering "Multi-Agent Research System" 2026-04 (https://www.anthropic.com/engineering/multi-agent-research-system), harness v2.34 P0.1 (plan crystalline-sparking-sky)]
sync_to_siblings: true
applicability: always
consumers: [harness-evolve, multi-review, generate-review, plan, claude-api, modfolio, preflight]
---

# Context Engineering — System / Tool / Examples 설계 패턴

> **핵심 정의** (Anthropic April 2026): "Context engineering is the discipline of finding the **minimal set of highest-signal tokens** that maximize the likelihood of the desired model behavior — within a finite attention budget."

이 canon 은 **설계 패턴 (system prompt / tool / examples 의 구체 형식)** 만 다룬다. **측정 (attention budget metric)** 은 [attention-budget.md](attention-budget.md), **long-horizon 메모리 전략** 은 동 canon §"권장 패턴 3종" 으로 위임. **caching 배치** 는 [prompt-caching.md](prompt-caching.md) / [prompt-caching-strategy.md](prompt-caching-strategy.md) 로 위임.

## 1. System Prompt 설계 — "구체 but flexible"

Anthropic 권고: system prompt 는 **구체적**이되 **flexible** 해야 한다. 양 극단은 둘 다 실패:

- ❌ 너무 추상적 ("You are a helpful assistant") — 모델이 추측, 일관성 X
- ❌ 너무 규칙 나열 ("Step 1: Do X. Step 2: Do Y. Step 3: ...") — 새 시나리오 fallback 없음, brittleness
- ✅ **goal + constraint + style + escape hatch** 4-block 구조

### modfolio universe 적용 4-block 구조

```markdown
# Role
{한 줄 — agent 의 핵심 책임}

# Goal
{측정 가능한 결과 정의 — 무엇이 done 인가}

# Constraints
- {적용할 rule / canon 명시 — link 만}
- {피해야 할 anti-pattern}

# Style
- {output 형식 (markdown / json / code)}
- {tone (concise / verbose / domain-specific)}

# Escape hatch
{불확실하면 어떻게 — 질문 / sub-agent fork / 사용자 확인}
```

### 안티 패턴

- `effort: max` 지정 + 5000+ token system prompt — overthinking + budget 낭비. xhigh + 1500 token 이 sweet spot (출처: [opus-4-7-effort-policy.md](opus-4-7-effort-policy.md) v1.1 Anthropic sweet spot policy).
- 모든 rule 을 system prompt 에 inline 복사 — [attention-budget.md](attention-budget.md) §"위반 패턴" 직접 정합. rule 은 `.claude/rules/` link 만, 모델이 필요 시 fetch.
- per-session token interpolate (`SESSION_ID`, `timestamp`, `request_id`) — [prompt-caching.md](prompt-caching.md) §3.3 silent invalidator. cache hit < 30% 의 주범.

## 2. Tool 설계 — "Minimal, Non-overlapping, Namespaced"

Anthropic 권고: tool 정의는 **최소한**, 책임이 **겹치지 않게**, **namespace 로 정렬**.

### 2.1 Minimal — 모델이 매 호출에서 read 한다

tools 는 prefix 의 가장 앞 (Anthropic render order: `tools → system → messages`). 즉 모든 tool 의 description 이 매 호출 prefix 에 들어간다. 50 개 tool × 평균 300 token = 15,000 token prefix.

**modfolio universe 적용**: agent 별로 필요한 tool 만 frontmatter `allowedTools:` 명시. `disallowedTools:` 보다 allowlist 가 정공법 (whitelist > blacklist).

```yaml
# Bad
allowedTools: ["*"]   # 모든 tool — prefix 비대

# Good
allowedTools:
  - Read
  - Edit
  - Bash(bun run check:*)
  - Bash(git status:*)
```

### 2.2 Non-overlapping — 책임 1:1 매핑

두 tool 이 같은 일을 다른 인터페이스로 하면 모델이 헷갈린다.

- ❌ `Read` + `cat via Bash` 둘 다 — 모델이 random pick
- ✅ `Read` 단일 + Bash `cat` 은 disallow (CLAUDE.md `Read for files`)

### 2.3 Namespaced — prefix 로 분류

```yaml
allowedTools:
  - "mcp__github__*"   # GitHub MCP tools
  - "mcp__neon__*"     # Neon MCP tools
  - "Bash(bun run *)"  # Bun scripts (sub-namespace)
```

prefix 가 명확하면 모델이 "이 tool 은 이 도메인" 으로 즉시 매핑. attention budget 절감.

### 2.4 modfolio universe 의 tool 설계 anti-patterns

| 패턴 | 문제 | 해결 |
|---|---|---|
| agent frontmatter 에 `allowedTools: ["*"]` | prefix 비대 (50+ tool description 매 호출 read) | 필요한 tool 명시 (5-15개) |
| MCP tool 을 startup 후 동적 추가 | cache invalidate ([prompt-caching.md](prompt-caching.md) §3.3) | startup 에 모두 lock |
| 두 tool 이 같은 sub-action (Read + Bash cat) | 모델 혼동 | 단일 정공법 tool |
| tool description 에 sensitive context (key, internal path) | secret leak 가능 | description 은 일반화 |

## 3. Examples 설계 — "Canonical > 규칙"

Anthropic 권고: rule 을 길게 나열하는 것보다 **canonical example 1-3개** 가 효과적. 모델은 pattern matching 으로 학습.

### 3.1 Few-shot 의 정공법

```markdown
# 잘못된 패턴 (rule 나열)

When user asks for X, do Y. When user asks for A, do B. When user...
{30 rule 나열}

# 정공법 (canonical example)

Example 1 (typical case):
  User: "Add a Drizzle migration for users table"
  Agent action:
    1. Read existing schema.ts
    2. Generate migration with drizzle-kit
    3. Run migration in staging
  Result: PASS

Example 2 (edge case):
  User: "Drop user.email column"
  Agent action:
    1. Check data dependency (FK, app code)
    2. Two-phase migration (deprecate → drop)
    3. Roll-back plan in journal
  Result: PASS with caveat
```

### 3.2 modfolio universe 의 example sourcing

| layer | 출처 | 예 |
|---|---|---|
| skill SKILL.md | 직접 inline | `<example>` 태그로 1-3개 canonical case |
| canon | 직접 inline | "modfolio universe 적용" 섹션의 표 |
| agent frontmatter | link to skill | "이 agent 가 사용하는 skill 참조" |
| rule | inline (짧으면) 또는 link | rule = constraint, example 은 skill 에서 |

### 3.3 Anti-pattern

- example 이 5+ 개 — diminishing return, attention budget 낭비. 1-3개로 충분
- example 이 코드 dump (50KB+) — git diff 참조로 대체
- example 이 모든 edge case cover — canonical (typical case) 우선, edge 는 별도 섹션
- example 이 fictional / 추측 — 정공법 위반. 실제 modfolio 사례 또는 명시 hypothetical 라벨

## 4. Long-horizon 전략 — [attention-budget.md](attention-budget.md) 위임

긴 세션 / multi-turn agent 의 context bloat 방지 3 패턴 (Compaction / Structured note-taking / Multi-agent specialization) 은 [attention-budget.md](attention-budget.md) §"권장 패턴 3종" 에 cement. 본 canon 은 single-prompt 차원의 설계 만 다룸.

## 5. Multi-Agent Research pattern 연계

Anthropic April 블로그 "Multi-Agent Research System" 의 Lead Planner → Generator → Evaluator 3-tier 가 context engineering 의 **multi-agent 차원 구현**. 각 sub-agent 는 자기 도메인의 minimal context 만 가짐 (clean window). 자세한 패턴은 [multi-agent-research-pattern.md](multi-agent-research-pattern.md) (v2.35 신설 예정).

본 canon 의 context engineering 원칙이 sub-agent system prompt 각각에 적용된다. Lead Planner 의 system prompt 가 Generator 보다 더 추상적 (orchestration role), Generator 는 specific task, Evaluator 는 critique criteria.

## 6. 정공법 5원칙 정합

| 원칙 | context engineering 정합 |
|---|---|
| 1. 근본 원인 수정 | "rule 더 추가하면 모델이 잘하겠지" → ❌ canonical example 1-3개가 정공법 |
| 2. 에러·경고 0 | tool overlap / silent invalidator / per-session token interpolate = warning. 측정 + 제거 |
| 3. 장기 시야 + 확장성 | minimal token = 확장 가능. 매 호출 prefix 가 비대하면 모델 발전해도 비용/지연 누적 |
| 4. 신기술 포텐셜 감안 | Adaptive thinking / Extended thinking 도입 시 context engineering 이 더 중요 (thinking budget 자체가 finite resource) |
| 5. 리소스 투자 허용 | "system prompt 잘 짜는 시간" = 매 호출 절감. ROI 분기별 측정 |

## 7. modfolio universe 의 적용 path

| consumer | 사용 |
|---|---|
| `/harness-evolve` Phase 1 진단 | agent system prompt 4-block 구조 점검, tool overlap 검출 |
| `/multi-review` | 4 agent (design-critic / accessibility-auditor / architecture-sentinel / security-hardener) 의 system prompt 가 본 패턴 정합 검증 |
| `/generate-review` | Lead Planner step 추가 시 본 canon 4-block 적용 |
| `/claude-api` skill (member repo) | SDK 직접 호출 시 system prompt 설계 가이드 |
| `/plan` (skill) | plan 작성 시 attention budget 영향 평가 (이 canon §"안티 패턴" 점검) |
| `/preflight` | agent system prompt 길이 / tool 개수 baseline 측정 |
| `/modfolio` 14-track 진단 | context engineering 트랙 신설 (Phase 2) |

## 8. 출처

### Primary

- [Anthropic Engineering — Effective context engineering for AI agents (2026-04)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — 핵심 정의, system / tool / examples 4 원칙
- [Anthropic Engineering — Multi-Agent Research System (2026-04)](https://www.anthropic.com/engineering/multi-agent-research-system) — Lead Planner / Generator / Evaluator 3-tier
- [Anthropic Engineering — Demystifying Evals for AI Agents (2026-04)](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — example 1-3개의 canonical 평가 정합

### 관련 modfolio canon

- [attention-budget.md](attention-budget.md) — **측정** 차원 (메트릭, 한계, 권장 패턴 3종 — long-horizon)
- [prompt-caching.md](prompt-caching.md) — cache_control 배치 (member repo SDK 호출)
- [prompt-caching-strategy.md](prompt-caching-strategy.md) — Claude Code 1h vs 5m TTL 운영
- [opus-4-7-effort-policy.md](opus-4-7-effort-policy.md) — effort × thinking budget 정책 (v1.2)
- [agentic-engineering.md](agentic-engineering.md) — 더 넓은 agentic 패턴 frame
- [multi-agent-research-pattern.md](multi-agent-research-pattern.md) — 3-tier 패턴 cement (v2.35 신설 예정)

## 9. 갱신 이력

- **2026-05-13 v1.0.0** — 초판. plan crystalline-sparking-sky P0.1 cement. attention-budget 와 boundary 분리 (이 canon = 설계 / attention-budget = 측정). Anthropic April 2026 블로그 system / tool / examples 4 원칙 흡수. Multi-Agent Research pattern 연계 명시 (v2.35 P1.5 신 canon 의 frame 준비).
