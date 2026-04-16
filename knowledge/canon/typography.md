---
title: Typography — Structural Convention
version: 3.0.0
last_updated: 2026-04-15
source: [docs/design/typography-master-combinations.md]
sync_to_children: true
consumers: [design, page, design-engineer]
---

# Typography — Structural Convention

> 각 앱은 자신의 타이포그래피 시스템을 소유한다. 이 문서는 구조(변수 이름)만 정의하고
> 위계·가독성·CLS 같은 구체 선택은 앱 자율이다.

## Structural Naming (공통)

CSS 변수 이름만 공유. 값·서체·스케일은 모두 앱 자유:

```css
:root {
  --font-display: /* 앱이 선택 */;
  --font-body: /* 앱이 선택 */;
  --font-ui: /* 앱이 선택 */;
  --font-mono: /* 앱이 선택 */;
}
```

## Detection Signals (권장이지 강제 아님)

구조적으로 의심스러울 수 있는 신호들 — WARN으로만 표시, 해결은 앱 자율:

- h1-h6 간 weight 차이가 거의 없어 위계가 불분명할 때
- 본문 줄 길이가 매우 좁거나 넓어 가독성이 깨질 가능성
- `text-align: justify` 한국어/영어 조합 사용
- fallback font-face metric overrides 부재 → CLS 리스크
- font-size 리터럴이 `var()` / `clamp()` 밖에서 반복 등장

이들은 각 앱의 브랜드 / 디자인 철학에 따라 정당할 수 있다. critic은 숫자 임계를 가하지 않는다.

## CSP 헤더
사용하는 폰트 서비스에 맞게 `style-src` / `font-src` 설정.

## Shared Resources (선택적 참고)

### Adobe Fonts Kit (선택적 공유 자원)

Kit ID: `fmh4fod` — 사용을 원하는 앱은 이 Kit에서 서체를 선택할 수 있다.

```html
<link rel="stylesheet" href="https://use.typekit.net/fmh4fod.css" />
```

사용 의무 없음. Google Fonts, self-hosted, 시스템 폰트도 허용.

### Pretendard (한국어 권장)

한국어 fallback으로 권장. 의무 아님 — Noto Sans KR, 본고딕 등도 가능.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
```

### CLS 방지: Metric Overrides (권장 패턴)

```css
@font-face {
  font-family: "display-fallback";
  src: local("Georgia");
  ascent-override: 95%;
  descent-override: 25%;
  line-gap-override: 0%;
  size-adjust: 105%;
}
```

### 유동 타이포그래피 참고 스케일

```css
:root {
  --font-size-display: clamp(2.5rem, 2rem + 2.5vw, 4rem);
  --font-size-h1: clamp(2rem, 1.5rem + 2vw, 3.5rem);
  --font-size-body: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
}
```

### 마스터 조합 (영감 소스, 배정 아님)

| 이름 | 영감 대상 | Display | Body | UI |
|------|----------|---------|------|----|
| Warm Classic | 학원 CRM | Mrs Eaves | Adobe Caslon Pro | Brandon Grotesque |
| Vintage Magic | 출판/오디오 | Goldenbook | Filosofia | Proxima Nova |
| Mystic Elegance | 자격증 | Orpheus Pro | Adobe Caslon Pro | Josefin Sans |
| High-End Fantasy | AI 글쓰기 | IvyPresto Display | Filosofia | Brandon Grotesque |
| Lyrical Poet | 습관/기록 | P22 Mackinac | Adobe Caslon Pro | Josefin Sans |

## App Decisions (처방 X)

각 앱은 다음을 자유롭게 결정:
- 폰트 소스 (Adobe Fonts, Google Fonts, self-hosted, system)
- Display/Body/UI/Mono 각각의 서체
- 한국어 fallback 서체
- Letter-spacing, line-height 세부 값
- 유동 타이포 `clamp()` 함수의 min/max 값

각 앱은 Brand Passport (`docs/brand-passport.md`)에 타이포 선택과 근거를 기록.
