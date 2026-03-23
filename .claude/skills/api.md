---
description: API 엔드포인트 + 테스트 생성 파이프라인. 프레임워크별 라우팅 + Zod 검증 + JWT 인증
effort: high
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(bun run check:*), Bash(bun run typecheck:*)
---

# /api — API 엔드포인트 생성

프레임워크 감지 → api-builder agent → test-builder로 테스트 생성 → typecheck && test

## 프로세스

1. **대상 앱과 엔드포인트 스펙 확인** (HTTP method, path, 인증 필요 여부)
2. **프레임워크 감지**: package.json에서 SvelteKit/SolidStart/Astro/Hono/Nuxt/Qwik
3. **api-builder agent 실행**: 라우트 + Zod 검증 + 인증 + 에러 처리
4. **test-builder agent 실행**: 엔드포인트에 대한 테스트 스위트 자동 생성
5. **검증**: `bun run typecheck && bun run test`

## 사용 예시

```
/api — modfolio-pay에 결제 취소 API 만들어줘 (POST /api/payments/:id/cancel)
/api — gistcore에 세션 생성 API 추가 (인증 필요, Zod 검증)
```
