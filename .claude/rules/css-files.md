---
paths:
  - "**/*.css"
---

# CSS Files Rules

## 토큰 사용
- 색상/spacing/radius/shadow → CSS 변수 필수
- 하드코딩된 색상값 금지 (`#fff`, `rgb()`, `oklch()` 등)
- 디자인 토큰 팔레트에서 가장 가까운 변수 사용

## 레이아웃
- `@layer reset, base, tokens, components, utilities` 순서 준수
- `!important` 금지
- 반응형: `clamp()` 선호, 브레이크포인트 (sm:640, md:768, lg:1024, xl:1280)

## 접근성
- `prefers-reduced-motion` fallback 필수 (애니메이션 포함 시)
- `prefers-color-scheme` 고려
- `font-family`는 반드시 `var()` 사용

## 금지 패턴
- `text-align: justify` (가독성 저하)
- 하드코딩된 `font-family` 값
- `!important`
