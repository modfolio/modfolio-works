---
title: Universe Migration 2026-04 — WSL native + harness v2.12.1 + dotenvx 전환 가이드
version: 1.0.0
last_updated: 2026-04-25
source: [atelier-and-folio + modfolio + modfolio-connect + modfolio-pay 2026-04-25 feedback cycle]
sync_to_siblings: true
consumers: [preflight, ops, new-app]
applicability: always
---

<!--
2026-04 universe 대규모 전환 사이클. 4 개 pilot repo (atelier-and-folio,
modfolio, modfolio-connect, modfolio-pay) 가 WSL native + harness v2.12.1
전환 + feedback cycle 을 완료하면서 발견한 모든 문제와 해결 방법을 종합.
다른 모든 sibling repo (약 18 개) 는 이 canon 1 개만 따라가면 동일 상태
에 도달할 수 있다. 각 repo 가 자기 시점에 자율 실행 (evergreen-principle).
-->

# Universe Migration 2026-04 — 사이블 전환 종합 가이드

## 이 문서의 위치

2026-04 사이클은 universe 전체가 **3 개 기술 변화** 를 동시에 겪고 있다:

1. **Dev Container → WSL native** (2026-04-23 전환 개시)
2. **harness v2.11 → v2.12.1** (pull-based 업그레이드)
3. **Doppler → dotenvx** (dev 시크릿 경로, 2026-04-25 universe-wide 확정)

각 변화는 독립적이지만 4 개 pilot repo 경험 상 **한 사이클에 묶어 처리** 하는 것이 효율적이다. 이 canon 은 세 경로를 통합한 execution 순서 + 발견된 함정 + 검증 방법을 제공한다.

## Pilot 사이클 요약 (참고)

2026-04-25 시점 완료 상태:

| repo | WSL native | harness v2.12.1 | dotenvx | rename |
|---|---|---|---|---|
| **atelier-and-folio** | ✅ | ⏳ (v2.12.0, 재pull 대기) | ⏳ migration in progress | ✅ (anf → atelier-and-folio 2026-04-25) |
| modfolio | ✅ | ⏳ (v2.12.0, 재pull 대기) | ❌ doppler | — |
| modfolio-connect | ✅ | ⏳ (v2.12.0, 재pull 대기) | ❌ doppler | — |
| modfolio-pay | ✅ | ⏳ (v2.12.0, 재pull 대기) | ❌ doppler | — |

전체 전환 상태는 `ecosystem.json.secretsMigration` + 각 repo `package.json` + `ecosystem.json.harnessLatest` 대조로 추적.

## Phase 0 — 사전 점검

전환 시작 전 각 repo 에서 (5 분):

```bash
cd /path/to/<repo>

# 1. 현재 상태 파악
cat package.json | grep '"@modfolio/harness"'        # 현재 harness 버전
echo "WSL? $([ -f /proc/version ] && grep -i microsoft /proc/version > /dev/null && echo YES || echo NO)"
ls .env* 2>/dev/null                                   # dotenvx 전환 여부
git status                                             # uncommitted 변경 먼저 처리

# 2. ecosystem root 접근 확인
ls ../modfolio-ecosystem/ecosystem.json 2>&1           # 있어야 함 (sibling layout)

# 3. GITHUB_TOKEN 정상
[ -n "$GITHUB_TOKEN" ] && echo "OK: GITHUB_TOKEN set" || echo "MISSING: WSL shell profile 복구 필요"
gh auth status
```

**WSL GITHUB_TOKEN 빈 값 함정** (4 repo 전부 보고): WSL 이주 중 `~/.zshrc` 또는 Doppler sync 에서 `export GITHUB_TOKEN=…` 누락. 증상은 `echo $GITHUB_TOKEN` → 빈 문자열. `.npmrc` 의 `_authToken=${GITHUB_TOKEN}` 이 빈 값이면 `bun add -D @modfolio/harness` 가 401. 해결: 1Password 또는 기존 Doppler 에서 토큰 꺼내 `.zshrc` 또는 dotenvx `.env` 에 추가.

## Phase 1 — WSL Native 전환

