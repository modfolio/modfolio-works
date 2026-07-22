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

## 동시성 체크 (canon `concurrency-safety.md`)

- 중복이 비즈니스 오류인 컬럼/조합 = **unique constraint** 필수 (멱등키·주문번호·`(userId, resourceId)`) — 앱 로직이 뚫려도 DB 가 거부하는 최후 방어선
- 동시 갱신되는 행(잔액·수량·상태) = 조건부 UPDATE 전제로 설계, 다단계 필요 시 version 컬럼(낙관적 잠금) 고려
- DB 별: Neon 은 `FOR UPDATE` 가용, **D1 은 없음**(조건부 UPDATE·`batch()`·Durable Object)

## 사용 예시

```
/schema — gistcore에 speaking_sessions 테이블 추가 (user_id FK, duration, score)
/schema — modfolio-pay에 subscriptions 테이블 생성
```
