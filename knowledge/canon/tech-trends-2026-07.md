---
title: Tech Trends 2026-07 — Adopt/Trial/Watch/Hold
version: 1.1.0
last_updated: 2026-07-31
source: [2026-07-30 harness 3.45.0 세션 — 레지스트리 실측 + 웹 리서치 (TypeScript 7 GA, MCP 2026-07-28 스펙, Cloudflare 7월 릴리즈, Astro 7)]
sync_to_siblings: true
applicability: always
consumers: [harness-evolve, preflight, modfolio, ts7-readiness]
---

# Tech Trends 2026-07

> 월별 trend SSoT. 권고 — 채택·시기 각 repo 자율 (Hub-not-enforcer).
> 이번 달의 핵심은 **채택이 아니라 보류**다: 메이저 하나가 GA 인데 그걸 쓰는 도구 생태계가
> 아직 못 따라왔고, 그 사실을 각 repo 가 `bun update --latest` 로 발견하면 typecheck 가 전멸한다.

| 트렌드 | 분류 | 한 줄 | 이번 release 반영 |
|------|------|-------|------|
| **TypeScript 7.0** (Go 네이티브) | **Hold** | GA 지만 컴파일러 API 부재로 `*-check` 계열 전멸. 7.1(≈10월) 대기 | ✅ `bun run ts7:ready` 프로브 |
| **Cross-App Access (ID-JAG)** | **Adopt** | 앱→앱 API 접근 표준. 업그레이드로는 능력 0 — 정책이 있어야 발급 | connect-sdk 9.5.0 라이브 |
| **MCP 스펙 2026-07-28** (스테이트리스 코어) | Watch | TS SDK v2 가 beta. v1.x 는 6개월+ 지원 | 허브는 `@modelcontextprotocol/sdk` v1 유지 |
| **CF KV 레거시 API 폐지 (2026-10-15)** | **Adopt** | 날짜가 박힌 폐지 — 쓰는 곳은 그 전에 이전 | 공지 (fleet advisory) |
| **CF Workers Cache** (엔트리포인트 앞단 계층 캐시) | Trial | HTTP 헤더로 설정, 지역 계층. 재검증 비용↓ | 방향 기록 |
| **`@cloudflare/workers-types` v5** | Watch | latest 런타임 타입만 노출, 불안정 API 는 별도 entrypoint | 각 repo 판단 |
| **Astro 7.x** (Vite 8 + Rolldown) | **Adopt** | 빌드 15–61%↑. 어댑터는 Workers 기본 | 대시보드 7.1.6 / adapter 14.1.7 |

---

## TypeScript 7.0 — **Hold** (이번 달의 본론)

`typescript@7.0.2` 가 **2026-07-08 GA** 다. 8–12배 빠른 타입체크가 사실이고 유혹적이다.
그런데 Go 네이티브 포트로 옮기면서 **JS 컴파일러 API 가 루트 export 에서 사라졌다.**

실측 (2026-07-30, `bun run ts7:ready`):

```
typescript latest = 7.0.2
  exports["."] = "./lib/version.cjs"        ← 버전 문자열 하나뿐
  (나머지는 ./unstable/{sync,async,fs,ast,proto,…})
```

`import ts from "typescript"` 로 LanguageService·createProgram·AST factory 를 쓰던 도구가
전부 동작 불가다. 그리고 **그 도구가 이 universe 의 `typecheck` 그 자체다:**

| 도구 | 역할 | latest (2026-07-30) | TS peer |
|---|---|---|---|
| `@astrojs/check` | Astro 앱의 typecheck | 0.9.10 (07-27 published) | `^5.0.0 \|\| ^6.0.0` |
| `svelte-check` | SvelteKit 앱의 typecheck | 4.7.4 (07-27 published) | `^5.0.0 \|\| ^6.0.0` |
| `@sveltejs/kit` | 앱 프레임워크 | 2.70.2 | `^5.3.3 \|\| ^6.0.0` |
| `openapi-typescript` | SDK 타입 생성 | 7.13.0 | `^5.x` |
| `knip` | 릴리즈 게이트 | 6.29.0 | peer 미선언 — 컴파일러 API 직접 사용 |

**07-27 에 published 된 최신본조차 TS7 을 안 받는다** — 게을러서가 아니라 받을 API 가
없어서다. TypeScript 팀은 프로그램적 API 를 **7.1**(예상 ≈2026-10)로 예고했다.

