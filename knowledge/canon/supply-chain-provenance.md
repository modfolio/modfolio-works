---
title: Supply-chain provenance — Trusted Publishing / Sigstore / GitHub Attestations
sync_to_siblings: true
applicability: always
version: 1.0.0
last_updated: 2026-04-22
consumers: ["modfolio-ecosystem", "modfolio-connect", "modfolio-contracts", "modfolio-connect-sdk"]
---

# Supply-chain provenance

npm 패키지 배포 경로에서 "소비자가 `이 tarball 이 정확히 저 workflow 에서 build 되었다`를 암호학적으로 검증" 할 수 있게 만드는 규칙. 2026-04 기준 기술 상태 + 우리 환경 제약 + 실제로 적용 가능한 최소 세팅을 기록한다.

## 3 축 — Trusted Publishing / Sigstore / Attestations

### 1) npm Trusted Publishing (registry 자동 인증)

- 2025-07-31 GA (GitHub Actions), 2026-01 GitLab, 2026-04-06 CircleCI 추가
- OIDC `id-token` exchange → short-lived npm token → `NPM_TOKEN` secret 불필요
- CLI: `npm publish` (v11.5.1+) 가 environment 감지하면 자동. `--provenance` 플래그 자동 부여
- **등록 필수**: npmjs.com 패키지 페이지 → "Trusted Publishers" → repo/workflow/environment 매핑

