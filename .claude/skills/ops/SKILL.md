---
name: ops
description: 시크릿 관리, 계정 전략, 이메일 운영 가이드
user-invocable: true
---


# Skill: 운영 — 시크릿, 계정, 이메일

생태계 운영 관련 시크릿 관리, 계정 전략, 이메일 설정.

## 시크릿 관리

- **원칙**: 시크릿은 프로젝트별로 관리한다. Doppler 또는 Cloudflare Workers Secrets 중 런타임에 맞는 방식을 선택
- **Doppler**: 앱별 프로젝트 (dev / stg / prd)로 로컬 개발, 다중 서비스 공유 시크릿, 운영 회전에 적합
- **Workers Secrets**: 개별 Worker/서비스에 귀속된 프로덕션 런타임 시크릿에 적합
- **로컬 개발**: `doppler run -- bun dev` 또는 안전한 로컬 env 파일 생성
- **프로덕션**: CF Workers / Workers Builds 환경변수 또는 secret store에 직접 주입
- **원칙**: 시크릿은 절대 코드에 커밋하지 않는다 (Tier 1 불변 원칙)

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