### 처방

1. **`typescript@6.x` 를 유지한다.** 루트만 7 로 올리는 것도 하지 않는다 — 한 워크스페이스에
   메이저 2개는 modfolio-pay 가 실측 후 금지 범주로 판정했고 허브도 같은 결론이다.
2. **`bun run ts7:ready` 로 판정한다.** 추측·달력이 아니라 레지스트리 실시간 조회다.
   종료 코드가 세 상태를 분리한다 — `0` 판정 성공(READY/NOT-READY) · `1` 위반(차단이
   남았는데 이미 TS7 을 선언) · `2` **판정 불능**(조회 실패·peer 해독 불가).
3. **우회 금지**: typecheck 스킵 · `@ts-ignore` · 도구별 예외 — 전부 정공법 위반이다.
   기다리는 것이 조치다.

### ⚠ 이 프로브를 베끼는 sibling 이 반드시 알아야 할 것

`Bun.semver.satisfies('7.0.2', 'not-a-range')` 는 **`true`** 를 돌려준다(실측 2026-07-30).
해독 불가한 peer range 가 조용히 "TS7 허용" 이 되어 **판정 불능이 통과로 환원**된다.
`satisfies` 를 부르기 **전에** range 문법을 직접 검증하라. 프로브의 테스트가 이 한 줄을
양성 대조로 잠가 두었다.

그리고 `knip` 처럼 **peer 를 애초에 선언하지 않는 도구를 verdict 에 넣지 마라** — 넣으면
프로브가 영원히 `판정 불능`으로 굳어 "영영 green 이 안 되는 게이트" 가 된다. 보고는 하되
게이트하지 않는 `manual` 부류로 분리한다.

