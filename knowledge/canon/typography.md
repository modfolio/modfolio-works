---
sor: modfolio-design/canon/typography.md  # SoR 이관 2026-07-23; 이 파일은 mirror — 편집은 upstream(modfolio-design)
title: Typography — Structural Convention
version: 3.1.0
last_updated: 2026-07-27
source: [docs/design/typography-master-combinations.md]
sync_to_siblings: true
applicability: always
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

### 크기 스케일 명명 (2026-07-27 추가)

서체 **패밀리** 이름만 있고 **크기** 이름이 없었다. 그래서 앱들이 크기를 리터럴로 적었고,
아래 Detection Signals 의 "font-size 리터럴 반복" 이 검출기도 없이 방치됐다. 참조 구현
(`design.modfolio.io`)을 실측했더니 세 CSS 파일에 **15개 값이 46회** 흩어져 있었고,
그중 0.78 / 0.8 / 0.82rem 처럼 **0.3px 차이의 우연한 변주**가 다수였다.

`design-tokens.md` 의 명명 규칙(`--{속성}-{역할}-{변형}`)을 따라 **역할 기반**으로 이름만
공유한다. 숫자 계단(`--fs-1`)은 같은 canon 이 "맥락 없는 숫자" 로 금지한 형태다.

```css
:root {
  --font-size-micro:    /* 배지·첨자 */;
  --font-size-caption:  /* 캡션·메타 */;
  --font-size-ui:       /* UI 기본 (버튼·라벨·표) */;
  --font-size-body:     /* 본문 */;
  --font-size-lead:     /* 도입 문단 */;
  --font-size-subtitle: /* 소제목 */;
  --font-size-h1: /* … */; --font-size-display: /* … */;   /* 유동은 clamp() 권장 */
}
```

**값·단계 수는 앱 자율.** 전부 쓸 의무도 없다 — 쓰는 역할만 정의한다. 제목처럼 맥락마다
곡선이 다른 자리는 `clamp()` 를 직접 쓰는 것이 정당하다(아래 Signals 도 `clamp()` 는
리터럴로 세지 않는다).

**게이트**: 이름은 `@modfolio/design-lint` 의 `sanctioned-token` 이 스켈레톤 소속으로
강제하고, 리터럴 반복은 `typography-signals` 가 검출한다(canon 이 규정한 WARN).

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

Kit ID: **`fmh4fod`** — 사용을 원하는 앱은 이 Kit에서 서체를 선택할 수 있다.

```html
<link rel="stylesheet" href="https://use.typekit.net/fmh4fod.css" />
```

사용 의무 없음. Google Fonts, self-hosted, 시스템 폰트도 허용.

**실측 패밀리 (2026-08-05, `curl https://use.typekit.net/fmh4fod.css` → 200 · 17,096 B)** — **6종**:

```
din-2014 · garamond-premier-pro · neue-haas-grotesk-display
pretendard · sandoll-jebi2 · source-code-pro
```

> ### ⚠ 재정정 (2026-08-05) — **2026-07-27 «정정» 이 거꾸로였다**
>
> 그때 이 자리를 `fmh4fod` → `auk2qdl` 로 바꿨고 근거는 *"이 repo 의 다른 모든 산출물이
> 전부 `auk2qdl` 을 쓴다 — 실사용 쪽으로 맞췄다"* 였다. **두 ID 중 어느 쪽이 실제로
> 응답하는지는 재지 않았다.**
>
> ```
> curl https://use.typekit.net/auk2qdl.css   →  412  (19 B, "precondition failed")
> curl https://use.typekit.net/fmh4fod.css   →  200  (17,096 B)
> ```
>
> `auk2qdl` 은 **죽은 ID** 였다. 그래서 그 정정 이후 이 canon 은 31 repo 에게 **로드되지
> 않는 스타일시트**를 가르쳤고, 그것을 따른 앱은 선언한 서체가 **한 번도 렌더되지 않은 채**
> 폴백으로만 살았다. 고장처럼 보이지 않아서(폴백이 멀쩡히 그려진다) 아무도 몰랐다.
>
> **이건 이 저장소가 반복해 배운 형태다** — *"사본끼리의 일치는 정합이 아니다."*
> 산출물 다수결로 canon 을 맞추지 말고 **실물에 물어야** 했다. 확인 비용은 `curl` 한 줄이었다.
>
> ⚠ 「39 패밀리」도 근거가 없었다. 실측은 **6종**이다.
>
> ※ Adobe Fonts 킷은 **자기 호스팅이 라이선스로 금지**된다 — 이 킷의 서체는 CDN 링크로만 쓴다.
> ※ ⚠ **CJK 는 이 킷으로 못 쓴다** — `gotchas.md` §"Adobe Fonts — CJK 는 CSS 임베드로 못
> 쓴다"(connect 2026-07-26 실측). `sandoll-jebi2` 가 킷에 있어도 **한글 페인트는 보장되지
> 않는다.** 한글은 self-host(`@fontsource-variable/noto-serif-kr`)가 권고다.

