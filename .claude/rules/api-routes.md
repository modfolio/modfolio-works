---
paths:
  - "**/+server.ts"
  - "**/api/**/*.ts"
  - "**/routes/**/*.ts"
  - "**/+page.server.ts"
---
Zod 입력 검증 필수 (`z.safeParse()` + 400 응답). try/catch + 적절한 HTTP 상태코드.
Protected route → JWT 검증. Webhook → HMAC-SHA256 검증. 하드코딩 시크릿 금지.
