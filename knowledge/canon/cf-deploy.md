---
title: Cloudflare 배포 — 정공법 (Workers Builds + 비대화형 wrangler v4)
version: 1.3.0
last_updated: 2026-07-12
source: [2026-05-18 속도회복 세션 §E, 2026-05-24 사용자 토큰 measurement + hallucination 차단 세션, 2026-06-21 배포 정공법 cement(문서 분산·모순 제거) + Workers Builds 비용 웹검증, 2026-07-12 modfolio P0 실측(workerd SSR 500 — 익명 스모크 구조적 미검출), developers.cloudflare.com]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops, observability]
---

# Cloudflare 배포 — 정공법

> **배포 = CF Workers Builds(GitHub 네이티브, push-to-deploy). GitHub Actions 배포 금지(`gh-actions-policy.md` 정합). AI 비대화형 실행 = athsra 주입 `CLOUDFLARE_API_TOKEN` + wrangler v4.**

## 확정 — 배포 정공법 (single source of truth · anti-drift)

> **이 canon 이 universe 배포의 유일한 source of truth.** `.claude/skills/deploy/SKILL.md` · `knowledge/global.md` · `docs/` · sibling repo 의 어떤 배포 문서도 여기로 defer 한다. 배포가 "그때그때 바뀌는" 느낌의 근본 원인은 **문서 분산 + 모순**(폐기된 Pages-first/“GHA 허용” 가이드 잔존)이었다 — 그 표면을 제거하고 여기에 못 박는다(2026-06-21 cement). 표준 자체는 안 바뀌었다.

**결정 (확정 — 재논의 대상 아님)**:

1. **상시 배포 = CF Workers Builds** (GitHub 연동 push-to-deploy). push = release.
2. **GitHub Actions 배포 금지** (`gh-actions-policy.md` 전면 금지 정합). GHA 는 deploy 에 쓰지 않는다.
3. **wrangler 직접 배포 = fallback·일회성만** (긴급 hotfix / secret 주입 / KV·R2·D1 조작). 상시화 금지.
4. **Pages → Workers** (Workers Static Assets). 신규는 무조건 Workers. Pages 잔존은 **이관 대기**(≠ 완료).
5. **build script CI-safe**: build/deploy 스크립트에 **`athsra run` 금지** (CF Builds runner 엔 athsra 없음 → `command not found` 로 build fail). build 는 plain `astro build`/`bun run build`, **build-time secret 은 Builds trigger 환경변수(`is_secret`)로 주입**. athsra = dev/CLI·로컬 deploy 전용. (2026-06-21 fleet-wide 진단 — 다수 repo 의 `apps/landing` build 가 athsra-in-CI 라 자동배포 정지. 상세·복구 = `cf-workers-builds-api.md` 함정/§정기점검)

**비용 = 사실상 $0** (웹검증 2026-06-21, [Workers Builds limits & pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)):

- repo 연결 + push 자동배포 **자체는 과금 항목이 아님**. 유일한 미터링 = **build minutes**.
- Free **3,000분/월**(동시 빌드 1, timeout 20분) · Workers Paid($5/mo) **6,000분/월** + 초과 **$0.005/분**.
- 모노레포는 **build-watch-paths**(바뀐 앱만 rebuild)로 분 최소화 → ~27개 small Worker 규모로 무료 한도 초과 도달 불가 = **추가 비용 0**.
- 실패는 GitHub commit **check runs** + **PR 코멘트** + CF 대시보드 로그로 표면화, CF 쪽 재시도 가능.

**변경 프로토콜 (drift 방지)**: 이 표준을 바꾸려면 **이 블록만** 갱신하고 `version` 을 올린다. 다른 문서·skill·sibling 에 독립적 배포 주장(특히 “GHA 허용” / “Pages-first” / “마이그레이션 완료”)을 새로 쓰지 않는다 — 전부 이 블록을 인용한다. (`sync_to_siblings: true` 이므로 harness-pull 로 sibling 에 자동 전파.)

---

이 canon 은 "예전엔 AI 가 CF 를 잘 했는데 지금은 못 한다" 의 근본 원인과 **확실히 동작하는 정확한 커맨드**를 못 박는다. `.claude/skills/deploy/SKILL.md` 는 운영 절차, 이 canon 은 메커니즘·근거·정확 커맨드의 source of truth.