### Pretendard (한국어 권장)

한국어 fallback으로 권장. 의무 아님 — Noto Sans KR, 본고딕 등도 가능.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
```

**자기 호스팅 권장 (OFL — 라이선스가 허용한다).** 참조 구현인 `design.modfolio.io` 는 2026-07-27
자기 호스팅으로 옮겼다. 실측 근거:

| 방식 | 방문자 다운로드 | 비고 |
|---|---|---|
| static 4 weight (400·500·600·700) | **3.12MB** | 브라우저가 쓰는 weight 수만큼 파일을 받는다 |
| variable 단일 | **2.06MB** | weight 45~930 전부 커버 |
| **variable dynamic-subset** | **~0.60MB** | `unicode-range` 로 92분할 — 렌더되는 문자가 속한 것만 받는다 |
| `Pretendard Std` | 291KB | ⚠ **Latin 전용** — 한글이 없다. 한국어 앱은 채택 불가 |

⚠ **서브셋을 "필요한 것만" 고르지 말 것.** 참조 구현이 계산해보니 포털 텍스트가 요구하는 24개
서브셋은 한글 음절 11,172자 중 **14.3%** 만 덮는다 — 문구가 조금만 바뀌어도 조용히 폴백된다.
92개를 다 두어도 방문자 다운로드는 그대로다(브라우저가 필요한 것만 받는다).

⚠ **dynamic-subset 에는 `preload` 를 쓰지 말 것.** `preload` 는 `unicode-range` 를 모르므로
쓰지도 않을 서브셋을 강제로 받게 한다. CSS 를 `<head>` 초반에 두어 발견을 앞당기는 것으로 족하다.

경로: `public/fonts/pretendard/*.woff2` + 생성된 `@font-face` CSS 를 `<link rel="stylesheet">`.
조달·생성은 스크립트로 재현 가능하게 둔다(참조 구현: `scripts/fetch-fonts.ts`) — 폰트 바이너리는
커밋되지만 출처가 파일에 안 남으므로.

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

**값은 추측하지 말고 폰트 파일에서 뽑는다.** 위 숫자는 형태 예시이지 쓰라는 값이 아니다 —
틀린 보정은 없느니만 못하다. 세로 메트릭은 실제 폰트에서 결정적으로 계산된다:

```
ascent-override  = ascent / unitsPerEm × 100
descent-override = |descent| / unitsPerEm × 100
line-gap-override = lineGap / unitsPerEm × 100
```

(참조 구현 실측: Pretendard Variable upem 2048 · ascent 1950 → **95.21%** ·
descent −494 → **24.12%** · lineGap 0 → **0%**.)

`size-adjust`(가로 폭 보정)는 **로컬 폴백 서체를 실제로 측정할 수 있을 때만** 넣는다. 폴백은
OS 마다 다르므로 측정 없이 쓰면 추측이다. 참조 구현은 세로 메트릭만 맞추고 `size-adjust` 는
생략했다.

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
