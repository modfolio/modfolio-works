---
title: Opus Effort Policy (baseline Opus 5)
version: 2.0.0
last_updated: 2026-07-26
source: [knowledge/canon/opus-4-7-effort-policy.md, platform.claude.com whats-new-opus-5 (1M default·thinking 기본 ON·effort 변환률·512 토큰 캐시 하한), code.claude.com model-config (effort 우선순위·모델 기본값 high·settings 는 max 거부·ultracode·[1m] 스트립), Frontier-Bench v0.1 (Opus 5 43.3 / Fable 5 33.7 / Opus 4.8 21.1), 2026-07-26 v2.0.0 (Opus 5 전환 + effort 상향 프로파일 — 오너 결정: 재작업 비용 > 토큰 비용; .mise.toml env-max 실사건 정정)]
sync_to_siblings: true
applicability: always
consumers: [preflight, plan, generate-review, modfolio, harness-evolve, claude-api, context-engineering]
---

# Opus Effort Policy — 권고 (baseline Opus 5)

> 이 문서는 **권고**이며 강제가 아니다. 각 앱은 자체 `.claude/settings.json`에서 override 가능.

> **파일명 동결**: `opus-4-7-effort-policy.md` 는 **안정적 cross-ref 식별자**다 — 30+ append-only 이력 레코드 + 10여 active canon 링크가 이 이름을 참조하므로 rename 시 orphan 이 생긴다. 내용은 항상 현행 baseline 을 반영한다(현재 **Opus 5**). 모델 출시 신기능 권고는 `claude-code-2026h1-features.md`.

## 모델 티어 (2026-07-26 — Opus 5)

| 티어 | 모델 ID | Context | 용도 |
|------|---------|---------|------|
| Baseline | `claude-opus-5` | **1,000,000** tokens | 코딩·리뷰·아키텍처 — **전 agent 기본** |
| Frontier (opt-in) | `claude-fable-5` | 1,000,000 tokens | 추론형 최상단 전용 (`model-escalation.md` rung-3) |
| Fast | `claude-haiku-4-5-20251001` | 200,000 tokens | 검색·요약·결정적 검증 (비용 효율) |
| Fallback | `claude-sonnet-5` | 1,000,000 tokens | 429/529·과부하 시 자동 폴백 |

