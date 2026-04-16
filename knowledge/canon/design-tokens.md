---
title: Design Tokens — Structural Convention
version: 3.0.0
last_updated: 2026-04-14
source: [.claude/skills/design-tokens/SKILL.md]
sync_to_children: true
consumers: [design-tokens, component, page, design, fix, design-critic, component-builder]
---

# Design Tokens — Structural Convention

> House of Brands 원칙: 각 앱의 **값**은 다르지만 **구조와 명명 규칙**은 동일.

## Structural Rules (토큰 체계의 기초 — 우회 = 체계 붕괴)

### 3계층 구조

```
Primitives (원시 값)
  ↓ 의미 부여
Semantic (역할 매핑)
  ↓ 브랜드 특화
Accent (강조/브랜드)
```

### CSS Cascade Layers

```css
@layer reset, base, tokens, components, utilities;
```

레이어 순서로 specificity 관리. `!important` 사용 금지.

### `@layer` 구현 기준

- global token 선언은 반드시 `@layer tokens`
- 컴포넌트 전용 스타일은 `@layer components`
- utility override는 `@layer utilities`
- scoped style을 쓰더라도 공통 token 선언을 `components` 레이어로 끌어올리지 않는다

### 의미적 토큰 명명: `--{속성}-{역할}-{변형}`

| 카테고리 | 용도 | 예시 |
|---------|------|------|
| `surface` | 배경 | `--color-surface-0`, `--color-surface-raised` |
| `text` | 텍스트 | `--color-text-1`, `--color-text-2`, `--color-text-3` |
| `interactive` | 버튼/링크/입력 | `--color-interactive-primary`, `--color-interactive-hover` |
| `status` | 상태 표시 | `--color-success`, `--color-danger`, `--color-warning`, `--color-info` |
| `accent` | 브랜드 강조 | `--color-accent-primary`, `--color-accent-bright` |
| `border` | 테두리 | `--color-border-default`, `--color-border-subtle` |

**금지**: `--blue-500` (맥락 없는 숫자), `--color-1` (역할 불명)

### 하드코딩 금지

- **금지**: 직접 `#ffffff`, `16px`, `rgb(0,0,0)`, `oklch(...)` 등 사용
- **필수**: CSS 변수 참조 (`var(--color-surface-0)`, `var(--space-4)`)
- **예외**: SVG 내 색상, CSS 계산 함수 내 중간값

### Alpha Variant는 토큰으로 승격

overlay, subtle border, hover tint처럼 반복되는 투명도 파생은 raw 값이 아니라 토큰으로 정의한다.

```css
@layer tokens {
  :root {
    --color-accent-primary-30: color-mix(
      in oklch,
      var(--color-accent-primary) 30%,
      transparent
    );
  }
}
```

- `rgba()`보다 `color-mix(in oklch, ...)` 우선
- 같은 변형을 2회 이상 쓰면 semantic token으로 승격

### Token Compliance — binary 구조 검출

literal token bypass 존재/부재 binary:

- **PASS**: 색상/spacing/radius/shadow 선언이 모두 `var(--token)` 형태
- **FAIL**: 어느 한 곳이라도 raw `#hex` / `oklch()` / `rgb()` / `rgba()` / 숫자 literal이 
  `var()` 밖에 등장 (SVG 내부, CSS 계산 함수 중간값은 예외)

임계 비율(예: 80%)이나 샘플링 규칙은 두지 않는다 — "80% 통과면 괜찮다"는 처방을 만들면
20%의 bypass를 정당화하게 된다. 어디 하나라도 literal이면 토큰 체계가 아니다.

### WCAG AA 준수

- 텍스트/배경 대비: 최소 4.5:1
- 대형 텍스트 (18px+ bold): 최소 3:1
- UI 컴포넌트: 최소 3:1

## Naming Skeleton (구조 명명만 공유, 값은 앱 자율)

각 앱은 spacing / radius / elevation 스케일을 자유 결정한다. 캐논은 **명명 규칙 + 충돌 방지 명명** 만 강제한다.

