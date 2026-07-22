---
name: api
description: API 엔드포인트 + 테스트 생성 파이프라인. 프레임워크별 라우팅 + Zod 검증 + JWT 인증
user-invocable: true
---


# /api — API 엔드포인트 생성

프레임워크 감지 → api-builder agent → test-builder로 테스트 생성 → typecheck && test

## 프로세스

1. **대상 앱과 엔드포인트 스펙 확인** (HTTP method, path, 인증 필요 여부)
2. **프레임워크 감지**: package.json에서 SvelteKit/SolidStart/Astro/Hono/Nuxt/Qwik
3. **api-builder agent 실행**: 라우트 + Zod 검증 + 인증 + 에러 처리
4. **test-builder agent 실행**: 엔드포인트에 대한 테스트 스위트 자동 생성
5. **검증**: `bun run typecheck && bun run test`

## 동시성 체크 (canon `concurrency-safety.md` — 상태 변경 엔드포인트 생성 시 필수)

- 결제·차감·카운터·슬롯은 **조건부 UPDATE 한 문장** 우선 — 앱 코드 read-check-write 금지 (TOCTOU)
- write 2개 이상 = transaction (all-or-nothing), 외부 API 가 낀 write = outbox
- 재시도 가능 작업(결제·생성 POST) = 멱등키 계약 — **결정적 생성**(작업/주문 ID 기반, `billing-architecture.md` §4) + **원자적 예약**(unique constraint + `INSERT … ON CONFLICT`)
- 웹훅/이벤트 소비 핸들러 = event_id dedupe (발송측이 재전송한다)
- DB 별: Neon 은 `FOR UPDATE` 가용, **D1 은 없음** — 조건부 UPDATE·`batch()`·필요 시 Durable Object

## 사용 예시

```
/api — modfolio-pay에 결제 취소 API 만들어줘 (POST /api/payments/:id/cancel)
/api — gistcore에 세션 생성 API 추가 (인증 필요, Zod 검증)
```
