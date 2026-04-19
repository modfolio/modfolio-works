---
name: drizzle-patterns
description: Drizzle ORM 규칙 (prefix, helpers, migrations)
user-invocable: true
---

## Auto Context
@knowledge/canon/drizzle-conventions.md

# Drizzle ORM — 생태계 규칙

> 5개 이상 앱에서 사용하는 Drizzle ORM 공통 패턴.

## 테이블 Prefix 규칙

앱 약어 2글자를 prefix로 사용. 다른 앱의 DB와 혼동 방지.

| Prefix | 앱 | DB |
|--------|----|----|
| `mc_` | modfolio-connect | D1 |
| `ma_` | modfolio-admin | D1 |
| `mp_` | modfolio-pay | Neon |
| `gc_` | gistcore | Neon |
| `sc_` | sincheong | Neon |
| `mf_` | modfolio (main) | Neon |
| `fs_` | fortiscribe | Neon |
| `na_` | naviaca | Neon |
| `wt_` | worthee | Neon |
| `pp_` | modfolio-press | Neon |
| `kb_` | keepnbuild | Turso |
| `as_` | amberstella | D1 |
| `ms_` | munseo | D1 |
| `uc_` | umbracast | D1 |

## Helper 함수

모든 Neon 프로젝트에서 공통 사용:

```typescript
import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Primary Key — UUID v4
const pk = () => uuid("id").default(sql`gen_random_uuid()`).primaryKey();

// Created At — 기본값 now()
const nowCol = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

// Updated At — 기본값 now()
const updatedAtCol = () =>
  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();
```

D1 프로젝트:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Primary Key — nanoid 또는 text
const pk = () => text("id").primaryKey();

// Created At — Unix timestamp
const nowCol = () =>
  integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`);
```

## 컬럼 명명 규칙

- **SQL**: `snake_case` (`user_id`, `created_at`, `event_type`)
- **TypeScript**: `camelCase` (Drizzle가 자동 매핑)
- `references()`로 FK 선언 시 `.onDelete("cascade")` 명시

```typescript
export const orders = pgTable("mp_orders", {
  id: pk(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: orderStatusEnum("status").notNull().default("pending"),
  amount: integer("amount").notNull(),
  metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
  createdAt: nowCol(),
  updatedAt: updatedAtCol(),
}, (table) => [
  index("mp_orders_user_id_idx").on(table.userId),
  index("mp_orders_status_idx").on(table.status),
]);
```

## Enum 패턴

```typescript
import { pgEnum } from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("mp_order_status", [
  "pending", "paid", "cancelled", "refunded", "partial_refund", "failed"
]);
```

## JSONB 타입 안전

```typescript
metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
items: jsonb("items").$type<Array<{ name: string; qty: number; price: number }>>(),
```

## 인덱스 권장 패턴

- 일반적으로 Foreign Key 컬럼과 status/type 컬럼에 인덱스가 유용 (앱 자율)
- **명명**: `{prefix}_{table}_{column}_idx`
- **복합**: 자주 함께 조회하는 컬럼 조합

## Neon 연결

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);  // pooled connection string
  return drizzle(sql, { schema });
}
```

환경변수: `DATABASE_URL` — Neon Console에서 **pooled** connection string 사용.

## D1 연결

```typescript
import { drizzle } from "drizzle-orm/d1";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

// hooks.server.ts에서:
const db = createDb(platform.env.DB);
```

### D1 Global Read Replicas + Sessions API (2026 GA)

read-after-write 일관성이 필요한 경로:

```typescript
// 요청 진입 시 bookmark 복원
const bookmark = request.headers.get('x-d1-bookmark') ?? 'first-unconstrained';
const session = platform.env.DB.withSession(bookmark);
const db = drizzle(session, { schema });

// 응답 전 새 bookmark 내보내기
response.headers.set('x-d1-bookmark', session.getBookmark() ?? '');
```

- `'first-unconstrained'` — fastest replica (stale 허용, 기본)
- `'first-primary'` — primary 강제 (latest)
- 임의 bookmark — 해당 시점 이후 replica

상세: `canon/d1-read-replicas.md`.

## 마이그레이션

- **Dev**: `bunx drizzle-kit push` (빠른 프로토타이핑)
- **Production**: `bunx drizzle-kit generate` → SQL 파일 생성 → `bunx drizzle-kit migrate`
- D1: `wrangler d1 migrations apply {db-name}` 또는 HTTP endpoint

## 상세 참조

- 전체 prefix 테이블 + helper 소스코드: `knowledge/references/ecosystem-drizzle-conventions.md`
