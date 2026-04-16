---
title: Drizzle Conventions
version: 1.1.0
last_updated: 2026-04-05
source: [knowledge/references/ecosystem-drizzle-conventions.md, .claude/skills/drizzle-patterns/SKILL.md]
sync_to_children: true
consumers: [drizzle-patterns, schema, migration, schema-builder]
---

# Drizzle Conventions — Canonical Reference

> 생태계 전체 Drizzle ORM 규칙. 앱별 prefix로 테이블 네임스페이스 분리.

## App-Prefix 테이블 명명

각 앱은 고유 prefix로 테이블을 구분:

| 앱 | Prefix | 예시 |
|----|--------|------|
| naviaca | `naviaca_` | `naviaca_students`, `naviaca_courses` |
| gistcore | `gistcore_` | `gistcore_sessions`, `gistcore_feedbacks` |
| modfolio-pay | `pay_` | `pay_transactions`, `pay_invoices` |
| modfolio-connect | `connect_` | `connect_users`, `connect_sessions` |
| fortiscribe | `fortiscribe_` | `fortiscribe_writings` |

**규칙**: SQL은 `snake_case`. TypeScript 모델은 `camelCase`.

## Helper 함수

### pk() — Primary Key

```typescript
import { text } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const pk = () => text('id').primaryKey().$defaultFn(() => createId());
```

### nowCol() — Timestamp

```typescript
import { timestamp } from 'drizzle-orm/pg-core';

export const nowCol = (name: string) =>
  timestamp(name, { mode: 'date' }).defaultNow().notNull();
```

### Timestamp 컬럼 (권장 패턴)

일반적인 mutable 테이블에는 `createdAt` + `updatedAt`가 감사/디버깅에 유용:

```typescript
export const myTable = pgTable('app_my_table', {
  id: pk(),
  // ... 도메인 컬럼
  createdAt: nowCol('created_at'),
  updatedAt: nowCol('updated_at'),
});
```

Lookup/reference-only 테이블, append-only 로그 테이블 등은 생략 가능 — 앱 자율.

## FK → Index (권장)

외래키에 인덱스를 동반하는 것이 대부분의 워크로드에서 유리. read 빈도가 낮은
관리 테이블 등에서는 앱 판단으로 생략 가능:

```typescript
export const posts = pgTable('app_posts', {
  id: pk(),
  authorId: text('author_id').notNull().references(() => users.id),
}, (t) => [
  index('app_posts_author_idx').on(t.authorId),
]);
```

## JSONB 타입 안전 (권장 패턴)

```typescript
import { jsonb } from 'drizzle-orm/pg-core';

type Metadata = { tags: string[]; version: number };

export const items = pgTable('app_items', {
  metadata: jsonb('metadata').$type<Metadata>().default({}),
});
```

`$type<>()` 사용 시 타입 안전. raw `jsonb()` 단독도 기술적으로 가능하지만 타입 추적이 어려워짐.

## DB별 연결

### Neon (Postgres)

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });
```

### D1 (Cloudflare)

```typescript
import { drizzle } from 'drizzle-orm/d1';

export const db = drizzle(env.DB, { schema });
```

## Migration Workflow

```bash
# 1. 스키마 변경 후 마이그레이션 생성
bunx drizzle-kit generate

# 2. 생성된 SQL 검토
cat drizzle/0001_*.sql

# 3. 적용 (Neon)
bunx drizzle-kit migrate

# 3. 적용 (D1)
bunx --bun wrangler d1 migrations apply DB_NAME --local   # 로컬
bunx --bun wrangler d1 migrations apply DB_NAME --remote   # 프로덕션
```

### 안전 규칙

- `ALTER TABLE ... DROP COLUMN` 전에 코드에서 해당 컬럼 참조 제거 확인
- `NOT NULL` 추가 시 기존 데이터에 기본값 설정 필수
- 인덱스 생성은 `CREATE INDEX CONCURRENTLY` 사용 (Neon)

## Schema Split Threshold

단일 `schema.ts`가 500 LOC를 넘기면 도메인별 분할을 검토가 아니라 기본값으로 본다.

```text
src/lib/db/schema/
  core.ts
  billing.ts
  subscriptions.ts
  wallet.ts
  events.ts
  relations.ts
  index.ts
```

- `index.ts`에서 re-export 하여 기존 import 경로 호환 유지
- `drizzle.config.ts`는 `schema/*.ts` glob 또는 index entry를 읽게 설정
- FK는 arrow function reference를 유지하고 domain 파일 간 import cycle을 피한다
- relation 선언은 `relations.ts`로 집중시키는 쪽을 우선 검토
