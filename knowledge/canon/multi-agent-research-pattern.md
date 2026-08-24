---
title: Multi-Agent Research Pattern — Lead Planner → Generator → Evaluator
version: 2.0.0
last_updated: 2026-08-17
source: [Anthropic Engineering "How we built our multi-agent research system" 2025-06-13 — 원문 대조 2026-08-17 (https://www.anthropic.com/engineering/multi-agent-research-system), Anthropic Engineering "Demystifying Evals for AI Agents" 2026-04 (https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), harness v2.35 P1.5 (plan crystalline-sparking-sky)]
sync_to_siblings: true
applicability: always
consumers: [multi-review, generate-review, harness-evolve, modfolio, plan, claude-api]
---

# Multi-Agent Research Pattern — 3-Tier Orchestration

> ## 🔴 2026-08-17 정정 — 이 문서의 「핵심 인용」은 **날조였다**
>
> v1.0.0 (2026-05-13) 이 아래 문장을 Anthropic 인용으로 싣고 있었다:
>
> > ~~"Multi-agent systems with Sonnet as a Lead Planner orchestrating Generator subagents
> > and an Evaluator subagent achieved comparable quality to a single Opus call, but with
> > **80% token efficiency** through clean context window separation."~~
>
> **원문에 존재하지 않는다.** 무인 런에서 1차 출처를 직접 받아(HTML 173KB, 요약기 미개입)
> 전건 대조했다:
>
> | 우리가 적은 것 | 원문 축자 |
> |---|---|
> | 날짜 「2026-04」 | **Published Jun 13, 2025** (10개월 오차) |
> | 인용문 전체 | **부재** — 네 개 특징 문구 어느 것도 없음 |
> | 「**80% token efficiency**」 | *"token usage by itself explains **80% of the variance**"* — **분산 설명력**이지 효율이 아니다 |
> | 토큰 **절감** | *"agents typically use about **4× more tokens** than chat interactions, and multi-agent systems use about **15× more tokens** than chats"* — **정반대**(단일 에이전트 대비 ≈3.75×) |
> | 「**Sonnet** as Lead Planner」 | *"**Claude Opus 4 as the lead agent** and Claude Sonnet 4 subagents"* — 배치가 뒤집혀 있다 |
>
> **왜 중대한가.** 이 문서는 `sync_to_siblings: true` 이고 10개 파일이 참조하며 3-tier
> 에이전트 전부가 소비한다. 즉 **fleet 이 「위임하면 80% 싸다」로 3개월을 읽었는데 원문은
> 「15배 비싸다」고 말한다.** 그리고 `.claude/rules/opus-5-behavior.md` §2 —
> *"Opus 5 는 과하게 위임한다 — 상한을 둬라"* — 와 **정면 충돌**했고, **날조된 쪽이 이겼다.**
>
> ⚠ 전수 감사에서 canon 의 `핵심 인용` 블록은 정확히 4개였고 **1 정확 · 2 위생 결함 · 1 날조**,
> arXiv 인용 11개는 **전부 실재·제목 일치**였다. 유일한 날조가 **벤더 블로그**였다 —
> arXiv ID 는 API 로 1초에 확인되니 정직하게 유지되는데, **블로그 URL 은 영원히 200 을 주고
> 인용문만 표류한다.** 가장 권위 있어 보이는 인용이 구조적으로 가장 약하다.

> **핵심 인용** — [Anthropic, *How we built our multi-agent research system*, **2025-06-13**](https://www.anthropic.com/engineering/multi-agent-research-system)
> (원문 대조 **2026-08-17**, HTML 173KB 직접 수신·요약기 미개입) 축자:
>
> - *"a multi-agent system with **Claude Opus 4 as the lead agent** and Claude Sonnet 4 subagents
>   **outperformed single-agent Claude Opus 4 by 90.2%** on our internal research eval."*
> - *"there is a downside: in practice, these architectures **burn through tokens fast**. …
>   multi-agent systems use about **15× more tokens** than chats. For economic viability,
>   multi-agent systems require tasks where **the value of the task is high enough** to pay
>   for the increased performance."*
>
> **읽는 법: 이 패턴은 품질을 사는 것이지 토큰을 아끼는 것이 아니다.** 정당화 조건은
> 「과제 가치가 증가 비용을 감당하는가」이고, 그 판단은 `opus-5-behavior.md` §2 의
> 위임 상한과 **같은 방향**이다.

modfolio universe 의 multi-review (4-agent 병렬) 와 generate-review (생성→리뷰 통합) 를 **3-tier 계층화** 한 frame. 각 tier 가 자기 도메인의 minimal context 만 유지 (clean window).

## 3-Tier 정의

### Tier 1 — Lead Planner

**책임**: orchestration only. 사용자 요청 (또는 trigger) 을 받아 task decomposition + Generator subagent 에 명시 delegate.

**제약**:
- **untrusted input 직접 처리 금지** (`.claude/rules/lethal-trifecta.md` v2.34 P0.5 정합)
- Tier 2 (Generator) 에 structured artifact 로 delegate
- 자체 LLM 호출에서 외부 fetch / MCP tool 결과 inject 금지

**도구 권한**:
- ✅ `Task` (Generator subagent fork)
- ✅ `Read` (internal canon / plan / 자체 manifest)
- ❌ `WebFetch` (untrusted 직접 처리 금지)
- ❌ MCP external tool 직접 호출 (Generator 에 delegate)

**modfolio universe 매핑**: 신 agent `lead-planner.md` (v2.35 P1.5).

### Tier 2 — Generator

**책임**: specific task 의 실제 작업 (코드 생성 / 분석 / 외부 fetch). Lead Planner 의 task spec 받아 자기 도메인 context 만 유지하고 작업.

**제약**:
- 작업 결과는 **structured artifact** 로 Evaluator (또는 Lead Planner) 에 return
- 큰 결과는 sub-agent 안에서 종결 — 메인은 요약만 받음 (canon `attention-budget.md` §"위반 패턴" 정합)

**modfolio universe 매핑**:
- 기존 21 agent 중 도메인 specialist (design-engineer / page-builder / api-builder / schema-builder / contract-builder / quality-fixer / 등)
- 새 task 마다 N 명 fork (병렬 가능)

### Tier 3 — Evaluator

**책임**: Generator output 의 **step-wise critique** + pass/fail + suggestion. PRM (Process Reward Model, v3.0 P2.2) 의 frame 준비.

**제약**:
- Generator 와 동등 권한 (Read 등) 이지만 file modify 금지 (검토만)
- critique 결과는 P0-P3 severity 태그 + suggestion artifact

**modfolio universe 매핑**:
- 기존 multi-review 4-agent (design-critic / accessibility-auditor / architecture-sentinel / security-hardener) 가 Tier 3 의 분산 implementation
- 신 agent `evaluator.md` (v2.35 P1.5) = Tier 3 통합 점수 (binary pass/fail 또는 weighted score)
- v3.0 P2.2 에서 `process-reward-evaluator.md` 로 step-wise score (0-10) 확장

## Structured Artifact Handoff (shared context 금지)

각 tier 간 통신은 **명시 artifact** 만. shared context (전체 conversation 그대로 inject) 금지 — token 폭증 + lethal-trifecta 위험.

### Artifact 예 — Lead Planner → Generator

```jsonc
{
  "task_id": "generate-component-card",
  "from": "lead-planner",
  "to": "component-builder",
  "spec": {
    "goal": "Brand Passport 토큰 기반 Card 컴포넌트 생성",
    "constraints": ["semantic.color.bg.subtle", "WCAG AA 4.5:1"],
    "examples": ["src/components/Button.tsx"]
  },
  "_trifecta_class": "trusted-input"
}
```

### Artifact 예 — Generator → Evaluator

```jsonc
{
  "task_id": "generate-component-card",
  "from": "component-builder",
  "to": "evaluator",
  "result": {
    "files_modified": ["src/components/Card.tsx", "src/components/Card.stories.tsx"],
    "summary": "Card 컴포넌트 + 3 variants + Storybook 추가. WCAG AA contrast 통과.",
    "self_score": 0.85
  }
}
```

### Artifact 예 — Evaluator → Lead Planner

```jsonc
{
  "task_id": "generate-component-card",
  "from": "evaluator",
  "to": "lead-planner",
  "verdict": {
    "pass": true,
    "score": 0.88,
    "findings": [
      { "severity": "P2", "category": "design-critic", "summary": "hover state 의 elevation 변화 미흡" }
    ],
    "next_action": "merge"
  }
}
```

## Token 비용 (⚠ 절감이 아니다 — 원문은 15× 증가라고 말한다)

아래 넷은 **tier 당 컨텍스트**를 줄인다 — 그러나 **총 토큰은 늘어난다.** 에이전트 수가
곱해지기 때문이고, 원문이 측정한 값이 그것이다(멀티에이전트 ≈15× chat, 에이전트 ≈4× chat).
**「per-tier 절감」과 「총량 절감」을 섞어 읽지 않는다** — v1.0.0 이 정확히 그 혼동으로
날조 인용을 정당화했다.

1. **Clean context per tier** — Lead Planner 가 50 page 의 canon read 후, Generator 에는 task spec 만 (50 page 안 보냄)
2. **Parallel Generator** — N task 를 N agent 가 병렬 처리 (sequential 대비 단축)
3. **Evaluator independence** — 결과만 받아 critique (생성 process 의 token 안 봄)
4. **Caching alignment** — 각 tier 의 system prompt 가 stable → 1h TTL cache 유지 (canon `prompt-caching-strategy.md` v1.2 정합)

modfolio universe 측정 path:
- `.evolve-state/cost-ledger.jsonl` 에 tier 별 token 분리 기록
- `bun run scripts/budget/cache-hit-report.ts --by-tier` (v2.35 후속, 별도 plan)

## modfolio universe 적용 매핑

| 기존 skill | 3-tier 매핑 |
|---|---|
| `/multi-review` | Tier 3 분산 (4 agent 가 각자 critique) → 통합 Evaluator 가 final verdict |
| `/generate-review` | Tier 2 (Generator) → Tier 3 (Evaluator) 직렬 |
| `/harness-evolve` Phase 1-5 | Tier 1 (orchestration) + Tier 2 (3-agent WebSearch parallel) + Tier 3 (synthesize script) — 이미 패턴 정합 |
| `/page-builder` 단독 | Tier 2 일부 — Lead Planner 없이 사용자가 직접 invoke |

`/harness-evolve` v2.0 (2026-05-13) 는 이 패턴의 dogfood — 기존 운영 패턴이 학술 frame 으로 cement 됨.

## Lethal Trifecta 정합 (R4 mitigation)

본 패턴은 lethal-trifecta 회피의 architectural 답:

- **Lead Planner** = trusted-input-only (untrusted 차단)
- **Generator** = task-isolated (private + untrusted 동시 처리 시 outward 차단 명시)
- **Evaluator** = read-only (outward 없음)

3-tier 분리 자체가 trifecta 의 동시 충족 차단 — guardrail 우회 시도 없음 (정공법 1원칙).

## 정공법 5원칙 정합

| 원칙 | multi-agent research 정합 |
|---|---|
| 1. 근본 원인 수정 | "context 폭증" → ❌ context window 늘리기 / ✅ 3-tier 분리 |
| 2. 에러·경고 0 | structured artifact 의 Zod schema 검증 — 누락 시 fail-fast |
| 3. 장기 시야 + 확장성 | 1 agent → N agent fork → M tier 확장 path 명확 |
| 4. 신기술 포텐셜 | PRM (v3.0 P2.2) / Managed Agents (P3) 도입 시 그대로 frame 재사용 |
| 5. 리소스 투자 | ⚠ **절감이 아니라 지출이다** — 원문 15× more tokens. 정당화 조건은 「과제 가치 > 증가 비용」 |

## 출처

### Primary

- [Anthropic Engineering — How we built our multi-agent research system (**2025-06-13**)](https://www.anthropic.com/engineering/multi-agent-research-system) — orchestrator-worker(lead agent + subagents), **15× more tokens**, "80% of the variance"(효율 아님). 2026-08-17 원문 대조 완료
- [Anthropic Engineering — Demystifying Evals for AI Agents (2026-04)](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — Evaluator grader 계층화 (code / model / human)
- [Anthropic Engineering — Effective Context Engineering (2026-04)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — clean context per agent, multi-agent specialization

### 관련 modfolio canon

- `agentic-engineering.md` §2.1 — 4 자율 반복 도구 책임 분리 표 (v2.35 P1.4)
- `context-engineering.md` — system / tool / examples 설계 (각 tier 의 system prompt 가 정합)
- `attention-budget.md` — 측정 메트릭 (token 절감 검증)
- `prompt-caching-strategy.md` v1.2 — 3-tier sub-agent caching 가이드
- `lethal-trifecta.md` (rule) — Lead Planner trusted-input-only 원칙
- `opus-4-7-effort-policy.md` v1.2 — tier 별 effort / thinking budget 권고
- `process-reward-model.md` (v3.0 P2.2 신설 예정) — Evaluator step-wise score 확장

## 갱신 이력

- **2026-05-13 v1.0.0** — 초판. plan crystalline-sparking-sky P1.5 cement. Anthropic April 2026 블로그 흡수. modfolio universe 적용 매핑 + lethal-trifecta 정합 + structured artifact handoff schema 예시.
