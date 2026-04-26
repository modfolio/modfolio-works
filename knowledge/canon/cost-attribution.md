---
title: Cost Attribution — LiteLLM + Langfuse + CF Workers
version: 1.1.0
last_updated: 2026-04-22
source: [Harness v2.4 Tier 1, LiteLLM spend API, Langfuse datasets, OTel GenAI semconv v1.37+]
sync_to_siblings: true
applicability: always
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
project = "modfolio-ecosystem"
  ├─ key: ecosystem-harness   (harness-pull, Claude Code 개발 세션)
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

## GenAI semconv 기반 비용 계산 (v1.37+)

> **2026-04 현황**: OTel 표준에는 **`gen_ai.usage.cost` 속성이 없다**. [Registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/) 에 존재하지 않음을 실측 확인 (WebFetch 2026-04-22). Langfuse 구 문서가 언급하는 `gen_ai.usage.cost` 는 Langfuse-specific custom attribute — 이식성 없음. 정공법은 **토큰 usage 를 OTel 표준 속성으로 기록**하고 **cost 는 consumer (Langfuse / SigNoz / 자체 집계) 에서 모델 단가 × 토큰으로 계산**한다.

### 필수로 기록할 token usage 속성

LLM 호출 span 에 다음을 반드시 부착 — 출처: [gen-ai-spans.md](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/).

| 속성 | 단위 | 용도 |
|------|------|------|
| `gen_ai.usage.input_tokens` | token | base input 단가 적용 |
| `gen_ai.usage.output_tokens` | token | output 단가 적용 (Anthropic 기준 input 의 5배) |
| `gen_ai.usage.cache_creation.input_tokens` | token | Anthropic prompt caching: cache 쓰기 단가 (1.25x input) |
| `gen_ai.usage.cache_read.input_tokens` | token | Anthropic prompt caching: cache 읽기 단가 (0.1x input) |
| `gen_ai.request.model` | string | 단가표 조회 key |
| `gen_ai.response.model` | string | 실제 응답 모델 (fine-tune / dated version) |
| `gen_ai.provider.name` | string | `anthropic`, `openai`, `aws.bedrock` 등 단가표 네임스페이스 |

