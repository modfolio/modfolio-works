---
title: Opus 4.7 & Effort Policy
version: 1.2.0
last_updated: 2026-05-13
source: [knowledge/canon/opus-4-7-effort-policy.md, Anthropic effort docs 2026-05 (xhigh sweet spot policy), 2026-05-13 v2.0 dogfood Adopt P0 #7 (max → xhigh recalibration), harness v2.34 P0.3 (thinking_budget 정책 신설 — Adaptive thinking Opus 4.7 4/16 + Extended thinking Sonnet 4.6 2/17)]
sync_to_siblings: true
applicability: always
consumers: [preflight, plan, generate-review, modfolio, harness-evolve, claude-api, context-engineering]
---

# Opus 4.7 & Effort Policy — 권고

> 이 문서는 **권고**이며 강제가 아니다. 각 앱은 자체 `.claude/settings.json`에서 override 가능.

## 모델 티어

| 티어 | 모델 ID | Context | 용도 |
|------|---------|---------|------|
| Premium (1M) | `claude-opus-4-7[1m]` | 1,000,000 tokens | Figma metadata / 대형 diff / 대용량 컨텍스트 agent |
| Standard | `claude-opus-4-7` | 200,000 tokens | 대부분의 reasoning / 코딩 / 리뷰 |
| Fast | `claude-haiku-4-5-20251001` | 200,000 tokens | 검색·요약·결정적 검증 (비용 효율) |

**가격** (2026-04-17): Opus 4.7 $5/$25 per MTok (input/output). Opus 4.6과 동일. 1M variant 프리미엄 없음. 단, 새 토크나이저가 최대 +35% 토큰 소비 가능 → 실효 비용은 소폭 증가 가능.

## Effort 5단계

| 레벨 | 특징 | 비용/속도 | 권장 대상 |
|------|------|----------|-----------|
| low | 빠른 응답, 얕은 reasoning | 최저 | 단순 검색/요약 |
| medium | 균형 | 저 | 보통 검증 |
| high | 일반 기본값 | 중 | 표준 리뷰·테스트·QA |
| xhigh | 깊은 reasoning (4.7 신규) | 중-고 | 코드 리뷰·아키텍처 판정 |
| max | 제약 없는 최대 reasoning | 가변 (비용 ↑) | design·코딩·복잡 태스크 |

**중요**: `max`는 세션 전용. 영구 persist하려면 `CLAUDE_CODE_EFFORT_LEVEL=max` 환경변수 필요.

### Known issues (2026-04-17 시점)

- #30726: settings `effortLevel: "max"`가 UI 인터랙션 시 silently downgrade
- #40093: banner는 max 표시되지만 runtime은 medium으로 실행
- 완화책: agent frontmatter `effort:` 필드 + 환경변수 **이중 설정** + Claude Code v2.1.111+ 확인

## 환경변수 권장 설정

### Windows (PowerShell/CMD)

```powershell
setx CLAUDE_CODE_EFFORT_LEVEL max
# 세션 재시작 필요
```

### macOS / Linux

```bash
# ~/.bashrc 또는 ~/.zshrc
export CLAUDE_CODE_EFFORT_LEVEL=max
```

### 프로젝트 단위 (`.claude/settings.json`)

```jsonc
{
  "env": {
    "CLAUDE_CODE_EFFORT_LEVEL": "max",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "32768"
  }
}
```

**우선순위**: OS env > settings.json env > settings.local.json env > agent frontmatter. 가장 가까운 값이 이긴다.

## 런타임 토글

```
/effort max     # 현재 세션만 최대 effort
/effort xhigh   # 깊은 reasoning (비용 중간)
/effort high    # 기본 reasoning
```

## Modfolio Universe Agent 분류 (2026-05-13 recalibration)

### v1.1 정책 변경 (Anthropic 공식 권고 흡수)

Anthropic effort docs (2026-05): "Opus 4.7 의 `max` 는 자주 overthinking + 비용 대비 quality 작음. `xhigh` 가 long-horizon coding 의 sweet spot. `max` 는 eval 후 명백히 도움될 때만 상향."

**default = xhigh** (구조화된 코딩 + 리뷰). `max` 는 **명시 정당화** 가능한 영역만:
- 디자인 의사결정 + 대용량 Figma metadata (1M context 필수)
- 보안 코드 (오답 비용 = secret leak)
- P0 장애 triage (오답 비용 = production downtime)

기타 코딩 (component / API endpoint / Drizzle schema / contract / mechanical fix) 은 모두 xhigh — 구조화된 작업이라 max 의 overthinking 위험.

### 표 (2026-05-13 적용 후)

`max` 카테고리: **디자인 1M + 보안 + 장애** 3개만.

| # | Agent | 모델 | effort | 근거 |
|---|-------|------|--------|------|
| 1 | design-engineer | claude-opus-4-7[1m] | **max** | 디자인 의사결정 + Figma metadata 대용량 |
| 2 | security-hardener | claude-opus-4-7 | **max** | 보안 코드 (OWASP 취약점 — 오답 비용 = secret leak) |
| 3 | incident-handler | claude-opus-4-7 | **max** | P0 장애 triage + 포스트모템 |
| 4 | page-builder | claude-opus-4-7[1m] | xhigh | 레이아웃 (정형) — 2026-05-13 max → xhigh |
| 5 | component-builder | claude-opus-4-7 | xhigh | UI 컴포넌트 (정형) — 2026-05-13 max → xhigh |
| 6 | api-builder | claude-opus-4-7 | xhigh | 엔드포인트 + Zod (정형) — 2026-05-13 max → xhigh |
| 7 | schema-builder | claude-opus-4-7 | xhigh | Drizzle (정형) — 2026-05-13 max → xhigh |
| 8 | contract-builder | claude-opus-4-7 | xhigh | Zod contracts (정형) — 2026-05-13 max → xhigh |
| 9 | quality-fixer | claude-opus-4-7 | xhigh | 기계 수정 (정공법, 정형) — 2026-05-13 max → xhigh |
| 10 | code-reviewer | claude-opus-4-7[1m] | xhigh | 리뷰: 대규모 diff 1M |
| 11 | design-critic | claude-opus-4-7 | xhigh | 리뷰: Anti-Slop |
| 12 | architecture-sentinel | claude-opus-4-7 | xhigh | 리뷰: 불변 원칙 |
| 13 | accessibility-auditor | claude-opus-4-7 | xhigh | 리뷰: WCAG AA |
| 14 | migrations-auditor | claude-opus-4-7[1m] | xhigh | 리뷰: Drizzle 마이그 안전성 |
| 15 | test-builder | claude-opus-4-7 | high | 테스트 생성 |
| 16 | visual-qa | claude-opus-4-7 | high | Playwright + axe 5-gate |
| 17 | ecosystem-auditor | claude-opus-4-7 | high | ecosystem.json 검증 |
| 18 | perf-profiler | claude-opus-4-7 | high | CF Workers cost/latency |
| 19 | knowledge-searcher | claude-haiku-4-5-20251001 | medium | 검색/요약 |
| 20 | innovation-scout | claude-haiku-4-5-20251001 | medium | context7 조회·비교 |
| 21 | initializer (2026-05-13 신규) | claude-haiku-4-5-20251001 | medium | 세션 cold-start 3-line summary, read-only (canon long-running-harness.md) |
| 22 | lead-planner (v2.35 P1.5 신규) | claude-opus-4-7 | xhigh | Multi-Agent Research Tier 1 — orchestration. trusted-input-only (lethal-trifecta 회피) |
| 23 | evaluator (v2.35 P1.5 신규) | claude-opus-4-7 | xhigh | Multi-Agent Research Tier 3 — 통합 verdict (binary pass/fail + weighted score). file modify 금지 |
| 24 | process-reward-evaluator (v3.0 P2.2 신규) | claude-opus-4-7 | high | PRM step-wise verifier — Generator step sequence 의 매 step 0-10 score. canon `process-reward-model.md` v1.0+ |

**분포 합계 (24 agent, 2026-05-13 v3.0)**: max=3, xhigh=13, high=5, medium=3

> diagnostic 의 `effort-policy/agent-distribution-drift` 트랙은 위 값을 expected 로 사용. 새 agent 추가 시 이 표 + `scripts/modfolio/diagnostic.ts` 의 `expected` 객체 (`{ max: 3, xhigh: 13, high: 5, medium: 3 }`) 를 함께 갱신해야 drift 알림이 정확하다.
>
> **v3.0 P2.4 의무화**: 23 agent (Haiku 3 제외) frontmatter 의 `thinking_budget` 필드 명시 필수. 자동 갱신: `bun run scripts/modfolio/sync-thinking-budget.ts`. drift 검출: diagnostic.ts `effort-policy/thinking-budget-drift` 트랙 (expected absent=3).

### A/B 검증 정책 (recalibration 결과 모니터링)

각 max → xhigh 전환 후 30일간:
- turn 수 (동일 task)
- output token 누적
- redirect 빈도 (사용자가 "다시 해" 요청)
- pattern-history 의 quality 위반 빈도

이상 신호 발견 시 해당 agent 만 max 복귀 — agent frontmatter 의 `_effort_change_note:` 주석에 결정 근거 cement.

### `_effort_change_note` 주석 컨벤션

frontmatter 안:
```yaml
effort: xhigh   # 2026-05-13 max → xhigh recalibration (Anthropic sweet spot policy, v2.0 dogfood Adopt P0 #7)
```

또는 별도 필드:
```yaml
_effort_change_note: "2026-05-13 max→xhigh per Anthropic policy. Revert if quality regression."
```

## Thinking Budget 정책 (v1.2, 2026-05-13 신설)

Anthropic 2026 Q2 신기능:
- **Opus 4.7 Adaptive thinking** (2026-04-16 출시) — 자동 thinking budget 조절, extended thinking 미지원
- **Sonnet 4.6 Extended thinking** (2026-02-17 출시) — 명시 thinking_budget 지정, visible thinking
- **Haiku 4.5** — Adaptive thinking 미지원 (필드 무시)

effort 와 **직교 dimension**: effort = 조절 강도 / thinking_budget = reasoning 깊이. 둘 다 명시 가능.

### Thinking budget 4-level 표

| Level | Token budget | 권장 대상 | effort 매핑 |
|---|---|---|---|
| **adaptive** (Opus 4.7 only) | 자동 (~8k-32k 범위) | 일반 — 모델이 task 복잡도 판단 | max / xhigh / high |
| **deep** | 32,768 | 복잡 reasoning (보안 코드, P0 장애 triage, 디자인 의사결정) | max |
| **standard** | 8,192 | 구조화된 코딩 (component / API / schema / contract / 리뷰) | xhigh (기본) |
| **light** | 4,096 | 검증 / 테스트 / 단순 리뷰 | high |
| **minimal** | 2,048 | 검색 / 요약 / 결정적 검증 | medium |

### agent frontmatter (v2.34 옵션 → v3.0 의무화)

v2.34 에서는 **옵션** (미설정 시 effort 기반 inference):

```yaml
---
name: design-engineer
model: claude-opus-4-7[1m]
effort: max
thinking_budget: deep      # v2.34 옵션 (max 와 매핑 자동 inference 가능)
# 또는
thinking_budget: adaptive  # Opus 4.7 Adaptive 자동 조절
---
```

v3.0 부터 **의무** — 모든 agent frontmatter 에 `thinking_budget` 명시. v3.0 마이그레이션 시 자동 일괄 추가 (effort → thinking_budget 매핑 표 기준).

### Sonnet 4.6 Extended thinking

Sonnet 4.6 은 **명시** thinking budget 지정. Anthropic SDK 직접 호출 sibling 의 경우:

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  thinking: { type: "enabled", budget_tokens: 8192 },  // standard 매핑
  messages: [...],
});
```

Claude Code 내부는 agent frontmatter `thinking_budget` 으로 추상화 — SDK 호출 코드 직접 작성 없음.

### Haiku 4.5 미지원

Haiku 4.5 는 Adaptive / Extended thinking 둘 다 미지원. frontmatter `thinking_budget` 필드는 **무시** (warning 없음). knowledge-searcher / innovation-scout / initializer 3 agent 는 `thinking_budget` 명시 불필요.

### 비용 영향

thinking token 은 **output token 으로 청구**. budget 32,768 = output $25/MTok × 32k ≈ $0.8 per request (Opus 4.7).

- adaptive (자동) — 평균 ~$0.2 per request (보통 task)
- deep (32k 고정) — $0.8 per request (high-stake task)
- standard (8k) — $0.2 per request
- light (4k) — $0.1 per request
- minimal (2k) — $0.05 per request

권고: **adaptive 가 기본**. deep 은 명시 정당화 가능 영역만 (보안 / 장애 / 디자인 의사결정).

### 측정 — `effort-policy/thinking-budget-drift` 트랙 (diagnostic.ts)

`scripts/modfolio/diagnostic.ts` 의 `effort-policy` 트랙 내부 신설 finding (v2.34):

- 21 agent 의 `thinking_budget` 분포 측정
- expected (v2.34 baseline): `{ adaptive: 0, deep: 0, standard: 0, light: 0, minimal: 0, absent: 21 }` (모든 agent 미설정 — v2.34 옵션 단계)
- v3.0 expected (의무화 후): `{ deep: 3, standard: 11, light: 4, minimal: 3, adaptive: 0, absent: 0 }` (effort 분포와 1:1 매핑)
- drift 감지 시 info finding — `knowledge/canon/opus-4-7-effort-policy.md` v1.2 표 참조 권고

### Anti-patterns

- `effort: xhigh` + `thinking_budget: deep` — overthinking. xhigh = standard (8k) 가 sweet spot
- `effort: medium` + `thinking_budget: deep` — Haiku 4.5 인데 thinking_budget 명시 = 의미 없음, frontmatter noise
- adaptive 와 명시 budget 동시 — 충돌. adaptive 선택 시 다른 필드 없음
- 모든 agent 를 deep 으로 설정 — 비용 폭증, R1 위험

## Prompt caching 연계 (1M variant + tokenizer 영향)

Opus 4.7 로 전환 시 prompt caching 의 비중이 커진다. 두 가지 근거:

1. **신 tokenizer (+35% token)**: 동일 텍스트가 4.6 대비 최대 1.35배 토큰을 소비한다 ([tokenizer 측정](https://www.claudecodecamp.com/p/i-measured-claude-4-7-s-new-tokenizer-here-s-what-it-costs-you)). 따라서 cold-start cache write 자체가 더 비싸다. cache hit 비율을 유지해야 절대 비용이 과하게 늘지 않는다.
2. **1M context variant**: `claude-opus-4-7[1m]` 은 대형 codebase/diff 를 한 번에 담을 수 있지만, 그 큰 prefix 를 매 호출마다 재처리하면 비용이 선형 증가한다. `cache_control` breakpoint 를 frozen 부분 끝에 명시해야 효율이 나온다.

실무:
- 모델 전환 (4.6 → 4.7) 시 **cache 는 model-scoped** 이므로 전부 rebuild. 첫 호출은 write premium 을 예상할 것
- 1M variant agent (`design-engineer` / `page-builder` / `code-reviewer`) 는 Figma metadata / 큰 diff 를 system 에 싣는 경우가 많다 — 이들 agent 는 caching breakpoint 명시 효과가 가장 크다
- Claude Code 는 harness 레벨에서 자동 caching 하지만 (`.claude/settings.json` 의 `ENABLE_PROMPT_CACHING_1H=1` 확인), **member repo 가 Anthropic SDK 를 직접 호출할 때는** 수동 설정 필수

자세한 배치 원칙/비용 모델/측정 지표는 [prompt-caching.md](prompt-caching.md) canon 참조. harness 레벨 1h vs 5m TTL 운영 정책은 [prompt-caching-strategy.md](prompt-caching-strategy.md).

## 비용 guard

- `max` 남용 시 token 소비 급증. `/effort high`로 런타임 하향 가능
- `preflight` skill이 Claude Code 버전 + `CLAUDE_CODE_EFFORT_LEVEL` 환경변수 존재 여부 확인
- 월별 `knowledge/journal/` 비용 관찰 권고
- **Caching hit rate 관찰**: `response.usage.cache_read_input_tokens / total ≥ 70%` 목표. 50% 미만이면 silent invalidator 조사 (자세한 기준 → [prompt-caching.md](prompt-caching.md))

## 참조

- [Claude Opus 4.7 공식](https://www.anthropic.com/claude/opus)
- [Claude Code Model Config](https://code.claude.com/docs/en/model-config)
- [Extended Thinking (Adaptive)](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
