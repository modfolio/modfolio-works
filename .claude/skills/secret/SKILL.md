---
name: secret
description: athsra CLI 기반 secret 관리 — login/set/unset/get/run/doctor + soft-delete (versions/rollback/delete/restore/purge) + rotate-master/handoff/revoke/new-phrase. modfolio universe 표준 v3 (Phase 2.1 active, npmjs.org publish 완료).
user-invocable: true
---

# /secret — athsra CLI 가이드 (Phase 2.1 active)

modfolio universe 의 secret 관리 = **athsra** (CF Worker + R2 + E2EE). canon `secret-store.md` v1.6 표준. 외부 cloud 가입 0, 결제 0, master pw 1개. **8 repo dogfood 운영 중** (4 active + 4 cleanup). **npmjs.org public** (`@athsra/cli@0.1.0` + `@athsra/crypto@0.1.0` MIT).

## 새 머신 셋업 (Phase 2.1+)

### Linux/WSL2 keyring prereq

```bash
sudo apt update && sudo apt install gnome-keyring libsecret-1-dev dbus-x11
eval $(dbus-launch --sh-syntax)   # DBUS_SESSION_BUS_ADDRESS missing 시
```

macOS / Windows: 자동 (Keychain / Credential Manager).

### 첫 머신 (PROOF bootstrap)

```bash
# CLI 설치 (npmjs.org)
bun add -g @athsra/cli   # 또는: npm i -g @athsra/cli
athsra --version          # 0.1.0+

# Worker 운영자만: 본인 CF 계정에 1회 배포
gh repo clone modfolio/athsra ~/code/athsra
cd ~/code/athsra && bun install
bash scripts/setup-worker.sh    # 멱등 (R2 + KV + GLOBAL_SALT + deploy)

# (권장) BIP-39 12-word phrase 생성 — master pw 표준 형식
athsra new-phrase   # 12 단어 출력 → 종이에 적기 → "yes" 확인

athsra login        # 위 phrase 또는 자유 phrase 입력. paper-backup confirm 필수
```

### 2번째 이후 머신 (handoff 흐름)

```bash
bun add -g @athsra/cli   # 또는: npm i -g @athsra/cli

# 기존 머신:
athsra handoff   # 새 머신 label 입력 → handoff token 출력

# 새 머신:
ATHSRA_HANDOFF_TOKEN='atk_...' \
ATHSRA_HANDOFF_MACHINE='home-desktop' \
ATHSRA_WORKER_URL='https://athsra-worker.<account>.workers.dev' \
ATHSRA_MASTER_PW='<기존 머신과 동일>' \
  athsra handoff --accept
```

## 전체 명령

| 명령 | 동작 |
|---|---|
| `athsra login` | 첫 등록 (PROOF bootstrap) — master pw + paper-backup confirm + Bearer token 발급 |
| `athsra init <project>` | 신규 project 안내 (실제 생성은 set 시점) |
| `athsra set <project>[:<env>] KEY=val [...]` | secret 추가/수정 (다건). `--from-file <path>` / `--stdin` 지원 |
| `athsra unset <project>[:<env>] KEY [...]` | 특정 key 제거 (envelope 유지) |
| `athsra get <project>[:<env>] [KEY]` | 값 출력 (single 또는 dump) |
| `athsra ls [project][:<env>] [--all\|--configs]` | project / key 목록, `--configs` = 환경(config) 목록 |
| `athsra run <project>[:<env>] -- <cmd>` | env inject 후 명령 실행 (Doppler-style) |
| `athsra versions <project>` | 모든 version + tombstone 상태 (`*` = current) |
| `athsra rollback <p> <vid>` | 특정 version 으로 current 복원 (tombstone 제거) — `--yes` 우회 가능 |
| `athsra delete <project> [--hard]` | soft-delete (default, 복구 가능) 또는 hard-delete |
| `athsra restore <project>` | tombstone 제거 + 가장 최신 version 활성화 |
| `athsra purge <project>` | hard-delete 별칭 (double-confirm) |
| `athsra rotate-master` | master pw 변경 (모든 projects re-encrypt + 모든 token revoke + 새 token) |
| `athsra new-phrase` | BIP-39 12-word recovery phrase 생성 (master pw 권장 형식) |
| `athsra handoff [--accept]` | 새 머신 추가 — issuer / acceptor 양면 |
| `athsra revoke [<atk_*>]` | self 또는 명시 token revoke (self 시 keyring 도 clear) |
| `athsra doctor` | 환경 검증 (keyring/dbus/worker phase/whoami/projects) |

