---
title: App Registry — universe 앱 이름 + URL 단일 소스 (no more "URL 미등록")
version: 1.1.0
last_updated: 2026-06-14
source: [2026-06-14 사용자 요청 + Codex 점검 — sibling 들이 OIDC redirect_uri·CORS·SSO·webhook URL 을 손으로 박다 drift; ecosystem 이 항상 정확·최신 URL 을 내려주도록. v1.1 = OIDC 정확성(Connect seed 미러 + connect:redirect-drift)]
sync_to_siblings: true
applicability: always
consumers: [sso-integrate, deploy, ops, contracts]
---

# App Registry

> **모든 modfolio-universe 앱의 이름 + URL + 엔드포인트를 `ecosystem.json` 에서 파생한 타입드 레지스트리로 제공한다. sibling 은 더 이상 redirect_uri / CORS origin / SSO issuer / webhook URL 을 손으로 박지 않는다. — `@modfolio/contracts/registry`**

## 왜

`ecosystem.json` 에 도메인이 다 있었지만, 그것을 **타입드·공유 가능·항상 최신**으로 sibling 에 내려주는 경로가 없었다. 그래서 connect 의 `OAUTH_CLIENTS`, 각 앱의 redirect_uri, CORS origin 이 손으로 관리되며 drift 했다 (예: dashboard Pages→Workers 이관 시 `universe.modfolio.io` callback 누락 → connect schema V46 수동 bump). App Registry 가 이 클래스의 버그를 제거한다.

## 구성

- **소스**: `ecosystem.json` (단일 진실).
- **스키마 + 파생**: `contracts/registry/schema.ts` — Zod `AppRegistryEntrySchema` + 순수 `deriveEntry()`. URL 파생 (origins, redirectUris, CORS, SSO endpoints, webhook base) 은 전부 데이터에서, 결정적 (정렬·소문자·고정 키순서·`Date.now` 금지).
- **생성물**: `contracts/registry/app-registry.generated.json` — 유일한 생성 데이터 아티팩트 (`scripts/registry/generate.ts`). biome 제외 (`!**/*.generated.json`), Zod `verify` + drift `--check` 로 가드.
- **헬퍼**: `contracts/registry/index.ts` — Workers-safe 정적 import (런타임 fs 없음).

## 소비 (sibling)

```ts
import {
  oidcRedirectUris, authEndpoints, corsOriginsFor, webhookUrl, getApp,
} from '@modfolio/contracts/registry';

// connect 가 OAUTH_CLIENTS 를 레지스트리에서 구성 (손코딩 X):
const redirects = oidcRedirectUris('naviaca');
// ['https://app.naviaca.com/auth/callback', 'https://naviaca.com/auth/callback']

// 소비 앱이 connect OIDC 엔드포인트 발견:
const { issuer, authorize, token, jwks } = authEndpoints() ?? {};
```

⚠️ consumer 는 **published** `@modfolio/contracts@^1.2.0` 으로만 의존 — `file:../` 금지 (`.claude/rules/contracts.md`; modfolio-pay 3일 prod outage 원인).

## OIDC 정확성 (v3.9 — Connect seed 미러)

OIDC 권위 소스 = **modfolio-connect `CLIENT_SEED_SQL` + migrations**. `clientId===repo`·단일 `/auth/callback` 가정은 현실과 다르다(dashboard=`universe-dashboard`, dledesk callback=`/api/auth/oauth2/callback/modfolio`, atelier=www-only, 인프라앱=short-id+alias). 그래서 `ecosystem.json.oauthClients[repo]` 가 **그 현실의 정확한 미러**:

- **clientId** = `oauthClients[repo].clientId ?? repo` (실제 OIDC client_id). **oauthClientAliases** = legacy id (예: `admin`←`modfolio-admin`).
- **callbackPath** = `oauthClients[repo].callbackPath ?? /auth/callback`.
- **redirectUris** = `oauthClients[repo].redirectUris`(있으면, seed 미러) ?? 파생(app origin + callbackPath). 파생 시 landing-first=`app.<domain>`+bare, group hub(domain 없음)=landing host, legacyDomain/domainHistory 포함. **`workerUrl`(*.workers.dev)은 CORS origin 만, redirect 아님**.
- **drift 검증** = `bun run connect:redirect-drift` (host-sibling) — registry ↔ Connect seed+migrations 비교, ✗(clientId 부재·Connect 가 거절할 redirect)·info(staging/orphan) **보고**. Connect 가 소스, ecosystem 은 정확히 알고 표면화 — **강제 아님**.
- **auth (OIDC endpoints)** = SSO provider(`modfolio-connect`)만 보유. issuer=`https://connect.modfolio.io`, `/sso/authorize`·`/sso/token`·`/sso/verify`·`/.well-known/jwks.json`.
- **hostless infra** (athsra, modfolio-infra) = 빈 origins, callback 없음 — 정직.

## 최신성 (semi-auto)

1. `ecosystem.json` 변경 → `bun run registry:generate` (post-contract-touch hook 가 리마인드).
2. **release-gate Step 7** = `registry:check` drift guard (하드). `bun test` 의 drift 테스트도 동일 보장 (quality:all·publish 어디서나).
3. publish 시 fresh registry 동반 (`@modfolio/harness` 가 `contracts/` 번들 → 모든 sibling node_modules 에 자동 존재).
4. harness-pull 이 `app-registry.generated.json` 을 sibling `.claude/app-registry.json` 으로 sync — non-TS/build 소비자용 fresh 미러, default-ON SessionStart self-heal 이 매 세션 갱신.

## 불변

- 런타임 코드는 `@modfolio/contracts/registry` 정적 import (Workers-safe). `.claude/app-registry.json` 미러는 build-time/tooling 참조용.
- Zero Physical Sharing 준수 — sanctioned `contracts/` 채널.
- Hub-not-enforcer — ecosystem 은 데이터만 번들·sync, sibling repo 를 직접 수정하지 않음. connect 의 `OAUTH_CLIENTS` 갱신·적용은 connect 자신이 pull.

## 관련

- `contracts/sso/integration-guide.md` — OIDC flow + endpoints
- `.claude/rules/contracts.md` — published-only 의존
- `knowledge/canon/db-endpoints.md` — DB endpoint 단일 소스 (유사 패턴)
- ADR-011 — entryMode landing-first + `app.<domain>`
