---
paths:
  - "**/schema.ts"
  - "**/schema/*.ts"
  - "**/*.schema.ts"
---

# Schema Files Rules

## 명명 규칙
- 앱별 prefix 필수 (mc_, ma_, mp_ 등) — /drizzle-patterns 참조

## 필수 컬럼
- `createdAt` + `updatedAt` 타임스탬프 필수
- helper 함수 적용: `pk()`, `nowCol()`, `updatedAtCol()`

## 관계 및 인덱싱
- FK → 인덱스 필수, 명명: `{prefix}_{table}_{column}_idx`
- JSONB 컬럼 → `$type<>()` 타입 지정 필수

## DB 타입별 주의사항
- `ecosystem.json`에서 DB 타입 판별 (Neon / D1 / Turso)
- DB별 지원되지 않는 기능 사전 확인