## 환경(config) 분리 — dev/staging/prod (1.3.0, 2026-06-14)

하나의 project 안에서 환경별 분리 secret 세트. 지정: `--config=<env>` > `<project>:<env>` > `.athsra` 의 `config=` 줄 > `default`. config 명명 소문자 `^[a-z][a-z0-9_-]{0,31}$` + 예약어(versions/current/tombstone) 금지.

```bash
athsra set modfolio-pay:dev TOSS_SECRET_KEY=test_sk    # dev 환경
athsra get modfolio-pay:prod                           # prod 는 독립 세트
athsra run modfolio-pay:prod -- bunx wrangler deploy   # prod 주입 실행
athsra ls modfolio-pay --configs                       # 환경 목록 + active/deleted
```

config 생략 시 기존과 100% 동일 (무중단). 신규 환경은 첫 `set` 으로 생성. 파괴적 명령(delete/restore/purge/rollback)은 cwd auto-detect 안 함 — 명시 project 필수.

## AI/MCP — in-chat 조작 + value tier (1.2.0)

`athsra mcp install --write --read-values --apply` 로 Claude Code / Cursor / VS Code 등록. 4-tier (read/write/**value**/admin). 에이전트가 `athsra_whoami` → `athsra_login_start`(터미널 불필요) → secret CRUD. **value tier** (`ATHSRA_MCP_READ_VALUES=1`): `athsra_get_secret_value`(기본 마스킹; full 평문은 env opt-in + `confirm=<project>` 이중 게이트) + `athsra_run`(값 미노출 주입). secret 도구는 optional `config` 인자. 상세는 athsra README "MCP server" + canon `secret-store.md`.

## modfolio repo migration

기존 dotenvx 사용 repo 의 `package.json` scripts 일괄 변환:

```bash
bun ~/code/athsra/scripts/migrate-package-json.ts \
  --package ~/code/<repo>/package.json \
  --repo <athsra-project-name> \
  --apply

# 변환 패턴:
#   (bunx --bun )?dotenvx run -f .env --     → athsra run <repo> --
#   (bunx --bun )?dotenvx run --             → athsra run <repo> --
#   doppler run [--project X] [--config Y] --  → athsra run <repo> --
```

repo migration 절차 (1 repo):
1. .env 평문 dump (encrypted 면 `dotenvx run -f .env --quiet -- bash -c 'env | grep ...'`)
2. `athsra set <repo> --from-file /tmp/dump`
3. `diff <(athsra get <repo> | sort) <(sort /tmp/dump)` → ✓ MATCH
4. 임시 파일 즉시 shred
5. `bun ~/code/athsra/scripts/migrate-package-json.ts --repo <repo> --apply` (scripts 변환)
6. `bun remove @dotenvx/dotenvx`
7. `mkdir legacy-backup && mv .env .env.keys legacy-backup/`
8. `.gitignore` 갱신: `legacy-backup/`, `.env`, `.env.keys`
9. `bun run dev` / `bun run build` 검증
10. commit + push

## master pw 분실 시

**모든 secret 영구 loss** (E2EE 본질). Phase 1.1 = recovery 없음 — BIP-39 도 paper backup 분실 시는 동일.

권장 흐름:
1. `athsra new-phrase` 로 BIP-39 12-word phrase 생성
2. 종이에 정확히 적기 (4×3 grid, 위치 추적 쉽게)
3. 안전한 곳 보관 (가족 아는 위치, 화재 안전 박스 등)
4. checksum 자동 검증 — 옮겨 적을 때 오타 발생 시 `athsra login` 이 reject

자유 phrase (예 `#00_Nikyhmod`) 도 그대로 작동 — BIP-39 강제 X. BIP-39 의 가치는 paper backup 안정성 + 미래 hardware wallet 통합.

## master pw 변경

```bash
athsra rotate-master
# Decrypts all envelopes (옛 master pw)
# → /auth/rotate-master (server PROOF + 모든 token revoke)
# → re-encrypts all envelopes (새 master pw)
```

다른 머신은 모두 token invalidated → 각 머신에서 `athsra handoff --accept` 재실행.

## 트러블슈팅

