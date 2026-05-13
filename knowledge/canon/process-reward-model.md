---
title: Process Reward Model — Step-Wise Verification
version: 1.0.0
last_updated: 2026-05-13
source: [ThinkPRM (Process Reward Models, arXiv 2504.16828, 2025), Test-Time Compute Scaling (Anthropic 2024-2025), harness v3.0 P2.2 (plan crystalline-sparking-sky)]
sync_to_siblings: true
applicability: always
consumers: [multi-review, generate-review, harness-evolve, modfolio, claude-api]
---

# Process Reward Model — Step-Wise Verification

> **핵심 차이**: Outcome Reward Model (ORM) = 최종 결과만 평가. Process Reward Model (PRM) = **매 step 마다** 평가 → tree search 가지치기 + best-of-N sampling 의 reward function.

modfolio universe 의 multi-review 4-agent (binary pass/fail) 와 v2.35 evaluator agent (weighted score 0-1) 의 **다음 진화 단계**. step-wise 0-10 score 로 reward-guided generation 가능.

## ORM vs PRM 비교

| 차원 | ORM (Outcome) | PRM (Process) |
|---|---|---|
| 평가 시점 | 최종 결과 1회 | 매 step 마다 |
| 출력 | binary pass/fail 또는 단일 score | step 별 score (0-10) sequence |
| reward 신호 | sparse (last step 만) | dense (모든 step) |
| training cost | 낮음 (final label 만) | 높음 (step-wise label) |
| 추론 cost | 1× | N step × |
| best-of-N | 결과만 비교 | step search (조기 가지치기) |
| modfolio 매핑 | `evaluator.md` (v2.35) | `process-reward-evaluator.md` (v3.0) |

ThinkPRM (2025) 의 주요 발견: **1% label 로도 LLM-as-Judge 능가**. step-wise verification chain-of-thought + sparse supervision.

## modfolio universe 적용

### 단일 task 평가 (v2.35 evaluator)

```jsonc
{
  "task_id": "generate-component-card",
  "verdict": { "pass": true, "score": 0.88, "findings": [...] }
}
```

### Step-wise 평가 (v3.0 process-reward-evaluator)

```jsonc
{
  "task_id": "generate-component-card",
  "step_scores": [
    { "step": 1, "action": "read existing Card token spec", "score": 9, "rationale": "정확한 token 매핑 식별" },
    { "step": 2, "action": "write Card.tsx imports", "score": 8, "rationale": "Drizzle pattern 정합" },
    { "step": 3, "action": "implement variant prop", "score": 6, "rationale": "default variant 미명시 — type ambiguity" },
    { "step": 4, "action": "add Storybook stories", "score": 9, "rationale": "3 variant 다 cover" },
    { "step": 5, "action": "run typecheck", "score": 10, "rationale": "0 error" }
  ],
  "aggregate_score": 8.4,
  "verdict": { "pass": true, "next_action": "merge" }
}
```

각 step score 가:
- 5점 미만 → critical (즉시 fix)
- 5-7 → improvement 권고
- 8-10 → pass

aggregate = weighted average. step score variance 가 크면 process 불안정 신호.

## Use case 1 — Best-of-N Sampling

generator 가 N 후보 생성 → PRM 이 각 후보의 step sequence 평가 → best-scored 선택:

```
Generator (3 변형 병렬)
  ├─ Candidate A — step scores [9,8,7,8] avg 8.0
  ├─ Candidate B — step scores [9,9,3,8] avg 7.25 (step 3 critical)
  └─ Candidate C — step scores [8,9,8,9] avg 8.5 ← best
PRM picks C
```

modfolio 적용: component / api / schema 생성 시 3 변형 fork → PRM 선택. v3.0 후 multi-review v2 의 옵션.

## Use case 2 — Verifier-Guided Tree Search

ToT (Tree of Thoughts) / GoT (Graph of Thoughts) 의 가지치기 reward:

- 매 node 의 step score 측정
- 6점 미만 가지 즉시 prune
- 8점 이상 가지 확장
- 비용 절감 + quality 유지

