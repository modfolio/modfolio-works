---
name: ops
description: 시크릿 관리, 계정 전략, 이메일 운영 가이드
user-invocable: true
---


# Skill: 운영 — 시크릿, 계정, 이메일

생태계 운영 관련 시크릿 관리, 계정 전략, 이메일 설정.

## 시크릿 관리 (2026-04-25 v2 — universe-wide dotenvx)

- **원칙**: 시크릿은 **각 repo 가 독립 관리**한다. dev = **dotenvx** (파일 기반 public-key 암호화 `.env` + `.env.keys` 1Password 백업), prod = **Cloudflare Workers Secrets / Pages env / Secret Store** 네이티브 경로. 두 경로는 별개.
- **dotenvx (universe-wide 표준, applicability: always)**: 각 repo 의 `.env` 를 public-key 암호화해 git commit, `.env.keys` (private) 는 gitignore + 1Password 백업. 각 repo 가 자기 시점에 자율 이관 (canon `secrets-dotenvx` v2.0+). 도입 버전 pin: `@dotenvx/dotenvx@1.61.5`.
- **Doppler (deprecated 2026-04-25)**: 과거 표준이었음. 현재 universe 모든 repo 가 dotenvx 로 전환 대상. 새 repo 는 도입 금지. 잔존 미전환 repo 는 `scripts/ops/dotenvx-migrate-from-doppler.sh` 로 이관. 진행 상태는 `ecosystem.json.secretsMigration` 추적.
- **Workers Secrets (prod 런타임)**: 개별 Worker/서비스에 귀속된 프로덕션 시크릿. dotenvx 범위 밖 — 빌드·배포 CLI 시점에만 dotenvx, runtime 은 native binding.
- **로컬 개발**: dotenvx 채택 repo: `bunx --bun dotenvx run -f .env -- bun dev`. 잔존 Doppler repo: `doppler run -- bun dev`.
- **프로덕션**: CF Workers / Workers Builds 환경변수 또는 secret store 에 직접 주입.
- **원칙**: 시크릿은 절대 코드에 평문 commit 하지 않는다. dotenvx 는 **암호화된 상태로만** commit.

### dotenvx 시크릿 관리 — user-invocable

사용자가 `/ops dotenvx init` 또는 `/ops dotenvx migrate` 같은 phrase 로 호출 시:

- **init** — 새 repo 에서 `.env` 시작 (plaintext 작성 → `dotenvx encrypt` → 1Password 백업 또는 helper `backup-env-keys.sh`)
- **migrate** — 기존 Doppler 프로젝트를 dotenvx 로 일괄 이관 (`scripts/ops/dotenvx-migrate-from-doppler.sh <project> <config>`)
- **rotate** — 공개 키 로테이션 절차 (canon `secrets-dotenvx.md` "키 로테이션" 섹션)
- **verify** — 값 노출 없이 길이/API 주입 확인 (awk length + wrangler whoami)

전체 절차 / 반-패턴 / 검증은 `knowledge/canon/secrets-dotenvx.md` v2.0+ 참조.

### universe 전용 — harness-pull / release-gate

**채택 repo (dotenvx)**:
```bash
# .env 에 GITHUB_TOKEN (GH Packages auth) 포함, dotenvx run 으로 주입
bunx --bun dotenvx run -f .env -- bun add -D @modfolio/harness@<latest>
bunx --bun dotenvx run -f .env -- bunx modfolio-harness-pull --dry-run
bunx --bun dotenvx run -f .env -- bun run release:gate --no-skip-missing
```

**잔존 Doppler repo (예: ecosystem 자체 — 전환 대기)**:
```bash
# ecosystem 의 modfolio-ecosystem Doppler project 에 GITHUB_TOKEN/NPM_TOKEN 보관
doppler run --project modfolio-ecosystem --config dev -- \
  bun add -D @modfolio/harness@<latest>
doppler run --project modfolio-ecosystem --config dev -- \
  bunx modfolio-harness-pull --dry-run
doppler run --project modfolio-ecosystem --config dev -- \
  bun run release:gate --no-skip-missing
```

