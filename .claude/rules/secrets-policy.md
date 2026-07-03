# 시크릿 정책

**하드코딩 금지**. API 키, 토큰, 서명 키, DB 비밀번호, OAuth client secret, encryption salt — 전부.

## 보관 계층 (2026-05-03 v3 — athsra 기반 universe-wide 전환, Phase 1 active)

1. **dev — athsra**: master pw 1개 + Bearer token. 모든 secret 이 CF Worker (`athsra-worker.*.workers.dev`) 의 R2 ciphertext 로 저장. `~/.athsra/config.json` (workerUrl + machineId) + OS keyring (master pw + token). `.env` / `.env.keys` 폐기. 절차: canon `secret-store` v1.1+.
2. **prod 런타임 — Cloudflare native**: Workers Secrets (`wrangler secret put`), Pages environment variables (CF Dashboard), Secret Store (binding). athsra 는 dev/build/deploy CLI 시점에 `athsra run <repo> -- <cmd>` 으로 inject.
3. **`.env.local`** (개발자 개인, git 무시): 일시 override / 실험만. 절대 commit 금지. 권장: athsra `<repo>-local` project 로 분리.
4. **`.env.example`** (commit 대상): placeholder만. 실제 값 없음.
5. **dotenvx** (deprecated 2026-05-03 v3 전환): 8 repo migration 완료. 잔존 repo 는 `bun ~/code/athsra/scripts/migrate-package-json.ts` 로 일괄 변환.
6. **Doppler** (deprecated 2026-04-25): 과거 표준. 새 repo 는 도입 금지.

## athsra runtime-injection — AI 행동 규칙 (2026-06-30, "빈 .env ≠ 시크릿 없음")

athsra 는 **runtime 주입** 모델 — 시크릿은 `athsra run <repo> -- <cmd>` 또는 세션 진입 시 env 로 들어오고 **디스크에 영구 저장되지 않는다**(no-persistence = 보안 gold standard; local-sync·`.env` 캐시는 의도적 폐기). 그래서 `.env` 가 비거나 없는 건 **정상이고 예상된 상태**다.

**AI/agent 필수 행동** (반복 마찰 = "athsra-forgetting" 제거):
- **빈/부재 `.env` 를 보고 "시크릿 누락 → 사용자에게 인증 요청"으로 절대 결론짓지 않는다.** 가장 흔한 마찰. 시크릿은 athsra 에 있다.
- 시크릿이 필요하면 순서대로: ① 주입된 **세션 env**(`process.env.<KEY>`)부터 확인 → ② 없으면 `athsra run <repo> -- <cmd>`(주입 후 명령 실행) → ③ 단일 값은 `athsra get <repo> <KEY>`(값은 로그/응답 미노출).
- "인증/로그인 필요" 결론은 **`athsra doctor` 가 실제로 토큰/세션 부재를 보고할 때만**. 빈 `.env` 는 근거가 아니다.

**구조적 해결 (forgetting 자체 제거)**: 개발 세션을 `athsra run <repo> -- <launcher>` 로 시작 → 시크릿이 세션 env 에 상주 → AI 가 그냥 `process.env` 로 읽음(매번 `athsra run` 기억 불필요, 디스크 0). IDE/툴이 `.env` 파일을 강제하면 영구 캐시 대신 **tmpfs 에 쓰고 종료 시 wipe**. 상세: canon `secret-store.md`.

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
- `knowledge/canon/agent-auth-ux.md` + `.claude/rules/agent-auth-flow.md` — 에이전트가 직접 시작·브라우저 승인 인증(athsra login 터미널 떠넘기기 금지)
- `knowledge/canon/archive/secrets-dotenvx.md` — archived 2026-05-03 (Phase 1 완료)
- `knowledge/canon/observability.md` — 트레이스에 시크릿 포함 금지 (Langfuse redaction)
- `.claude/skills/secret/SKILL.md` — athsra CLI 운영 가이드 (v3.1+)
- `.claude/skills/ops/SKILL.md` — secret 운영 전반
- `.claude/skills/security-scan/SKILL.md` — OWASP Top 10 + 시크릿 스캔
- `knowledge/canon/cost-attribution.md` — 시크릿 rotation cost 평가
