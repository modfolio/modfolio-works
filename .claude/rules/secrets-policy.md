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

## 린트 정합 — `noUndeclaredEnvVars` 는 이 저장소에서 **적용 불가** (2026-07-31)

`biome.json` 에서 `suspicious/noUndeclaredEnvVars: "off"`. 우회가 아니라 **전제 부재**다:

그 규칙은 `.env` 계열 파일에 선언된 이름과 코드의 `process.env.X` 를 대조한다. 그런데
이 저장소는 **athsra 런타임 주입**이라 `.env` 를 두지 않는 것이 위 §보관 계층의 정책이다
(no-persistence = 보안 gold standard). 즉 대조할 선언 원본이 **설계상 존재하지 않는다.**

⚠ 규칙을 켜 두면 두 가지 나쁜 일이 생긴다: ① 정상적인 노브 참조가 매번 경고를 내고
② 그걸 없애려고 실제 `.env` 를 커밋하게 유도한다 — **정책이 금지하는 바로 그 행위**다.
린트가 시크릿 정책과 반대 방향을 가리키면 린트를 끈다.

비-시크릿 튜닝 노브(`TS7_REGISTRY`·`LABEL_CONCURRENCY` 등)는 `.env.example` 에
placeholder 로 **문서화**한다(§4 그대로 — 실제 값 없음).

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
| **athsra Bearer token** | 자동 (atk_* 분실/머신 변경 시 즉시) | `athsra revoke <atk_*>` — **즉시 유효**(D1 strong consistency) |
| **athsra `GLOBAL_SALT`** | 1095일 (3년) 또는 incident 시 즉시 | `wrangler secret put GLOBAL_SALT` 후 PROOF 재 bootstrap (모든 사용자 재 register 필요 — major event) |
| `SSO_PRIVATE_KEY_JWK` | 365일 (incident 시 즉시) | JWK 수명 |

> ⚠ **2026-08-05 정정 — Bearer token revoke 는 «KV ~60s eventual» 이 아니다.** 그 문장이
> 이 표에 3개월 넘게 실려 있었고 **모든 sibling 에 배포됐다.** athsra 는 2026-05-06 에
> KV → D1 로 컷오버했고(Phase 1.x.4) 네임스페이스는 2026-07-19 에 삭제됐다.
> 허브 독립 실측(athsra 체크아웃, read-only): 워커 소스에 `KVNamespace` **0건** ·
> revoke 는 `db.delete(authTokens)` = **D1 DELETE** · `apps/worker/src/lib/db.ts:8` 이
> *"쓰기(토큰 revoke…)가 그 요청의 전 쿼리에서 관측된다. 따라서 revoke 즉시성"* 을 명시.
>
> **이 표는 유출 사건 한복판에서 읽힌다.** «60초 전파» 라고 적혀 있으면 대응자가
> **존재하지 않는 노출 창을 계산**하거나 이미 끝난 revoke 를 «아직인가» 하고 기다린다.
> athsra 의 문장: *"낡은 운영 문서는 조용히 틀리지 않는다 — **사건 중에** 틀린다."*

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
