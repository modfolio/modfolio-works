---
title: Modfolio Universe — Domain & Worker Architecture (도메인/워커 네이밍 표준 SoT)
version: 1.0.0
last_updated: 2026-06-22
source: [2026-06-22 도메인 구조 전수 감사 세션 (CF workers/domains + Pages CNAME + DNS 실측), 사용자 결정(app. 허용·인프라 서브도메인 유지·전 Workers)]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops, new-app, sso-integrate]
supersedes: [ecosystem.json domainModel 의 "app.{domain} 폐기 대상" 문구(2026-06-22 정정), ADR-011 의 app. 모호성]
---

# Modfolio Universe — Domain & Worker Architecture

도메인 주소 + CF Worker 네이밍의 **단일 SoT**. 2026-06-22 전수 감사에서 universe 도메인이 Pages/Workers 혼재 + app. 가변 + 네이밍 불통일(`-landing` suffix·인버전)로 드러나, 사용자 결정으로 아래를 **확정**한다.

## 「확정」 (canonical — 재논의 대상 아님, 변경 시 이 블록만 갱신 후 sync)

### 1. 전 스택 Cloudflare Workers (CF Pages 폐기)
- 모든 앱 = **CF Workers** (Static Assets / SSR). **CF Pages 신규 금지**, 잔존 Pages 는 Workers 로 마이그레이션.
- **유일 예외 = modfolio-infra (NAS)**: 자체호스팅(ADR-010). `git/hub/n8n/nas.modfolio.io` 는 **CF Tunnel**(`*.cfargotunnel.com`) 로 Forgejo/Postgres 등을 서빙 — Workers 아님, **의도된 예외**(이 표준 비적용).

### 2. 도메인 구조

**(a) 독립 도메인 앱 (서브시디어리)** — TLD-aware 매핑:
- **일반 TLD (`.com`/`.io`/`.kr`)**: Landing = apex `<domain>`, **App = `app.<domain>`**, `www` → 301 → apex. (예: `gistcore.com` landing / `app.gistcore.com` app)
- **`.app` TLD (munseo.app·sincheong.app)**: **App = apex `<domain>`** (`.app` TLD 자체가 "app" 의미 → `app.X.app` 중복 회피), **Landing = `www.<domain>`**, `app.` 서브도메인 없음.
- **워커 네이밍은 두 경우 동일**(§3): apex 가 app 이든 landing 이든, app 워커 = `<project>-app`, landing 워커 = `<project>`. `.app` 은 apex 가 `<project>-app` 워커에 매핑될 뿐 — **네이밍 예외 아님**.
- 서브시디어리는 **대부분 app 영역을 빌드 예정** — "app 미빌드" 는 transient. app 도메인(`app.<domain>` 또는 `.app` apex) 타겟 표준.
- **폐기**: "www=랜딩 / apex=리다이렉트 / `app.`=가변" 혼재. `entryMode` 301/302 redirect 모델 미구현 → 폐기(직접 바인딩).

**(b) 인프라/플랫폼 앱 (`*.modfolio.io`)** — **기존 서브도메인 그대로 유지**(변경 안 함):
- Landing = `<sub>.modfolio.io` (admin·dev·on·axiom·studio·pay·docs·press·ls·works…)
- App = **기존 브랜드 서브도메인 유지** (`console`·`terminal`·`live`·`nexus`·`lab`·`my`…)
- 이유: 이미 세팅 + SSO `redirect_uri` 의존. 신규 일관성보다 **안정성 우선**(사용자 결정 2026-06-22).

**(c) SSO Identity Core — 불변 (절대 변경 금지)**:
- `login.modfolio.io` (OIDC `/authorize` — 전 22 앱 SDK 의존), `account.modfolio.io` (Connect 계정 허브).
- 이름 변경 = **universe SSO 붕괴**. 어떤 통일 작업도 여기 손대지 않는다.

