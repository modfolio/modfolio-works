---
title: Operations — 운영 지식
version: 1.1.0
last_updated: 2026-04-17
source: [knowledge/claude-code-bible.md]
sync_to_siblings: true
applicability: always
consumers: [preflight, harness-pull, deploy, migration]
---

# Operations — 운영 지식

## Multi-Agent Review

`/multi-review`로 3개 전문 에이전트를 병렬 실행:
- **design-critic**: 디자인 토큰/레이아웃/모션 검증
- **accessibility-auditor**: WCAG AA/접근성 검증
- **architecture-sentinel**: 불변 원칙/생태계 규칙 검증

결과: ALL PASS → 진행 | ANY FAIL → 수정 후 재실행

## Session Recovery

### Context Rot 징후
- 이전에 합의한 규칙/제약을 무시하는 코드 생성
- 파일명, 변수명, 함수명을 잘못 기억
- 동일 실수 반복
- 생성 코드 품질이 세션 초반 대비 저하

### 복구 접근 (처방 아닌 참고)
- Context Rot가 의심되면: 세션 포기 후 새 터미널
- 복잡도가 높은 작업일수록 서브에이전트로 분산 고려
- 작업자 결정 — 파일 수로 기계적으로 강제하지 않음

### 동시 수정 충돌 방지

- 메인 세션과 병렬 작업자가 같은 파일을 건드릴 가능성이 있으면 worktree 또는 별도 쓰기 범위를 먼저 분리
- background worker에 `check:fix` 같은 광범위 자동 수정 명령을 맡기지 않는다
- universe 표준과 분리해 보호할 파일은 `.claude/harness-lock.json`에 기록한다

## 자주 하는 실수

- CSS 토큰 변경만으로 "디자인 오버홀" 했다고 하는 것 → HTML 구조 재설계 필수
- 에러가 나면 다른 도구/방법으로 시도하는 것 → 원인 진단 후 정공법
- `@ts-ignore`로 타입 에러 무시 → 타입을 고쳐야 함
- `bun run quality:all` 안 돌리고 커밋 → PreToolUse 훅이 차단함

## Cloudflare 프로젝트 명명 규칙

### 기본 원칙: 앱 이름이 기본, 접미사로 구분
- **Landing** (마케팅/소개): `{name}` — 앱 이름 그대로. 접미사 없음
- **App** (실제 서비스): `{name}-app`
- **Worker** (백그라운드): `{name}-worker`
- **Auth** (인증 전용): `{name}-login` (modfolio-connect만 해당)

### 도메인 매핑
- Landing: `{name}.com` 또는 `{name}.modfolio.io`
- App: `app.{name}.com` 또는 `{subdomain}.modfolio.io`

### 예시

| 레포 | Landing CF | App CF | Landing 도메인 | App 도메인 |
|------|-----------|--------|---------------|-----------|
| gistcore | `gistcore` | `gistcore-app` | gistcore.com | app.gistcore.com |
| modfolio-pay | `modfolio-pay` | `modfolio-pay-app` | pay.modfolio.io | checkout.modfolio.io |
| naviaca | `naviaca` | `naviaca-app` | naviaca.com | app.naviaca.com |

### 피하는 것이 좋은 패턴
- `{name}-landing` ← Landing에 `-landing` 접미사 (기존 예외 3개만 허용)
- CF 프로젝트 생성 전에는 `ecosystem.json`의 `cfProject` / `cfAppProject` /
  `cfLandingProject` 값을 확인하는 것을 권장 (기존 등록된 이름과 일치시키면 drift 방지)

### 기존 예외 (CF 프로젝트 이름 변경 불가)
naviaca-landing, munseo-landing, umbracast-landing은 이미 CF에 생성된 이름. 신규 프로젝트부터 규칙 적용.

## Effectiveness Metrics (월간 추적)

1. 디자인 토큰 위반 수 → 목표: 0
2. 반복 위반 재발률 → 목표: 0
3. Multi-review FAIL rate → First Pass Rate 추적
4. 가장 중요한 단일 지표: "같은 교훈 반복 횟수" = 0이어야 함

## compat_date Bump 체크리스트

`wrangler.jsonc`의 `compatibility_date`를 최신으로 올릴 때, astro/wrangler가 번들링하는 miniflare 버전과 로컬 wrangler가 요구하는 버전이 어긋나면 dev 서버가 조용히 폭주한다. modfolio-pay (IMPROVEMENT-6, 2026-04-16)에서 실측.

1. `bun pm view miniflare version` — 현재 레지스트리 최신
2. `bun pm ls --all | grep miniflare` — 레포 내 실제 해소 버전
3. `wrangler --version` — 로컬 wrangler가 내장한 runtime compat 윈도우
4. 세 값이 어긋나면 `package.json` `overrides` / `resolutions`에 일시 고정
5. dev 서버에서 `Durable Object class not found` / `compat_date unsupported` 류 에러 나오는지 한 차례 확인
6. 이관 완료 후 override는 다음 release cycle에서 제거 시도

## Drizzle-kit migrate 첫 호출 주의

기존에 수동 SQL로 만들어진 D1/Neon DB에 `drizzle-kit migrate`를 처음 돌릴 때 `__drizzle_migrations__` 테이블이 없으면 0000~N 전체를 다시 적용하려 한다. 이미 존재하는 테이블은 `CREATE TABLE IF NOT EXISTS`가 아닌 이상 충돌. gistcore (Issue #10, 2026-04-16).

1. 첫 호출 전에 prod·staging 모두 백업
2. `drizzle-kit introspect`로 현 스키마 스냅샷 → `drizzle/0000_baseline.sql`로 커밋
3. `__drizzle_migrations__` 테이블 수동 생성 + 기존 idx 삽입 (`INSERT INTO __drizzle_migrations__ (hash, created_at) VALUES (?, ?)`)
4. 그 상태에서 `drizzle-kit migrate` 실행 → 이미 적용된 idx는 skip
5. 실행 전·후 `SHOW CREATE TABLE` / `.schema` diff를 로그로 남긴다
