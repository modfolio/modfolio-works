---
title: Cloudflare 배포 — 정공법 (Workers Builds + 비대화형 wrangler v4)
version: 1.0.0
last_updated: 2026-05-18
source: [2026-05-18 속도회복 세션 §E, developers.cloudflare.com 웹검증]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops, observability]
---

# Cloudflare 배포 — 정공법

> **배포 = CF Workers Builds(GitHub 네이티브, push-to-deploy). GitHub Actions 배포 금지(`gh-actions-policy.md` 정합). AI 비대화형 실행 = athsra 주입 `CLOUDFLARE_API_TOKEN` + wrangler v4.**

이 canon 은 "예전엔 AI 가 CF 를 잘 했는데 지금은 못 한다" 의 근본 원인과 **확실히 동작하는 정확한 커맨드**를 못 박는다. `.claude/skills/deploy/SKILL.md` 는 운영 절차, 이 canon 은 메커니즘·근거·정확 커맨드의 source of truth.

## 왜 AI 가 갑자기 CF 를 못 하게 됐나 (근본 원인 3중)

1. **시크릿 주입 단절**: Doppler → dotenvx → **athsra v3** 마이그레이션으로 `CLOUDFLARE_API_TOKEN` 의 비대화형 주입 경로가 끊김. `wrangler` 가 토큰 없이 OAuth 대화형 로그인을 시도 → 비대화형(AI) 환경에서 실패.
2. **wrangler v4 기본 동작 변경**: KV/R2/D1 데이터 명령이 **기본 local** 로 바뀜 (v3 는 remote 기본). production 조작 시 `--remote` 누락 → "성공처럼 보이나 prod 에 반영 안 됨" 또는 실패.
3. **auto mode classifier**: `wrangler deploy`·secret 조작 등이 의미 분류로 차단될 수 있음(bypass 무관). → Bypass Permissions 표준 + 결정적 hook 안전망(`feedback_auto-mode-classifier` 메모리, `solo-main-workflow.md`).

세 가지를 동시에 푸는 것이 이 canon 의 목적.

## 경로 1 — CF Workers Builds (1순위, GitHub Actions 분 0 소모)

CF Workers Builds 는 **Cloudflare 자체 빌드 인프라**에서 돈다. GitHub App(webhook)로 repo 변경을 감지할 뿐, **GitHub Actions minutes 를 소모하지 않는다** (GitHub Free org 2000분/월 한도와 무관 — `gh-actions-policy.md` 의 핵심 근거). CF Free plan 은 자체 build quota 포함.

### 신규 Worker 연결
1. CF Dashboard → Workers & Pages → **Create application → Import a repository**
2. GitHub 인증 → repo 선택 → build 설정 → `*.workers.dev` 로 1차 배포

### 기존 Worker 에 연결
1. CF Dashboard → Workers & Pages → 해당 Worker → **Settings → Builds → Connect**
2. build/deploy command·root dir 설정 → commit push 시 자동 build+deploy

### 필수 정합 (실패 1위 원인)
- **대시보드 Worker 이름 == `wrangler.jsonc` 의 `name` 필드**. 불일치 시 build 실패.
- `name` 은 `ecosystem.json` 의 `cfProject`/`cfAppProject`/`cfLandingProject` 가 source of truth. 임의 생성 금지(`deploy` skill Step 0).
- deploy command: `wrangler deploy`(Active 승격) 또는 `wrangler versions upload`(승격 없이 버전만).

### AI 의 역할
AI 는 Workers Builds **연결 자체(대시보드 OAuth)** 는 못 한다(사람 1회 작업). AI 가 하는 것: `wrangler.jsonc` `name`/`compatibility_date`/bindings 를 ecosystem 정합으로 맞추고, push 하면 CF 가 배포. 연결 여부 점검은 `harness-pull/cf-audit.ts`(INFO) + 아래 경로 2 의 `wrangler deployments list` 로.

## 경로 2 — 비대화형 wrangler (AI 실행 가능, fallback·일회성 작업)

GitHub 결제 차단/긴급/일회성(secret 주입, KV seed, Pages 삭제 등) 시. **OAuth 대화형 금지 — API 토큰 환경변수만.**

### 2-1. API 토큰 발급 (1회, 최소권한)
1. CF Dashboard → **My Profile → API Tokens → Create Token**
2. **Custom** → 권한 정책 **"Edit Cloudflare Workers"** (deploy + secret + worker config 전부 커버 — 웹검증: 개별 작업별 분리 scope 불필요)
3. Account Resources = 해당 account 한정. TTL 권장 90일(`secrets-policy.md` 로테이션 표 정합)
4. KV/R2/D1 데이터까지 만지면 동일 토큰에 Workers KV/R2/D1 **Edit** 추가

