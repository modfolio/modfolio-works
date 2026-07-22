---
title: Platform Plane — universe 자체호스팅 역량 + 코어 서비스 어댑터 토폴로지 (통합 지도)
version: 1.2.0
last_updated: 2026-07-03
source: [2026-06-28 platform-plane 준비 세션 — infra↔universe 계약 공백·도구 SoT 부재 해소. nas-infra.md v1.1 + gh-actions-policy.md v2.1 + ADR-010 운영화. 2026-07-02 v1.1: subscribesTo 이벤트 구독 선언 + host-sibling scan(event_wiring_gaps 실데이터화). 2026-07-03 v1.2: 소비자 온보딩 1페이지(8 역량 × 3줄 — 얻는 것·연결 방법·fallback, ecosystem.json capabilities/nas-infra.md 실문서 기준·미문서 항목 정직 표기)]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops, new-app, preflight, modfolio]
supersedes: []
---

# Platform Plane — 통합 토폴로지 지도

> **목적**: universe 가 어떤 평면으로 구성되고, 임의의 프로젝트가 NAS 역량과 3대 코어 서비스를
> **어떤 표준 어댑터로** 소비하는지 한 곳에서 본다. 이 문서는 *역량/어댑터 레이어* 의 지도다.
> 상세는 defer — NAS 토폴로지/ops = [`nas-infra.md`], 앱별 4축(secret/email/domain/db) =
> [`project-infrastructure-registry.md`], secret = [`secret-store.md`], billing = [`billing-architecture.md`],
> 도구 목록 = [`tool-inventory.md`]. 중복 기술하지 않는다(충돌 시 이 표가 아니라 각 SoT 를 먼저 갱신).

## 3-Plane 모델

universe 는 세 평면으로 분리된다. 이 분리가 "GHA·외부 SaaS 의존을 걷어내고 NAS 를 전역 플랫폼으로"의
멘탈 모델이다.

| Plane | 무엇 | 어디서 구동 | 근거 |
|---|---|---|---|
| **Edge Runtime** | 앱이 실제 구동 — Workers · D1 · R2 · KV · Queues | Cloudflare edge | ADR-002 (불변) |
| **Platform (NAS)** | CI · git · npm registry · dev Postgres · 백업 · AI compute · mesh | modfolio-infra (UGREEN NAS + 계획 GPU workstation) | ADR-010 예외 · ADR-013 |
| **Core Services** | athsra(secret) · connect(SSO) · pay(billing) | CF edge 구동, **전역 소비** | 각 repo |

**"어댑터"** = 임의의 프로젝트(edge 앱 또는 NAS 상주 서비스)가 한 역량/코어서비스를 소비하는 **표준
인터페이스**. 양방향:
- **project → platform**: 앱/서비스가 NAS 역량(CI·registry·DB·백업·AI)을 사용.
- **NAS-service → core**: NAS 의 ai-stack 등이 athsra(secret)/connect(SSO)/pay(billing)를 호출.

계약 표현: 각 repo 가 자기 소비를 **선언**하는 manifest = `@modfolio/contracts/platform`
(`ProjectPlatformManifestSchema`). repo 루트 `platform-adapter.json` 또는 `harness-lock.json` 의
`platformAdapter` 섹션. ecosystem 은 **어휘만 정의**하고 manifest 를 sibling 에 쓰지 않는다(Hub-not-enforcer).

## 역량 카탈로그 (Platform Plane)

8 역량. 계약 = `@modfolio/contracts/platform` `PlatformCapabilitySchema`. 데이터 SoT =
`ecosystem.json` `infrastructure[modfolio-infra].capabilities`. **NAS = CI/registry/backup 의 SPOF
이므로 모든 역량은 `fallbackWhenDown` 을 명시**(아래).

