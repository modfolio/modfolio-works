---
name: ops
description: 시크릿 관리, 계정 전략, 이메일 운영 가이드
user-invocable: true
---


# Skill: 운영 — 시크릿, 계정, 이메일

생태계 운영 관련 시크릿 관리, 계정 전략, 이메일 설정.

## 시크릿 관리 (2026-05-02 v3 — universe-wide athsra)

- **원칙**: 시크릿은 **각 repo 가 독립 관리**한다. dev = **athsra** (E2EE on Cloudflare edge — 클라이언트 AES-256-GCM + 서버 ciphertext-only + 머신별 Bearer token), prod = **Cloudflare Workers Secrets / Pages env / Secret Store** 네이티브 경로. 두 경로는 별개.
- **athsra (universe-wide 표준, applicability: always)**: 마스터 패스워드 + Argon2id proof 만 서버가 보관, 시크릿 ciphertext 는 R2, 토큰은 D1 (Phase 1.x.2+). 머신별 Bearer token 으로 Doppler-style env injection (`athsra run <project> -- <cmd>`). 캐논 `secret-store.md` v1.13+ 참조. CLI: `npm install -g @athsra/cli` (npmjs 공개 publish).
- **dotenvx (deprecated 2026-05-02 — Phase 1 완료)**: 과거 표준 (2026-04-25 v2). 평문 `.env` 의 public-key 암호화 + `.env.keys` 백업. 현재 archived (`knowledge/canon/archive/secrets-dotenvx.md` v2.3.0). 새 repo 도입 금지. 잔존 미전환 repo 는 athsra 로 이관 (archived canon 의 migration 섹션 참조).
- **Doppler (deprecated 2026-04-25)**: 과거 중앙화 표준. universe 모든 repo 가 폐기. 새 도입 금지.
- **Workers Secrets (prod 런타임)**: 개별 Worker/서비스에 귀속된 프로덕션 시크릿. athsra 범위 밖 — 빌드·배포 CLI 시점에만 athsra inject, runtime 은 native binding. wrangler 4.87+ 의 `secrets: { required: [...] }` 객체 스키마 사용 (구 array 스키마 폐기, harness v2.31.1+).
- **로컬 개발**: athsra 채택 repo: `athsra run <project> -- bun run dev` (또는 build/test/db:* 등 모든 CLI 시점).
- **프로덕션**: CF Workers / Workers Builds 환경변수 또는 secret store 에 직접 주입.
- **원칙**: 시크릿은 절대 코드에 평문 commit 하지 않는다. athsra 는 머신 keyring + R2 ciphertext 로만 보관 — repo 에 어떤 형태로도 들어가지 않는다.

### athsra 시크릿 관리 — user-invocable

사용자가 `/ops athsra init` 또는 `/ops athsra migrate` 같은 phrase 로 호출 시:

- **init** — 새 repo 시작 (`athsra login` 1회 후 `athsra set <project> KEY=value`). 평문 `.env` 작성 안 함. `.env.example` 은 athsra-first 스타일 (필요 키 reference + `athsra run` 예시).
- **migrate** — dotenvx 채택 repo 를 athsra 로 이관 (평문화 → `athsra set` 다건 → 기존 `.env`/`.env.keys` 폐기 + `legacy-backup/` 백업)
- **rotate** — `athsra rotate-master` (마스터 패스워드 변경 + 모든 projects re-encrypt + 토큰 revoke)
- **handoff** — 새 머신 추가 (`athsra handoff` 발급 + `athsra handoff --accept` 수신 — issuer/acceptor 프로토콜)
- **verify** — `athsra doctor` (keyring/dbus/worker phase 검증), `athsra ls <project>`, `athsra versions <project>`

전체 절차 / 반-패턴 / 검증은 `knowledge/canon/secret-store.md` v1.13+ 참조.

### athsra 명령 cheat-sheet

| 명령 | 용도 |
|---|---|
| `athsra login` | 마스터 패스워드 입력 + 머신 등록 (Bearer token 발급) |
| `athsra set <project> KEY=value` | secret 추가/수정 (다건 가능, `--from-file`/`--stdin` 지원) |
| `athsra unset <project> KEY [...]` | 특정 key 제거 (envelope 유지) |
| `athsra get <project> [KEY]` | 값 출력 (single 또는 dump, 마스킹) |
| `athsra ls [project] [--all]` | project 또는 key 목록 |
| `athsra run <project> -- <cmd>` | env inject 후 명령 실행 (Doppler-style) |
| `athsra doctor` | 환경 검증 (keyring/dbus/worker phase) |
| `athsra versions <project>` | 모든 version + tombstone 상태 |
| `athsra rollback <project> <version_id>` | 특정 version 으로 current 복원 |
| `athsra delete <project> [--hard]` | soft-delete (default) 또는 hard-delete |
| `athsra restore <project>` | tombstone 제거 + 최신 version 활성화 |
| `athsra rotate-master` | master pw 변경 (모든 projects re-encrypt) |
| `athsra handoff [--accept]` | 새 머신 추가 (issue / accept) |
| `athsra revoke [<atk_*>]` | self 또는 명시 token revoke |

