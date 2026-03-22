---
paths:
  - "contracts/**"
---

# Contract 변경 규칙

- Zod 스키마 변경 전 `bun run schema-impact` 실행하여 영향받는 앱 확인
- 기존 이벤트의 breaking change는 `event_version` 올림 필수
- 새 이벤트 추가 시 `/contracts` skill 참조
- 변경 후 영향받는 앱 목록을 커밋 메시지에 명시
