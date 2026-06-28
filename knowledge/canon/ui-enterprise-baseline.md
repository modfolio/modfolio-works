---
title: UI Enterprise Baseline — State Surfaces + WCAG 2.2 AA
version: 1.0.0
last_updated: 2026-06-24
source: [knowledge/journal/20260624-fleet-completion-uiux-evergreen-audit.md]
sync_to_siblings: true
applicability: always
consumers: [layout-patterns, page, component, design, fix, design-critic, accessibility-auditor, ui-quality-gate]
---

# UI Enterprise Baseline — 상태 표면 + WCAG 2.2 AA

> **무엇**: "엔터프라이즈급 경험"의 brand-neutral·framework-agnostic **완성 floor**. `design-tokens.md`(값 자율)·`layout-patterns.md`(구조 자율)가 "처방 X"인 것과 달리, 여기 두 가지 — **상태 표면**과 **접근성** — 는 *취향*이 아니라 **올바름의 floor** 다. WCAG 2.2 AA 는 외부 법/표준이고, 상태 처리(loading/empty/error)는 기본 완성도다. CLAUDE.md "안 되는 것만 명시하고 나머지는 다 된다"의 그 **"안 되는 것"**.
>
> **메커니즘 (ADR-001 정합)**: 공유 UI 패키지를 만드는 게 **아니다**. ADR-001(modfolio-platform 공유 UI 라이브러리 **엄금**) + `design-tokens.md` §10-11(universe 공용 토큰 소스 금지·House of Brands). 따라서 이 canon = **표준(floor)**, 구현은 각 앱이 ADR-001 의 **"복사 & 붙여넣기"** 로 자기 프레임워크에 가져간다. 비주얼·카피·토큰·레이아웃은 자유, floor 충족만 공통.
>
> **근거**: fleet 27-repo 실측 감사(`journal/20260624-fleet-completion-uiux-evergreen-audit.md`) — 상태 표면 불균일 + a11y 결손이 **거의 전 앱에 반복**(테마 B·C). 신규 기능이 아니라 *이미 만든 기능을 200% 살리는* 가장 보편적 격차. 이 canon 이 그 baseline.

---

## Part 1 — 상태 표면 계약 (State-Surface Contract)

### 원칙: async/data 뷰는 4상태를 *모두* 처리

데이터·비동기에 의존하는 모든 뷰(목록/상세/검색/폼 제출/업로드/스트리밍/AI 응답)는 네 상태를 **명시 분기**한다. 하나라도 빠지면 "동작하는데 미완성"으로 읽힌다.

| 상태 | 정의 | floor (충족 안 하면 "안 되는 것") | 자유 (앱 결정) |
|---|---|---|---|
| **loading** | 데이터 미도착 | 레이아웃을 **예약**하는 placeholder(skeleton 우선) — CLS 0 지향 | skeleton 모양·애니메이션·스피너 병용 여부 |
| **empty** | 성공·결과 0건 | "왜 비었는지 + 다음 행동(CTA)" 명시 | 일러스트·카피·CTA 형태 |
| **error** | 실패 | **사람이 읽는** 메시지 + 복구 경로(재시도/문의/뒤로) | 톤·시각·재시도 UX |
| **content** | 정상 | (기본) | 전부 |

**비-floor 안티패턴 (감지 시 알린다)**:
- async fetch 뷰에 loading 표현이 없음 → 빈 화면 → 콘텐츠 점프(CLS).
- list/collection 에 empty 분기 없음 → "0건"이 깨진 화면처럼 보임.
- mutation/제출/업로드의 실패가 **무음**(catch 후 console 만 / JSON 그대로 / 토스트 없음).
- 라우트 간 상태 처리가 **불균일**(일부 페이지만 skeleton) — *fleet 최빈 갭*. 한 앱 안에서 상태 처리의 일관성이 곧 완성도 신호.

### 감지 신호 (처방 X — 구현·비주얼은 앱 자율, floor 만 공통)

