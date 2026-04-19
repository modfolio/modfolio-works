---
name: ai-patterns
description: AI 모델 라우터 구현, 멀티 프로바이더 fallback/캐싱 필요 시 사용
user-invocable: true
---

# AI Patterns — Model Router + Fallback Chain

> modfolio (LangGraph)와 gistcore (OpenRouter)에서 검증된 AI 통합 패턴.

## Multi-Provider Architecture

```
사용자 요청
  ↓
Task Router (요청 분류)
  ↓
Provider Selection
  ├── OpenAI (primary, 유료)
  ├── OpenRouter (diversity, 유/무료 혼합)
  ├── CF AI Gateway (Bedrock/Anthropic/OpenAI 통합 라우팅 + Unified Billing)
  └── Free Models (dev/fallback)
  ↓
Completion + Usage Tracking
```

## CF AI Gateway Unified Billing (2026-04 신규)

Bedrock/Anthropic/OpenAI/Azure를 단일 CF 계정으로 통합 청구·라우팅. 별도 계약 없이 CF 청구서에서 결제. 자동 로깅·캐시·분석·폴백·retry 제공.

```typescript
const response = await fetch(
  `https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/anthropic/v1/messages`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.ANTHROPIC_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages,
    }),
  },
);
```

## Cloudflare Agents SDK V2 (Project Think, 2026-04)

Durable Execution (crash 자동 재개) + Persistent Sessions (트리 구조) + idle cost = 0 (DO hibernation).

```typescript
import { Agent } from '@cloudflare/agents';

export class AppAgent extends Agent<Env> {
  async execute(input: string) {
    // Durable Execution: crash 후 자동 재개
    return await this.think({ prompt: input });
  }
}
```

**도입 주의**: 기존 LangGraph 운영 앱은 V2 병행 비용. ADR로 결정. 상세: `canon/agents-sdk-v2-patterns.md`.

## MCP Code Mode (토큰 99.9% 절감)

MCP 서버의 수백 도구를 직접 노출하는 대신 `search()` + `execute()` 2개만 노출:

```typescript
const tools = await mcp.search({ query: 'send email' });
const result = await mcp.execute({ toolId: tools[0].id, args: { to, body } });
```

## Free Model Fallback Chain

비용 없이 AI 기능을 제공하는 fallback 체인:

```typescript
const EVAL_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwen3-4b:free",
] as const;

for (const model of EVAL_MODELS) {
  try {
    const result = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      messages,
    });
    return parseResponse(result);
  } catch {
    continue; // 다음 모델 시도
  }
}
throw new Error("All models failed");
```

## Prompt Caching (Static Prefix)

비용 절감 + 응답 속도 향상:

```typescript
// 캐시 대상 (매 요청 동일)
const staticPrefix = [
  { role: "system", content: SYSTEM_PROMPT },
  ...FEW_SHOT_EXAMPLES,  // 3-5개 예시
];

// 매 요청 변경
const dynamicSuffix = [
  { role: "user", content: userInput },
];

const messages = [...staticPrefix, ...dynamicSuffix];
```

OpenAI/Anthropic 모두 자동으로 동일 prefix를 캐시.

## Task-Based Routing

```typescript
interface ModelConfig {
  provider: "openai" | "openrouter" | "cloudflare";
  model: string;
  maxTokens: number;
  temperature: number;
}

const TASK_MODELS: Record<string, ModelConfig> = {
  classification: { provider: "openrouter", model: "qwen3-4b:free", ... },
  evaluation: { provider: "openrouter", model: "llama-3.3-70b:free", ... },
  generation: { provider: "openai", model: "gpt-4o-mini", ... },
  complex: { provider: "openai", model: "gpt-4o", ... },
};
```

## SSE Streaming (SvelteKit)

```typescript
// +server.ts
export const POST: RequestHandler = async ({ request }) => {
  const stream = new ReadableStream({
    async start(controller) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        stream: true,
      });

      for await (const chunk of completion) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
      }
      controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
```

## Usage Tracking

```typescript
// DB 테이블
export const aiUsage = pgTable("ai_usage", {
  id: pk(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  costUsd: real("cost_usd"),
  taskType: text("task_type"),
  createdAt: nowCol(),
});
```

## LangGraph Multi-Agent (modfolio)

```
사용자 메시지
  ↓
Manager Agent (의도 분류)
  ├── Responder (대화 응답)
  ├── ToolExecutor (시스템 액션: 목표/지식/신호 CRUD)
  └── Librarian (백그라운드 PKG edge 수집)
  ↓
Personal Knowledge Graph 컨텍스트 주입
  ↓
응답 생성
```

## 환경변수

| 변수 | 용도 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API |
| `OPENROUTER_API_KEY` | OpenRouter API (다중 모델 접근) |

## Error Handling 원칙

1. Provider 실패 → 다음 모델 자동 시도
2. 모든 모델 실패 → 사용자에게 graceful 메시지 ("잠시 후 다시 시도해주세요")
3. Timeout → AbortController로 30초 제한
4. Rate limit → 429 감지 시 다음 provider로 즉시 전환