출처: [docs.npmjs.com/trusted-publishers](https://docs.npmjs.com/trusted-publishers/), [GitHub Changelog 2025-07-31](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)

### 2) Sigstore registry provenance (소비자 검증 경로 — npm 레지스트리)

- `npm publish --provenance` (또는 TP 활성화) 시 Sigstore Rekor 투명 로그에 attestation 업로드
- registry packument `.dist.signatures` + `.dist.attestations` 필드에 포함
- 소비자: `npm audit signatures [pkg]` 로 검증. `<registry>/-/npm/v1/keys` endpoint 에서 ECDSA 공개키 조회 후 대조
- **Private repo 제약**: "Provenance generation is not supported for private repositories, even when publishing public packages" (npm 공식 정책)

출처: [docs.npmjs.com/generating-provenance-statements](https://docs.npmjs.com/generating-provenance-statements/), [docs.npmjs.com/verifying-registry-signatures](https://docs.npmjs.com/verifying-registry-signatures/)

### 3) GitHub Artifact Attestations (소비자 검증 경로 — GitHub 자체)

- `actions/attest-build-provenance@v4` 가 tarball/OCI artifact 에 SLSA provenance 생성
- GitHub 자체 attestation store (Sigstore 기반, npm registry 와 독립)
- 소비자: `gh attestation verify <file> -R <org/repo>` 로 검증. offline 모드 (`--bundle`) 도 지원
- **Private repo 제약**: GitHub Enterprise Cloud 플랜 필요

출처: [docs.github.com/actions/security-for-github-actions/using-artifact-attestations](https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds), [cli.github.com/manual/gh_attestation_verify](https://cli.github.com/manual/gh_attestation_verify)

## 우리 환경에서 지금 가능한 것 / 불가능한 것

2026-04-22 실측 기준 3 축 전부 **적용 불가** 상태:

| 제약 | 실측 | 영향 |
|---|---|---|
| GitHub Packages (`npm.pkg.github.com`) 가 Sigstore provenance 미지원 | `curl https://npm.pkg.github.com/-/npm/v1/keys` → 404. `registry.npmjs.org` 같은 endpoint 부재 | `npm audit signatures` 경로 자체 불가 |
| npm Trusted Publishing 은 `registry.npmjs.org` 전용 | 공식 문서가 npmjs.org 만 언급 | GitHub Packages 소유자는 TP 설정 자체 불가 |
| `bun publish` 에 `--provenance` 플래그 부재 | `bun publish --help` (1.3.5) 에 없음. `oven-sh/bun#15601` OPEN (2026-04-14 업데이트) | provenance 필요 시 bun 이 아닌 `bunx npm publish --provenance` 우회 |
| Private repo 제약 | npm 공식 정책: private repo 에서 build 시 provenance 생성 안 됨 | public 전환 또는 Enterprise Cloud 가입 전 도입 불가 |
| GitHub Actions billing 차단 | 최근 publish workflow 6회 연속 실패 (`account payments have failed`) | CI publish 경로 자체 비활성. local `bun run publish:harness` 가 1차 |

## 지금 적용 가능한 최소 조치 (이 repo + 형제 repo)

### A. workflow 에 `id-token: write` 미리 선언

npmjs.org 이관 / Artifact Attestations 도입 시 permission-only diff 로 전환 가능하게 future-proof. 현재는 사용 안 됨.

```yaml
permissions:
  contents: read
  packages: write
  id-token: write   # future-proof: Trusted Publishing 이관 시 활성화
```

`.github/workflows/publish-harness.yml` / `publish-connect-sdk.yml` / `publish-contracts.yml` 세 워크플로우 동일 패턴 적용 (2026-04-22 commit).

### B. tarball 내용 + published metadata 확인 습관

```bash
# 업로드 전 내용 확인
bun run publish:harness -- --dry-run

# 업로드 후 메타데이터 확인 — dist.signatures / dist.attestations 필드 기대 (현재는 없음)
npm view @modfolio/harness --registry=https://npm.pkg.github.com --json | jq '.dist'
```

## 미래 도입 시나리오 (registry 이관 후)

### 전제 조건

1. Repo public 전환 OR GitHub Enterprise Cloud 가입 (provenance 생성 차단 해제)
2. npmjs.org 에서 `@modfolio` scope 등록 + 각 패키지별 Trusted Publisher 설정 (repo/workflow/environment 매핑)
3. 생태계 22개 repo 의 `.npmrc` 를 `@modfolio:registry=https://registry.npmjs.org` 로 migration (Hub-not-enforcer: 각 repo 자율 타이밍)
4. GitHub Actions billing 정상화 (CI publish 경로 재활성화)

### workflow 템플릿 (미래)

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write        # OIDC → npm Trusted Publishing
      attestations: write    # GitHub Artifact Attestations (optional second path)

    steps:
      - uses: actions/checkout@v4

      # bun 1.3.5 미지원 이슈 (oven-sh/bun#15601) 때문에 publish 는 npm CLI.
      # bun 은 runtime/dev 용으로 유지.
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Validate before publish (harness-publish orchestrator)
        run: bun run scripts/harness-publish.ts --validate-only

      - name: Publish with provenance (TP auto-auth)
        run: npm publish --access restricted
        # NPM_TOKEN 불필요 — OIDC exchange
        # --provenance 자동 (npm 11.5.1+ 에서 TP 감지 시 기본)

      - name: Attest build provenance (GitHub 자체 attestation)
        uses: actions/attest-build-provenance@v4
        with:
          subject-path: './modfolio-harness-*.tgz'
```

### 소비자 검증 (이관 후)

```bash
# 1) Registry provenance (Sigstore Rekor)
npm audit signatures @modfolio/harness

# 2) GitHub Artifact Attestation
npm pack @modfolio/harness
gh attestation verify modfolio-harness-<ver>.tgz \
  -R modfolio/modfolio-ecosystem \
  --signer-workflow "modfolio/modfolio-ecosystem/.github/workflows/publish-harness.yml"

# 3) predicate-type 명시 (SLSA v1)
gh attestation verify <file> -R <org/repo> \
  --predicate-type https://slsa.dev/provenance/v1
```

## 의사결정 체크리스트 (형제 repo 에 전파)

새 publish workflow 를 추가할 때 이 3가지를 판단:

1. **Registry 선택**: `npm.pkg.github.com` 인가 `registry.npmjs.org` 인가?
   - GitHub Packages → Trusted Publishing / provenance 불가. `id-token: write` 만 preempt.
   - npmjs.org → 전체 경로 활성화 가능 (repo public 전제).
2. **CLI 선택**: `bun publish` 인가 `npm publish` 인가?
   - provenance 불필요 → `bun publish` (빠름)
   - provenance 필요 → `bunx npm publish --provenance` 또는 setup-node + `npm publish`
3. **Repo visibility**: private 인가 public 인가?
   - private → provenance 자체 불가 (npm 정책)
   - public → TP + provenance 전부 활성화 가능

## 관련 파일

- [.github/workflows/publish-harness.yml](../../.github/workflows/publish-harness.yml)
- [.github/workflows/publish-connect-sdk.yml](../../.github/workflows/publish-connect-sdk.yml)
- [.github/workflows/publish-contracts.yml](../../.github/workflows/publish-contracts.yml)
- [scripts/harness-publish.ts](../../scripts/harness-publish.ts) — 향후 npm CLI 분기 시 수정 지점
- [knowledge/canon/adoption-debt-patterns.md](./adoption-debt-patterns.md) — 패턴 14 (bun 1.3.5 private tarball auth 부재) 관련
- [knowledge/canon/tech-trends-2026-04.md](./tech-trends-2026-04.md) — Trusted Publishing 리서치 초기 기록

## Sources

- [docs.npmjs.com/trusted-publishers](https://docs.npmjs.com/trusted-publishers/)
- [docs.npmjs.com/generating-provenance-statements](https://docs.npmjs.com/generating-provenance-statements/)
- [docs.npmjs.com/verifying-registry-signatures](https://docs.npmjs.com/verifying-registry-signatures/)
- [docs.npmjs.com/cli/v11/commands/npm-audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/)
- [github.blog/changelog/2025-07-31 — npm Trusted Publishing GA](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- [github.blog/changelog/2026-04-06 — npm TP supports CircleCI](https://github.blog/changelog/2026-04-06-npm-trusted-publishing-now-supports-circleci/)
- [docs.github.com — Artifact Attestations](https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds)
- [cli.github.com/manual/gh_attestation_verify](https://cli.github.com/manual/gh_attestation_verify)
- [oven-sh/bun#15601 — `bun publish --provenance`](https://github.com/oven-sh/bun/issues/15601) (OPEN 2024-12-05)
- [oven-sh/bun#22423 — bun publish OIDC](https://github.com/oven-sh/bun/issues/22423) (CLOSED 2025-09-07, disputed)
