# 시크릿 정책

**하드코딩 금지**. API 키, 토큰, 서명 키, DB 비밀번호, OAuth client secret, encryption salt — 전부.

## 보관 계층 (2026-05-03 v3 — athsra 기반 universe-wide 전환, Phase 1 active)

1. **dev — athsra**: master pw 1개 + Bearer token. 모든 secret 이 CF Worker (`athsra-worker.*.workers.dev`) 의 R2 ciphertext 로 저장. `~/.athsra/config.json` (workerUrl + machineId) + OS keyring (master pw + token). `.env` / `.env.keys` 폐기. 절차: canon `secret-store` v1.1+.
2. **prod 런타임 — Cloudflare native**: Workers Secrets (`wrangler secret put`), Pages environment variables (CF Dashboard), Secret Store (binding). athsra 는 dev/build/deploy CLI 시점에 `athsra run <repo> -- <cmd>` 으로 inject.
3. **`.env.local`** (개발자 개인, git 무시): 일시 override / 실험만. 절대 commit 금지. 권장: athsra `<repo>-local` project 로 분리.
4. **`.env.example`** (commit 대상): placeholder만. 실제 값 없음.
5. **dotenvx** (deprecated 2026-05-03 v3 전환): 8 repo migration 완료. 잔존 repo 는 `bun ~/code/athsra/scripts/migrate-package-json.ts` 로 일괄 변환.
6. **Doppler** (deprecated 2026-04-25): 과거 표준. 새 repo 는 도입 금지.

## 금지 패턴

- 테스트 코드에 실제 키 하드코딩 — 테스트 키라도 예외 없음
- 주석에 키 남기기 (`// key: sk-ant-...`)
- MCP config에 토큰 inline — `.mcp.json`에 placeholder만, 실제 값은 env
- Supertone / Toss / Resend / HuggingFace token 리터럴

## 로테이션 주기 (권고)

| 시크릿 | 주기 | 기준 |
|--------|------|------|
| `SESSION_SECRET` | 90일 | Better Auth 규범 |
| `BETTER_AUTH_SECRET` | 180일 (incident 시 즉시) | Connect SSO 기반 |
| 외부 API key (Toss, Resend 등) | 180일 | 제공사 권고 |
| **athsra master password** | 365일 (분실/leak 의심 시 즉시) | `athsra rotate-master` — 모든 envelope re-encrypt + 모든 token revoke |
| **athsra Bearer token** | 자동 (atk_* 분실/머신 변경 시 즉시) | `athsra revoke <atk_*>` — KV ~60s eventual |
| **athsra `GLOBAL_SALT`** | 1095일 (3년) 또는 incident 시 즉시 | `wrangler secret put GLOBAL_SALT` 후 PROOF 재 bootstrap (모든 사용자 재 register 필요 — major event) |
| `SSO_PRIVATE_KEY_JWK` | 365일 (incident 시 즉시) | JWK 수명 |

## 유출 시

1. 즉시 로테이션:
   - athsra master pw leak: `athsra rotate-master` (CLI 한 번에 모든 envelope re-encrypt + token revoke)
   - athsra Bearer token leak: `athsra revoke <atk_*>` (다른 머신에서)
   - GLOBAL_SALT leak: `wrangler secret put GLOBAL_SALT` + 모든 PROOF/secret 재 bootstrap (major event)
   - 외부 API key leak: 해당 provider dashboard 에서 revoke + 새 key 발급 + `athsra set <repo> KEY=new`
2. `docs/incidents/<date>-secret-leak.md` 작성
3. audit: athsra `lastSeenAt` (whoami/doctor) + CF Worker 로그
4. `modfolio-connect` 관련이면 active session 전부 무효화

## 검출

- code-reviewer agent가 하드코딩 스캔 (high-entropy string, prefix 매칭)
- pre-commit hook이 git add 시 스캔 (v2.4에서 추가 예정)
- Cloudflare의 Pages/Workers 빌드 로그에 key 출력되지 않도록 `env` 사용

## 관련 canon / skill

- `knowledge/canon/secret-store.md` (v1.1+) — 시크릿 관리 표준 athsra v3 (universe-wide, applicability: always)
- `knowledge/canon/archive/secrets-dotenvx.md` — archived 2026-05-03 (Phase 1 완료)
- `knowledge/canon/observability.md` — 트레이스에 시크릿 포함 금지 (Langfuse redaction)
- `.claude/skills/secret/SKILL.md` — athsra CLI 운영 가이드 (v3.1+)
- `.claude/skills/ops/SKILL.md` — secret 운영 전반
- `.claude/skills/security-scan/SKILL.md` — OWASP Top 10 + 시크릿 스캔
- `knowledge/canon/cost-attribution.md` — 시크릿 rotation cost 평가
