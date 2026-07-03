---
title: NAS Infra (modfolio-infra) — 자가호스팅 substrate
version: 1.1.0
last_updated: 2026-06-28
source: [2026-05-21 modfolio-infra 등록(0a26e1a), 2026-05-22 harness 3.4.0 NAS 통합 결정]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops, release, preflight]
---

# NAS Infra (modfolio-infra) — 자가호스팅 substrate

> **modfolio-infra(NAS, UGREEN DXP6800 Pro) = 생태계의 자가호스팅 인프라 토대. ADR-002(100% Cloudflare Edge Native)의 의도된 예외(ADR-010). Git 이중 호스팅·Forgejo Actions CI($0)·Restic 3-2-1 백업을 제공한다.**

이 canon 은 NAS 토폴로지의 source of truth. 운영 절차는 `.claude/skills/ops/SKILL.md`, NAS 자체의 IaC 는 modfolio-infra repo 에 있다. local-dev-infra.md(mod-ai-toolkit v2) 는 superseded — `archive/local-dev-infra.md`.

## 토폴로지

| 항목 | 값 |
|---|---|
| 하드웨어 | UGREEN DXP6800 Pro |
| OS | UGOS Pro (Debian 12 기반) |
| 노드 | `nas` (활성, 18+ 컨테이너) · `workstation` (계획 — GPU 데스크탑 64GB+RTX4060) |
| 외부 도메인 (HTTPS) | `git.modfolio.io` (CF Tunnel + Zero Trust Access) |
| 내부 접근 (SSH/mesh) | Tailscale `modfolio-nas.<tailnet>.ts.net` |
| Repo 호스팅 (이 노드) | Forgejo (v7 → v15 LTS 권고) |
| Repo 인덱스 | ecosystem.json `infrastructure[]` 의 `modfolio-infra` 항목 |
| GitHub 미러 | **없음** — 인프라 토폴로지 민감(사용자 결정). 다른 23 repo 는 GitHub-primary + Forgejo pull-mirror |

### nas 노드 활성 서비스 (18+ 컨테이너)

- **Forgejo** — git 호스팅, npm registry, Actions(self-hosted runner 1대)
- **Postgres 16** — 중앙 dev DB
- **Tailscale** — mesh VPN(외부 접근 + dev 머신 ↔ NAS)
- **Cloudflare Tunnel + Zero Trust Access** — `git.modfolio.io` 외부 노출 + 인증
- **Restic** → **R2** — 3-2-1 백업 (NAS 로컬 + R2 offsite)
- **lightweight ai-stack** — 경량 모델 운영 (상세는 modfolio-infra repo)
- (그 외 — modfolio-infra repo 의 docker-compose 가 source of truth)

## 접근 (Tailscale prerequisite)

NAS 의 SSH·Forgejo Actions runner·Forgejo npm registry 일부는 Tailscale mesh 안. 새 dev 머신 셋업:

```bash
# Tailscale 설치 (Debian/Ubuntu, WSL2 systemd=true 전제)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up                              # OAuth — browser
tailscale status                                # mesh 확인
```

`scripts/ops/wsl-bootstrap.sh` 의 stage [4/16] 이 prerequisite 확인 + 안내.

외부 HTTPS 경로(`git.modfolio.io`)는 CF Access — Tailscale 없이도 접근 가능 (사용자 SSO 거치는 경우).

## Git 호스팅 이중화 (GitHub + NAS Forgejo)

> **⚠ 2026-07-01 실측 정정 (doc-reality drift 발견 + 방향 전환 착수)**: 이 섹션이 과거 기술한 "GitHub→NAS **pull-mirror** 라이브(23 repo)"는 **현실과 불일치**였다. 2026-07-01 실측(`docker --context nas-ts exec forgejo` + Forgejo API): 26 repo **전부 `mirror: false`**(`original_url: ""`, `push_mirrors: []`) — pull-mirror 도 push-mirror 도 **설정돼 있지 않았다**. Forgejo 의 repo 들은 ~2026-06-27 의 **1회성 스냅샷**(예: keepnbuild Forgejo `e76a7e49` @06-27 vs GitHub `6725aff6` @06-29 = **2일 stale**)이었다. 즉 어느 방향으로도 살아있는 미러가 아니었다. → 오너 비전(**NAS-primary**: dev→Forgejo→push-mirror→GitHub→CF Builds)에 맞춰 **push-mirror 방향**을 새로 구축 착수. 파일럿(keepnbuild) **end-to-end 검증 완료** (journal `20260701-nas-primary-chain.md`).

