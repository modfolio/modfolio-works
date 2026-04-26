---
title: Design Tokens — Structural Convention
version: 3.1.0
last_updated: 2026-04-22
source: [.claude/skills/design-tokens/SKILL.md]
sync_to_siblings: true
applicability: always
consumers: [design-tokens, component, page, design, fix, design-critic, component-builder]
spec_refs:
  - https://www.designtokens.org/tr/2025.10/format/
  - https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
---

# Design Tokens — Structural Convention

> House of Brands 원칙: 각 앱의 **값**은 다르지만 **구조와 명명 규칙**은 동일.
> 2026-04 기준 생태계 표준 교환 포맷은 **DTCG 2025.10** (W3C Design Tokens Community Group, Final Community Group Report, 2025-10-28). 자세한 스펙 해석은 하단 "DTCG 2025.10 정합 가이드" 참조.

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

---

## DTCG 2025.10 정합 가이드

CSS 변수 체계(위)는 **런타임 표현**이고, 디자이너 도구(Figma / Tokens Studio / Supernova / zeroheight)와 코드 파이프라인 사이의 **교환 포맷**은 DTCG JSON (`.tokens.json`)이다. 둘은 1:1이 아니라 **빌드 단계로 연결**된다.

```
Figma Variables / Tokens Studio / Supernova
   ↓  export (DTCG 2025.10 JSON)
tokens/*.tokens.json          ← 소스 오브 트루스 (per-app)
   ↓  Style Dictionary v4+ (transform + format)
tokens.css (var(--…) 선언)    ← 본 canon의 "CSS 변수 체계" 준수
```

### 1. 버전 정책 (2026-04 기준)

| 항목 | 값 | 근거 |
|------|-----|------|
| 교환 포맷 | DTCG 2025.10 | Final Community Group Report, 2025-10-28 — "stable" 로 명시 |
| 상태 | Community Group 최종보고서 (W3C Recommendation 아님) | spec 명시: "While not a W3C recommendation … intended for implementation" |
| 차기 초안 | `drafts/format/` 2026-04-10 preview | spec 명시: "Do not attempt to implement this version" → adoption 금지 |
| 빌드 도구 | Style Dictionary v4 (부분 지원) → v5 (full 2025.10, WIP) | Style Dictionary GitHub Issue #1590 |
| Figma | 네이티브 import/export (2025-11 GA, Schema 2025 발표) — `$extensions` 미보존 | Figma Obra Studio, figma.com/blog/schema-2025-design-systems-recap |
| Tokens Studio | "W3C DTCG" 포맷 토글 제공 — "Legacy" 와 런타임 변환 | docs.tokens.studio/manage-settings/token-format |
| Supernova | DTCG Export module + GitHub/GitLab auto-push | github.com/Supernova-Studio/design-tokens-format-module |
| zeroheight | DTCG 지원 (문서 중심) | zeroheight.com/blog/whats-new-in-the-design-tokens-spec |

**2026 업데이트 확인 결과**: 2025.10 이후 stable 릴리즈 없음. `drafts/format/` 2026-04-10 preview 에는 `$root` / `$extends` / `$ref` (RFC 6901 JSON Pointer) 논의가 있지만 **구현 금지** 상태. 본 canon 은 2025.10 만 준수 대상으로 한다.

### 2. JSON 구조 필수 키

모든 토큰은 다음 키를 사용한다. 앞의 `$` 는 **DTCG 예약어** — 누락 / prefix 생략 금지.

| 키 | 필수 | 의미 |
|----|------|------|
| `$value` | O | 토큰 실제 값 (primitive / composite / alias) |
| `$type` | O (그룹 상속 가능) | 타입 태그. tool 이 값 구조로 추측 금지 |
| `$description` | 선택 | 사람이 읽는 설명 |
| `$extensions` | 선택 | 벤더 메타. reverse-DNS (`com.modfolio.tokens.*`) 준수 |
| `$deprecated` | 선택 | `true` or 설명 문자열 |

