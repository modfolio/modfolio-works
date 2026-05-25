---
title: NAS Infra (modfolio-infra) — 자가호스팅 substrate
version: 1.0.0
last_updated: 2026-05-22
source: [2026-05-21 modfolio-infra 등록(0a26e1a), 2026-05-22 harness 3.4.0 NAS 통합 결정]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops, release, preflight]
---

# NAS Infra (modfolio-infra) — 자가호스팅 substrate

> **modfolio-infra(NAS, UGREEN DXP6800 Pro) = 생태계의 자가호스팅 인프라 토대. ADR-002(100% Cloudflare Edge Native)의 의도된 예외(ADR-010). Git 이중 호스팅·Forgejo Actions CI($0)·Forgejo npm registry(이중)·Restic 3-2-1 백업을 제공한다.**

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

24 개 repo 토폴로지 (canon `evergreen-principle.md` 정합):

| 카테고리 | GitHub | NAS Forgejo |
|---|---|---|
| 23 repo (modfolio·gistcore·…) | **primary** (push/fetch origin) | **pull-mirror** (Forgejo 가 GitHub 에서 서버측 동기) |
| modfolio-infra | (미러 없음) | **native** (push/fetch — 토폴로지 민감 사용자 결정) |

### Forgejo pull-mirror 설정 (NAS 측, 각 repo 1회)

Forgejo UI → 새 repo 생성 → "Migrate" → URL = `https://github.com/modfolio/<repo>.git` → "This repository will be a mirror" 체크 → sync 주기(기본 8h, `15m`/`1h` 권고).

장점:
- 재현 가능 — dev 머신 `.git/config` 에 hack 불필요 (이전 dual-push 의 fragility 해소)
- NAS 다운에도 dev `git push` 무영향 (origin = GitHub)
- 재clone 에도 살아남음 — `wsl-bootstrap.sh` 가 GitHub origin 만 clone, 미러는 NAS 가 알아서

미러 repo 의 Forgejo Actions:
- ✅ `workflow_dispatch`(수동) 동작
- ✅ `schedule:`(cron) 동작
- ❌ `push:` — 미러 sync 의 자동 토큰 push 는 workflow trigger 안 됨(Forgejo 무한루프 회피 정책)
- 우리 ecosystem 5 워크플로 전부 `workflow_dispatch` — 미러 위에서 정상 작동

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

## 이중 레지스트리 — Forgejo npm registry

`@modfolio/harness` 등 ecosystem 패키지는 두 곳에 publish:

1. **GitHub Packages** (`https://npm.pkg.github.com`) — primary consume 경로, sibling 기본 `.npmrc`
2. **Forgejo npm registry** (`https://git.modfolio.io/api/packages/modfolio/npm/`) — best-effort redundant copy

### Publish 메커니즘

`scripts/harness-publish.ts` 가 단일 오케스트레이터:
- `[4/5]` GitHub Packages publish — primary. 실패 시 exit 2.
- `[5/5]` Forgejo registry publish — best-effort. `FORGEJO_NPM_TOKEN` 없거나 NAS 도달 실패 시 warn 후 exit 0.

local track(`bun run publish:harness`)·Forgejo Actions CI track(`.forgejo/workflows/publish-harness.yml`) 둘 다 같은 orchestrator 호출.

### Consume 전략 — sibling `.npmrc`

기본 = GitHub Packages 단일:
```
@modfolio:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

이유: `bun install` 이 Tailscale 의존 안 함 → 집·사무실·CI 어디서나 동작. Forgejo 는 redundancy / NAS-resident 컨텍스트(modfolio-infra) 용.

NAS-resident sibling(modfolio-infra) 또는 명시적 Forgejo 선호 시 override:
```
@modfolio:registry=https://git.modfolio.io/api/packages/modfolio/npm/
//git.modfolio.io/api/packages/modfolio/npm/:_authToken=${FORGEJO_NPM_TOKEN}
```

### Forgejo npm registry token 생성

Forgejo UI → org `modfolio` 선택 → **Settings → Packages → Access Tokens** → `package:read` + `package:write` scope → token 발급. athsra 에 보관.

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

### NAS 다운 시 영향

- `git push` (다른 23 repo): 무영향 (origin=GitHub).
- `git push` (modfolio-infra): 차단 (Forgejo-only). 복구 후 가능.
- `bun install`: 무영향 (기본 `.npmrc` = GitHub Packages).
- Forgejo Actions CI: 차단 (runner 부재). 워크플로 들 `workflow_dispatch` 라 사용자 명시 실행만 영향. 대안: local track.
- 새 harness publish: GitHub Packages 만 성공(primary), Forgejo `[5/5]` SKIP/warn — release 성립.
- Restic 백업: 일시 중단 — 복구 후 자동 재개.

### workstation 노드 (계획)

GPU 데스크탑(64GB RAM + RTX4060). mod-ai-toolkit 의 AI/관찰 스택 흡수 예정. 활성 시 별도 canon section 추가.

## 갱신 이력

- 2026-05-22: v1.0.0 초판. modfolio-infra 등록(2026-05-21 commit `0a26e1a`) + harness 3.4.0 NAS 통합 release. local-dev-infra.md (mod-ai-toolkit v2) 를 supersede 하고 `archive/` 로 이동. GitHub Actions 전면 제거(canon `gh-actions-policy.md` v2.0) + 이중 git/레지스트리/CI 토폴로지 cement.

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