| capability id | node | endpoint | auth | NAS 다운 시 fallback |
|---|---|---|---|---|
| `forgejo-git` | nas | git.modfolio.io (CF Access) | cf-access | 23 repo origin=GitHub 무영향; infra repo push 만 차단(복구 후) |
| `forgejo-actions-ci` | nas | (internal runner) | forgejo-token | `workflow_dispatch` 만 영향; **검증은 local `pre-push-guard`** 가 담당 |
| `npm-registry` | nas | pkg.modfolio.io | forgejo-token | (이관 전=현재) 1차=GitHub Packages 단일 → **무영향**. ⚠ §결정 2026-07-05: pkg.modfolio.io 단일 registry 전환 중 — 이관 후 NAS 다운=fleet install/CI 영향(`registry-redundancy.md` §결정) |
| `postgres-dev` | nas | (mesh) | athsra-secret | dev DB 만; prod = Neon/D1 별개 → 무영향 |
| `restic-backup` | nas | (internal) | athsra-secret | 백업 일시중단, 복구 후 재개; **R2 offsite 사본 보존** |
| `ai-inference` | nas | (mesh) | athsra-secret | 경량 추론 중단 → 외부 API 대안(소비 metering 은 pay) |
| `tunnel-access` | nas | (CF edge) | cf-access | 외부 HTTPS 노출 차단 → Tailscale 직접 경로 |
| `tailscale-mesh` | nas | (mesh) | tailscale | mesh 차단 → CF Access HTTPS 경로로 우회 |

> 배포 자체는 이 평면이 아니다 — 전 universe 배포 = **CF Workers Builds**(`cf-deploy.md`), GHA 0분.
> NAS 의 CI 는 *품질/publish 컴퓨트*이지 배포 경로가 아니다(`gh-actions-policy.md` v2.1).

## 소비자 온보딩 — 각 capability 를 쓰려면 (3줄씩)

소비하는 역량은 repo 루트 `platform-adapter.json` 의 `consumes[]`(+ `coreServices`·`subscribesTo`, 계약 `ProjectPlatformManifestSchema`)로 선언한다 —
**정직 선언**: 실사용·실핸들러가 있을 때만(의도 선언 = 거짓 green). 선언↔실배선 갭 확인 = `bun run event-wiring`(host-sibling 스캔).
연결 상세가 어디에도 미문서인 항목은 아래에 정직하게 표기 — 그 경우 infra repo(IaC SoT)에 문의한다.

**`forgejo-git`**
- ① NAS Forgejo git 호스팅 — GitHub 이중화 + NAS-primary 체인(dev→Forgejo→push-mirror→GitHub→CF Builds)의 origin.
- ② HTTPS = `git.modfolio.io`(CF Access SSO) · mesh SSH = `ssh://git@modfolio-nas.<tailnet>.ts.net:2222/modfolio/<repo>.git`. per-repo NAS-primary 전환 레시피 = journal `20260701-nas-primary-chain.md`.
- ③ 다운 시: 23 repo origin=GitHub 무영향; infra repo push 만 차단(복구 후).

**`forgejo-actions-ci`**
- ① CI 컴퓨트 $0 — 품질/publish 워크플로 (GHA 전면 금지의 대체, 배포 경로 아님).
- ② repo 에 `.forgejo/workflows/*.yml` + `runs-on: nas`(runner 라벨). secrets = Forgejo repo Settings → Actions(auth = forgejo-token).
- ③ 다운 시: workflow_dispatch 만 영향; 검증은 local pre-push-guard 가 담당.

**`npm-registry` (pkg.modfolio.io)**
- ① `@modfolio/*` npm registry(ADR-012, self-hosted 축). **⚠ 폴라리티 전환 중 (§결정 2026-07-05, `registry-redundancy.md` §결정)**: pkg.modfolio.io 가 부차 채널 → **fleet 단일 registry** 로 격상 결정. 현재는 fleet=GH Packages(이관 진행 중, connect-sdk 게시 ① 완료), 이관 완료 시 아래 ③ "NAS 다운 무영향" 은 **반전** — pkg.modfolio.io(NAS)가 npm 소비·CI 의 fleet-critical SPOF 가 됨.
- ② endpoint `pkg.modfolio.io`(401 = 인증요구 정상), 토큰 = `FORGEJO_NPM_TOKEN`. ⚠ `.npmrc` 는 scope 당 registry 1개(`project-infrastructure-registry.md` §dual-registry) — §결정은 이 제약을 "GH Packages 와 per-package 병존 불가 → 단일화" 의 근거로 삼음.
- ③ 다운 시 (이관 **전** = 현재): 1차 consume=GitHub Packages 단일 무영향. 이관 **후**: pkg.modfolio.io 다운 = fleet install/CI 영향 → 완화(호스트 NAS→클라우드 이전 URL-불변 + 비상 스위치) = infra opinion 20260705.

