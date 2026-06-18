---
title: Backup / Monitoring SLA — modfolio universe 표준
version: 1.0.0
last_updated: 2026-05-26
source: [athsra Phase 1.x.9 disaster-recovery.md (RTO 1h / RPO 24h R2, RPO 1h D1 PITR), modfolio-connect-workflows build-notifier (SLACK_BUILD_WEBHOOK), CF Workers Builds API canon, 2026-05-26 athsra Phase 2.5 정공법 audit]
sync_to_siblings: true
applicability: always
consumers: [ops, deploy, audit, observability]
---

# Backup / Monitoring SLA — modfolio universe 표준

> 각 sibling 의 자율 (Hub-not-enforcer) — 본 canon 은 권고 표준. SLA 미충족 시 sibling owner 가 자체 결정 / 사용자 통지.

## SLA 표준 (resource class 별)

modfolio universe 의 4 resource class. 각 class 의 RTO (복구 목표 시간) / RPO (데이터 손실 허용 시간) 표준:

| Class | 예시 | RTO | RPO | 백업 메커니즘 |
|---|---|---|---|---|
| **Critical** (auth/secret/payment) | athsra (envelope, token), modfolio-connect (SSO key, user proof), modfolio-pay (orders, payments) | 1h | 1h | D1 PITR (time travel, 7d) + R2 cross-bucket nightly + ad-hoc dump API |
| **Application** (user content) | gistcore (essays, scores), naviaca (students, invoices), munseo (notes) | 4h | 24h | Neon PITR (Postgres 시점복구) 또는 D1 PITR + nightly export |
| **Static asset** (assets, logs) | CF R2 buckets, asset uploads | 24h | 7d | R2 versioning (auto) + 별도 cold archive 옵션 |
| **Ephemeral** (cache, session, queue) | KV cache, Workers KV, queue messages | best-effort | best-effort | 재생성 가능 — 백업 불필요 |

### SLA 계산 근거

- **RTO 1h** = CF Workers Builds queue + manual API call + smoke test 합산 시간
- **RPO 1h (D1 PITR)** = CF time travel 의 1h granularity (built-in)
- **RPO 24h (R2 nightly)** = nightly cron (UTC 03:00 = KST 12:00, 사용자 active hour 와 같은 일자)
- **D1 vs Neon**: D1 PITR 7d retention (CF 기본), Neon PITR 7d retention (Free) 또는 30d (Scale plan)

### 각 sibling 의 책임

1. 자체 resource class 식별 (Critical / Application / Static / Ephemeral)
2. 해당 SLA 보장 (백업 메커니즘 + 검증)
3. 분기별 fire drill (실 복구 테스트 — `docs/runbooks/<scenario>.md` 작성 + 실행 기록)
4. SLA 미충족 시 `docs/incidents/<date>-<topic>.md` 작성

## 백업 메커니즘 (구현 표준)

### Critical class: R2 cross-bucket nightly

