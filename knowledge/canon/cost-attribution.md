---
title: Cost Attribution — LiteLLM + Langfuse + CF Workers
version: 1.0.0
last_updated: 2026-04-17
source: [Harness v2.4 Tier 1, LiteLLM spend API, Langfuse datasets]
sync_to_children: true
consumers: [preflight]
---

<!--
22 앱 × 1인 체제에서 앱별 AI 비용 + CF Workers 비용이 분리 추적되지 않는다.
이 canon은 Tier 1 mod-ai-toolkit 자원(LiteLLM + Langfuse)을 통해 비용을 자동 분리하는 전략을 명시한다.
-->

# Cost Attribution — 비용을 앱·agent·skill 단위로 분리

## 3 계층 비용 원천

| 계층 | 원천 | 추적 도구 |
|------|------|-----------|
| **Claude API 비용** | Claude Code 개발 + 앱 내 Claude 호출 | LiteLLM Proxy spend API → Langfuse |
| **Cloudflare 비용** | Workers 요청 + CPU 시간 + D1/R2 ops | Cloudflare Analytics + wrangler tail |
| **외부 SaaS 비용** | Toss 결제, Resend 이메일, Supertone TTS | 각 서비스 대시보드 |

## LiteLLM Proxy 가상 키 전략

각 앱/에이전트 카테고리별 **virtual key** 발급. LiteLLM이 자동 분리:

```
project = "modfolio-universe"
  ├─ key: universe-harness    (harness-pull, Claude Code 개발 세션)
  ├─ key: modfolio-connect    (SSO agent 호출 — 가상)
  ├─ key: modfolio-pay        (결제 agent 호출)
  ├─ key: gistcore            (학습 튜터 agent)
  └─ key: anf                 (Mentor AI)
```

**사용법** (opt-in):
```typescript
// toolkit 경유 + 앱별 spend 추적이 필요한 repo만 .env.local에 추가
// 기본값은 api.anthropic.com 직접 사용 — Claude Code 독립 동작 보장
ANTHROPIC_BASE_URL=http://llm.mod-ai.localhost/v1
ANTHROPIC_API_KEY=<virtual-key-per-app>
```

⚠️ 2026-04-18 기준 이 설정은 opt-in. toolkit이 미기동인데 `ANTHROPIC_BASE_URL`이 설정돼 있으면 Claude Code가 `$.input_tokens` 오류로 멈추므로 하드코딩 금지 ([project_toolkit_optin.md](../../../memory/project_toolkit_optin.md)).

LiteLLM이 각 키별 spend를 Langfuse로 push. Langfuse 대시보드에서 앱별 drilldown.

## Langfuse 태깅 규칙

모든 agent 호출은 다음 metadata를 Langfuse에 전달:

```json
{
  "app": "modfolio-connect",
  "agent": "code-reviewer",
  "skill": "api",
  "repo": "modfolio-connect",
  "effort": "xhigh",
  "model": "claude-opus-4-7[1m]"
}
```

LiteLLM OTLP exporter가 자동 추가. `scripts/obs/langfuse-export.ts` (Phase 5)가 `memory/pattern-history.jsonl` + `memory/incidents.jsonl`을 Langfuse dataset으로 보강.

## Cloudflare Workers 비용 매핑

`ecosystem.json`의 `cfAppProject` 필드가 비용 단위. 월별 수작업 + 임계치 초과 시 알람:

- Workers Paid Plan: $5/mo 기본 + $0.50 per million requests
- D1: $5/mo 기본 + $1 per 1B rows read
- R2: $0.015/GB storage + $4.5 per million Class A ops
- Durable Objects SQLite: $0.20/GB storage + compute

알람 임계치 (suggested):
- 단일 앱 월 > $50 → 조사
- 전체 생태계 월 > $200 → 최적화 스프린트

## 비용 delta 조사

월간 비용 급증 발견 시 perf-profiler agent 호출:

```
1. ecosystem.json에서 cfAppProject 매핑 확인
2. perf-profiler agent로 해당 앱 핫 패스 분석
3. Langfuse trace 확인 (agent 호출 급증 여부)
4. 임시 rate limit + 원인 수정
```

## Anti-patterns

- LiteLLM 우회 (직접 Anthropic 호출) — 비용 블랙홀
- 단일 virtual key로 여러 앱 사용 — drilldown 불가
- Langfuse metadata 누락 — trace가 있어도 귀속 불가

## 관련

- [observability.md](observability.md) — OTLP trace 수집 경로
- [evergreen-principle.md](evergreen-principle.md) — Connect SDK 업그레이드 전 비용 영향 예측
- [eval-patterns.md](eval-patterns.md) — 비용 대비 품질 메트릭 = LLM-judge score / $
- [local-dev-infra.md](local-dev-infra.md) — LiteLLM Proxy 설정 상세

## 갱신 이력

- 2026-04-17: v1.0.0 초판. LiteLLM virtual key + Langfuse metadata 전략 명문화.
