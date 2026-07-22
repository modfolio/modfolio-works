---
title: Secret Store — athsra (E2EE on Cloudflare edge)
version: 1.17.0
last_updated: 2026-07-04
source: [github.com/modfolio/athsra Phase 0-2.1 + 1.x.2/1.x.3/1.x.4/1.x.5 active (chronological 1.x.6), plan v4.0.0 glittery-singing-treasure.md, Phase 1 4 active 151 keys + 4 no-secret cleanup, Phase 2.1 npmjs.org publish (@athsra/cli + @athsra/crypto 0.1.0), Phase 1.x.2 D1 token table production deploy 2026-05-05 (worker version 04727c33 phase_label=1.x.2 live, drizzle-orm + drizzle-kit, 34 worker tests pass), Phase 1.x.2 cutover dogfood 발견 (KV PROOF D1 자동 import 안 됨, GLOBAL_SALT change risk, legacy-backup 100% 복원 검증), Phase 1.x.3 audit Queue + R2 + D1 cement 2026-05-06 (athsra c6be015, Trial P1 #5 R2 Event Notifications 묶음, 41 worker tests pass), CLI 1.2.2 현행화 + service token headless 실증 2026-07-01 (v1.16.0 2026-07-03, SESSION-LEDGER.md + knowledge/projects/athsra.md), CLI 1.2.5 + crypto 1.2.0 현행화 + secret-change webhook + revoke-by-hash + degrade 측정아티팩트 종결 (v1.17.0 2026-07-04, feedback/athsra/2026-07-04_registry-currency-ask.md + journal 20260703-fleet-completeness-session.md)]
sync_to_siblings: true
consumers: [ops, new-app, preflight, secret]
applicability: always
---

# Secret Store — athsra (E2EE on Cloudflare edge)

**Brand**: 한국어 "아스라이" (어렴풋이) 어원, 발음 _Ah-sra_. 사라질 듯 말 듯한 비밀의 정서.

**핵심 가치**: Doppler dev UX + Phase zero-knowledge E2EE + Cloudflare 글로벌 edge `<50ms` latency. 가입 0 (사용자 자체 운영) + 결제 0 (CF free tier) + 정공법 (정확한 통제).

## 위상

modfolio universe 의 secret 관리 표준 (v3.0.0 부터, **Phase 2.1 + 1.x.2 production active 2026-05-05** — npmjs.org publish + D1 token table production deploy 완료). canon `secrets-dotenvx` v2.3.0 (OneDrive backup mirror 모델) 폐기 — 본 canon 으로 이전. 사용자 자체 자산 (modfolio/athsra repo) + **외부 alpha 진입** (`bun add -g @athsra/cli` — 현행 **`@athsra/cli@1.2.5`**, npmjs.org public) + **strong consistency** (revoke 즉시 반영).

**Production status (2026-05-05)**: worker `https://athsra-worker.winterermod.workers.dev` version `04727c33-347d-47c6-9059-d4d2764dea5f` phase_label=1.x.2 live. D1 `athsra-tokens` (uuid 892fb424-5a18-4eb0-bf26-d29e84c13180, region APAC) active. 4 sibling repo (modfolio-ecosystem 129 + modfolio-pay 11 + modfolio-connect 5 + gistcore 6 = **151 keys**) athsra E2EE 운영 중.

**AI-native + 환경 분리 (2026-06-14)**: MCP 4-tier (read/write/**value**/admin) — AI 코딩 에이전트가 채팅에서 in-chat login(`athsra_login_start`) → secret CRUD → 값 조회/주입까지. **value tier (1.2.0)** (`ATHSRA_MCP_READ_VALUES=1`): `athsra_get_secret_value`(기본 마스킹, full 평문은 env opt-in + `confirm=<project>` 이중 게이트) + `athsra_run`(값 미노출 주입 + 출력 scrub). athsra MCP 는 outward 도구 0개 → 단독 lethal-trifecta 미형성 (`.claude/rules/lethal-trifecta.md`). **환경(config) 분리 (1.3.0)**: `secrets/<org>/<project>/<config>/`, config 생략=default, dev/staging/prod 가 CLI·MCP·대시보드 전반 지원 (무중단 fallback). athsra README 의 "Environments (config)" + "MCP server" 섹션이 single source.

**Headless = service token (`ats_*`, 2026-07-01 실증)**: identity 세션에서 **master-pw 없이** 발급 (`athsra service-token create <project> --label=<label>`), headless env 에 `ATHSRA_TOKEN` + `ATHSRA_WORKER_URL` 주입만으로 `athsra run` 복호·주입. **master-pw 는 athsra *쓰기* (신규 secret 저장) 에만 필요** — 런타임 secret(`wrangler secret put`)·복호(service token)·배포(push-to-deploy)·migration 전부 master-pw 0. § CI/CD·headless 통합.

## 검증된 사례 (Phase 1 dogfood 2026-05-03 + Phase 1.x.2 reset 2026-05-05)

| repo | keys | status | 비고 |
|---|---|---|---|
| modfolio-ecosystem | 129 | completed | 첫 self-dogfood, 가장 큰 secret hub. Phase 1.x.2 reset 후 재 import |
| modfolio-connect | 5 | completed | dotenvx encrypted .env. Phase 1.x.2 reset 후 재 import |
| modfolio-pay | 11 | completed | 평문 .env (.env.keys 없었음). Phase 1.x.2 reset 후 재 import |
| gistcore | 6 | completed | 5 scripts 변환 (helper 적용). Phase 1.x.2 reset 후 재 import |
| modfolio | 0 | completed | no-secret. dotenvx devDep cleanup |
| naviaca | 0 | completed | .env.keys orphan 정리 |
| worthee | 0 | completed | .env.keys orphan 정리 |
| sincheong | 0 | completed | .env.keys orphan 정리 |

총 **151 keys** 4 active projects + 4 no-secret cleanup. ecosystem.json `secretsMigration.completed` 8 entries 기준.

### Phase 1.x.2 D1 cutover dogfood 발견 (2026-05-05)

Phase 1.x.2 D1 token table production deploy 시 KV `auth:master-pw-proof` 가 D1 `auth_master_pw_proof` 로 자동 import 되지 않음 (worker 가 D1 만 봄, KV 무시). 결과:
- 옛 KV PROOF invalidated (사용자 인지: "비번 분실" mismatch error)
- D1 empty → 어떤 비번이든 `POST /auth/register` 시 bootstrap 모드 통과
- 사용자가 동일 master pw 로 재 register → D1 PROOF 새로 작성 + 옛 R2 envelope decrypt 정상 (per-envelope salt 라 GLOBAL_SALT 무관)

**Hidden risk**: 사용자가 다른 비번으로 재 register 했으면 옛 R2 envelope 영구 loss 발생 (R2 wipe 안 했어도 decrypt 불가). 이번 사례는 **legacy-backup 으로 100% 복원** + 동일 비번 재 사용으로 손실 0.

**근본 원인 확장**: GLOBAL_SALT 가 어느 시점에 변경되어도 동일 risk — KV PROOF invalidated, R2 envelope 살아있음. 사용자는 "비번 분실" 로 인지. 정공법 mitigation = `GLOBAL_SALT_VERSION` 증가 시 자동 re-bootstrap 모드. **Phase 1.x.5 (2026-05-06) 구현 완료** — athsra repo `bdae968` commit (D1 schema +1 column, register endpoint version 검증, info `proof_invalidated`, CLI login/doctor 안내). 향후 GLOBAL_SALT 변경 시 사용자가 "비번 분실" 인지 X — 명확한 안내 메시지 + 자동 재 register path.

**Mitigation 권장 (모든 sibling repo)**:
- legacy-backup 보존 (각 repo `legacy-backup/.env` + `.env.keys` git ignored)
- master pw 종이 backup 필수 (Phase 1 = recovery 없음, BIP-39 권장)
- GLOBAL_SALT 변경 금지 (변경 필요 시 모든 사용자 재 register + envelope 재 encrypt 필요)

## Architecture (Phase 1.x.2 active)

```
[ developer laptop ]                    [ Cloudflare edge ]
  athsra CLI (Bun)                       CF Worker (Hono + drizzle-orm)
   ├─ keyring (libsecret/keychain)        ├─ /healthz / (public)
   ├─ master pw → Argon2id KDF            ├─ /auth/{register,whoami,
   ├─ AES-256-GCM encrypt locally         │    revoke,rotate-master,handoff}
   ├─ Bearer token (atk_*) per machine    ├─ /v1/secrets/* (Bearer 강제)
   └─ ciphertext only on wire             ├─ D1 `TOKENS_DB` (token + proof, strong)
                                          └─ R2 `STORE` (ciphertext only)
```

**Phase 1.x.2 변경 (2026-05-05)**: 토큰 store 가 KV (`AUTH`, ~60s eventual) → D1 (`TOKENS_DB`, strong consistency). `auth_tokens` PK=hash + 2 indexes, `auth_master_pw_proof` single-row. drizzle-orm `^0.45.2` + drizzle-kit `^0.31.10`. KV binding 자체는 import script source 로 1.x.4 까지 보존 (7일 무사고 후 제거 예정).

**zero-knowledge**: master password 는 client 만, server 는 envelope (ciphertext + Argon2id proof) 만 저장. master pw leak 시 모든 fetch 한 ciphertext 만 노출 — server 의 정상 운영 중 plaintext 는 절대 server 측 X.

자세한 wire format / threat model: [github.com/modfolio/athsra/blob/main/docs/ARCHITECTURE.md](https://github.com/modfolio/athsra/blob/main/docs/ARCHITECTURE.md)

## modfolio universe 흐름

### 새 머신 셋업 (1회)

#### Linux/WSL2 keyring prereq

```bash
sudo apt update && sudo apt install gnome-keyring libsecret-1-dev dbus-x11
eval $(dbus-launch --sh-syntax)   # DBUS_SESSION_BUS_ADDRESS missing 시
```
macOS/Windows: 자동 (Keychain / Cred Manager).

#### 첫 머신 (PROOF bootstrap, Phase 2.1+)

CLI 는 npmjs.org 에서 직접 install:

```bash
bun add -g @athsra/cli
# 또는: npm i -g @athsra/cli
athsra --version   # 1.2.5+ (npmjs.org latest)
```

**Worker 운영자만** (본인 CF 계정에 deploy 시) repo clone 후 setup-worker.sh:

```bash
gh repo clone modfolio/athsra ~/code/athsra
cd ~/code/athsra && bun install
bash scripts/setup-worker.sh    # R2 + KV + GLOBAL_SALT + deploy 멱등
```

이미 deploy 된 instance (예: 공유 worker) 사용 시 위 절차 skip — `athsra login` 시 worker URL 만 입력.

```bash
athsra login   # paper-backup confirm 필수 (분실 = 영구 loss)
```

#### 2번째 이후 머신 (handoff)

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

### 평소 사용

```bash
# 새 secret 추가
athsra set modfolio-ecosystem GITHUB_TOKEN=ghp_xxx

# secret 조회
athsra get modfolio-ecosystem GITHUB_TOKEN
athsra get modfolio-ecosystem            # dump all (.env 형식)
athsra ls                                # project 목록 (active only)
athsra ls --all                          # active + soft-deleted (deleted 표시)
athsra ls modfolio-ecosystem             # key 목록 (값 없음)

# Doppler-style: env inject 후 명령 실행
athsra run modfolio-ecosystem -- bun run dev
athsra run modfolio-ecosystem -- bunx wrangler deploy
athsra run modfolio-ecosystem -- bun run scripts/ops/m365-poc.ts

# 환경 검증
athsra doctor
```

> ✅ **종결 — "로컬 identity-session 복호 degrade"(2026-07-01 관측)는 측정 아티팩트로 판명 (2026-07-03 fleet 세션 실측)**: 인라인 `${#VAR}` 프로브가 wsl.exe 인용 계층에서 **부모 셸 조기확장**되어 빈 값처럼 보였던 것 — 파일 기반 프로브로 identity 복호 완전 정상 실증 (journal `20260703-fleet-completeness-session.md`). 시스템 결함 아님. **교훈(존치): 시크릿 주입 검증은 파일 기반 프로브만** — 인라인 `${#…}` 프로브 금지. service token 경로도 정상 (2026-07-01 실증, § CI/CD·headless 통합).

#### 환경(config) 분리 — dev/staging/prod (1.3.0, 2026-06-14)

하나의 project 안에서 환경별로 분리된 secret 세트. R2 layout `secrets/<org>/<project>/<config>/`,
config 생략 = `default`. 지정 우선순위: `--config=<env>` > `<project>:<env>` > `.athsra` 의 `config=` 줄 > `default`.
config 명명은 소문자 `^[a-z][a-z0-9_-]{0,31}$` + 예약어(versions/current/tombstone) 금지.

```bash
athsra set modfolio-pay:dev TOSS_SECRET_KEY=test_sk_xxx   # dev 환경
athsra get modfolio-pay:prod                              # prod 는 독립 세트
athsra run modfolio-pay:prod -- bunx wrangler deploy      # prod secret 주입 실행
athsra ls modfolio-pay --configs                          # 환경 목록 + active/deleted
athsra versions modfolio-pay:prod                         # prod 환경 버전 이력
```

**무중단**: config 생략 시 기존과 100% 동일. config 도입 전 데이터는 worker 3-tier read fallback
(config → config-less → founding legacy)으로 읽히고 write self-heal 로 정식 경로에 정착. 신규 환경은
fallback 없이 빈 세트가 정답(첫 set 으로 생성). 모든 secret 명령 + MCP secret 도구(optional `config`) +
대시보드 환경 드롭다운이 동일 모델. config-별 ACL 은 1차 미구현(project 단위 유지, 확장 슬롯만).

### 실수 복구 (Phase 1.x.1)

모든 PUT 은 `versions/<id>.json` 에 영구 보존. DELETE 는 default 가 soft (tombstone marker, versions 보존). 영구 삭제는 `purge` 또는 `delete --hard` (double-confirm).

```bash
athsra delete modfolio-ecosystem            # soft-delete (tombstone). versions 보존
athsra ls --all                             # 'modfolio-ecosystem (deleted)' 표시
athsra restore modfolio-ecosystem           # 최신 version 으로 활성화
athsra versions modfolio-ecosystem          # 모든 version 목록 (* = active)
athsra rollback modfolio-ecosystem v1234    # 특정 version 으로 current 복원

# 영구 삭제 (복구 불가, double-confirm)
athsra purge modfolio-ecosystem
# 또는: athsra delete modfolio-ecosystem --hard
```

원리: R2 layout 이 `secrets/<project>/{current,versions/<id>,tombstone}.json` 3-tier 구조 — current 는 alias, versions/* 는 immutable, tombstone 은 soft-delete marker. PUT 시 새 version + current 갱신 + tombstone 자동 제거 (auto-restore). 자세한 endpoint/threat: athsra `docs/ARCHITECTURE.md`.

### 23 repo `package.json` scripts 패턴 (Phase 1 migration)

before (dotenvx):
```json
"dev": "dotenvx run -f .env -- vite",
"deploy": "dotenvx run -f .env -- wrangler deploy"
```

after (athsra):
```json
"dev": "athsra run modfolio-ecosystem -- vite",
"deploy": "athsra run modfolio-ecosystem -- wrangler deploy"
```

## 보안 모델

### E2EE (zero-knowledge)

- master password → Argon2id KDF (m=64MB, t=3, p=1, OWASP 2024 권고) → 32-byte AES-256 key
- AES-256-GCM authenticated encryption (WebCrypto native)
- per-envelope random salt (16B) + nonce (12B)
- server 는 master pw 모름 (envelope 의 Argon2id proof 만 저장 가능, Phase 1+ Bearer)

### Threat model

| 위협 | 영향 | 완화 |
|---|---|---|
| R2 leak (CF 침해) | ciphertext 만 노출 | E2EE 본질 — Argon2id m=64MB 가 brute force 막음 |
| token leak (Bearer atk_*) | ciphertext fetch 가능, decrypt 불가 | `athsra revoke <atk_*>` (D1 delete, **strong consistency**, Phase 1.x.2) |
| handoff token 가로챔 | 새 머신 cred 도용 가능 | **TTL 1h + single-use settle** (Phase 1.2): 발급 후 1시간 + 정상 머신이 첫 사용한 후에는 일반 token 으로 전환. 가로챈 token 은 정상 머신이 먼저 사용 시 invalidated |
| **실수 삭제 / 덮어쓰기** | 잘못된 set/delete 로 직전 버전 loss | **soft-delete + version history** (Phase 1.x.1): `delete` 는 tombstone 만 작성, versions/* 보존. `restore`/`rollback` 으로 복구. `purge` 만 영구 삭제 |
| master pw leak | 이미 fetch 한 ciphertext decrypt 가능 | `athsra rotate-master` — 모든 PROOF/token 갱신 + 모든 envelope re-encrypt (구현 완료, Phase 1) |
| **master pw 분실** | 모든 secret 영구 loss | **종이 backup + BIP-39 12-word phrase** (Phase 1.1, `athsra new-phrase`) — checksum 으로 오타 detect, paper backup 표준화. 종이 자체 분실 시는 동일 영구 loss (recovery 가 아님) |
| keyring leak (머신 도난) | master pw + token 노출 | OS 자체 격리 (libsecret D-Bus / Keychain / Cred Manager DPAPI) |
| TLS MITM | wire 노출 (E2EE 라 plaintext 0) | CF TLS 1.3 + HSTS + Phase 4 mTLS |
| ~~KV eventual consistency (~60s)~~ | ~~revoke 직후 잠시 통과~~ | ✅ **해소 Phase 1.x.2** (2026-05-05): D1 `auth_tokens` strong consistency. revoke 즉시 모든 region 반영 |

### 보안 경계

- master pw = client only (ephemeral, session 8h cache 0600 권한)
- Cloudflare account 보호 (2FA + Workers/R2 IAM)
- npm install path = supply chain (`@noble/hashes` Cure53 부분 audit, deps 0)

## Phase 별 변경

| Phase | 상태 | 변경 |
|---|---|---|
| 0 | ✅ 종료 | single-machine dogfood, stub auth, R2 only |
| 1.0-1.3 | ✅ 종료 (2026-05-03) | Bearer + libsecret keyring + login/init/set/unset/get/ls/run/doctor + register/whoami/revoke/rotate-master/handoff + BIP-39 (`new-phrase`) + handoff TTL/settle + audit log (Workers Logs) + setup-worker.sh + 8 repo migration |
| 1.x.1 | ✅ 종료 (2026-05-04) | soft-delete + version history. R2 3-tier layout. 5 신규 명령 (`versions`/`rollback`/`delete`/`restore`/`purge`) + 5 신규 endpoint. 70 tests pass |
| 2.1 | ✅ 종료 (2026-05-04) | npmjs.org publish — `@athsra/cli@0.1.0` + `@athsra/crypto@0.1.0` MIT public. 외부 alpha 진입 hurdle 제거 (`bun add -g @athsra/cli`). NPM_TOKEN athsra E2EE 보관 (modfolio-ecosystem). 18 commands |
| **1.x.2** | **✅ Production active (2026-05-05)** | **D1 token table** — drizzle-orm `^0.45.2` + drizzle-kit `^0.31.10`. `auth_tokens` (hash PK + expires_at_idx + machine_id_idx) + `auth_master_pw_proof` (single-row CHECK id=1). 6 KV op → drizzle SQL 전환. mockD1 helper (bun:sqlite). 34 worker tests pass. **revoke strong consistency** + Phase 2.2 RBAC join 기반. **Production**: worker version 04727c33, D1 uuid 892fb424. 4 sibling repo 151 keys 재 import 완료 (legacy-backup 100% 복원) |
| **1.x.3** | ✅ **종료 (2026-05-06, chronological 1.x.6)** | **audit log Queue + R2 영구 archive + D1 query — dual emit**. wrangler.jsonc r2_buckets +AUDIT_STORE / queues +AUDIT_QUEUE. drizzle/0002_audit_log.sql `auth_audit_log` 테이블 (id PK autoinc / ts / type / actor / action / request_method / request_path / status / meta_json) + 2 인덱스 (`actor_ts_idx`, `action_ts_idx`). lib/audit.ts signature `logAudit(c, entry)` — Hono Context 받아 `c.executionCtx.waitUntil(c.env.AUDIT_QUEUE.send(line))` push. queue/audit-consumer.ts (~85줄): batch → R2 JSONL put + D1 insert + ackAll/retryAll. test/helpers/mock-queue.ts + test/audit-consumer.test.ts 신규 (6 tests). 12 logAudit 호출처 (middleware 6 + routes 6 + auditWrite 1) + auditWrite c 명시. **41 worker tests pass** (35 → 41, biome 0w / tsc 0e). athsra commit `c6be015`. **옵션 D 채택** (R2 Event Notifications + push) — Trial P1 #5 자연 묶음. 옵션 A (cron pull) / B (waitUntil sample) / C (외부 SIEM) rejected (ROADMAP v8 기록). docs/runbooks/audit-r2-export.md 신규 (운영 절차 + SIEM 연동 + Trial P1 #5). info endpoint `phase_label=1.x.6` + `audit_emit: ['workers-logs','queue:audit-r2-d1']` field 추가. **Production deploy 통합** (Phase 1.x.4 + 1.x.5 + 1.x.3 한 묶음 — R2 bucket create + Queue create + Event Notifications binding + D1 0001+0002 apply + worker deploy). |
| **1.x.4** | ✅ **종료 (2026-05-06)** | **KV `AUTH` binding 제거** — wrangler.jsonc kv_namespaces + Bindings interface AUTH + test mockKV 일괄 정리. Phase 1.x.2 D1 cutover 후 KV 는 dead data. KV namespace 자체 삭제는 사용자 직접 (1회 wrangler 명령). athsra commit `4a87af3`. 35 worker tests pass (변경 0, type 정리만). |
| **1.x.5** | ✅ **종료 (2026-05-06)** | **GLOBAL_SALT_VERSION change auto re-bootstrap mitigation** — D1 schema +1 column (`global_salt_version`) + register endpoint version 검증 (mismatch 감지 시 PROOF auto invalidate + token 전체 삭제 + bootstrap 모드) + info endpoint `proof_invalidated` field + CLI login/doctor 안내 메시지. athsra commit `bdae968`, 35 worker tests pass. Phase 1.x.2 cutover dogfood 발견의 구조적 구현. |
| **service token headless (1.x.8, CLI 1.2.x)** | ✅ **실증 완료 (2026-07-01)** | `ats_*` service token — identity 세션에서 **master-pw 없이** 발급 (`athsra service-token create <project> --label=<label>` / `list` / `revoke`). headless env 에 `ATHSRA_TOKEN`+`ATHSRA_WORKER_URL` 주입만으로 `athsra run` 복호·주입 (2026-07-01 CLOUDFLARE_API_TOKEN/ACCOUNT_ID/ANTHROPIC 실증). **per-project scope**. CI/CD 의 GHA master-pw 임시방안 대체 — § CI/CD·headless 통합 |
| **MCP value tier (1.2.0)** | ✅ **종료 (2026-06-14)** | AI 가 채팅에서 secret 값 조회/주입. 신규 4번째 tier `value` (`ATHSRA_MCP_READ_VALUES=1`): `athsra_get_secret_value`(기본 마스킹 prefix+length+sha256; full 평문 = env opt-in + `confirm=<project>` 이중 게이트) + `athsra_run`(값 미노출 주입 + 출력 scrub). `mask.ts`/`run.ts` 신규. `mcp install --read-values`. outward 0 → 단독 trifecta 미형성. cli 239 pass. |
| **환경(config) 분리 (1.3.0)** | ✅ **종료 (2026-06-14)** | `secrets/<org>/<project>/<config>/`, config 생략=default. worker: `?config=` 7 routes + `sanitizeConfig` + 3-tier read fallback + write self-heal + `GET /:project/configs`. CLI: `resolveProject().config`(`--config=`/`project:config`/`.athsra`) → 10 secret 명령 전파 + `ls --configs`. MCP: 11 도구 optional `config`. 대시보드: 환경 Select 드롭다운 + listConfigs. 무중단 하위호환. cli 268 / dashboard 6 pass. |
| 2.2-2.4 | 검토 | RBAC (multi-user, D1 의존), dashboard alpha (SvelteKit + CF Pages), 잔존 15 repo |
| 3 | 계획 | beta, paid tier (Stripe $10/u/mo), SAML SSO, GitHub Actions / Vercel / Terraform / K8s ESO integrations, HN launch, SOC2 Type I, hardware wallet (Ledger / Trezor) BIP-39 통합 |
| 4 | 계획 | GA, SOC2 Type II, SCIM, dynamic secrets, multi-cloud DR, mTLS (enterprise) |

## BIP-39 12-word phrase 권장 (Phase 1.1)

master pw 의 권장 형식. `@scure/bip39` 표준 (paulmillr audited):

```bash
athsra new-phrase   # random 12-word phrase 생성 + paper-backup confirm
athsra login        # phrase 입력 시 자동 검증 ("valid BIP-39 12-word phrase ✓")
athsra rotate-master  # 기존 자유 phrase → BIP-39 phrase 로 교체
```

장점:
- **paper backup 표준화** — 영문 12 단어, 4×3 grid 로 적기 쉬움
- **checksum 자동 검증** — 종이 옮겨 적을 때 오타 detect (BIP-39 의 4-bit checksum)
- **128-bit entropy** — random 보장 (사용자 임의 phrase 보다 안정적)
- **hardware wallet 호환** (Phase 3+) — Ledger / Trezor 표준

자유 phrase (예 `#00_Nikyhmod`) 도 그대로 작동 — BIP-39 강제 X.

## Audit log 조회 (Phase 1.3)

worker 의 모든 인증/write event 가 single-line JSON 으로 capture:

```bash
# 실시간 tail
cd ~/code/athsra/apps/worker
bunx wrangler tail athsra-worker --format json | jq 'select(.message[0] | startswith("{\"type\":\"audit\""))'

# Cloudflare dashboard
# Workers > athsra-worker > Logs (7-day retention)
```

audit entry 형식:
```json
{
  "type": "audit",
  "ts": "2026-05-03T...Z",
  "actor": "Mod-Laptop-mopreu9q",
  "action": "post.v1",
  "request": { "method": "POST", "path": "/v1/secrets/foo" },
  "status": 200,
  "meta": { ... }
}
```

action 명명 규칙: `<area>.<event>` (예: `register.bootstrap`, `handoff.issued`, `revoke.self`, `post.v1`).

read events (GET /v1/secrets/:project) 는 noise 큼 + 1머신 dogfood 라 skip — write events + 4xx/5xx 만 기록.

Phase 2 후속: R2 `audit/<YYYY-MM>/<DD>.jsonl` append + SIEM export + audit query CLI command.

## Sibling Onboarding (잔존 15 sibling repo athsra 도입 path)

**대상**: `ecosystem.json.secretsMigration.pending` 의 15 repo (modfolio-admin, modfolio-dev, modfolio-on, modfolio-press, modfolio-docs, modfolio-works, modfolio-ls, modfolio-axiom, modfolio-studio, fortiscribe, keepnbuild, amberstella, munseo, umbracast, atelier-and-folio).

**원칙**: Hub-not-enforcer — 각 sibling owner 가 .env 도입 시점에 자율 채택. ecosystem 은 권고만, 강제 X.

**3-step path** (각 sibling repo owner 가 직접 실행):

```bash
# 1. athsra CLI install (npmjs.org public, 1회만)
bun add -g @athsra/cli   # 또는: npm i -g @athsra/cli
athsra --version          # 1.2.5+ 확인 (npmjs.org latest)

# 2. login (이미 다른 sibling 에서 했으면 skip — keyring 공유)
athsra login              # master pw 입력 + paper-backup confirm
# 또는 새 머신: athsra handoff (기존 머신에서 발급) → handoff --accept

# 3. secret 추가 (athsra project = sibling repo 이름 그대로)
athsra set <sibling-repo> KEY=value
athsra set <sibling-repo> --from-file .env       # bulk
athsra get <sibling-repo>                        # 검증
athsra run <sibling-repo> -- bun run dev         # env inject 후 실행
```

### CF Worker secrets + Workers Builds 통합 — `athsra adopt` (v0.1.5+, 2026-05-25)

위 3-step 후 sibling 의 envelope 를 **CF Worker secrets + Workers Builds GitHub push-to-deploy 까지 한 줄로** 연결:

```bash
cd ~/code/<sibling>
athsra adopt                  # dry-run: --dry-run
athsra adopt --manual-build   # 1차 build 즉시 검증
```

자동 추론 (sibling repo 디렉토리 안에서 호출 시):

| 항목 | 추론 source |
|---|---|
| `project` | basename(cwd) / `.athsra` / `package.json` (auto-project.ts) |
| `gh-repo` | `git remote get-url origin` |
| `cf-worker` | `wrangler.jsonc` 의 `name` (cwd 하위 발견된 첫 worker, 다중이면 `--cf-worker=<name>` 명시) |
| `root_directory` | `wrangler.jsonc` 위치 (repoRoot 기준 상대 경로) |
| CF token | env `CLOUDFLARE_API_TOKEN` > envelope key > `--cf-token-project=<x>` 명시 |

흐름 (모든 step 멱등):

1. envelope 확인 (없으면 `athsra set` 안내 + exit)
2. CF token 확보 (env 우선)
3. wrangler secrets sync (envelope → worker, 25-chunk bulk auto-split)
4. Workers Builds setup:
   - worker_tag GET
   - repo connection idempotent PUT (org 동일 시 reuse)
   - latest build_token GET
   - trigger upsert (root+branch 매칭 시 PATCH, 없으면 POST)
   - env vars PATCH (`GITHUB_TOKEN` default — `@modfolio/*` private deps 인증, 누락 시 `bun install` 무한 hang)
5. (`--manual-build`) 1차 build 트리거 (검증)

핵심 옵션:
- `--cf-worker=<name>` — 다중 wrangler.jsonc 시 명시
- `--env=KEY1,KEY2` — Workers Builds trigger env vars (default `GITHUB_TOKEN`)
- `--cf-token-project=<envelope>` — CF token 출처 envelope (default: project 자체)
- `--skip-sync` / `--skip-builds` / `--dry-run`

캐논 [`cf-workers-builds-api.md`](cf-workers-builds-api.md) 의 API 호출을 athsra CLI 의 lib (`packages/cli/src/lib/{workers-builds,wrangler-sync,adopt-context}.ts`) 로 추출 — 모든 sibling 동일 도구 사용. `scripts/sync-wrangler-secrets.ts` + `scripts/setup-workers-builds.ts` 는 lib 호출 thin wrapper 로 backward-compat.

#### Option γ — default-deny + manifest opt-in (athsra v0.1.6+, Phase 2.6 / 2026-05-26)

이전 `adopt` 와 `sync-wrangler-secrets` 는 envelope 의 **모든 키** 를 worker secrets 로 무차별 sync. 결과적으로 worker 의 권한이 envelope 전체로 확장 — secret leak 시 blast radius 가 envelope 단위로 증폭. **최소 권한 정공법**: sibling worker 가 명시적으로 opt-in 한 키만 sync.

**기본 동작 — default-deny**:
- manifest 없으면 sync 거부 + onboarding 안내 출력 (exit 2)
- `--allow-all` flag 로 legacy override (감사 추적: `bypassedManifest=true` 가 결과에 기록)
- manifest 있으면 envelope ∩ manifest.secrets 만 sync

**Manifest 위치 + schema (v1)**:
- `<worker.cwd>/.athsra/secrets.json` — `wrangler.jsonc` 와 같은 디렉토리
- 키 이름만 저장 (값 X, git commit 안전)

```json
{
  "$schema": "https://athsra.com/schema/secrets-manifest-v1.json",
  "version": "1",
  "secrets": ["DATABASE_URL", "SESSION_SECRET", "..."]
}
```

**CLI**:
```bash
# 신규 manifest — envelope 전체 캡처 (마이그레이션 빠른 시작)
athsra manifest init --all

# 명시 키만 (권장, 최소 권한)
athsra manifest init --keys=DATABASE_URL,SESSION_SECRET

# 또는 파일에서 키 목록 (한 줄 1개, # 주석 허용)
athsra manifest init --keys-from=docs/secrets-list.txt

# 출력 / 검증
athsra manifest show
athsra manifest validate [<project>]   # envelope vs manifest diff

# 수정
athsra manifest add NEW_KEY
athsra manifest remove OLD_KEY
```

**Hub-not-enforcer 정합**:
- athsra (hub) 는 기본을 default-deny 로 깔 뿐, 모든 sibling 에 manifest 작성을 강제하지 않음
- 각 sibling owner 가 자율적으로 opt-in. legacy override (`--allow-all`) 도 보존
- `bypassedManifest=true` 감사 흔적이 남아 보안 review 시 cleanup target 식별 가능

**해결되는 사고 패턴**:
- 새 worker 가 의도치 않게 envelope 전체 키 권한 획득 → manifest 강제로 차단
- 키 rename 시 envelope-manifest sync drift → `athsra manifest validate` 가 누락/초과 보고
- legacy `--allow-all` 사용처 → `bypassedManifest` flag 로 추적

**Sibling onboarding 흐름**:
```bash
cd ~/code/<sibling>/apps/<worker-dir>
# 첫 도입 (envelope 전체 캡처):
athsra manifest init --all
git add .athsra/secrets.json
git commit -m "feat(secrets): add athsra manifest (Phase 2.6 opt-in)"
# 이후 키 변경 시:
athsra manifest add NEW_KEY
athsra manifest validate <project>
```

코드: `packages/cli/src/lib/{secrets-manifest,wrangler-sync}.ts` + `packages/cli/src/commands/manifest.ts`. 35 tests (manifest 27 + sync 통합 8) pass.

**전제** (1회 사람 작업): Cloudflare GitHub App (`cloudflare-workers-and-pages`) 이 GitHub org 에 설치 + envelope 에 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` + `GITHUB_TOKEN` 존재. 셋 다 modfolio universe 의 표준 envelope (보통 `modfolio-connect`) 에 보관.

### 기존 secrets 이관 oneliner (Doppler / dotenvx → athsra)

도입 전 sibling 의 secrets 가 있는 경우 — 1회 이관:

```bash
# (A) Doppler → athsra (가장 흔한 case, doppler.yaml 가진 sibling)
doppler secrets download --project <sibling-repo> --config dev --no-file --format env \
  | athsra set <sibling-repo> --stdin
# 검증: diff <(doppler secrets download --project <sibling-repo> --config dev --no-file --format env | sort) \
#            <(athsra get <sibling-repo> | sort)
# → MATCH 시 doppler.yaml 폐기 권고 (30일 후 doppler projects delete)

# (B) dotenvx encrypted .env → athsra
bunx --bun dotenvx decrypt -f .env --stdout \
  | athsra set <sibling-repo> --stdin
# 검증 후 .env + .env.keys → legacy-backup/ 이동 + bun remove @dotenvx/dotenvx

# (C) 평문 .env (legacy-backup 케이스) → athsra
athsra set <sibling-repo> --from-file legacy-backup/.env

# (D) prod 분리 (Doppler config=prd 있던 경우) — 환경(config) 분리 (1.3.0) 사용
doppler secrets download --project <sibling-repo> --config prd --no-file --format env \
  | athsra set <sibling-repo>:prod --stdin
# `<project>:<config>` 환경 레이어 (1.3.0, § 환경(config) 분리) — 구 `<repo>-prod` project 분리 패턴은 legacy
```

이관 후 `package.json` scripts 변환:

```bash
# helper script (athsra repo 의 migrate-package-json.ts) — dotenvx/doppler → athsra
bun ~/code/athsra/scripts/migrate-package-json.ts \
  --package ~/code/<sibling-repo>/package.json \
  --repo <sibling-repo> \
  --apply

# 변환 패턴:
#   (bunx --bun )?dotenvx run -f .env --     → athsra run <sibling-repo> --
#   (bunx --bun )?dotenvx run --             → athsra run <sibling-repo> --
#   doppler run [--project X] [--config Y] -- → athsra run <sibling-repo> --
```

**package.json scripts 패턴**:

```json
{
  "scripts": {
    "dev": "athsra run <sibling-repo> -- vite",
    "build": "athsra run <sibling-repo> -- bun run build:internal",
    "deploy": "athsra run <sibling-repo> -- wrangler deploy"
  }
}
```

**wrangler.jsonc `secrets` 선언 (Worker repo, wrangler 4.87+ schema)**:

CF 신 config property 로 deploy-time secret 누락 검증. 사용자가 mismatch / "비번 분실" 인지하기 전에 차단:

```jsonc
{
  "vars": {
    "PUBLIC_VAR": "value"
  },
  // wrangler 4.87+ object schema: { required: string[] }
  "secrets": {
    "required": ["GLOBAL_SALT", "STRIPE_KEY", "RESEND_API_KEY"]
  }
}
```

> **2026-05-06 schema 마이그** — wrangler 4.87 부터 `secrets` 가 array → object schema 변경. 옛 `"secrets": ["GLOBAL_SALT"]` 는 reject ("The field 'secrets' should be an object but got [...]"). 신 형식: `"secrets": { "required": ["GLOBAL_SALT"] }`. athsra Phase 1.x.6 deploy 시점 (2026-05-06) athsra-worker 도 마이그 완료. 출처: [github.com/cloudflare/workers-sdk packages/workers-utils/src/config/environment.ts](https://github.com/cloudflare/workers-sdk).

athsra-worker 의 `GLOBAL_SALT` 같은 critical secret 은 **반드시** 선언. athsra Phase 1.x.5 mitigation 의 정공법 layer.

**no-secret repo** (예: modfolio-docs, modfolio-axiom): athsra 도입 불필요. .env 가 생기는 시점에 위 path 적용.

**v2 dotenvx legacy 가 있는 경우** (atelier-and-folio): `legacy-backup/.env` + `.env.keys` 보존 → `bunx @dotenvx/dotenvx decrypt -f legacy-backup/.env --stdout | athsra set <repo> --stdin` 으로 1회 import.

**최소 환경 prereq** (Linux/WSL2):
```bash
sudo apt install -y gnome-keyring libsecret-1-0 libsecret-tools dbus-x11
# WSL2 매 세션 시작 시 (또는 ~/.zshrc 추가):
printf "" | gnome-keyring-daemon --replace --unlock --components=secrets,ssh
eval $(gnome-keyring-daemon --start --components=secrets,ssh --daemonize)
```

**예상 분량 per sibling**: 5-15분 (master pw 종이 backup 검증 포함).

**자동화 helper** (선택): `~/code/athsra/scripts/migrate-package-json.ts` 가 `dotenvx run -f .env --` → `athsra run <repo> --` 일괄 변환 (gistcore 사례 검증됨).

### Multi-machine workflow

여러 머신 (집/사무실 PC + 노트북) 사용 시:

```bash
# 첫 머신 — 기준 머신 (master pw 알고 있음)
athsra login
athsra handoff                              # 1회용 handoff token 발급, 클립보드 자동 복사 또는 stdout

# 둘째 머신 — 기준 머신과 페어링
athsra handoff --accept                     # handoff token 입력 → master pw 자동 동기화 + 새 Bearer token 발급
athsra ls                                   # 모든 sibling 즉시 접근 가능 (E2EE — master pw + token 양쪽 필요)

# 머신 분실 시
# 다른 머신에서:
athsra ls --tokens                          # 활성 token 목록
athsra revoke <atk_*>                       # 분실 머신 token 무효화 (worker 측 D1 entry 제거, ~60s eventual)
# 새 master pw 로 전체 rotate (선택, paranoia 측):
athsra rotate-master                        # 모든 envelope re-encrypt + 모든 token revoke
```

### logout vs revoke (0.1.1+)

| 명령 | 동작 | worker 측 token | 사용 시점 |
|---|---|---|---|
| `athsra logout` | keyring (master pw + token) clear | **활성 유지** | 동일 머신 다른 사용자 / 단순 정리 |
| `athsra logout --full` | keyring clear + `~/.athsra/config.json` 삭제 | **활성 유지** | 머신 양도 (다음 owner 가 자기 master pw 로 login) |
| `athsra revoke` | keyring clear + worker token invalidate | **무효화 (irreversible)** | 머신 분실 / 폐기 / 의심 활동 |
| `athsra revoke <atk_*>` | 다른 머신 token invalidate | **무효화 (irreversible)** | 다른 머신 분실 시 (현재 머신에서 실행) |

> 일반적인 logout (Doppler/Vercel 등) 은 keyring clear 만 — athsra `logout` 동일. 보안 측면 강제 정리는 `revoke`.

### CI/CD·headless 통합 — service token (`ats_*`, 2026-07-01 실증)

headless 환경 (GHA runner / NAS cron / 원격 컨테이너 / 무인 야간 루프) 의 표준 = **service token**. 과거 "Phase 2 예정" 상태 종료 — **shipped + 실증 완료**. identity 세션에서 **master-pw 없이** 발급:

```bash
# 발급 (identity 세션에서 — master-pw 불필요)
athsra service-token create <project> --label=ci   # ats_* 토큰 출력
athsra service-token list                          # 발급 목록
athsra service-token revoke <ats_*>                # 무효화
```

headless env 에는 **2개 주입이 전부** — keyring·master-pw·브라우저 불필요:

```bash
ATHSRA_TOKEN='ats_...' \
ATHSRA_WORKER_URL='https://athsra-worker.winterermod.workers.dev' \
  athsra run <project> -- bunx wrangler deploy   # envelope 복호 + env 주입 작동
```

- **실증 (2026-07-01)**: service token 으로 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / ANTHROPIC 주입 확인 (CF=SET) — 무인 야간 루프 배포 경로로 검증.
- **scope**: service token 은 **per-project**. 다중 앱 파이프라인 = per-app 토큰 발급. (broad `ATHSRA_MASTER_PW` 주입은 의도적·비권장 fallback — 전체 envelope 복호 + 쓰기 권한.)
- **master-pw 가 필요한 것은 athsra *쓰기* (신규 secret 저장) 뿐**: 런타임 secret (`wrangler secret put` — CF token 으로) · 복호 (service token) · 배포 (push-to-deploy) · migration 전부 **master-pw 0** 으로 가능.

#### legacy fallback — GHA master-pw 패턴 (CI 용도 deprecated — service token 우선)

service token 이전의 임시 방안. `ATHSRA_MASTER_PW` 는 broad (전체 envelope 복호 + 쓰기) 라 CI 주입 비권장 — per-project service token 으로 대체. 의도적으로 broad fallback 이 필요한 경우만:

```yaml
# .github/workflows/deploy.yml — legacy fallback (service token 우선)
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      ATHSRA_MASTER_PW: ${{ secrets.ATHSRA_MASTER_PW }}
      ATHSRA_PAPER_BACKUP_CONFIRMED: 1
      ATHSRA_WORKER_URL: https://athsra-worker.winterermod.workers.dev
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun add -g @athsra/cli
      - run: |
          # WSL2/CI ephemeral keyring (Linux secret-tool fallback)
          sudo apt-get install -y libsecret-1-0 libsecret-tools dbus-x11
          eval $(dbus-launch --sh-syntax)
          eval $(printf '\n' | gnome-keyring-daemon --unlock --components=secrets)
      - run: athsra login          # non-interactive (ATHSRA_MASTER_PW + ATHSRA_PAPER_BACKUP_CONFIRMED)
      - run: athsra run <repo> -- bun run deploy:prod
      - if: always()
        run: athsra revoke         # CI runner 종료 직전 self-revoke (token 누출 방지)
```

> legacy 패턴 사용 시 매 run `athsra revoke` self-revoke 필수 (master-pw 유래 token 누출 방지). service token 경로는 `athsra service-token revoke <ats_*>` 로 개별 무효화.

### Sibling Inventory 도구 (Stage C 신규, 2026-05-06)

22 sibling repo 의 onboarding 준비 상태 + harness 채택 + secret 도입 시점을 한 번에 점검:

```bash
bun run scripts/sibling/inventory.ts                    # 22 sibling 콘솔 표
bun run scripts/sibling/inventory.ts --json             # 기계 가독
bun run scripts/sibling/inventory.ts --repo=gistcore    # 단일 repo 빠른 점검
```

**점검 항목**:
1. `.npmrc` 의 `@modfolio:registry` 설정 (harness pull 가능 상태)
2. `package.json` 의 `@modfolio/harness` 채택 버전 vs `ecosystem.harnessLatest`
3. `.env.example` 존재 (secret 도입 시점 indicator)
4. `wrangler.jsonc` `secrets` 선언 (Stage A.1 wrangler `secrets` config 적용 상태)

**분류 5단계**:
| 분류 | 의미 |
|---|---|
| `pull-ready` | .npmrc OK + harness latest 채택 |
| `pull-pending` | .npmrc OK + harness drift (자율 pull 시점 대기) |
| `secret-active` | .env.example 존재 + harness 채택 (secret 운영 중) |
| `secret-pending` | .env.example 없음 (secret 도입 전, 본 § Sibling Onboarding 가이드 대기) |
| `not-onboarded` | .npmrc 부재 (예: athsra — secret-store 자체) |

**2026-05-06 baseline** (Stage C 첫 dogfood):
- `not-onboarded`: 1 (athsra)
- `pull-ready`: 0
- `pull-pending`: 19 (모두 `^2.14.5` 정지, latest 2.25.0 대비 11 drift)
- `secret-active`: 3 (modfolio-pay, modfolio-connect, modfolio)
- 총 23 (modfolio-ecosystem 자체 제외)

→ Hub-not-enforcer 정상 작동 (강제 pull 없음). 잔존 19 sibling 중 .env 도입 시점이 본 가이드의 trigger.

`scripts/sibling/inventory.ts` 는 read-only — Hub-not-enforcer 정합. 변경 0, 보고만.

## 남은 작업 + 미래 분기점

자세한 분기점 + 우선순위 + 분량 추정은 athsra repo 의 [ROADMAP.md](https://github.com/modfolio/athsra/blob/main/docs/ROADMAP.md) 참조.

운영 안정성 (Phase 1.x):
- ✅ soft-delete + version history (Phase 1.x.1) — point-in-time recovery
- ✅ D1 token table (Phase 1.x.2 production active) — strong consistency
- audit R2 export (Phase 1.x.3) — Workers Logs (7-day) → R2 영구 + SIEM
- KV binding 제거 (Phase 1.x.4, 2026-05-12 이후) — 7일 무사고 검증 후
- **GLOBAL_SALT_VERSION change 자동 re-bootstrap 모드 (Phase 1.x.5, 신규)** — 1.x.2 cutover dogfood mitigation

alpha 진입 (Phase 2):
- npm publish (`@athsra/cli` global)
- RBAC (multi-user)
- dashboard alpha (SvelteKit + CF Pages)
- 잔존 15 repo migration (Hub-not-enforcer 자율)

미래 (Phase 3+):
- hardware wallet (Ledger/Trezor) BIP-39 통합
- GitHub Actions / Vercel / Terraform / K8s ESO 통합
- paid tier + SAML SSO + SOC2

## v1.17.0 변경 (2026-07-04) — CLI 1.2.5/crypto 1.2.0 현행화 + fact-ownership 정합

v1.17.0 (2026-07-04): CLI `1.2.5` + crypto `1.2.0` 현행화 (npm `view` 실측 — athsra 2026-07-04 registry-currency ask 이행) + secret-change webhook·revoke-by-hash 능력 반영 + 복호 degrade known issue 종결.

- **현행 = `@athsra/cli@1.2.5` + `@athsra/crypto@1.2.0`** (npmjs.org public) — 본문 1.2.2 현행 표기 3곳(§ 위상, 설치·3-step `--version` 가이드) 정정. v1.16.0 블록 등 역사 기록은 불변 유지
- **신규 능력 (CLI 1.2.5)**: ① **secret-change outbound webhook** — D1 `0026_secret_change_webhooks`(`auth_webhook_endpoints`), payload `{event,project,config,action,timestamp}` value-free + HMAC-SHA256 서명, `athsra webhook {add|list|remove|test}`. app-level outbound(athsra→운영자 등록 URL) — universe event-bus `subscribesTo` 아님 ② **service-token revoke by recipient/hash** — worker `DELETE /auth/service-tokens/:hash` CLI 노출, 값 분실 dormant token 정리 갭 해소
- **Known issue 종결 (§ 평소 사용)**: "복호 degrade" = 인라인 `${#VAR}` 프로브의 부모 셸 조기확장 **측정 아티팩트** (파일 기반 프로브로 정상 실증, journal 20260703). 교훈 = 시크릿 주입 검증은 파일 기반 프로브만
- **fact-ownership 정합**: athsra 하위 패키지 버전의 SoT = **athsra repo 실측**(npm published) — 본 canon 의 버전 표기는 미러(관측 기록)이며 불일치 시 실측이 옳다 (canon `fact-ownership.md`, 도입 계기가 바로 이번 1.1.7/1.2.2/1.2.5 3중 stale)

## v1.16.0 변경 (2026-07-03) — CLI 1.2.2 현행화

v1.16.0 (2026-07-03): CLI 1.2.2 현행화 — service token 실증·env config·manifest·adopt·MCP value tier·headless=service-token 우선 (GHA master-pw 워크어라운드 대체).

- **현행 CLI = `@athsra/cli@1.2.2`** (npmjs.org public) — 본문 `0.1.x` current-version 표기 2곳 (설치 후 `--version` 확인) 정정. 기능 도입 버전 표기 (adopt v0.1.5+ / manifest v0.1.6+ / logout 0.1.1+) 는 역사 기록으로 유지
- **§ CI/CD·headless 통합 재작성**: service token (`ats_*`) 이 headless 표준 — identity 세션 master-pw-free 발급 (`service-token create/list/revoke`) + `ATHSRA_TOKEN`/`ATHSRA_WORKER_URL` 주입 = `athsra run` 복호·주입 (2026-07-01 실증: CLOUDFLARE_API_TOKEN/ACCOUNT_ID/ANTHROPIC). **per-project scope** (다중 앱 = per-app 발급). 구 GHA `ATHSRA_MASTER_PW` 패턴 = legacy fallback 격하 (CI deprecated). **master-pw = athsra 쓰기 전용** (런타임 secret·복호·배포·migration 은 master-pw 0) 명시
- **§ Phase 별 변경**: service token headless (1.x.8) row 추가. env config (1.3.0) · manifest (Phase 2.6) · adopt (v0.1.5+) · MCP value tier (1.2.0) 는 기존 § 현행 확인 — 변경 불필요
- **§ 이관 oneliner (D) prod 분리**: "athsra 는 환경(env) 레이어 없음" stale 정정 → `<project>:prod` config (1.3.0)
- **Known issue 추가 (§ 평소 사용)**: 로컬 identity-session 복호 degrade (2026-07-01 관측 — identity login 후 envelope secrets 전부 empty). root-cause **진단 진행 중** (2026-07-03 세션). service token 경로는 정상

## v1.14.0 변경 (2026-05-09) — Doppler-level service UX cement (logout 명령 + 이관 oneliner + multi-machine + CI/CD)

사용자 통찰 (2026-05-09): "Doppler 처럼 athsra 도 중앙 service 로 가능해야 한다 — 다른 머신/새 sibling 등록/secret 수정 모두 service-level UX". 정공법 = athsra 자체 완성도 강화.

**보강 영역** (§ Sibling Onboarding 안):

- **§ 기존 secrets 이관 oneliner**: Doppler/dotenvx encrypted/평문 .env 4개 case 별 oneliner + 검증 절차 + prod 분리 (project 명 패턴)
- **§ Multi-machine workflow**: handoff 절차 + 머신 분실 시 revoke + rotate-master
- **§ logout vs revoke (0.1.1+)**: athsra `logout` 신규 명령 추가 (keyring clear, worker token 유지) — Doppler/Vercel 등 표준 logout UX. revoke 와 의미 분리
- **§ CI/CD 통합 (GitHub Actions)**: 임시 ATHSRA_MASTER_PW + ATHSRA_PAPER_BACKUP_CONFIRMED + self-revoke 패턴. Phase 2 service token 으로 대체 예정

**athsra repo 변경**:
- `@athsra/cli@0.1.1` publish (예정) — `logout` 명령 추가 (`packages/cli/src/commands/logout.ts` 신규)
- `index.ts` commands map + help 갱신

**Doppler-level service 매트릭스 도달도** (2026-05-09):
- CLI/API 기능: 95% (service token 만 Phase 2)
- UX: 85% (환경 레이어 / RBAC 만 Phase 2.2)
- 보안: 110% (E2EE 우월)

> 다음 cycle: Phase 2 service token (`athsra tokens create`) — CI/CD 임시 방안 대체.

## v1.13.0 변경 (2026-05-06) — Trial P1 #6 CF Secrets Store + #7 D1 Sessions API spike

### Trial P1 #6 — CF Secrets Store 검토

**대상**: GLOBAL_SALT, NPM_TOKEN, CLOUDFLARE_API_TOKEN 등 universe-shared secret (athsra envelope 외 1차 보관)

**Pros**:
- account-level RBAC + audit log (CF native)
- 24 sibling Worker 모두 binding 공유
- wrangler secret put 의 individual scope 한계 해소

**Cons / 제약 (open beta 2026-05 시점)**:
- 1 store/account (multi-tenant 분리 X)
- account-level scope 만 (project-level 격리 X)
- audit log 의 14-day retention (athsra audit R2 영구와 비교)

**Decision tree**:
```
GLOBAL_SALT rotation 시점 도래?  ─── YES ── CF Secrets Store 마이그 검토 (1095일 cycle)
                                  └── NO ─── athsra envelope + wrangler secret 유지 (현행)

NPM_TOKEN 등 universe-shared?    ─── YES ── CF Secrets Store 후보 (account binding 단순화)
                                  └── NO ─── athsra envelope (sibling 별 격리)
```

**Status**: Trial-spiked. Adopt 시점 = open beta GA 또는 GLOBAL_SALT rotation. canon `tech-trends-2026-05.md` Trial P1 #6.

### Trial P1 #7 — D1 Sessions API (read replication) sketch

**대상**: athsra D1 token table read 경로 (whoami / version history / audit log query)

**적용 sketch** (athsra Phase 1.x.7 또는 RBAC Phase 2.2 묶음 — 별도 plan):

```ts
// apps/worker/src/middleware/auth.ts (sketch)
const session = c.env.TOKENS_DB.withSession({ constraint: 'first-primary' });
const db = drizzle(session);

// bearerAuth: token lookup (read-heavy) → nearest replica
const row = await db.select().from(authTokens).where(eq(authTokens.hash, hash)).get();
```

**Constraint 모드**:
- `'first-primary'` (read-after-write 안전): 첫 read 만 primary, 이후 replica
- `'first-replica'` (eventual consistency 허용): 모든 read replica
- 사용자 register/rotate-master/revoke 후 즉시 read 는 `'first-primary'` 권장 (revoke 후 stale token 통과 risk)

**Write (login/rotate/revoke)** 는 `withSession` 미사용 — primary 강제.

**mockD1 한계**: `withSession` throws "not implemented" — production 만 적용. Test 는 직접 drizzle(env.TOKENS_DB).

**Status**: Trial → Adopt-1-sketched (실 cement = 별 plan, athsra Phase 1.x.7 또는 RBAC 시점). canon `tech-trends-2026-05.md` Trial P1 #7.

## 관련

- skill `.claude/skills/secret/SKILL.md` — 사용자 호출 CLI 가이드
- skill `.claude/skills/preflight/SKILL.md` § Athsra Status
- canon `knowledge/canon/archive/secrets-dotenvx.md` — archived 2026-05-03 (Phase 1 완료 시점)
- canon `knowledge/canon/m365-graph-integration.md` — M365 OAuth (athsra 와 별개, M365 자체 secret 은 athsra 로 관리)
- ecosystem.json `secretsMigration` — completed 8 / pending 15 (대부분 .env 없는 미사용 repo)

## upstream

- repo: github.com/modfolio/athsra
- arch: github.com/modfolio/athsra/blob/main/docs/ARCHITECTURE.md
- onboarding: github.com/modfolio/athsra/blob/main/docs/ONBOARDING.md
- product roadmap: `~/.claude/plans/glittery-singing-treasure.md` (internal, Phase 2 출시 시 docs/ 로 옮김)
