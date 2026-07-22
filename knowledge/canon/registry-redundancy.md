---
title: Registry Redundancy — NAS↔GitHub 이중화 소비 독트린 (git + npm)
version: 1.2.1
last_updated: 2026-07-05
source: [실측 2026-07-04 (pkg.modfolio.io 공개도달 200·git.modfolio.io CF-Access 401·Forgejo upstream-proxy 부재 404·Forgejo git=Tailscale SSH·modfolio-ecosystem dual-push 레퍼런스 세팅), connect 97920b2 (connect-sdk 8.7.0 → pkg.modfolio.io mirror 게시), modfolio-registry-proxy 6521ede (Stage 3 R2 durable registry mode, 104 tests), nas-infra.md dual-push, platform-plane.md npm 소비 polarity, journal 20260701-nas-primary-chain.md]
changelog: ["1.2.1 (2026-07-12): edge Worker 코드 위치 현행화 — modfolio-registry-proxy repo 를 modfolio-infra registry/proxy 로 subtree 통합(오너 승인, 구 repo archive), ecosystem.json 은 infra.apps 중첩.", "1.2.0 (2026-07-05): §장기진화 Stage 3(R2 durable registry) 코드 완료 반영 — modfolio-registry-proxy 에 REGISTRY_MODE 토글 + R2 SoT publish/read/dist-tags(integrity·no-clobber·낙관적 동시성) 구현(6521ede). Stage 2(origin 클라우드 이전)=skip 결정(Stage 3 가 origin 대체). service-token lock=불요 평가. R2 bucket 생성 payment-gated 명시.", "1.1.0 (2026-07-05): connect-sdk pkg.modfolio.io 게시 완료(97920b2) → 이관 선행조건 ① 클리어·@modfolio 커버리지 전부 200. §결정(단일 registry)과 옛 §2 소비 폴라리티·anti-pattern 을 정합 — 구 'GH Packages 기본 유지·NAS-flip 금지' supersede, GH Packages=비상 수동 스위치로 강등. 앱 adopt 레시피(dev+CI 토큰, 원자적) 추가. 프록시 디커미션 반영.", "1.0.0 (2026-07-04): 초판 — git dual-push + npm dual-publish 이중화 소비 독트린 통합. git/npm 비대칭·npm 폴백 제약·Forgejo 프록시 부재·CI 경계 명문화. modfolio-ecosystem 을 dual-push 레퍼런스로 세팅."]
sync_to_siblings: true
applicability: always
consumers: [all-agents, ops, deploy, infra, connect]
related_canon: [nas-infra, platform-plane, project-infrastructure-registry, cf-workers-builds-api, cf-deploy]
related_rules: [contracts]
---

# Registry Redundancy — NAS↔GitHub 이중화 (git repo + npm package)

## 한 줄

내용은 **양쪽에 항상-최신**(git=dual-push · npm=dual-publish)으로 둔다. GitHub 이 죽어도 NAS(Forgejo `git.modfolio.io`/`pkg.modfolio.io`)에서 동일하게 받는다. **단 git 과 npm 은 소비 폴백 방식이 다르다** — 이 비대칭이 이 canon 의 핵심.

## 왜 (오너 결정 2026-07-04)

"NAS 랑 GH 동시에 dual-push 해서, GH 안 되더라도 NAS 통해 패키지든 레포든 동일하게 받아올 수 있게." infra 가 NAS 레지스트리·터널·dual-push 모델·파일럿을 완성 → 남은 건 **각 repo/앱의 이중화 소비 채택**(hub 표준 + pull-based 자율).

## 두 층 — git vs npm 비대칭 (실측 backed)

### 1. git repo — dual-push, 소비 폴백 = **네이티브** ✅

