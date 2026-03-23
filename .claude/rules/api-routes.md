---
paths:
  - "**/+server.ts"
  - "**/api/**/*.ts"
  - "**/routes/**/*.ts"
  - "**/+page.server.ts"
---

# API Routes Rules

## 입력 검증
- Zod 입력 검증 필수 — 모든 request body, query params, path params
- `z.safeParse()` 사용 + 실패 시 400 응답

## 에러 처리
- try/catch 필수 + HTTP 상태코드 적절히 반환
- 내부 에러 노출 금지 — 사용자에게는 generic message, 서버 로그에는 상세 에러

## 인증
- Protected route → Connect SSO JWT 검증 필수
- Webhook → HMAC-SHA256 서명 검증 필수

## 금지 패턴
- `as any` 타입 캐스팅
- 하드코딩된 시크릿/API 키
- uncaught promise rejection
