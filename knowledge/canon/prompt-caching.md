---
title: Prompt Caching — Anthropic cache_control Canonical Reference
version: 1.0.0
last_updated: 2026-04-22
source: [Anthropic platform docs, WebFetch/WebSearch 2026-04-22, claude-api skill v2.1.117]
sync_to_children: true
consumers: [ai-patterns, plan]
---

<!--
modfolio universe 는 Anthropic SDK 를 직접 호출하지 않는다. 이 canon 은
member repo (gistcore AI 스피킹, fortiscribe 라이팅 첨삭, modfolio-pay invoice AI 등)
가 Claude API 애플리케이션을 만들 때 참고하도록 작성된다. Claude Code harness 자체의
caching 정책은 `prompt-caching-strategy.md` (1h vs 5m TTL 운영) 참조.
-->

# Prompt Caching — Anthropic cache_control Canonical Reference

**원칙**: Anthropic prompt caching 은 **prefix match** 다. 안정적인 content 를 앞에, 변동 content 를 뒤에 배치하고 `cache_control` breakpoint 를 경계에 찍는다. 한 byte 라도 prefix 가 바뀌면 그 뒤 cache 는 전부 무효화된다.

생태계 member repo 중 Claude API 를 **SDK 로 직접** 호출하는 앱 (예: gistcore AI 스피킹, fortiscribe 라이팅 첨삭, invoice AI pipeline) 이 이 문서의 배치 원칙을 따른다. Claude Code harness 내부 caching 은 별도 canon ([prompt-caching-strategy.md](prompt-caching-strategy.md)) 에서 다룬다.

> 이 문서는 **권고**다. 각 앱은 측정된 `cache_read_input_tokens` 비율을 근거로 자체 정책을 조정할 수 있다.

---

## 1. 개요 — 왜 caching 이 중요한가

Anthropic prompt caching 은 반복되는 prefix 를 서버에 캐시해 두 가지 이득을 제공한다:

1. **비용** — cache read 는 base input 가격의 **0.1배** (90% 할인). cache write 는 1.25배 (5분 TTL) 또는 2배 (1시간 TTL) 의 premium 부담.
2. **지연시간** — 긴 system prompt + tools + document 를 매 호출마다 재처리하지 않아도 되므로 TTFB 감소.

전형적인 손익분기:
- **5분 TTL**: 2회 이상 재사용하면 이득 (1.25× write + 0.1× read × 1 = 1.35× vs 2× uncached)
- **1시간 TTL**: 3회 이상 재사용해야 이득 (2× write + 0.1× read × 2 = 2.2× vs 3× uncached)

출처: [Anthropic Prompt Caching Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), claude-api skill `shared/prompt-caching.md` (v2.1.117).

---

## 2. cache_control 문법 요약 (2026-04-22 기준)

### 2.1 타입과 TTL

현재 **`ephemeral`** 이 유일한 `type`. `persistent` 는 **확인 불가** (공식 문서에 기재 없음).

```jsonc
// 5분 TTL (default)
{ "cache_control": { "type": "ephemeral" } }

// 1시간 TTL (명시적)
{ "cache_control": { "type": "ephemeral", "ttl": "1h" } }
```

