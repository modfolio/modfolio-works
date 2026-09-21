---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.svelte"
  - "**/*.astro"
  - "**/*.vue"
---
다른 앱 코드 직접 import 금지. 공유는 현행 Assembly Law의 공개 계약·MCP·서비스
인터페이스를 따른다. `@modfolio/contracts`는 게시된 계약 패키지로 소비한다.
`../../../` (3단계+) 금지 → alias 사용. `node:` prefix 필수 (`import fs from 'node:fs'`).
