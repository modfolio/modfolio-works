---
paths:
  - "ecosystem.json"
---

# ecosystem.json 변경 규칙

- 앱 상태 전이: planned → scaffolded → deployed → production
- 버전 변경 시 해당 앱의 `version` 필드 갱신
- 새 앱 추가 시 모든 필수 필드 포함 (repo, domain, framework, database, status, version)
- 변경 후 `bun run typecheck`로 스키마 유효성 검증
- 전체 버전 동기화: `bun run version-sync`