과거 Dev Container / Windows 직접 실행 → WSL2 Ubuntu `~/code/<repo>/` 독립 환경.

### 1-A. WSL 부트스트랩 (최초 1 회)

```bash
# 1. ecosystem repo 의 helper 사용
bash /home/mod/code/modfolio-ecosystem/scripts/ops/wsl-bootstrap.sh
# - bun 1.3.11 설치
# - Node.js LTS
# - doppler / gh / jq / 1Password CLI
# - mise
```

### 1-B. 모든 repo clone (최초 1 회)

```bash
bash /home/mod/code/modfolio-ecosystem/scripts/ops/wsl-clone-all.sh
# $HOME/code/ 에 22 repo sibling 구조로 clone
```

### 1-C. 각 repo 에서 WSL-specific 정리

**`.vscode/tasks.json` 제거 위험** (atelier-and-folio 보고): WSL 이주 중 자동생성된 broken tasks.json 존재 시 remote-wsl.reopenInWSL 이 실패. 이미 제거된 repo 도 있으니 확인:
```bash
ls -la .vscode/tasks.json 2>/dev/null
# 파일 있고 내용이 손상돼 있으면 제거
rm -f .vscode/tasks.json && git commit -am "fix(vscode): remove broken tasks.json"
```

VSCode 설정 권장:
```bash
# .vscode/settings.json: terminal default = Ubuntu bash, files.eol = "\n"
# .vscode/extensions.json: ms-vscode-remote.remote-wsl 권장
```

Ctrl+Alt+W (remote-wsl.reopenInWSL) 키바인딩 권장 — 각 repo 에서 WSL 재진입.

### 1-D. Verification

```bash
pwd                          # /home/mod/code/<repo> (mnt/c 아님)
bun run quality:all          # 또는 `check && typecheck && test`
```

## Phase 2 — harness v2.12.1 Adoption

기존 harness v2.12.0 을 쓰는 4 pilot repo 는 **무조건 v2.12.1 로 업그레이드 필요** (P0 버그 fix 2 건 포함).

### 2-A. 배경 — v2.12.1 fix 요약

- **P0-A `feedback-send`**: v2.12.0 에서 `feedback-send` 가 `node_modules/@modfolio/harness/` 안쪽에 feedback 파일을 쓰던 버그. `bun install` 시 유실. v2.12.1 에서 `scripts/lib/ecosystem-paths.ts` 에 `isPackagedBundle()` 추가 + Strategy 1 skip 으로 수정.
- **P0-B `harness-pull` hook drift**: ecosystem source 가 single quote + space indent, member repo 기본값은 double quote + tab. 매 pull 마다 hook 9 파일이 Updated 로 보이던 무한 루프. v2.12.1 에서 ecosystem `biome.json` 에 `scripts/hooks/` override 추가해 tab + double 로 source 정규화.
- **P1 canon applicability**: 각 canon 에 `applicability: always | per-app-opt-in | doc-only` 추가. `sync_to_children` → `sync_to_siblings` rename (ecosystem 이 parent 가 아닌 동등 sibling 정합).

### 2-B. 업그레이드 절차

```bash
cd /path/to/<repo>

# 1. .npmrc 확인 (GH Packages auth)
cat .npmrc
# @modfolio:registry=https://npm.pkg.github.com
# //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}

# 2. 업그레이드 (dotenvx 전환 완료면 dotenvx run, 아니면 doppler run)
bun add -D @modfolio/harness@2.12.1
# dotenvx 전환 완료: dotenvx run -f .env -- bun add -D @modfolio/harness@2.12.1
# doppler 잔존:    doppler run --project <name> --config dev -- bun add -D @modfolio/harness@2.12.1

# 3. dry-run
bunx modfolio-harness-pull --dry-run

# 4. apply
bunx modfolio-harness-pull --apply

# 5. 2차 dry-run 으로 idempotent 검증 (P0-B)
bunx modfolio-harness-pull --dry-run
# → Updated/Merged 0 이어야 함
```

### 2-C. 알려진 메시지