| 증상 | 원인 + 조치 |
|---|---|
| `keyring backend unavailable` | gnome-keyring/libsecret 미설치. doctor 가 정확한 apt 명령 안내 |
| `DBUS_SESSION_BUS_ADDRESS missing` | `eval $(dbus-launch --sh-syntax)` 또는 user systemd unit 시작 |
| `worker reachable: ✗` | wrangler 미실행/배포 안 됨. `wrangler whoami` + `wrangler deploy` |
| `master password mismatch` (login) | 첫 register 가 아니고 옛 master pw 와 다름. `rotate-master` 또는 정확한 옛 pw |
| `master password mismatch` (handoff --accept) | 기존 머신과 다른 master pw. 동일 pw 입력 |
| `decrypt failed` | master pw 다름 또는 envelope 손상. `doctor` 후 확인 |
| `401 unauthorized` (set/get/run) | token revoke 됐거나 handoff 미완료. `athsra login` 또는 `handoff --accept` |
| `token format invalid` | `atk_` prefix 없는 token. handoff 명령 출력 정확히 복사 |

## Phase 별 신기능

- **Phase 1.0-1.3** (2026-05-03): Bearer + libsecret keyring + login/init/set/unset/get/ls/run/doctor + register/whoami/revoke/rotate-master/handoff + BIP-39 + handoff TTL/settle + audit log (Workers Logs) + setup-worker.sh
- **Phase 1.x.1** (2026-05-04): soft-delete + version history. R2 3-tier layout. 5 신규 명령 (versions/rollback/delete/restore/purge) + ls --all
- **Phase 2.1 (현재, 2026-05-04)**: **npmjs.org publish** — `@athsra/cli@0.1.0` + `@athsra/crypto@0.1.0` MIT public. 외부 alpha 진입 (`bun add -g @athsra/cli`). NPM_TOKEN athsra 보관 → 향후 publish 자동화 (`athsra run modfolio-ecosystem -- npm publish`)
- **Phase 1.x.2-3 (검토)**: D1 token table / audit R2 export
- **Phase 2.2-2.4 (검토)**: RBAC / dashboard alpha / 잔존 15 repo
- **MCP value tier (1.2.0, 2026-06-14)**: `athsra_get_secret_value`(마스킹 기본)/`athsra_run` 값 미노출 주입. 신규 4번째 tier `value`
- **환경(config) 분리 (1.3.0, 2026-06-14)**: `secrets/<org>/<project>/<config>/` dev/staging/prod. CLI(`--config=`/`:env`/`.athsra`) + MCP(optional config) + 대시보드 드롭다운. 무중단 fallback
- 변경 시 본 SKILL.md + `secret-store.md` canon 갱신

## 실수 복구 흐름 (Phase 1.x.1)

```bash
# 실수로 set 한 잘못된 값 → 직전 version 으로 rollback
athsra versions modfolio-ecosystem
#   * v1735000000  2026-05-04T...  (200B)
#     v1734999000  2026-05-03T...  (200B)
athsra rollback modfolio-ecosystem v1734999000

# 실수로 delete → restore (default soft-delete 라 복구 가능)
athsra delete modfolio-ecosystem      # tombstone marker. versions 보존
athsra ls --all                       # 'modfolio-ecosystem (deleted)' 표시
athsra restore modfolio-ecosystem     # 최신 version 으로 활성화

# 정말 영구 삭제 (double-confirm)
athsra purge old-project              # 또는: athsra delete old-project --hard
```

원리: PUT 은 새 version 작성 + current alias 갱신 + tombstone 자동 제거. DELETE 는 soft-delete (current 제거 + tombstone, versions 보존). 따라서 일상 set/delete 가 모두 reversible. 영구 삭제는 명시적 `purge` 또는 `delete --hard` 만.

## audit log 조회

worker 의 모든 인증/write event 가 single-line JSON 으로 Cloudflare Workers Logs 에 capture (~7-day retention):

```bash
cd ~/code/athsra/apps/worker
bunx wrangler tail athsra-worker --format json | jq 'select(.message[0] | startswith("{\"type\":\"audit\""))'
```

또는 Cloudflare dashboard → Workers → athsra-worker → Logs.

read events (GET) 는 skip (noise 큼). write events + 4xx/5xx 만.

## 관련

- canon `knowledge/canon/secret-store.md` v1.6 — architecture + threat model + Phase 2.1 npm publish
- skill `.claude/skills/preflight/SKILL.md` § Athsra Status
- rule `.claude/rules/secrets-policy.md` v3 — 보관 계층 + 로테이션 주기
- repo: github.com/modfolio/athsra
- onboarding: github.com/modfolio/athsra/blob/main/docs/ONBOARDING.md
- ROADMAP: github.com/modfolio/athsra/blob/main/docs/ROADMAP.md (남은 작업 + 미래 분기점 SSoT)
