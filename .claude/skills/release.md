---
description: 릴리즈 파이프라인. 테스트 실행 → P0/P1 triage → 분할 커밋 → 체인지로그 → PR 생성
effort: high
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(bun run check:*), Bash(bun run typecheck:*), Bash(bun run test:*), Bash(bun run quality:*), Bash(git *)
---

# /release — 릴리즈 파이프라인

테스트 → 품질 검증 → 분할 커밋 → PR 생성까지의 통합 릴리즈 프로세스.

## 7단계 프로세스

### 1. 메인 브랜치 동기화

```
git fetch origin main
git merge origin/main (충돌 시 중단 + 보고)
```

### 2. 테스트 실행

프레임워크 자동 감지 후 전체 테스트:
- Vitest: `bun run test`
- Playwright: `bun run test:e2e` (있으면)
- 실패 시 중단 + 실패 원인 보고

### 3. Pre-landing Triage

quality-fixer의 P0-P3 기준으로 검사:
- P0/P1 위반 발견 시 **중단** + 위반 목록 보고
- P2/P3만 있으면 보고 후 **진행**
- `bun run quality:all` 통과 필수

### 4. 체인지로그 생성

커밋 메시지 기반 자동 분류:
- `feat:` → Added
- `fix:` → Fixed
- `refactor:` → Changed
- `test:` → Tests
- `docs:` → Documentation
- 기타 → Other

### 5. 분할 커밋

`git diff --name-only`로 변경 파일 분류 후 카테고리별 커밋:

| 순서 | 카테고리 | 패턴 |
|------|----------|------|
| 1 | Schema | `**/schema.ts`, `**/schema/*.ts`, `contracts/**` |
| 2 | API | `**/+server.ts`, `**/api/**`, `**/routes/**` |
| 3 | UI | `**/*.svelte`, `**/*.astro`, `**/*.vue`, `**/*.tsx` |
| 4 | Test | `**/*.test.ts`, `**/*.spec.ts` |
| 5 | Config | `*.json`, `*.jsonc`, `*.toml`, `wrangler.*` |
| 6 | Docs | `*.md`, `docs/**`, `knowledge/**` |

의존성 순서 보장: Schema → API → UI → Test

### 6. PR 생성

```
gh pr create \
  --title "{type}: {summary}" \
  --body "## Changes\n{changelog}\n\n## Triage\n{P2/P3 items if any}"
```

### 7. 최종 검증

```bash
bun run quality:all
```

## 사용법

```
/release              # 전체 프로세스 실행
/release --dry-run    # 분할 계획만 출력 (실행 안 함)
```