- **`Updated 3` (pre-compact-guard, stop-session-end, stop-subagent)**: v2.12 신규 hook. v2.12.0 사용 중이던 repo 는 정상 Updated 3 건. 2 번째 dry-run 에선 0.
- **`Merged 3` (claude-md, mcp, settings)**: v2.12.1 상태에서 관찰 가능성 있음 — 내용 동일해도 generator 결과가 매번 다르면 false-alarm. 다음 사이클 (v2.12.2) 에서 hash-based 비교로 근본 수정 예정. 기능 영향 없음.
- **Canon 5종 "pulled but unimplemented" 혼동**: v2.12.1 의 applicability metadata 로 해소. canon 에 `applicability: per-app-opt-in` 이 있으면 "pull 은 되지만 이 repo 에 실 구현 필수 아님" 의미.

## Phase 3 — Doppler → dotenvx 전환

**universe-wide 목표** (2026-04-25 확정). 각 repo 자기 시점. atelier-and-folio 가 1 호 완료.

### 3-A. 절차 (`secrets-dotenvx` canon 요약)

```bash
cd /path/to/<repo>

# 1. 기존 Doppler secrets export (dev 우선, 나중에 prd)
doppler secrets download --project <name> --config dev --no-file --format env > /tmp/<name>-dev.env
doppler secrets download --project <name> --config prd --no-file --format env > /tmp/<name>-prd.env
chmod 600 /tmp/<name>-*.env

# 2. dotenvx 설치 (canon 고정 버전)
bun add -D @dotenvx/dotenvx@1.61.5

# 3. .env 작성 + encrypt
cp /tmp/<name>-dev.env .env
bunx --bun dotenvx encrypt -f .env --no-ops
chmod 600 .env.keys

cp /tmp/<name>-prd.env .env.production
bunx --bun dotenvx encrypt -f .env.production --no-ops

# 4. .gitignore
grep -q "^\.env\.keys$" .gitignore || echo ".env.keys" >> .gitignore

# 5. 1Password 업로드
op document create .env.keys --title "dotenvx-<repo>-keys" --vault "modfolio-secrets" --force

# 6. package.json scripts 교체 (doppler run → dotenvx run)
#    예: "dev": "doppler run --project <n> --config dev -- astro dev"
#         → "dev": "dotenvx run -f .env -- astro dev"

# 7. 임시 파일 정리
rm -f /tmp/<name>-*.env

# 8. ecosystem.json 업데이트 (ecosystem PR)
#    - secretsMigration.completed.<repo>: { migratedAt, notes }
#    - secretsMigration.pending 에서 제거
#    - apps[].secrets: "dotenvx" 추가

# 9. Doppler project 30 일 보관 후 삭제
#    doppler projects delete <name> --yes  (보관 기간 이후)
```

### 3-B. helper 스크립트

```bash
# ecosystem sibling 접근
bash ../modfolio-ecosystem/scripts/ops/dotenvx-migrate-from-doppler.sh <doppler_project> <config>
```

절차 1-4 자동화. 결과: `.env` 암호화 + `.env.keys` 생성. 5-9 는 수동.

### 3-C. 함정

- **`.env.keys` 유실 = 복구 불가능** → 반드시 1Password 업로드 직후 확인 (`op document get "dotenvx-<repo>-keys"`).
- **`dotenvx set` 은 쓰지 말 것** — encrypted 파일 update 시 이상 동작 확인 (2026-04-24 PoC). clean rebuild (rm → encrypt) 권장.
- **dotenvx major 업그레이드 금지** — canon 이 `1.61.5` pin. devDep 버전 caret (`^`) 없이 exact.
- **prod 는 여전히 CF native** — dotenvx 는 dev / CLI (빌드·배포 시점) 만. Workers 런타임 시크릿은 `wrangler secret put` / Pages env / Secret Store binding.

## Phase 4 — Repo slug rename 사례 (참고)

atelier-and-folio (구 `anf`) 가 2026-04-25 사이클에 완료한 rename 경험. 유사 케이스 (로컬 폴더 ≠ GH slug) 를 가진 repo 는 참고.

### 4-A. rename 결정 배경

