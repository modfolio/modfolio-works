---
paths:
  - "**/*.css"
---

# CSS Files Rules

## 토큰 사용
- 색상/spacing/radius/shadow → CSS 변수 필수
- 하드코딩된 색상값 금지 (`#fff`, `rgb()`, `oklch()` 등)
- 디자인 토큰 팔레트에서 가장 가까운 변수 사용
- CSS 변수 사용률 80% 이상 유지 (TOKEN COMPLIANCE)

## Anti-Slop 금지 패턴
- 중앙 정렬 히어로 + CTA 버튼 조합 금지
- 3-column 균일 카드 그리드 금지 (비균일 Bento Grid 권장)
- 보라-파랑 그라데이션 배경 금지
- `rounded-lg shadow-md` 기본 조합 금지 (앱 고유 elevation 토큰 사용)
- 범용 폰트 단독 사용 금지 (distinctive pairing 필수)

## CSS 논리적 속성 (i18n)
- `margin-left/right` → `margin-inline-start/end`
- `padding-left/right` → `padding-inline-start/end`
- `text-align: left/right` → `text-align: start/end`
- `border-left/right` → `border-inline-start/end`
- `float: left/right` → 사용 자제 (flexbox/grid 사용)

## Modern CSS 권장
- View Transitions API — 페이지 전환 (JS 라이브러리 대체)
- Scroll-Driven Animations — `scroll()`, `view()` (AOS/ScrollReveal 대체)
- `@property` — 타입드 커스텀 프로퍼티 애니메이션
- Container Queries — 컴포넌트 자체 반응형
- `:has()` — 부모 상태 기반 스타일링 (JS 대체)
- Anchor Positioning + Popover API — 툴팁/드롭다운 (Floating UI 대체)

## 레이아웃
- `@layer reset, base, tokens, components, utilities` 순서 준수
- `!important` 금지
- 반응형: `clamp()` 선호, 브레이크포인트 (sm:640, md:768, lg:1024, xl:1280)

## 접근성
- `prefers-reduced-motion` fallback 필수 (애니메이션 포함 시)
- `prefers-color-scheme` 고려
- `font-family`는 반드시 `var()` 사용
- WCAG AA 대비율 4.5:1 이상

## 금지 패턴
- `text-align: justify` (가독성 저하)
- 하드코딩된 `font-family` 값
- `!important`
- `margin-left`/`margin-right` (논리적 속성 사용)
