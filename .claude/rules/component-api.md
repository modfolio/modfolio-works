---
paths:
  - "**/*.svelte"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.astro"
  - "**/*.vue"
---
PascalCase 컴포넌트 파일, camelCase 유틸. Boolean props: `is`/`has` prefix.
인터랙티브 요소 → `aria-label` 또는 visible label 필수. 아이콘-only 버튼은 반드시 `aria-label` 필요.
`input`/`textarea`/`select` → visible `<label>` 또는 `aria-label` 필수. `<img>`는 `alt` 필수, purely decorative일 때만 `alt=""` 허용.

## Mitosis 프리미티브(`*.lite.tsx`) 바인딩 어휘 제약 (MUST)

Mitosis 로 다중 스택 프리미티브를 생성하는 repo 에만 해당. JSX **속성 바인딩 식**은 식별자 ·
문자열 리터럴 · `( ) [ ] { } . ? : - + / * , | &` 안에서만 쓴다. 밖의 연산자를 쓰면 Mitosis 0.14
qwik 생성기가 그 식을 **값 없는 IIFE** 로 감싸 `undefined` 를 만들고 **속성이 조용히 사라진다**.
이벤트 핸들러 본문은 예외.

- ❌ `!x` · `x === y` · `a > b` · `typeof x` · 중첩 템플릿 리터럴 `` `a${b ? `c${d}` : ''}` ``
- ✅ `x ? 'false' : 'true'` · `a || b` · `` 'a' + (b ? `c${d}` : '') ``

**에러도 경고도 없다 — 산출물에서만 소실된다.** 2026-07-26 modfolio-design 실측: badge `class` 와
tooltip `aria-hidden` 이 `undefined` 로 사라졌고 빌드는 초록이었다. 업그레이드로는 못 고친다
(0.14.0 이 최신). 게이트는 **생성 층**(codegen)과 **실행-렌더 층**(스택별 parity 테스트) 둘 다
필요하다 — 한쪽만으론 "생성은 됐는데 렌더가 비었다"를 못 잡는다.
