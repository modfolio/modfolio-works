---
name: migration
description: Drizzle 마이그레이션 생성. drizzle-kit generate + Neon/D1별 검증 + 롤백 안전성
user-invocable: true
---


# /migration — DB 마이그레이션 생성

스키마 확인 → drizzle-kit generate → Neon/D1별 검증

## 프로세스

1. **현재 스키마 상태 확인** (schema.ts 읽기)
2. **변경 사항 파악** (새 테이블, 컬럼 추가, 타입 변경)
3. **마이그레이션 생성**:
   - Neon: `bunx drizzle-kit generate` → SQL 파일
   - D1: `wrangler d1 migrations create {db-name} {description}`
4. **생성된 SQL 검증** (destructive 변경 확인)
5. **적용**:
   - Dev: `bunx drizzle-kit push` (빠른 프로토타이핑)
   - Production: `bunx drizzle-kit migrate`
   - D1: `wrangler d1 migrations apply {db-name}`

## 주의사항

- 기존 마이그레이션 파일 수정 금지 — 새 마이그레이션만 생성
- Destructive 변경 (컬럼 삭제, 타입 변경) 시 사용자 확인 필수
- Neon: `neon` MCP로 브랜치에서 먼저 테스트 권장
- **D1 Global Read Replicas (2026 GA)**: 마이그레이션 적용 직후 read 경로는 replication lag으로 stale 가능. write-after-read 경로는 Sessions API bookmark 전달. 상세 `canon/d1-read-replicas.md`

## D1 finalize — PRAGMA optimize (2026-05+, v2.0 dogfood Adopt P0 #4)

D1 schema 변경 commit 직후 query plan 통계 갱신을 위해 finalize step 권장:

```sql
PRAGMA optimize;
```

자동화 helper:

```bash
bunx modfolio-migrate-finalize <db-binding>
# 또는 (ecosystem 안에서):
bun run scripts/migration/finalize.ts <db-binding>
```

순서:
1. `bunx drizzle-kit migrate` 또는 `wrangler d1 migrations apply <db-name>`
2. **finalize 실행** — PRAGMA optimize 한 줄
3. 신 query 의 latency p95 비교 (canon `observability.md` v1.6 § D1 metric)

`d1-retry` (auto-retry on read-only failures): client 변경 0. `meta.total_attempts > 1` 가 warning 신호.

출처: https://developers.cloudflare.com/d1/platform/release-notes/