`design-critic`/`accessibility-auditor`/`ui-quality-gate` 가 다음을 *알린다*(강제 X, 해결은 작성자):
- 비동기 데이터 라우트 수 대비 loading/skeleton 표현 보유 라우트 수의 큰 비대칭.
- `{#await}`/`Suspense`/`createResource`/`useQuery` 류의 error 분기 누락.
- empty 텍스트·CTA 없는 collection 렌더.

### copy-paste 레퍼런스 (복사해서 자기 앱 프레임워크로 — ADR-001)

**framework-agnostic 4상태 의사코드** (각 앱이 자기 문법으로 옮긴다):

```
view(state):
  if loading: <Skeleton/>            # 콘텐츠와 같은 박스 크기 예약(CLS 0)
  elif error: <ErrorState msg retry> # 사람이 읽는 메시지 + 재시도
  elif empty: <EmptyState why cta>   # 왜 비었나 + 다음 행동
  else:       <Content data>
```

- **Svelte 5 (SvelteKit)**: `{#await promise}` 의 3-branch(pending/then/catch) + then 안에서 `data.length === 0 ? <Empty/> : <List/>`. runes 환경은 `$derived` 로 status 계산. SSR load 의 `streamed` 도 동일 4상태.
- **Vue / Nuxt**: `<Suspense>` + `useAsyncData`/`useFetch` 의 `{ status, error }`(`pending|success|error`)로 분기. `status==='success' && !data.length` 가 empty.
- **SolidStart**: `createResource` + `<Suspense fallback>` + `<ErrorBoundary fallback>` + resource `()=>[]` 체크로 empty.
- **Astro (islands)**: 서버 fetch 는 try/catch 로 error 분기, 클라이언트 island 는 위 프레임워크 규칙. 정적 콘텐츠는 해당 없음.

**3-state 래퍼는 앱 내부에서 1회 작성 후 재사용** — 공유 패키지로 만들지 않는다(ADR-001). 같은 앱 안에서의 컴포넌트화는 권장(중복 제거), 앱 *간* 공유는 copy-paste.

---

## Part 2 — WCAG 2.2 AA Baseline (floor — 비협상)

WCAG 2.2 AA 는 외부 표준(법적 기준선). "앱 자율"이 아니라 **충족해야 하는 floor**. 구현 방식은 자유, 충족은 공통. 아래는 fleet 감사에서 가장 자주 빠진 항목 위주.

### 2.1 상태 알림 — `aria-live` (SC 4.1.3 Status Messages)
async 상태 변화(로딩 완료/저장됨/에러/녹음 중/STT 결과/스트리밍 토큰)는 **스크린리더에 전달**되어야 한다. 시각적 토스트만으로는 부족.
- 비차단 상태(저장됨/로딩) → `aria-live="polite"` (또는 `role="status"`).
- 긴급/에러 → `aria-live="assertive"` (또는 `role="alert"`).
- live region 은 **DOM 에 미리 존재**하고 내용만 바뀌어야 announce 됨(렌더 시 새로 mount 하면 안 읽힐 수 있음).

### 2.2 접근 가능한 폼 (SC 1.3.1 / 3.3.1 / 3.3.3 / 4.1.2)
- 모든 input 에 연결된 `<label for>`(또는 `aria-label`/`aria-labelledby`).
- 검증 실패: 해당 input 에 `aria-invalid="true"` + 에러 메시지를 `aria-describedby` 로 **프로그램적 연결**(시각적 빨간 테두리만으로는 floor 미달).
- 에러 요약/첫 에러로 focus 이동.

### 2.3 키보드 조작성 (SC 2.1.1 / 2.4.7)
- 클릭 가능한 모든 것은 키보드로도 조작 가능. **`<div onclick>`/`<td onclick>` 금지** → 네이티브 `<button>`/`<a>` 또는 `role`+`tabindex="0"`+`keydown`(Enter/Space) 보강.
- 커스텀 위젯(차트/파형/캔버스/에디터)도 키보드 경로 또는 동등 대체 제공. **`aria-hidden`/`role="presentation"` 으로 핵심 인터랙션을 숨기지 않는다.**
- `:focus-visible` 가시 표시(아이콘 버튼 포함). focus 제거(`outline:none`) 단독 금지.