**그룹**은 같은 JSON 객체에 토큰과 중첩해 놓되, 그룹용 예약 키는 `$description` / `$extensions` / `$deprecated` 만 허용. `$type` 은 그룹에 두면 자식 토큰이 상속한다.

### 3. Alias (토큰 참조) 문법

DTCG 2025.10 은 **두 가지 참조 문법**을 정식 인정한다. 생태계는 **curly-brace 우선**, JSON Pointer 는 composite property-level 참조에만 사용한다.

```jsonc
// 1) Curly-brace — 토큰의 $value 전체를 치환. 대부분 이것만으로 충분.
{ "$value": "{color.brand.primary}" }

// 2) JSON Pointer (RFC 6901) — composite 의 특정 속성만 참조할 때
{ "$ref": "#/color/brand/primary/$value/components/0" }
```

- 순환 참조 금지 (tool 이 감지 + 오류).
- 토큰 이름에 `{`, `}`, `.`, `$`-prefix 사용 금지.
- 체인 참조 허용 — 최종 값이 나올 때까지 해결.

### 4. 지원 타입 (2025.10 spec 발췌)

**Primitive**: `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`, `string`, `boolean`.

**Composite**: `strokeStyle`, `border`, `transition`, `shadow`, `gradient`, `typography`.

주의 포인트:

