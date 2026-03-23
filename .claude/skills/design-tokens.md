---
description: 3-tier 디자인 토큰 구조 + 탐색 프로토콜
effort: medium
allowed-tools: Read, Glob, Grep
---

# Design Tokens — 3-Tier Architecture

## Auto Context
!find . -name 'tokens.css' -o -name 'variables.css' 2>/dev/null | head -3

> House of Brands 원칙에 따라 각 앱의 **값**은 다르지만 **구조와 명명 규칙**은 동일.
> 이 스킬은 구조를 정의한다. 특정 색상값을 처방하지 않는다.

## 3계층 구조

```
Primitives (원시 값)
  ↓ 의미 부여
Semantic (역할 매핑)
  ↓ 브랜드 특화
Accent (강조/브랜드)
```

## CSS Cascade Layers

```css
@layer reset, base, tokens, components, utilities;
```

레이어 순서로 specificity 관리. `!important` 사용 금지.

## 의미적 토큰 명명 규칙

토큰 이름은 AI와 개발자 모두에게 **역할과 맥락**을 전달해야 한다.

### 명명 패턴: `--{속성}-{역할}-{변형}`

```
✅ --color-surface-0          (역할: 배경, 변형: 기본)
✅ --color-text-primary       (역할: 텍스트, 변형: 주요)
✅ --color-interactive-hover  (역할: 인터랙션, 변형: 호버)
❌ --blue-500                 (맥락 없는 숫자 기반)
❌ --color-1                  (역할 불명)
```

### 역할 카테고리

| 카테고리 | 용도 | 예시 |
|---------|------|------|
| `surface` | 배경 | `--color-surface-0`, `--color-surface-raised` |
| `text` | 텍스트 | `--color-text-1`, `--color-text-2`, `--color-text-3` |
| `interactive` | 버튼/링크/입력 | `--color-interactive-primary`, `--color-interactive-hover` |
| `status` | 상태 표시 | `--color-success`, `--color-danger`, `--color-warning`, `--color-info` |
| `accent` | 브랜드 강조 | `--color-accent-primary`, `--color-accent-bright` |
| `border` | 테두리 | `--color-border-default`, `--color-border-subtle` |

## 토큰 주도형 제약 패턴

AI에게 UI 구현을 요청할 때:

1. **먼저** 해당 앱의 토큰 팔레트(CSS 변수 세트)를 제시
2. "이 제약 조건 내에서만 구현하라"고 명시
3. AI가 임의의 창의성 대신 **구현 엔진**으로 동작

```
예시 프롬프트:
"다음 토큰 팔레트를 사용하여 pricing card를 구현해줘.
이 변수 외의 색상/spacing/radius는 사용하지 마."
+ [해당 앱의 CSS 변수 세트]
```

## 디자인 탐색 프로토콜

새로운 디자인을 시도할 때:

1. **영감 수집** — Are.na, Mobbin, Savee 등 (알고리즘 큐레이션 밖에서 의도적 선택)
2. **토큰 팔레트 초안 정의** — CSS 변수 세트를 JSON/CSS로 작성
3. **범위 내 자유 구현** — 팔레트 안에서 레이아웃/구조를 자유롭게 실험
4. **정규화 관문** — 컴포넌트 10개 랜덤 샘플링 → 토큰 매핑률 80% 이상
5. **미달 시** — 구현을 억지로 맞추지 않고 **토큰 체계 자체를 수정**

## 8pt Spacing Grid

```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
}
```

모든 margin, padding, gap에 이 스케일 사용. 임의 px 금지.

## Border Radius

```css
:root {
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;
}
```

## Elevation (그림자)

3-5개의 명명된 레벨만 허용. 임의 그림자 값 생성 금지.

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
  --shadow-xl: 0 16px 48px rgba(0,0,0,0.16);
}
```

## WCAG AA 준수

- 텍스트/배경 대비: 최소 4.5:1
- 대형 텍스트(18px+ bold): 최소 3:1
- UI 컴포넌트: 최소 3:1

## 하드코딩 금지

- 직접 `#ffffff`, `16px`, `rgb(0,0,0)` 등 사용 금지
- 반드시 CSS 변수 참조 (`var(--color-surface-0)`, `var(--space-4)`)
- 예외: SVG 내 색상, CSS 계산 함수 내 중간값