> **2026-03-06 변경점 주의**: Anthropic 이 기본 TTL 을 1시간 → 5분으로 silently 변경했다. 이전에 default 에 의존하던 코드는 `"ttl": "1h"` 를 **명시**해야 1시간 TTL 을 유지한다. 출처: [DEV Community — Anthropic Silently Dropped Prompt Cache TTL from 1 Hour to 5 Minutes](https://dev.to/whoffagents/anthropic-silently-dropped-prompt-cache-ttl-from-1-hour-to-5-minutes-16ao) (2026-03-06).

### 2.2 Breakpoint 개수 제한

**요청당 최대 4개**. 5번째를 추가하면 400 에러. Automatic top-level caching (`cache_control` 을 `messages.create()` 최상위에 추가) 도 4개 slot 중 1개를 소모한다.

출처: [Anthropic Prompt Caching Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) (2026-04-22 fetch). 인용: *"If 4 explicit block-level breakpoints already exist, the API returns a 400 error (no slots left for automatic caching)."*

### 2.3 지원 모델과 최소 cacheable prefix

| 모델 | 최소 token | 비고 |
|------|-----------|------|
| Claude Opus 4.7 | 4096 | 4.7 신 tokenizer 로 동일 텍스트 최대 +35% token ([tokenizer impact](https://www.claudecodecamp.com/p/i-measured-claude-4-7-s-new-tokenizer-here-s-what-it-costs-you)) |
| Claude Opus 4.6 | 4096 | |
| Claude Opus 4.5 | 4096 | legacy |
| Claude Sonnet 4.6 | 2048 | |
| Claude Sonnet 4.5 | 1024 | legacy |
| Claude Haiku 4.5 | 4096 | 변경 — 3.5 는 2048 이었음 |
| Claude Haiku 3.5 | 2048 | deprecated (2026-02-19 retired) |

**silent failure 주의**: prefix 가 최소값 미만이면 `cache_control` 을 붙여도 **silently 캐시 안 됨** (에러 없음, `cache_creation_input_tokens: 0`). 예: 3000-token prompt 는 Sonnet 4.5 에서는 cache 되지만 Opus 4.7 에서는 안 됨.

**모든 활성 Claude 모델은 prompt caching 을 지원한다.** 출처: Anthropic Docs — *"Prompt caching (both automatic and explicit) is supported on all active Claude models."*

### 2.4 cache_control 을 붙일 수 있는 위치

3군데 + top-level:

| 위치 | 예시 |
|------|------|
| `tools[i]` 배열의 tool 정의 | `tools[-1].cache_control = {"type": "ephemeral"}` |
| `system` 배열의 content block | `system[-1].cache_control = {...}` (string `system` 도 자동 처리) |
| `messages[i].content[j]` block | 모든 `text`/`image`/`tool_use`/`tool_result`/`document` block |
| **Top-level** (자동 배치) | `messages.create(cache_control={...}, ...)` — 마지막 cacheable block 에 자동 부착 |

### 2.5 Render order (prefix 구성)

Anthropic 이 prompt 를 렌더할 때 **항상 `tools` → `system` → `messages`** 순서. 따라서 `system` 에 breakpoint 하나를 찍으면 그 앞의 `tools` 전체도 함께 캐시된다.

---

## 3. 배치 원칙 — 언제 어디에 breakpoint

### 3.1 Stability-order 원칙

모든 prompt 를 **안정성 순서로 정렬** 한다. 안정 → 변동 방향이 유일한 정공법.

```
[Never changes]         — tools, frozen system prompt        ← breakpoint 1
[Changes per session]   — user persona, long-lived context    ← breakpoint 2
[Changes per request]   — retrieved docs, few-shot examples   ← breakpoint 3
[Changes per turn]      — current user question               ← no breakpoint
```

breakpoint 는 **안정성 경계에만** 찍는다. 4개 제한이 있으니 절약해 쓴다.

### 3.2 전형적 패턴 4가지

#### Pattern A — 큰 system prompt 공유 (가장 흔함)

```jsonc
{
  "model": "claude-opus-4-7",
  "system": [
    { "type": "text", "text": "<large shared system prompt>",
      "cache_control": { "type": "ephemeral" } }
  ],
  "messages": [ { "role": "user", "content": "..." } ]
}
```

첫 호출 = 1.25× write (5분 TTL). 이후 호출 = 0.1× read. tools 가 있으면 system breakpoint 하나로 `tools + system` 둘 다 캐시된다.

#### Pattern B — 멀티턴 대화 (chat app)

마지막 user turn 의 마지막 content block 에 breakpoint. 다음 호출은 이전 대화 전체를 prefix 로 재사용.

```python
# Python SDK 예시
messages[-1]["content"][-1]["cache_control"] = {"type": "ephemeral"}
```

대화가 길어져도 breakpoint 는 계속 전진. 이전 breakpoint 는 read-only cache hit 으로 유효 (20-block lookback window 내에서).

> **20-block lookback window**: 각 breakpoint 는 최대 20 개 content block 만 뒤로 스캔해서 prior cache 를 찾는다. 한 turn 에서 tool_use/tool_result 쌍이 많아 20 block 을 초과하면 cache miss. 긴 agentic loop 은 중간에 breakpoint 를 하나 더 찍는 것이 정답.

#### Pattern C — 긴 document 질의 (RAG 스타일)

```jsonc
{
  "system": "You analyze the following document.",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "<large document 50KB>",
        "cache_control": { "type": "ephemeral", "ttl": "1h" } },
      { "type": "text", "text": "<user question>" }
    ]
  }]
}
```

document 가 공유되고 question 만 바뀌는 경우. question 에는 breakpoint **안 찍음** (매번 달라짐).

#### Pattern D — Tools 정의 끝

많은 tool 을 가진 agent 는 `tools[-1]` 에 breakpoint. tools 전체가 캐시되어 mcp tool 호출 cost 가 대폭 절감.

```jsonc
{
  "tools": [
    { "name": "search", /*...*/ },
    { "name": "fetch", /*...*/ },
    { "name": "compute", "cache_control": { "type": "ephemeral" } }
  ]
}
```

### 3.3 해서는 안 되는 배치 (silent invalidators)

`cache_read_input_tokens` 가 0 이면 다음을 의심:

| 패턴 | 왜 깨지는가 |
|------|-----------|
| `datetime.now()` / `Date.now()` 를 system prompt 에 interpolate | prefix 가 매 호출 달라짐 |
| `uuid4()` / request ID 를 초반에 삽입 | 매번 unique prefix |
| `json.dumps(d)` without `sort_keys=True` | 비결정적 직렬화 → 바이트 다름 |
| 세션/유저 ID 를 system prompt 에 f-string interpolate | per-user prefix, 교차 공유 불가 |
| 조건부 system 섹션 (`if flag: system += ...`) | flag 조합마다 다른 prefix |
| `tools=build_tools(user)` 유저별 변동 | tools 는 position 0 — 전체 무효화 |
| 세션 중간에 MCP tool 추가/제거 | Claude Code 는 startup 에 tool 목록 잠금 — 수동 SDK 도 동일 원칙 적용 |
| 세션 중간에 model 변경 | cache 는 model-scoped, 전부 rebuild |

정공법: dynamic 한 조각은 **마지막 breakpoint 뒤**로 이동하거나, 결정론적으로 만들거나, 불필요하면 삭제.

---

## 4. 비용 모델 (2026-04-22 기준)

### 4.1 Multiplier

| 연산 | base 대비 | 근거 |
|------|----------|------|
| 5분 cache **write** | 1.25× | [Anthropic Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) |
| 1시간 cache **write** | 2× | 동일 |
| cache **read** (hit) | 0.1× | 동일 |
| uncached | 1.0× | base |

### 4.2 손익분기 (break-even)

```
5분 TTL : 1.25 + 0.1N vs (1+N) cold       → N ≥ 2 에서 이득
1시간 TTL: 2.0 + 0.1N vs (1+N) cold       → N ≥ 3 에서 이득
```

N = 재사용 횟수. **1회만 재사용하는 prefix 는 caching 적용 금지** — write premium 만 낸다.

### 4.3 Opus 4.7 tokenizer 영향

Opus 4.7 은 신 tokenizer 로 동일 텍스트가 Opus 4.6 대비 **최대 +35% token**. code/JSON 은 1.3–1.35×, prose 는 거의 동일. 영향:

- cold-start cache write 가 더 비쌈 (prefix 토큰 수 자체가 커짐)
- cache hit 비율은 유지되지만 절대 비용은 증가 가능
- 대응: **캐시 효율이 기존보다 더 중요해졌다** — Opus 4.7 로 전환 시 caching 미도입 앱은 즉시 배치 원칙 적용 권고

출처: [I Measured Claude 4.7's New Tokenizer](https://www.claudecodecamp.com/p/i-measured-claude-4-7-s-new-tokenizer-here-s-what-it-costs-you), [Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) (2026-04-22 fetch, tooltip: *"~555k words \ ~2.5M unicode characters (Opus 4.7 uses a new tokenizer)"*).

### 4.4 확인 지표

`response.usage` 객체의 3개 필드:

```python
response.usage.cache_creation_input_tokens  # 이번 write (1.25× 또는 2× 지불)
response.usage.cache_read_input_tokens      # 이번 read (0.1× 지불)
response.usage.input_tokens                 # uncached remainder (1.0× 지불)
```

**총 prompt 크기 = 3개의 합**. `input_tokens` 가 작아 보여도 agent 가 오래 돌았다면 나머지는 cache 에서 왔을 수 있다 — 세 필드 합으로 판단.

비율 목표:
- `cache_read / total ≥ 70%`: 양호
- `< 50%`: silent invalidator 의심, 즉시 조사

---

## 5. Claude Code 자동 caching 과의 관계

Claude Code harness (CLI) 는 **자동으로** prompt caching 을 사용한다. 사용자가 `cache_control` 을 직접 설정할 필요 없음. 근거: [Claude Code Model Config](https://code.claude.com/docs/en/model-config) (2026-04-22 fetch) — *"Claude Code automatically uses prompt caching to optimize performance and reduce costs."*

### 5.1 Claude Code 가 자동 처리하는 범위

- shared system prompt (모든 세션 공유)
- tool definitions (세션 시작 시 잠금)
- `CLAUDE.md` 파일 (project/user 공유)
- 대화 history (breakpoint 가 앞으로 전진하며 슬라이딩)

출처: [How Prompt Caching Actually Works in Claude Code](https://www.claudecodecamp.com/p/how-prompt-caching-actually-works-in-claude-code).

### 5.2 사용자가 제어할 수 있는 env var

| 변수 | 효과 |
|------|------|
| `DISABLE_PROMPT_CACHING=1` | 전체 모델 caching off (최상위 우선) |
| `DISABLE_PROMPT_CACHING_OPUS=1` | Opus 만 off |
| `DISABLE_PROMPT_CACHING_SONNET=1` | Sonnet 만 off |
| `DISABLE_PROMPT_CACHING_HAIKU=1` | Haiku 만 off |
| `ENABLE_PROMPT_CACHING_1H=1` (v2.1.108+) | 1시간 TTL 정책 활성화 — universe repo 는 이미 on |

출처: [Claude Code Model Config](https://code.claude.com/docs/en/model-config) → "Prompt caching configuration" 섹션.

### 5.3 언제 명시적 `cache_control` 이 필요한가

Claude Code 안에서는 불필요. **Member repo 의 Claude API 앱** (Anthropic SDK 를 직접 호출) 은 명시해야 한다:

- gistcore AI 스피킹 — 발음 평가 system prompt (큰 rubric) 캐싱 필수
- fortiscribe 라이팅 첨삭 — 문법 규칙 + 예시 세트 (5–10KB) 캐싱
- modfolio-pay invoice AI — 영수증 추출 prompt + few-shot examples
- 직접 호출하는 Worker/Cloudflare AI Gateway 라우팅 코드

이 경우 **섹션 3 배치 원칙 전체 적용**.

---

## 6. 다른 프로바이더와 비교 (2026-04 트렌드)

| 프로바이더 | 방식 | Discount | 기본 설정 |
|-----------|------|----------|----------|
| **Anthropic Claude** | **Explicit `cache_control` breakpoint** | 90% off read | 5분 TTL default (2026-03-06 변경), 1시간 TTL 명시 |
| **OpenAI** | 자동 (1024 token 이상 prefix 자동 감지) | 50% off input | 5–10분 비활성 후 만료 |
| **Google Gemini 2.5 (implicit)** | 자동 (2.5 Pro/Flash) | 75% off input | TTL 설정 불가, 자동 관리 |
| **Google Gemini (explicit cache)** | `CachedContent` 객체 | 75% off input | TTL 직접 설정 |

**트렌드 관찰**:
- OpenAI / Gemini 2.5 는 **implicit (자동)** 방향 — 개발자가 신경 쓰지 않아도 caching 적용
- Anthropic 은 **explicit 유지** — fine-grained control + 더 큰 discount (90% vs 50%)
- OpenAI 의 자동 방식이 "낮은 진입 장벽" 이라면 Anthropic 의 explicit 은 "고급 제어" 포지션
- 실제로 Claude Code 는 **explicit API 위에 자동 배치 로직** 을 올려 두 방식을 모두 구현 (member repo 도 동일 전략 가능)

출처: [TokenMix Prompt Caching Guide 2026](https://tokenmix.ai/blog/prompt-caching-guide), [PromptHub Blog](https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models), [Medium — Comparing Prompt Caching](https://medium.com/@m_sea_bass/comparing-prompt-caching-openai-anthropic-and-gemini-0eac16541898).

**표준화 전망**: 완전한 업계 표준은 없음. Anthropic-compatible 방식이 OpenRouter 같은 aggregator 를 통해 퍼지는 중 (Gemini 도 OpenRouter 에서는 `cache_control` breakpoint 문법 사용). 장기적으로 OpenAI 방식 (자동) 이 mass-market 표준이 될 가능성, Anthropic 방식은 agent/tool-heavy 워크로드의 "power user" 표준으로 공존.

---

## 7. Member Repo 적용 예시

### 7.1 TypeScript SDK (Cloudflare Worker)

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Pattern A — system prompt 캐싱 (gistcore AI 스피킹 rubric 스타일)
const response = await client.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 4096,
  system: [
    {
      type: "text",
      text: PRONUNCIATION_RUBRIC, // 15KB 의 평가 기준 + few-shot
      cache_control: { type: "ephemeral", ttl: "1h" },
    },
  ],
  messages: [
    { role: "user", content: userAudioTranscript },
  ],
});

// 측정
console.log({
  write: response.usage.cache_creation_input_tokens,
  read: response.usage.cache_read_input_tokens,
  fresh: response.usage.input_tokens,
});
```

### 7.2 Python SDK (invoice AI pipeline)

```python
import anthropic

client = anthropic.Anthropic()

# Pattern C — 긴 document 캐싱
response = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=2000,
    system="You extract structured fields from Korean tax invoices.",
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": INVOICE_EXTRACTION_EXAMPLES,  # 5KB few-shot
                "cache_control": {"type": "ephemeral", "ttl": "1h"},
            },
            {"type": "image", "source": {"type": "base64", "data": image_b64, "media_type": "image/png"}},
            {"type": "text", "text": "Extract the invoice fields as JSON."},
        ],
    }],
)

# 손익분기 체크: 이 prompt 를 이 시간 안에 3회 이상 호출하는가?
# - 예: 하나의 월별 배치 처리 수백 건 → 1h TTL 압도적 이득
# - 아니요: ad-hoc 1회 호출 → TTL 제거 또는 5m TTL
```

### 7.3 Top-level automatic 배치 (간단한 경우)

```python
response = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=1000,
    cache_control={"type": "ephemeral"},  # 마지막 cacheable block 에 자동 부착
    system=LARGE_SYSTEM_PROMPT,
    messages=[{"role": "user", "content": question}],
)
```

가장 단순. fine-grained 제어가 불필요할 때. 4개 breakpoint slot 중 1개를 자동 소모.

### 7.4 Fork/subagent pattern (잘못된 예 → 바른 예)

```python
# ❌ 잘못됨 — fork 가 parent prefix 를 재조립하면서 미세하게 다름
def summarize_in_fork(messages):
    return client.messages.create(
        model="claude-opus-4-7",  # 같음
        system=build_system_prompt(),  # ← 같은 함수지만 현재 시각 등 interpolate 가능성
        messages=messages,
    )