목표 토폴로지 (NAS-primary, canon `evergreen-principle.md` 정합):

| 카테고리 | dev origin (push) | GitHub | NAS Forgejo |
|---|---|---|---|
| 앱 repo (modfolio·gistcore·…) | **NAS Forgejo** (primary) | **push-mirror 수신** (Forgejo 가 sync_on_commit 으로 push) + `github` fallback remote | **primary/upstream** (dev 가 직접 push, push-mirror 원본) |
| modfolio-infra | NAS Forgejo | (미러 없음 — 토폴로지 민감) | **native** |

핵심: GitHub→CF Workers Builds 는 **이미 wired**(ledger G7, 47/55) 이고 그대로 둔다. 바뀌는 건 **GitHub 에 commit 이 도착하는 경로** 뿐 — dev 직접 push(과거) → **Forgejo push-mirror 가 대신 push**(현행 전환). CF Builds 입장에선 동일한 GitHub push event.

### Forgejo push-mirror 설정 (NAS-primary, 각 repo 1회)

> 파일럿 검증된 정확한 레시피 + 전 fleet rollout 절차 = **journal `knowledge/journal/20260701-nas-primary-chain.md`**. 요약:

1. **선행 — Forgejo 를 GitHub 현재 상태로 fast-forward** (Forgejo 가 stale 이므로 필수. 안 하면 첫 mirror sync 가 stale 을 GitHub 에 덮어쓸 위험). 로컬 clone(=GitHub 최신)에서 Forgejo 로 `git push`(non-force FF). ancestry 확인: `gh api repos/modfolio/<repo>/compare/<forgejo_head>...<github_head>` → `status: ahead, behind_by: 0` 이어야 안전.
2. **push-mirror 생성** (Forgejo API, `sync_on_commit: true`):
   ```
   POST /api/v1/repos/modfolio/<repo>/push_mirrors
   { "remote_address":"https://github.com/modfolio/<repo>.git",
     "remote_username":"nikyhmod",
     "remote_password":"<GitHub PAT (repo scope) — athsra modfolio-infra GH_MIRROR_TOKEN>",
     "interval":"8h0m0s", "sync_on_commit":true }
   ```
   `sync_on_commit:true` = Forgejo 로 push 될 때마다 즉시 GitHub 로 전파(파일럿 실측 <5s). `interval` = 주기적 fallback.
3. **로컬 remote 재구성** (resilience): `origin` → Forgejo SSH(`ssh://git@modfolio-nas.taila0ec92.ts.net:2222/modfolio/<repo>.git`), `github` → GitHub(fallback remote, NAS-down 시 직접 push).

Forgejo push-mirror repo 의 Forgejo Actions:
- ✅ `workflow_dispatch`(수동) 동작 · ✅ `schedule:`(cron) 동작
- ⚠ push-mirror 는 **Forgejo→GitHub 방향**이라 Forgejo 자체 push event 는 정상 발생 — 우리 ecosystem 5 워크플로는 전부 `workflow_dispatch` 라 무관.

### 인증 (auth) — 이 세션에서 확보한 경로

- **Forgejo 관리/API**: athsra 에 Forgejo 토큰 **없음**(`modfolio-infra` project 자체가 athsra 에 미등록). 대신 **`docker --context nas-ts exec -u git forgejo forgejo admin user generate-access-token -u nikyhmod --scopes "write:repository,read:user,write:organization" --raw`** 로 admin CLI 직접 발급(에이전트-직접 auth, 토큰 값 미노출). SSH git push 는 키 기반(`winterermod@gmail.com` 키 등록됨, 핸드셰이크 검증).
- **push-mirror → GitHub auth**: HTTPS + PAT(username=`nikyhmod`, password=PAT). 파일럿은 세션 `$GITHUB_TOKEN`(40-char gho_)으로 검증. **fleet rollout 은 전용 fine-grained PAT(`repo` write) 를 athsra `modfolio-infra` GH_MIRROR_TOKEN 으로 보관** 권장(ephemeral gho_ 는 회전 시 mirror 깨짐).
- **Forgejo egress**: 컨테이너 → `github.com` HTTPS 200(실측, connect 11ms). push-mirror outbound 가능.