> **v1.37 breaking**: `gen_ai.system` 은 `gen_ai.provider.name` 으로 이름 변경됨. `gen_ai.usage.prompt_tokens` / `completion_tokens` 는 `input_tokens` / `output_tokens` 로. 옛 이름 잔존 금지 — 정공법으로 맞춘다. 출처: [v1.37.0 릴리즈노트](https://github.com/open-telemetry/semantic-conventions/releases/tag/v1.37.0).

### 단가표 (2026-04 기준, USD per 1M tokens)

> 단가는 제공사 공식 발표 기준. `gen_ai.provider.name` + `gen_ai.request.model` 조합으로 lookup.

| provider | model | input | cache write | cache read | output |
|----------|-------|-------|-------------|-----------|--------|
| anthropic | claude-opus-4-7 | $15 | $18.75 | $1.50 | $75 |
| anthropic | claude-opus-4-7[1m] | $15 | $18.75 | $1.50 | $75 |
| anthropic | claude-sonnet-4-5 | $3 | $3.75 | $0.30 | $15 |
| anthropic | claude-haiku-4-5 | $0.80 | $1.00 | $0.08 | $4 |
| openai | gpt-5 | $2.50 | — | — | $10 |
| openai | gpt-5-mini | $0.25 | — | — | $2 |

단가가 바뀌면 `ecosystem.json.pricing.genai` 또는 별도 `pricing/genai-2026-04.json` 를 single source of truth 로 쓰는 것을 권고. 하드코딩 금지.

### Cost 계산 함수 (TypeScript, Worker 호환)

```typescript
// scripts/obs/gen-ai-cost.ts
// OTel GenAI semconv v1.37+ 기반. 어떤 provider / model 에도 적용 가능.
// 사용법: const cost = computeGenAiCost(span.attributes, pricingTable);

export type TokenUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export type ModelPrice = {
  input: number;  // USD per 1M tokens
  output: number;
  cache_write?: number;
  cache_read?: number;
};

export type PricingTable = Record<string, Record<string, ModelPrice>>;
// e.g. pricing["anthropic"]["claude-opus-4-7"] = { input: 15, output: 75, cache_write: 18.75, cache_read: 1.50 }

/**
 * OTel span attributes 에서 직접 USD 비용 계산.
 * 입력은 otel-cf-workers 의 span.attributes 또는 파싱된 OTLP span.
 */
export function computeGenAiCost(
  attrs: Record<string, unknown>,
  pricing: PricingTable,
): number | null {
  const provider = attrs["gen_ai.provider.name"] as string | undefined;
  const model = (attrs["gen_ai.response.model"] ?? attrs["gen_ai.request.model"]) as
    | string
    | undefined;
  if (!provider || !model) return null;

  const price = pricing[provider]?.[model];
  if (!price) return null;

  const usage: TokenUsage = {
    input_tokens: attrs["gen_ai.usage.input_tokens"] as number | undefined,
    output_tokens: attrs["gen_ai.usage.output_tokens"] as number | undefined,
    cache_creation_input_tokens: attrs["gen_ai.usage.cache_creation.input_tokens"] as
      | number
      | undefined,
    cache_read_input_tokens: attrs["gen_ai.usage.cache_read.input_tokens"] as
      | number
      | undefined,
  };

  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;

  // base input 은 cache 토큰을 이미 제외한 uncached 부분만 담는다 (Anthropic API 규약).
  // 만약 provider 가 total input 에 cache 를 포함시키면 여기서 빼준다.
  const cost =
    (inputTokens * price.input +
      outputTokens * price.output +
      cacheWrite * (price.cache_write ?? price.input * 1.25) +
      cacheRead * (price.cache_read ?? price.input * 0.1)) /
    1_000_000;

  return Number(cost.toFixed(6));
}
```

### Member repo 적용 예시 — CF Worker + Anthropic SDK

`@microlabs/otel-cf-workers` 로 핸들러를 래핑하고 `@opentelemetry/api` 의 active span 에 `gen_ai.*` 속성을 붙인다. OTLP HTTP exporter 로 SigNoz 또는 Langfuse 에 직접 전송 (gRPC 미지원 환경이라 HTTP 가 유일 선택). 출처: [otel-cf-workers README](https://github.com/evanderkoogh/otel-cf-workers) · [langfuse.com/integrations/native/opentelemetry](https://langfuse.com/integrations/native/opentelemetry).

```typescript
// src/index.ts (CF Worker)
// wrangler.jsonc: compatibility_flags = ["nodejs_compat"]
// package.json: "@microlabs/otel-cf-workers": "^1.0.0-rc.52", "@opentelemetry/api": "^1"
import { instrument, type ResolveConfigFn } from "@microlabs/otel-cf-workers";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import Anthropic from "@anthropic-ai/sdk";

type Env = { ANTHROPIC_API_KEY: string; OTEL_EXPORTER_URL: string; OTEL_AUTH: string };

async function handler(req: Request, env: Env): Promise<Response> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const tracer = trace.getTracer("modfolio-llm-worker");

  return tracer.startActiveSpan("chat claude-opus-4-7", async (span) => {
    // OTel GenAI semconv v1.37+ — required
    span.setAttributes({
      "gen_ai.operation.name": "chat",
      "gen_ai.provider.name": "anthropic",
      "gen_ai.request.model": "claude-opus-4-7",
      "gen_ai.request.max_tokens": 4096,
      "gen_ai.request.temperature": 0.7,
    });

    try {
      const body = await req.json<{ prompt: string }>();
      const res = await anthropic.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 4096,
        temperature: 0.7,
        messages: [{ role: "user", content: body.prompt }],
      });

      // recommended response attributes
      span.setAttributes({
        "gen_ai.response.model": res.model,
        "gen_ai.response.id": res.id,
        "gen_ai.response.finish_reasons": [res.stop_reason ?? "stop"],
        "gen_ai.usage.input_tokens": res.usage.input_tokens,
        "gen_ai.usage.output_tokens": res.usage.output_tokens,
        "gen_ai.usage.cache_creation.input_tokens": res.usage.cache_creation_input_tokens ?? 0,
        "gen_ai.usage.cache_read.input_tokens": res.usage.cache_read_input_tokens ?? 0,
      });
      return Response.json(res);
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.setAttribute("error.type", (err as Error).name);
      throw err;
    } finally {
      span.end();
    }
  });
}

const config: ResolveConfigFn = (env: Env) => ({
  exporter: {
    url: env.OTEL_EXPORTER_URL, // 예: https://otel.modfolio.io/v1/traces (SigNoz)
    headers: { authorization: env.OTEL_AUTH }, // Langfuse 경유 시 Basic <base64(pk:sk)>
  },
  service: { name: "modfolio-llm-worker", version: "1.0.0" },
});

export default instrument({ fetch: handler }, config);
```

### 비용 집계 파이프라인

1. Worker 가 OTel span 으로 `gen_ai.*` 기록 → OTLP HTTP → SigNoz Collector.
2. SigNoz 에서 `scripts/obs/gen-ai-cost.ts` 의 `computeGenAiCost` 를 exporter processor 또는 batch job 으로 적용 → `gen_ai.usage.cost_usd` custom attribute 를 span 에 주입.
3. 월말 집계는 `SELECT sum(attributes['gen_ai.usage.cost_usd']) FROM traces WHERE resource.service.name = ... GROUP BY resource.service.name, attributes['gen_ai.request.model']`.
4. Langfuse 병행 전송이 필요하면 Collector fan-out. Langfuse 는 `gen_ai.usage.input_tokens` / `output_tokens` + `gen_ai.request.model` 을 자동 인지해 자체 cost 계산을 붙이므로 중복 없이 drilldown 가능.

### 주의

- **`gen_ai.usage.cost` 를 앱 코드에서 직접 계산해 span 에 넣는 anti-pattern 금지** — 단가가 바뀌면 과거 trace 가 stale. 계산은 consumer 에서.
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` 환경변수로 최신 스키마 고정. 미설정 시 v1.36 이전 이름 (`gen_ai.system` 등) 이 섞여 나올 수 있음.
- CF Workers 자동 tracing 은 2026-04 기준 `gen_ai.*` 커스텀 속성 주입 API 가 아직 GA 아님 ([공식 블로그 2025-10-28](https://blog.cloudflare.com/workers-tracing-now-in-open-beta/) — "custom spans and attributes 지원 예정"). 그때까지 `@microlabs/otel-cf-workers` 필수.

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
- 2026-04-22: v1.1.0 — OTel GenAI semconv v1.37+ 기반 비용 계산 섹션 추가. `gen_ai.system` → `gen_ai.provider.name` breaking change 반영. `gen_ai.usage.cost` 는 표준 속성이 아님을 명시하고 consumer-side 계산 함수 + CF Worker 예시 코드 추가.
