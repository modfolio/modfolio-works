---
description: Adobe Fonts + Pretendard + CLS 방지 + 유동 타이포
effort: medium
allowed-tools: Read, Glob, Grep
user-invocable: true
---

# Typography — Adobe Fonts + Pretendard

> 생태계 전체의 타이포그래피 통합 가이드. 8개 이상 앱에서 사용.

## Adobe Fonts (Typekit)

### Master Web Kit

```html
<link rel="stylesheet" href="https://use.typekit.net/fmh4fod.css" />
```

Kit ID: `fmh4fod` — 모든 앱에서 공유하는 단일 Kit.

### 주요 서체

| 서체 | 용도 | 카테고리 |
|------|------|---------|
| goldenbook | Display/Heading | Serif |
| freight-text-pro | Body/Story | Serif |
| neue-haas-unica | UI/Interface | Sans |
| degular-mono | Code/Data | Mono |
| acumin-pro | Neutral Body | Sans |
| brandon-grotesque | Brand/Marketing | Sans |

## Pretendard (한국어 Fallback)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
```

한국어 글리프가 없는 Adobe 서체의 fallback으로 사용.

## CLS 방지: Metric Overrides

Layout Shift를 방지하려면 fallback 폰트에 metric override를 적용:

```css
@font-face {
  font-family: "goldenbook-fallback";
  src: local("Georgia");
  ascent-override: 95%;
  descent-override: 25%;
  line-gap-override: 0%;
  size-adjust: 105%;
}
```

- `ascent-override` / `descent-override`: 줄 높이 일치
- `size-adjust`: 글자 폭 일치
- `local()`: 시스템 폰트를 fallback으로 사용 (다운로드 없음)

## CSS 변수 계층

각 앱은 독립 디자인이지만 변수 구조는 통일:

```css
:root {
  --font-display: "goldenbook", "goldenbook-fallback", serif;
  --font-body: "freight-text-pro", "Pretendard Variable", sans-serif;
  --font-ui: "neue-haas-unica", "Pretendard Variable", sans-serif;
  --font-mono: "degular-mono", "SF Mono", monospace;
}
```

## 앱별 조합 예시

| 앱 | Display | Body | UI |
|----|---------|------|----|
| modfolio-press | goldenbook | freight-text-pro | neue-haas-unica |
| modfolio-pay | brandon-grotesque | acumin-pro | acumin-pro |
| gistcore | — | Noto Serif KR (Google) | Pretendard |
| modfolio-admin | — | — | Pretendard (geometric sans) |
| 그룹 랜딩 (Works/LS/Axiom/Studio) | goldenbook | — | Pretendard |

## Astro 랜딩 통합

```astro
---
// src/layouts/Base.astro
---
<html>
<head>
  <link rel="stylesheet" href="https://use.typekit.net/fmh4fod.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
</head>
</html>
```

## SvelteKit 앱 통합

```svelte
<!-- src/app.html -->
<head>
  <link rel="stylesheet" href="https://use.typekit.net/fmh4fod.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
</head>
```

## CSP 설정

Adobe Fonts + Pretendard CDN 사용 시 CSP 헤더에 추가 필요:

```
style-src: https://use.typekit.net https://p.typekit.net https://cdn.jsdelivr.net
font-src: https://use.typekit.net https://cdn.jsdelivr.net
```

## 유동 타이포그래피 (CSS clamp)

브레이크포인트 단위의 불연속 변화 대신 연속 보간:

```css
:root {
  --font-size-display: clamp(2.5rem, 2rem + 2.5vw, 4rem);
  --font-size-h1: clamp(2rem, 1.5rem + 2vw, 3.5rem);
  --font-size-h2: clamp(1.5rem, 1.25rem + 1.25vw, 2.5rem);
  --font-size-h3: clamp(1.25rem, 1.1rem + 0.75vw, 1.75rem);
  --font-size-body: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --font-size-small: clamp(0.875rem, 0.85rem + 0.125vw, 0.9375rem);
}
```

## 줄 길이 제한

본문 텍스트: `max-width: 65ch` (50-75자 범위). 넓은 레이아웃에서도 가독성 유지.

## text-align: justify 금지

- 한국어: 자간 불균등, 어절 단위 끊김으로 가독성 저하
- 영어: river effect (단어 사이 불규칙 공백)
- 기본: `text-align: left` (LTR)

## 위계적 가중치 원칙

h1-h6 간 최소 2단계 font-weight 차이로 시각적 위계 명확화:

```css
h1 { font-weight: 700; }  /* Bold */
h2 { font-weight: 500; }  /* Medium */
h3 { font-weight: 400; }  /* Regular */
```

## 상세 참조

- 전체 서체 조합 매트릭스: `knowledge/journal/20260223-typography-master-combinations.md`
- 통합 가이드 (46KB): `knowledge/references/adobe-fonts-integration-guide.md`
