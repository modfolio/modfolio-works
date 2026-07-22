---
title: Wrangler Standards 2026
version: 1.1.0
last_updated: 2026-07-04
source: [knowledge/canon/wrangler-standards-2026.md]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [deploy, new-app, observability]
---

# Wrangler Standards 2026 — 참조용

> **권고이며 강제가 아니다.** `wrangler.jsonc` / `wrangler.toml`은 harness-pull의 **identity file**로 분류되어 universe가 덮어쓰지 않는다. 이 문서는 참조 템플릿 — 각 앱 owner가 자율 반영.

## 공통 권장값 (2026-04 기준)

```jsonc
{
  "name": "your-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-04-15",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

### Dynamic Workers + DO Facets

`streams_enable_constructors` flag 추가:

```jsonc
{
  "compatibility_flags": ["nodejs_compat", "streams_enable_constructors"]
}
```

## 바인딩 템플릿

### D1 (Read Replicas 자동 활용)

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "app_main",
      "database_id": "YOUR-D1-ID",
      "migrations_dir": "drizzle"
    }
  ]
}
```

Read replicas는 자동 생성 (설정 불필요). Sessions API로 일관성 제어 — `canon/d1-read-replicas.md`.

### R2

```jsonc
{
  "r2_buckets": [
    { "binding": "BUCKET", "bucket_name": "app-assets" }
  ]
}
```

### Durable Objects (KV-backed, 전통)

```jsonc
{
  "durable_objects": {
    "bindings": [
      { "name": "RATE_LIMITER", "class_name": "RateLimiterDO" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_classes": ["RateLimiterDO"] }
  ]
}
```

### Durable Objects (SQLite-backed Facets, 2026-04 신규)

```jsonc
{
  "durable_objects": {
    "bindings": [
      { "name": "PER_TENANT", "class_name": "PerTenantAgent" }
    ]
  },
  "migrations": [
    { "tag": "v2", "new_sqlite_classes": ["PerTenantAgent"] }
  ]
}
```

**주의**: 기존 `new_classes` DO를 `new_sqlite_classes`로 강제 이관 금지. 신규 클래스만 SQLite-backed. 상세: `canon/cross-worker-do-pattern.md §Facets`.

### Cross-worker DO

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "RATE_LIMITER",
        "class_name": "RateLimiterDO",
        "script_name": "other-worker-name"
      }
    ]
  }
}
```

### Queues

```jsonc
{
  "queues": {
    "producers": [{ "binding": "QUEUE", "queue": "my-queue" }],
    "consumers": [{ "queue": "my-queue", "max_batch_size": 10 }]
  }
}
```

### Workflows V2

```jsonc
{
  "workflows": [
    { "binding": "MY_WORKFLOW", "name": "my-workflow", "class_name": "MyWorkflow" }
  ]
}
```

Limits: 50K concurrent / 2M queued / 300/sec creation.

### Browser Run

```jsonc
{
  "browser": { "binding": "BROWSER" }
}
```

### AI Gateway

```jsonc
{
  "ai": { "binding": "AI" }
}
```

Unified billing: Bedrock/Anthropic/OpenAI 제3자 모델도 CF 청구서로 통합.

### Secrets Store (Beta)

```jsonc
{
  "secrets_store_secrets": [
    { "binding": "STRIPE_SECRET", "store_id": "YOUR-STORE", "secret_name": "stripe_key" }
  ]
}
```

한도: 100 secrets/account.

## 프레임워크별 build 블록

### SvelteKit 5 (adapter-cloudflare v7.2+)

```jsonc
{
  "main": ".svelte-kit/cloudflare/_worker.js",
  "assets": { "directory": ".svelte-kit/cloudflare", "binding": "ASSETS" }
}
```

### Astro 6 (adapter-cloudflare v13+)

```jsonc
{
  "main": "./dist/_worker.js/index.js",
  "assets": { "directory": "./dist", "binding": "ASSETS" }
}
```

### Hono (CF Workers)

```jsonc
{
  "main": "src/index.ts"
}
```

### SolidStart (Vinxi preset cloudflare)

```jsonc
{
  "main": "dist/server/index.mjs",
  "assets": { "directory": "dist/public", "binding": "ASSETS" }
}
```

### Nuxt 3 (Nitro preset cloudflare)

```jsonc
{
  "main": ".output/server/index.mjs",
  "assets": { "directory": ".output/public", "binding": "ASSETS" }
}
```

### Qwik City

```jsonc
{
  "main": "server/entry.cloudflare-workers.mjs"
}
```

## Pages → Workers 마이그레이션

이미 2026-04 생태계 표준 방향. 세부: `canon/gotchas.md §CF Pages → Workers 마이그레이션`.

## dev 명령 쿼크 — `bunx --bun vite dev` 금지 (pdgd 2026-07-04 실측)

CF Workers + Vite(`@astrojs/cloudflare`·SvelteKit `adapter-cloudflare` 등) `platformProxy`(miniflare) 로컬 개발에서:

- ❌ **`bunx --bun vite dev`** — 앱은 뜨나 **miniflare `platformProxy` 의 R2 body 스트리밍이 전면 500**(에러 `undefined` — R2 `put` 은 되고 `get` 서빙만 죽음). Bun 런타임에서 `ReadableStream` 프록시 파손.
- ❌ **`bunx vite dev`**(--bun 없이) — bunx 가 프로젝트 `node_modules` 를 무시하고 **latest vite 를 새로 받아 실행**(전 라우트 404·전역 캐시 lockfile 저장).
- ✅ **정답: `cd <app> && bun run dev`** — 프로젝트 로컬 바이너리 + node 런타임. R2 platformProxy 정상.

CF Workers + vite platformProxy 를 쓰는 sibling 전체 해당. 로컬 dev 가 이상하면 실행 명령부터 확인.

## 참조

- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Compatibility Flags](https://developers.cloudflare.com/workers/configuration/compatibility-flags/)
- [Workers Observability](https://developers.cloudflare.com/workers/observability/)
