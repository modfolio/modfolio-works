---
title: D1 Global Read Replicas & Sessions API
version: 1.0.0
last_updated: 2026-04-17
source: [knowledge/canon/d1-read-replicas.md]
sync_to_children: true
consumers: [drizzle-patterns, deploy, schema-builder, migration]
---

# D1 Global Read Replicas & Sessions API

> 2026 GA 기능. Modfolio 생태계의 D1 사용 앱(6개)은 코드 변경 없이 자동 혜택. read-after-write 일관성이 필요할 때만 Sessions API 도입.

## 자동 혜택 (코드 변경 0)

D1은 전 세계 엣지 노드에 read replica 자동 생성. 기본 쿼리는 **가장 빠른 replica**로 라우팅되어 latency 감소. 추가 비용 없음.

**주의**: 기본 모드는 **stale 허용**. replication lag로 인한 read-after-write inconsistency 가능성.

## Sessions API — bookmark token

read-after-write 일관성이 필요한 경우 (예: 결제 후 주문 조회):

```typescript
// 요청 진입 시: 이전 bookmark 복원
const bookmark = request.headers.get('x-d1-bookmark') ?? 'first-unconstrained';
const session = env.DB.withSession(bookmark);
const db = drizzle(session, { schema });

// 쿼리 후 새 bookmark 내보내기
const rows = await db.select().from(orders).where(eq(orders.userId, userId));
const newBookmark = session.getBookmark() ?? '';
response.headers.set('x-d1-bookmark', newBookmark);
```

### bookmark 값

| 값 | 의미 |
|------|------|
| `'first-unconstrained'` | 가장 빠른 replica (stale 허용, 기본) |
| `'first-primary'` | primary 강제 (latest 데이터) |
| 임의 bookmark 문자열 | 해당 시점 이후의 replica로만 라우팅 |

## 적용 권고 패턴

### Pattern 1: 쿠키 기반

```typescript
const bookmark = getCookie(request, 'd1_bookmark') ?? 'first-unconstrained';
// ... 쿼리
setCookie(response, 'd1_bookmark', session.getBookmark() ?? '', {
  httpOnly: true,
  sameSite: 'lax',
});
```

### Pattern 2: 헤더 기반 (API)

```typescript
const bookmark = request.headers.get('x-d1-bookmark') ?? 'first-unconstrained';
// ... 쿼리
response.headers.set('x-d1-bookmark', session.getBookmark() ?? '');
```

### Pattern 3: Write 경로 직후

```typescript
// Write
await db.insert(orders).values({ userId, amount });
const writeBookmark = session.getBookmark();

// 즉시 read — write 가시성 필요
const newSession = env.DB.withSession(writeBookmark ?? 'first-primary');
const newDb = drizzle(newSession, { schema });
const orderList = await newDb.select().from(orders).where(eq(orders.userId, userId));
```

## Modfolio 앱 적용 후보

| 앱 | D1 사용 | 권고 |
|----|--------|------|
| modfolio-admin | 16 tables | Sessions API 도입 검토 (per-tenant) |
| modfolio-connect | 62 tables | write-after-read 경로 (세션 생성 후 조회) Sessions API 필요 |
| modfolio-dev | D1 (초기) | 초기 단계 — 기본 동작 관찰 |
| amberstella | D1+DO | 실시간 shuttle write-read 경로 |
| munseo | D1+R2 | 변환 작업 로그 조회에 선택적 |
| umbracast | D1+R2+DO | Queue → Workflow 전환 시 같이 고려 |

## Time Travel (보조)

D1은 Time Travel로 30일 (Paid) / 7일 (Free) 복구 가능. Migration 실수나 데이터 손상 시 특정 시점으로 복구:

```bash
bunx --bun wrangler d1 time-travel restore DB_NAME --timestamp=2026-04-17T12:00:00Z
```

## 참조

- [D1 Read Replication](https://developers.cloudflare.com/d1/best-practices/read-replication/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [D1 Release Notes](https://developers.cloudflare.com/d1/platform/release-notes/)
- `canon/drizzle-conventions.md §D1 Sessions API`
