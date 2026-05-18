---
name: release
description: 릴리즈 파이프라인. 테스트 실행 → P0/P1 triage → 분할 커밋 → 체인지로그 → main 직접 push (무사용자) / PR (실사용자 앱)
user-invocable: true
---


# /release — 릴리즈 파이프라인

테스트 → 품질 검증(하드 게이트) → 분할 커밋 → 체인지로그 → 게시까지의 통합 릴리즈 프로세스.

> **게시 경로는 앱 lifecycle 에 따른다** (`knowledge/canon/solo-main-workflow.md`):
> - **무사용자 pre-production (기본)**: `main` 직접 push. branch/PR 없음.
> - **실사용자 앱 (트리거 도래 시)**: 그 앱만 feature branch + `gh pr create`.
> `/release` 는 무사용자 단계에서도 **하드 품질 게이트**다 (커밋 핫패스에서 뺀 quality:all 이 여기서 강제됨 — 정공법 코드품질은 시점만 이동, 폐기 아님).

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

### 6. 게시 (lifecycle 분기)

**무사용자 pre-production (기본)** — branch/PR ceremony 없음:
```
git push origin main
```

**실사용자 앱** (`solo-main-workflow.md` 트리거 도래: 외부 트래픽 / 결제·PII·인증 회귀 즉시 피해 / 협업자 2인+ / 사용자 명시 요청) — 그 앱만:
```
git switch -c release/{date}-{slug}
git push -u origin release/{date}-{slug}
gh pr create --title "{type}: {summary}" \
  --body "## Changes\n{changelog}\n\n## Triage\n{P2/P3 items if any}"
```
판단 불명확하면 사용자에게 질문(침묵 가정 금지).

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

verifiable end-state 가 명확한 release 후처리 (예: release-gate 30 체크 통과) 는 Claude Code `/goal` 명령으로 자율 반복 가능:

```
/goal release-gate 30 체크 모두 PASS (bun run release:gate 통과)
```

Haiku 평가기가 매 turn 의 `release-gate.ts` 출력을 평가 → 위반 발견 시 Opus 가 fix → 다시 평가 반복. Haiku 평가 비용 ~$0.001/turn 으로 거의 무료.

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