- **`color`**: 더 이상 hex 문자열 단일이 아니다. 객체 구조. 2025.10 의 권고 `colorSpace` 는 `srgb`, `srgb-linear`, `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `xyz`, `xyz-d50`, `xyz-d65`, `display-p3`, `rec2020`, `a98-rgb` 등 CSS Color L4 계열. `components` 배열 + 선택 `alpha`. 후방 호환을 위해 `hex` 필드(fallback) 병기 가능. 우리 코드 CSS 는 `color-mix(in oklch, ...)` 사용 중이므로 **DTCG color space 는 `oklch` 를 기본**으로 삼는다.
- **`dimension`**: 2025.10 에서 **객체 구조** 로 변경(`{"value": n, "unit": "px"|"rem"}`). 허용 단위는 spec 상 `px` / `rem` 만 정식. `em` / `%` / viewport 단위는 spec 외 → Style Dictionary 도 v4/v5 에서 `px`/`rem` 만 transform. 우리 런타임 CSS 는 여전히 `rem` / `%` 를 쓸 수 있으나 **DTCG JSON 교환 시에는 `px` 또는 `rem` 만 사용**.
- **`fontWeight`**: 1–1000 정수 또는 named (`thin`/`extra-light`/…/`extra-black`). 범위 벗어나면 invalid.
- **`duration`**: `{"value": n, "unit": "ms"|"s"}`.
- **`cubicBezier`**: 정확히 4개 숫자 배열 `[P1x, P1y, P2x, P2y]`. X 좌표 [0,1] 제약.
- **`strokeStyle`**: 문자열 키워드(`solid`/`dashed`/`dotted`/`double`/`groove`/`ridge`/`outset`/`inset`) 또는 `{dashArray, lineCap}` 객체.
- **`border`** / **`transition`** / **`shadow`** / **`gradient`** / **`typography`**: composite. 각 속성에 primitive 값 또는 alias 삽입 가능.

spec 외 타입(예: `spacing` 스케일, `radius`, `z-index`)은 **`dimension` 또는 `number` 로 표기**하고, 그룹 이름으로 카테고리를 표현한다(예: `spacing.4`, `radius.md`, `z.modal`).

### 5. 파일 컨벤션

- 확장자: `.tokens.json` (권장) 또는 `.tokens`. MIME: `application/design-tokens+json`.
- 인코딩: UTF-8. JSON 은 RFC 8259.
- **권장 분할** (per-app):
  - `tokens/primitive/color.tokens.json` — raw palette
  - `tokens/primitive/dimension.tokens.json` — spacing / radius scale
  - `tokens/semantic/color.tokens.json` — role mapping (alias → primitive)
  - `tokens/semantic/typography.tokens.json`
  - `tokens/brand/accent.tokens.json` — brand-specific overrides
- 멀티 브랜드/테마: `themes/{name}/*.tokens.json` 으로 **파일 분리**. Style Dictionary multi-source 로 합성. DTCG 2025.10 은 멀티-파일 오버라이드 규칙을 공식 표준화하지 않았지만 `$extensions` 로 테마 메타를 붙일 수 있다.

### 6. 우리 CSS 변수 체계와의 매핑

DTCG JSON 의 경로는 `.` 으로 펼쳐 CSS 변수 명명 규칙에 맞춘다. Style Dictionary 기본 transform 과 호환.

| DTCG path | CSS 변수 |
|-----------|----------|
| `color.surface.0` (semantic group) | `--color-surface-0` |
| `color.interactive.primary` | `--color-interactive-primary` |
| `space.4` | `--space-4` |
| `radius.md` | `--radius-md` |
| `shadow.elevation.2` | `--shadow-elevation-2` (composite → CSS `box-shadow` 문자열로 format) |
| `z.modal` | `--z-modal` |
| `bp.md` | `--bp-md` |

**주의**: CSS 변수 체계(본 canon 상단)는 여전히 **런타임 권위 소스**. DTCG JSON 은 디자이너 도구 왕복을 위한 교환 포맷일 뿐이다. `tokens.css` 가 손으로 수정되는 경우 — DTCG 는 없어도 된다. DTCG 는 Figma ↔ 코드 양방향 싱크가 필요한 앱에서만 채택.

### 7. 예외 — 본 canon 과 DTCG 가 충돌할 때

| 상황 | 판단 |
|------|------|
| CSS 변수 규칙(`--{속성}-{역할}-{변형}`) vs DTCG 토큰 경로 | CSS 변수 규칙 우선. DTCG path 는 transform 단계에서 매핑 |
| `color-mix(in oklch, ...)` 런타임 연산 | CSS 에서만. DTCG JSON 에는 알파 variant 를 **토큰으로 승격** 하여 별도 항목으로 정의 |
| `%` / `vh` 단위 | DTCG JSON 외부 유지 (CSS 또는 SCSS 상수). DTCG 교환 대상 아님 |
| `$extensions` 에 Figma node ID 등 | 허용. reverse-DNS (`com.figma.variables.*` / `com.modfolio.universe.*`) |
| alias 순환 | 금지 — tool 이 오류 반환해야 정상 |

### 8. 도구 호환성 (2026-04 실측)

| 도구 | DTCG 2025.10 지원 | 실무 주의 |
|------|-------------------|----------|
| **Figma Variables** (native) | Import/Export GA (2025-11, Schema 2025 발표) | `$extensions` 는 export 시 미보존. alias / mode 는 보존 |
| **Tokens Studio for Figma** | W3C DTCG 포맷 토글 제공. Legacy ↔ W3C 변환 | "Export to Style Dictionary" 는 설정에 따라 Legacy/W3C 선택 |
| **Style Dictionary v4** | 부분 지원. `$value`/`$type`/`$description` OK. 2025.10 `dimension` 객체 값 지원, 14 colorSpace transformer | full 2025.10 은 v5 WIP (Issue #1590). 우리는 v4 고정 + 보완 |
| **Style Dictionary v5 (alpha)** | 2025.10 full 목표 | production 투입 전 release 확인 필수 |
| **Supernova** | DTCG exporter 모듈 공식 제공 | GitHub/GitLab auto-push 지원 |
| **zeroheight** | 문서 기반 지원 (시각화) | 빌드 파이프라인은 외부 도구 필요 |
| **Penpot / Sketch / Framer** | 각자 DTCG 지원 공식 발표 (2025-10 기준) | 개별 tool 제약 별도 확인 |

### 9. 체크리스트 (앱별 채택 여부 결정)

DTCG 를 도입하기 전 질문:

- [ ] Figma Variables 와 코드의 양방향 싱크가 필요한가? 아니면 코드 단방향이면 족한가?
- [ ] 다중 브랜드/다크 모드/접근성 variant 가 3개 이상인가?
- [ ] 디자이너가 non-코드 워크플로우로 토큰을 편집하는가?
- [ ] 빌드 파이프라인에 Style Dictionary (또는 Terrazzo) 를 도입할 여유가 있는가?

**전부 No**: DTCG 생략. `tokens.css` 손편집 유지가 정공법.

**일부 Yes**: 해당 앱에서만 채택. universe 는 공용 DTCG 소스를 두지 않는다 (sec. 11 참조).

### 10. House of Brands 와 DTCG 의 궁합

본 canon 은 **구조/명명만 강제, 값은 자유**. DTCG 도 동일 철학 — 스펙은 *포맷* 을 정하고 *값* 은 정의하지 않는다. 두 원칙이 부딪히지 않으므로 DTCG 는 생태계의 **선택적 교환 레이어** 로 삽입된다:

- universe 는 공용 색/스페이싱 팔레트를 공급하지 않는다.
- 각 앱은 자체 `tokens/*.tokens.json` 을 소유한다.
- universe 는 "구조적으로 이렇게 작성하세요" 만 권고 (본 문서).
- sibling 앱 간 토큰 공유가 필요해지면 **앱끼리 직접 합의** (universe 중재 X).

### 11. Universe 레포는 공용 DTCG 소스를 두지 않는다

`contracts/design-tokens/` 디렉토리를 두더라도 내부에는 **JSON 토큰 값이 아니라 참조 문서/스키마**만 둔다. 근거:

1. House of Brands — 값은 앱 자율. 공용 팔레트는 철학 위반.
2. v2.10 Reference-only ecosystem — universe 는 참고서, enforcer 아님.
3. Figma Variables 는 per-file 이다. universe 에 공유 소스를 두면 drift 가 오히려 증가.
4. 계약 변경 시 모든 앱에 breaking change 를 전파하는 셈 — `ecosystem.json` 과 같은 "권고" 레이어와 성격이 다름.

대신 universe 는 다음을 제공한다 (현재 repo 에 존재 / 또는 추후 추가):

- 본 canon — 구조 + DTCG 정합 가이드 (이 문서)
- `.claude/skills/design-tokens/SKILL.md` — 사용 프로토콜
- `contracts/design-tokens/README.md` (선택) — 생태계 내 DTCG 채택 규약 요약 + 참고 URL

### 12. 참고 자료

**규범**
- [Design Tokens Format Module 2025.10 (Final Community Group Report)](https://www.designtokens.org/tr/2025.10/format/)
- [DTCG: First stable version 공지 (2025-10-28)](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [DTCG community repo](https://github.com/design-tokens/community-group)
- [Drafts index — 2026-04-10 preview (구현 금지)](https://www.designtokens.org/tr/drafts/)

**도구**
- [Style Dictionary — DTCG page](https://styledictionary.com/info/dtcg/)
- [Style Dictionary Issue #1590 — 2025.10 support](https://github.com/style-dictionary/style-dictionary/issues/1590)
- [Tokens Studio — W3C DTCG vs Legacy 포맷 토글](https://docs.tokens.studio/manage-settings/token-format)
- [Figma Obra Studio — DTCG Release 정리](https://figma.obra.studio/design-tokens-community-group-w3c-release/)
- [Figma Blog — Schema 2025 Recap](https://www.figma.com/blog/schema-2025-design-systems-recap/)
- [Supernova DTCG exporter module](https://github.com/Supernova-Studio/design-tokens-format-module)
- [zeroheight — What's new in the Design Tokens spec](https://zeroheight.com/blog/whats-new-in-the-design-tokens-spec/)

## 변경 이력

- **3.1.0 (2026-04-22)**: DTCG 2025.10 정합 가이드 추가. 12 서브섹션(버전 정책 / JSON 키 / alias / 타입 / 파일 컨벤션 / CSS 매핑 / 충돌 규칙 / 도구 호환성 / 체크리스트 / House of Brands 궁합 / universe 정책 / 참고). 2025.10 은 Final CG Report, 2026-04 현재 후속 stable 없음을 명시.
- **3.0.0 (2026-04-14)**: 3 계층 구조 + cascade layer + 시맨틱 명명 + binary compliance.
