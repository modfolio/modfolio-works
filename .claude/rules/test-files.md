---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/__tests__/**"
---
Vitest 패턴 사용. Happy path + error case 모두 테스트 필수.
API: 200/400/401/404/500 응답 테스트. 테스트 간 상태 공유 금지 → `beforeEach` 초기화.