**(d) `universe.modfolio.io` 폐기 (→ `ecosystem`)**:
- 구 control-plane 이름 `universe` 는 `ecosystem` 으로 rename 완료(혼동 제거). `universe.modfolio.io` 는 `ecosystem.modfolio.io` 로 **301 retire**(구 링크 생존, 단일 canonical = ecosystem).
- OIDC client `universe-dashboard` → `ecosystem-dashboard` rename(Connect client registry 조율) + `universe.modfolio.io/auth/callback` redirect_uri 제거.
- **컬렉티브 브랜드 "Modfolio Universe"(전체 앱 총칭)·"universe-wide" 등은 유지** — 혼동 대상은 *도메인/control-plane 이름* 뿐, 생태계 총칭 아님.

### 3. CF Worker 네이밍
- **Landing = `<project>`** (suffix 없음)
- **App = `<project>-app`**
- 추가 역할 = `<project>-<role>`: `-api`·`-login`·`-cron`·`-worker`·`-workflows`·`-staging`
- **`-landing` suffix 금지** (landing = base name). **인버전 금지** (landing 워커가 base name 소유; app 이 base 를 차지하면 안 됨)
- multi-worker 앱(connect: landing+app+login, athsra: landing+dashboard+worker)은 `<project>-<role>` 로 확장.

### 4. `app.<domain>` = 허용·표준 (문서 모순 해소)
- **ADR-011 "app.<domain> 허용" 채택.** 구 `ecosystem.json domainModel` 의 "`app.{domain}` 폐기 대상" 문구는 **폐기**(2026-06-22 정정).
- 단 **(a) 독립 도메인 앱에만** 적용. **(b) 인프라 앱은 기존 서브도메인 유지.**

## 현행 맵 스냅샷 (2026-06-22 실측 — CF workers/domains + DNS)

범례: 🟢 Worker custom domain · 🟡 CF Pages(`*.pages.dev` CNAME) · 🅿️ 도메인 파킹 · ⬜ 미바인딩

### 독립 도메인 서브시디어리

| App | apex(landing) | app.<domain>(app) | www | Worker(landing/app) | 정합 |
|---|---|---|---|---|---|
| gistcore | 🟢 gistcore | 🟢 gistcore-app | →landing 🟢 | gistcore / gistcore-app | ✅ |
| dle-desk | 🟢 dle-desk | 🟢 dle-desk-app | →landing 🟢 | dle-desk / dle-desk-app(+staging) | ✅ |
| pdgd | 🟢 pdgd | ⬜ (app 미빌드) | →landing 🟢 | pdgd / — | ✅ (app 대기) |
| amberstella | 🟢 amberstella *(B,06-22)* | →landing(placeholder) | 🟢→landing | amberstella / — | apex/www Workers화 완료, app 미빌드 |
| fortiscribe | 🟢 fortiscribe *(B)* | →landing | 🟢 | fortiscribe / — | 동일 |
| keepnbuild | 🟢 keepnbuild *(B)* | →landing | 🟢 | keepnbuild / — | 동일 |
| naviaca | 🟡 Pages | 🟡 Pages | 🅿️ parking | none(Pages) | ❌ Group C |
| worthee | 🟡 Pages | 🟡 Pages | — | none(Pages) | ❌ Group C |
| sincheong | 🟡 Pages | 🟡 Pages | 🅿️ parking | none(Pages) | ❌ Group C |
| munseo | ⬜ | →landing | 🟢→landing | **munseo(=app!) / munseo-landing(=landing)** 인버전 | ❌ Group D |
| umbracast | 🟢→**app**(flip 필요) | 🟢 umbracast-app | →landing 🟢 | **umbracast-landing** / umbracast-app / -worker | ❌ Group D |
| atelier-and-folio | 🟢→**app**(flip 필요) | (없음) | →landing 🟢 | atelier-and-folio / -app / -workflows | ❌ Group D |

### 인프라(`*.modfolio.io`) — 서브도메인 유지, Pages→Workers 만 필요한 것

