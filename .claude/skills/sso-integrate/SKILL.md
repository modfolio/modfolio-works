---
name: sso-integrate
description: Connect SDK SSO OIDC PKCE 연동·업그레이드. 현행 latest = 8.8.0. 신규 연동, 버전 업그레이드, 콜백/JWT 문제 해결 시 사용
user-invocable: true
---

# /sso-integrate — Connect SDK SSO 연동

> **현행 latest = `@modfolio/connect-sdk` 8.8.0** (2026-07-19, npmjs + Forgejo 양쪽 게시).
> 권위 실측은 `curl https://registry.npmjs.org/@modfolio/connect-sdk` → `.dist-tags.latest`.
> ⚠️ **`npm view @modfolio/connect-sdk version` 은 믿지 말 것** — `~/.npmrc` 의
> `@modfolio:registry` 오버라이드가 scoped lookup 을 가로채 **동결된 레거시 미러 값**을 답한다.

## 설치 — 토큰 불필요

```bash
bun add @modfolio/connect-sdk
```

public npm 패키지다. `.npmrc` 도, GitHub Packages 토큰도, `NPM_TOKEN` 도 **필요 없다**.

## 어댑터

프레임워크별 어댑터가 `loginHandler` / `callbackHandler` / `logoutHandler` / `verifySession` /
미들웨어를 전부 제공한다. 직접 PKCE 를 손으로 구현하지 말 것.

| 프레임워크 | import | 함수 |
|---|---|---|
| SvelteKit | `@modfolio/connect-sdk/sveltekit` | `createSvelteKitAuth` |
| Astro | `@modfolio/connect-sdk/astro` | `createAstroAuth` |
| Next.js | `@modfolio/connect-sdk/nextjs` | `createNextAuth` (App + Pages Router) |
| Nuxt | `@modfolio/connect-sdk/nuxt` | `createNuxtAuth` |
| SolidStart | `@modfolio/connect-sdk/solidstart` | `createSolidStartAuth` |
| Qwik | `@modfolio/connect-sdk/qwik` | `createQwikAuth` |
| Hono (CF Workers) | `@modfolio/connect-sdk/hono` | `createHonoAuth` |

부가 export: `/ssf` (CAEP 이벤트 수신) · `/dpop` · `/fedcm` · `/agent` (MCP delegation) ·
`/management` + `/management-client` (PAT 로 앱 등록).

## 기본 배선 (SvelteKit 예시 — 타 프레임워크도 형태 동일)

```ts
// src/lib/server/auth.ts
import { createSvelteKitAuth } from "@modfolio/connect-sdk/sveltekit";
export const auth = createSvelteKitAuth({ clientId: "<이-앱의-client-id>" });

// src/hooks.server.ts
export const handle = auth.handle;   // 세션 검증 + silent refresh + cross-app SSO

// src/routes/auth/{login,callback,logout}/+server.ts
export const GET = auth.loginHandler;      // / callbackHandler / logoutHandler
```

`clientId` 는 **Connect 가 정본**이다. 값이 확실치 않으면 추측하지 말고 Connect 의
client 레지스트리를 확인할 것 — 잘못된 clientId 는 Connect 에서 먼저 고치고 앱이 뒤따른다.

## 버전 이력

| 버전 | 성격 | 내용 |
|---|---|---|
| **8.8.0** | additive | **실렌트 SSO 가 브랜디드 핸드오프로 이동** (아래 상세) |
| 8.7.0 | additive | `allowAllLocked` opt-out (warnRootProtectedPath 오탐), Forgejo dual-publish |
| 8.3.0~8.6.0 | additive | quick-login, `publicPaths`, `verifyToken` aud 검증, FedCM 전 어댑터 브리지 |
| 8.0.0 | **breaking** | `registerApp()` / `createClient()` 가 `redirectUris`(1–10) **필수** |
| 7.0.0 | additive | MCP agent (`/agent` export), `ConnectUser` +4 필드 |
| 5.0.0 | **breaking** | `tokens.token` 제거 → **`tokens.access_token`** |

## 8.8.0 — 무엇이 바뀌었나

**증상 해결**: 이미 로그인된 사용자가 앱에 진입할 때 **빈 302 홉이 3~4번 연속**되며
브라우저 스피너만 돌던 구간이 있었다. 실렌트 SSO(`prompt=none`)가 HTML 을 전혀 렌더하지
않는 경로라 "인증이 뒤에서 도는데 화면은 멈춘 듯" 보였다.

