---
title: Cloudflare Agents SDK V2 Patterns
version: 1.0.0
last_updated: 2026-04-17
source: [knowledge/canon/agents-sdk-v2-patterns.md]
sync_to_children: true
consumers: [ai-patterns, new-app]
---

# Cloudflare Agents SDK V2 — Project Think

> 2026-04-13 발표. 전면 재설계된 agent 런타임. Durable Execution + Persistent Sessions + Sandboxed Code Execution. **idle cost = 0** (DO hibernation).

## 핵심 기능

### 1. Durable Execution (fibers)

Agent가 실행 중 crash가 나도 자동 재개. fiber 기반 checkpoint로 툴 호출이나 thinking step 단위로 복구.

### 2. Persistent Sessions (트리 구조)

메시지를 선형 리스트가 아닌 트리로 저장. branching conversation, undo/redo, A/B compare 자연 지원.

### 3. Sandboxed Code Execution

agent가 임의 코드 실행할 때 Dynamic Worker isolate로 격리. 악성 코드 실행으로부터 host agent 보호.

### 4. idle cost = 0

Durable Object hibernation 활용. 사용자 idle 시 compute 중단, state 보존. 재접속 시 즉시 재개.

## 기본 Agent 구현

```typescript
import { Agent } from '@cloudflare/agents';

export interface Env {
  AGENT: DurableObjectNamespace<AppAgent>;
  AI: Ai;
}

export class AppAgent extends Agent<Env> {
  async onStart() {
    // session resume logic
  }

  async think(prompt: string) {
    return await this.env.AI.run('@cf/meta/llama-3.1-8b', {
      messages: [{ role: 'user', content: prompt }],
    });
  }

  async executeTool(name: string, args: unknown) {
    // Sandboxed Code Execution
    return await this.sandbox.execute({ command: ['node', '-e', '...'], args });
  }
}
```

## wrangler.jsonc

```jsonc
{
  "compatibility_date": "2026-04-15",
  "compatibility_flags": ["nodejs_compat", "streams_enable_constructors"],
  "durable_objects": {
    "bindings": [
      { "name": "AGENT", "class_name": "AppAgent" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["AppAgent"] }
  ],
  "ai": { "binding": "AI" }
}
```

## MCP 통합 — Code Mode

Agents SDK V2는 MCP 서버의 수백 개 도구를 직접 노출하는 대신, **search() + execute() 2개 도구**로 추상화. 토큰 99.9% 절감.

```typescript
async discoverTools(query: string) {
  // CF MCP server: 3000+ API endpoint를 search() 하나로
  const tools = await this.mcp.search({ query });
  return tools;  // top-k only
}

async invokeTool(toolId: string, args: unknown) {
  return await this.mcp.execute({ toolId, args });
}
```

## Modfolio 적용 후보 (candidate)

| 앱 | 현 상태 | V2 이점 |
|----|--------|---------|
| gistcore | 28 tool types, 26 function-calling | Durable Execution으로 세션 재개 안정화, 토큰 절감 |
| modfolio (main) | LangGraph Manager Agent 운영 | LangGraph → V2 마이그 ADR 필요. idle cost 0 가치 큼 |
| modfolio-admin | step-up MFA flow | 세션 연속성 + Sandboxed execution |

## 도입 주의

- **LangGraph 중복 투자**: 이미 LangGraph로 운영 중이면 V2 도입은 병행 비용. ADR로 결정
- **provider SDK 호환**: Anthropic SDK 직접 호출 vs AI Gateway 경유 vs Workers AI 바인딩 — 선택지 분석 필요
- **Durable Object cost**: idle = 0이지만 active 시 GB-sec 과금. 요청당 runtime budget 관찰

## 참조

- [Project Think 공식](https://blog.cloudflare.com/project-think/)
- [Agents Week 전체](https://www.cloudflare.com/agents-week/updates/)
- [Agents SDK Docs](https://developers.cloudflare.com/agents/)
- [MCP Servers for CF](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/)
- [Code Mode Blog](https://blog.cloudflare.com/code-mode-mcp/)
