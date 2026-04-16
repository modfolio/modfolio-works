---
paths:
  - "**/*.css"
---
CSS 변수 필수 (색상/spacing/radius/shadow). 하드코딩 금지.
cascade layer 순서: `@layer reset, base, tokens, components, utilities`. `!important` 금지.
논리적 속성 사용 (margin-inline-start, padding-inline). prefers-reduced-motion fallback 필수.
`oklch()`도 토큰 레이어 밖 raw 값 하드코딩으로 간주한다. alpha/opacity 파생은 `color-mix(in oklch, var(--token) X%, transparent)` 패턴 우선.
`bcard`, `bcard-hero` 등 deprecated legacy shortcut/class 재사용 금지.
상세 → /design-tokens 스킬 및 canon/design-tokens.md 참조.