**`postgres-dev`**
- ① 중앙 dev Postgres 16(NAS) — prod 는 앱별 Neon/D1 로 별개(DB-per-service, `project-infrastructure-registry.md`).
- ② Tailscale mesh 내 접속, 크레덴셜 = athsra 주입(athsra-secret). 호스트/포트 연결 상세 = infra repo 문의 (미문서화).
- ③ 다운 시: dev DB 만; prod=Neon/D1 별개 무영향.

**`restic-backup`**
- ① NAS 영구 데이터(Forgejo DB·Postgres·docker volumes)의 3-2-1 백업 — NAS 로컬 + R2 offsite.
- ② 앱이 직접 연결하지 않는다 — infra 측 cron(modfolio-infra docker-compose)이 수행, `RESTIC_PASSWORD` = athsra `modfolio-infra`. 신규 데이터 편입 = infra repo IaC.
- ③ 다운 시: 백업 일시중단·복구 후 재개; R2 offsite 사본 보존.

**`ai-inference`**
- ① 자체호스팅 지식 RAG(RAPTOR+hybrid+rerank) + 경량 추론 — 외부 AI API 비용·유출면 절감(`nas-ai-platform.md`).
- ② RAG = `rag.modfolio.io` `/query`·`/agentic_query`(CF Access — service token 은 athsra 주입, 원격 배선 P2 진행중) · 추론 = mesh ollama(workstation `mod-main:11434` Tailscale Serve + NAS-CPU fallback). ecosystem 세션은 MCP `knowledge_query`/skill `knowledge-rag-query`.
- ③ 다운 시: 경량 추론 중단→외부 API 대안(metering=pay).

**`tunnel-access`**
- ① NAS 서비스의 외부 HTTPS 노출(CF Tunnel + Zero Trust Access) — Tailscale 없는 환경/브라우저 접근 경로.
- ② 브라우저/HTTPS 로 `git.modfolio.io`·`rag.modfolio.io` 등 접근 → CF Access SSO 통과(별도 클라 불요). 새 서비스 노출 = infra repo IaC(tunnel ingress) 문의.
- ③ 다운 시: 외부 HTTPS 노출 차단→Tailscale 직접 경로.

**`tailscale-mesh`**
- ① dev 머신↔NAS 사설 mesh — SSH·CI runner·dev DB 등 내부 역량의 전송로.
- ② `curl -fsSL https://tailscale.com/install.sh | sh` → `sudo tailscale up`(OAuth 브라우저) → `tailscale status` 로 `modfolio-nas.<tailnet>.ts.net` 도달 확인. `scripts/ops/wsl-bootstrap.sh` stage [4/16] 이 안내.
- ③ 다운 시: mesh 차단→CF Access HTTPS 경로로 우회.

## 코어 서비스 어댑터 소비 맵

3대 코어 서비스를 누구든 같은 방식으로 소비한다. **taint class** 는 `lethal-trifecta.md` 정합용.

| core | 소비 경로 (어댑터) | auth | taint |
|---|---|---|---|
| **athsra** (secret) | CLI `athsra run <repo> -- <cmd>` · MCP `athsra_run` · Worker `/api/v1/secrets` | device-login(read)/master-pw(write)/Bearer | **private** |
| **connect** (SSO) | `@modfolio/connect-sdk`(npmjs) · OIDC PKCE · `/agent` 위임 토큰 | OIDC/PKCE · agent token | **private** (identity) |
| **pay** (billing) | `@modfolio/contracts/billing`(Balance/Debit/Entitlements) · 이벤트(`contracts/events`) | SSO + service key `mpsk_` | **outward** (money — `payment-safety.md`) |

