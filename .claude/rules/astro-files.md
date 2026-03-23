---
paths:
  - "**/*.astro"
  - "**/astro.config.*"
---

# Astro Files Rules

## 어댑터
- `@astrojs/cloudflare` adapter 사용 필수

## 성능
- Island 디렉티브 적절히 사용 (`client:load`, `client:idle`, `client:visible`)
- Zero JS 타겟 — 가능한 한 서버 렌더링 우선
- 불필요한 `client:load` 지양 → `client:idle` 또는 `client:visible` 선호

## 금지 패턴
- `client:load` 남용 — SSR에서 처리 가능한 로직을 클라이언트에서 실행
- Starlight: `slug: ''` 사용 금지 (→ `link: '/'`)
- Biome `.astro` 파싱 불가 → `biome.json`에 overrides 필요