- Spacing: `--space-N` (N은 단조 증가 정수). 단계 수와 실제 값은 앱 자율
- Radius: `--radius-{sm|md|lg|xl|full}` 또는 `--radius-N`. 실제 값은 앱 자율 (0px 브루탈리스트도 OK)
- Elevation: `--shadow-{이름}` 또는 `--elevation-N`. 시각적 깊이감 표현 방식은 앱 자율

### z-index 명명 표준 (충돌 방지 — 값은 자유, 순서만 표준)

modal이 overlay보다 위에 떠야 한다는 layer 순서는 보편 사실. 값은 앱 자율, 그러나 명명·순서는 표준화.

```css
--z-base       /* 기본 콘텐츠 */
--z-dropdown   /* 드롭다운 메뉴 */
--z-sticky     /* sticky 헤더/네비 */
--z-overlay    /* 백드롭/오버레이 */
--z-modal      /* 모달/다이얼로그 (overlay보다 위) */
--z-popover    /* 팝오버 (modal과 독립) */
--z-toast      /* 토스트/스낵바 */
--z-tooltip    /* 툴팁 (가장 위) */
```

순서: base < dropdown < sticky < overlay < modal < popover < toast < tooltip. 값(0/10/100/...) 자유.

### Breakpoint 토큰 표준 (명명만)

```css
--bp-sm  /* 모바일 상한 */
--bp-md  /* 태블릿 상한 */
--bp-lg  /* 소형 데스크탑 상한 */
--bp-xl  /* 데스크탑 상한 */
```

값(640/768/1024/1280 등)은 앱 자율. media query에서 `var(--bp-md)` 직접 사용 불가하므로
SCSS 변수 / TS 상수 / UnoCSS theme 등으로 동기화. 명명만 표준.

## App Decisions (처방 X — 앱 자유)

각 앱은 다음을 자유롭게 결정:
- 그리드 단위 (4pt, 6pt, 8pt, 10pt 등)
- 스케일 내 실제 값
- border-radius 실제 값
- shadow 실제 값 (뉴모피즘, 플랫, 글래스 등)
- 추가 토큰 카테고리

### 토큰 주도형 제약 프로토콜

1. **영감 수집** — Are.na, Mobbin, Savee 등
2. **토큰 팔레트 초안** — CSS 변수 세트를 JSON/CSS로 작성
3. **범위 내 자유 구현** — 팔레트 안에서 레이아웃/구조 자유 실험
4. **정규화 관문** — 컴포넌트 10개 랜덤 샘플링 → 토큰 매핑률 80% 이상
5. **미달 시** — 구현을 억지로 맞추지 않고 **토큰 체계 자체를 수정**

## Same-Product Token Alignment

House of Brands는 앱 간 UI 공유를 금지하지만, 같은 제품의 landing/app drift를 허용하는 규칙은 아니다.

- 동일 제품의 landing과 app은 semantic token 값을 정렬해야 한다
- canonical source를 한 곳으로 정한다. 보통 app의 token source
- landing은 그 값을 import, generate, copy 중 한 방식으로 추종한다
- drift가 발견되면 컴포넌트 patch보다 token source 정합을 우선한다

## Context-Aware Token Overrides

동일 시맨틱 이름, 맥락별 다른 값. 병렬 네이밍 시스템 생성 금지.

### Viewport Context
```css
@media (min-width: 1024px) {
  :root { --space-section: 4rem; }
}
@media (max-width: 640px) {
  :root { --space-section: 2rem; }
}
```

### Interaction State Context
```css
[data-state="editing"] {
  --color-surface-0: var(--color-surface-raised);
  --color-border-default: var(--color-interactive-primary);
}
```

### Screen Type Context
```css
.dashboard { --space-card-gap: var(--space-4); }
.landing   { --space-card-gap: var(--space-8); }
```

원칙: 동일 시맨틱 토큰을 맥락별로 오버라이드. 새로운 토큰 이름 생성은 최후의 수단.