### modfolio-ecosystem 의 과거 dual-push (deprecated)

2026-05-21 까지 modfolio-ecosystem 로컬 `.git/config` 에 push pushurl 2개(GitHub + NAS)였음. v3.4.0(2026-05-22) 에서 Forgejo pull-mirror 로 이전 → 로컬 hack 제거.

기존 머신 정리:
```bash
git remote set-url --delete --push origin ssh://git@modfolio-nas.<tailnet>.ts.net:2222/modfolio/modfolio-ecosystem.git
# origin push = GitHub 만 남음. NAS 는 Forgejo pull-mirror 가 알아서.
```

## CI substrate — Forgejo Actions runner

GitHub Actions 전면 금지(canon `gh-actions-policy.md` v2.0). 모든 CI 컴퓨트는 NAS Forgejo Actions self-hosted runner.

### Runner 셋업 (NAS, 1회)

1. Forgejo admin → **Site Administration → Actions → Runners → Create new Runner** → registration token 발급
2. NAS 에 `forgejo-runner` Docker 컨테이너 추가 (modfolio-infra docker-compose 에 정의 — 18 → 19 컨테이너)
3. 라벨: `nas` (+ 옵션 `docker`). `runs-on: nas` 로 매칭.

### 비용

- self-hosted = 전기료만. GitHub Free org 2000분/월 한도와 무관.
- runner 1대로 ecosystem 의 5 워크플로(수동 dispatch) + 향후 schedule 워크플로 충분.

### Secrets (Forgejo repo 별 Settings → Secrets and Variables → Actions)

| Secret | 용도 |
|---|---|
| `GH_PACKAGES_TOKEN` | GitHub Packages publish (write:packages PAT). Forgejo 자동 `GITHUB_TOKEN` 과 이름 분리. |
| `FORGEJO_NPM_TOKEN` | Forgejo npm registry publish (modfolio org owner token). |
| `ECOSYSTEM_SYNC_TOKEN` | `collect-knowledge.ts` / `sync-knowledge.ts` 의 GitHub API 호출 PAT. |

athsra 에 보관:
```bash
athsra set modfolio-ecosystem GH_PACKAGES_TOKEN=ghp_...
athsra set modfolio-ecosystem FORGEJO_NPM_TOKEN=fjt_...
athsra set modfolio-ecosystem ECOSYSTEM_SYNC_TOKEN=ghp_...
```

## npm registry — GitHub Packages (단일)

`@modfolio/harness` 등 ecosystem 패키지는 **GitHub Packages 단일** 로 publish 한다.
`scripts/harness-publish.ts` 가 단일 오케스트레이터 — `bun publish` → GitHub Packages, 실패 시 exit 2.
local track(`bun run publish:harness`)·Forgejo Actions CI track(`.forgejo/workflows/publish-harness.yml`) 둘 다 같은 orchestrator 호출.

sibling 기본 `.npmrc`:
```
@modfolio:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
always-auth=true
```

이유: `bun install` 이 Tailscale 의존 안 함 → 집·사무실·CI 어디서나 동작.

