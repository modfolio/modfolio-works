---
title: D1 Read Replication & Sessions API
version: 2.0.0
last_updated: 2026-08-16
source: [knowledge/canon/d1-read-replicas.md, Cloudflare D1 read replication docs, 2026-08-16 fleet 실측 8 DB]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [drizzle-patterns, deploy, schema-builder, migration]
changelog: ["2.0.0 (2026-08-16): **v1.0.0 이 세 가지를 틀리게 가르쳤고 하류 결함이 실증됐다** — GA(실제: 베타) · 코드 변경 0(실제: opt-in + Sessions API 필수) · replica 자동 생성(실제: DB별 opt-in). 앱 표도 절반이 틀렸다(D1 없는 앱 3개 등재, 있는 앱 5개 누락). 전면 재작성 + fleet 실측표 추가.", "1.0.0 (2026-04-17): 초판"]
---

# D1 Read Replication & Sessions API

> **read replication 은 GA 가 아니라 공개 베타이고, DB별 opt-in 이며, Sessions API 없이는
> 켜도 아무 효과가 없다.** 셋 다 v1.0.0 이 반대로 적었다.

## ⚠ v1.0.0 정정 — 이 canon 이 하류 결함을 만들었다

v1.0.0 은 `sync_to_siblings: true` 로 33 repo 에 배포된 채 이렇게 적고 있었다:

| v1.0.0 진술 | 실제 |
|---|---|
| *"2026 **GA** 기능"* | **2025-04-10 이래 공개 베타.** GA 된 적 없다 (CF 블로그 슬러그가 `d1-read-replication-beta`, D1 내비게이션에 Beta 배지 유지) |
| *"코드 변경 없이 **자동 혜택**"* | **DB별 opt-in.** 그리고 Sessions API 를 쓰지 않으면 *"all queries will continue to be executed only by the primary database"* (CF 문서) |
| *"전 세계 엣지 노드에 replica **자동 생성**"* | 계정·DB 단위로 켜야 한다 |

**실증된 대가** (2026-08-16 실측):

```
modfolio-admin-db     read_replication=auto   +  앱 코드의 withSession  0건
                      → 켜져 있고, 읽기는 전부 primary 로 간다. 이득 0
```

`modfolio-admin` 에서 `withSession` 이 나오는 파일 **3개가 전부 동기화된 canon 문서**였다
(`d1-read-replicas.md`·`drizzle-conventions.md`·`secret-store.md`). 앱 코드에는 없다.
**canon 이 「코드 변경 0」이라 했고, 그 repo 는 그대로 따랐고, 아무것도 얻지 못했다.**

> `agent-evidence.md`: *"문서·선언은 필요조건이 아니라 **충분조건**이어야 한다 —
> 「이대로만 하면 되는가」를 기계로 묻는다."* 이 문서가 그 반례였다.

복제 자체는 **무료**다(*"you don't pay extra storage or compute costs for read replicas"*).
그래서 이 결함의 대가는 비용이 아니라 **지연을 그대로 두는 것**이다.

## 실제로 어떻게 켜지는가 — 2단계 (둘 다 해야 한다)

### 1단계 — DB별 복제 활성화 (기본값 `disabled`)

```bash
# 현재 상태 확인 — ⚠ `d1 list` 를 쓰지 않는다 (이 필드를 주지 않는다)
bunx wrangler d1 info <DB_NAME> --json | jq '.read_replication.mode'

# 활성화 (Cloudflare 대시보드 또는 REST API)
# PATCH /accounts/{account_id}/d1/database/{database_id}
#   { "read_replication": { "mode": "auto" } }
```

⚠ **`d1 list` 의 출력에 `read_replication` 이 없다.** 「필드가 없음」을 「disabled」로 읽으면
전 DB 가 꺼진 것처럼 보인다 — **판정 불능과 비활성은 다른 상태다.**

### 2단계 — Sessions API 배선 (이걸 안 하면 1단계가 무의미)

```typescript
// 요청 진입 시: 이전 bookmark 복원
const bookmark = request.headers.get('x-d1-bookmark') ?? 'first-unconstrained';
const session = env.DB.withSession(bookmark);
const db = drizzle(session, { schema });

// 쿼리 후 새 bookmark 내보내기
const rows = await db.select().from(orders).where(eq(orders.userId, userId));
response.headers.set('x-d1-bookmark', session.getBookmark() ?? '');
```

**`withSession` 을 거치지 않은 쿼리는 replica 를 쓰지 않는다.** 1단계만 하고 끝내면
`modfolio-admin` 상태가 된다.

### bookmark 값

| 값 | 의미 |
|------|------|
| `'first-unconstrained'` | 가장 빠른 replica (stale 허용) |
| `'first-primary'` | primary 강제 (latest 데이터) |
| 임의 bookmark 문자열 | 해당 시점 이후의 replica로만 라우팅 |

