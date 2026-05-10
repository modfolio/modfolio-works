---
title: Secret Store — athsra (E2EE on Cloudflare edge)
version: 1.13.0
last_updated: 2026-05-06
source: [github.com/modfolio/athsra Phase 0-2.1 + 1.x.2/1.x.3/1.x.4/1.x.5 active (chronological 1.x.6), plan v4.0.0 glittery-singing-treasure.md, Phase 1 4 active 151 keys + 4 no-secret cleanup, Phase 2.1 npmjs.org publish (@athsra/cli + @athsra/crypto 0.1.0), Phase 1.x.2 D1 token table production deploy 2026-05-05 (worker version 04727c33 phase_label=1.x.2 live, drizzle-orm + drizzle-kit, 34 worker tests pass), Phase 1.x.2 cutover dogfood 발견 (KV PROOF D1 자동 import 안 됨, GLOBAL_SALT change risk, legacy-backup 100% 복원 검증), Phase 1.x.3 audit Queue + R2 + D1 cement 2026-05-06 (athsra c6be015, Trial P1 #5 R2 Event Notifications 묶음, 41 worker tests pass)]
sync_to_siblings: true
consumers: [ops, new-app, preflight, secret]
applicability: always
---

# Secret Store — athsra (E2EE on Cloudflare edge)

**Brand**: 한국어 "아스라이" (어렴풋이) 어원, 발음 _Ah-sra_. 사라질 듯 말 듯한 비밀의 정서.

**핵심 가치**: Doppler dev UX + Phase zero-knowledge E2EE + Cloudflare 글로벌 edge `<50ms` latency. 가입 0 (사용자 자체 운영) + 결제 0 (CF free tier) + 정공법 (정확한 통제).

## 위상

modfolio universe 의 secret 관리 표준 (v3.0.0 부터, **Phase 2.1 + 1.x.2 production active 2026-05-05** — npmjs.org publish + D1 token table production deploy 완료). canon `secrets-dotenvx` v2.3.0 (OneDrive backup mirror 모델) 폐기 — 본 canon 으로 이전. 사용자 자체 자산 (modfolio/athsra repo) + **외부 alpha 진입** (`bun add -g @athsra/cli` 가능) + **strong consistency** (revoke 즉시 반영).

**Production status (2026-05-05)**: worker `https://athsra-worker.winterermod.workers.dev` version `04727c33-347d-47c6-9059-d4d2764dea5f` phase_label=1.x.2 live. D1 `athsra-tokens` (uuid 892fb424-5a18-4eb0-bf26-d29e84c13180, region APAC) active. 4 sibling repo (modfolio-ecosystem 129 + modfolio-pay 11 + modfolio-connect 5 + gistcore 6 = **151 keys**) athsra E2EE 운영 중.

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
athsra --version   # 0.1.0+
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
athsra --version          # 0.1.0+ 확인

# 2. login (이미 다른 sibling 에서 했으면 skip — keyring 공유)
athsra login              # master pw 입력 + paper-backup confirm
# 또는 새 머신: athsra handoff (기존 머신에서 발급) → handoff --accept

# 3. secret 추가 (athsra project = sibling repo 이름 그대로)
athsra set <sibling-repo> KEY=value
athsra set <sibling-repo> --from-file .env       # bulk
athsra get <sibling-repo>                        # 검증
athsra run <sibling-repo> -- bun run dev         # env inject 후 실행
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