- **메커니즘**: `origin` push = dual(GitHub + Forgejo), `forgejo` remote 로 명시 fetch. dev `git push` → 양쪽 동시. GH 다운 → `git fetch forgejo` / `git pull forgejo main`.
- git 은 remote 를 여러 개 지원 → **폴백이 네이티브**. 내용 이중화 + 소비 폴백 둘 다 성립.
- **⚠ CI 경계 (필독)**: Forgejo git 접근 = **Tailscale SSH**(`ssh://git@modfolio-nas.taila0ec92.ts.net:2222`) 전용. `git.modfolio.io`(HTTPS)는 **CF Access 게이트**(무인증 401/403). → **Cloudflare Workers Builds(CI)는 NAS git 에 못 닿는다.** 따라서:
  - git 이중화 = **dev 측 DR**(사람이 GH 다운 시 Forgejo 로 계속). **CI 배포 폴백 아님.**
  - **GitHub 은 CI 소스로 유지**(CF Builds 는 GitHub push event 로 빌드). dual-push 는 "GitHub 에 commit 이 도착하는 경로를 이중화"할 뿐, CF Builds 파이프라인은 불변.
  - GH 자체가 다운되면 CF Builds 는 영향받음(NAS 로 대체 불가) — 이건 이중화로 못 푸는 구조적 한계. 수용.
- **레퍼런스**: `modfolio-ecosystem` 이 2026-07-04 dual-push 세팅됨(`origin` dual push URL + `forgejo` remote, 미러 ff-sync). 세팅 도구 = `scripts/ops/setup-dual-push.sh`(host-sibling, ff-only·force 금지).

### 2. npm package — dual-publish, 소비 폴백 = **비네이티브(수동/프록시)** ⚠️

> ⚠ **소비 폴라리티 갱신 (§결정 2026-07-05 supersede)**: 기본 registry = **pkg.modfolio.io(단일)**, GH Packages = 비상 수동 스위치로 강등. 아래 §2 의 메커니즘·"npm 은 scope당 registry 1개·무자동폴백"·"Forgejo upstream 프록시 없음" 사실은 **유효**(단일 registry 의 SPOF 위험을 설명) — 단 "기본=GH Packages·NAS=DR" 프레이밍만 §결정이 대체.

- **메커니즘**: `harness-publish.ts [5/5]` / `contracts-publish.ts` 가 GitHub Packages(canonical) + Forgejo `pkg.modfolio.io`(mirror) **양쪽 게시**. 내용 이중화 성립(harness·contracts 실측 200).
- **pkg.modfolio.io = 공개 도달**(CF 터널, HTTP 200 `server:cloudflare`) → git 과 달리 **CI 도 접근 가능**. auth = read 토큰 `FORGEJO_NPM_TOKEN`(athsra 주입).
- **⚠ 하드 제약 — npm 은 자동 폴백 불가**:
  1. **npm/bun 은 scope 당 registry 1개** — `@modfolio:registry` = 단일 URL. NAS 지정 후 NAS 다운 → `bun install` **실패**, GH 로 자동 폴백 **안 함**. "1순위/2순위"는 npm 에 없는 개념.
  2. **Forgejo 는 upstream 프록시 없음**(실측: 미러 안 된 `connect-sdk`·외부 `zod` 둘 다 404) — 자기에 게시된 것만 서빙. NAS 로 scope 를 돌리면 미러 안 된 `@modfolio/*` = 404 = 설치 실패.
- **그래서 npm DR 소비 = 수동 스위치**(자동 폴백 없음): §결정 후 평시 `.npmrc` = **pkg.modfolio.io**(단일). pkg.modfolio.io 다운 시 GH Packages 형태(`templates/npmrc.example`)로 비상 교체 가능하나 — GH Packages 는 connect-sdk 가 8.3.0 동결이라 비상 스위치가 starvation 을 되살림(harness/contracts 만 GH 최신 OK). 깔끔한 비상 DR = infra 소관(opinion 20260705 — 호스트 클라우드 이전이 근본, 비상 스위치는 임시). (구 옵션: pkg.modfolio.io 앞 CF Worker 프록시 try-NAS→GH-fallback = §결정으로 디커미션 2026-07-05.)
- **커버리지**(2026-07-05 갱신): pkg.modfolio.io = `@modfolio/harness`·`@modfolio/contracts`·`@modfolio/connect-sdk` **전부 게시**(connect-sdk 는 2026-07-05 `97920b2` 로 mirror 개통). @modfolio 전 패키지 커버 → §결정(단일 registry) 이관의 커버리지 전제 충족(이관 전엔 미게시 패키지로 스위치 시 404 였음 — 이제 해소).

