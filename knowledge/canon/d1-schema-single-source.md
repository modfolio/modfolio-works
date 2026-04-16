---
title: D1 Schema Single Source
version: 1.0.0
last_updated: 2026-04-17
source: [modfolio-connect 2026-04-16 handoff §4-1]
sync_to_children: true
consumers: [schema, migration, drizzle-patterns]
---

# D1 Schema — 단일 출처 원칙

> 스키마 정의와 마이그레이션 SQL은 **한 곳에서만** 나온다. 이원화된 순간 drift가 시작된다.

## 배경

modfolio-connect에서 `drizzle/schema.ts`(5개 baseline 테이블)와 서비스 라우트에 하드코딩된 `MIGRATION_V*_SQL` 상수(45개, ~1,100줄)가 **이원화**됐다. V44에서 `sms_verification`, `ssf_stream` 누락이 발생했고 서비스 코드의 graceful try/catch가 에러를 silently swallow. 실측 확인 전까지 몇 세션이 문제를 인지하지 못한 채 지나갔다.

## 규칙

1. **schema.ts가 유일한 출처**: 테이블/컬럼/인덱스 선언은 drizzle schema에만 존재한다
2. **마이그레이션은 drizzle-kit generate로만**: 수동 SQL 상수 금지. 불가피하게 inline SQL이 필요하면 생성기를 통해 산출
3. **fail-loud**: 서비스 코드에서 "no such table" / "no such column"을 try/catch로 삼키지 않는다. 잡더라도 로그·알람·throw 셋 중 하나는 반드시 동반
4. **migrations 테스트**: D1에 새 SQL이 올라가는 경로라면 최소 smoke test (table exists assertion) 필수

## 안티패턴

- `if (error.message.includes('no such table')) return []` — 무응답처럼 보이는 빈 배열 반환
- `export const MIGRATION_V6_SQL = 'CREATE TABLE ...'` 상수 직접 편집
- schema.ts만 바꾸고 migration SQL 파일 업데이트를 잊는 흐름

## 검증 체크리스트

- [ ] `drizzle/meta/_journal.json`에 최신 idx 기록됨
- [ ] 서비스 코드에서 D1 쿼리 실패 로그가 최소 한 곳 이상
- [ ] 로컬에서 migrate 재실행 시 이미 적용된 entry가 skip되는지 확인
