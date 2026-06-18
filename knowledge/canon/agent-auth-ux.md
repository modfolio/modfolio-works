---
title: Agent Auth UX — 에이전트가 시작하고 브라우저로 승인하는 인증 표준
version: 1.1.0
last_updated: 2026-06-14
source: [사용자 피드백 2026-06-14 (athsra/connect 터미널 떠넘기기 마찰), athsra device-login(RFC 8628)/MCP login_start 구현 실측, oidc-flow.ts, 2026-06-14 athsra_run MCP CF 직접조작 실증]
changelog: ["1.1.0 (2026-06-14): 인증 후 direct-operation 섹션 추가(athsra_run MCP 직접조작, CF=cf-api-mastery 레퍼런스, 게이트 유지). 1.0.0: 초판(login UX 표준)"]
sync_to_siblings: true
applicability: always
consumers: [all-agents, sso-integrate, secret, ops, connect, athsra]
related_rules: [agent-auth-flow, secrets-policy, lethal-trifecta]
related_canon: [secret-store, payment-safety]
---

# Agent Auth UX — "에이전트 시작 · 브라우저 승인" 인증 표준

## 한 줄

modfolio universe 의 모든 인증은 **에이전트가 직접 시작**하고 **사람은 브라우저에서 승인만** 한다. 사용자가 터미널에 인증 명령을 치는 모델은 폐기 표준이다. 강제 행동 규칙은 `.claude/rules/agent-auth-flow.md`; 이 canon 은 아키텍처 표준·서비스 매트릭스·마이그레이션이다.

## 문제 (2026-06-14 사용자 피드백)

athsra·connect 같은 공유 서비스는 universe 전 프로젝트에 들어간다. 그런데 AI 가 "나는 로그인 못 한다"며 사용자에게 `athsra login` 을 터미널에서 반복 실행하라고 떠넘겼다. 사용자가 원하는 기본 동작:

> 권한·계정(나/admin)이 있으면 AI 가 알아서 로그인/연결을 **실행**하고, 그러면 **브라우저에 로그인 페이지가 떠서** 거기서 로그인 + authorize/authenticate 하면 인증 완료. 터미널 입력 0.

실측 결과 **능력은 이미 다 있었다** — 빠진 건 "이를 기본으로 쓰라"는 지침. 이 canon 이 그 표준을 cement 한다.

## 표준 아키텍처 (서비스가 MUST 제공)

universe 의 모든 인증 표면은 **에이전트-시작 가능 + 브라우저-승인** 플로우를 제공해야 한다. 셋 중 하나:

1. **OAuth 2.0 Device Authorization Grant (RFC 8628)** — CLI/에이전트가 `device/code` 요청 → `user_code` + `verification_uri_complete` 수령 → 사용자가 브라우저에서 승인 → `device/token` poll. **비밀(`device_code`)은 응답·채팅에 절대 미노출**, `user_code`+URL 만 표면. athsra 가 레퍼런스.
2. **Loopback OAuth** — 로컬 `127.0.0.1:<port>` 콜백 리스너 + 브라우저 자동 오픈 → consent → 콜백으로 토큰 수령. `wrangler login` 패턴.
3. **OIDC PKCE** — `code_verifier`/`code_challenge` + 브라우저 `/authorize` → loopback callback → `/token`. connect SSO 가 IdP, athsra 평문 `athsra login` 이 소비자.

공통 불변식:
- **사람의 승인 단계는 보존**(human-in-the-loop) — 마찰만 제거, 통제는 유지.
- **비밀은 에이전트를 거치지 않는다** — master pw / `device_code` / refresh token 은 브라우저·keyring 안에서만. 에이전트는 `user_code`+URL+status 만 본다.
- **phishing guard** — device flow 는 fingerprint 표시로 사용자가 화면 일치 확인(athsra `device_key_fingerprint`).
- **headless/CI 폴백** — 브라우저 불가 환경은 service token(`ATHSRA_TOKEN=ats_…` / `GITHUB_TOKEN`)을 athsra·env 로 주입.

## 서비스 매트릭스 (현행 실측)

| 서비스 | 에이전트 시작 경로 | 플로우 | 비밀 격리 |
|---|---|---|---|
| **athsra** | MCP `athsra_login_start`→`athsra_login_status`; CLI `athsra login --device`; 평문 `athsra login`(OIDC PKCE) | Device Grant + OIDC PKCE | master pw 브라우저 밖 미노출, `device_code` 무노출 |
| **modfolio connect** (IdP) | `oidc-flow.ts` `runOidcPkceFlow` → `/authorize` 브라우저 | OIDC PKCE + loopback | code_verifier 로컬, token keyring |
| **Cloudflare** | `wrangler login` | Loopback OAuth | CF 토큰 wrangler 관리 |
| **GitHub** | `gh auth login --web`; 우선 athsra 주입 `GITHUB_TOKEN` | Device / PAT | token athsra/keyring |
| **MCP 커넥터** (claude.ai) | `*__authenticate` → URL → `*__complete_authentication` | 커넥터 OAuth | 커넥터측 토큰 |