## 버전 불일치가 기능을 깨는 3 패턴 ("최신이면 됨"은 자동이 아니다)

"최신이면 그냥 된다"는 **이상**이지 자동으로 참이 아니다. 실측된 실패 모드 3종:

### 1. Wrong-registry starvation (2026-07-04 실측 — 현재 fleet 문제) ⚠

**연결 프로젝트가 "최신"을 선언해도 잘못된 레지스트리에서 옛 버전을 받는다.**
- `@modfolio/connect-sdk` canonical = **public npm(8.7.0)**. 그러나 GH Packages 는 **8.3.0 에서 동결**(connect 가 8.4~8.7 을 npmjs 에만 게시).
- 전 fleet 의 `.npmrc` = `@modfolio:registry=https://npm.pkg.github.com`(harness/contracts=restricted GH Packages 때문에 필요). npm 은 **scope당 registry 1개**라 connect-sdk 만 npmjs 로 분리 불가.
- **결과(lockfile 실측)**: 선언 `^8.2.1`/`^8.3.0` → 실제 resolved **8.2.1/8.3.0** — 최신 8.7.0(allowAllLocked·FedCM Phase 3) **못 받음**. 8.3.0 도 기본 SSO 는 되지만(hard break 아님) 최신 fix/기능 차단 + connect 서버가 SDK≥8.4 요구 시 **break**. evergreen 무력화.
- **해결 (§결정 2026-07-05 채택)**: connect 는 **pkg.modfolio.io 재게시**를 선택(`97920b2`, GH Packages 재게시 아님) → GH Packages connect-sdk 는 여전히 8.3.0 동결. 따라서 **fleet(현 GH Packages)은 pkg.modfolio.io 이관 완료까지 8.3.0 잔류**(degraded, hard break 아님). 근본 해법 = §결정(pkg.modfolio.io 단일 registry) 이관 — 완료 시 fleet 이 connect-sdk 8.7.0 을 pkg.modfolio.io 에서 수신. harness/contracts 는 GH Packages·pkg.modfolio.io 양쪽 최신이라 starvation 없음 — connect-sdk 만 걸려 있었음. (구 대안 = GH Packages 재게시(단기 unfreeze) / CF Worker proxy(dual-registry 라우팅) — 둘 다 §결정으로 불필요, 프록시 디커미션.)

### 2. Breaking change (semver major)

major 는 하위호환을 깬다 — `connect-sdk 8.0.0` = `registerApp()`/`createClient()` 가 `redirectUris` 필수(BREAKING). 7.x 앱은 8.x 기대에 안 맞음. minor(8.3→8.7)는 additive라 "작동하되 신기능 없음"(degraded, break 아님). 완화 = major 내 머무름 + 업그레이드 가이드.

### 3. Contract / event 버전 skew

producer 가 event v2 emit 하는데 consumer 가 v1 스키마로 검증 → 깨짐. 완화 = `event_version` 올림 + `schema-impact` 게이트(`contracts.md`). `file:../` 로컬 경로 금지(pay 3일 outage 원인).

> 요지: **버전 기록이 맞아도(version-sync) 실제 resolution·호환이 어긋나면 기능이 깬다.** 기록 신선도는 필요조건일 뿐. wrong-registry(1)가 지금 fleet 의 실제 gap.

## ✅ 결정: pkg.modfolio.io 단일 registry (2026-07-05, 오너 확정)

dual-registry split + starvation 의 영구 해법 = **`@modfolio` 전부를 오너 본인 registry `pkg.modfolio.io`(Forgejo, 자가호스팅)로 통일.** npmjs·GitHub Packages·프록시·scope 분리 전부 불필요 — 사용자가 이 목적으로 만든 인프라가 이미 답.