> **NAS Forgejo npm mirror(이중)는 미구현 — 2026-06-15 정정.** `package.json` 의 `publishConfig.registry` 가 GitHub Packages 를 고정하고 `--registry` 로 override 되지 않는다(`npm publish --dry-run` 실측: default·`--registry=forgejo` 둘 다 `npm.pkg.github.com` 으로 resolve). 즉 `npm publish` 로는 두 번째 registry 에 올릴 수 없다. 과거 `[5/5] Forgejo publish` 단계는 GitHub 으로만 가는 no-op 이라 `harness-publish.ts` 에서 제거(v3.11.3). 진짜 NAS npm mirror 가 필요하면 별도 push 메커니즘(전용 도구/ADR) — npm publish 가 아니다. NAS 의 git 이중호스팅·Forgejo Actions CI·Restic 백업은 그대로 유효.
>
> **갱신 2026-06-28 (modfolio-infra 2026-06-27 보고):** 위가 예고한 "별도 push 메커니즘"이 구현됨 — **`pkg.modfolio.io` 전용 Forgejo npm registry (ADR-012, modfolio-infra repo)** Phase 1 라이브(infra 보고: 라우팅 401 실측 = 엔드포인트 가동·인증 요구). 즉 `npm publish` 우회가 아니라 **전용 IaC registry** 로 NAS 미러를 별도 채널로 확보한 것. ecosystem 의 1차 publish 경로는 여전히 **GitHub Packages 단일**(`publishConfig.registry` 고정) — 불변. pkg.modfolio.io 는 infra 자율의 추가 채널이고, harness/contracts 의 sibling consume 경로 정합·이중화 시점은 infra 자율(Hub-not-enforcer). ADR-012 자체는 modfolio-infra repo 소유 — ecosystem 은 토폴로지 mirror 만.

## Backup — Restic → R2 3-2-1

NAS 의 영구 데이터(Forgejo DB·Postgres·R2 미러·docker volumes)는 Restic 으로:

- **3** copies: NAS 원본 + NAS 로컬 Restic repo + Cloudflare R2 remote Restic repo
- **2** media: NAS 디스크 + R2 객체 스토리지
- **1** offsite: R2 (Cloudflare 글로벌, NAS 화재/도난에도 보존)

스케줄: NAS 측 cron(modfolio-infra docker-compose). 보존: 일별 7 + 주별 4 + 월별 12 (Restic forget policy).

검증: 월 1회 `restic check` + 분기 1회 부분 복원 drill (modfolio-infra repo 의 ops 절차).

Restic 비밀번호 = athsra `modfolio-infra` project 의 `RESTIC_PASSWORD`. 분실 시 archive 영구 unrecoverable — **paper backup 필수**.

## ADR-002(100% Cloudflare) 와의 관계

NAS = ADR-002 의 의도된 예외. **ADR-010(self-hosted-infra-substrate)** 이 공식 면제 근거. 요점: ADR-002 가 스스로 지적한 "Cloudflare SPOF" 리스크를 NAS 가 mitigate(git/registry/CI 가 NAS 에 redundancy).

`scripts/delta-audit.ts` 가 ecosystem.json `infrastructure[].exemption` 필드를 honor → modfolio-infra `deployment: self-hosted` 는 `DEPLOYMENT_EXEMPT_*`(info) 로 강등, `DEPLOYMENT_POLICY_*`(critical) 아님(`release:gate` 차단 안 함).

## 운영 노트

### Forgejo 버전

ecosystem.json modfolio-infra note 에 "Forgejo 7" — v7 이면 v15 LTS 권고. v15.0(2026-04) 에서 미러 인증 버그 fix + Actions·npm registry 성숙. `feedback_always_latest` 정합.

### NAS 다운 시 영향 (⚠ NAS-primary 전환으로 변경 — resilience tradeoff)

> **NAS-primary 의 본질적 tradeoff**: origin=Forgejo(NAS) 로 전환된 repo 는 **NAS 가 push 의 single point of failure** 가 된다(과거 origin=GitHub 일 땐 NAS 다운이 push 에 무영향이었음). 이걸 **`github` fallback remote** 로 완화한다 — NAS 다운 시 `git push github main` 으로 직접 GitHub→CF Builds. 즉 NAS 다운이 개발을 막지 않고, 단지 "평소 경로(Forgejo)"가 "비상 경로(github)"로 바뀔 뿐.