### universe 전용 — harness-pull / release-gate

athsra 채택 repo 에서 `@modfolio/*` private packages 인증은 GITHUB_TOKEN 을 athsra 가 inject:

```bash
# .npmrc 가 ${GITHUB_TOKEN} 참조 — athsra run 으로 한 번에 처리
athsra run <project> -- bun add -D @modfolio/harness@<latest>
athsra run <project> -- bun run harness-pull               # report-only
athsra run <project> -- bun run harness-pull -- --apply    # apply
athsra run <project> -- bun run release:gate --no-skip-missing
```

**`bun add` 필수**: `bunx @modfolio/harness` (`bun add` 선행 없이) 는 bun 전역 캐시가 cwd `.npmrc` 를 안 읽어 실패. 반드시 `bun add -D` 로 node_modules 에 설치한 뒤 local `bunx` 를 쓴다. 상세: `knowledge/journal/20260419-harness-v2.6-npm-publish.md`.

**버전 정책**: 하네스는 현행 stable 하나만 유지. 연결 프로젝트는 `ecosystem.json.harnessLatest` 값 그대로 사용. 낮은 버전 고정 금지.

**보안**: 로컬 `.env` 파일 자체를 만들지 않는다 (athsra 시대 — 평문 `.env` 는 athsra inject 흐름 외부의 우회 경로). shell history / log 에 토큰 흔적 금지. `athsra run --` 이 유일한 주입 통로.

## 계정 전략 (ADR-007)

### 이메일 구조

- **주 계정**: `mod@modfolio.co.kr` (Google Workspace)
- **보조 도메인 alias**: `mod@{domain}` -> 동일 받은편지함
- 모든 자회사 도메인이 Google Workspace 보조 도메인으로 연결됨

### Tier 1 — 통합 계정 (단일 계정 다중 프로젝트)

| 서비스 | 용도 | 가입 이메일 |
|--------|------|------------|
| GitHub | 소스코드 | 기존 개인 계정 (`modfolio` org) |
| Cloudflare | 배포/DNS + athsra worker 호스팅 | 기존 개인 계정 |
| Sentry | 에러 트래킹 | `mod@modfolio.io` |
| PostHog | 이벤트 분석 | `mod@modfolio.io` |
| Neon | PostgreSQL | `mod@modfolio.io` |
| Trigger.dev | 백그라운드 잡 | `mod@modfolio.io` |
| Upstash | Redis | `mod@modfolio.io` |
| ~~1Password~~ (deprecated 2026-05-02) | ~~dotenvx `.env.keys` 백업~~ | athsra 채택으로 시크릿 vault 역할 종료. 일반 password manager 용도는 유지 |
| ~~Doppler~~ (deprecated 2026-04-25) | ~~중앙 시크릿 관리~~ | athsra 이관 완료 시 account 폐기 |

### Tier 2 — 도메인별 개별 계정 (Resend)

Resend 무료 플랜은 도메인 1개 제한 -> 도메인별 별도 계정 필요.

- 가입: `mod@{domain}` (예: `mod@naviaca.com`)
- API key 는 athsra 의 해당 repo 프로젝트에 저장: `athsra set <repo> RESEND_API_KEY=re_xxx`

## 새 앱 추가 시 계정 체크리스트

1. Google Workspace: 보조 도메인 추가
2. **athsra**: 새 project 등록 (`athsra login` 1회 후 `athsra set <repo> KEY=value` 다건). 평문 `.env` 작성 금지 (dotenvx 신규 도입도 금지)
3. Sentry: 새 프로젝트 -> DSN 을 athsra 에 저장 (`athsra set <repo> SENTRY_DSN=...`)
4. PostHog: 새 프로젝트 -> API 키를 athsra 에
5. Resend: `mod@{domain}` 가입 -> API 키를 athsra 에
6. Neon: DB 생성 -> 연결 문자열을 athsra 에 (`athsra set <repo> DATABASE_URL=...`). DB 이름은 repo 와 일치하지 않을 수 있음 (예: modfolio Neon DB 명이 `press` — 역사적 명명, 호스트 prefix 로 식별)
7. `ecosystem.json` 에 entry 추가 + `secretsMigration.completed.<repo>` 기록 (athsra 도입 시점)
8. `docs/ops/account-strategy.md` 갱신

## 상세 문서

- `knowledge/canon/secret-store.md` (v1.13+) — universe-wide athsra 표준
- `knowledge/canon/archive/secrets-dotenvx.md` (v2.3.0, deprecated 2026-05-02) — historical dotenvx 가이드
- `knowledge/canon/universe-migration-2026-04.md` — WSL + harness v2.12.1 + dotenvx 종합 전환 가이드 (history)
- `docs/internal/doppler-setup.md` (deprecated) — historical Doppler 가이드
- `docs/ops/account-strategy.md` — 전체 계정/이메일 전략 (athsra 정합 필요 시 갱신)