# ✅ 정공법 — parent 의 system/tools/model 을 바이트 수준 동일하게 재사용
def summarize_in_fork(parent_system, parent_tools, messages):
    return client.messages.create(
        model="claude-opus-4-7",
        system=parent_system,   # 바이트 동일
        tools=parent_tools,     # 바이트 동일, 정렬 유지
        messages=messages + [SUMMARIZE_HINT],  # 마지막에만 추가
    )
```

---

## 8. Anti-patterns (반드시 피할 것)

| 패턴 | 대안 |
|------|------|
| 모든 요청에 `cache_control` 무지성 추가 | 재사용 횟수 ≥ break-even 확인 후 적용 |
| 1시간 TTL 을 기본으로 사용 | 재사용 ≥ 3회 확실할 때만. 아니면 5분 유지 |
| system prompt 맨 앞에 `now()` / request ID 삽입 | 변동 context 는 마지막 user message 로 이동 |
| 세션 중간에 tool 목록 변경 | 세션 시작 시 tool 전체 잠금 (Claude Code 방식 차용) |
| cache 효과를 측정 없이 가정 | `usage.cache_read_input_tokens` 비율 로그 필수 |
| Opus 4.6 → 4.7 전환 시 기존 breakpoint 그대로 | model 변경 = cache 전부 rebuild. 전환 직후 첫 호출은 write premium |

---

## 9. Member Repo 체크리스트

Claude API SDK 를 직접 호출하는 member repo (gistcore, fortiscribe, modfolio-pay 등) 는 다음을 확인:

- [ ] `system` prompt 가 stable 한가? (`now()`, `uuid` 없음)
- [ ] `tools` 는 결정론적으로 정렬되어 있는가? (`sort` by name)
- [ ] `cache_control` 배치 위치가 안정성 경계에 있는가?
- [ ] 최소 prefix token (Opus 4.7/Haiku 4.5 = 4096, Sonnet 4.6 = 2048) 을 넘기는가?
- [ ] `response.usage.cache_read_input_tokens` 를 Langfuse/SigNoz 에 기록하는가?
- [ ] `cache_read / total ≥ 70%` 목표 달성 중인가?
- [ ] fork/subagent 호출 시 parent prefix 를 바이트 수준 재사용하는가?
- [ ] Opus 4.7 로 모델 변경 시 첫 호출 premium 을 감안한 cost 재계산이 되었는가?

---

## 11. Cache-read KPI 측정 (v2.12 추가)

프로덕션에서 cache 작동을 검증하려면 Langfuse/SigNoz 에서 아래 지표를 관찰한다. 목표 수치 70%+ cache-read ratio (Anthropic 권장 heuristic).

### 핵심 KPI

```text
cache_hit_ratio = gen_ai.usage.cache_read.input_tokens
               / (gen_ai.usage.cache_read.input_tokens
                  + gen_ai.usage.cache_creation.input_tokens
                  + gen_ai.usage.input_tokens)
