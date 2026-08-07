---
name: sso-integrate
description: Connect SDK SSO OIDC PKCE 연동·업그레이드. 현행 latest 는 ecosystem.json connectSdkLatest 가 SoT. 신규 연동, 버전 업그레이드(9.x major 포함), 콜백/JWT 문제 해결 시 사용
user-invocable: true
---

# /sso-integrate — Connect SDK SSO 연동

> **현행 latest = `@modfolio/connect-sdk` 10.5.0** (2026-08-07 실측 — npm
> `dist-tags.latest` = `10.5.0`, `ecosystem.json.connectSdkLatest` 와 일치).
> 🚨 **Nuxt 앱은 반드시 받을 것** — 10.2.0~10.4.0 이 CF Workers 에서 POST 본문을 못 읽어
> 백채널 로그아웃·FedCM 수신부가 «본문 없음» 으로 동작했고, 증상이 `400 missing_logout_token`
> 이라 **정상 거절과 문자 그대로 구분되지 않았다**.
>
> **10.x 안의 이동은 additive minor** — 이미 `^10` 인 앱은 `bun update` 로 온다.
> (10.1.0 신설분: `parseLoginBrandTokens()` · `isLoginBrandTokens()` ·
> `LOGIN_BRAND_WELL_KNOWN_PATH`.)
> 10.0.0 이 브랜드 스키마를 **게시된 적 없는 패키지**(`@modfolio/connect-contracts`,
> `private:true`)에서 import 하라고 안내해 실행 불가능했던 것을 고친 릴리스다.
>
> ⚠ **다만 `^9.x` 이하에 핀된 앱이라면 10.x 로 넘어가는 것 자체가 breaking major 다** —
> `bun update` 로는 안 오고 `bun add @modfolio/connect-sdk@^10` 을 **명시**해야 한다.
> 10.0.0 의 가시 변화 2건을 먼저 읽을 것: ① `/auth/login` 이 302 대신 **200 HTML**
> (첫 홉 로딩 화면 — 302 를 단언하는 통합 테스트·프록시 규칙이 있으면 깨진다.
> opt-out `interstitial: false`) ② **로그아웃이 기본 전역**(`end_session_endpoint` 까지
> 이어가 IdP 세션 종료 · 9.x 는 앱 쿠키만 지워 계정이 살아 있었다).
> 상세는 `ecosystem.json._connectSdkNote`. 직전 9.5.0 = Cross-App Access(ID-JAG), additive.
> 이 숫자의 SoT 는 `ecosystem.json` 의 `connectSdkLatest` 이고, 이 문서의 값이 그와
> 어긋나면 `bun run test:harness` 가 실패한다(`version-prose-drift.test.ts`).
> 권위 실측은 `curl https://registry.npmjs.org/@modfolio%2fconnect-sdk` → `.dist-tags.latest`.
> ⚠️ **`npm view`/`npm show` 는 `--registry=` 를 줘도 믿지 말 것** — scoped 패키지는
> `--registry` 플래그가 **무시**되고 `.npmrc` 의 `@modfolio:registry` 가 lookup 을 가져간다.
> 실측 2026-07-26: registry 3곳을 각각 지정한 `npm show` 가 전부 같은 레거시 값을 답했다.
> 진짜 값은 packument 를 **HTTP 로 직접** 받아 읽는다(위 curl).

> ⚠️ **9.0.0 은 breaking major 다** — `^8.x` 로 핀된 앱은 `bun update` 로 **넘어오지 않는다**.
> 넘어가려면 `bun add @modfolio/connect-sdk@^9` 를 명시해야 하고, 그 전에 아래
> **9.0.0 — 무엇이 깨지나** 를 읽는다. 거부된 입력이 있는 변경이라 무점검 승격은 금물.

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

## ⚠ 사용자 id 의 **형식을 가정하지 마라** — 특히 파티션 키로 쓸 때

`ConnectUser.id`(= JWT `sub`)는 **UUID 가 아니다.** Connect 프로덕션 실측(2026-08-04):
36자 UUID 와 **32자 Better Auth id 가 섞여 있고, 오너 계정이 32자 쪽**이다.

그래서 `contracts` 의 `user_id` 는 **의도적으로 `z.string()`** 이다(`.uuid()` 아님 —
`contracts/events/base.ts`). 이건 느슨한 게 아니라 **실물에 맞춘 것**이고, 반대로 조이면
정상 이벤트가 검증에서 탈락한다.

### 왜 이게 조용한 결함이 되나

⚠ **틀려도 로그인은 성공한다.** `clientId` 가 틀리면 즉시 드러나지만, 사용자 id 계열이
다르면 **로그인은 되고 그 사용자의 데이터만 비어 보인다.** 아무도 신고하지 않은 채로
오래 산다.

