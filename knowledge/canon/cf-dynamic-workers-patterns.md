---
title: CF Dynamic Workers Patterns
version: 1.0.0
last_updated: 2026-04-17
source: [knowledge/canon/cf-dynamic-workers-patterns.md]
sync_to_children: true
consumers: [new-app, deploy, ai-patterns]
---

# Cloudflare Dynamic Workers Patterns

> 2026-03-24 Open Beta. AI agent 전용 isolate 실행 환경. containers 대비 100x 빠르고 메모리 100x 효율. **1 agent = 1 Worker + 1 SQLite DB** 패턴의 실행 기반.

## 무엇이 다른가

| 항목 | 전통 Worker | Container | Dynamic Worker |
|------|-----------|-----------|----------------|
| 실행 단위 | 공유 isolate | 독립 VM | 독립 isolate |
| startup | ms | seconds | ms |
| 메모리 오버헤드 | 낮음 | 높음 | 낮음 |
| 격리 수준 | script 수준 | VM 수준 | isolate 수준 |
| AI 코드 실행 | 권장 안 함 | 권장 | **권장** |

## 언제 쓰는가

- AI가 생성한 코드를 안전한 sandbox에서 실행 (gistcore 툴 실행, ANF mentor response 처리)
- per-tenant 격리가 필요한 multi-tenant agent
- 긴 실행 + 재시작 회복이 필요한 세션

## Durable Object Facets 통합

Dynamic Workers는 **DO Facets**와 함께 출시. 각 DO 인스턴스가 격리된 SQLite 데이터베이스를 보유.

```jsonc
{
  "compatibility_flags": ["nodejs_compat", "streams_enable_constructors"],
  "durable_objects": {
    "bindings": [
      { "name": "AGENT", "class_name": "AppRunner" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["AppRunner"] }
  ]
}
```

상세: `canon/cross-worker-do-pattern.md §Facets`.

## 실행 패턴 (Project Think 기반)

```typescript
import { Agent } from '@cloudflare/agents';

export class AppRunner extends Agent<Env> {
  async onStart() {
    // idle cost = 0 — DO hibernation
  }

  async execute(userInput: string) {
    // Durable Execution — crash 후 자동 재개 (fibers)
    const plan = await this.think({ prompt: userInput });
    return await this.runTool(plan);
  }

  async persistSession(turnId: string, message: unknown) {
    // Persistent Sessions 트리 구조
    this.sql.exec(
      `INSERT INTO sessions (turn_id, message) VALUES (?, ?)`,
      turnId,
      JSON.stringify(message),
    );
  }
}
```

## idle cost = 0 (핵심 가치)

DO hibernation 덕분에 요청이 없을 때 compute 과금 중단. 사용자가 5분 자리를 비워도 session 상태 손실 없이 즉시 재개.

## Modfolio 적용 후보

| 앱 | 시나리오 | 상태 |
|----|---------|------|
| gistcore | AI 튜터 세션 (28 tool types) | candidate — 1순위 |
| modfolio (Main) | LangGraph Manager Agent 대체 검토 | candidate |
| modfolio-admin | step-up MFA flow per-tenant | candidate |
| ANF | Mentor Studio 세션 관리 | candidate (Phase 3) |

## 마이그레이션 주의

- 기존 Worker를 Dynamic Worker로 **강제 이관 금지**. 신규 agent 전용 워크로드만 평가
- Containers를 쓰는 앱(umbracast yt-dlp)은 Containers 유지 — Dynamic Workers는 isolate 기반이라 네이티브 바이너리 불가

## 참조

- [Dynamic Workers Blog](https://blog.cloudflare.com/dynamic-workers/)
- [Dynamic Workers Open Beta](https://developers.cloudflare.com/changelog/post/2026-03-24-dynamic-workers-open-beta/)
- [Project Think](https://blog.cloudflare.com/project-think/)
- [DO Facets](https://blog.cloudflare.com/durable-object-facets-dynamic-workers/)
