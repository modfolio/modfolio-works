---
name: sso-integrate
description: Connect SDK SSO OIDC PKCE 연동, JWT 검증, 콜백 설정 시 사용. 반드시 최신 SDK 문서 확인
user-invocable: true
---

# /sso-integrate — Connect SDK SSO 연동

## OIDC PKCE 플로우

1. 사용자 → 앱 `/login` → Connect `/authorize` 리다이렉트
2. Connect → 인증 후 → `callback?code=...` 반환
3. 앱 → `code` + `code_verifier` → Connect `/token` 교환
4. 앱 → JWT 수신 → 세션 생성

## 필수 환경 변수

| 변수 | 설명 |
|------|------|
| `CONNECT_CLIENT_ID` | Connect에서 발급받은 클라이언트 ID |
| `CONNECT_CLIENT_SECRET` | 클라이언트 시크릿 |
| `CONNECT_ISSUER_URL` | `https://connect.modfolio.io` |
| `CONNECT_REDIRECT_URI` | 앱의 콜백 URL |

## 통합 단계

1. 환경 변수 설정 (`.dev.vars` 또는 Doppler)
2. `/login` 라우트: authorization URL 생성 + PKCE challenge
3. `/callback` 라우트: code 교환 → JWT → 세션 쿠키
4. 미들웨어: JWT 검증 + 세션 갱신
5. `/logout`: 세션 삭제 + Connect `/end-session` 호출

## 주의사항

- JWT 검증 시 `iss`, `aud`, `exp` 3가지 필수 확인
- Refresh token rotation 활성화 권장
- DPoP 바인딩은 SDK v6+ 필수
- 프레임워크별 구현 차이는 canon/gotchas.md 참조
