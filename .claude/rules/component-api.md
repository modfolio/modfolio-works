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
