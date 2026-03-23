---
paths:
  - "**/*.svelte"
---

# Svelte Files Rules

## Svelte 5 Runes 필수
- `$props()`, `$state()`, `$derived()`, `$effect()`, `$bindable()` 사용
- `{@render children()}` 사용 (`<slot/>` 금지)
- `onclick` 사용 (`on:click` 금지)
- `let` for `$state()` vars (Biome useConst 예외)

## 검증 절차
- 반드시 `mcp__svelte__get-documentation`으로 최신 API 확인 후 생성
- 생성 후 `mcp__svelte__svelte-autofixer`로 검증 필수

## 금지 패턴
- `export let` (→ `$props()`)
- `<slot/>` (→ `{@render children()}`)
- `on:click`, `on:input` 등 이벤트 디렉티브 (→ `onclick`, `oninput`)
- `createEventDispatcher` (→ callback props)
- `$$props`, `$$restProps` (→ `$props()` spread)
