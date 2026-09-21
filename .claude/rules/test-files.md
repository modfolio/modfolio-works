---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/__tests__/**"
---
저장소의 실제 검사 명령과 테스트 러너를 사용한다(Bun/Vitest 등). 예제의 프레임워크
이름만으로 러너를 교체하지 않는다. Happy path + error case 모두 테스트한다.
API: 200/400/401/404/500 응답 테스트. 테스트 간 상태 공유 금지 → `beforeEach` 초기화.