- **왜 pkg.modfolio.io**: (1) 본인 인프라·주권·외부비용 0 (2) **Forgejo 는 GitHub Packages 와 달리 scope=org 규칙 없음** → `@modfolio/*` 공개(connect-sdk)+비공개(harness/contracts)가 한 registry 에 자연 공존, 새 org·rename 불필요 (3) 한 registry = 드리프트 구조적 불가. 실측: harness 3.17.6·contracts 1.7.0 이미 게시됨.
- **소비**: 앱 `.npmrc` = `@modfolio:registry=https://pkg.modfolio.io/api/packages/modfolio/npm/` + `FORGEJO_NPM_TOKEN`(read). `templates/npmrc.nas.example` 가 이 형태.
- **URL≠호스트 (핵심)**: `pkg.modfolio.io` 는 **안정적 URL**(CF 관리). 뒤 호스트(현 NAS Forgejo)는 나중에 **클라우드 서버로 이전 가능** → DNS/터널만 재지정, **앱 무변경**. NAS 가용성 우려는 "호스트 교체"로 해결(프록시-DR 층 불필요). 오너 결정: 지금은 NAS, 나중에 필요 시 클라우드.
- **프록시(`modfolio-registry-proxy`)**: 멀티-registry 라우터 목적은 소멸(디커미션) → **같은 날 §장기진화 Stage 1 캐시/DR 로 재활성**(2026-07-05). 라우터가 아닌 **엣지 캐시+DR 프론트**로 재작성해 `pkg-cache.modfolio.io` 라이브(topology B). "호스트 교체"(중기 Stage 2)와 "엣지 캐시/DR"(Stage 1)은 **상보적** — 캐시/DR 이 NAS-SPOF 를 즉시 완화하고, 호스트 클라우드 이전은 origin 상시성을 준다.
- **fleet 이관 (순서 엄수, gradual·Hub-not-enforcer)** — 오너 2026-07-05 "할 수 있는 건 전부 다 pkg 이관, 최우선":
  - **① connect-sdk pkg.modfolio.io 게시 = ✅**(`97920b2`)
  - **② `FORGEJO_NPM_TOKEN`(read) fleet athsra 배포 = ✅**(2026-07-05, 27 envelopes; hub·infra-nas·personal 제외; device-write, hub 봉투에서 파이프·미노출) + **end-to-end 검증 ✅**(hub·worthee 봉투로 `bun install` → connect-sdk 8.7.0·contracts 1.7.0·harness 3.17.6 전부 최신 200 — starvation 해소)
  - **③ hub `sync-npmrc.ts` `STANDARD_NPMRC` → pkg.modfolio.io flip = ✅**(+`always-auth=true`)
  - **④ 각 앱 adopt = harness-pull 자동화 (2026-07-09 갱신, harness ≥ v3.19.0)**: `harness-pull(--apply)` 이 멤버 `.npmrc` 의 `@modfolio:registry=` 라인을 **자동으로 pkg.modfolio.io 로 flip**(resolve.ts `resolveNpmrcScopeAction`, line-level·idempotent·lockedPaths `.npmrc` 로 opt-out). **즉 앱이 하네스만 pull 하면 자동 이관** — 🔒 hub 는 멤버를 직접 수정하지 않음(pull-based). flip 후 앱의 다음 `bun install/update` 가 pkg.modfolio.io 에서 connect-sdk 8.7.0 수신. **hub 자신도 이관 완료**(2026-07-09, `.npmrc` scope→pkg + connect-sdk 8.7.0, 대시보드 빌드 green — 레퍼런스 dogfood).
  - **✅ anon-read = DEV·CI 모두 토큰 불필요** (Worker `ANON_READ=true`): 과거 ④(b) "CF 빌드 trigger env `FORGEJO_NPM_TOKEN`" + DEPLOY 401 원자성 제약은 **anon-read OFF 시나리오 전용**(비상). 현재 anon-read ON 이라 **CI 빌드도 `.npmrc` flip 만으로 200** — per-app CI 토큰 세팅 불요. 이관 전 앱은 GH Packages 로 계속 정상(무해).
  - **⚠ publisher 예외 (2026-07-09 실측)**: `@modfolio/*` 를 **게시**하는 repo(hub=harness/contracts, modfolio-connect=connect-sdk)는 `.npmrc` `@modfolio:registry` 를 **자기 publish registry(GH Packages)로 유지**한다. `bun publish` 는 publish AUTH 를 `publishConfig.registry` 가 아니라 **@modfolio scope registry** 로 해석하므로, scope 를 pkg.modfolio.io(anon-read·무토큰)로 flip 하면 `bun publish` 가 `missing authentication` 으로 깨진다. harness-pull `resolveNpmrcScopeAction` 은 멤버 package.json `name`=@modfolio/* 또는 `publishConfig` 이면 **flip 을 skip**(`isModfolioPublisher`) — 퍼블리셔 sibling 자동 보호. 즉 소비 전용 sibling 만 pkg 로 이관되고, 퍼블리셔는 GH Packages consume 유지(harness/contracts/connect-sdk 는 GH·pkg 양쪽 게시라 무해). hub 는 이 이유로 §결정 ② 토큰 배포에서도 제외됐다.
- **NAS 신선도 모니터**: 각 앱 실측(version-sync)이 pkg.modfolio.io 상 @modfolio 최신을 hub 미러와 대조 → connect 가 게시 빠뜨리면 드리프트 감지(자동 알림).

### 앱 adopt 레시피 (harness ≥ v3.19.0 — anon-read ON 기준, 무토큰)

⚠ **이 레시피는 이제 대부분 자동이다.** harness-pull(--apply)이 `.npmrc` flip(3번)을 자동 수행하고, anon-read 라 토큰(1·2번)이 불필요하다. 앱이 할 일 = **하네스 pull + `bun update`** 뿐.

1. ~~**dev 토큰**~~ — **불요** (anon-read). anon-read 를 끄면(비상) 그때만 `athsra set <repo> FORGEJO_NPM_TOKEN=<read-token>`.
2. ~~**CI 토큰**~~ — **불요** (anon-read). anon-read OFF 비상 시에만 CF 빌드 env `FORGEJO_NPM_TOKEN`(read, `cf-workers-builds-api.md` PATCH).
3. **.npmrc flip = 자동**: `bunx modfolio-harness-pull --apply` 가 `@modfolio:registry` 라인을 pkg.modfolio.io 로 flip(idempotent). 원치 않으면 `.claude/harness-lock.json` `lockedPaths` 에 `.npmrc` 추가로 opt-out.
4. **재설치**: `bun update` → lockfile 이 pkg.modfolio.io resolution 으로 갱신, connect-sdk 8.7.0 수신.
5. **검증(라이브)**: `bun install` 200 + `bun run <build>` 통과 + CF push→build success + 라이브 200. commit≠deployed.

## 장기 진화 — pkg.modfolio.io → CF-native registry (npm/gh 급, 2026-07-05)

> 오너 질문: "pkg 를 장기적으로 npm/gh 같은 서비스로 발전시키려면 어떻게 구축?" + "프록시 도입이 장기적으로 좋은가?"

**핵심 원리: URL ≠ 호스트.** `pkg.modfolio.io` 는 CF 가 잡은 안정 URL — 뒤 origin 을 자유롭게 진화(앱 무변경). 불변원칙 #3(**100% Cloudflare Edge Native**)이 종착지를 정한다: NAS/Forgejo 는 실용 **부트스트랩**, **CF-native registry** 가 원칙적 목적지(온-프렘 NAS 는 #3 위반이라 장기 유지 대상 아님).

### 프록시 재평가 (오너 질문 답)

- 옛 프록시 목적 = 멀티 registry 라우팅(connect-sdk←npmjs · harness←GH Packages) → **단일 registry 결정으로 소멸**. 그 설계로는 재도입 ❌(디커미션 유지 맞음).
- 그러나 프록시의 **밑패턴(pkg 앞 CF edge Worker)은 장기 정답** — 라우터가 아닌 **엣지 캐시 + DR 프론트**로 재구성하면. 즉 아래 Stage 1 이 프록시 Worker 의 재활용(`modfolio-registry-proxy` redeployable). "옛 프록시 도입" ❌ / "그 Worker 를 캐시·DR 로 진화" ✅.

> **코드 위치 현행화 (2026-07-12 오너 승인 통합)**: edge Worker 코드는 구 `modfolio-registry-proxy` repo 에서 **`modfolio-infra` 의 `registry/proxy/`** 로 git subtree 이력보존 통합됐다 (구 repo archive). 거버넌스(ADR-012)·DNS IaC(`cloudflare/exposed.ts`)·Worker 코드가 한 repo — athsra `apps/worker`·modfolio `apps/{landing,app}` 와 같은 monorepo 다중 배포 패턴. 배포 = `cd registry/proxy && bunx wrangler deploy`. ecosystem.json 은 `Modfolio Infra.apps["registry-proxy"]` 중첩으로 표현 (registry generator 는 repo 당 1 엔트리 — dedupe 사고 방지).

### 진화 로드맵 (origin·edge = infra 소관 ADR-012, hub 는 소비표준+이 로드맵)

| Stage | 내용 | NAS SPOF | 효과 |
|---|---|---|---|
| **0 (지금)** | Forgejo on NAS + CF 터널(안정 URL) | 있음 | 작동, 부트스트랩 |
| **1 ✅ 라이브(2026-07-05, topology A)** | pkg 앞 **CF edge 캐시+DR**(프록시 재활용): `pkg.modfolio.io` 가 Worker route 뒤(투명) + `pkg-cache.modfolio.io` — packument 짧은 TTL(300s)·tarball immutable·**stale-on-error DR** + **익명 read**(ADR-012 Phase 2) | **완화** | 앱 무변경으로 전 fleet NAS 다운 완화 + 전세계 빠른 install + 토큰 불필요 |
| **2 (skip — §결정 2026-07-05)** | ~~origin NAS→클라우드~~ → **Stage 3 가 origin 자체를 대체하므로 skip**(fallback 문서화만). 클라우드 Forgejo 호스트 provisioning 은 Stage 3 가 obsolete | (제거) | Stage 3 로 흡수 |
| **3 ✅ LIVE(2026-07-05, Version 10d799b2)** | **R2(패키지 저장)+CF Worker(npm 프로토콜)+엣지 캐시** = 서버리스 CF-native registry. `REGISTRY_MODE=registry` = R2 SoT. publish→R2(integrity·no-clobber·낙관적 동시성), read→R2-first + NAS backfill fallback, dist-tags→R2. 라이브 검증: 익명 install 99·cache=hit/r2·publish selftest→R2·no-clobber E409 | 없음 | durable(11 9's)·전세계·불변#3 완전정합. NAS=backfill/backup 강등 |
| **4 (서비스 성숙)** | provenance/서명(sigstore류)·scoped 토큰·다운로드 통계·immutability 보장·org/team | — | npm/gh 급 신뢰성 |

**Stage 1 = ✅ 라이브(2026-07-05, topology A — ADR-012 Phase 2 실현)**. 프록시 Worker 를 캐시/DR 프론트로 재작성 → 먼저 `pkg-cache.modfolio.io`(topology B) → **같은 세션 topology A cutover**: infra `cloudflare/exposed.ts` 에 `pkg-origin.modfolio.io`(내부 origin, public-401) 추가·`cf:apply`, `pkg.modfolio.io/*` Worker route(infra CNAME 공존·가로챔), `ANON_READ` on, `git.modfolio.io/api/packages/modfolio/npm/*` fronting(pacote 가 git tarball 을 받으러 오므로), `pkg-monitor` → pkg-origin 재지정. 라이브 실측: 토큰형·**익명(무토큰) install 200**(npm+bun) · packument/tarball origin-down stale/hit(DR) · cold 503 · publish passthrough · git UI/clone 불변. 롤백=`pkg.modfolio.io/*` route 제거→터널. 상세 = `modfolio-registry-proxy/README.md`·ADR-012·journal `20260705-topology-a-cutover.md`.

- **소유 경계 실행**: cutover 는 오너 건별 허가(2026-07-05 "ecosystem+infra 직접 수정 허가") 하 hub 가 infra `exposed.ts` 직접 편집·`cf:apply` 실행. 이는 Hub-not-enforcer 예외가 아니라 **명시 허가**(기본은 여전히 read-only + opinion).
- **origin posture**: `pkg-origin` = public-401(Forgejo 자기 auth). anon-read 라 익명 표면은 Worker(pkg.modfolio.io)뿐 — pkg-origin 은 토큰 게이트 유지(추가 공개노출 0).
- **DR 는 per-colo best-effort**(Cache API, evictable) — guaranteed/global DR(NAS 전손 생존)은 **Stage 3 R2**(durable). Cache API 를 guaranteed DR 로 과장 안 함.

### Stage 3 — R2 durable registry (✅ LIVE 2026-07-05, Version 10d799b2)

`modfolio-registry-proxy` 를 **R2 durable SoT registry** 로 진화·라이브(commit `6521ede`→`9c17361`→`09be227`, 109 tests). proxy mode(Stage 1 캐시/DR)를 유지한 채 `REGISTRY_MODE=registry` 로 무중단·가역 cutover(topology A 와 동일 규율): proxy 배포(R2 binding·행동무변경) → flip → backfill(8 tarballs) → 라이브 검증. **라이브 검증**: 익명 install 99 packages·packument cache=hit·tarball cache=r2(R2 durable·NAS 무접촉)·canonical dist.tarball(git-ROOT_URL 제거)·라이브 publish selftest→R2·no-clobber E409. **라이브 검증이 실버그 포착**(정공법): npm/pacote 소문자 `%2f` 가 `PACKUMENT_RE`(대문자만) 미스매치→R2 우회 passthrough(NAS)→publish 401 → `%2[fF]` 근본수정(`09be227`). **롤백 안전판**: `REGISTRY_MODE=proxy` flip=즉시.

- **publish (PUT)**: npm 본문 파싱 → tarball **integrity 검증**(sha512 실계산 대조, 변조 차단) → R2 저장(immutable) → packument 병합(**no-clobber 409** + R2 etag **낙관적 동시성** 재시도, `concurrency-safety.md` 정합) → best-effort NAS 미러(dual-store backup, 클라 write 토큰 포워드 — Worker publish 토큰 미보유, least-privilege 유지) → 201.
- **read**: **R2-first**(Worker 소유 packument·익명·durable, `dist.tarball` 이 canonical pkg.modfolio.io → **git-ROOT_URL tarball 이슈 근본 제거**) → R2 miss 시 NAS fallback + R2 backfill(마이그레이션 브리지·안전망). dist-tags 는 R2 packument 조작.
- **durable DR**: R2 = 글로벌·durable(11 9's) → NAS 전손·cold 콜로에도 서빙. Stage 1 의 per-colo evictable 캐시를 대체.
- **무중단 cutover 순서**: proxy mode 배포(R2 binding·registry 코드 dormant) → R2 bucket 생성 → `bun run backfill`(read-through 워밍) → `REGISTRY_MODE=registry` flip. 롤백 = `proxy` 복귀(즉시).
- ⚠ **R2 bucket 생성 = payment-gated**(`pre-payment-guard` cf-paid-resource — free-tier 이내지만 보수적 차단). 오너 out-of-band 승인 또는 직접 생성 필요(에이전트 self-approve 불가·`PAYMENT_GUARD_MODE=off` 우회 금지). cross-repo 쓰기 허가와 **별개** 게이트(payment-safety).

### Stage 2 origin 클라우드 이전 = **skip** (Stage 3 로 흡수)

Stage 3 가 R2 를 SoT 로 만들어 **NAS origin 자체를 read 경로에서 제거**하므로, Stage 2(클라우드 Forgejo VM provisioning)는 그걸 obsolete 하게 만드는 비용 중복. **정공법 = 근본 수정 우선**: Stage 3 직행, Stage 2 는 fallback 문서화만. (Stage 3 개발 중 가용성은 topology A 캐시가 커버, cutover 후엔 R2 durable.) NAS 는 Stage 3 후 **backfill 소스 + best-effort backup 미러**로 강등(git UI/clone/push 는 계속 NAS 터널).

### service-token lock (pkg-origin) = **불요** (평가 완료)

anon-read 로 유일 익명 표면 = Worker(pkg.modfolio.io) 뿐이고 pkg-origin 은 public-401 토큰 게이트 유지 → 추가 공개노출 0. Stage 3 후엔 R2 가 SoT 라 pkg-origin 은 backfill/backup 경로일 뿐. service-token machinery 는 실이득 없는 취약 복잡도 → **도입 안 함**(누락 아닌 의도적 평가 결과). infra 가 원하면 자기 자산(CF Access)에 자율 적용 가능.

## 소유권 (Hub-not-enforcer 정합)

| 층 | 소유 | 내용 |
|---|---|---|
| NAS 레지스트리·터널·SSH·CF Access·(옵션)CF Worker 프록시 | **infra** | pkg/git.modfolio.io 플랫폼. ADR-012(infra repo) |
| 소비 표준: npmrc 템플릿(`npmrc.example`·`npmrc.nas.example`)·`sync-npmrc.ts`·`setup-dual-push.sh`·이 canon | **hub** | 각 앱이 이중화 소비하도록 표준·도구 제공 |
| 실제 채택(dual-push 설정·npmrc 스위치) | **각 앱 자율** | pull-based. hub 강제 아님 |
| **fleet read-token CF-build-env 주입** | **infra-authorized · hub 실행** | CF 계정·빌드 trigger = infra platform 자산(ADR-012). 오너 승인 하 hub 가 `cf-build-token-refresh` 로 주입(sibling repo 파일 편집 아님 — 플랫폼 config). infra Option-2 승인 2026-07-05 |
| **per-app `.npmrc` 커밋 + `bun update`** | **각 앱 자율(불변)** | 앱 repo 파일 — Option-2 로도 per-app(🔒). 도구는 CI 토큰 선배치로 마찰만 줄임 |

## 롤아웃 상태 + 절차

- **git dual-push**: modfolio-ecosystem = 세팅 완료(레퍼런스). fleet = **미완**(2026-07-01 실측 26 repo 전부 `mirror:false`·stale). 각 repo `scripts/ops/setup-dual-push.sh` 1회 실행(prereq: Tailscale + Forgejo SSH 키 인증 + Forgejo repo 존재 = infra provision). fleet 롤아웃 = infra 위임.
- **npm dual-publish**: harness·contracts 완료. connect-sdk = connect 소관, **2026-07-05 pkg.modfolio.io 게시 완료(`97920b2`)** → @modfolio 전부 pkg.modfolio.io 200.
- **(구) npm 소비 기본 = GH Packages 유지** → §결정(2026-07-05)으로 **pkg.modfolio.io 단일**로 전환(이관 진행 중). `nas-infra.md:149` "bun install 이 NAS 가용성에 의존 금지" 우려는 유효하나 §결정이 수용 — 완화 = 호스트 NAS→클라우드 이전(URL 불변) + GH Packages dual-publish 를 비상 수동 스위치로 유지(infra opinion 20260705).

## 정공법 정합 / 안티패턴

- ⚠️ (구 anti-pattern) `.npmrc` 기본 NAS-flip 금지 → **§결정(2026-07-05)이 채택으로 뒤집음**. 단 근거였던 위험은 유효·관리됨: (1) 커버리지 갭 → 해소(connect-sdk 게시로 @modfolio 전부 200) (2) npm 무폴백 + NAS SPOF → 수용, 완화 = 호스트 클라우드 이전(URL 불변) + GH Packages 비상 스위치. flip 은 토큰 배포(②) 후에만(반쪽 채택 = 401).
- ❌ Forgejo 를 "GH 폴백 프록시"로 가정 — upstream 프록시 없음(실측 404).
- ❌ NAS git 을 CI 소스로 기대 — Tailscale 전용, CF Builds 도달 불가.
- ❌ dual-push 미러 sync 에 `--force` — ff-only. diverged 면 오너 결정(안전가드).
- ✅ 내용 이중화(dual-push/dual-publish)는 항상. 소비 폴백은 git=네이티브·npm=수동/프록시로 명확히 구분.

## 관련

- `knowledge/canon/nas-infra.md` — NAS 플랫폼·git dual-push 메커니즘(infra)
- `knowledge/canon/platform-plane.md` — npm 소비 polarity(GH 1차)·역량 카탈로그
- `knowledge/canon/cf-workers-builds-api.md` — CI 는 GitHub Packages + GITHUB_TOKEN, NAS 도달 불가
- `scripts/ops/setup-dual-push.sh` · `templates/npmrc.nas.example` · `scripts/sync-npmrc.ts`