실제로 2026-08-04 에 한 앱이 자기 파티션 키를 UUID(`OWNER_USER_ID=7d9f6df6-…`)로 옮겨
놓고 붙이기 직전이었다. Connect DB 조회 결과 **그 id 는 0 rows** 였다 — 붙였으면 정확히
위 증상이 났다. **묻지 않고 문서를 읽었으면 «UUID» 라는 서술이 오답을 확인해 줬을 것이다.**

### 요구

- `id` 를 **불투명 문자열**로 다뤄라. 길이·형식·정규식으로 검증하지 마라
- DB 컬럼을 `uuid` 타입으로 잡지 마라 → `text`
- 기존 사용자 테이블과 **join/파티션 키로 엮기 전에**, 그 값이 같은 계열인지
  **Connect 에 물어서 확인**하라(형식이 같아 보이는 것은 근거가 아니다)

## ⚠ 백채널 로그아웃 — **핸들러를 정확히 mount 하고도 프레임워크가 먼저 막을 수 있다**

`backchannelLogoutHandler` 를 붙였는데 로그아웃이 전파되지 않으면, **핸들러가 아니라 그 앞
층을 먼저 의심한다.** Connect 는 OIDC Back-Channel Logout 1.0 대로 보낸다:

```
POST <backchannel_logout_uri>
Content-Type: application/x-www-form-urlencoded     ← form 계열
body: logout_token=<JWT>
                                                    ← Origin 헤더 없음 (서버-서버)
```

이 조합이 **프레임워크 내장 CSRF 보호와 정면으로 부딪힌다.** form content-type + Origin 부재는
많은 프레임워크가 «cross-site form POST» 로 분류하는 바로 그 모양이고, 그러면 요청은
**핸들러에 닿기도 전에** 거부된다 — SDK 의 `verifyLogoutToken` 도 실행되지 않는다.

### 판별 (처방보다 먼저 — 5줄이면 갈린다)

배포한 엔드포인트에 **두 형태**를 보내 보고 응답이 갈리는지 본다:

```sh
URL=https://<your-app>/auth/backchannel-logout

# A — Connect 가 실제로 보내는 형태
curl -s -o /dev/null -w "A %{http_code}\n" -X POST "$URL" \
  -H "Content-Type: application/x-www-form-urlencoded" --data "logout_token=garbage"

# D — Content-Type 없음 (CSRF 검사가 발동하지 않는 형태)
curl -s -o /dev/null -w "D %{http_code}\n" -X POST "$URL"
```

| A | D | 읽는 법 |
|---|---|---|
| 4xx(거부) | **2xx/400** | **A 만 막힌다 = 프레임워크 CSRF 층.** 핸들러는 정상이고 도달을 못 할 뿐 |
| 400 | 400 | 핸들러가 답하고 있다 — 배선은 정상(둘 다 무효 토큰이라 400 이 정답) |
| 404 | 404 | 라우트가 claim 되지 않았다(경로 문제이지 CSRF 아님) |

> ⚠ **D 만으로 «살아 있다» 를 판정하지 말 것.** D 는 CSRF 층을 통과시켜 본 적이 없어서
> **막혀 있어도 400 을 돌려준다.** 실측 사례: 한 앱이 D 로 400 을 확인하고 등록까지
> 마쳤는데, A 로 재니 **403 이었다**(2026-08-04, 허브 3-way 대조). 「프로브가 실물을
> 재현하는지부터 의심한다」 — `.claude/rules/agent-evidence.md`
>
> ⚠ **Origin 을 붙이는 것만으로는 안 열릴 수 있다** — 받는 쪽이 그 값을 신뢰 목록에
> 넣지 않으면 두 번째 조건에서 다시 걸린다(같은 날 실측: Origin 실어도 403).

### 등록 순서

Connect 계약이 *"엔드포인트를 띄운 뒤에만 등록하라"* 인데, 여기서 **«띄웠다» 의 증거는 A 다.**
D 로 확인하고 등록하면 fleet 전파가 100% 실패하면서 **조용히** 실패한다(발신 측은 대개
거절을 `warn` 한 줄로만 남기고 재시도하지 않는다).

### 수정 방향은 **각 앱이 정한다**

이 스킬은 처방하지 않는다. CSRF 경계는 앱 소유이고 프레임워크마다 노브가 다르며,
발신 측 변경이 필요한지는 Connect 소유다. 위 판별로 **어느 층에서 막히는지**까지만
확정하고, 그 뒤는 해당 repo 와 Connect 사이의 결정이다.

## 버전 이력

