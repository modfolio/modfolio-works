---
title: CodeAct + Self-Refine — Executable Code Action + Critique Loop
version: 1.0.0
last_updated: 2026-05-13
source: [CodeAct (arXiv 2402.01030, ICML 2024, https://github.com/xingyaoww/code-act), Self-Refine (arXiv 2303.17651, https://github.com/madaan/self-refine), Anthropic Code Execution Tool GA 2026-Q2, harness v3.0 P2.1 (plan crystalline-sparking-sky)]
sync_to_siblings: true
applicability: always
consumers: [multi-review, generate-review, harness-evolve, ralph-loop, claude-api]
---

# CodeAct + Self-Refine — Executable Code Action + Critique Loop

> **CodeAct 핵심** (ICML 2024): LLM 이 JSON/text 도구 호출 대신 **Python 코드를 action 으로 생성** → 인터프리터 즉시 실행 → 출력 피드백. **20% 성공률 향상, 30% 토큰 감소**.
>
> **Self-Refine 핵심** (Madaan et al. 2023): 한 LLM 이 3역할 — Generator → Feedback → Refine. 과거 출력 히스토리를 prompt 에 append → 반복 실수 방지. **~20% 개선**, training 불필요.

modfolio universe 의 Multi-Agent Research 3-tier (Tier 2 Generator) 의 **execution mode 확장**. multi-review v2 의 경로.

## CodeAct — Executable Action as Code

### 패턴 비교

| 패턴 | Action 형식 | Feedback 형식 | 비용 |
|---|---|---|---|
| JSON Tool Use | structured tool_use schema | tool_result content | high (verbose) |
| Text DSL | custom command syntax | parse + execute | medium |
| **CodeAct** | **Python code (executable)** | stdout / stderr / value | low (30% 절감) |

### CodeAct 장점

1. **Control flow 자유도** — 조건문 / 루프 / try-catch 가 LLM 의 1차 action 표현
2. **Data composition** — variable / dict / function 으로 중간 결과 합성
3. **Immediate feedback** — 인터프리터 실행 결과가 LLM 의 다음 turn input
4. **Ecosystem 활용** — Python 의 5000+ library (numpy / pandas / requests / 등)

### Anthropic Code Execution Tool 연계

Anthropic Code Execution Tool (2026 GA) — Claude SDK 의 built-in Python interpreter. CodeAct 패턴의 production-ready implementation:

```typescript
const response = await client.messages.create({
  model: "claude-opus-4-7",
  tools: [{ type: "code_execution_20251001", name: "code_execution" }],
  messages: [...],
});
```

Web search / Web fetch 와 함께 사용 시 **무료** (단독 사용은 표준 요금). 사용 가이드: `claude-api` skill v2.x.

### modfolio universe 적용

| 영역 | CodeAct mode 가치 |
|---|---|
| `/multi-review` v2 Generator 단 | 코드 변경 후 typecheck / test / lint 자동 실행 → 결과 chain |
| `/harness-evolve` Phase 4 synthesize | 가산식 score 계산 / URL HEAD 검증 / cost-ledger 갱신 — 모두 Python |
| `/security-scan` | OWASP ASI01-10 패턴 detection 의 정밀 regex / AST 분석 |
| `/migration` | drizzle-kit migration safety check / row count diff |
| member repo (SDK 직접 호출) | gistcore TTS rubric / fortiscribe grading 의 평가 계산 |

## Self-Refine — Critique-Refine Loop

### 3 역할 (단일 LLM, 동일 weights)

1. **Generator** — initial output 생성
2. **Feedback** — 동일 LLM 이 자기 output 의 결함 식별 (구조 / 정확성 / completeness)
3. **Refine** — feedback 기반 output 개선

### Loop 종료 조건

- max iteration (보통 3-5)
- feedback 이 "no improvement needed" 명시
- 외부 evaluator 의 pass 판정

### modfolio universe 적용

| 영역 | Self-Refine mode 가치 |
|---|---|
| `/multi-review` v2 (PRM 후속 refine) | PRM 의 critical step score 발견 시 동일 generator 가 self-refine |
| `/ralph-loop` iteration | 매 iteration 의 implicit 정공법 — 본 canon 이 학술 frame |
| `/fix` skill (P0/P1 자동 수정) | 1차 fix → self-feedback → refine. multi-review 결과 변경 시 재 invoke |
| `/page` / `/component` 생성 | initial scaffold → self-review (token / a11y / responsive) → refine |

## CodeAct + Self-Refine 통합 (multi-review v2)

3-tier Multi-Agent Research 와 결합:

```
Lead Planner (Tier 1)
  ↓ delegate
Generator (Tier 2) — CodeAct mode
  ├─ Python action: generate component code
  ├─ Python action: run typecheck → output: 0 errors
  ├─ Python action: run test → output: 5 pass
  └─ artifact return
  ↓
Self-Refine (Generator 자기 critique)
  ├─ feedback: "lacks hover state semantic"
  └─ refine: add semantic hover token
  ↓
Process Reward Evaluator (Tier 3, PRM v3.0 P2.2)
  ├─ step_scores: [9, 10, 9, 8, 9] avg 9.0
  └─ verdict: merge
```

Self-Refine 가 Tier 2 안의 mini-loop (1-3 iteration), PRM 이 Tier 3 의 step-wise final.

## multi-review v2 (v3.0 후속 SKILL.md 갱신)

`.claude/skills/multi-review/SKILL.md` (v2.35) 의 4-agent 분산 평가에 다음 옵션 추가:

```yaml
# (v3.0+ 후속 plan)
generator_mode: codeact | text   # default: text
self_refine: true | false        # default: false (opt-in)
self_refine_max_iter: 3
verifier: evaluator | prm         # default: evaluator (v2.35 binary)
```

opt-in default — 기존 동작 보존, 점진 채택.

## 정공법 5원칙 정합

| 원칙 | CodeAct + Self-Refine 정합 |
|---|---|
| 1. 근본 원인 수정 | Self-Refine 의 feedback 단계가 surface 만 fix 회피 |
| 2. 에러·경고 0 | CodeAct 의 immediate feedback 으로 typecheck / test 0 fail 까지 자동 iterate |
| 3. 장기 시야 + 확장성 | Python ecosystem 활용 (5000+ lib) — 새 lib 도입 0 cost |
| 4. 신기술 포텐셜 | Anthropic Code Execution Tool 2026 GA — production-ready |
| 5. 리소스 투자 | 30% 토큰 절감 + 20% 성공률 향상 (학술 측정) — ROI 분명 |

## 비용 / Cost 추정

- 일반 JSON tool use: 1 turn = $0.05 (Opus 4.7 xhigh)
- CodeAct mode: 1 turn = $0.035 (30% 절감)
- Self-Refine 3-iter: $0.035 × 3 = $0.105 (절감 후에도 3배 — measurable improvement 시점 결정)
- `.evolve-state/cost-ledger.jsonl` 에 mode 별 attribute 분리

threshold:
- Self-Refine no-improvement 율 > 50% → max_iter 축소 (불필요한 cost)
- CodeAct error rate > 30% → Python sandbox safety review

## 위험 / Anti-patterns

| 위험 | 완화 |
|---|---|
| CodeAct 의 unsafe code 실행 (file delete / network call) | Anthropic Code Execution Tool 의 sandbox 사용 — 외부 network / file 제한 |
| Self-Refine infinite loop | max_iter 강제 + no-improvement 조기 종료 |
| feedback 단계가 superficial ("looks good") | rubric 명시 (canon `process-reward-model.md` § "step-wise score rubric") |
| 비용 폭증 (3-iter × N) | cost-ledger threshold + opt-in default |

## 출처

### Primary

- [CodeAct — Executable Code as Action (ICML 2024)](https://arxiv.org/abs/2402.01030)
- [CodeAct GitHub](https://github.com/xingyaoww/code-act)
- [Self-Refine (Madaan et al. 2023)](https://arxiv.org/abs/2303.17651)
- [Self-Refine GitHub](https://github.com/madaan/self-refine)
- [Anthropic Code Execution Tool — Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool)

### 관련 modfolio canon

- `process-reward-model.md` v1.0+ — PRM 의 step-wise verifier (CodeAct + Self-Refine 의 Evaluator)
- `multi-agent-research-pattern.md` v1.0+ — 3-tier frame (Self-Refine 가 Tier 2 안의 mini-loop)
- `agentic-engineering.md` §2.1 — skill 매핑
- `attention-budget.md` — CodeAct 의 token 절감 측정
- `cost-attribution.md` — mode 별 cost 분리
- `claude-api` skill — Anthropic SDK 사용 가이드 (Code Execution Tool 통합)

## 갱신 이력

- **2026-05-13 v1.0.0** — 초판. plan crystalline-sparking-sky P2.1 cement. CodeAct (ICML 2024) + Self-Refine (Madaan 2023) 통합 frame. Anthropic Code Execution Tool 2026 GA 연계. multi-review v2 의 opt-in path.
