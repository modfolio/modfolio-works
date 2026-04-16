---
name: schema
description: Drizzle 스키마 생성. 생태계 prefix + DB별 helper + FK 인덱스 + JSONB 타입 안전
user-invocable: true
---


## Auto Context
@ecosystem.json

# /schema — Drizzle 스키마 생성

prefix/DB 타입 조회 → schema-builder agent → typecheck

## 프로세스

1. **대상 앱과 테이블 스펙 확인**
2. **drizzle-patterns 스킬에서 prefix 조회** (mc_, ma_, mp_ 등)
3. **ecosystem.json에서 DB 타입 판별** (Neon/D1/Turso)
4. **schema-builder agent 실행**: 스키마 생성
5. **검증**: `bun run typecheck`

## 사용 예시

```
/schema — gistcore에 speaking_sessions 테이블 추가 (user_id FK, duration, score)
/schema — modfolio-pay에 subscriptions 테이블 생성
```
