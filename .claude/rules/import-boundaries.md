---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.svelte"
  - "**/*.astro"
  - "**/*.vue"
---
다른 앱 코드 직접 import 금지. 공유는 `@modfolio/contracts` 또는 SSO/Webhook으로만.
`../../../` (3단계+) 금지 → alias 사용. `node:` prefix 필수 (`import fs from 'node:fs'`).