- GH repo `modfolio/anf` → `modfolio/atelier-and-folio`
- ecosystem.json `repo: "anf"` + `localDir: "atelier-and-folio"` (divergent) 를 `repo: "atelier-and-folio"` 통일
- DB prefix `anf_` → `atelier_and_folio_` (13 테이블)
- Doppler `anf` → dotenvx (rename 필요 없음, 폐기됨)
- Workspace package `@anf/db` / `@anf/contracts` → repo 내부 codemod 로 phase 별 진행

### 4-B. 실행 순서 (ecosystem 관점)

1. ecosystem.json `apps[]` 엔트리의 `repo / dbPrefix / cfFeatureHints key / secrets` 수정
2. `feedback/anf/` → `feedback/atelier-and-folio/` merge
3. 잔여 `anf` 참조 grep + 현행 active 문서 수정 (journal / changelog 은 역사 유지)
4. 로컬 폴더 mv + git remote set-url

### 4-C. 실행 순서 (repo 내부)

1. Drizzle schema 13 테이블 rename → `drizzle-kit generate`
2. Neon dev branch snapshot → dev migration 적용 → smoke test
3. Neon prd migration (승인 기반)
4. 코드 내 `anfUsers` 등 Drizzle variable name codemod
5. workspace package name (`@anf/*`) rename (별도 phase — broad impact)

**참고 — ADR-009**: `docs/adr/ADR-009-subsidiary-onboarding.md` 가 이 drift 케이스를 motivation 으로 작성된 기록. 지금은 해소됨.

## Phase 5 — 전환 후 검증 (Definition of Done)

```bash
# WSL native
[ -f /proc/version ] && grep -i microsoft /proc/version > /dev/null && echo "✅ WSL"

# harness v2.12.1
grep '"@modfolio/harness": "\^2.12.1"' package.json && echo "✅ harness v2.12.1"

# dotenvx
[ -f .env ] && head -1 .env | grep "DOTENV_PUBLIC_KEY=" > /dev/null && echo "✅ dotenvx .env"
[ -f .env.keys ] && stat -c "%a" .env.keys | grep "600" && echo "✅ .env.keys chmod 600"
grep -E "^\.env\.keys$" .gitignore && echo "✅ .gitignore 보호"
grep -q "doppler run" package.json && echo "❌ package.json 에 doppler run 잔존" || echo "✅ doppler run 없음"

# 1Password
op document get "dotenvx-<repo>-keys" > /dev/null 2>&1 && echo "✅ 1Password 업로드" || echo "❌ 1Password 업로드 필요"

# harness idempotent
bunx modfolio-harness-pull --dry-run | grep -E "^\s+Updated:\s+0" && echo "✅ idempotent"

# 전체 품질 게이트
bun run quality:all
```

전부 ✅ → 해당 repo 전환 완료. `ecosystem.json.secretsMigration.completed` 에 등재.

## 참조

- `knowledge/canon/secrets-dotenvx.md` v2.0+ — dotenvx 상세
- `knowledge/canon/evergreen-principle.md` — pull-based / Hub-not-enforcer
- `knowledge/canon/canon-index.md` — canon 전체 index + applicability 분류
- `docs/internal/doppler-setup.md` (deprecated) — 과거 Doppler 가이드, historical reference
- `docs/adr/ADR-009-subsidiary-onboarding.md` — 자회사 앱 합류 advisory
- Pilot 사이클 피드백: `feedback/{atelier-and-folio,modfolio,modfolio-connect,modfolio-pay}/2026-04-25_wsl-harness-check.md`
- Release notes: `CHANGELOG.md` §2.12.1

## 이 canon 을 따라간 repo 체크리스트

각 repo owner 는 전환 완료 시 다음을 알림:

1. `ecosystem.json.secretsMigration.completed` 에 자기 repo 추가 (+ migratedAt + notes)
2. `ecosystem.json.secretsMigration.pending` 에서 자기 repo 제거
3. `ecosystem.json.apps[]` 해당 엔트리에 `secrets: "dotenvx"` 추가
4. (선택) `knowledge/journal/YYYYMMDD-migration-complete.md` 해당 repo 기록
5. ecosystem commit PR 머지

이 체크리스트가 universe transition 의 진행 상황을 단일 지표로 표시한다.