| App | landing | app | 비고 |
|---|---|---|---|
| **modfolio (parent — app-first flip ✅ 2026-07-09)** | www.modfolio.io→`modfolio` 🟢 | **apex modfolio.io→`modfolio-app`** 🟢 | apex=앱 front door, www=랜딩, app.modfolio.io→앱 유지+HTML 301→apex. 인프라 서브도메인 패턴 예외(브랜드 parent, ADR-011 app-first) |
| connect / pay / admin / docs / ecosystem | 🟢 | 🟢 | ✅ Workers (서브도메인 유지) |
| modfolio-dev | dev 🟡 Pages | terminal 🟢 | landing Pages→Workers |
| modfolio-on | on 🟡 Pages | live 🟢 | landing Pages→Workers |
| modfolio-press | press 🟡 Pages | imprint 🟡 Pages | landing+app Pages→Workers |
| modfolio-ls | ls 🟡 Pages | life 🟡 Pages | landing+app Pages→Workers |
| modfolio-axiom | axiom 🟢 | nexus 🟡 Pages | app Pages→Workers (doc `arc.` drift 정정 필요) |
| modfolio-studio | studio 🟢 | lab ⬜ | app 미배포 |
| athsra | www→athsra-landing 🟢 / **apex→athsra-dashboard**(독립도메인이지만 platform) | — | 네이밍 `-landing`·`-dashboard` 비표준(후순위) |

## 마이그레이션 트랙 (per-app)

- **Group A (이미 정합)**: gistcore·dle-desk·pdgd — (선택) `www→301→apex` 만.
- **Group B (✅ 완료 2026-06-22)**: amberstella·fortiscribe·keepnbuild — apex+www → landing worker(Pages CNAME 제거). app 미빌드라 SSO 무영향.
- **Group C (Pages→Workers, repo 코드 작업)**: naviaca·worthee·sincheong — repo 에 Workers 셋업 → onboard → 도메인 rebind → Pages 폐기 → 파킹 www 정리.
- **Group D (rename + apex flip + SSO sync, 건별 신중)**: munseo(네이밍 인버전 교정)·umbracast(`-landing`→base + apex→landing flip)·atelier-and-folio(apex→landing flip + `app.atelierfolio.com`). **각각 Connect `redirect_uri` 동기 필수.**
- **Track 인프라 (Pages→Workers, 서브도메인 유지)**: modfolio-dev/on(landing)·modfolio-press·modfolio-ls·modfolio-axiom(app). 도메인/네이밍 변경 없음 — 기존 서브도메인 CNAME 을 Pages.dev→worker custom domain 으로 repoint.
- **Track modfolio-parent (✅ 완료 2026-07-09) — app-first apex flip 레퍼런스**: apex `modfolio.io` custom_domain 을 `modfolio`(landing)→`modfolio-app`(app)로 `PUT /workers/domains {override_existing_origin:true}` idempotent move, `www.modfolio.io`→`modfolio` 신설. app wrangler `PUBLIC_APP_URL=https://modfolio.io`+routes[apex,app.]·landing routes[www]·capabilities.ts explore→www. connect `redirect_uri` `https://modfolio.io/auth/callback` 사전 등록 확인(라이브 D1). 스모크: apex→앱 200·www→랜딩 200·app.→apex 301·apex/home→www 301·SSO 왕복. Group D(umbracast/atelier)와 동형 절차 — 이 flip 이 작동 레퍼런스.

## 표준 실행 절차 (per-app)

1. **build CI-safe**: `apps/<app>/package.json` build 에서 `athsra run` 제거(canon `cf-deploy.md` item5).
2. **Workers onboard**: `cf-workers-builds-api.md` §5 (repo connection + trigger + `GITHUB_TOKEN` is_secret + 첫 build).
3. **도메인 bind**: 기존 `*.pages.dev` CNAME 삭제(MX/NS/TXT 보존) → `PUT /workers/domains`. apex+app. 분리 바인딩.
4. **검증**: build_outcome=success + 실도메인 HTTP 200.
5. **Pages 폐기**: orphan Pages 프로젝트 삭제.
6. **(Group D) SSO sync**: 도메인/이름 변경 시 Connect client registry `redirect_uri` 갱신 + 앱 SDK issuer 확인.

> Pages→Workers 이관 상세 13단계 + bulk cleanup = canon `pages-to-workers-migration.md`. Workers Builds API = `cf-workers-builds-api.md`. build CI-safe = `cf-deploy.md` item5.

## Hub-not-enforcer 정합

ecosystem 은 이 표준을 **기록·권고**한다. 실제 적용은 universe-wide 작업으로 사용자 지시 하에 진행하되, sibling repo **코드** 수정은 건별 진행. 인프라(CF 도메인/트리거)는 ecosystem 의 Builds-API 역할 범위.
