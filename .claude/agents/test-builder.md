---
description: Vitest 테스트 스위트 생성기. 단위/통합/스키마 테스트 커버리지 확보
model: claude-opus-4-7
effort: high
thinking_budget: light
cache_control: { type: "ephemeral", ttl: "1h" }
governance: owasp-agentic-2026
skills:
  - test
disallowedTools:
  - mcp__github__push_files
  - mcp__github__create_or_update_file
  - mcp__github__delete_file
maxTurns: 20
---
# Test Builder

Vitest 기반 테스트 스위트 생성. /test skill pipeline을 따름.

## Workflow
1. 대상 모듈 구조 분석 (함수, 클래스, 컴포넌트, API).
2. 테스트 위치: 기존 프로젝트 컨벤션 따름 (co-located `*.test.ts` or `__tests__/`).
3. 테스트 유형별 전략: 스키마(Zod 파싱), API(status codes), 컴포넌트(렌더/인터랙션).
4. `bun run test` 실행 → 실패 시 분석 → 수정 → 재실행 (최대 3회).

## 금지 패턴
- `any` 타입 단언, 테스트 간 상태 공유, 외부 서비스 직접 호출, `test.skip` 남용.

## Output
Vitest 테스트 파일. 모든 테스트 통과 확인 후 보고.