```

분모의 세 항목은 mutually exclusive 하게 기록되므로 합은 총 input token. cache_read 가 높을수록 cache 활용 양호.

### SigNoz 쿼리 (PromQL-like)

```promql
# 최근 1h cache-hit ratio (모든 모델)
sum(rate(gen_ai_usage_cache_read_input_tokens_total[1h]))
/
sum(rate(gen_ai_usage_cache_read_input_tokens_total[1h])
    + rate(gen_ai_usage_cache_creation_input_tokens_total[1h])
    + rate(gen_ai_usage_input_tokens_total[1h]))
```

모델별 분리:

```promql
sum by (gen_ai_request_model) (...)
```

### Langfuse 쿼리 (generation view)

Langfuse 는 `cacheReadInputTokens`, `cacheCreationInputTokens`, `promptTokens` 를 자동 매핑. UI filter:

- Observations → Generations → filter by `model`
- Column: `Cache read tokens / Total input tokens` (custom metric — Analytics → Create metric)

### 경보 기준

- `cache_hit_ratio < 0.3` 지속 1h → system prompt 가 안정적이지 않거나 breakpoint 위치가 잘못됨. §3 배치 원칙 재검토.
- `cache_creation` 증가하는데 `cache_read` 증가 안 함 → write 만 하고 hit 은 없음 = prefix 가 매 호출마다 달라짐. 세션당 fresh context 주입 중인지 확인.
- Opus 4.7 → 첫 호출 premium (5m TTL 기준 1.25×). 첫 호출 비중 감안한 비용 재계산 필요.

### harness-pull 의 prompt-cache-audit (v2.12 추가)

`scripts/harness-pull/prompt-cache-audit.ts` 가 member repo 의 `@anthropic-ai/sdk` 의존 + `cache_control` 토큰 사용 수를 INFO 로 보고. `pull-manifest.json.promptCacheAudit.advisories` 로 각 member 가 대략의 cache 준비도 확인 가능.

---

## 10. 출처

### 공식 문서 (primary)

- [Anthropic Prompt Caching Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — cache_control 문법, TTL, breakpoint 한도, 최소 token, 지원 모델, 비용 multiplier (2026-04-22 fetch)
- [Claude Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) — Opus 4.7 tokenizer 변경 주석, context window, pricing (2026-04-22 fetch)
- [Claude Code Model Config — Prompt caching configuration](https://code.claude.com/docs/en/model-config) — Claude Code 자동 caching + `DISABLE_PROMPT_CACHING*` env var (2026-04-22 fetch)
- claude-api skill v2.1.117 (`shared/prompt-caching.md`, `shared/agent-design.md`) — prefix 불변성, 20-block lookback, invalidation hierarchy (skill bundle, 2026-04-15 cached)

### 보조 분석 (secondary)

- [DEV Community — Anthropic Silently Dropped Prompt Cache TTL from 1 Hour to 5 Minutes](https://dev.to/whoffagents/anthropic-silently-dropped-prompt-cache-ttl-from-1-hour-to-5-minutes-16ao) — 2026-03-06 default TTL 변경 기록
- [ClaudeCodeCamp — How Prompt Caching Actually Works in Claude Code](https://www.claudecodecamp.com/p/how-prompt-caching-actually-works-in-claude-code) — Claude Code 아키텍처, MCP tool lock-at-startup
- [ClaudeCodeCamp — I Measured Claude 4.7's New Tokenizer](https://www.claudecodecamp.com/p/i-measured-claude-4-7-s-new-tokenizer-here-s-what-it-costs-you) — Opus 4.7 tokenizer 측정
- [TokenMix — Prompt Caching Guide 2026](https://tokenmix.ai/blog/prompt-caching-guide) — OpenAI/Anthropic/Gemini 비교
- [PromptHub Blog — Prompt Caching with OpenAI, Anthropic, Google Models](https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models) — implicit vs explicit 대비
- [Medium — Comparing Prompt Caching](https://medium.com/@m_sea_bass/comparing-prompt-caching-openai-anthropic-and-gemini-0eac16541898) — 가격 구조 비교
- [AICheckerHub — Anthropic Prompt Caching in 2026](https://aicheckerhub.com/anthropic-prompt-caching-2026-cost-latency-guide) — 2026 비용/지연 가이드

### 관련 생태계 canon

- [prompt-caching-strategy.md](prompt-caching-strategy.md) — Claude Code harness 내부 1h vs 5m TTL 운영 정책 (`ENABLE_PROMPT_CACHING_1H`)
- [opus-4-7-effort-policy.md](opus-4-7-effort-policy.md) — 4.7 tokenizer 영향 + effort 레벨
- [cost-attribution.md](cost-attribution.md) — cache hit rate × 요금 모델 = 실제 비용
- [tech-trends-2026-04.md](tech-trends-2026-04.md) — v2.11 흡수 후보 목록에서 "Anthropic prompt caching breakpoint" 가 이 canon 으로 승격

### 확인 불가 항목 (transparent gaps)

- `type: "persistent"` 옵션 — 2026-04-22 기준 공식 문서에 기재 없음, 추정 금지
- OpenAI automatic caching 의 정확한 minimum prefix 변경 이력 — 1024 token 고정 vs 모델별 차등, 출처 간 상충
- Gemini implicit cache 의 TTL — 공식 문서 상 "automatic" 만 표기, 수치 미공개

---

## 갱신 이력

- **2026-04-22 v1.0.0** — 초판. Anthropic 공식 문서 + 2026-03-06 TTL 변경 + Claude Code 자동 caching + Opus 4.7 tokenizer 영향 반영. member repo 관점의 배치 원칙 + SDK 코드 샘플 포함. `prompt-caching-strategy.md` (harness 운영) 와 교차 참조.
