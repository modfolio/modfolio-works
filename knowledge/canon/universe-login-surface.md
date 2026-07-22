---
title: Universe Login Surface — 모든 로그인은 Connect 를 가시적으로 경유한다
version: 1.0.0
last_updated: 2026-07-19
source: [오너 확정 2026-07-19 (빈 302 홉 실보고 → 가시적 핸드오프 정책), modfolio-connect SDK 8.8.0 + /{clientId}/handoff 구현, fleet 감사 실측 (23 SDK 소비앱 정상 + athsra·dle-desk 직행), 36 클라이언트 전수 핸드오프 스윕]
sync_to_siblings: true
applicability: always
consumers: [sso-integrate, connect, athsra, dle-desk, preflight]
related_canon: [evergreen-principle, agent-auth-ux]
---

# Universe Login Surface

## 정책 (오너 확정 2026-07-19)

**유니버스의 모든 로그인은 Connect 의 auth 표면을 *가시적으로* 경유한다.**
이미 인증돼 있으면 브랜디드 핸드오프 화면을 짧게 보인 뒤 앱으로 자동 진입한다 —
"보이면서 즉시".

## 왜

오너 실보고: 이미 로그인된 상태로 앱에 진입하면 **빈 302 홉이 3~4연속**(앱 → Connect →
앱 → 앱, 3개 오리진) 이어지고 브라우저 스피너만 돌았다. 원인은 실렌트 SSO 경로
(`/sso/authorize?prompt=none`)가 **HTML 을 한 프레임도 렌더하지 않는다**는 것.
인증은 뒤에서 도는데 화면은 멈춘 듯 보인다.

핵심 판단: 침묵이 문제이지 자동 통과가 문제가 아니다. **클릭 관문을 추가하는 게 아니라
진행 상태를 보이게** 하는 것이 해법이다. 승인이 이미 끝난 사용자에게 버튼을 다시
누르게 하는 건 마찰일 뿐이고, 보안은 코드 발급 단계의 step-up 게이트가 담당한다.

## 두 표면의 구분 (혼동 주의)

| 경로 | 성격 | 렌더 | 용도 |
|---|---|---|---|
| `/{clientId}` | **브랜디드 페이지** | HTML | 앱 로그인 진입점 — **여기를 써야 한다** |
| `/{clientId}/handoff` | **브랜디드 인터스티셜** | HTML(세션 有) / 302(세션 無) | SDK 실렌트 SSO 목적지 |
| `/sso/authorize` | **OIDC 스펙 엔드포인트** | 순수 302 | 외부 OIDC 소비자 전용 — 앱이 직접 겨냥하면 화면이 안 보인다 |

`/sso/authorize` 의 스펙 표면은 **변경하지 않는다**. 외부 OIDC 소비자(athsra-cli 등)와
prompt-conformance 계약을 보존해야 하기 때문이다. 정책은 "그 엔드포인트를 없앤다"가
아니라 "**앱은 그것을 직접 겨냥하지 않는다**"이다.

## 준수 방법

**SDK 소비 앱 (23개)** — `@modfolio/connect-sdk` **8.8.0+** 로 올리면 끝이다.
어댑터가 실렌트 목적지를 `/{clientId}/handoff` 로 알아서 배선한다. **additive, breaking 0** —
앱 코드 변경 불필요. 절차와 채택 함정은 `.claude/skills/sso-integrate/SKILL.md` 참조.

**SDK 미사용 앱** — authorize 목적지를 `/sso/authorize` 대신 **`/{clientId}`** 로 지정한다.
표준 OIDC 파라미터를 그대로 받으므로 콜백 계약은 무변경이다.
- hand-rolled PKCE: 리다이렉트 URL 조립부의 경로만 교체
- Better Auth `genericOAuth`: `authorizationUrl: 'https://login.modfolio.io/{clientId}'`
  추가 (**`discoveryUrl` 은 유지** — token/userinfo 는 계속 discovery 를 쓴다)

## 검증 (익명 — 세션도 시크릿도 불필요)

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  "https://login.modfolio.io/<clientId>/handoff?redirect_uri=<등록된-콜백>&state=t\
&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM\
&code_challenge_method=S256&scope=openid&fallback=return"
# 기대: 302 → <콜백>?error=login_required&state=t
```

`400` = 그 `redirect_uri` 가 해당 `client_id` 에 미등록(핸드오프는 세션 분기 **전에**
redirect_uri 를 검증한다). 앱에서 우회하지 말고 Connect 시드를 고칠 것 — **Connect 가
OIDC 권위 소스**다.

fleet 전수 점검은 connect repo 에서 `bun run handoff:sweep`.

## 예외 (2026-07-19 현재)

| 앱 | 사유 | 상태 |
|---|---|---|
| **muje** | 실험 스케치 도메인 — 로그인 정책 적용 보류 | 이번 사이클 제외, 문서화만 |
| **pdgd `disac-ops` PIN 서브포털** | 계정 없는 외부 운영요원용 PIN 게이트 | **by-design 예외 유지** |

## 강제하지 않는다

이 canon 은 `evergreen-principle` 을 따른다 — **권고이지 강제가 아니다.** 각 앱 owner 가
자신의 repo 를 열 때 자율적으로 채택한다. hub 는 기록하고 알릴 뿐, 다른 repo 를 직접
수정하지 않는다.
