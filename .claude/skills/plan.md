---
description: 기획 품질 기준 (Plan Mode 참조). 제품 설계 수준 상세도. Product Lens + Scope 결정 포함
effort: max
model: opus
allowed-tools: Read, Glob, Grep
---

# Plan Quality Standards

> Plan Mode(Shift+Tab)나 기획 작업 시 참조하는 기준.
> 제품 설계 수준의 상세도를 목표로 한다 (TODO 목록 아님).

## Product Lens (구현 전 질문)

Plan 작성 전 다음을 먼저 확인:

1. **문제 재정의**: 이 기능이 해결하려는 문제가 진짜 맞는가?
2. **범위 결정** — 4가지 모드 중 하나 선택:
   - **10x Vision**: 10배 가치를 만들려면?
   - **Baseline Extension**: 합리적 추가
   - **Scope Lock**: 현재 범위에서 실패 모드 점검
   - **Reduction**: 핵심만 남기고 제거
3. **AC를 테스트 코드 형태로 작성** (Test-First 기획)
4. **회색 영역 질문** — 기능 종류별로 AI의 가정을 제거:
   - **Visual/UI**: 레이아웃(카드/리스트/그리드), 밀도, 빈 상태, 에러 상태, 반응형 우선순위
   - **API/서버**: 응답 구조, 에러 코드, 인증, 속도 제한
   - **데이터/스키마**: 그룹핑 기준, 소프트/하드 삭제, 중복 처리
   - 한 번에 2-3개씩 질문 (압도하지 않도록)

## 필수 포함 항목

### 1. Intent (의도)
- 이 변경이 왜 필요한가?
- 사용자에게 어떤 가치를 주는가?
- Builder가 판단 기준으로 삼을 수 있는 명확한 문장

### 2. User Journey (해당 시)
- 이 변경이 사용자 경험에 미치는 흐름
- Before/After 시나리오
- 단순 파일 목록이 아닌, 사용자 관점의 변화

### 3. 디자인 방향 (UI 변경 시)
- 레이아웃 유형 명시 (card grid, timeline, pipeline, sidebar 등)
- 참조할 디자인 패턴이나 영감
- 토큰 팔레트 제안 (새 디자인 시)

### 4. 기술적 위험
- 알려진 gotcha (`knowledge/claude/gotchas.md` 확인)
- 프레임워크별 제약
- 호환성/성능 고려사항

### 5. Acceptance Criteria
- 검증 가능한 조건 (모호한 "잘 동작함" 금지)
- 예: "GET /health returns 200", "Lighthouse Performance > 90"

### 6. Task Breakdown
- 구현 순서와 의존성
- 각 단계의 예상 산출물

### 7. Impact Analysis (해당 시)
- `contracts/`, `ecosystem.json`, SSO 프로토콜 변경 시 필수
- 영향받는 앱, Breaking change 여부, 마이그레이션 필요 여부

## 품질 기준

- **Intent가 모호하면 구현도 모호해진다** → Intent에 가장 공들일 것
- AC는 반드시 테스트 가능해야 함
- 디자인 변경 시 레이아웃 유형과 구조를 명시 (CSS 토큰 변경만으로는 부족)

## Plan이 필요한 경우

- 스키마/프로토콜/ecosystem.json 변경
- 새 레포/서비스 생성
- 아키텍처 결정이 필요한 작업
- 대규모 UI 재설계

## Plan 없이 가능한 경우

- 단순 문서 수정, 오타, 포맷팅
- Quality Gate 오류 수정
- 명확한 버그 수정
