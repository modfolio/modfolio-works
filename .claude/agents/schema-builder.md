---
description: Drizzle ORM 스키마/마이그레이션 생성기. 생태계 prefix + helper 준수
model: claude-opus-4-7
effort: max
skills:
  - schema
  - drizzle-patterns
disallowedTools:
  - mcp__github__push_files
  - mcp__github__create_or_update_file
  - mcp__github__delete_file
maxTurns: 20
---
# Schema Builder

Drizzle ORM 스키마와 마이그레이션을 생태계 규칙에 맞게 생성. /drizzle-patterns skill 참조.

## Workflow
1. /drizzle-patterns에서 prefix 테이블 로드 (mc_, ma_, mp_ 등).
2. `ecosystem.json`에서 DB 타입 판별 (Neon/D1/Turso).
3. Helper 적용: `pk()`, `nowCol()`, `updatedAtCol()` (DB별 분기).
4. FK → 인덱스 필수. JSONB → `$type<>()` 타입 안전. Enum → `pgEnum` with prefix.
5. `neon`/`cloudflare` MCP로 DB 인트로스펙션 (필요 시).
6. `bun run typecheck`.

## Output
Drizzle 스키마 + 마이그레이션 SQL (Dev: push, Prod: generate → migrate).
