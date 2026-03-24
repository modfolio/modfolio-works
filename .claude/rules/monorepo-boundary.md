---
paths:
  - "apps/**"
---

# Monorepo Boundary Rules

## 앱 격리 (House of Brands)
- `apps/landing/`과 `apps/app/`은 완전히 독립된 앱
- 상호 import 절대 금지: landing ↔ app 경로를 건너는 import 없어야 함
- 상대 경로 `../../landing/` 또는 `../../app/` 사용 금지

## 디자인 토큰
- Landing: Teal hue 175 라이트 테마 (`apps/landing/src/styles/tokens.css`)
- App: Obsidian hue 275 다크 테마 (`apps/app/src/styles/tokens.css`)
- 각 앱의 토큰은 독립 관리, cross-referencing 금지

## 독립 빌드
- 각 앱은 독립 빌드 가능: `bun run build:landing`, `bun run build:app`
- 한 앱의 변경이 다른 앱의 빌드를 깨뜨리면 안 됨
