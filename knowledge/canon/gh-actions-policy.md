---
title: GitHub Actions — 전면 금지 (CI 는 NAS Forgejo Actions, $0)
version: 2.0.0
last_updated: 2026-05-22
source: [2026-05-22 사용자 결정 — "gh actions 를 안 쓰고 무료로 구축" + modfolio-infra(NAS) substrate 활용]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops, release]
---

# GitHub Actions — 전면 금지

> **CI/cron/publish 전부 GitHub Actions 외 경로로. GitHub 은 git 호스팅 + Packages 레지스트리(둘 다 무료, Actions 분 무관)로만 사용. CI 컴퓨트는 NAS Forgejo Actions self-hosted runner = $0.**

## 결정 (v2.0, 2026-05-22)

2026-05-22 사용자 명시 결정 + modfolio-infra(NAS) substrate 등록을 계기로 **v1.0 의 "최소화" 에서 "전면 금지" 로 강화**. GitHub Actions 유료 분(2000분/월 Free org 한도)이 빨리 소진되는 문제를 정공법으로 해소 — 자동/수동 분리 minimization 이 아니라 **컴퓨트 자체를 NAS 로 이전**.

### 핵심 분리

| 자원 | 위치 | 비용 |
|---|---|---|
| **GitHub Actions 컴퓨트** | (사용 안 함) | ❌ 금지 |
| Git 호스팅 | GitHub.com (24 repo) + NAS Forgejo pull-mirror | 무료 |
| npm 레지스트리 | GitHub Packages + Forgejo npm registry(이중) | 무료 (Actions 분 무관 — local/runner publish) |
| CI 컴퓨트 | NAS Forgejo Actions self-hosted runner | $0 (전기료만) |
| 배포 | CF Workers Builds (push-to-deploy) | 무료 (CF 자체 build infra — GH Actions 무관, `cf-deploy.md`) |
| cron | CF Cron Triggers + Forgejo Actions schedule | 무료 |

## ecosystem 자체 적용 (2026-05-22 시행 완료)

- `.github/workflows/` 5개(`publish-harness`·`publish-connect-sdk`·`publish-contracts`·`collect-knowledge`·`sync-ecosystem`) **전부 삭제**.
- `.forgejo/workflows/` 5개 등가물로 이전 — `runs-on: nas`(NAS self-hosted runner 라벨), secrets 동일 문법, primary publish 경로는 여전히 local track(`bun run publish:harness`).
- `templates/github-actions/` 삭제 — 멤버에 GHA verify 워크플로 전파하던 벡터 차단.
- `.github/` 디렉토리 자체 제거 (Dependabot 등 GHA 무관 GitHub-native 기능은 필요 시 재추가).

## 멤버 repo 적용 가이드

ecosystem 은 강제하지 않음(Hub-not-enforcer). 권고:

### Must (적용 권고)

- 신규 워크플로를 `.github/workflows/` 에 추가하지 말 것. 필요 시 `.forgejo/workflows/`.
- 기존 deploy 워크플로 → CF Workers Builds 로 이관(`cf-deploy.md`).
- 기존 cron 워크플로 → CF Cron Triggers 또는 Forgejo Actions schedule(자체 runner 라벨 있을 때).
- 기존 PR 품질 게이트(lint/typecheck/test)는 dev-machine local 실행 또는 Forgejo Actions(자체 runner 있을 때) 으로 이전. 즉시 이전 불가하면 `harness-backlog.md` 에 기록.

### May (선택)

- Forgejo Actions runner 가 자기 repo 에 라벨 매칭되는 게 없으면(흔함 — runner 는 NAS에 1대) Forgejo CI 도 dormant 상태로 둠. CF Workers Builds + local 검증으로 충분한 경우가 다수.

### Must Not

- 새 `.github/workflows/*.yml` 생성 금지. 어떤 트리거(push/schedule/workflow_dispatch)든.
- `templates/github-actions/` 부활 금지.
- `bun publish` / CF deploy 를 GitHub Actions runner 에서 실행 금지 — local track 또는 Forgejo Actions runner.

## GitHub-native 무료 기능 (Actions 무관 — 허용)

