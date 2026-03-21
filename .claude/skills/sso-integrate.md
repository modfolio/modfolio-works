---
description: Connect SDK SSO 연동 (OIDC PKCE)
effort: max
model: opus
---

# Skill: SSO 연동

modfolio-connect를 통한 SSO 인증 연동 가이드.

## SSO 아키텍처

- **엔드포인트**: `https://connect.modfolio.io`
- **프로토콜**: OIDC Authorization Code Flow + PKCE S256
- **구현**: SvelteKit 5 + Better Auth + D1 (v0.9.0)
- **구조**: Turborepo — landing(Astro) + auth(SvelteKit 5) + app(SvelteKit 5) + packages/core

## OIDC 플로우

```
앱 → GET /sso/authorize?client_id=...&code_challenge=...&redirect_uri=...&scope=openid+profile+email
connect → 로그인 UI → 인증 처리
connect → redirect_uri?code=...
앱 → POST /sso/token (code + code_verifier)
connect → { access_token, id_token, refresh_token, token_type, expires_in }
앱 → JWT로 세션 생성
```

## 주요 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /health` | `{ status: 'ok', version: '...' }` |
| `GET /sso/authorize` | OIDC Authorization 시작 (PKCE S256) |
| `POST /sso/token` | Authorization Code -> JWT 교환 (+ refresh_token) |
| `POST /sso/verify` | JWT 서명 검증 |
| `POST /sso/introspect` | 토큰 인트로스펙션 (RFC 7662) |
| `POST /sso/revoke` | 토큰 폐기 (RFC 7009) |
| `POST /sso/consent` | OIDC 사용자 동의 처리 |
| `GET /sso/userinfo` | JWT로 사용자 정보 조회 |
| `GET /.well-known/openid-configuration` | OIDC Discovery |
| `GET /.well-known/jwks.json` | 공개키 (JWK Set) |
| `POST /logout` | 로그아웃 (+ Back-Channel Logout) |

## 앱별 client_id

| 앱 | client_id |
|----|-----------|
| naviaca | `naviaca` |
| gistcore | `gistcore` |
| fortiscribe | `fortiscribe` |
| keepnbuild | `keepnbuild` |
| worthee | `worthee` |
| amberstella | `amberstella` |
| sincheong | `sincheong` |
| munseo | `munseo` |
| umbracast | `umbracast` |
| modfolio | `modfolio` |
| modfolio-admin | `modfolio-admin` |
| modfolio-dev | `modfolio-dev` |
| modfolio-on | `modfolio-on` |
| modfolio-press | `modfolio-press` |
| modfolio-pay | `modfolio-pay` |
| modfolio-studio | `modfolio-studio` |
| modfolio-ls | `modfolio-ls` |
| modfolio-works | `modfolio-works` |
| modfolio-axiom | `modfolio-axiom` |
| universe-dashboard | `universe-dashboard` |
| dledesk | `dledesk` (confidential) |

## JWT 클레임 (`@modfolio/contracts` sso/)

```typescript
{
  iss: 'https://connect.modfolio.io',
  sub: string,   // user_id (UUID)
  aud: string,   // client_id
  exp: number,
  iat: number,
  user_id: string,
  email: string,
  roles: string[],
  connected_apps: string[]
}
```

## 인증 방법

- **비밀번호** (기본)
- **Kakao OAuth** (소셜 로그인)
- **Magic Link** (이메일 인증, Resend)
- **Passkey/WebAuthn** (FIDO2)
- **TOTP 2FA** (Google Authenticator 등)

## 토큰 수명

- access_token: 15분
- refresh_token: 90일

## 연동 체크리스트

1. `client_id`를 `{repo-name}` 형식으로 정한다
2. PKCE S256 code_verifier/code_challenge 생성
3. `/sso/authorize`로 리다이렉트
4. 콜백에서 `code`를 받아 `/sso/token`으로 POST
5. 응답의 access_token + refresh_token으로 세션 관리
6. 보호된 라우트에 미들웨어로 토큰 검증 추가
7. 로그아웃 시 `/logout` 호출

## 외부 OAuth 패턴 (DLE-Desk 레퍼런스)

```typescript
// Better Auth genericOAuth 사용
import { betterAuth } from 'better-auth'

const auth = betterAuth({
  socialProviders: {
    modfolio: {
      type: 'oidc',
      discoveryUrl: 'https://connect.modfolio.io/.well-known/openid-configuration',
      clientId: '{your-client-id}',
      // confidential client인 경우:
      clientSecret: '{your-client-secret}',
    }
  }
})

// 클라이언트 사이드
authClient.signIn.social({ provider: 'modfolio' })
```

## 시크릿

| 키 | 설명 |
|----|------|
| `BETTER_AUTH_SECRET` | Better Auth 서명 키 |
| `SSO_PRIVATE_KEY_JWK` | JWT 서명용 EC P-256 개인키 |
| `DLEDESK_CLIENT_SECRET` | DLE-Desk confidential client |
| `CONNECT_CLIENT_SECRET` | Connect Dashboard confidential client |
| `KAKAO_CLIENT_ID/SECRET` | Kakao OAuth |
| `RESEND_API_KEY` | Magic Link 이메일 발송 |