**`bun add` 필수**: `bunx @modfolio/harness` (`bun add` 선행 없이) 는 bun 전역 캐시가 cwd `.npmrc` 를 안 읽어 실패. 반드시 `bun add -D` 로 node_modules 에 설치한 뒤 local `bunx` 를 쓴다. 상세: `knowledge/journal/20260419-harness-v2.6-npm-publish.md`.

**버전 정책**: 하네스는 현행 stable 하나만 유지. 연결 프로젝트는 `ecosystem.json.harnessLatest` 값 그대로 사용. 낮은 버전 고정 금지.

**보안**: 로컬 `.env` (평문) / shell history / log 에 토큰 흔적 금지. dotenvx 채택 repo 는 `dotenvx run --` (encrypted `.env` 주입) 이 유일한 통로. Doppler 잔존 repo 는 `doppler run --` 이 통로.

## 계정 전략 (ADR-007)

### 이메일 구조

- **주 계정**: `mod@modfolio.co.kr` (Google Workspace)
- **보조 도메인 alias**: `mod@{domain}` -> 동일 받은편지함
- 모든 자회사 도메인이 Google Workspace 보조 도메인으로 연결됨

### Tier 1 — 통합 계정 (단일 계정 다중 프로젝트)

| 서비스 | 용도 | 가입 이메일 |
|--------|------|------------|
| GitHub | 소스코드 | 기존 개인 계정 (`modfolio` org) |
| Cloudflare | 배포/DNS | 기존 개인 계정 |
| 1Password | dotenvx `.env.keys` 백업 + 시크릿 vault | `mod@modfolio.io` |
| Sentry | 에러 트래킹 | `mod@modfolio.io` |
| PostHog | 이벤트 분석 | `mod@modfolio.io` |
| Neon | PostgreSQL | `mod@modfolio.io` |
| Trigger.dev | 백그라운드 잡 | `mod@modfolio.io` |
| Upstash | Redis | `mod@modfolio.io` |
| ~~Doppler~~ (deprecated 2026-04-25) | ~~시크릿 관리~~ | ~~`mod@modfolio.io`~~ — dotenvx 이관 완료 시 account 폐기 |

### Tier 2 — 도메인별 개별 계정 (Resend)

Resend 무료 플랜은 도메인 1개 제한 -> 도메인별 별도 계정 필요.

- 가입: `mod@{domain}` (예: `mod@naviaca.com`)
- 해당 도메인 repo 의 `.env` 에 `RESEND_API_KEY` 저장 (dotenvx 암호화)

## 새 앱 추가 시 계정 체크리스트

1. Google Workspace: 보조 도메인 추가
2. **dotenvx**: 새 repo 의 `.env` 작성 + encrypt + `.env.keys` 1Password 업로드 (Doppler 신규 도입 금지)
3. Sentry: 새 프로젝트 -> DSN 을 해당 repo `.env` 에 (dotenvx encrypt)
4. PostHog: 새 프로젝트 -> API 키를 해당 repo `.env` 에
5. Resend: `mod@{domain}` 가입 -> API 키를 해당 repo `.env` 에
6. Neon: DB 생성 -> 연결 문자열을 해당 repo `.env` 에
7. `ecosystem.json` 에 entry 추가 + `secretsMigration.completed.<repo>` 기록 (dotenvx 도입 시점)
8. `docs/ops/account-strategy.md` 갱신

## 상세 문서

- `knowledge/canon/secrets-dotenvx.md` (v2.0+) — universe-wide 시크릿 표준
- `knowledge/canon/universe-migration-2026-04.md` — WSL + harness v2.12.1 + dotenvx 종합 전환 가이드
- `docs/internal/doppler-setup.md` (deprecated) — historical Doppler 가이드
- `docs/ops/account-strategy.md` — 전체 계정/이메일/Doppler→dotenvx 전략
