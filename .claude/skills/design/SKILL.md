---
name: design
description: Figma + Canva 양방향 디자인 파이프라인. Canvas to Code + Code to Canvas + 토큰 제약 검증
user-invocable: true
---

## Auto Context
@knowledge/canon/anti-slop.md
@knowledge/canon/design-tokens.md
@knowledge/canon/typography.md
@knowledge/canon/design-innovation.md

# /design — Figma + Canva 디자인 파이프라인

> 이 스킬은 **구현 파이프라인**이지 디자인 가이드가 아니다.
> 시각 정체성/스타일 결정은 각 앱의 자율. 캐논은 negative space만 강제한다.

## Step 0: Design Brief (선택적 자가 점검)

여러 변형을 탐색하고 싶을 때 사용. 단일 안에 만족하면 생략 가능.
강제로 작성을 요구하지 않는다.

1. **Purpose** — 이 화면/컴포넌트의 고유한 목적
2. **Feeling** — 사용자가 느껴야 할 감정/분위기
3. **Differentiation** — 기존 화면과 차별화되는 포인트

상세: [canon/design-innovation.md](../../knowledge/canon/design-innovation.md)

## 프로세스

1. **입력 수집** — Figma URL 또는 디자인 요구사항
2. **토큰 확인** — `/design-tokens`로 사용 가능한 토큰 팔레트 확인
3. **구현** — 토큰 제약 내 컴포넌트/페이지 구현
4. **검증** — `design-critic` agent로 negative-space 검증 (binary FAIL/PASS)
5. **반복** — FAIL 위반 0건이 될 때까지

## 검증 기준 (negative space만)

[canon/anti-slop.md](../../knowledge/canon/anti-slop.md) Hard FAIL 3개:

1. 하드코딩 색상/간격 (`var()` 밖에서 oklch/hex/rgb 사용)
2. WCAG AA 미달
3. 인접 앱과 시각적 indistinguishable

위 외의 디자인 선택(레이아웃, 비율, 모션, 색감, 폰트, 형태 등)은 작성자 자율.
"Spacing Rhythm 4px/8px 그리드", "Component Consistency 재사용 우선" 같은 처방을
스킬이 강제하지 않는다 — 이런 가이드 자체가 슬롭의 원인.

## Canvas to Code

- Figma `get_design_context` → 코드 + 스크린샷 + 힌트 반환
- 반환된 코드는 참조용 — 프로젝트 스택에 맞게 적응 필수
- 디자인 토큰 CSS 변수 매핑 우선

## 제약 (토큰 시스템 정합)

- `oklch()`, `#hex`, `rgb()` 직접 사용 금지 → `var(--token)` 필수
- z-index는 명명 표준 사용 (`var(--z-modal)` 등 — 값은 앱 자유)
- 브랜드 정체성 참고: `docs/brand-passport.md` (앱이 자체 정의 — 강제 없음)
