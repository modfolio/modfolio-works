---
title: Agent Auth Flow — 에이전트가 시작하고 사람은 브라우저 승인만
applicability: 로그인·인증·토큰 만료를 만났을 때 · 「터미널에서 하세요」라고 말하려 할 때
consumers: [all-agents]
related_canon: [agent-auth-ux, secret-store]
# `paths:` 없음 = 의도. 상시 주입 6편이며 frontmatter 는 Codex 색인용이라 주입을 바꾸지 않는다.
---

# Agent Auth Flow — 에이전트가 직접 시작하는 브라우저 인증 (터미널 떠넘기기 금지)

사용자에게 "터미널에서 `athsra login` 하고 끝나면 알려주세요" 식으로 인증을 **떠넘기지 않는다**. 권한·계정(나/admin)이 있으면 **에이전트가 인증 플로우를 직접 실행**하고, 사람은 **브라우저에서 승인(authorize/authenticate)만** 한다. 이것이 modfolio universe 의 기본 인증 동작이다.

## 기본 동작 (MUST)

서비스 연결/로그인/인증이 필요하면:

1. **에이전트가 인증을 직접 시작한다.** 터미널 명령을 사용자에게 떠넘기지 않는다. "저는 못 합니다" 로 끝내지 않는다.
2. **브라우저 기반·에이전트-시작 가능 플로우**를 쓴다 — OAuth 2.0 Device Grant(RFC 8628) / loopback OAuth / OIDC PKCE. 에이전트가 명령(MCP 도구 또는 CLI)을 실행하면 브라우저가 뜬다.
3. 사용자에게 주는 건 **브라우저 단계뿐**: "로그인 시작했어요 — 이 URL 에서 승인하세요: `<url>` (코드 `<user_code>`). 승인하면 이어서 진행합니다." 그 후 status 를 **approved/denied/expired 까지** poll(athsra `expires_in`≈15분, `retry_after_seconds`≈5s 준수). **~45s(≈9폴) give-up 금지** — 오너 브라우저 승인은 수 분 걸릴 수 있고, 조기 포기가 "재발급 필요"의 근본이다(canon `agent-auth-ux.md` §폴링 지속성). ⚠ 단 **턴마다 조회하지 않는다**(2026-09-23 실측: 한 세션에서 `athsra_login_status` 129턴 — 턴마다 컨텍스트 전체를 다시 읽었다). CLI `athsra login --device`(쓰기면 `--write`)를 `run_in_background` 로 **한 번** 띄워 완료 알림을 받는 것이 기본이고, 폴링은 그 명령 안에서 돈다(`context-residency.md` 규칙 5).
4. 사용자는 **터미널에 아무것도 입력하지 않는다.** 비밀(master pw / device_code / token)은 **에이전트·채팅·로그를 거치지 않는다** — 브라우저 안에서만.

## 서비스별 (universe) — 에이전트가 실행 / 사람은 승인만

| 서비스 | 에이전트가 직접 실행 | 사람은 |
|---|---|---|
| **athsra** (secret) | MCP `athsra_login_start` → `athsra_login_status` poll. CLI 폴백 `athsra login --device` (RFC 8628). 평문 `athsra login` 도 OIDC PKCE 브라우저 | 브라우저에서 로그인 + master pw 승인 (브라우저 밖으로 안 나감) + fingerprint 확인 |
| **modfolio connect** (SSO/OIDC) | OIDC PKCE — `/authorize` URL 브라우저 오픈 (loopback callback) | connect 로그인 + authorize |
| **Cloudflare** | `wrangler login` (loopback OAuth, 브라우저 자동) | CF consent |
| **GitHub** | `gh auth login --web` (device) — 또는 athsra 주입 `GITHUB_TOKEN` 우선 | device 코드 승인 |
| **MCP 커넥터** (claude.ai Figma/Slack/CF/…) | 커넥터 `*__authenticate` 호출 → URL 제시 → `*__complete_authentication` | 커넥터 OAuth 승인 |

## 인증 후 — 직접 조작 (MUST)

로그인은 시작일 뿐. **인증되면 서비스 운영도 에이전트가 직접** 한다 — 대시보드 클릭·터미널 명령을 사용자에게 떠넘기지 않는다.

- 세션 내 = **`athsra_run` MCP** (`athsra_run(project, command, args, return_output)`) — envelope secret 을 주입해 명령 실행, 값은 응답에서 scrub. 등가 CLI = `athsra run <project> -- <cmd>`.
- 배포·REST API·DB 쿼리·설정·도메인·DNS 등 **API 가 있으면 직접**. CF 레퍼런스 = `knowledge/canon/cf-api-mastery.md` (2026-06-14 전 영역 재검증).
- "API 가 있는데 못 한다 / 대시보드에서 하라"는 거의 항상 hallucination — 레퍼런스·게이트 먼저 (`cf-api-mastery.md` § 7).
- **게이트 유지**: 돈 이동 `payment-safety.md`, 파괴적 작업 사전확인, sibling repo **코드** 수정 Hub-not-enforcer. 직접 조작이 이것들을 우회하지 않는다.