### 2-2. athsra 에 보관 + 주입 (secret-store v3 정합)
```bash
# 1회 등록 (값은 사용자/발급자가 입력 — 하드코딩·로그 금지)
athsra set <repo> CLOUDFLARE_API_TOKEN=cf_xxx
athsra set <repo> CLOUDFLARE_ACCOUNT_ID=<account_id>

# 이후 모든 비대화형 wrangler 는 athsra run 으로 래핑 (토큰 env 주입)
athsra run <repo> -- bunx wrangler whoami          # 인증 확인
athsra run <repo> -- bunx wrangler deploy          # 배포 (deploy 는 --remote 불요 — 항상 원격)
athsra run <repo> -- bunx wrangler deployments list
```
`.env`/`.env.keys`/Doppler/dotenvx 경로는 deprecated(`secret-store.md` v1.1+). 잔존 미전환 repo 만 historical.

### 2-3. wrangler v4 정확 커맨드 (웹검증 — v3 습관과 다름)
| 작업 | v4 정확 커맨드 | 주의 |
|---|---|---|
| 배포 | `wrangler deploy` | `--remote` **불요**(항상 원격). `wrangler publish` 는 제거됨 → `deploy` |
| 시크릿 등록 | `wrangler secret put NAME` | 항상 원격. stdin 으로 값 전달(비대화형) |
| 버전 업로드(무승격) | `wrangler versions upload` | Workers Builds 와 동일 의미 |
| KV 읽기/쓰기 | `wrangler kv key put/get/list ... --remote` | **v4 기본 local** — production 은 `--remote` **필수**(누락 시 무음 local) |
| R2 객체 | `wrangler r2 object put/get/delete ... --remote` | 동일 — `--remote` 필수 |
| D1 쿼리(prod) | `wrangler d1 execute <db> --remote --command "..."` | 동일 — `--remote` 필수 |
| 버전 확인 | `wrangler --version` | `wrangler version`(서브커맨드) 제거됨 |
| Pages 삭제 | `wrangler pages project delete <name>` | Pages→Workers 이관(`pages-to-workers-migration.md`) 후 정리용 |
| 환경변수(비밀 아님) | `wrangler.jsonc` `vars` 블록 + `wrangler deploy` | 평문 var 는 코드형상관리. 비밀은 `secret put` |

전부 `athsra run <repo> -- bunx wrangler ...` 로 감싼다.

## 결정 규칙

- **상시 배포** = 경로 1 (Workers Builds). push = release. GH Actions 분 0.
- **AI 비대화형 일회성**(secret 주입·KV seed·Pages 삭제·긴급 hotfix deploy) = 경로 2.
- 두 경로 동시 상시화 금지 — 이중 deploy race(`gh-actions-policy.md` 배경). 경로 1 이 상시, 경로 2 는 명시 일회성.
- cron = CF Cron Trigger(`wrangler.jsonc` `triggers.crons` + `scheduled()` 핸들러). GH Actions schedule 금지.

## 검증

```bash
athsra run <repo> -- bunx wrangler whoami            # 토큰 유효 + account 일치
athsra run <repo> -- bunx wrangler deployments list  # 최근 배포 = Workers Builds commit
curl -s -o /dev/null -w "%{http_code}" https://<worker>.workers.dev/healthz
```

## compatibility_date 정책 (F, 2026-05-18 명문화)

`wrangler.jsonc` 의 `compatibility_date` 는 앱별 자율이나 universe 권고 기준값을 `ecosystem.json.cfCompatibilityDate` 에 둔다(현 `2026-04-15`). **월 1회 갱신** 권고: 매월 ecosystem 점검 시 전월 15일 기준으로 전진(예: 6월 → `2026-05-15`). 하드코딩 방치 금지 — 갱신 시 CHANGELOG/journal 에 근거 기록. 개별 앱이 신 런타임 기능을 쓰면 그 앱만 더 최신 날짜 사용 가능(자율). breaking runtime 변경은 `compatibility_flags` 로 점진 적용.

## 출처 (웹검증 2026-05-18)

- Workers Builds: https://developers.cloudflare.com/workers/ci-cd/builds/
- wrangler v3→v4 마이그레이션(local 기본 전환, publish/version 제거): https://developers.cloudflare.com/workers/wrangler/migration/update-v3-to-v4/
- External CI/CD + API 토큰(CLOUDFLARE_API_TOKEN/ACCOUNT_ID, "Edit Cloudflare Workers"): https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- API 토큰 생성: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/

## 관련

- `.claude/skills/deploy/SKILL.md` — 운영 절차(이 canon 이 메커니즘 source of truth)
- `knowledge/canon/gh-actions-policy.md` — GH Actions 최소화(왜 Workers Builds 인가)
- `knowledge/canon/secret-store.md` — athsra v3 토큰 보관/주입
- `knowledge/canon/pages-to-workers-migration.md` — Pages 정리 맥락
- `knowledge/canon/solo-main-workflow.md` — main 직접·무사용자 ceremony 폐기
- memory `feedback_auto-mode-classifier` — classifier 차단 시 Bypass 표준