modfolio 적용 시점: harness-evolve Phase 4 (synthesize) 의 candidate 선정 — 현재 score 가산식 → PRM 으로 확장 가능 (v3.0 후속 plan).

## Use case 3 — Process Debugging

step sequence 중 score 급락 = **process 결함 위치 식별**:

```
Steps:  [9, 9, 3, 2, 4, ...]
                 ↑
            여기서 결함 시작
```

debug action: step 3 input 검토 → root cause 수정 → re-run.

정공법 1원칙 (근본 수정) 정합: surface 만 fix 아니라 step-wise locate.

## step-wise score rubric (modfolio universe)

각 step 의 0-10 score 산정 기준:

| 차원 | weight | 평가 항목 |
|---|---|---|
| **correctness** | 0.30 | step 의 산출물이 typecheck / test / lint 통과 |
| **canon 정합** | 0.25 | 적용 가능 canon (design-tokens / context-engineering / lethal-trifecta) 위반 0 |
| **measurability** | 0.20 | step 의 outcome 이 명시 측정 가능 (감각 X) |
| **reuse** | 0.15 | 기존 utility / pattern 재사용 (반대 = duplication) |
| **simplicity** | 0.10 | 단일 책임 / 명확한 abstraction (반대 = 우회 / hack) |

aggregate = weighted sum, scaled to 0-10.

## 정공법 5원칙 정합

| 원칙 | PRM 정합 |
|---|---|
| 1. 근본 원인 수정 | step-wise score 급락 = 결함 위치 식별 (surface 만 fix 회피) |
| 2. 에러·경고 0 | 매 step 의 type/lint/test 검증 — sparse 가 아니라 dense |
| 3. 장기 시야 + 확장성 | reward-guided generation 으로 best 후보 선정 (시간 투자 ROI) |
| 4. 신기술 포텐셜 | ThinkPRM 2025 / Test-Time Compute Scaling 의 production-ready frame |
| 5. 리소스 투자 | N step × evaluator call 비용 인정 (binary pass/fail 보다 무거움. 가치 = early-fail) |

## 비용 / Cost 추정

- v2.35 evaluator (binary) — 1 PR 당 1 호출 ~$0.05 (Opus 4.7 xhigh)
- v3.0 process-reward-evaluator (step-wise) — 10 step × 0.005 = $0.05 (Opus 4.7 high)
- ratio = ~1:1 — step-wise 가 더 무거우면 안 됨. 가벼운 model (Sonnet 4.6 또는 Haiku 4.5) 도 검토 가능

`.evolve-state/cost-ledger.jsonl` 에 evaluator 별 cost attribute 분리 측정 (R1 mitigation).

## 출처

### Primary

- [Process Reward Models (PRM) — arXiv 2504.16828](https://arxiv.org/abs/2504.16828) — ThinkPRM 2025, 1% label 로 LLM-as-Judge 능가
- [Test-Time Compute Scaling — arXiv 2512.02008](https://arxiv.org/abs/2512.02008)
- [Anthropic — Demystifying Evals for AI Agents (2026-04)](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — grader 계층화 (code-based / model-based / human)

### 관련 modfolio canon

- `multi-agent-research-pattern.md` v1.0+ — Evaluator (Tier 3) 가 본 canon 의 step-wise 확장
- `agentic-engineering.md` §2.1 — skill 매핑 (process-reward-evaluator agent 추가)
- `attention-budget.md` — step-wise eval 의 token cost 측정
- `cost-attribution.md` — evaluator 별 분리 측정
- `agent-runtime-layers.md` v1.0+ — L1 subagent (현재 PRM 도입 path)

## 갱신 이력

- **2026-05-13 v1.0.0** — 초판. plan crystalline-sparking-sky P2.2 cement. v2.35 evaluator (binary) 의 step-wise 확장 frame. ThinkPRM 2025 학술 정합. best-of-N + tree search gating + process debugging 3 use case.