## fleet 실측 — D1 8개 (2026-08-16, `wrangler d1 info` 전수)

| database | 소유 repo | 크기 | `read_replication` | Sessions API | 판정 |
|---|---|---|---|---|---|
| `modfolio-connect-db` | modfolio-connect | 2.11 MB | `auto` | `packages/foundation/src/server/d1-session.ts` | **정상 작동** |
| `modfolio-admin-db` | modfolio-admin | 0.27 MB | `auto` | **앱 코드 0건** | **켜 놓고 이득 0** |
| `umbracast-db` | umbracast | 13.67 MB | `disabled` | — | 미사용 |
| `athsra-tokens` | athsra | 5.59 MB | `disabled` | — | 미사용 |
| `modfolio-notify` | modfolio-notify | 0.28 MB | `disabled` | — | 미사용 |
| `modfolio-sign-db` | modfolio-sign | 0.23 MB | `disabled` | — | 미사용 |
| `modfolio-loom` | modfolio-ecosystem | 0.19 MB | `disabled` | — | 미사용 |
| `muje-hwp` | muje | 0.11 MB | `disabled` | — | 미사용 |

**합계 22.45 MB** — 최대 DB 가 10GB 상한의 **0.13%**. 즉 지금은 **용량이 아니라 지연**만 문제다.

⚠ v1.0.0 의 앱 표는 **절반이 틀렸다** — `modfolio-dev`·`amberstella`·`munseo` 를 D1 앱으로
적었으나 **wrangler 설정에 `d1_databases` 가 없고**, 실제 보유한 `athsra`·`modfolio-notify`·
`modfolio-sign`·`muje`·`modfolio-ecosystem` 은 **누락**돼 있었다.

> ⚠ **이 표를 다시 셀 때 주의**: 저장소 전체에서 `d1_databases` 를 grep 하면 **32/32** 가 나온다.
> 44건이 **허브가 배포한 canon·문서**이기 때문이다(이 문서 포함). 반드시 **`-g 'wrangler.*'`
> 로 좁혀서** 센다. 「100% = 0%」 지문을 기억할 것.

## 언제 켜야 하는가

복제가 이득인 조건:
- **읽기가 지리적으로 분산**돼 있다 (우리 primary 는 대부분 APAC)
- **읽기:쓰기 비율이 높다**
- **stale read 를 감당할 수 있다**(또는 bookmark 로 필요한 경로만 primary 강제)

⚠ 반대로 — 트래픽이 거의 없고 단일 지역이면 **켜도 측정 가능한 이득이 없다.**
"켰다" 를 "빨라졌다" 로 읽지 않는다. 켜기 전후 **P95 를 실측**한다.

## 적용 패턴

### Pattern 1 — 쿠키 기반 (브라우저 세션)

```typescript
const bookmark = getCookie(request, 'd1_bookmark') ?? 'first-unconstrained';
// ... 쿼리
setCookie(response, 'd1_bookmark', session.getBookmark() ?? '', {
  httpOnly: true,
  sameSite: 'lax',
});
```

### Pattern 2 — 헤더 기반 (API)

```typescript
const bookmark = request.headers.get('x-d1-bookmark') ?? 'first-unconstrained';
// ... 쿼리
response.headers.set('x-d1-bookmark', session.getBookmark() ?? '');
```

### Pattern 3 — write 직후 read (read-after-write 필요)

```typescript
await db.insert(orders).values({ userId, amount });
const writeBookmark = session.getBookmark();

// 그 write 가 보이는 replica 로만 라우팅
const newSession = env.DB.withSession(writeBookmark ?? 'first-primary');
const newDb = drizzle(newSession, { schema });
const orderList = await newDb.select().from(orders).where(eq(orders.userId, userId));
```

## D1 상한 (참고 — 2026-08 기준)

| 항목 | 값 |
|---|---|
| DB당 크기 | **10 GB (상향 불가)** |
| 계정당 DB | 50,000 (Paid) / 10 (Free) |
| 계정 총량 | 1 TB |
| 테이블 컬럼 | 100 · 행 2 MB · 쿼리 30s |
| 확장 | FTS5 / JSON1 / math 만. **pgvector 없음** |
| 쓰기 | **DB당 단일 스레드** |

## Time Travel (보조)

30일 (Paid) / 7일 (Free) 시점 복구:

```bash
bunx --bun wrangler d1 time-travel restore DB_NAME --timestamp=2026-04-17T12:00:00Z
```

## 참조

- [D1 Read Replication](https://developers.cloudflare.com/d1/best-practices/read-replication/) — **Beta**
- [D1 read replication 베타 발표 (2025-04-10)](https://blog.cloudflare.com/d1-read-replication-beta/)
- [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- `canon/drizzle-conventions.md §D1 Sessions API`