> **AI 가 CF 작업 막혔을 때 → `cf-token-permissions.md` 의 권한 의심 차단 게이트 + `cf-api-mastery.md` 의 영역별 endpoint 카탈로그 + hallucination 카탈로그를 먼저 확인** (v1.1, 2026-05-24 추가). 사용자 "All API" 토큰은 353/366 perm groups 보유한 mega — "권한 부족" 결론은 hallucination 일 확률 96%+.

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

### AI 의 역할 (2026-05-24 정정)

> 이전 버전 (v1.0) 의 "AI 는 Workers Builds 연결 자체는 못 한다" 는 **잘못된 정보**. 실증으로 가능 확인 — `cf-workers-builds-api.md` 참조 (source of truth).

**사람 1회 작업** = Cloudflare GitHub App (`cloudflare-workers-and-pages`) 을 GitHub org/계정에 1회 설치 (`repository_selection: all` 권장). 확인: `gh api /orgs/<org>/installations --jq '.installations[] | select(.app_slug | test("cloudflare"; "i"))'`

**그 이후 AI 가 API 만으로 100% 처리** — repo connection / build trigger / 매뉴얼 빌드 / 환경변수 / 진단 / 신규 sibling onboarding 까지 전부. 별도 사람 액션 0.

핵심 함정 = **build token silent expire** — 매 push 마다 webhook 트리거 정상이지만 build 가 5초 만에 fail (token error). 23일 침묵 후 발견되는 케이스 (gistcore 2026-05-24 실증). **분기 1회 점검 + `PATCH build_token_uuid` 로 60초 복구**.

상세 API endpoints + 진단 시퀀스 + 신규 sibling onboarding 스크립트 → **`cf-workers-builds-api.md` v1.0+ (source of truth)**.

기존 cf-audit (`harness-pull/cf-audit.ts`) 는 INFO 만. 위 canon 의 정기 점검 스크립트를 audit skill 에 통합 권장.

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
  - ⚠ **wrangler v4 silent trigger-skip**: 비대화형(CI/Workers Builds/headless)의 `wrangler deploy` 는 코드만 올리고 `schedules` PUT 을 **silent skip**(출력 banner + exit 0, 실제 triggers `[]` 유지). `CI=1`·`wrangler telemetry disable` 로도 우회 안 됨. → 배포 후 **트리거 등록을 반드시 검증**(아래 「검증 — cron」), 누락 시 CF API 로 직접 PUT. 정공법 후속 = wrangler 버전 bump 추적.

## 검증

```bash
athsra run <repo> -- bunx wrangler whoami            # 토큰 유효 + account 일치
athsra run <repo> -- bunx wrangler deployments list  # 최근 배포 = Workers Builds commit
curl -s -o /dev/null -w "%{http_code}" https://<worker>.workers.dev/healthz
```

**검증 — cron** (위 silent-skip 함정 — 비대화형 deploy 후 필수. 엔드포인트 웹검증 2026-06-23):

```bash
# 1) 등록된 schedules 조회 — 빈 배열이면 deploy 가 trigger 를 skip 한 것
athsra run <repo> -- bash -c 'curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/<worker>/schedules" | jq .result'
# 2) 누락 시 직접 PUT — body 는 bare 배열 [{"cron":"…"}] (wrangler.jsonc triggers.crons 와 일치)
athsra run <repo> -- bash -c 'curl -s -X PUT -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/<worker>/schedules" \
  -d "[{\"cron\":\"0 3 * * *\"}]"'
```

**검증 — workerd SSR 런타임 (인증 게이트 앱 필수, modfolio P0 실측 2026-07-12)**: **"인증 게이트 뒤의 SSR 라우트는 익명 스모크로 검증된 적이 없다."** 익명 스모크는 302 로 튕겨 페이지 청크를 로드하지 않고(SSR 미실행), 로컬 `vite dev` 는 Node 런타임(jsdom)이라 정상 동작하며, `build` 성공은 런타임 throw 를 못 잡는다 — 세 수단 전부 구조적 사각. DOM 의존 의존성(`isomorphic-dompurify` 등)은 workerd 모듈 init 시 throw → **로그인 사용자에게만 프로덕션 500** 이 산다. 검증은 **`wrangler dev`(workerd) + 인증 우회 픽스처**(비커밋 — `+page.server.ts` 임시 교체 → 실렌더 200 확인 → `git checkout` 복원) 조합만 유효. **`build` 성공 ≠ workerd 런타임 성공.** 렌더 안전 표준은 `llm-markdown-safety.md`.