> ⚠ **`[1m]` 접미사는 Opus 5 에서 폐기.** Opus 5 는 *"1M tokens is both the default and the maximum; there is no smaller context variant"* (platform docs) — 접미사는 이득이 0 이고, Claude Code 는 subagent spawn 시 이를 strip 하거나(#45169) "1M context requires extra usage" 로 실패시킨다(#51060). agent frontmatter 에 붙이지 않는다. (Sonnet 5 도 동일하게 1M 단일 — 접미사 불필요.)

**가격** (2026-07-26): Opus 5 **$5/$25** per MTok — Opus 4.8 과 **동일**(무료 업그레이드). 1M·long-context 프리미엄 없음. Fable 5 $10/$50(=2×), Sonnet 5 $3/$15(도입가 $2/$10 ~2026-08-31), Haiku 4.5 $1/$5. fast mode(`speed: fast`, Claude API 전용)는 Opus 5 에서 $10/$50. **권위 단가 SoT = `ecosystem.json` `pricing.genai`** — 본문 가격은 사람용 미러.

**Opus 5 rate limit 은 Opus 4.x 와 별도 버킷**이다 — 4.x 풀의 여유를 물려받지 않는다.

## Effort 5단계

| 레벨 | 특징 | 비용/속도 | 권장 대상 |
|------|------|----------|-----------|
| low | 빠른 응답, 얕은 reasoning | 최저 | 단순 검색/요약 |
| medium | 균형 | 저 | 보통 검증·read-only fan-out |
| high | **Claude Code 모델 기본값** | 중 | 관측·리포트 |
| xhigh | 깊은 reasoning | 중-고 | **코딩·리뷰 baseline** |
| max | 제약 없는 최대 reasoning | 가변 (토큰↑, 단가는 동일) | expensive-if-wrong — 보안·장애·아키텍처·비가역 |

**Opus 5 는 effort 를 실제 품질로 바꾸는 변환률이 역대 Opus 중 가장 높다**(Anthropic 명시). 그래서 `max` 가 처음으로 값을 한다 — 그리고 **단가가 오르지 않는다**(같은 모델, 토큰만 증가). 상향의 비용이 Fable 전환보다 훨씬 싸다.

> **⚠ Anthropic 권고와 의도적으로 분기 (2026-07-26 오너 결정).** Anthropic 은 "`high` 에서 시작해 evals 로 내려라"를 권한다(`low`/`medium` 이 이 모델에서 유난히 강하다는 근거). 우리는 **반대로 올린다** — 근거: 코딩 실수가 유출되면 오너가 반복 수정하는 비용이 토큰 비용을 압도한다. 재작업 비용 > 토큰 비용. 이 분기는 의식적이며, 2주 후 `bun run model-usage` + `memory/pattern-history.jsonl` 위반 건수로 재평가한다.

### settings 가 `max` 를 거부한다 (Known issues 재해석)

- **#30726 / #40093 은 "버그"가 아닐 가능성이 높다.** Claude Code 문서: settings 파일의 `effortLevel` 은 **`low|medium|high|xhigh` 만** 받는다. `max` 와 `ultracode` 는 **세션 전용**이다. `~/.claude/settings.json` 에 `"effortLevel": "max"` 를 적으면 무효값이라 무시되고, 그게 "max 로 설정했는데 medium 으로 돈다"로 관측된다.
- 올바른 처방: settings 는 **`xhigh`**, `max` 는 `/effort max` 또는 `--effort max` 세션 토글, env 는 **미설정**.
- Opus 5 는 **model-default hold 가 없다** — Fable 5·Opus 4.8·4.7 은 첫 실행 시 모델 기본값을 강제로 잡고 명시 선택 전까지 유지하지만, Opus 5 는 이전에 설정한 레벨이 그대로 이어진다. 즉 settings 의 `xhigh` 가 깔끔하게 적용된다.

## 환경변수 정책 (전역 max 금지)

**`CLAUDE_CODE_EFFORT_LEVEL` 을 설정하지 않는다.**

**우선순위 (Claude Code 공식 문서)**: `CLAUDE_CODE_EFFORT_LEVEL` env > subagent/skill frontmatter > 세션 설정값 > 모델 기본값. env 계층 안에서는 OS env > settings.json `env` > settings.local.json `env`. **핵심: env 계층 전체가 frontmatter 보다 위** — 그래서 전역 env 값은 각 subagent 의 보정된 frontmatter effort 를 **전부 덮어써** 전 subagent 를 그 값으로 강제한다.

> **실사건 (2026-07-12 ~ 07-26, 2주간)**: 2026-07-09 에 `.claude/settings.json` 의 env-max 를 제거했지만 **`.mise.toml:11` 을 놓쳤다**. mise 는 OS env 로 주입하므로 우선순위가 더 높다 — 24개 agent 의 `max=3·xhigh=13·high=5·medium=3` 보정이 **전부 `max` 로 덮여** 있었고, `templates/.mise.toml` 이 같은 값을 28개 sibling 에 배포했으며, `harness-pull` 은 pull 마다 멤버 `settings.json` 에 env-max 를 **능동 주입**했고, `diagnostic` 은 env-max 가 *없으면* 경고하며 추가를 autofix 로 제안했다. 부수 피해: `ultracode` 는 env 가 xhigh 아닌 값이면 비활성이라 계속 죽어 있었다. → v2.0.0 에서 4개 지점 전부 역전 + harness-pull 이 멤버의 잔재를 **제거**하도록 변경(자가치유).

**권고**:
- env 변수를 **미설정**으로 둔다 → 각 subagent 는 자기 frontmatter effort 로 돈다.
- 세션 기본값은 `.claude/settings.json` 의 **`effortLevel: "xhigh"`** 로 준다(env 아님).
- 더 깊은 reasoning 이 필요하면 `/effort max` 를 **세션 단위**로 토글.
- non-effort env(`CLAUDE_CODE_MAX_OUTPUT_TOKENS` 등)는 이 정책과 무관 — 필요 시 설정 가능.

## `ultracode` (신규 — env-max 제거로 비로소 사용 가능)

`/effort ultracode` 는 effort 레벨이 아니라 **Claude Code 설정**이다: `xhigh` 를 모델에 보내면서 **추가로 dynamic workflow 오케스트레이션**을 켠다. 세션 전용, v2.1.203+.

- 진입: `/effort ultracode`, `claude --effort ultracode`, 또는 `--settings {"ultracode": true}`
- **`CLAUDE_CODE_EFFORT_LEVEL` 이 `xhigh` 이외 값으로 설정돼 있으면 워크플로 오케스트레이션이 비활성**된다 — env-max 가 이걸 계속 죽이고 있었다
- settings 파일의 `effortLevel` 은 `ultracode` 를 받지 않는다(세션 전용)

## `ultrathink` (per-turn 심화)

프롬프트 아무 곳에나 `ultrathink` 를 포함하면 그 턴만 더 깊이 추론한다. 세션 effort 설정은 **바뀌지 않고**, API 로 보내는 effort 레벨도 그대로다 — Claude Code 가 in-context 지시를 덧붙이는 방식. `think`/`think hard`/`think more` 같은 다른 표현은 **키워드로 인식되지 않고** 평범한 프롬프트 텍스트로 처리된다.

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

`max` 카테고리 = **틀리면 비싸거나 비가역**인 7개. 모델은 haiku 3종을 뺀 21개 전부 `claude-opus-5` (접미사 없음).

| # | Agent | 모델 | effort | 근거 |
|---|-------|------|--------|------|
| 1 | design-engineer | claude-opus-5 | **max** | 디자인 의사결정 + Figma metadata 대용량 |
| 2 | security-hardener | claude-opus-5 | **max** | 보안 코드 (OWASP — 오답 비용 = secret leak) |
| 3 | incident-handler | claude-opus-5 | **max** | P0 장애 triage + 포스트모템 |
| 4 | code-reviewer | claude-opus-5 | **max** | ⬆ 2026-07-26 — 코딩 실수 유출이 오너가 지목한 통점. 리뷰에서 놓치면 재작업 비용이 가장 크다 |
| 5 | architecture-sentinel | claude-opus-5 | **max** | ⬆ 2026-07-26 — 불변 원칙 판정, 틀리면 되돌리기 비쌈 |
| 6 | lead-planner | claude-opus-5 | **max** | ⬆ 2026-07-26 — orchestration 오판이 하위 전체로 전파. trusted-input-only (lethal-trifecta 회피) |
| 7 | migrations-auditor | claude-opus-5 | **max** | ⬆ 2026-07-26 — 마이그레이션은 **비가역** |
| 8 | page-builder | claude-opus-5 | xhigh | 레이아웃 (정형) |
| 9 | component-builder | claude-opus-5 | xhigh | UI 컴포넌트 (정형) |
| 10 | api-builder | claude-opus-5 | xhigh | 엔드포인트 + Zod (정형) |
| 11 | schema-builder | claude-opus-5 | xhigh | Drizzle (정형) |
| 12 | contract-builder | claude-opus-5 | xhigh | Zod contracts (정형) |
| 13 | quality-fixer | claude-opus-5 | xhigh | 기계 수정 (정공법, 정형) |
| 14 | design-critic | claude-opus-5 | xhigh | 리뷰: Anti-Slop |
| 15 | accessibility-auditor | claude-opus-5 | xhigh | 리뷰: WCAG AA |
| 16 | evaluator | claude-opus-5 | xhigh | Multi-Agent Research Tier 3 — 통합 verdict. file modify 금지 |
| 17 | test-builder | claude-opus-5 | xhigh | ⬆ 2026-07-26 (high→) — 테스트가 곧 정확성 표면 |
| 18 | perf-profiler | claude-opus-5 | xhigh | ⬆ 2026-07-26 (high→) — CF Workers cost/latency 판단 |
| 19 | process-reward-evaluator | claude-opus-5 | xhigh | ⬆ 2026-07-26 (high→) — PRM step-wise verifier, 채점 품질이 학습 신호 |
| 20 | ecosystem-auditor | claude-opus-5 | high | ecosystem.json 검증 (관측·리포트) |
| 21 | visual-qa | claude-opus-5 | high | Playwright + axe 5-gate (도구 주도) |
| 22 | knowledge-searcher | claude-haiku-4-5-20251001 | medium | 검색/요약 read-only fan-out |
| 23 | innovation-scout | claude-haiku-4-5-20251001 | medium | context7 조회·비교 |
| 24 | initializer | claude-haiku-4-5-20251001 | medium | 세션 cold-start 3-line summary, read-only |

**분포 합계 (24 agent, 2026-07-26 v2.0.0)**: **max=7, xhigh=12, high=2, medium=3**

> diagnostic 의 `effort-policy/agent-distribution-drift` 트랙은 위 값을 expected 로 사용. 새 agent 추가 시 이 표 + `scripts/modfolio/diagnostic.ts` 의 `expected` 객체 (`{ max: 7, xhigh: 12, high: 2, medium: 3 }`) 를 함께 갱신해야 drift 알림이 정확하다.
>
> **haiku 3종은 상향하지 않았다** — read-only fan-out 이고, Haiku 4.5 는 애초에 `xhigh`/`max` 를 지원하지 않는다.
>
> ✅ **실측 확정 (2026-07-26, Claude Code 2.1.220)**: subagent frontmatter 의 **`max` 는 유효하고, 세션 effort 를 덮는다.** 카나리아 = `--effort low` 로 띄운 헤드리스 세션에서 `incident-handler`(frontmatter `effort: max`)를 소환해 각자의 `CLAUDE_EFFORT` 를 출력 → 메인 `[]`, 서브 `[max]`. `CLAUDE_EFFORT` 는 **모델별 silent downgrade 를 반영한 뒤의** 값이므로(런타임 docstring) Opus 5 에서 `max` 가 강등되지 않음도 같이 증명된다. 위 7개를 내릴 이유가 없다.
>
> 근거 2 (스키마): 바이너리의 agent frontmatter 스키마는 `effort: v.union([v.enum(EL), v.number().int()])` 이고 `EL = ["low","medium","high","xhigh","max"]`. settings 파일의 `effortLevel` 만 제한 enum(`["low","medium","high","xhigh"]`)을 써서 `max` 를 거부한다 — **두 경로가 서로 다른 enum 을 쓴다**는 것이 "settings 는 거부, frontmatter 는 수용"의 정확한 기전이다.
>
> **`thinking_budget` 필드는 폐기됨**(2026-07-09) — Claude Code no-op. v3.0 P2.4 의무화는 거짓 전제였고 21개 agent 에서 제거 완료.

### 등록 불변식 — `name:` 없는 agent 는 존재하지 않는다 (2026-07-26 실측)

**Claude Code 는 subagent 타입을 파일명에서 유도하지 않는다.** `.claude/agents/*.md` frontmatter 에 `name:` 이 없으면 그 파일은 **조용히 레지스트리에서 누락**된다 — 파싱 에러도, 경고도, 게이트 실패도 없다. Agent 도구의 subagent_type 목록에 아예 나타나지 않고, 호출은 런타임에 `Agent type '<x>' not found` 로 실패한다.

- **실측 (2026-07-26)**: 허브 24 agent 중 **23개에 `name:` 이 없어 소환 불가**였다. `initializer` 만 우연히 그 키를 갖고 있어 유일하게 살아 있었다. 24개 전부가 `SHARED_AGENTS` 라 **28개 멤버도 동일 상태**였다.
- **회귀가 아니다**: 이전 바이너리(2.1.207)로 프로브해도 동일 재현이고, `git log` 상 `code-reviewer.md` 는 **최초 커밋부터** `name:` 이 없었다. 828 테스트 + 169 릴리즈게이트를 통과하며 잠복했다.
- **조용히 죽어 있던 것**: `constants.ts` 가 스스로 경고하던 하드 의존 — *"lead-planner = Tier 1, evaluator / process-reward-evaluator = Tier 3. Without these the shared skill breaks on siblings with agent-not-found."* 그 프로즈는 옳았고, 그 조건은 **이미 참이었다**. `multi-review` · `generate-review` 가 그 위에 서 있었다.
- **잠금**: `scripts/harness-pull/tests/agent-registration.test.ts` 가 `name === 파일명 slug` 를 강제한다(음성 대조 확인 — `name` 을 지우면 실제로 실패). 프로즈 불변식은 조용히 썩는다 — `shared-import-closure.test.ts` 와 같은 교훈.

새 agent 를 추가할 때 `name:` 은 선택이 아니라 **존재 조건**이다.

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

> **⚠ 정정 + 제거 완료 (2026-07-09)**: `thinking_budget` 는 **Claude Code agent-frontmatter 지원 필드가 아니다** — Claude Code 는 무시한다(v2.1.198+ subagent 는 메인 대화 thinking 설정 상속, per-subagent thinking 설정 없음). Opus 4.8 thinking 깊이 = **effort 가 제어**(adaptive; 수동 `budget_tokens` 는 400). **이 세션(2026-07-09)에서 no-op 필드 제거 완료**: 21 agent frontmatter 에서 삭제 + `sync-thinking-budget.ts` 폐기 + diagnostic `thinking-budget-drift` 트랙 제거. **아래 하위 섹션(v3.0 의무화·4-level 표·'Claude Code 추상화'·측정 트랙)은 이 정정으로 SUPERSEDED — 역사 보존**이며, 그 매핑/budget 값은 **Anthropic SDK 를 직접 호출하는 sibling 앱**에만 참고용(Claude Code agent 에는 무효).

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
model: claude-opus-4-8[1m]
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

**[정정 2026-07-09]** — Claude Code 는 `thinking_budget` frontmatter 를 지원/추상화하지 **않는다**(위 박스). 이 SDK 코드 예시는 **Anthropic SDK 직접 호출 sibling** 전용이며 Claude Code agent 와 무관하다(Claude Code agent 는 effort 로 thinking 제어).

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

## Prompt caching 연계

**Opus 5 는 캐시 최소 길이가 512 토큰**이다 — Opus 4.8 의 1,024 에서 절반. 이전에 "너무 짧아 캐시 안 됨"으로 포기했던 prompt 가 **코드 변경 없이** 캐시 엔트리를 만든다. 짧은 system prompt 를 쓰는 agent 는 재확인할 가치가 있다. (최소값은 세대별로 단조롭지 않다 — Opus 4.6·Haiku 4.5 는 4,096.)

1. **1M 컨텍스트가 기본**: Opus 5 는 전 세션이 1M 이라 큰 prefix 를 담기 쉽지만, 그 prefix 를 매 호출 재처리하면 비용이 선형 증가한다. `cache_control` breakpoint 를 frozen 부분 끝에 명시해야 효율이 나온다.
2. **tokenizer**: Opus 5 는 Opus 4.7/4.8 과 동일 tokenizer — 4.8 에서 올라올 때 토큰 수는 대체로 그대로다. (4.6 이하에서 올라오면 최대 1.35배.)

실무:
- **모델 전환 시 cache 는 model-scoped 라 전부 rebuild** 된다. Opus 4.8 → Opus 5 첫 호출은 write premium 을 예상할 것 — 전환 직후 `bun run cache-hit` 수치가 일시적으로 떨어지는 건 정상이다.
- 큰 컨텍스트를 싣는 agent(`design-engineer` / `page-builder` / `code-reviewer` / `migrations-auditor`)는 caching breakpoint 명시 효과가 가장 크다.
- Claude Code 는 harness 레벨에서 자동 caching 하지만 (`.claude/settings.json` 의 `ENABLE_PROMPT_CACHING_1H=1` 확인), **member repo 가 Anthropic SDK 를 직접 호출할 때는** 수동 설정 필수.

자세한 배치 원칙/비용 모델/측정 지표는 [prompt-caching.md](prompt-caching.md) canon 참조. harness 레벨 1h vs 5m TTL 운영 정책은 [prompt-caching-strategy.md](prompt-caching-strategy.md).

## 비용 guard

- `max` 남용 시 token 소비 급증. `/effort high`로 런타임 하향 가능
- `preflight` skill이 Claude Code 버전 + `CLAUDE_CODE_EFFORT_LEVEL` **부재** 확인 (설정돼 있으면 위반 — 위 「환경변수 정책」)
- 월별 `knowledge/journal/` 비용 관찰 권고
- **Caching hit rate 관찰**: `response.usage.cache_read_input_tokens / total ≥ 70%` 목표. 50% 미만이면 silent invalidator 조사 (자세한 기준 → [prompt-caching.md](prompt-caching.md))

## 참조

- [Claude Opus 4.7 공식](https://www.anthropic.com/claude/opus)
- [Claude Code Model Config](https://code.claude.com/docs/en/model-config)
- [Extended Thinking (Adaptive)](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
