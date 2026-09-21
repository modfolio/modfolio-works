---
name: release
disable-model-invocation: true
description: 릴리즈 파이프라인. 테스트 → 독립 리뷰 → 작업 브랜치 커밋 → 현재 기준 검증 → 직렬 통합 → 게시 확인
user-invocable: true
---


# /release — 릴리즈 파이프라인

테스트 → 품질 검증(하드 게이트) → 분할 커밋 → 체인지로그 → 게시까지의 통합 릴리즈 프로세스.

> **통합 경로는 MODFOLIO.md와 ADR-027을 따른다.** 작업 브랜치의 정확한 후보를
> 독립 리뷰·검증한 뒤 저장소별로 직렬 통합한다. 사용자 수는 main 직접 쓰기 권한이 아니다.
> Forgejo 전환이 검증되지 않은 저장소는 기록된 현재 통합 기준을 유지한다.
> 구현 워커는 main push·게시·배포 자격 증명을 받지 않는다.

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

### 6. 후보 제출·통합·게시

현재 작업 브랜치를 일반 push하고 정확한 후보·기준·정책 digest에 대한 독립 리뷰와
clean 검증을 연결한다. 변경된 기준에는 필요한 검사를 다시 수행한다. 승인된 통합자가
저장소별 직렬 큐로 통합한 뒤 소유 프로젝트의 게시·배포 절차를 실행한다.
GitHub 또는 Forgejo 선택은 그 저장소의 검증된 cutover 기록을 따르며 main 이중 쓰기나
force push는 하지 않는다. PR 본문은 파일 또는 구조화 입력으로 전달해 실제 개행을 보존한다.
후보 push, main 통합, 패키지 설치 가능, 배포 Version ID/동작 확인을 각각 보고한다.

### 7. 최종 검증

```bash
bun run quality:all
```

## 사용법

```
/release              # 전체 프로세스 실행
/release --dry-run    # 분할 계획만 출력 (실행 안 함)
```

## /goal 통합 (2026-05+, v2.0 dogfood Adopt P0 #6)

사용자가 목표 추적을 명시적으로 요청하고 현재 도구가 지원하는 경우에만, 명확한
release 완료 조건을 해당 도구의 목표 기능에 연결한다. 일반 릴리스 요청만으로 새 목표나
자동화를 만들지 않으며 중단된 목표를 다시 열지 않는다. 아래는 Claude 어댑터의 예시다:

```
/goal release-gate 30 체크 모두 PASS (bun run release:gate 통과)
```

검사 명령은 모델 없이 실행한다. 해석·수정·독립 리뷰가 필요한 경우 역할 프리셋과
확인된 구독 사용량으로 별도 실행을 배정한다. 특정 모델 이름이나 추정 비용은 실행 허가가 아니다.

권고 use case:
- `bun run release:gate` 가 1-3 위반만 있는 가벼운 상태 (정공법 quick-fix cycle)
- breaking change 없는 PR 의 final tightening

자세한 차이: `/loop` (시간 driven, 정기 polling) vs `/goal` (binary end-state, condition driven) — canon `agentic-engineering.md` § 2.1 참조.

### 자율 반복 4 도구 조합 (v2.35 P1.4, 2026-05-13)

| 시나리오 | 도구 |
|---|---|
| release 직후 인터벌 헬스체크 | `/loop 5m bun run health-check` |
| release-gate 통과까지 자율 fix | `/goal release-gate 30 체크 모두 PASS` |
| 매월 1일 정기 release readiness 점검 | `/schedule create monthly-release-audit` |
| stage 별 release ritual (test → tag → publish → notify) | `/ralph-loop "..." --max-iterations 4` |

canon `agentic-engineering.md` §2.1 의 책임 분리 표 참조.

source: `~/.claude/plans/20260513-evolve-goal-command.md`, `~/.claude/plans/crystalline-sparking-sky.md` (P1.4)
