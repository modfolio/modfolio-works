---
title: Observability
version: 1.5.0
last_updated: 2026-05-06
source: [.claude/skills/observability/SKILL.md, templates/observability/signoz-llm-dashboard.json, Phase 4.2 Trial P1 #10 OTel GenAI semconv spike (tech-trends-2026-05.md)]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [observability, deploy]
---

# Observability — Canonical Reference

> 앱 코드에 벤더 SDK 금지. wrangler.jsonc + CF Automatic Tracing만 사용. OTLP 표준.
> LLM 호출을 가진 Worker 는 예외 — `@microlabs/otel-cf-workers` 를 써서 OTel GenAI semconv 로 `gen_ai.*` 를 span 에 붙인다 (아래 §GenAI Semantic Conventions).

## v1.5.0 변경 (2026-05-06) — GenAI semconv dual-emit 명시

OpenTelemetry GenAI Semantic Conventions 가 experimental 상태이지만 Datadog v1.37 / SigNoz native 지원 시작. 안정화 전 **dual-emit** 채택 (정공법 4원칙 — 신기술 포텐셜 감안).

### 환경변수 (Worker)

```jsonc
// wrangler.jsonc
"vars": {
  "OTEL_SEMCONV_STABILITY_OPT_IN": "gen_ai_latest_experimental",
  // dual-emit: 기존 "ai.*" + 신규 "gen_ai.*" 동시 발행 → vendor 호환
  "OTEL_EXPORTER_OTLP_ENDPOINT": "http://otel.mod-ai.localhost"  // 예시
}
```

### Span attributes (LLM 호출 시)

| 속성 | 예시 | 비고 |
|---|---|---|
| `gen_ai.system` | `"anthropic"` / `"openai"` / `"vertex_ai"` | provider |
| `gen_ai.request.model` | `"claude-opus-4-7"` | request model |
| `gen_ai.response.model` | `"claude-opus-4-7"` | actual responding model (variant 포함) |
| `gen_ai.usage.input_tokens` | `1234` | request tokens |
| `gen_ai.usage.output_tokens` | `567` | response tokens |
| `gen_ai.request.temperature` | `0.7` | request param |
| `gen_ai.response.finish_reasons` | `["stop"]` | array — 다중 stream 지원 |
| `gen_ai.tool.call.id` | `"call_abc123"` | tool use id |
| `gen_ai.cache.input_tokens` | `512` | prompt caching hit (Anthropic 확장) |

### Sibling 적용 권고

| sibling | LLM 호출 위치 | 우선순위 |
|---|---|---|
| modfolio-connect | AI assistant (SSO copilot) | 높음 — user-facing latency |
| modfolio-pay | pricing-optimizer agent | 중간 — billing impact |
| modfolio-ecosystem | 14 agent LLM 호출 | 중간 — dev observability |
| modfolio-app | conversational hub | 높음 — UX 직격 |
| 기타 sibling | 본 LLM 호출 sibling 자율 | Hub-not-enforcer |

### 마이그 path

1. `@microlabs/otel-cf-workers` 또는 `@opentelemetry/instrumentation-anthropic-vertex` 도입
2. wrangler.jsonc 에 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` 추가
3. SDK 호출 시 span attribute 추가 (instrumentation 자동 또는 수동 attribute)
4. SigNoz / Datadog dashboard 에서 `gen_ai.*` filter 검증
5. 안정화 후 `OTEL_SEMCONV_STABILITY_OPT_IN` 제거 (default = stable)

**status (2026-05-06)**: Trial P1 #10 → **Adopt-1-sketched** (tech-trends-2026-05.md). 실 dual-emit cement 는 LLM 호출 sibling 별 자율 시점.

## 아키텍처

```
CF Pages/Workers → CF Automatic Tracing (코드 변경 0)
  → CF OTLP Export → CF Tunnel → SigNoz (:4318)
```

## wrangler.jsonc 설정

> **2026-03-01 변경**: 신규 Worker는 `observability.enabled = true`가 기본. 기존 Worker는 명시해야 활성화. 과금 영향 주의 — 월 10M spans 무료분 초과 시 $0.60/1M ([CF Workers Tracing Open Beta](https://blog.cloudflare.com/workers-tracing-now-in-open-beta/)).

```jsonc
{
  "observability": {
    "traces": {
      "enabled": true,
      "head_sampling_rate": 1,
      "destinations": ["modfolio-signoz"],
      "persist": false
    },
    "logs": {
      "enabled": true,
      "head_sampling_rate": 1,
      "destinations": ["modfolio-signoz-logs"],
      "persist": false
    }
  }
}
```

- `persist: false` → CF 대시보드 저장 비활성 (비용 절감)
- `head_sampling_rate: 1` → 100%. 월 10M spans 무료분 접근 시 `0.1`로 조정 (critical path 경로는 유지, 일반 RPC는 10% 샘플)
- `destinations`가 비어 있으면 trace/log가 수집만 되고 운영 가치가 없다. destination 설정까지 완료해야 적용으로 간주

## OTLP Destinations (계정 레벨, 설정 완료)

| Destination | Endpoint |
|-------------|----------|
| modfolio-signoz | `https://otel.modfolio.io/v1/traces` |
| modfolio-signoz-logs | `https://otel.modfolio.io/v1/logs` |

CF Named Tunnel `modfolio-otel` → 로컬 SigNoz OTel Collector (:4318).

## Correlation ID

`cf-ray` 헤더 자동 주입. 서비스 간 전파:
```typescript
const requestId = request.headers.get('cf-ray') ?? crypto.randomUUID();
fetch(url, { headers: { 'x-request-id': requestId } });
```

## 과금 (Workers Paid)

| 포함량 | 초과 | 보존 |
|--------|------|------|
| 10M spans/월 | $0.60/1M | 7일 |

## 체크리스트

- [ ] wrangler.jsonc에 `observability` 블록 추가
- [ ] `traces.destinations`, `logs.destinations`가 실제 destination 이름으로 설정됐는지 확인
- [ ] CF 대시보드에 OTLP destination 생성 (계정 1회)
- [ ] CF Tunnel 실행 + SigNoz Docker 기동
- [ ] 배포 후 SigNoz UI에서 트레이스 확인
- [ ] (Neon 앱) Neon GitHub App 활성화
- [ ] (LLM 호출 앱) `@microlabs/otel-cf-workers` 래퍼 + `gen_ai.*` span 속성 확인 (아래 §GenAI Semantic Conventions)

## GenAI Semantic Conventions

> **2026-04 상태**: OTel GenAI semconv 는 전체가 **Development** (=experimental) 상태. stable 선언 전까지 wire-format 변경 가능. 그럼에도 **v1.37 (2025-08-25)** 이후 속성 이름이 안정화됐고 Datadog / Langfuse / SigNoz / Arize 가 네이티브 인제스트를 지원하므로 **지금 채택하는 것이 정공법** — `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` 로 최신 스키마를 고정한다.
>
> 출처: [opentelemetry.io/docs/specs/semconv/gen-ai/](https://opentelemetry.io/docs/specs/semconv/gen-ai/) · [v1.37.0 릴리즈 노트](https://github.com/open-telemetry/semantic-conventions/releases/tag/v1.37.0) · [Datadog 2025-12-01 네이티브 지원 발표](https://www.datadoghq.com/blog/llm-otel-semantic-convention/)

### v1.37 Breaking Changes (필수 숙지)

- `gen_ai.system` → `gen_ai.provider.name` 로 **이름 변경**. 더 이상 `gen_ai.system=anthropic` 쓰지 않는다. `gen_ai.provider.name=anthropic` 이 정답.
- 메시지 이벤트 `gen_ai.user.message` / `gen_ai.system.message` / `gen_ai.assistant.message` / `gen_ai.tool.message` / `gen_ai.choice` **전부 deprecated**. 대체:
  - 시스템 프롬프트 → `gen_ai.system_instructions` (span attribute)
  - 입력 히스토리 → `gen_ai.input.messages` (span attribute)
  - 모델 응답 → `gen_ai.output.messages` (span attribute)
- `gen_ai.openai.*` → `openai.*` (namespace 축소), `az.ai.*` → `azure.ai.*`
- `gen_ai.usage.prompt_tokens` → `gen_ai.usage.input_tokens`, `gen_ai.usage.completion_tokens` → `gen_ai.usage.output_tokens` (v1.37 이전 이미 변경됐지만 v1.36 구현 잔존 시 주의)

### 필수 속성 (Required)

모든 GenAI client span 에 반드시 포함 — 출처: [gen-ai-spans.md](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/).

| 속성 | 타입 | 예시 | 비고 |
|------|------|------|------|
| `gen_ai.operation.name` | string | `chat`, `text_completion`, `embeddings`, `execute_tool`, `invoke_agent`, `create_agent`, `generate_content` | well-known value 우선 |
| `gen_ai.provider.name` | string | `anthropic`, `openai`, `aws.bedrock`, `gcp.vertex_ai`, `gcp.gemini` | 시스템 flavor discriminator |
| `error.type` | string | `timeout`, `rate_limit`, `TypeError` | 에러 발생 시 조건부 필수 |

**Span name 규약**: `"{gen_ai.operation.name} {gen_ai.request.model}"` — 예: `chat claude-opus-4-7`. Execute tool 은 `"execute_tool {gen_ai.tool.name}"`.

### 권장 속성 (Recommended)

| 속성 | 타입 | 예시 | 비고 |
|------|------|------|------|
| `gen_ai.request.model` | string | `claude-opus-4-7` | 요청 모델 |
| `gen_ai.response.model` | string | `claude-opus-4-7-20260101` | 실제 응답 모델 (fine-tune / version 붙을 수 있음) |
| `gen_ai.response.id` | string | `msg_01AbC...` | provider 의 completion id |
| `gen_ai.response.finish_reasons` | string[] | `["stop"]`, `["length"]`, `["tool_calls"]` | |
| `gen_ai.usage.input_tokens` | int | `1234` | |
| `gen_ai.usage.output_tokens` | int | `567` | |
| `gen_ai.usage.cache_creation.input_tokens` | int | `128` | v1.40 추가 (Anthropic prompt caching 지원) |
| `gen_ai.usage.cache_read.input_tokens` | int | `256` | v1.40 추가 |
| `gen_ai.request.temperature` | double | `0.7` | |
| `gen_ai.request.top_p` | double | `1.0` | |
| `gen_ai.request.top_k` | double | `40` | |
| `gen_ai.request.max_tokens` | int | `4096` | |
| `gen_ai.request.seed` | int | `42` | |
| `gen_ai.request.choice.count` | int | `1` | |
| `gen_ai.request.stop_sequences` | string[] | `["\n\nHuman:"]` | |
| `gen_ai.request.frequency_penalty` | double | `0.0` | |
| `gen_ai.request.presence_penalty` | double | `0.0` | |
| `server.address`, `server.port` | string/int | `api.anthropic.com` / `443` | **Stable** 표준 (generic) |

### Opt-In 속성 (콘텐츠 캡처)

> 기본값은 **캡처 안 함** — PII / 토큰 비용 / 저장소 비용 이슈. 명시적으로 `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true` 또는 동급 스위치를 켠 경우에만 기록.

| 속성 | 타입 | 비고 |
|------|------|------|
| `gen_ai.system_instructions` | any | 시스템 프롬프트. `[{"type":"text","content":"..."}]` 형식 |
| `gen_ai.input.messages` | any | 입력 히스토리. `[{"role":"user","parts":[{"type":"text","content":"..."}]}]` |
| `gen_ai.output.messages` | any | 모델 응답. 동일 구조 |
| `gen_ai.output.type` | string | `text`, `json`, `image`, `speech` |

대안: span 대신 **`gen_ai.client.inference.operation.details` 이벤트**로 분리 전송 (기본 off). PII redaction 을 중앙 처리 가능.

### 에이전트·도구 속성

| 속성 | 타입 | 예시 |
|------|------|------|
| `gen_ai.agent.id` | string | `asst_5j66Up...` |
| `gen_ai.agent.name` | string | `code-reviewer` |
| `gen_ai.agent.version` | string | `2.10.0` |
| `gen_ai.agent.description` | string | `Opus 4.7 기반 P0-P3 triage` |
| `gen_ai.conversation.id` | string | session/thread id |
| `gen_ai.tool.name` | string | `get_weather` |
| `gen_ai.tool.type` | string | `function`, `extension`, `datastore` |
| `gen_ai.tool.description` | string | |
| `gen_ai.tool.call.id` | string | |
| `gen_ai.tool.call.arguments` | any | Opt-in |
| `gen_ai.tool.call.result` | any | Opt-in |

### 표준 메트릭 (Histogram)

출처: [gen-ai-metrics.md](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics/).

| 메트릭 | 단위 | 필수 attribute |
|--------|------|----------------|
| `gen_ai.client.operation.duration` | `s` | `operation.name`, `provider.name` |
| `gen_ai.client.token.usage` | `{token}` | `operation.name`, `provider.name`, `token.type` (`input`/`output`) |
| `gen_ai.server.request.duration` | `s` | `operation.name`, `provider.name` |
| `gen_ai.server.time_to_first_token` | `s` | `operation.name`, `provider.name` |
| `gen_ai.server.time_per_output_token` | `s` | `operation.name`, `provider.name` |

⚠️ CF Workers 는 **custom metrics export 를 아직 미지원** ([공식 문서](https://developers.cloudflare.com/workers/observability/exporting-opentelemetry-data/)). token 사용량은 span 속성으로만 기록하고 SigNoz / Langfuse 쪽에서 span → metric rollup 처리한다.

### Cloudflare Workers 환경 제약 + 선택지

CF Workers 에서 `gen_ai.*` 를 기록하려면 두 가지 길이 있다:

1. **CF Automatic Tracing 만 사용 (0 코드 변경)** — 2026-04 현재 자동 span 에 `gen_ai.*` 속성을 **사용자가 덧붙일 공식 API 가 아직 릴리즈되지 않음**. 2025-10 오픈베타 발표에서 "custom spans and attributes 지원 예정" 이라 명시됐지만 GA 미진입 ([블로그](https://blog.cloudflare.com/workers-tracing-now-in-open-beta/)). → LLM 호출 추적 요구사항이 있으면 2번을 택한다.
2. **`@microlabs/otel-cf-workers` (v1.0.0-rc.52, 2025-05 릴리즈)** 사용 ([github](https://github.com/evanderkoogh/otel-cf-workers)). `nodejs_compat` flag 필수. `instrument()` 래퍼로 fetch handler 를 감싸고 `@opentelemetry/api` 의 `trace.getActiveSpan()` 으로 `gen_ai.*` 를 붙인다. OTLP HTTP exporter 지원 (protobuf + JSON).

> **SDK 선택 금지어 정정**: 이 파일 상단의 "앱 코드에 벤더 SDK 금지" 는 Datadog/New Relic 같은 **proprietary agent** 를 말한다. `@microlabs/otel-cf-workers` 는 OTel 표준 구현체이므로 예외. `@opentelemetry/sdk-trace-node` 는 CF Workers 런타임 비호환 (long-running process 가정) — **쓰지 말 것**. `@opentelemetry/sdk-trace-web` 도 부적절 (브라우저 `window` 의존).

### Langfuse OTLP 엔드포인트

출처: [langfuse.com/integrations/native/opentelemetry](https://langfuse.com/integrations/native/opentelemetry).

- EU cloud: `https://cloud.langfuse.com/api/public/otel/v1/traces`
- US cloud: `https://us.cloud.langfuse.com/api/public/otel/v1/traces`
- Self-hosted (v3.22.0+): `http://<host>/api/public/otel/v1/traces`
- 헤더:
  ```
  Authorization: Basic <base64(pk-lf-...:sk-lf-...)>
  x-langfuse-ingestion-version: 4
  ```
- 전송 포맷: OTLP/HTTP **protobuf 또는 JSON** (gRPC 미지원 — CF Workers 에도 이상적)
- Langfuse 네이티브 매핑: `gen_ai.request.model`, `gen_ai.response.model`, `gen_ai.usage.*` → Langfuse generation 레코드. 2025-09 Issue #8840 + PR #8813 (Steffen911) 병합으로 `gen_ai.input.messages` / `gen_ai.output.messages` (v1.37+) 지원 완료. 그 전 수집한 `gen_ai.prompt` / `gen_ai.completion` 은 legacy 경로로 폴백.

### 벤더 인제스트 현황 (2026-04)

| 벤더 | semconv 지원 버전 | 주의 |
|------|-----------------|------|
| **Datadog LLM Observability** | v1.37+ 네이티브 (2025-12-01 발표) | SDK 없이 OTLP 만으로 인제스트 가능 ([출처](https://www.datadoghq.com/blog/llm-otel-semantic-convention/)) |
| **Langfuse** | v1.37+ 네이티브 (2025-09 merge) | OTLP HTTP, gRPC 미지원 |
| **SigNoz** | OTel-native, 모든 semconv 자동 | LLM 전용 view 는 대시보드 수동 구성 |
| **Arize Phoenix** | OpenInference + GenAI semconv dual | 자체 OpenInference 속성과 병행 (dev 진행) |
| **Cloudflare SigNoz (modfolio 현재 경로)** | CF Auto Tracing → OTLP → SigNoz | 앱 코드에서 `gen_ai.*` 주입 시 `@microlabs/otel-cf-workers` 필요 (§Cloudflare Workers 환경 제약) |

### 권장 워크플로 (modfolio)

1. LLM 호출이 있는 Worker 는 `@microlabs/otel-cf-workers` 로 래핑 + `OTLP` exporter URL 을 modfolio-signoz (=`https://otel.modfolio.io/v1/traces`) 로 설정. CF Auto Tracing 은 그대로 유지 — 두 span tree 가 공존해도 `traceparent` 전파로 병합된다.
2. `gen_ai.operation.name` + `gen_ai.provider.name` 은 **항상** 기록. 나머지 usage / 설정 속성은 가능하면 기록.
3. 콘텐츠 (`gen_ai.input.messages` 등) 는 PII redaction 정책이 확정된 Worker 에서만 opt-in. 기본은 off.
4. Langfuse 동시 전송이 필요하면 SigNoz OTel Collector 에서 **fan-out exporter** 로 Langfuse endpoint 를 추가 (앱 코드 수정 불필요). 구체 YAML 은 §Collector Fan-out (SigNoz + Langfuse).
5. 비용은 `cost-attribution.md` §GenAI semconv 기반 비용 계산 참조.

## Collector Fan-out (SigNoz + Langfuse)

Worker → CF Tunnel → OTel Collector → **SigNoz + Langfuse 이중 전송**. Worker / 앱 코드 수정 없이 Collector 단에서 복제. GenAI semconv 속성은 양쪽 벤더가 각자 해석 (SigNoz: LLM 대시보드, Langfuse: generation 레코드).

**`otelcol-contrib` 설정 예시** (self-hosted SigNoz 기준, `otelcol.yaml`):

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 8192
  # GenAI span 만 Langfuse 로 보내고 싶으면 filter 사용
  filter/genai_only:
    spans:
      include:
        match_type: strict
        attributes:
          - key: gen_ai.operation.name

exporters:
  # SigNoz 본선 (모든 span)
  otlp/signoz:
    endpoint: signoz-otel-collector:4317
    tls:
      insecure: true
  # Langfuse 로 GenAI span 만 복제
  otlphttp/langfuse:
    endpoint: https://cloud.langfuse.com/api/public/otel  # EU 기본; US = us.cloud.langfuse.com
    headers:
      Authorization: "Basic ${env:LANGFUSE_OTLP_BASIC_AUTH}"  # base64(pk:sk)
      x-langfuse-ingestion-version: "4"
    compression: gzip

service:
  pipelines:
    traces/signoz:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/signoz]
    traces/langfuse:
      receivers: [otlp]
      processors: [filter/genai_only, batch]
      exporters: [otlphttp/langfuse]
```

**핵심 결정**:
- **두 pipeline** — SigNoz 본선 + Langfuse 복제. `filter/genai_only` 로 Langfuse 는 GenAI span 만 받게 해 Langfuse 저장 비용 최소화.
- **auth 는 env 주입** — `LANGFUSE_OTLP_BASIC_AUTH=base64(pk-lf-xxx:sk-lf-xxx)` 를 athsra (canon `secret-store.md` v1.13+) 또는 wrangler secret prod 에서 주입. Collector 설정 파일에 평문 금지.
- **gzip 압축** — GenAI span 은 messages 포함 시 payload 큼. gzip 으로 대역폭/비용 절감.
- **CF Workers 직접 export 회피** — Collector 를 중간에 둠. CF Workers `fetch` 한계 (subrequest quota), 인증 갱신 중앙화, fan-out 정책 변경 시 앱 재배포 불필요.

**검증**:

```bash
# Collector 의 Langfuse exporter 가 span 을 받고 있는지 metric 확인
curl -s http://otelcol:8888/metrics | grep otelcol_exporter_sent_spans
# otelcol_exporter_sent_spans{exporter="otlphttp/langfuse"} 수치 증가 확인
```

## SigNoz LLM Dashboard (템플릿 asset)

`templates/observability/signoz-llm-dashboard.json` — GenAI semconv v1.37+ 속성 기반 SigNoz 대시보드 정의. SigNoz UI → Dashboards → Import JSON 으로 로드.

포함 패널:
- **Token usage by model** — `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens` 합계 (model 별 stack)
- **Cache hit ratio** — `gen_ai.usage.cache_read.input_tokens / (cache_read + cache_creation + input)` (Anthropic prompt caching)
- **p50/p95/p99 latency** — `gen_ai.client.operation.duration` histogram
- **Time to first token** — `gen_ai.server.time_to_first_token`
- **Error rate** — `error.type` 이 set 된 span count / total span count
- **Cost by operation** — `gen_ai.operation.name` 별 input/output 토큰 × 단가 (Collector 에서 transform processor 로 `gen_ai.cost.usd` attribute 추가 권장)

각 panel 은 `gen_ai.provider.name` filter 지원 (anthropic/openai/azure 분리 보기). member repo 는 자체 athsra (canon `secret-store.md` v1.13+) 의 Langfuse/SigNoz endpoint 로 adjust 만 하면 재사용 가능.