출처: [TypeScript 7.0 GA](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) ·
[TS7 not for Vue/Svelte yet](https://www.techtimes.com/articles/320049/20260710/typescript-7-now-stable-10-faster-builds-not-vue-svelte-yet.htm) ·
[withastro/roadmap #1321 tsgo 호환 추적](https://github.com/withastro/roadmap/discussions/1321) ·
원 발견·프로브 저작 = modfolio-pay 인바운드 2026-07-26.

---

## Cross-App Access (ID-JAG) — **Adopt (능력은 정책으로만 열린다)**

`@modfolio/connect-sdk` **9.5.0** 부터 Connect 가 **ID-JAG**(identity assertion authorization
grant)를 발급한다. 한 앱이 사용자를 대신해 **다른 앱의 API** 에 닿는 표준 경로다.
표준: IETF `draft-ietf-oauth-identity-assertion-authz-grant-04`(2026-05-21) —
2026-06-18 MCP enterprise-managed authorization 과 함께 Claude·VS Code 에 실제 탑재된 흐름.

라이브 확인 (`login.modfolio.io/.well-known/oauth-authorization-server`):
`identity_chaining_requested_token_types_supported: ["urn:ietf:params:oauth:token-type:id-jag"]`.

### ⚠ 업그레이드만으로는 아무 능력도 얻지 않는다

9.5.0 은 minor 라 `^9.x` 캐럿으로 25 repo 에 이미 도달했다. 그런데 **정책이 없으면 전부
`403 access_denied`** 다. 오너가 `account.modfolio.io/admin/token-exchange` 의 Cross-App
Access 에서 **(요청 클라이언트 × 대상 audience)** 쌍마다 정책을 만들어야 발급된다.

**이건 실수가 아니라 설계다.** 기존 `token_exchange_policy` 에 세 번째 `exchangeType` 으로
접었다면, 프로덕션에 이미 있는 **모든 delegation 정책이 같은 audience 에 대한 ID-JAG 권한으로
조용히 승격**됐을 것이다. 새 능력은 상속되지 않는다.

### 정책 한 줄에 필요한 값

| 필드 | 뜻 |
|---|---|
| `requesterClientId` | 표명을 **요청**할 Connect 클라이언트 (**confidential 만**) |
| `resourceAudience` | 대상 Resource AS 의 issuer (**와일드카드 불가**, https 필수) |
| `resourceClientId` | 대상 AS 에서의 요청자 식별자 |
| `hostedTargetClientId` | 비우면 **외부 AS 가 상환** · 채우면 **Connect 가 그 audience 의 AS 역할** |
| `allowedScopes` | `*` = 요청한 만큼 |

fleet 앱은 대부분 `hostedTargetClientId` 를 **채우는** 쪽이다 — 여러분의 앱은 자체 AS 가
아니라 Connect 의 OAuth **클라이언트**이기 때문이다. 이 반쪽이 없었다면 프로토콜이 옳고
동시에 쓸모없었을 것이다(상환 가능한 앱 0).

### 자체 AS 를 돌린다면 — `typ` 를 반드시 검사한다

Connect 는 ID-JAG 표명과 일반 액세스 토큰을 **같은 키로** 서명한다. 서명 검증만으로는
구분이 불가능하다. 상세 = `.claude/rules/agent-evidence.md` §*"서명이 맞다"는 "우리가
발급했다"이지 "이 용도로 발급했다"가 아니다*.

출처: modfolio-connect 인바운드 2026-07-31 (D1 V70 · worker `bcc704cf`).

## MCP 스펙 2026-07-28 — Watch

스펙이 **스테이트리스 코어**로 전환됐다(양방향 스테이트풀 → request/response). 확장으로
MCP Apps(서버 렌더 UI)·Tasks(장기 작업)가 붙고, 인가가 OAuth/OIDC 배포에 더 가까워졌다.

TypeScript SDK **v2 는 이 스펙을 위한 메이저 개정이고 beta** 다. 중요한 성질:
**v2 는 기본값으로 2026-07-28 바이트를 와이어에 내보내지 않는다** — 옵트인이다. v1.x 는
v2 출시 후 **최소 6개월** 버그·보안 수정을 받는다.

**허브 판단**: `@modelcontextprotocol/sdk` **v1.30 유지**. 허브는 MCP 서버 2개
(`ecosystem-state`, `knowledge-rag`)를 로컬 stdio 로 서빙하고 스테이트리스 스케일이
현재 병목이 아니다. beta API 가 굳은 뒤 재평가.

출처: [2026-07-28 스펙](https://blog.modelcontextprotocol.io/posts/2026-07-28/) ·
[SDK 베타 공지](https://blog.modelcontextprotocol.io/posts/sdk-betas-2026-07-28/)

---

## Cloudflare 2026-07 — 하나는 날짜가 박혔다

- **KV 레거시 네임스페이스 API 라우트가 2026-10-15 에 폐지된다.** 이건 Watch 가 아니라
  **날짜 있는 마감**이다. 레거시 라우트를 직접 호출하는 코드/스크립트가 있으면 그 전에
  옮겨야 한다. wrangler 바인딩만 쓰는 곳은 영향 없다 — 그러나 "영향 없음"은 **확인**의
  결과여야지 가정이 아니다.
- **Workers Cache** — Worker 엔트리포인트 **앞단**에 붙는 지역 계층 캐시. 표준 HTTP 헤더로
  설정하고 조합 가능. 랜딩/문서처럼 재검증이 잦은 표면에서 이득이 크다. Trial.
- **Durable Objects** — 신규 네임스페이스는 **SQLite 백엔드 필수**. 클래스 수명주기를
  `exports` 로 선언 가능.
- **`@cloudflare/workers-types` v5** — latest 런타임 타입만 노출, 불안정 API 는 실험적
  entrypoint 로 분리.
- **Agents SDK v0.20.0** — MCP 2026-07-28 클라이언트/서버 지원. 트랜스포트 세션이나
  Durable Object 없이 tools/prompts/resources 를 서빙할 수 있다.

출처: [Cloudflare 업데이트](https://www.cloudflare.com/agents-week/updates/)

---

## Astro 7.x — Adopt (대시보드 반영)

Astro 7.0 이 2026-06-22, 현재 7.1.6. Vite 8 + Rolldown + Rust 컴파일러로 빌드 15–61% 개선.
`@astrojs/cloudflare` 는 **기본적으로 Workers 배포만** 지원한다(CF 권고 정합 — 이 universe 의
Pages→Workers 이전과 같은 방향). 대시보드를 7.1.6 / adapter 14.1.7 로 올렸다.

출처: [Astro 7.0](https://astro.build/blog/astro-7/)

---

## 재평가 trigger

- **TypeScript 7.1 릴리즈** — `bun run ts7:ready` 가 `READY` 를 반환하면 그날이 재평가일이다.
  달력으로 기다리지 말고 프로브로 기다려라.
- MCP TS SDK v2 stable + 스테이트리스가 실제 병목이 될 때.
- 2026-10-15 이전 — KV 레거시 API 사용처 전수 확인.