## ⚠ 브라우저 플로우를 열기 **전에** — 내가 이미 가진 자격증명으로 되는지 먼저 잰다 (2026-09-15 신설)

**층이 셋이다.** 위에서부터 잡으면 사람을 세워 두게 된다:

| 층 | 무엇 | 사람이 필요한가 |
|---|---|---|
| ① 서비스 토큰 | `ATHSRA_TOKEN=$(cat ~/.athsra/remote-tokens/<project>) athsra run <project> -- <cmd>` | **아니오** |
| ② 세션 env | 이미 주입돼 있으면 `process.env.<KEY>` | **아니오** |
| ③ device-write 로그인 | `athsra login --device --write` — 브라우저 승인 | **예** |

실측(2026-09-15): 허브가 CF 토큰 권한을 확인하려고 ③을 열었고, 오너가 폰에서 열자
**Google SSO 가 500** 을 냈다(athsra 는 302 정상 — 끊긴 곳은 그 뒤 홉이다). device 코드가
**75분간 네 번 갱신되고 만료**된 뒤에야 ①로 같은 일이 **전부** 됐다는 것을 확인했다
(`CF 토큰 주입됨: true · ALL_API: true` · `/user/tokens` 조회 성공 · `ai/models/search` 200).

→ ③은 **쓰기(`set`/`unset`)에만** 필요하다. 읽기·주입은 ①로 끝난다.
→ **사람을 기다리게 하기 전에 ①②를 먼저 시도하고, 그 결과를 인용한 뒤에만 ③을 연다.**
→ ⚠ 그리고 ③이 막히면 **그것이 우리 문제가 아닐 수 있다** — 우리 서비스의 헬스와
  그 뒤 신원 제공자를 **따로** 재라. 「로그인이 안 된다」와 「우리가 죽었다」는 다른 문장이다.

## 금지 (anti-pattern — 사용자 피드백 2026-06-14 의 정확한 마찰)

- ❌ "저는 로그인 못 해요. 터미널에서 `athsra login` 실행하고 끝나면 알려주세요." — **브라우저/MCP 플로우가 있는데 떠넘김**. 가장 흔한 위반.
- ❌ "그건 대시보드에서 직접 하셔야 해요" — **API/CLI 가 있는데 떠넘김** (CF·connect·pay 등 거의 다 API 있음).
- ❌ `device_code` / master pw / token 을 채팅·로그·도구 응답에 노출
- ❌ 에이전트가 master password 를 직접 입력받아 보관 — master pw 는 **브라우저에서만**
- ❌ 인증/작업 실패 시 즉시 포기 — 위 플로우·레퍼런스를 **먼저 시도**
- ❌ **device-login 승인을 ~45s(≈9폴) 만에 give-up** — 조기 포기가 관측된 "재발급 필요"의 근본(athsra 2026-07-04 root-cause). `expires_in`(≈15분) approved/denied/expired 까지 폴링한다.
- ❌ **device-login 진행 중 MCP 서버 프로세스 teardown** — `device_code` 는 메모리-전용·의도적 미저장(no-persistence 보안)이라 flow 유실 → 새 코드 발급. 세션을 유지한다(또는 flow-resume).

## 브라우저/device 플로우가 정말 없을 때

그 사실을 **명시**하고, "터미널 수동 인증"을 정상으로 normalize 하지 않는다. device/loopback 플로우 추가를 **정공법 과제로 띄운다** (canon `agent-auth-ux.md` 마이그레이션 경로). 무인 환경(headless/CI)은 service token(예 `ATHSRA_TOKEN=ats_…` / `GITHUB_TOKEN`)을 athsra·env 로 주입.

## 보안 정합 (이 방식이 더 안전)

사람의 **브라우저 승인(human-in-the-loop)은 그대로 유지**되고, 비밀은 에이전트를 거치지 않는다 → 마찰만 제거, 통제는 보존. 단 **승인 ≠ 게이트 우회**:

- 돈 이동은 무조건 `knowledge/canon/payment-safety.md` 의 `pre-payment-guard` 가 별도로 계속 적용 (로그인 자동화가 지출 자동승인이 되지 않는다).
- secret/private 데이터 유출 면은 `.claude/rules/lethal-trifecta.md` 가 계속 적용.
- 자율(cron/무인) 모드에서 사람 부재 시 승인 단계를 임의 통과시키지 않는다.

## 근거

athsra 는 이미 이 모델의 레퍼런스 구현체다 (device grant + `athsra_login_start` "터미널 불필요" + master pw 브라우저 밖 미노출 + fingerprint phishing guard + `device_code` 무노출). 능력은 전부 있고 빠진 건 "에이전트가 이를 **기본**으로 쓰라"는 지침뿐이었다. 표준·서비스별 상세·마이그레이션은 canon `knowledge/canon/agent-auth-ux.md`.