| 버전 | 성격 | 내용 |
|---|---|---|
| **9.3.0** | additive | webhook/URL 견고화 — `parseWebhookEvent` 런타임 shape 검증, 중복 `t`/`v1` 서명 헤더 fail-closed 거부, `connectUrl` 트레일링슬래시 정규화 |
| 9.2.0 | additive | OIDC **nonce 검증**(8 어댑터 전부) + `quickLogin` fast-path 를 Nuxt/Next/Hono/Qwik/SolidStart 로 이식 |
| 9.1.0 | additive | SolidStart `onRequest` 미들웨어 + Hono/Qwik/SolidStart 경로보호 옵션(`protectedPaths`/`publicPaths`/`allowAllLocked`) |
| **9.0.0** | **breaking** | 인증 가드 2건이 **기존 허용 입력을 거부**한다 (아래 상세) |
| 8.8.0 | additive | 실렌트 SSO 가 브랜디드 핸드오프로 이동 (아래 상세) |
| 8.7.0 | additive | `allowAllLocked` opt-out (warnRootProtectedPath 오탐), Forgejo dual-publish |
| 8.3.0~8.6.0 | additive | quick-login, `publicPaths`, `verifyToken` aud 검증, FedCM 전 어댑터 브리지 |
| 8.0.0 | **breaking** | `registerApp()` / `createClient()` 가 `redirectUris`(1–10) **필수** |
| 7.0.0 | additive | MCP agent (`/agent` export), `ConnectUser` +4 필드 |
| 5.0.0 | **breaking** | `tokens.token` 제거 → **`tokens.access_token`** |

## 9.0.0 — 무엇이 깨지나

두 가지 모두 **가드가 조용히 통과시키던 입력을 거부하는 방향**이다. 즉 업그레이드 후
"인증은 되는데 권한이 막힌다" 로 나타난다. 500 이 아니라 403 으로 보인다.

1. **`createPermissionGuard()` 에 빈 목록을 주면 전원 통과가 아니라 전원 거부다.**
   구버전은 빈 목록에 vacuous true 를 돌려줘 **아무 권한도 요구하지 않는 가드**가
   "모두 허용" 으로 동작했다. 9.0.0 은 deny 한다. 빈 목록을 실제로 넘기고 있었다면
   그건 보호되지 않던 라우트라는 뜻이므로, 우회하지 말고 필요한 권한을 명시한다.

2. **`requireOrg(minRole)` 에 미지의 role 을 주면 member 동급이 아니라 전 tier 미달이다.**
   구버전은 모르는 role 을 member 로 강등해 통과시켰다. 9.0.0 은 미달 처리한다.
   오타난 role 문자열이 여태 통과하고 있었을 수 있으니 철자를 먼저 확인한다.

**fleet 감사 결과(2026-07-21)**: 이 두 API 의 실사용 소비자는 **0개**였고, 변경된 API 를
실제로 쓰는 앱은 `modfolio` 하나(`verifyWebhookSignature`·`createSSFReceiver` — 둘 다 개선
방향)였다. 그래서 대부분의 앱에서 9.x 승격은 실질 무위험이지만, **위 두 API 를 쓰는지
grep 한 뒤** 올리는 것이 절차다.

```bash
rg -n "createPermissionGuard|requireOrg" src/ app/ 2>/dev/null || echo "미사용 — 9.x 승격 안전"
```

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
# ^8.x 에 핀돼 있으면 update 로는 9.x 가 오지 않는다 — major 는 명시 승격이다.
bun add @modfolio/connect-sdk@^9
# 이미 ^9.x 면 bun update 로 충분
bun update @modfolio/connect-sdk
# lockfile 이 9.3.0 으로 갱신됐는지 확인 후 커밋
```

실측으로 확인된 함정들이다. 해당하면 밟는다:

1. **워크스페이스 root 오염** — 모노레포 **루트에서** `bun update` 를 돌리면 루트
   `package.json` 의 deps 에 `@modfolio/connect-sdk` 가 **잘못 추가**된다(루트엔 `src/` 가
   없어 실제로 쓰지 않는 의존성). 2026-06 8.2.1 범프 때 15개 repo 가 이렇게 오염된 채
   커밋됐다. **처방**: 루트 항목 제거 → `bun install` 재조정 → **lockfile 만** 커밋.
   앱 워크스페이스의 선언은 그대로 두면 SemVer 가 해당 major 안에서 resolve 한다
   (`^9.x` → 9.4.0). `^8.x` 는 8 계열 최신에서 멈춘다 — 이게 major 의 정상 동작이다.

2. **exact pin 은 `bun update` 가 안 움직인다** — 선언이 `"8.7.0"`(캐럿 없음)이면
   `bun update` 는 **무동작**이다. `bun add @modfolio/connect-sdk@10.5.0` 으로 명시 지정.
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
9.1.0~9.3.0 은 additive 이고 8.8.0 의 사용자 체감(빈 스피너 소멸)까지 포함하므로,
다음에 이 repo 를 열 때 함께 처리하는 것을 권한다. 다만 **경유해야 하는 9.0.0 이
breaking** 이므로 위 grep 한 줄로 두 API 사용 여부를 확인한 뒤 올린다 —
미사용이면(대부분 그렇다) 승격은 lockfile 변경 하나로 끝난다.