**검증 — CSP (정적 자산 앱·라이브 enforce 후 필수, athsra 2026-07-09 실측)**: 정적 사이트(Astro `security.csp` 해시 기반 등)의 CSP 는 **로컬 preview 로 검증되지 않는다** — CF 엣지가 배포 후 주입하는 리소스가 소스에 없어 로컬엔 위반이 안 보인다. 배포 후 **브라우저 콘솔에서 enforce 위반을 재검증**한다. 실관측된 엣지-주입 위반 2종: ① CF Browser Insights 비콘(`static.cloudflareinsights.com` — 엣지 주입, 소스 부재) → `script-src`/`connect-src` 허용 필요, ② `font-src 'self'` 가 base64 `data:` 폰트(pretendard 등 한글 fallback) 차단 → `font-src` 에 `data:` 추가. 이메일 난독화·Web Analytics 등도 CSP 를 조용히 위반할 수 있다.

## compatibility_date 정책 (F, 2026-05-18 명문화)

`wrangler.jsonc` 의 `compatibility_date` 는 앱별 자율이나 universe 권고 기준값을 `ecosystem.json.cfCompatibilityDate` 에 둔다(현 `2026-04-15`). **월 1회 갱신** 권고: 매월 ecosystem 점검 시 전월 15일 기준으로 전진(예: 6월 → `2026-05-15`). 하드코딩 방치 금지 — 갱신 시 CHANGELOG/journal 에 근거 기록. 개별 앱이 신 런타임 기능을 쓰면 그 앱만 더 최신 날짜 사용 가능(자율). breaking runtime 변경은 `compatibility_flags` 로 점진 적용.

## 출처 (웹검증 2026-05-18 + 2026-05-24 사용자 토큰 measurement)

- Workers Builds: https://developers.cloudflare.com/workers/ci-cd/builds/
- wrangler v3→v4 마이그레이션(local 기본 전환, publish/version 제거): https://developers.cloudflare.com/workers/wrangler/migration/update-v3-to-v4/
- External CI/CD + API 토큰(CLOUDFLARE_API_TOKEN/ACCOUNT_ID, "Edit Cloudflare Workers"): https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- API 토큰 생성: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- 2026-05-24 사용자 "All API" 토큰 measurement (353/366 perms, 14개 영역 read probe): `cf-token-permissions.md` § 측정값
- Workers Cron schedules API (GET/PUT `/accounts/{account_id}/workers/scripts/{script_name}/schedules`, PUT body = bare 배열 `[{"cron":"…"}]`, 웹검증 2026-06-23): https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/schedules/methods/update/

## 관련

- `.claude/skills/deploy/SKILL.md` — 운영 절차(이 canon 이 메커니즘 source of truth)
- `knowledge/canon/cf-token-permissions.md` — **토큰 권한 모델 + 사용자 실측값 + "권한 의심 차단 게이트"**. AI 가 CF 작업 hallucinate 차단.
- `knowledge/canon/cf-api-mastery.md` — **영역별 endpoint 카탈로그 (Workers/Pages/DNS/Domain/Hostname/Zone) + hallucination 카탈로그 + 검증 패턴**.
- `knowledge/canon/cf-workers-builds-api.md` — Workers Builds API 단일 영역 깊은 진단 (build token expire 등).
- `knowledge/canon/gh-actions-policy.md` — GH Actions 전면 금지(왜 Workers Builds 인가)
- `knowledge/canon/secret-store.md` — athsra v3 토큰 보관/주입
- `knowledge/canon/pages-to-workers-migration.md` — Pages 정리 맥락
- `knowledge/canon/solo-main-workflow.md` — main 직접·무사용자 ceremony 폐기
- memory `feedback_auto-mode-classifier` — classifier 차단 시 Bypass 표준
- memory `feedback_cf-no-permission-hallucination` — AI 가 "권한 부족" 발화 전 권한 게이트 강제