athsra Phase 1.x.9 패턴 ([`athsra/docs/runbooks/disaster-recovery.md`](https://github.com/modfolio/athsra/blob/main/docs/runbooks/disaster-recovery.md)):

```jsonc
// wrangler.jsonc
{
  "r2_buckets": [
    { "binding": "STORE", "bucket_name": "<app>-store" },
    { "binding": "BACKUP_STORE", "bucket_name": "<app>-store-backup" }
  ],
  "triggers": { "crons": ["0 3 * * *"] } // UTC 03:00 nightly
}
```

```typescript
// queue/backup.ts — etag 기반 idempotent diff copy
export async function handleScheduledBackup(env: Bindings): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const list = await env.STORE.list();
  for (const obj of list.objects) {
    const backupKey = `${today}/${obj.key}`;
    const existing = await env.BACKUP_STORE.head(backupKey);
    if (existing?.customMetadata?.source_etag === obj.etag) continue; // idempotent
    const data = await env.STORE.get(obj.key);
    if (!data) continue;
    await env.BACKUP_STORE.put(backupKey, data.body, {
      customMetadata: { source_etag: obj.etag },
    });
  }
}
```

### Critical class: D1 PITR (built-in)

CF 의 D1 time travel — 별도 설정 0. 복구:

```bash
# 시점 복구 (D1 의 timestamp 또는 bookmark)
wrangler d1 time-travel restore <db-name> --timestamp=2026-05-26T10:00:00Z

# 또는 bookmark 기반 (실시간 read consistent point)
wrangler d1 time-travel info <db-name>  # bookmark 확인
wrangler d1 time-travel restore <db-name> --bookmark=<bookmark>
```

### Critical class: ad-hoc D1 JSON dump

긴급 / SLA 외 백업이 필요할 때 (예: rotation 전, prod 검증 후):

```typescript
// routes/admin.ts
adminRouter.post('/backup/d1-export', async (c) => {
  const db = drizzle(c.env.TOKENS_DB);
  const allTables = await db.all(sql`SELECT name FROM sqlite_master WHERE type='table'`);
  const dump: Record<string, unknown[]> = {};
  for (const { name } of allTables) {
    dump[name] = await db.all(sql.raw(`SELECT * FROM "${name}"`));
  }
  const json = JSON.stringify(dump);
  const key = `d1-dumps/${new Date().toISOString()}.json`;
  await c.env.BACKUP_STORE.put(key, json);
  return c.json({ key, size: json.length });
});
```

### Application class: Neon PITR

```bash
# Neon CLI 또는 dashboard
neonctl branches create --name=restore-2026-05-26 --parent <branch> --timestamp 2026-05-26T10:00:00Z
# restore 후 검증 → 원본 branch 로 promote
```

## Monitoring alert (Slack webhook 표준)

### CF Workers Builds 실패 알림

modfolio-connect 의 build-notifier 패턴을 표준화. envelope `modfolio-connect` 의 `SLACK_BUILD_WEBHOOK` 키 활용.

```typescript
// apps/workflows/src/build-notifier.ts (modfolio-connect 패턴)
export async function notifyBuildFailure(
  webhookUrl: string,
  build: {
    worker: string;
    buildUuid: string;
    commit: string;
    logs?: string;
  },
): Promise<void> {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 Workers Builds failure: *${build.worker}*\nbuild_uuid: \`${build.buildUuid}\`\ncommit: \`${build.commit}\``,
      attachments: build.logs
        ? [{ text: build.logs.slice(0, 2000), color: 'danger' }]
        : undefined,
    }),
  });
}
```

호출 시점:
- CF Workers Builds webhook 이 모든 build status 변경에 알림 X — 별도 polling cron 필요
- 또는 build complete 시 trigger env var 로 webhook 직접 호출 (Workers Builds 의 post-build action)
- 가장 안정적: cron (UTC 매시간) 으로 `GET /builds/workers/{tag}/builds?limit=10` 확인 → 신규 fail 발견 시 알림

### 분기별 fire drill (실 복구 테스트)

각 Critical sibling 의 owner 가 분기 1회 (3개월) 실 시나리오 시뮬레이션:

1. backup 에서 restore → 별도 staging worker 에 deploy
2. 데이터 무결성 검증 (sample query + count 비교)
3. RTO 측정 → SLA 표 update
4. `docs/runbooks/<sibling>-fire-drill-<quarter>.md` 작성

## 각 sibling 의 SLA 자체 평가 (athsra dogfood)

| sibling | resource | class | RTO | RPO | 비고 |
|---|---|---|---|---|---|
| athsra | R2 envelope (`athsra-secret-store`) | Critical | 1h | 24h | nightly cron 운영 중 (canon 정합) |
| athsra | D1 (`athsra-tokens`) | Critical | 1h | 1h | CF PITR 사용 |
| modfolio-connect | D1 SSO (key, user proof) | Critical | 1h | 1h | CF PITR — 정합 |
| modfolio-pay | Neon (orders, payments) | Critical | 4h | 1h | Neon PITR — sibling 자율 점검 필요 |
| gistcore | Neon (essays, scores) | Application | 4h | 24h | Neon PITR — 정합 |
| naviaca | Neon (students, invoices) | Application | 4h | 24h | Neon PITR — sibling 자율 점검 |
| 기타 (modfolio-{dev,on,press}) | landing only | Static | 24h | 7d | CF Pages auto |

## 정공법 정합

- **1원칙 (근본 수정)**: 백업이 부재한 채 monitoring 만 추가 X — 백업 우선
- **2원칙 (에러·경고 0)**: fire drill 실패 시 즉시 incident report
- **3원칙 (장기 시야)**: SLA 표 quarterly review — 데이터 양 증가 / latency 변화 / cost 변화 반영
- **5원칙 (리소스 투자)**: nightly cron + Slack webhook + cron polling 비용 인정

## Anti-patterns

- ❌ "백업 안 해도 prod 안전" — incident 발생 후 복구 불가 (CF PITR 7d 한정)
- ❌ R2 versioning 만 의존 — bucket 자체 삭제 시 복구 불가
- ❌ "fire drill 은 한 번만" — 데이터 양 증가 후 RTO 가 SLA 초과할 수 있음
- ❌ Slack webhook hardcode — envelope 의 SLACK_BUILD_WEBHOOK 표준 활용

## 관련

- [`observability.md`](observability.md) — 트레이싱 / 로깅 표준 (이 canon 은 백업/복구)
- [`cf-workers-builds-api.md`](cf-workers-builds-api.md) — Workers Builds 실패 진단 (build_token silent expire 등)
- [`secret-store.md`](secret-store.md) — athsra envelope 백업 (canon 의 R2 cross-bucket 적용 사례)
- [`athsra/docs/runbooks/disaster-recovery.md`](https://github.com/modfolio/athsra/blob/main/docs/runbooks/disaster-recovery.md) — 실 시나리오별 복구 절차 (reference 구현)