### 2.4 모션 (SC 2.3.3) — `motion-patterns.md` 정합
- 모든 비필수 애니메이션/전환은 `@media (prefers-reduced-motion: reduce)` 가드. 일부 클래스만 가드하고 버튼 lift·토스트·페이지 전환을 빼먹지 않는다.

### 2.5 이미지·콘트라스트·타깃 (SC 1.1.1 / 1.4.3 / 2.5.8)
- 의미 있는 `<img>` 에 `alt`(장식은 `alt=""`). 아이콘-only 버튼에 접근名.
- 텍스트/배경 대비 4.5:1(대형 3:1) — gradient-text(`-webkit-text-fill-color:transparent`)는 **fallback `color`** 동반(미지원/forced-color 소실 방지).
- 타깃 크기 SC 2.5.8(min 24×24 CSS px, 예외 규정 내).

### copy-paste 레퍼런스 (vanilla — 프레임워크 무관, 복사 가능)

```html
<!-- 1) 전역 live region: 앱 루트에 1회. announce(msg) 로 텍스트만 갱신 -->
<div id="sr-status" aria-live="polite" role="status" class="sr-only"></div>
<script>
  function announce(msg){ const el=document.getElementById('sr-status'); el.textContent=''; requestAnimationFrame(()=>{el.textContent=msg}); }
</script>
```

```html
<!-- 2) 접근 가능한 필드: label + aria-invalid + aria-describedby -->
<label for="email">이메일</label>
<input id="email" type="email" aria-invalid="true" aria-describedby="email-err" />
<p id="email-err" role="alert">유효한 이메일을 입력하세요.</p>
```

```css
/* 3) reduced-motion floor: 전역 가드(앱 모션 토큰과 함께) */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; scroll-behavior: auto !important; }
}
/* .sr-only: 시각 숨김·SR 노출 (표준 클립 패턴) */
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
```

> 위 vanilla 스니펫은 ADR-001 의 copy-paste 모델 그대로 — 복사해 자기 앱에 두고 수정. 의존성 추가 아님.

---

## 무엇이 floor 이고 무엇이 자유인가

| floor (공통·비협상) | 자유 (앱 결정) |
|---|---|
| 4상태 *존재*(loading/empty/error/content) | skeleton 비주얼·empty 일러스트·error 톤·카피 |
| WCAG 2.2 AA 충족 | 색·타이포·레이아웃·모션 디자인(토큰·layout canon) |
| live region·폼 연결·키보드 경로·reduced-motion 가드 | 구현 라이브러리·구조·컴포넌트 분해 |

floor 는 "안 되는 것"을 막을 뿐, 그 위 표현은 House of Brands 그대로 앱 자율.

## 검증 (per-app, 권고)
- `multi-review`(design-critic + accessibility-auditor) / `ui-quality-gate` 가 위 감지 신호 + WCAG floor 점검.
- 라우트별 4상태 매트릭스(있음/없음) 자가 점검 — 비대칭이 곧 to-do.
- a11y 자동 도구(axe 등)는 floor 의 일부만 잡는다 — 키보드 경로·live region 은 수동 확인 병행.

## 관련
- `ADR-001`(공유 UI 패키지 엄금·copy-paste) — 이 canon 의 메커니즘 근거.
- `design-tokens.md` §10-11(공용 토큰 소스 금지) — 값 공유 안 함, 표준만 공유.
- `layout-patterns.md`(시맨틱·a11y 기초) — 이 canon 은 그 위 상태·WCAG AA **심화 baseline**.
- `motion-patterns.md`(reduced-motion) — Part 2.4 와 정합.
- `journal/20260624-fleet-completion-uiux-evergreen-audit.md` — 이 canon 을 낳은 실측 근거(테마 B·C).

## 변경 이력
- **1.0.0 (2026-06-24)**: 신설. fleet 27-repo 감사에서 도출한 상태 표면 + WCAG 2.2 AA 완성 floor. ADR-001/design-tokens §11 정합(표준+copy-paste, 패키지 아님). 종합 §6 의 "@modfolio/ui-* 패키지" 제안을 이 canon-기반 표준으로 대체.
