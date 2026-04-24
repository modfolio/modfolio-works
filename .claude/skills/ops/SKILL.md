---
name: ops
description: 시크릿 관리, 계정 전략, 이메일 운영 가이드
user-invocable: true
---


# Skill: 운영 — 시크릿, 계정, 이메일

생태계 운영 관련 시크릿 관리, 계정 전략, 이메일 설정.

## 시크릿 관리

- **원칙**: 시크릿은 프로젝트별로 관리한다. dev 는 **dotenvx** (파일 기반 암호화 + git commit), 프로덕션 런타임은 **Cloudflare Workers Secrets / secret store** 네이티브 경로.
- **dotenvx** (2026-04-24~ 권장): 각 repo 의 `.env` 를 public-key 암호화해 git commit, `.env.keys` (private) 는 1Password 에 보관. Doppler 10-project free 한계 대체 + 1인 개발에 적합. 상세: `knowledge/canon/secrets-dotenvx.md`
- **Doppler** (dev 경로에서 단계적 제거): 다중 서비스 공유 시크릿에는 여전히 사용 가능. 새 repo 는 dotenvx 우선. 기존 Doppler 프로젝트는 `scripts/ops/dotenvx-migrate-from-doppler.sh` 로 이관.
- **Workers Secrets**: 개별 Worker/서비스에 귀속된 프로덕션 런타임 시크릿. dotenvx 범위 밖.
- **로컬 개발**: `bunx --bun dotenvx run -f .env -- bun dev` (권장) 또는 `doppler run -- bun dev` (기존 경로).
- **프로덕션**: CF Workers / Workers Builds 환경변수 또는 secret store 에 직접 주입.
- **원칙**: 시크릿은 절대 코드에 평문 commit 하지 않는다. dotenvx 는 **암호화된 상태로만** commit.

### dotenvx 시크릿 관리 — user-invocable

사용자가 `/ops dotenvx init` 또는 `/ops dotenvx migrate` 같은 phrase 로 호출 시:

- **init** — 새 repo 에서 `.env` 시작 (plaintext 작성 → `dotenvx encrypt` → `.env.keys` 1Password 업로드)
- **migrate** — 기존 Doppler 프로젝트를 dotenvx 로 일괄 이관 (`scripts/ops/dotenvx-migrate-from-doppler.sh <project> <config>`)
- **rotate** — 공개 키 로테이션 절차 (canon `secrets-dotenvx.md` "키 로테이션" 섹션)
- **verify** — 값 노출 없이 길이/API 주입 확인 (awk length + wrangler whoami)

전체 절차 / 반-패턴 / 검증은 `knowledge/canon/secrets-dotenvx.md` 참조.

### universe 전용 — harness-pull / release-gate

`modfolio-universe` Doppler 프로젝트에 귀속된 토큰(`GITHUB_TOKEN`, `NPM_TOKEN`) 은 harness-pull / release-gate 실행 시 Doppler 가 run-time 주입:

```bash
# @modfolio/harness GitHub Packages 공식 경로
# 연결 프로젝트 repo 루트에 .npmrc 필요 (@modfolio scope → GitHub Packages + _authToken)
# <latest> 는 ecosystem.json.harnessLatest 값 — 항상 현행 stable 사용
doppler run --project modfolio-universe --config dev -- \
  bun add -D @modfolio/harness@<latest>
doppler run --project modfolio-universe --config dev -- \
  bunx modfolio-harness-pull --dry-run

# release-gate 매트릭스 (dry-run 시 @modfolio/connect-sdk install 필요할 수 있음)
doppler run --project modfolio-universe --config dev -- \
  bun run release:gate --no-skip-missing
```

**`bun add` 필수**: `bunx @modfolio/harness` (`bun add` 선행 없이) 는 bun 전역 캐시가 cwd `.npmrc` 를 안 읽어 실패. 반드시 `bun add -D` 로 node_modules 에 설치한 뒤 local `bunx` 를 쓴다. 상세: `knowledge/journal/20260419-harness-v2.6-npm-publish.md`.

**버전 정책**: 하네스는 현행 stable 하나만 유지. 연결 프로젝트는 `ecosystem.json.harnessLatest` 값 그대로 사용. 낮은 버전 고정 금지.

로컬 `.env` / shell history / log 에 토큰 흔적 금지. `doppler run --` 이 유일한 통로.

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
| Doppler | 시크릿 관리 | `mod@modfolio.io` |
| Sentry | 에러 트래킹 | `mod@modfolio.io` |
| PostHog | 이벤트 분석 | `mod@modfolio.io` |
| Neon | PostgreSQL | `mod@modfolio.io` |
| Trigger.dev | 백그라운드 잡 | `mod@modfolio.io` |
| Upstash | Redis | `mod@modfolio.io` |

### Tier 2 — 도메인별 개별 계정 (Resend)

Resend 무료 플랜은 도메인 1개 제한 -> 도메인별 별도 계정 필요.

- 가입: `mod@{domain}` (예: `mod@naviaca.com`)
- Doppler 키: `RESEND_API_KEY` (각 앱 프로젝트에 해당 도메인 API 키)

## 새 앱 추가 시 계정 체크리스트

1. Google Workspace: 보조 도메인 추가
2. Doppler: 새 프로젝트 생성 (dev/stg/prd)
3. Sentry: 새 프로젝트 -> DSN을 Doppler에
4. PostHog: 새 프로젝트 -> API 키를 Doppler에
5. Resend: `mod@{domain}` 가입 -> API 키를 Doppler에
6. Neon: DB 생성 -> 연결 문자열을 Doppler에
7. `docs/ops/account-strategy.md` 갱신

## 상세 문서

- `docs/ops/account-strategy.md` — 전체 계정/이메일/Doppler 전략
