---
name: harness-pull
description: 최신 하네스 권고를 조회하고 선택적으로 적용. v2.10+ 기본은 report-only (diff), 변경은 --apply 명시 후.
user-invocable: true
---

# /harness-pull

**이 스킬은 스크립트를 실행하는 것이 전부다. 에이전트가 직접 파일을 복사하거나 동기화하면 안 된다.**

## v2.10 철학 — Reference-only

ecosystem 은 **참고서** 지 대장이 아니다. universe 는 최신 권고를 조회/리포트할 뿐, child 의 파일을 함부로 바꾸지 않는다. 모든 mutation 은 child 가 `--apply` 로 명시 동의.

## 지금 실행

### 이미 `@modfolio/harness` devDep 있는 repo

```bash
bun run harness-pull              # 기본: diff 출력만 (report-only, v2.10+)
bun run harness-pull -- --apply   # 검토 후 실제 적용
# 또는 로컬 bin 해석
bunx modfolio-harness-pull         # report-only
bunx modfolio-harness-pull --apply # apply
```

### 첫 도입 repo — 두 단계 필요

`bunx modfolio-harness-pull` **전역 호출은 작동하지 않는다.** bunx 는 로컬 `.npmrc` 를 읽지 않아 scoped + private 패키지를 public registry (npmjs.org) 에서 찾아 404 반환. 반드시 `.npmrc` + `bun add -D` 로 로컬 설치부터.

```bash
# 1) .npmrc 생성 (없거나 @modfolio scope 없는 경우)
cat > .npmrc <<'EOF'
@modfolio:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
always-auth=true
EOF

# 2) devDep 추가 (GITHUB_TOKEN env 필요) — 버전 생략하면 bun 이 latest + caret 저장
bun add -D @modfolio/harness

# 3) report-only 확인 → 원하면 --apply
bun run harness-pull               # diff 확인
bun run harness-pull -- --apply    # 적용
```

Dev Container rebuild 시엔 [setup 4/6] 이 `.npmrc` 자동 ensure, [setup 5/6] 이 `bun install` → package.json devDep 있으면 자동 설치.

미리보기만: 위 명령에 `-- --dry-run` 또는 `--dry-run` 추가.

## 스크립트가 하는 일 (에이전트가 직접 하면 안 됨)

**Phase 0.5 — Smart Bootstrap** (v2.8.0+, **부분 도입** 상태 자동 처리):

이 phase 는 스크립트가 **이미 실행되고 있다는 전제** (즉 `@modfolio/harness` 는 node_modules 에 있음). 완전 zero 상태가 아닌 "부분 도입" 을 복구한다:

- `.npmrc` 에 `@modfolio:registry` 없으면 patch 된 패키지 안의 `templates/.devcontainer/.npmrc.template` 에서 copy/append
- `package.json` 에 `@modfolio/harness` devDep 없으면 (글로벌 설치만 된 경우 등) `bun add -D @modfolio/harness@<ecosystem.harnessLatest>` 자동 실행
- `.harness-autopull` marker 없으면 guidance 출력 (opt-in 유지) — `--auto-marker` 로 자동 생성 가능
- 이미 다 있으면 조용히 skip (idempotent)

**완전 zero 상태** (npm 모듈 자체가 없음) 은 위 "첫 도입 repo — 두 단계" 섹션 수동 절차 필요.

**Phase 1~5 — Sync**:
1. universe에서 skills/agents/rules/canon/knowledge 동기화
2. settings.json 적응형 생성 (프로젝트 고유 hooks 보존)
3. .mcp.json 딥 머지
4. CLAUDE.md 생태계 섹션 교체
5. 6가지 검증 + 고신뢰도 자동수정
6. Connect SDK 버전 추적 + 디자인 토큰 준수율 스캔
7. manifest v2.0 피드백 생성

**package.json Dynamic sync (v2.10+)** — `resolvePackageJsonAction` 가 세 필드를 **range-first** 로 관리:
- `scripts.harness-pull` = `modfolio-harness-pull` (npm bin, 버전 독립)
- `dependencies/devDependencies["@modfolio/harness"]` — exact pin (`"2.8.1"`) 자동 → caret range (`"^2.8.1"`) 정규화. evergreen: `bun install` 만으로 patch/minor 자동 상승.
- `overrides["@biomejs/cli-linux-x64-musl"]` — **child 의 `@biomejs/biome` range 를 동적 반영** (예: child 가 `^2.4.12` 면 override 도 `npm:@biomejs/cli-linux-x64@^2.4.12`). child 에 biome 이 없으면 override 주입 skip.