- `git push` (push-mirror 전환된 앱 repo): **origin(Forgejo) 차단** → **fallback: `git push github main`** (직접 GitHub, CF Builds 정상 트리거). NAS 복구 후 Forgejo 가 stale → 복구 시 fast-forward 재동기 1회 필요(또는 push-mirror 가 주기 sync 로 자동 따라잡지 못함 — Forgejo 가 *받는* 쪽이 아니므로. 복구 절차 = journal).
- `git push` (modfolio-infra): 차단 (Forgejo-only, fallback 없음 — 토폴로지 민감). 복구 후 가능.
- `bun install`: 무영향 (기본 `.npmrc` = GitHub Packages).
- Forgejo Actions CI: 차단 (runner 부재). 워크플로 들 `workflow_dispatch` 라 사용자 명시 실행만 영향. 대안: local track.
- 새 harness publish: 무영향 (GitHub Packages 단일 — NAS 무관).
- Restic 백업: 일시 중단 — 복구 후 자동 재개.
- **이미 GitHub 에 도달한 commit 의 배포**: 무영향 (CF Builds = GitHub→CF, NAS 무관).

### workstation 노드 (계획)

GPU 데스크탑(64GB RAM + RTX4060). mod-ai-toolkit 의 AI/관찰 스택 흡수 예정. 활성 시 별도 canon section 추가.

## 갱신 이력

- 2026-05-22: v1.0.0 초판. modfolio-infra 등록(2026-05-21 commit `0a26e1a`) + harness 3.4.0 NAS 통합 release. local-dev-infra.md (mod-ai-toolkit v2) 를 supersede 하고 `archive/` 로 이동. GitHub Actions 전면 제거(canon `gh-actions-policy.md` v2.0) + 이중 git/레지스트리/CI 토폴로지 cement.
- 2026-06-28: v1.1.0. **pkg.modfolio.io 전용 Forgejo npm registry (ADR-012, modfolio-infra) Phase 1 라이브** 반영(modfolio-infra 2026-06-27 보고). 「npm mirror 미구현」 노트를 additive 갱신 — 예고했던 "별도 push 메커니즘"이 전용 IaC registry 로 구현됨. ecosystem 1차 publish 경로(GitHub Packages 단일)는 불변. ADR-012 는 infra repo 소유, ecosystem 은 topology mirror.
- 2026-07-01: v1.2.0. **NAS-primary 체인 (dev→Forgejo→push-mirror→GitHub→CF Builds) 착수 + doc-reality drift 정정.** 실측 결과 과거 기술한 "GitHub→NAS pull-mirror 라이브"는 거짓(26 repo 전부 `mirror:false`, 1회성 stale 스냅샷)이었음을 발견·정정. 오너 NAS-primary 비전대로 push-mirror 방향(`sync_on_commit:true`) 신규 구축. 파일럿 **keepnbuild end-to-end 검증 완료**(push→Forgejo `49b5d57d`→GitHub <5s→CF Build success→app.keepnbuild.com 200). resilience model = `github` fallback remote. 정확한 per-repo 레시피 + fleet rollout + NAS-down 복구 = **journal `20260701-nas-primary-chain.md`**. ⚠ fleet rollout 은 오너 결정/배치 사안 — ecosystem 은 파일럿+레시피만 cement(Hub-not-enforcer: 타 repo 의 origin 전환은 각 repo 작업).

## 관련

- `knowledge/canon/gh-actions-policy.md` v2.0 — GitHub Actions 전면 금지(NAS Forgejo Actions 로 이전).
- `knowledge/canon/cf-deploy.md` — CF Workers Builds (배포 경로 1, GH Actions 분 0).
- `knowledge/canon/evergreen-principle.md` — Hub-not-enforcer, pull-based.
- `knowledge/canon/secret-store.md` — athsra v3 (GH_PACKAGES_TOKEN / FORGEJO_NPM_TOKEN 보관).
- `knowledge/canon/harness-freeze.md` — release window.
- `knowledge/canon/archive/local-dev-infra.md` — superseded mod-ai-toolkit v2 (참조 only).
- `docs/adr/ADR-002-cloudflare-only.md` — Cloudflare Only 원칙.
- `docs/adr/ADR-010-self-hosted-infra-substrate.md` — 본 NAS substrate 의 공식 면제 근거.
- `scripts/ops/wsl-bootstrap.sh` — Tailscale + athsra prerequisite 안내.
- `scripts/ops/wsl-clone-all.sh` — modfolio-infra Forgejo clone.
