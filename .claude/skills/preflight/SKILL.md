---
name: preflight
description: 개발 세션 시작 전 종합 점검. MCP 연결, 의존성 최신성, lint/typecheck, git 상태, 환경 설정을 한 번에 확인하고 문제를 보고.
user-invocable: true
---

# /preflight — 세션 시작 전 종합 점검

## 판정 항목 (7개 — 실패 시 blocker가 될 수 있는 것만)

1. **MCP 연결** — 활성 MCP 서버 목록 확인, 실패 서버 보고
2. **의존성** — `bun install` 상태, lockfile 정합성
3. **Lint/Format** — `bun run check` 실행, 에러 0 확인. 에러 시 `bun run check:fix`로 자동 수정 시도
4. **TypeScript** — `bun run typecheck` 실행, 에러 0 확인
5. **Git 상태** — branch, uncommitted changes, remote 동기화
6. **환경 변수** — `.dev.vars` 또는 Doppler 연결 확인
7. **테스트** — `bun run test` 또는 `bun run test:unit` 실행

## 정보 섹션 (판정표 밖 — 참고용)

### Evergreen 관찰 (gate 아님)

이 앱의 주요 패키지 버전을 ecosystem.json `connectSdkLatest` 및 npm latest와 비교해
INFO로만 보고. 업그레이드 여부·시점은 이 앱 owner가 자율 결정. 근거는
[canon/evergreen-principle.md](../../knowledge/canon/evergreen-principle.md) (권고이지 강제 아님).

| 패키지 | 확인 방법 |
|--------|----------|
| @modfolio/connect-sdk | installed vs ecosystem.connectSdkLatest (INFO only) |
| typescript | `bunx tsc --version` vs latest |
| @biomejs/biome | `bunx biome --version` vs latest |
| 프레임워크 (svelte, astro, solid, nuxt, qwik, hono) | package.json installed vs latest |
| vite | package.json installed vs latest |
| wrangler | package.json installed vs latest |
| turbo | package.json installed vs latest |
| drizzle-orm | package.json installed vs latest (DB 사용 시) |

출력: Package | Installed | Latest | Δ (참고 정보). **PASS/FAIL 판정 아님.**

## 판정 기준

- 7개 항목 모두 통과 → "Preflight PASS"
- 1개라도 FAIL → 실패 항목 + 수정 제안
- WARN은 통과 처리

Evergreen 정보 섹션은 통과 판정에 포함되지 않는다.

## 출력 형식

```
Preflight Report

Gate 판정:
#  항목        결과    상세
1  MCP 연결    PASS    github, playwright, ... N개 서버
2  의존성      PASS    lockfile 정합
3  Lint/Format PASS    0 errors
4  TypeScript  PASS    0 errors
5  Git 상태    PASS    main, remote 동기화
6  환경 변수   PASS    .dev.vars 존재
7  테스트      PASS    N files, M tests 통과

── 참고 정보 (gate 아님) ──
Evergreen:
  @modfolio/connect-sdk 7.0.0 (ecosystem.connectSdkLatest=7.0.0) ✓
  typescript 6.0.2 (latest 7.0.1) — major behind, 업그레이드 판단은 이 앱
  ...
```

**7개 gate 전부 실행**. Evergreen 정보는 별도 섹션으로 출력.
