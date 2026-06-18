---
title: Icon System — UnoCSS preset-icons + Iconify 표준
version: 1.0.0
last_updated: 2026-05-24
source: [2026-05-24 app-stack 신기술 평가 — UnoCSS preset-icons / @iconify-json / unplugin-icons 검토 결과]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [design, design-engineer, component, page]
---

# Icon System — UnoCSS preset-icons + Iconify

> UnoCSS 를 사용하는 sibling 의 표준 아이콘 패턴. **권고만** — Hub-not-enforcer 정합. 각 sibling 이 자기 시점에 채택.

## TL;DR

```bash
# 1. install
bun add -D @unocss/preset-icons @iconify-json/lucide @iconify-json/tabler

# 2. uno.config.ts — preset 추가
import { defineConfig, presetUno, presetIcons } from 'unocss';
export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      collections: {
        lucide: () => import('@iconify-json/lucide/icons.json').then(i => i.default),
        tabler: () => import('@iconify-json/tabler/icons.json').then(i => i.default),
      },
      extraProperties: { display: 'inline-block', 'vertical-align': 'middle' },
    }),
  ],
});

# 3. HTML/JSX/Svelte 에서 직접 사용 (zero runtime — atomic CSS)
<span class="i-lucide-arrow-right text-lg" />
<button class="i-tabler-settings hover:i-tabler-settings-2" />
```

## 왜 이 표준인가

| 기준 | UnoCSS preset-icons | unplugin-icons | SVG sprite | inline SVG |
|------|---------------------|----------------|------------|-----------|
| Runtime cost | 0 (atomic CSS class) | low (컴포넌트 import) | low (HTTP cache) | high (tree 복사) |
| Bundle size | atomic 단위 tree-shake | per-import tree-shake | 전체 sprite | per-instance |
| 사용 편의 | class 1줄 | import + tag | href ID 매핑 | inline 코드 |
| 색상 동적 변경 | `text-*` 토큰으로 | inline `color` prop | CSS variable | inline attr |
| 디자인 토큰 정합 | UnoCSS theme 와 자동 정합 | 별도 | 별도 | 별도 |

→ **preset-icons 가 modfolio universe 의 dev HMR + bundle 효율 + 토큰 정합 3중 최적**. Iconify (275,000+ 아이콘) 를 zero-runtime atomic 으로.

## 아이콘 셋 선택

| 셋 | 아이콘 수 | 라이선스 | 특징 | 권장 case |
|----|---------|----------|------|-----------|
| **Lucide** | 1,711 | MIT | 일관된 stroke, 깔끔 | universal — 가장 안전한 기본값 |
| **Tabler** | 5,900+ | MIT | 24x24 grid, 더 다양 | 다양성 필요 시 |
| **Phosphor** | weights 6종 (thin/light/regular/bold/duotone/fill) | MIT | variant 풍부 | 브랜드 무게감 차별화 |
| **Heroicons** | 314+292 (outline+solid) | MIT | Tailwind 공식 | Tailwind 마이그 호환성 |
| **Material Symbols** | 3,000+ | Apache 2.0 | Google Material | Material 디자인 시스템 |

권장 = Lucide (default) + Tabler (확장). Phosphor 는 브랜드별 자율.

## 컴포넌트 import 필요 시 (선택)

class 1줄로 충분하지 않은 경우 (예: prop 으로 동적 icon name 받음) `unplugin-icons` 컴포넌트 import 사용:

```ts
import IconArrowRight from '~icons/lucide/arrow-right';
import IconSettings from '~icons/tabler/settings';

<IconArrowRight class="text-lg" />
```

SvelteKit / Astro / Vite 모두 호환. `vite.config.ts` 에 plugin 추가.

## 정공법 정합

- **장기 시야**: Iconify = de facto standard (2025+). 한 collection 교체로 전체 변경 가능 — vendor lock-in 없음
- **확장성**: 새 아이콘 셋 추가 = `@iconify-json/<set>` 1줄 + collections 등록
- **에러·경고 0**: preset-icons 의 unused icon = build 시 자동 omit. dead code 0
- **신기술 포텐셜**: UnoCSS engine 자체가 활발 maintained. Iconify 도 standard 화

## 함정

- **첫 build 시 collection JSON 크기**: `@iconify-json/lucide` ~200KB / `@iconify-json/tabler` ~1MB. lazy import (`() => import(...)`) 필수 — 위 config 참조
- **CSP nonce 충돌**: preset-icons 가 inline style 사용. CSP strict 시 `style-src 'unsafe-inline'` 또는 hash 필요
- **server-side rendering**: SSR 시 첫 paint 에 아이콘 없을 가능성 — `display:inline-block` extraProperties 추가하면 layout shift 방지

## 관련

- `knowledge/canon/design-tokens.md` — 디자인 토큰 (color/size token 과 정합)
- `knowledge/canon/design-tooling.md` v1.1 — Figma MCP 풀 카탈로그 (아이콘 export → preset-icons 변환)
- `knowledge/canon/tech-trends-2026-05.md` — 본 canon 채택 배경 (Adopt 결정)
- UnoCSS preset-icons docs: https://unocss.dev/presets/icons
- Iconify catalog: https://icon-sets.iconify.design/
