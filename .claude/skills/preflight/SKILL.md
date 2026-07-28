---
name: preflight
description: 개발 세션 시작 전 종합 점검. MCP 연결, 의존성 최신성, lint/typecheck, git 상태, 환경 설정을 한 번에 확인하고 문제를 보고.
user-invocable: true
---

# /preflight — 세션 시작 전 종합 점검

## 판정 항목 (9개 — 실패 시 blocker가 될 수 있는 것만)

1. **MCP 연결** — 활성 MCP 서버 목록 확인, 실패 서버 보고
2. **의존성** — `bun install` 상태, lockfile 정합성
3. **Lint/Format** — `bun run check` 실행, 에러 0 확인. 에러 시 `bun run check:fix`로 자동 수정 시도
4. **TypeScript** — `bun run typecheck` 실행, 에러 0 확인
5. **Git 상태** — branch, uncommitted changes, remote 동기화
6. **환경 변수** — athsra 주입 경로 확인(`athsra doctor`). ⚠ **빈/부재 `.env` 는 정상이고 예상된 상태다** — athsra 는 runtime 주입이라 시크릿이 디스크에 남지 않는다. 빈 `.env` 를 "시크릿 누락 → 사용자에게 로그인 요청" 으로 결론짓지 않는다(`.claude/rules/secrets-policy.md` §athsra runtime-injection). 순서: 세션 env(`process.env.<KEY>`) → `athsra run <repo> -- <cmd>` → `athsra get <repo> <KEY>`. "인증 필요" 결론은 `athsra doctor` 가 실제로 토큰/세션 부재를 보고할 때만. Doppler/dotenvx 는 폐기(2026-04-25 / 2026-05-02)
7. **테스트** — `bun run test` 또는 `bun run test:unit` 실행
8. **Claude Code 환경** — `claude --version` ≥ v2.1.203 (`ultracode` 지원), `CLAUDE_CODE_EFFORT_LEVEL` 이 **설정돼 있지 않은지** 확인 — 설정돼 있으면 agent frontmatter effort 가 전부 무효화되므로 WARN (canon `opus-4-7-effort-policy.md` v2.0.0 §환경변수 정책). 세션 기본값은 `.claude/settings.json` 의 `effortLevel` 로 준다
9. **`effortLevel` 값이 유효한가** — settings 파일은 `low|medium|high|xhigh` **만** 받는다. `max`·`ultracode` 는 **세션 전용**이라 settings 에 적으면 **조용히 무시되고** 모델 기본값(`high`)으로 떨어진다 — 올린 줄 알았는데 오히려 내려간다. **프로젝트와 사용자 전역 둘 다** 본다:

   ```bash
   for f in .claude/settings.json .claude/settings.local.json ~/.claude/settings.json; do
     [ -f "$f" ] && node -e "
       const v=require(require('node:path').resolve('$f')).effortLevel;
       if (v && !['low','medium','high','xhigh'].includes(v))
         console.log('WARN $f: effortLevel=' + JSON.stringify(v) + ' 는 settings 에서 무효 → 모델 기본값으로 강등. xhigh 로.');
     "
   done
   ```

   ⚠ **재발하는 클래스다.** 2026-07-12 에 사용자 전역에서 `max` 를 제거했는데 2026-07-27 에 다시 있었다 — 전역 설정은 어떤 repo 게이트에도 안 걸리기 때문이다. 그래서 이 검사는 **전역 파일까지** 본다

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

### Athsra Status (gate 아님 — Phase 0+ 도입)

athsra CLI (modfolio universe v3.0+ secret 표준) 의 환경 검증. canon `secret-store.md` 참조.

`athsra doctor` 출력 요약:
- config: `~/.athsra/config.json` 존재 + worker URL + machine_id
- session: 8h cache 유효 또는 expired
- worker reachable: GET `/healthz` 200 응답
- projects: R2 list 결과 갯수 + 첫 5개

INFO only (gate 아님):
```
Athsra Status:
  config:       ✓ ~/.athsra/config.json
  worker:       https://athsra-worker.<account>.workers.dev (or http://localhost:8787)
  session:      ✓ valid (or ✗ expired — 다음 명령 시 prompt)
  reachable:    ✓ (or ✗ → wrangler dev/deploy 필요)
  projects:     N (modfolio-ecosystem, modfolio-connect, ...)
```

athsra 미설치 시 INFO: "athsra 미설치 — 새 머신 셋업 = `gh repo clone modfolio/athsra && skill secret`".

### Sibling Sync (gate 아님 — modfolio-ecosystem 에서만)

현재 repo 가 `modfolio-ecosystem` 일 때만 실행. 다른 repo 에서는 skip.

`bash scripts/ops/sync-all.sh` (dry-run) 결과를 INFO 로 요약:
- 23 repo 중 behind > 0 인 것 카운트 (pull 필요)
- ahead > 0 인 것 카운트 (push 필요)
- wip > 0 인 것 카운트 (uncommitted)

출력 예:
```
Sibling Sync (23 repo):
  NOOP:           23 (모두 동기화)
  또는
  BEHIND:        3 (gistcore, modfolio-pay, …) — bun run sync-all:apply 권고
  AHEAD:         1 (modfolio-axiom) — git push 권고
  WIP:           2 (atelier-and-folio, modfolio) — commit/stash 결정
```

권고 명령: `bun run sync-all:apply` (pull + install) 또는 `bun run handoff:restore`
(머신 도착 후 종합 복원).

### Handoff Age (gate 아님 — modfolio-ecosystem 에서만)

`knowledge/journal/*-session-handoff-from-*.md` 의 가장 최근 mtime 검사:
- 7일 이내: ✓ 최근 핸드오프
- 7일 초과: INFO (이동이 잦은 사용자라면 `bun run handoff:prepare:apply` 권고)
- 부재: INFO ("아직 handoff journal 없음 — 첫 머신")

## 판정 기준

- 9개 항목 모두 통과 → "Preflight PASS"
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
6  환경 변수   PASS    athsra 주입 경로 확인 (빈 .env 는 정상)
7  테스트      PASS    N files, M tests 통과
8  CC 환경     PASS    v2.1.203+, CLAUDE_CODE_EFFORT_LEVEL 미설정
9  effortLevel PASS    project=xhigh, user=xhigh (settings 유효값)

── 참고 정보 (gate 아님) ──
Evergreen:
  @modfolio/connect-sdk 7.0.0 (ecosystem.connectSdkLatest=7.0.0) ✓
  typescript 6.0.2 (latest 7.0.1) — major behind, 업그레이드 판단은 이 앱
  ...
```

**9개 gate 전부 실행**. Evergreen 정보는 별도 섹션으로 출력.