**변경**: `prompt=none` 의 목적지가 `/sso/authorize` → **`/{clientId}/handoff`** 로 이동했다.
세션이 있으면 브랜디드 핸드오프 인터스티셜(앱 이름·브랜드 컬러·진행 표시)을 짧게 보여준 뒤
자동 진입한다. 세션이 없으면 신규 `fallback` 파라미터가 갈린다 —
`fallback=login` → 브랜디드 로그인 폼 / `fallback=return` → 콜백에 `login_required` 반환.

**호환성**: **additive, breaking 0.** 앱 코드 변경 불필요 — 어댑터가 알아서 배선한다.
`/sso/authorize?prompt=none` 스펙 표면은 **무변경**이라 외부 OIDC 소비자도 영향 없다.
미채택 앱은 구 경로(무UI 실렌트)로 계속 정상 동작하므로 **점진 전환이 안전**하다.

## 업그레이드 — `bun update` 하나면 끝, 단 함정 4종

```bash
bun update @modfolio/connect-sdk
# lockfile 이 8.8.0 으로 갱신됐는지 확인 후 커밋
```

실측으로 확인된 함정들이다. 해당하면 밟는다:

1. **워크스페이스 root 오염** — 모노레포 **루트에서** `bun update` 를 돌리면 루트
   `package.json` 의 deps 에 `@modfolio/connect-sdk` 가 **잘못 추가**된다(루트엔 `src/` 가
   없어 실제로 쓰지 않는 의존성). 2026-06 8.2.1 범프 때 15개 repo 가 이렇게 오염된 채
   커밋됐다. **처방**: 루트 항목 제거 → `bun install` 재조정 → **lockfile 만** 커밋.
   앱 워크스페이스의 선언(`^8.x`)은 그대로 두면 SemVer 가 8.8.0 으로 resolve 한다.

2. **exact pin 은 `bun update` 가 안 움직인다** — 선언이 `"8.7.0"`(캐럿 없음)이면
   `bun update` 는 **무동작**이다. `bun add @modfolio/connect-sdk@8.8.0` 으로 명시 지정.
   (핀이 그 repo 의 의도된 하우스 스타일이면 **핀을 유지**한 채 값만 올릴 것.)

3. **install root 가 워크스페이스와 다를 수 있다** — 루트 `package.json` 에 `workspaces`
   가 없으면 하위 디렉터리가 **독립 install root** 다(예: `portal/`). 그 디렉터리 안에서
   실행해야 하며, 루트에서 돌리면 조용히 아무 일도 일어나지 않는다.

4. **`.npmrc` 의 `always-auth=true` 는 CI 를 죽인다** — `@modfolio` 스코프는
   `pkg.modfolio.io`(Forgejo) **익명 read** 라 토큰이 필요 없다. `always-auth` 나
   `npm.pkg.github.com` 토큰 라인이 남아 있으면 **인증 없는 CF Workers Builds 설치가
   실패**한다(2026-07-19 CI 전면 정지의 원인 패턴). 발견하면 제거한다.

## 검증

업그레이드 후 앱 코드를 바꿀 필요는 없지만, 실렌트 경로가 살아 있는지는 확인할 수 있다.
익명으로 확인 가능하다 — 세션도 시크릿도 불필요:

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  "https://login.modfolio.io/<clientId>/handoff?redirect_uri=<앱의-등록된-콜백>\
&state=t&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM\
&code_challenge_method=S256&scope=openid&fallback=return"
# 기대: 302 → <콜백>?error=login_required&state=t
```

**400 이 나오면** 그 `redirect_uri` 가 이 `client_id` 에 등록되어 있지 않다는 뜻이다
(핸드오프 라우트는 세션 분기 **전에** redirect_uri 를 검증한다). Connect 쪽 시드를
고쳐야 하는 사안이므로 앱에서 우회하지 말고 Connect 에 알릴 것.

## 주의사항

- JWT 검증은 `iss` / `aud` / `exp` 3종 필수 — 어댑터의 `verifySession` 이 이미 수행한다.
- **DPoP 는 선택**이다(`/dpop` export). 과거 이 문서가 "v6+ 필수" 라고 적었던 것은 오류.
- 시크릿은 **athsra** 로 관리한다(`athsra run <repo> -- <cmd>`). Doppler·dotenvx 는 폐기됨.
  빈 `.env` 는 정상이다 — athsra 는 런타임 주입이라 디스크에 남기지 않는다.
- 프레임워크별 구현 차이는 `knowledge/canon/gotchas.md` 참조.

## 업그레이드 여부와 시점

**Evergreen Principle 은 권고이지 강제가 아니다.** 이 앱의 owner 가 자율 결정한다.
다만 8.8.0 은 additive(breaking 0)이고 사용자 체감(빈 스피너 소멸)에 직접 닿으므로
다음에 이 repo 를 열 때 함께 처리하는 것을 권한다.
