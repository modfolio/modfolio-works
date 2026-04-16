---
paths:
  - "**/wrangler.jsonc"
  - "**/wrangler.toml"
  - "**/astro.config.*"
  - "**/vite.config.*"
---
Astro 랜딩 <200KB JS, SvelteKit/Solid <350KB. 이미지 width+height+lazy 필수.
Worker 응답 p50 <50ms. 불필요한 `client:` directive 금지 (Astro).
인증 미들웨어/세션 갱신 경로에서 매 요청 DB write/upsert 금지. lastSeen, heartbeat, audit 성격 데이터는 debounce, sampling, queue 중 하나로 완화.
