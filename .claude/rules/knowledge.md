---
paths:
  - "knowledge/**"
---

# 지식베이스 규칙

- `knowledge/global.md`는 100줄 이내 유지. 상세 내용은 skill로 분리
- `knowledge/projects/{repo}.md`는 해당 레포의 핵심 정보만 기록
- `knowledge/journal/`에 개발 판단/실수/발견 기록 시 `/journal` skill 참조
- 지식 동기화: `bun run sync-knowledge` (전파 전 `bun run sync-knowledge:dry`로 미리보기)