> 전부 **이미 브라우저 플로우**다. 에이전트가 위 경로를 **기본으로 실행**하면 사용자 터미널 입력이 사라진다.

## 에이전트 실행 패턴 (권장 시퀀스)

```
1. 도구 호출 → "not authenticated" 류 응답
2. (athsra 예) athsra_login_start 호출 → { user_code, verification_uri_complete, device_key_fingerprint }
3. 사용자에게: "브라우저에서 승인하세요: <verification_uri_complete> (코드 <user_code>,
   화면 fingerprint 가 <device_key_fingerprint> 와 같은지 확인). 승인하면 이어서 진행합니다."
4. athsra_login_status 를 retry_after_seconds 준수하며 poll → approved
5. 원래 작업 재개. 사용자는 터미널 입력 0.
```

CLI 만 가능한 경우: 에이전트가 `wrangler login` / `gh auth login --web` / `athsra login --device` 를 **직접 Bash 실행** → OS 가 브라우저 오픈 → 사용자 승인 → 에이전트가 계속.

## 인증 후 — 직접 조작 (direct operation)

로그인은 시작일 뿐이다. **인증된 뒤 서비스 운영도 에이전트가 API/CLI/MCP 로 직접 한다** — 사용자에게 대시보드 클릭이나 터미널 명령을 떠넘기지 않는다. 비밀은 athsra 가 주입(에이전트 미노출), 출력은 scrub.

- **세션 내 (권장)**: `athsra_run` MCP — `athsra_run(project, command, args, return_output)`. envelope secret 을 env 로 주입하고 명령 실행, 값은 응답에서 scrub. 터미널 0. 등가 CLI = `athsra run <project> -- <cmd>`.
- **무엇을 직접 하나**: 배포(wrangler), REST API 호출(curl/bun fetch), DB 쿼리(D1/Neon), 설정·도메인·DNS·KV/R2 등 — 각 서비스의 API 가 있으면 직접.
- **CF 레퍼런스 구현**: `knowledge/canon/cf-api-mastery.md` (영역별 endpoint 카탈로그 + athsra_run 주입 + hallucination 차단). 2026-06-14 `athsra_run` 으로 zones/workers(42)/pages(10)/d1/kv/r2/queues 전 영역 200 재검증.
- **다른 서비스**: connect(admin API)·pay·Neon·GitHub·Vercel 등도 athsra 주입 토큰으로 동일 패턴. 각 서비스의 토큰이 athsra `modfolio-ecosystem`(또는 해당 repo) envelope 에 있음.
- **게이트는 유지**: pay 의 **돈 이동**은 `payment-safety.md`(`pre-payment-guard`), 파괴적 작업은 사전 확인, sibling repo **코드** 수정은 Hub-not-enforcer 건별 허가. "직접 조작"이 이 게이트들을 우회하지 않는다.

> 핵심: "API 가 있는데 AI 가 못 한다 / 대시보드에서 하라"는 거의 항상 hallucination (CF 의 경우 `cf-api-mastery.md` § 7 H1·H8). 의심 전 레퍼런스·게이트 먼저.

## 마이그레이션 (브라우저 플로우 없는 표면)

새/레거시 서비스가 터미널-only 인증이면:
1. "터미널 수동 인증"을 normalize 하지 말 것 — 임시도 금지.
2. Device Grant(RFC 8628) 또는 loopback OAuth 추가를 정공법 과제로. athsra `packages/cli/src/lib/device-login.ts` + `oidc-flow.ts` 를 참조 구현으로.
3. 추가 전까지는 service token 주입으로 우회(사용자 터미널 인증이 아니라 athsra 주입).

## 보안 정합 (정공법)

- 이 표준은 통제를 **약화하지 않는다** — 브라우저 승인이 곧 명시적 동의 게이트.
- **승인 ≠ 지출/유출 게이트 우회**: `knowledge/canon/payment-safety.md`(돈 이동), `.claude/rules/lethal-trifecta.md`(secret 유출)는 별개로 계속 강제. 로그인 자동화가 결제·외부전송 자동승인이 되지 않는다.
- **자율(cron/무인) 모드**: 사람 부재 시 브라우저 승인 단계를 임의 통과 금지 — service token 으로 사전 권한이 있는 작업만.

## 관련

- `.claude/rules/agent-auth-flow.md` — 강제 행동 규칙 (이 canon 의 rule 표면)
- `.claude/rules/secrets-policy.md` · `knowledge/canon/secret-store.md` — athsra secret 표준
- `.claude/skills/secret/SKILL.md` — athsra CLI/MCP 운영
- `.claude/skills/sso-integrate/SKILL.md` — connect OIDC 통합
- `knowledge/canon/payment-safety.md`(자매) · `.claude/rules/lethal-trifecta.md` — 승인이 우회하지 못하는 게이트
