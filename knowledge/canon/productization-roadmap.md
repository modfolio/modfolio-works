---
title: Productization Roadmap — modfolio as a platform (internal dogfood → external product/API)
version: 1.0.0
last_updated: 2026-06-29
source: [2026-06-29 productization synthesis 세션 — per-tech externalization assessment (athsra·connect·pay·core-services plane) + ecosystem.json infra/platform-plane 실측 grounding, knowledge/projects/*]
sync_to_siblings: true
applicability: always
consumers: [ops, harness-evolve, plan, release, new-app]
supersedes: []
decision_grade: true
---

# Productization Roadmap — modfolio as a platform

> **결정등급(decision-grade) canon.** "modfolio 의 어떤 내부 기술을 외부 제품/API 로 꺼낼 것인가, 어떤 순서로, 어떤 형식·과금·아키텍처로" 의 단일 기준. `harness-evolve`·`plan`·신규 제품 결정은 여기로 defer 한다. 형식·레지스트리·기반(substrate)·과금·인증의 *조합 규칙* 을 정의하고, 개별 기술의 상태는 각 `knowledge/projects/<repo>.md` 와 `ecosystem.json` 이 SoT 다(충돌 시 이 문서가 아니라 그 SoT 를 먼저 갱신).

## 1. Thesis — 플랫폼으로서의 modfolio

modfolio 는 22+ repo 의 "앱 묶음" 이 아니라, **자기 자신을 첫 고객으로 둔 플랫폼** 이다. House of Brands(앱 간 공유 UI 금지)·Zero-Physical-Sharing(코드 공유는 contract/MCP/endpoint 로만)·100% Cloudflare Edge Native 의 세 불변 원칙은, 결과적으로 **모든 횡단(cross-cutting) 역량을 독립 배포 가능한 서비스·패키지로 강제 분리** 시켰다 — secret(athsra), identity(connect), billing(pay), AI-agent/MCP 평면이 이미 각자 npm 패키지·MCP 서버·REST endpoint·Zod contract 로 외부화 가능한 모양으로 존재한다. 즉 외부 제품화는 "리팩토링 후 꺼내는 것" 이 아니라 **이미 dogfood 로 검증된 표면을 org-agnostic 으로 일반화하고 운영 게이트(SLA·status·결제 프로세서·SOC2)를 채우는 것** 이다. 이 문서는 그 dogfood→external 전환을 *내부 레버리지 × 외부/유료 잠재력 × 실현가능성* 으로 순위화하고, 각 기술의 형식·과금·아키텍처 격차·3단계 경로를 못 박는다.

## 2. Ranked Roadmap

순위 기준 = **내부 레버리지(이미 전 universe 가 쓰는가) × 외부/유료 잠재력(돈이 되는가) × 실현가능성(게이트가 feature 가 아니라 ops 인가)**. 점수는 상대 서수다.

| # | 기술 | 내부 레버리지 | 외부/유료 잠재력 | 실현가능성 | 권고 |
|---|---|---|---|---|---|
| 1 | **athsra** (E2EE secret manager) | 최상 (universe secret 표준 v3, 27 repo) | 중상 (secrets-as-a-service, AI-native MCP wedge) | 중 (ops-gated, not feature-gated) | **productize-external-MED (OSS-first / indie-SaaS)** — package-internal=DONE |
| 2 | **connect** (Universal SSO/Identity + agent plane) | 최상 (전 앱 OIDC PKCE 인증) | 중 (auth-as-a-service 레드오션, 단 agent-delegation 은 차별) | 중하 (멀티테넌트 provider 일반화 필요) | **productize-external-MED-narrow (agent-identity wedge 먼저, full IdP 보류)** |
| 3 | **@modfolio/contracts + MCP plane** (platform/event/sso Zod + knowledge-RAG MCP) | 최상 (universe 계약 SoT) | 중하 (개발자 도구·"AI-native universe SDK") | 상 (이미 published, 추가는 schema 공개) | **productize-internal=DONE, external=LOW-opportunistic (OSS 신뢰 자산)** |
| 4 | **pay** (self-issued prepaid credit + billing) | 상 (유료 제품들의 과금 엔진 = dogfood) | 낮 (선불업 면제 구조라 3rd-party PG 아님 → 외부 판매 불가) | — (외부 제품화 대상 아님, 내부 substrate) | **package-internal=KEEP, external=NOT-NOW (규제·정체성상 외부화 금지)** |
| 5 | **AI vertical apps** (gistcore·fortiscribe — MCP/AI-agent API 내장) | 낮 (앱별 격리, House-of-Brands) | 중 (각자 vertical SaaS, 이미 과금 페이지) | 중 (제품 자체는 성숙, 외부=각 앱 자율 GTM) | **각 앱 자율 (ecosystem 권고만) — 본 roadmap 범위 밖, 참조용** |
| 6 | **WASM 유틸** (munseo 문서변환·umbracast 오디오변환) | 낮 | 중하 (standalone 변환 제품/API) | 중하 (초기 단계) | **NOT-NOW (제품 방향만 확정, 외부화 미성숙)** |

---

### #1 — athsra (E2EE secret manager) — **첫 출시 픽 (4절 참조)**

가장 외부 성숙도가 높은 기술. 외부화가 설계 시점에 의도됐다(retrofit 아님).

- **권고 형식(들)**: ① **package** — `@athsra/cli` + `@athsra/crypto` npmjs.org public MIT (DONE, ~2,520 dl/30d 실 외부 견인 존재). ② **MCP server** — `athsra mcp` 4-tier value-gated (DONE, 모든 경쟁사 대비 유일 AI-native 차별점). ③ **hosted-API** — worker REST(`/v1/secrets`·`/auth/*`) + athsra.com (LARGELY DONE, 외부 operator 게이트만 남음). ④ **crypto adapter/lib** — `@athsra/crypto` E2EE envelope 원시(any project, server-independent) (DONE). ⑤ **plugin** — `athsra adopt`(CF Workers Builds 온보딩)을 org-agnostic 일반화.
- **과금 모델**: **open-core + usage/seat tiers**. MIT CLI/crypto + self-host worker = 영구 무료(BSL anti-compete 는 "경쟁 SaaS 재판매" 만 차단). hosted = 유료: Free(1u/5env/50sec) → Pro ~$19/mo(5u/25env/500sec/90d audit) → Business(SAML SSO) → Enterprise(SLA). SoT = D1 `auth_billing_plans`(하드코딩 아님). 현실적 천장: SOC2·전담 ops 없이는 indie/prosumer 수익(엔터프라이즈 ARR 아님).
- **아키텍처 격차**: (a) published 패키지가 raw `.ts`(`main=./src/index.ts`)+`engines.bun>=1.3`, CLI shebang `#!/usr/bin/env bun`, `@napi-rs/keyring` native addon → **plain Node/npx 불가**(최대 배포 unlock 차단). (b) billing 이 modfolio-pay/KRW 로 재작성됨(2026-06-01) → 외부 고객용 **Stripe 재추가** 필요(deprecated `stripe_*` 컬럼 잔존으로 완화). (c) SOC2 없음, closed-pilot SLA·단일 operator·수동 deploy·status page 부재. (d) live drill(SAML/payment/WebAuthn/DR-restore) 미실행.
- **3단계 경로**:
  1. **internal-reuse (DONE + α, ~1–2d)**: `secrets-manifest-v1` JSON Schema 를 `@modfolio/contracts` 에 공개(sibling 의 `.athsra/secrets.json` type-check) → MCP value-tier 채택 확대 → 필요 시 `@athsra/crypto` 를 universe 범용 E2EE 원시로 추출.
  2. **external-ready**: compiled Node-portable `dist`+`.d.ts` (keyring Node fallback) → Stripe 재추가 → Part-B P0 ops(deploy currency·Sentry DSN·uptime·alert·status page·recorded live drills).
  3. **monetized**: MIT CLI/crypto + self-host 를 OSS top-of-funnel 로 유지 → **Show-HN 런칭(자료 기작성됨)** → hosted Pro $19–36/mo/team(E2EE+edge+AI-native 스토리). 엔터프라이즈(SAML/SOC2)는 pilot 수익 + 2번째 operator 가 ops 투자를 정당화할 때까지 보류.

### #2 — connect (Universal SSO/Identity + agent-delegation plane)

전 universe 인증의 critical 서비스. SDK 는 이미 제품, provider 는 단일 hosted 인스턴스.

- **권고 형식(들)**: ① **package** — `@modfolio/connect-sdk@8.2.1` public npm MIT, 11 export path(root + sveltekit/astro/solidstart/qwik/nextjs/nuxt/hono 어댑터 + `./ssf`·`./dpop`·`./fedcm`·`./agent`·`./management`) (DONE). ② **hosted-API** — OIDC provider(issuer `connect.modfolio.io`, API `login.modfolio.io`) + `/api/v1` Management REST(PAT `mfp_…`+scopes) (단일 인스턴스 LIVE). ③ **MCP/agent plane** — agent-delegation chain·agent-executor·MCP server registry·machine identity·transaction token (서비스 존재, 외부 표면화 미정).
- **과금 모델**: full IdP 외부화는 **레드오션**(Auth0/Clerk/WorkOS/Better Auth OSS). 단 **agent-identity-as-a-service**(에이전트 위임 체인 + transaction token + MCP server registry)는 2026 신생 카테고리라 wedge. 과금은 hosted MAU/MAA(monthly-active-agent) tier + enterprise SAML/SCIM seat. 현실: SDK 는 OSS 무료(신뢰·funnel), hosted 는 small-team.
- **아키텍처 격차**: provider 가 **단일 테넌트**(connect.modfolio.io 한 인스턴스, modfolio org 전용) → 외부 고객용 **멀티테넌트 issuer/org 분리** 필요. SDK 의 management 타입 generate 표면은 외부 PAT 흐름 검증 필요. de-modfolio-ize(issuer host·branding). 80 D1 테이블 / 148 service 파일의 운영 복잡도가 단일 operator 부담.
- **3단계 경로**:
  1. **internal-reuse (DONE)**: 이미 전 앱이 `@modfolio/connect-sdk` OIDC PKCE 로 소비. agent-delegation export(`./agent`)를 universe agent 들이 채택 확대.
  2. **external-ready**: **agent-identity wedge 먼저** — MCP server registry + agent-token delegation 을 org-agnostic 으로 표면화(full multi-tenant IdP 보다 작은 표면). PAT Management API 외부 문서·rate-limit·scopes 검증.
  3. **monetized**: agent-identity hosted tier 출시(MAA 과금) → 검증되면 full multi-tenant IdP 로 확장. **full IdP 외부 GA 는 athsra 외부화 성공 후로 보류**(같은 operator·ops 예산 경합).

### #3 — @modfolio/contracts + MCP plane (universe SDK 신뢰 자산)

- **권고 형식(들)**: ① **package** — `@modfolio/contracts@1.6.0`(platform `PlatformCapabilitySchema`·`ProjectPlatformManifestSchema`, event, sso Zod). ② **MCP server** — `knowledge_query`(knowledge-RAG, `scripts/mcp/knowledge-rag-server.ts`, readOnly) = House-of-Brands 정합 지식 공유 표면.
- **과금 모델**: 직접 과금 아님 — **OSS 신뢰 자산 / top-of-funnel**. athsra·connect 외부 제품의 "이 회사는 contract-first·AI-native 다" 증거. 간접 수익(funnel).
- **아키텍처 격차**: 이미 published. 추가 작업 = `secrets-manifest-v1` 등 내부 schema 를 공개 표면으로 승격, RAG MCP 의 lethal-trifecta 경계(readOnly 유지).
- **3단계**: internal-reuse=**DONE**(계약 SoT) → external-ready=schema 공개 + 문서 → monetized=직접 과금 없음(funnel 기여만).

### #4 — pay (self-issued prepaid credit + billing) — 내부 substrate, 외부화 금지

- **정체성(2026-06-28 확정)**: 모드폴리오(단일 사업자) **자가발행·자가사용 선불 크레딧** — 제3자 PG·결제대행이 **아니다**. 발행인 직접 제공 재화·용역 전용이라 전금법상 **선불업 등록 면제**. "universal payment gateway" 표현은 외부 가맹점 결제대행 오인 소지로 폐기됨.
- **역할**: 유료 제품들(athsra hosted 등)의 **과금 엔진 = dogfood**. athsra `modfolio-pay-billing-paymode-ssot` capability 가 이를 소비. Toss Payments + Neon + connect SDK 인증.
- **권고**: **package-internal=KEEP**(universe 과금 substrate), **external=NOT-NOW** — 규제(선불업 면제 구조)·정체성상 외부 판매 불가. 외부 고객 결제는 athsra 처럼 **Stripe 등 표준 프로세서를 각 제품이 직접** 붙인다(pay 를 외부 결제대행으로 쓰지 않는다).

### #5–6 — AI vertical apps / WASM 유틸 (참조 — 본 roadmap 범위 밖)

- **gistcore·fortiscribe**: AI speaking/writing vertical SaaS. 자체 과금 페이지 보유. 외부화는 **각 앱 자율 GTM**(House-of-Brands — ecosystem 은 권고만). 공유되는 건 athsra/connect/pay/contracts 표면뿐.
- **munseo·umbracast**: WASM 문서/오디오 변환 유틸. standalone 변환 제품/API 후보지만 **초기 단계 → NOT-NOW**(제품 방향만 확정).

## 3. Cross-cutting Architecture

### 3.1 어떻게 조합되는가 (House of Brands — contracts/MCP/endpoint, NOT shared UI)

외부 제품은 **공유 UI 라이브러리로 묶이지 않는다**. 조합은 세 표면으로만:

- **contracts (Zod)** — `@modfolio/contracts` 가 어휘 정의. 외부 SDK 의 입출력 타입·manifest schema. (예: athsra `secrets-manifest-v1` 을 contracts 에 공개 → 소비자 type-check.)
- **MCP server** — AI-native 차별점이자 House-of-Brands 정합 공유 표면. athsra `mcp`(value-tier secret 주입), connect `./agent`(delegation), knowledge-RAG `knowledge_query`. **에이전트/앱이 plaintext·내부 UI 없이 역량 소비.**
- **endpoint (REST)** — hosted-API. athsra worker `/v1/*`, connect `/api/v1` + OIDC discovery. 외부 고객은 endpoint + SDK 로 연동(우리 UI 강제 안 함).

**금지**: 외부 제품끼리 또는 외부↔내부 앱이 공유 컴포넌트/디자인 라이브러리로 결합. 결합은 위 3 표면(계약·MCP·endpoint)으로만 — Zero-Physical-Sharing 불변.

### 3.2 packaging + registry 전략 (npm / JSR / GitHub Packages)

| 표면 | 레지스트리 | 근거 |
|---|---|---|
| **외부 공개 패키지** (`@athsra/*`, `@modfolio/connect-sdk`) | **npmjs.org public, MIT** | 외부 견인 = token-free install 필수. athsra 2,520 dl/30d 가 증명. |
| **universe-internal 패키지** (`@modfolio/harness`, `@modfolio/contracts`) | **GitHub Packages (restricted, 1차)** | universe 소비 단일 채널. `.npmrc` `@modfolio:registry` + `${GITHUB_TOKEN}`(athsra 주입). |
| **2차 내부 채널** | **pkg.modfolio.io (NAS Forgejo registry)** | ADR-012, 부차. NAS 다운 시 GitHub Packages 가 1차라 무영향. |
| **JSR** | 보류 — 채택 트리거 시 재평가 | 현재 npmjs.org public 으로 외부 unlock 충분. Deno-first 수요 생기면 도입. |

**외부 패키지 빌드 규칙(정공법)**: published 패키지는 **compiled `dist` + `.d.ts`** 를 ship 한다. raw `.ts` + runtime-specific(Bun.*/native addon) 하드의존은 `npx`/Node 사용자를 차단 → 외부화 차단. Node fallback(예: keyring) 필수. (athsra #1 격차 (a).)

### 3.3 hosted-API substrate (CF Workers + NAS — GHA-independent build/deploy)

3-plane 토폴로지(`platform-plane.md` v1.0.0)가 외부 제품의 기반:

- **Edge Runtime (Cloudflare)** — 외부 제품이 실제 구동. Workers + D1 + R2 + KV + Queues. p50<20ms / 200+ PoP(athsra 차별점). **배포 = CF Workers Builds**(push-to-deploy, GHA 0분, `cf-deploy.md`).
- **Platform (NAS, modfolio-infra)** — **GHA-독립** CI·build·registry. Forgejo Actions self-hosted runner(CI 컴퓨트 $0), pkg.modfolio.io(2차 registry — ⚠ §결정 2026-07-05 단일 registry 전환 중, `registry-redundancy.md` §결정), Postgres-dev, Restic→R2 백업(3-2-1), 경량 ai-inference. ADR-010 면제(유일 self-hosted). **NAS = CI/registry/backup SPOF 이므로 모든 역량이 `fallbackWhenDown` 명시** — 1차 배포/소비 경로(CF Workers Builds + GitHub Packages)는 NAS 다운에 무영향.
- **Core Services (CF edge, 전역 소비)** — athsra(secret) · connect(SSO) · pay(billing). 외부 제품도 이 셋을 표준 어댑터(`platform-adapter.json` / `@modfolio/contracts/platform`)로 소비.

**핵심**: 외부 제품의 build/deploy 는 **GHA 에 의존하지 않는다**(빌링 장애 모드 회피 — `gh-actions-policy.md`). 배포 currency 는 CF Workers Builds, 품질/publish 컴퓨트는 NAS Forgejo.

### 3.4 billing integration (pay powers the paid ones — dogfood)

유료 제품의 과금은 **내부 dogfood = modfolio-pay** 로 검증하되, **외부 고객 결제는 표준 프로세서(Stripe 등)를 각 제품이 직접** 붙인다:

- **내부 dogfood**: athsra `modfolio-pay-billing-paymode-ssot` 이 pay 를 소비(PayMode SSOT + `X-Pay-Mode`). 유료 tier 모델(`auth_billing_plans` D1 SoT)을 내부에서 먼저 굴려 검증.
- **외부 결제**: pay 는 선불업 면제 구조(자가발행·자가사용)라 **외부 결제대행으로 쓸 수 없다**. 외부 hosted(athsra Pro 등)는 Stripe 를 직접 통합(athsra deprecated `stripe_*` 컬럼이 경로 완화). 이중 경로(내부 modfolio-pay / 외부 Stripe)를 PayMode 로 분기.

### 3.5 auth (connect SSO for external customers)

외부 제품의 고객 인증·조직 경계는 **connect** 로 통일:

- 외부 고객 로그인 = connect OIDC PKCE(issuer `connect.modfolio.io`, API `login.modfolio.io`). 외부 제품은 `@modfolio/connect-sdk` 어댑터로 연동(우리 앱과 동일 메커니즘 = dogfood).
- 엔터프라이즈 외부 고객 = connect SAML SP / SCIM / RBAC-ReBAC(서비스 존재, 멀티테넌트 issuer 분리 후).
- 에이전트 호출 = connect agent-delegation(`./agent`) + transaction token — 외부 AI 통합의 차별 표면.
- **격차**: 외부 다(多)테넌트 고객 = connect provider 멀티테넌트 issuer/org 분리(#2 격차). 그 전까지 외부 제품은 connect 단일 인스턴스에 org-scoped 로 온보딩.

## 4. First-Ship Recommendation

**먼저 제품화할 1–2개: ① athsra (확정 first-ship) — OSS-first / Show-HN, ② @modfolio/contracts schema 공개 (athsra 를 뒷받침하는 동반 출하).**

**왜 athsra 가 첫 번째인가**:

1. **유일하게 외부 성숙** — public MIT npm 2종 + 실 다운로드 견인 + 의도된 open-core BSL anti-compete + 진짜 멀티테넌시(per-org R2 `secrets/<orgId>/` 격리·fail-closed) + billing·SAML·WebAuthn·RBAC·DR + closed-pilot SLA + **기작성된 HN 런칭 자료**. "not-now" 도, 단순 내부 패키지도 아니다.
2. **게이트가 feature 가 아니라 ops** — 자체 production-readiness audit 가 "controlled production pilot, not GA" 로 정직하게 자평. 남은 일(Node-portable dist·Stripe 재추가·status page·live drills·SOC2)은 **운영/신뢰** 이지 기능 부재가 아니다 → 외부화 risk 가 가장 낮다.
3. **가장 싸고 차별적인 wedge = AI-native** — `athsra mcp` value-tier secret 주입은 **모든 경쟁사 대비 유일**(Doppler/Infisical/Bitwarden/1Password 중 누구도 first-class Claude Code/Cursor plaintext-masking 주입 미제공). Claude Code/Cursor 채택 흐름과 정합.

**동반 ②(@modfolio/contracts schema 공개)인 이유**: athsra `secrets-manifest-v1` 을 contracts 로 공개하면 (a) sibling type-check(내부 레버리지 즉시) + (b) 외부 소비자에게 "contract-first" 신뢰 자산 — 비용이 거의 0(이미 published 패키지에 schema 추가)인데 athsra 외부화의 신뢰 표면을 키운다.

**보류(명시)**: connect full IdP 외부 GA 는 athsra 외부화 성공 + 2번째 operator 전까지 보류(같은 ops 예산 경합·레드오션). connect 는 **agent-identity wedge** 만 먼저(작은 표면). pay 는 외부화 대상 아님(규제·정체성).

**first-ship 실행 순서(athsra)**: ① Node-portable `dist`+`.d.ts`(keyring fallback) — 최대 배포 unlock → ② Stripe 재추가 + status page/Sentry/uptime/alert + recorded live drills → ③ Show-HN(자료 존재) + hosted Pro $19–36/mo. OSS top-of-funnel(MIT CLI/crypto + self-host)은 끝까지 무료 유지.

---

## 변경 이력

- **v1.0.0 (2026-06-29)**: 최초 작성. athsra·connect·contracts·pay·AI-app·WASM 6 기술 순위화. first-ship = athsra(OSS-first) + contracts schema 공개. cross-cutting(House-of-Brands 3 표면 · npm/GH-Packages/pkg.modfolio.io registry 전략 · CF Workers + NAS GHA-독립 substrate · pay dogfood + 외부 Stripe · connect SSO) 정의. grounding: `ecosystem.json`(infra/platform-plane 실측, harnessLatest 3.16.4, connectSdk 8.2.1, contracts 1.6.0) + per-tech externalization assessment + `knowledge/projects/*`.

## 관련 canon

- `knowledge/canon/platform-plane.md` (v1.0.0) — 3-plane 토폴로지·역량 카탈로그·어댑터 (substrate SoT)
- `knowledge/canon/cf-deploy.md` — 배포 = CF Workers Builds (외부 제품 배포 경로)
- `knowledge/canon/gh-actions-policy.md` — GHA-독립 (NAS Forgejo CI)
- `knowledge/canon/secret-store.md` (v1.15+) — athsra 표준 v3 (internal=DONE 의 근거)
- `knowledge/canon/billing-architecture.md` — pay dogfood / PayMode
- `.claude/rules/lethal-trifecta.md` — MCP plane 외부화 시 trifecta 경계
- `knowledge/projects/athsra.md` · `modfolio-connect.md` · `modfolio-pay.md` — 기술별 상태 SoT
