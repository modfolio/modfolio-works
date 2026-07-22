---
paths:
  - "knowledge/**"
---

# 지식베이스 규칙

- `knowledge/global.md`는 100줄 이내 유지. 상세 내용은 skill로 분리
- `knowledge/projects/{repo}.md`는 해당 레포의 핵심 정보만 기록
- `knowledge/journal/`에 개발 판단/실수/발견 기록 시 `/journal` skill 참조
- 지식 동기화: 각 연결 프로젝트가 `bunx modfolio-harness-pull`(기본 report-only, `--apply` 명시 시 반영)로 **스스로 당겨간다**. hub 쪽 일괄 안내는 modfolio-ecosystem 의 `bun run sync-knowledge`(advisory — 각 repo 가 apply 자율)
- 사실 소유권: 이 repo **자신에 대한 사실**(자기 버전·배포 상태·이슈 resolution)은 repo 실측이 SoT — 동기화 구간의 hub 미러와 다르면 **실측이 옳다**. 미러 정정은 `feedback-send` 로 통보, 구간 보호는 `harness-lock.json` `lockedPaths` (canon `fact-ownership.md`)