⚠️ **OIDC discovery 위치(2026-06-28 실측)**: `login.modfolio.io/.well-known/openid-configuration` =
200. `connect.modfolio.io/.well-known/*` 및 `/sso/authorize` = 404. registry 의 derived `AuthEndpoints`
(connect.modfolio.io/sso/*)와 drift — connect 자율 검토(opinion routed, `feedback/modfolio-connect`).

## Provisioning 생명주기 이벤트 (infra↔universe 채널)

기존엔 infra 가 리소스를 provision 해도 알리는 **이벤트 채널이 없었다**(정적 ecosystem.json + 수동
동기뿐). `@modfolio/contracts/events` 에 3종 추가(producer = `modfolio-infra`, consumer = ecosystem
관제탑 미러):

- `platform.resource_provisioned` — 역량 리소스 생성(Forgejo repo/runner/DB 등)
- `platform.binding_updated` — 바인딩(시크릿 키·미러 URL 등) created/rotated/removed
- `platform.capability_status_changed` — 역량 health active/degraded 전이

권위는 여전히 infra IaC 상태 — 이벤트는 사후 동기 미러(앱은 강제 구독 아님).

## 이벤트 구독 선언 — `subscribesTo` (v1.1, producer→consumer 실배선)

관제탑의 **intended consumer**(`contracts/events/wiring.ts` 카탈로그)와 별개로, 이벤트가 "실제로
배선됐다"고 치는 유일한 기준은 **소비 repo 자신의 선언**이다 — adapter manifest 의 `subscribesTo:
string[]`(계약 이벤트 event_type 목록). 규칙:

- **정직 선언**: webhook 핸들러/queue subscriber 가 **실존할 때만** 선언한다. 의도만으로 선언하면
  gap 리포트가 거짓 green 이 된다 (ecosystem 자신도 동일 — platform.* consumer 를 아직 미배선이라
  선언하지 않음).
- **수집(hub-side)**: ecosystem 이 host-sibling layout 에서 각 repo 의 manifest 를 read-only 스캔 —
  CLI `bun run event-wiring`(리포트) / `--json`, MCP `event_wiring_gaps`(declared 인자 생략 시 자동
  스캔, 명시 입력 시 what-if 계산). 스캐너 = `scripts/lib/platform-adapter-scan.ts`. sibling 없는
  환경(원격 clone/CI)은 선언 0 baseline 으로 정직 표시.
- **identity 앵커 = 폴더**: manifest.repo ≠ 폴더명이면 이슈로 표시하고 폴더 기준 집계 (한 repo 가
  남의 배선을 선언 못 함). 계약에 없는 event_type 은 declared 에서 제외 + 오타/스테일로 표시.
- gap 해소는 언제나 **sibling 자율** — ecosystem 은 리포트/의견만 (Hub-not-enforcer).

## ai-stack lethal-trifecta 주의

NAS `ai-inference`(ai-stack)는 trifecta 3조건을 동시 충족할 수 있다: **untrusted**(모델 I/O) +
**private**(athsra secret) + **outward**(pay metering/email). 동시 충족 시 `lethal-trifecta.md`
정공법(명시 게이트 또는 plane 분리) 적용 — `human_approval_required` 또는 secret-read step 과
untrusted/outward step 의 agent 분리. 자율(cron) 모드에서 지출은 `payment-safety.md` 가 별도 하드 차단.

## ADR 정합

- **ADR-002 (100% CF Edge Native)**: Edge Runtime plane 은 불변. NAS 는 의도된 예외.
- **ADR-010 (self-hosted-infra-substrate)**: NAS substrate "존재" 의 면제 근거.
- **ADR-013 (platform-plane)**: 그 substrate 를 **전역 platform plane** 으로 운영화(역량 카탈로그 +
  어댑터 계약 + provisioning 이벤트). 본 canon 이 토폴로지 SoT. ⚠️ ADR-012(pkg.modfolio.io)는
  modfolio-infra repo 소유 — ecosystem `docs/adr/` 의 다음 번호는 013.

## 관련

- `nas-infra.md` — NAS 하드웨어/토폴로지/ops 상세 (substrate)
- `project-infrastructure-registry.md` — 앱별 4축(secret/email/domain/db) 표
- `tool-inventory.md` — universe 도구 SoT + `bun run verify:tools` 연결 검증
- `gh-actions-policy.md` v2.1 — GHA 전면 금지 → NAS Forgejo Actions
- `cf-deploy.md` — 배포 경로(CF Workers Builds, 본 평면 아님)
- `secret-store.md` · `billing-architecture.md` — athsra · pay 상세
- `.claude/rules/lethal-trifecta.md` · `payment-safety.md` — taint/지출 게이트
- 계약: `@modfolio/contracts/platform` (capability/adapter) · `@modfolio/contracts/events` (platform.*)
- `docs/adr/ADR-013-platform-plane.md` — 결정 기록