| 기능 | 비용 | 비고 |
|---|---|---|
| Dependabot PR | 무료 (Actions 분 무관) | 의존성 업데이트 PR — 사용 권장 |
| GitHub Packages (npm 레지스트리) | 무료 (storage 500MB / bandwidth 1GB-월 Free 한도) | harness consume primary 경로 |
| GitHub Issues / PR / Discussions | 무료 | 협업 용 |
| GitHub OAuth (`gh auth login`) | 무료 | CLI 접근 |
| `gh api` (REST/GraphQL) | 무료 (5000 req/h authenticated) | `collect-knowledge.ts` 등이 사용 |
| Secret scanning (push protection) | 무료 (Free org public/private) | 노출 방지 |

이들은 GitHub Actions 컴퓨트와 별도 — 사용해도 분 소모 없음.

## CodeQL / 기타 Actions-소비 기능

- **CodeQL 정적 분석**: Free org private repo 에서 Actions 분 소비 → **금지**. 대안: dev-machine `semgrep` / `bunx --bun audit` / Forgejo Actions runner 의 CodeQL CLI 직접 실행.
- **기타 Marketplace action 자동 실행**: 전부 금지(Actions 분 소비). 같은 action 을 Forgejo Actions runner 에서 실행하는 건 가능(self-hosted = $0).

## 이관 체크리스트 (멤버 repo)

- [ ] `.github/workflows/*.yml` 전부 식별 — 트리거(`on:`) 정리표 작성.
- [ ] deploy 워크플로 → CF Workers Builds 로 이관(`cf-deploy.md` 경로 1).
- [ ] cron 워크플로 → CF Cron Triggers(앱 Worker 의 `triggers.crons`) 또는 Forgejo Actions schedule.
- [ ] CI/test 워크플로 → 옵션 A) local 실행 + `pre-push-guard` / 옵션 B) `.forgejo/workflows/` + NAS runner 라벨.
- [ ] 1주일 병행 검증 후 `.github/workflows/*.yml` 삭제.
- [ ] `harness-backlog.md` 에 진행 상황 기록 (선택).

## 검증 (정기)

- ecosystem audit (`bun run audit:delta`) 가 `.github/workflows/` 존재를 자동 감지 → `POLICY_GHA_WORKFLOW_PRESENT` warning(v3.4.0+, `scripts/delta-audit.ts`).
- 멤버 repo 는 자체 점검 — 발견 시 위 체크리스트 적용.

## 예외 (좁게)

다음만 예외 인정 — 그 외 전부 금지:

1. **NAS/Tailscale 장기 장애 시 일회성 fallback** — 명시적·일시적·문서화된 비상 경로. 평상시 사용 X. 완료 후 `.github/workflows/` 즉시 삭제.
2. **외부 보안 incident 대응** — Dependabot 자동 PR 의 follow-up CI 가 필요한 1회 case(거의 안 발생).

예외 사용 시 commit 메시지에 사유 명시 + journal 기록.

## 갱신 이력

- 2026-04-17: v1.0.0 초판. "최소화" 정책 — deploy/cron 금지, CI 품질 게이트/외부 패키지 게시만 허용.
- 2026-05-22: v2.0.0. **전면 금지로 강화**. 사용자 결정("gh actions 안 쓰고 무료로 구축") + modfolio-infra NAS substrate 활용. ecosystem `.github/workflows/` 5개·`templates/github-actions/` 2개 전부 삭제, `.forgejo/workflows/` 로 이전. CI 컴퓨트 = NAS Forgejo Actions self-hosted runner = $0. canon 제목 "최소화 정책" → "전면 금지".

## 관련

- `knowledge/canon/cf-deploy.md` — CF Workers Builds(배포 경로 1, GH Actions 분 0) + 비대화형 wrangler v4.
- `knowledge/canon/nas-infra.md` (v3.4.0+) — NAS 토폴로지 + Forgejo Actions runner / npm registry 운영.
- `knowledge/canon/harness-freeze.md` — release window 결정 규칙.
- `scripts/delta-audit.ts` — `.github/workflows/` 잔존 자동 감지(v3.4.0+).
