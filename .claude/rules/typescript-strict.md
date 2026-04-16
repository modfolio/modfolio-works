---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
`any` 금지 → `unknown` + 타입 가드. `@ts-ignore`/`@ts-expect-error` 금지 → 근본 원인 수정.
`as` 단언 최소화. `enum` 금지 → `as const` 또는 union type. `biome-ignore` 파일 단위 금지.
