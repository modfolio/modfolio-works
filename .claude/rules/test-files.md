---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/__tests__/**"
---

# Test Files Rules

## 프레임워크
- Vitest 4 패턴 사용 — gotchas.md 참조
- `vi.fn().mockImplementation()` + `function` 키워드 (not arrow for constructors)

## 테스트 범위
- Happy path + error case 모두 테스트 필수
- 스키마: 필수 필드 누락, 타입 불일치, FK 무결성
- API: 200/400/401/404/500 응답 모두 테스트
- 컴포넌트: 렌더링, 사용자 인터랙션, 에지 케이스

## 금지 패턴
- `any` 타입 단언 (→ 정확한 타입 사용)
- 테스트 간 상태 공유 (→ `beforeEach`에서 초기화)
- 외부 서비스 직접 호출 (→ mock 사용)