변경은 child 가 이미 동일 값을 두고 있으면 no-op (idempotent). 자동 주입 자체를 막으려면 `.claude/harness-lock.json` 에 `package.json` path 잠금 — 완전 거부 가능. 자세한 배경: `knowledge/canon/adoption-debt-patterns.md` 패턴 15 (biome musl) + 16 (exact-pin 함정), `knowledge/canon/evergreen-principle.md` v2.2.0 Range-first.

## 플래그

| 플래그 | 용도 |
|--------|------|
| `--dry-run` | 미리보기 (파일 변경 없음) |
| `--force` | 동일 내용이어도 덮어쓰기 |
| `--no-bootstrap` | Phase 0.5 skip (CI / 외부에서 이미 wire up 한 경우) |
| `--auto-marker` | `.harness-autopull` marker 자동 생성 |
| `--prune-deprecated` | universe 가 폐기한 파일 삭제 |
| `--init-lock` | `.claude/harness-lock.json` 초안 생성 후 종료 |
| `--cleanup` | adoption-blocking debt 자동 수정 후 종료 |
| `--json` | 기계 판독용 JSON 출력 |

## 프로젝트 보호 (universe는 hub, enforcement plane 아님)

- `.claude/harness-lock.json`으로 경로 잠금 (exact, `dir/`, `dir/*`, `dir/**`)
- `settings.local.json`은 절대 안 건드림
- `settings.json`은 structural merge — child의 permissions.ask/deny/defaultMode,
  env, model, statusLine 등 top-level 키 보존. `hooks`만 matcher-aware로 re-compose
- 프로젝트 고유 rules, hooks, MCP 서버는 보존

## Identity files — universe는 관찰만, 수정 안 함

다음 파일들은 child-owned identity로 분류. universe는 읽지도 쓰지도 않는다:

| 파일 | 이유 |
|-----|------|
| `wrangler.jsonc` / `wrangler.toml` | child의 CF 배포 설정, DO 바인딩, observability 등 |
| `biome.json` | child의 lint/format 결정 (버전 포함) |
| `drizzle.config.{ts,mjs,js}` | child의 DB 마이그레이션 설정 |
| `tsconfig.json` | child의 TS 엄격도/모듈 해석 선택 |
| `astro.config.{ts,mjs}` / `nuxt.config.ts` / `svelte.config.js` / `vite.config.ts` | 프레임워크 설정 전체 |
| `src/lib/auth.ts` 등 어플리케이션 코드 | 당연히 |
| `package.json` dependencies | child가 각자 관리. universe 는 오직 두 필드만 주입: `scripts.harness-pull` + `overrides["@biomejs/cli-linux-x64-musl"]` (glibc workaround, 패턴 15). 부재 시만 추가 — child 값 있으면 보존 |

`bun run harness-pull` 실행 시 이들 파일은 diff에 나타나지 않아야 정상.
혹시라도 위 파일들에서 변경이 감지된다면 그 자체가 bug이므로 github issue로 보고.

## Deprecated 자산

universe가 폐기(`DEPRECATED_SKILLS/FILES/RULES`)로 분류한 자산은 기본적으로
**report-only** — child는 `--prune-deprecated` 플래그를 명시적으로 줬을 때만
그 파일들이 삭제된다. universe 의견은 참고, child 결정이 최종.

## scope

- 일반 패키지 버전(TypeScript, Vite, Biome) 점검은 `/preflight` 담당
- Connect SDK 버전은 `canon/evergreen-principle.md` 권고 — 강제 아님

## Plan agent source 규칙

Plan agent 가 sibling 의 harness-pull 결과를 추정할 때:

- ✅ **source = npm published `@modfolio/harness@<latest>`** (sibling 의 `node_modules/@modfolio/harness/`). 이게 실측의 ground truth.
- ❌ **source = ecosystem repo HEAD 비교 금지** — local filesystem 의 ecosystem repo 는 unpublished 변경을 포함할 수 있다. plan 추정이 실측과 어긋난다 (라인 추정 17 → 실측 50 발견 사례, 2026-05-08).
- 격차가 큰 경우 (e.g. 17 minor 뒤) child 의 lockfile 을 갱신 (`bun update @modfolio/harness`) 후 재추정.
- 본 SKILL 의 Smart Bootstrap (Phase 0.5) 와 v2.32+ `version-check.ts` 가 이 규칙을 enforce — agent 직접 ecosystem repo 와 비교 시도 금지.
