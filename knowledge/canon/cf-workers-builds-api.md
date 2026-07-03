---
title: Cloudflare Workers Builds — API 완전 자동화 + 진단 (build token silent expire + private/local dep 실패 포함)
version: 1.5.0
last_updated: 2026-07-01
source: [2026-05-24 gistcore 진단 세션, 2026-05-31 modfolio-pay 3일 outage(file: dep) 회고, 2026-07-01 CF edge completeness round(build-token refresh 자동화), developers.cloudflare.com/workers/ci-cd/builds/api-reference, 실증 curl 시퀀스]
changelog: ["1.5.0 (2026-07-01): build-token silent-expire 의 '분기별 수동 점검 권장'을 자동화로 대체 — scripts/ops/cf-build-token-refresh.py(canonical 토큰=관측된 success 다수결, NEVER_TOUCH owner-domain skip, report/--apply/--rebuild/--json) + 월 1회 .forgejo/workflows/cf-build-token-refresh.yml(NAS, $0). 실측: yeonsoo 2 trigger 가 rolled 2026-03-27 토큰에 5연속 fail 검출. athsra child-exit 미전파 → CI 는 --json 폴링. (knowledge/journal/20260701-cf-edge-completeness.md)", "1.4.0 (2026-06-28): @astrojs/cloudflare 14 SESSION KV 비멱등 provisioning 함정(#4) 추가 — adapter 13+ 가 세션을 SESSION KV 로 기본 활성화하고 wrangler automatic provisioning 이 create-only 라 재배포 시 code 10014 충돌; fix=KV 사전생성 + wrangler.jsonc id 명시 고정. dev/on + 3 브랜드(amberstella/fortiscribe/keepnbuild) astro 5→7 + adapter 12→14 마이그레이션 실증.", "1.3.0 (2026-06-24): 빌드 OOM(build container 힙 초과) 세 번째 실패 시나리오 추가 — vite build 큰 SvelteKit/SSR 번들이 ~2GB 기본 힙 OOM(rendering chunks), fix=NODE_OPTIONS max-old-space 6144 를 build script 에 내장(bun run 래퍼 = CF·WSL·Win 공통). pdgd 2026-06-24 실증, 큰 번들 fleet 공통 위험.", "1.2.1 (2026-06-22): stale-local-clone 진단 함정 추가 + athsra-in-CI fix 메커니즘 명확화 (trigger build_command = 일반 bun run build → repo package.json build 실행이라 fix = repo 한 줄, CF-side 아님). gistcore·docs·admin·modfolio 4 repo 1줄 제거 → 5 worker build success + live 200 실증.", "1.2.0 (2026-06-21): athsra-in-CI build script anti-pattern 함정 추가 (fleet-wide 진단 — apps/landing build 의 `athsra run` 이 CF runner 에서 command-not-found). build-token 만료 fleet 복구 + docs GITHUB_TOKEN 주입 실증.", "1.1.0 (2026-06-08): source 필드로 CI 판별 불가 정정(build history 사용) + private/local dep 설치 실패를 TL;DR·함정표에 추가(modfolio-pay 피드백)"]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops]
supersedes: [cf-deploy.md 의 "AI 는 연결 자체 못 한다" 주장(line 42-43, 2026-05-18 시점 잘못된 정보)]
---

# Cloudflare Workers Builds — API 완전 자동화 + 진단

> **정정 (2026-05-24)**: `cf-deploy.md` v1.0 에 "Workers Builds 연결 자체(대시보드 OAuth)는 사람 1회 작업, AI 는 못 한다" 라고 적혀 있으나 **사실이 아니다**. Cloudflare GitHub App 이 org 에 한 번만 설치되면 (수동), 그 이후 모든 sibling Worker 의 repo 연결 + build trigger 설정 + 환경변수 + 매뉴얼 빌드는 **전부 CF Workers Builds API 로 자동 가능**. AI 가 100% 처리할 수 있다.

이 canon 은 (1) API endpoints 카탈로그, (2) 한 번만 필요한 사람 작업 = Cloudflare GitHub App 설치, (3) **빈번하지만 진단하기 어려운 실패 — build token silent expire**, (4) athsra + curl 로 짠 진단/복구 명령 시퀀스를 못 박는다. `cf-deploy.md` 는 메커니즘·정책, 이 canon 은 **API 호출 source of truth**.

## TL;DR (가장 흔한 실패 시나리오 + 복구)

증상: "한참 동안 잘 deploy 됐는데 어느 날부터 push 해도 production 이 갱신 안 됨. wrangler CLI 로는 deploy 잘 됨." (실제 gistcore — 23일간 자동 deploy 멈춤)

원인 (가장 흔한 두 부류 — **로그가 ground truth, 토큰부터 단정 금지**):

1. **build token silent expire/roll** — build trigger 가 쓰던 build token 이 조용히 만료/롤. 매 push 마다 webhook 정상 트리거되고 build 가 큐에 들어가지만 토큰 검증 단계에서 5초 만에 fail.
2. **private/local 의존성 설치 실패** (2026-05-31 modfolio-pay 3일 outage) — `@modfolio/*` 를 `file:../` 로컬 경로로 의존하면 CI clone 에는 그 경로가 없어 `bun install` 이 실패. 또는 published `@modfolio/*` 인데 `GITHUB_TOKEN` (is_secret) 미주입이면 GitHub Packages 인증 실패. **local 빌드는 통과**해서 "정상"처럼 보이고 prod 는 옛 커밋에 멈춰 있다.
3. **빌드 OOM (build container 힙 초과, 2026-06-24 pdgd 실증)** — `vite build`(SvelteKit/SSR 큰 번들 — 예: Mingcute 등 대형 아이콘셋 전체 번들)가 CF 빌드 컨테이너 기본 힙(~2GB)에서 `rendering chunks` 중 OOM → build_outcome=fail. **local 빌드는 머신 힙이 커서 통과**해 "정상"처럼 보인다. fix = build script 에 힙 상한 **내장**: `NODE_OPTIONS=--max-old-space-size=6144 vite build` (또는 `bun run build` 래퍼 — bun shell 이라 CF·WSL·Windows 공통, cross-env 불요). **큰 번들 @modfolio 앱(SvelteKit 등) fleet 공통 위험** → 같은 패턴 권고.
4. **@astrojs/cloudflare 14 SESSION KV 비멱등 provisioning** (2026-06-28 modfolio-dev 실증) — adapter 13+ 는 Astro 세션을 SESSION KV 로 **기본 활성화**하고, wrangler **automatic provisioning 은 create-only(비멱등)**. 첫 deploy 는 `<worker>-session` KV 를 생성하지만, **재배포는 같은 이름 재생성을 시도해 충돌** → `a namespace with this account ID and title already exists [code 10014]` → deploy 단계 fail (build 는 통과해 로그 봐야 보임). 특히 deploy→revert→재deploy 처럼 링크가 끊긴 흐름에서 확정 재현. **fix = KV 사전 생성 후 wrangler.jsonc 에 id 명시 고정**: `"kv_namespaces":[{"binding":"SESSION","id":"<id>"}]` (수동 바인딩이 provisioning 우선 — adapter 문서). 세션 미사용이어도 바인딩은 deploy 에 필요(끄는 adapter 옵션 없음, `sessionKVBindingName` rename 만). astro adapter-14 마이그레이션 시 **반드시 사전 고정** — fleet 공통.

네 경우 모두 CF Dashboard "Builds" 탭 / API build 로그(6단계)를 열기 전엔 안 보인다. **항상 로그부터 확인** — "토큰이겠지" 하고 7단계 PATCH 부터 돌리면 의존성·provisioning 실패를 놓친다.

복구 (60초):
```bash
# 1. 진단 — 최근 build status 확인 (모두 status=stopped, build_outcome=fail 이면 토큰 의심)
athsra run <repo> -- sh -c '
TAG=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/services/<worker-name>" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r ".result.default_environment.script_tag")
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/workers/$TAG/builds" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq ".result[0:3] | map({status, build_outcome, created_on})"
'

# 2. 로그 확인 — "build token ... has been deleted or rolled" 메시지면 확정
athsra run <repo> -- curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/builds/<build_uuid>/logs" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r ".result.lines | .[] | .[1]"

# 3. 유효 token 목록 → 가장 최근 것 선택 → trigger PATCH
athsra run <repo> -- sh -c '
LATEST=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/tokens" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r ".result[0].build_token_uuid")
echo "Latest token: $LATEST"

# trigger 갱신 (각 Worker 의 trigger_uuid 는 GET /builds/workers/$TAG/triggers 로 확인)
curl -s -X PATCH "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/triggers/<trigger_uuid>" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "content-type: application/json" \
  -d "{\"build_token_uuid\":\"$LATEST\"}" | jq ".result.build_token_name"
'

# 4. 매뉴얼 재빌드 (body 가 {} 면 12002, {"branch":"main"} 이 정답)
athsra run <repo> -- curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/triggers/<trigger_uuid>/builds" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "content-type: application/json" \
  -d '{"branch":"main"}' | jq ".result | {build_uuid, status}"
```

이게 어떤 sibling 에서든 작동. **build token 자동 만료/roll 은 CF 의 보안 정책 (개별 token TTL) — 영구 fix 는 불가능, 주기적 갱신 필요.**

> **자동화 (2026-07-01, "분기별 점검"의 정공법 대체)**: 손수 점검 대신 `scripts/ops/cf-build-token-refresh.py` 가 전 worker 의 trigger→token→최근 build 결과를 훑어, **현재 실패 중이면서 비-canonical 토큰을 쓰는** trigger 를 canonical 토큰(= 성공 중인 trigger 가 가장 많이 쓰는 토큰, 날짜 추측 아닌 관측된 success 기준)으로 PATCH 한다. report-only 기본, `--apply` 로 적용, `--rebuild` 로 즉시 재빌드, `--json` 머신출력. owner-reserved 도메인(`NEVER_TOUCH`, 예: pdgd 의 `yeonsoo`)은 flag 만 하고 건드리지 않음. 월 1회 `.forgejo/workflows/cf-build-token-refresh.yml`(NAS runner, $0)이 self-heal. 실측(2026-07-01): yeonsoo 2 trigger 가 `2026-03-27` rolled 토큰에 묶여 5연속 fail 중인 것을 검출. ⚠ schedule 발동 전 Forgejo secret `CLOUDFLARE_API_TOKEN`+`CLOUDFLARE_ACCOUNT_ID` 1회 등록 필요. 실행: `athsra run modfolio-ecosystem -- python3 scripts/ops/cf-build-token-refresh.py`(athsra 는 child exit code 미전파 → CI 는 `$?` 아닌 `--json` 의 `stranded`/`patch_failed` 폴링).

## 사람 1회 작업 = Cloudflare GitHub App 설치 (org/account 단위)

Workers Builds API 를 쓰기 전 **GitHub App `cloudflare-workers-and-pages` 가 GitHub org/계정에 설치**되어 있어야 한다. 한 번만:

1. CF Dashboard → 아무 Worker → Settings → Builds → "Connect" → GitHub 선택 → org 인증 (Install on selected repositories 또는 All repositories — modfolio 는 `repository_selection: all` 권장)
2. 이후 같은 org 의 **모든 repo** 가 자동 가용 — sibling Worker 마다 OAuth 반복 불필요

확인:
```bash
gh api /orgs/<org>/installations --jq '.installations[] | select(.app_slug | test("cloudflare"; "i")) | {app_slug, target_type, repository_selection, id}'
# {"app_slug":"cloudflare-workers-and-pages","target_type":"Organization","repository_selection":"all","id":110658656}
```

`repository_selection: "all"` 이 나오면 — 그 org 의 모든 repo 가 즉시 가용. AI 가 API 만으로 연결 가능.

## API endpoints 카탈로그 (전수, 2026-05-24 실증)

base: `https://api.cloudflare.com/client/v4/accounts/{account_id}/...`
auth: `Authorization: Bearer <CLOUDFLARE_API_TOKEN>` (Edit Cloudflare Workers 권한)

### 연결 관리
| 작업 | method | path | 비고 |
|------|--------|------|------|
| repo connection 생성 (또는 upsert) | `PUT` | `/builds/repos/connections` | body: `{provider_type, provider_account_id, provider_account_name, repo_id, repo_name}`. 이미 있으면 modified_on 만 갱신 (idempotent) |
| repo connections 조회 | `GET` | `/builds/repos/connections` | 단일 연결만 있으면 404 가능 — 빈 상태로 봐도 무방, 새 trigger 만들면 자동 생성됨 |

### Trigger (Worker 별 빌드 설정)
| 작업 | method | path | 비고 |
|------|--------|------|------|
| trigger 목록 (Worker 별) | `GET` | `/builds/workers/{worker_tag}/triggers` | worker_tag = `script.tag` (32자 hex). `/workers/services/{name}` 의 `default_environment.script_tag` 에서 가져옴 |
| trigger 생성 | `POST` | `/builds/triggers` | body: `{external_script_id, repo_connection_uuid, build_token_uuid, trigger_name, build_command, deploy_command, root_directory, branch_includes, branch_excludes, path_includes, path_excludes}` |
| trigger 갱신 | `PATCH` | `/builds/triggers/{trigger_uuid}` | 부분 update OK. build_token_uuid 만 교체할 때도 사용 |

### Build (실행 + 로그)
| 작업 | method | path | 비고 |
|------|--------|------|------|
| Worker 별 build 목록 | `GET` | `/builds/workers/{worker_tag}/builds` | 최신 순. `status: queued/running/stopped`, `build_outcome: success/fail` |
| build 매뉴얼 트리거 | `POST` | `/builds/triggers/{trigger_uuid}/builds` | **body 반드시 `{"branch":"main"}`** — 빈 `{}` 는 `12002 Invalid request body`. webhook 외 강제 빌드용 |
| build 상세 | `GET` | `/builds/builds/{build_uuid}` | trigger snapshot + 타임라인 (initializing/running/stopped_on) |
| build 로그 | `GET` | `/builds/builds/{build_uuid}/logs` | `result.lines[i] = [timestamp_ms, message]`. 실패 진단 1순위 |
| build 취소 | `PUT` | `/builds/builds/{build_uuid}/cancel` | 진행 중 build 만 |

### Build Tokens
| 작업 | method | path | 비고 |
|------|--------|------|------|
| token 목록 | `GET` | `/builds/tokens` | `[{build_token_uuid, build_token_name, owner_type, cloudflare_token_id}]`. 가장 최근 token 이 보통 valid (이전 것들은 silent expire 가능) |

### Trigger 환경변수 (deploy 시점 inject)
| 작업 | method | path | 비고 |
|------|--------|------|------|
| 조회 | `GET` | `/builds/triggers/{trigger_uuid}/environment_variables` | build/deploy 시점에만 inject — runtime secrets 와 별개 (runtime 은 wrangler secret put) |
| set/upsert | `PATCH` | `/builds/triggers/{trigger_uuid}/environment_variables` | body: `{"KEY":{"value":"...","is_secret":true}}` — `is_secret:true` 는 로그·응답에서 자동 마스킹. private deps (`@modfolio/*` GitHub Packages) 쓰는 repo 는 `${GITHUB_TOKEN}` (또는 `.npmrc` 가 참조하는 이름)을 `is_secret:true` 로 필수 등록 — 안 하면 `bun install` private registry 인증 실패 → hang → silently timeout |
| 삭제 | `DELETE` | `/builds/triggers/{trigger_uuid}/environment_variables/{variable_key}` | |
| 빌드 캐시 purge | `POST` | `/builds/triggers/{trigger_uuid}/purge_build_cache` | bun.lock 변경 등 의존성 갱신 후 |

## 실제 진단 시퀀스 (gistcore 2026-05-24 — 23일간 deploy 멈춰 있던 케이스 복원)

이 순서 그대로 따라하면 sibling 어디서든 같은 진단 + 복구 가능. 전부 `athsra run <repo> --` 로 감싸기 (token inject).

### 1단계: 현재 상태 파악
```bash
# Worker 의 마지막 deploy 시각 + source
athsra run gistcore -- sh -c '
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/gistcore-app/deployments" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq ".result.deployments[0:3] | map({id, source, created_on, author_email})"
'
# ⚠️ 정정 (2026-05-31 modfolio-pay): deployment 의 source 필드만으로 CI vs 수동 판별 불가.
# Workers Builds trigger 의 deploy_command 가 `bunx wrangler deploy` 라서 (위 5d 단계 참조)
# CI 자동 배포도 source 가 "wrangler" 로 찍힌다. source 는 "마지막에 wrangler 를 실행한 주체"이지 "CI 인가"가 아님.
# → CI 자동화가 실제로 도는지는 deployments 가 아니라 **build history** 로 판별:
#   /builds/workers/{tag}/builds 가 비어 있거나 최근이 전부 build_outcome=fail 이면 자동화 끊긴 상태 (6단계).
```

### 2단계: Cloudflare GitHub App 설치 확인
```bash
gh api /orgs/modfolio/installations --jq '.installations[] | select(.app_slug | test("cloudflare"; "i"))'
# 결과 없으면 — 1회 Dashboard 에서 App 설치 (위 "사람 1회 작업" 섹션)
# 결과 있으면 — API 만으로 연결 가능, 다음 단계
```

### 3단계: Worker tag 추출
```bash
athsra run gistcore -- curl -s \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/services/gistcore-app" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r '.result.default_environment.script_tag'
# 32-hex tag — trigger/build API 의 worker 식별자
```

### 4단계: 기존 trigger 확인
```bash
athsra run gistcore -- curl -s \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/workers/<tag>/triggers" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.result[] | {trigger_uuid, build_token_name, trigger_name, root_directory, build_command, deploy_command, branch_includes}'
# trigger 가 이미 있으면 — build 실패 원인은 token 만료일 확률 99%
# trigger 가 없으면 — 5단계로 (신규 trigger 생성)
```

### 5단계 (필요 시): repo connection + trigger 신규 생성
```bash
# 5a. GitHub repo + owner id
gh api /repos/modfolio/<repo> --jq '{id, default_branch, owner: {id: .owner.id, login: .owner.login}}'

# 5b. repo connection (idempotent — 이미 있어도 PUT 안전)
athsra run <repo> -- curl -s -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/repos/connections" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "content-type: application/json" \
  -d '{
    "provider_type": "github",
    "provider_account_id": "<org_id>",
    "provider_account_name": "<org_login>",
    "repo_id": "<repo_id>",
    "repo_name": "<repo_name>"
  }' | jq '.result.repo_connection_uuid'

# 5c. 유효 build token UUID (가장 최근)
athsra run <repo> -- curl -s \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/tokens" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r '.result[0].build_token_uuid'

# 5d. trigger 생성
athsra run <repo> -- curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/triggers" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "content-type: application/json" \
  -d '{
    "external_script_id": "<worker_tag>",
    "repo_connection_uuid": "<connection_uuid>",
    "build_token_uuid": "<token_uuid>",
    "trigger_name": "Deploy default branch",
    "build_command": "bun install --frozen-lockfile && bun run build",
    "deploy_command": "bunx wrangler deploy",
    "root_directory": "apps/<app>",
    "branch_includes": ["main"],
    "branch_excludes": [],
    "path_includes": ["*"],
    "path_excludes": []
  }' | jq '.result.trigger_uuid'
```

### 6단계: 최근 build 결과 + 로그 (트러블슈팅 핵심)
```bash
athsra run <repo> -- sh -c '
TAG="<worker_tag>"
BUILD=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/workers/$TAG/builds" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r ".result[0].build_uuid")
echo "Build: $BUILD"
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/builds/$BUILD/logs" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r ".result.lines | .[] | (.[0]|tostring) + \"  \" + .[1]"
'
```

### 7단계: build token 만료 — PATCH 갱신 + 매뉴얼 빌드
```bash
# 로그에 "build token ... deleted or rolled" 가 보이면 이 단계 실행
athsra run <repo> -- sh -c '
LATEST=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/tokens" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r ".result[0].build_token_uuid")

# 모든 trigger 에 동일 token 적용 (대개 app + landing 2개)
for TRIG in <trigger_uuid_1> <trigger_uuid_2>; do
  curl -s -X PATCH "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/triggers/$TRIG" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "content-type: application/json" \
    -d "{\"build_token_uuid\":\"$LATEST\"}" | jq -r ".result.build_token_name"

  # 매뉴얼 트리거 — body 가 정확히 {"branch":"main"}
  curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/triggers/$TRIG/builds" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "content-type: application/json" \
    -d "{\"branch\":\"main\"}" | jq ".result | {build_uuid, status}"
done
'

# 30-60초 후 build 결과 확인 — success 면 자동화 복구 완료
```

## 함정 정리

| 함정 | 증상 | 해결 |
|------|------|------|
| build token silent expire | push 후 webhook 트리거 되나 build 5초 만에 fail. "Failed: The build token selected for this build has been deleted or rolled" | `GET /builds/tokens` 의 최신 token 으로 trigger PATCH (위 7단계) |
| 매뉴얼 트리거 body 누락 | `POST /builds/triggers/{uuid}/builds` with `{}` → `12002 Invalid request body` | body = `{"branch":"main"}` (또는 deploy 브랜치) |
| worker_tag 잘못 추출 | `/builds/workers/{tag}/...` 가 404 | `script.tag` 필드(`/workers/scripts/{name}` 또는 `/workers/services/{name}/default_environment/script_tag`) — `script_id` 아님 |
| GitHub App 미설치 | `PUT /builds/repos/connections` 가 권한 에러 | `cloudflare-workers-and-pages` App 을 GitHub org 에 1회 설치 (`gh api /orgs/{org}/installations` 로 확인) |
| repo connection 404 (GET) | `/builds/repos/connections` 가 빈 상태에서 404 반환 | 정상. PUT 으로 생성 시도 — idempotent |
| monorepo bun.lock 캐싱 안 됨 | "No package-lock.json, ... bun.lock! Build caching not supported" | root_directory 가 `apps/<app>` 라 monorepo root 의 `bun.lock` 못 찾음. symlink (`apps/<app>/bun.lock → ../../bun.lock`) 또는 build_command 앞에 `cd ../.. &&` 패턴. 작동에는 문제 없으나 build 시간 증가 |
| build_command_failed: null | build 가 시작 전 fail 이라 build command 실행도 안 함 | initializing 단계 fail. logs 확인하면 사유 명확 |
| private/local dep 설치 실패 | install 단계에서 fail/hang. **local 빌드는 통과**. 로그에 `ENOENT ... @modfolio/contracts` (file: 경로) 또는 GitHub Packages 401/403 (토큰 미주입) | (a) `file:../`·`link:../` 로컬 경로 의존 제거 → published `@modfolio/<pkg>@^x` 로 교체 (CI clone 엔 sibling 경로 없음). (b) published `@modfolio/*` 면 trigger 환경변수에 `GITHUB_TOKEN` 을 `is_secret:true` 로 설정 (PATCH endpoint) + repo 루트 `.npmrc`. **`@modfolio/*` 에 `file:`/`link:` 절대 금지** |
| **build script 가 CI 에서 `athsra run` 호출** (2026-06-21 fleet-wide 발견) | build 단계 `athsra: command not found` (exit 127). **local 빌드는 통과**(athsra 설치됨)라 안 보임. `apps/landing/package.json` 의 `"build": "athsra run <repo> -- astro build"` 가 전형. 영향: gistcore·modfolio(-app)·docs·admin(landing)·atelier-and-folio 등 → **build-token 복구해도 이 단계에서 재실패** | build/deploy 에서 **`athsra run` 제거** (CF runner 엔 athsra 없음). build 는 plain `astro build`/`bun run build`, **build-time secret 은 Builds trigger env**(`PATCH .../environment_variables`, `is_secret:true`)로 주입. athsra = **dev/CLI·로컬 deploy 전용 — CI 빌드 스크립트엔 금지** |
| **build script fix 를 stale local clone 으로 진단** (2026-06-22 fleet 복구 실증) | local `~/code/<repo>` HEAD 가 origin 보다 수주 뒤처졌는데 `git status` 는 "0 behind"(origin/main 추적 ref 자체가 stale — fetch 안 함) → local `package.json` build 가 이미 clean 처럼 보여 "고칠 것 없음" 오판. 실제 CF 가 빌드하는 건 **GitHub HEAD** | 진단·수정은 **GitHub `main` HEAD(contents API) + build 로그**가 ground truth — local clone·local `origin/main` 믿지 말 것. trigger `build_command` 는 보통 일반 `bun run build`(root `apps/<app>`)라 repo `package.json` 의 build 를 실행 → **fix = repo `package.json` 한 줄**(CF-side PATCH 아님, sibling 코드 edit). 실증: gistcore·docs·admin·modfolio 4개 한 줄 제거 → 5 worker 전부 build success + live 200 |

## ecosystem 차원의 정기 점검 (분기 1회 권장)

```bash
# 모든 sibling 의 trigger build_token 점검 스크립트
for repo in $(jq -r '.apps[].slug' /home/mod/code/modfolio-ecosystem/ecosystem.json); do
  echo "=== $repo ==="
  athsra run $repo -- sh -c '
    # 각 Worker 의 trigger 확인
    for svc in $(curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r ".result[] | select(.id | test(\"<sibling_pattern>\")) | .id"); do
      TAG=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/services/$svc" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r ".result.default_environment.script_tag")
      curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/workers/$TAG/builds" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq ".result[0:1] | map({svc:\"$svc\", status, outcome:.build_outcome, age_days:((now - (.created_on | fromdate)) / 86400 | floor)})"
    done
  '
done
```

마지막 build 가 30일 이상 stopped/fail 이면 토큰 만료 의심 — 7단계 적용.

## 한 번도 통할 수 있는 신규 sibling onboarding script (참고)

```bash
# 새 modfolio sibling 의 Workers Builds 연결 — 한 번에
ORG="modfolio"
REPO="<new-app>"          # GitHub repo 이름
WORKER="<worker-name>"     # CF Worker 이름 (wrangler.jsonc 의 name)
ROOT="apps/app"            # monorepo subroot (단일 앱이면 ".")
BRANCH="main"

# 1. GH org + repo 정보
ORG_ID=$(gh api /orgs/$ORG --jq .id)
REPO_INFO=$(gh api /repos/$ORG/$REPO)
REPO_ID=$(echo "$REPO_INFO" | jq -r .id)

athsra run $REPO -- sh -c "
  # 2. Worker tag
  TAG=\$(curl -s 'https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/services/$WORKER' \
    -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" | jq -r '.result.default_environment.script_tag')

  # 3. repo connection (idempotent)
  CONN=\$(curl -s -X PUT 'https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/repos/connections' \
    -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" -H 'content-type: application/json' \
    -d '{\"provider_type\":\"github\",\"provider_account_id\":\"$ORG_ID\",\"provider_account_name\":\"$ORG\",\"repo_id\":\"$REPO_ID\",\"repo_name\":\"$REPO\"}' \
    | jq -r '.result.repo_connection_uuid')

  # 4. 유효 build token
  TOK=\$(curl -s 'https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/tokens' \
    -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" | jq -r '.result[0].build_token_uuid')

  # 5. trigger 생성
  curl -s -X POST 'https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/triggers' \
    -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\" -H 'content-type: application/json' \
    -d '{
      \"external_script_id\": \"'\$TAG'\",
      \"repo_connection_uuid\": \"'\$CONN'\",
      \"build_token_uuid\": \"'\$TOK'\",
      \"trigger_name\": \"Deploy default branch\",
      \"build_command\": \"bun install --frozen-lockfile && bun run build\",
      \"deploy_command\": \"bunx wrangler deploy\",
      \"root_directory\": \"$ROOT\",
      \"branch_includes\": [\"$BRANCH\"],
      \"branch_excludes\": [],
      \"path_includes\": [\"*\"],
      \"path_excludes\": []
    }' | jq '.result.trigger_uuid'
"
```

이 한 블록으로 Worker 자동 deploy 가 라이브. 사용자 액션 0 (Cloudflare GitHub App 이 org 에 이미 설치되어 있다는 전제).

## 출처

- CF Workers Builds API reference: https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/
- CF Workers Builds GitHub integration: https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/
- workers-sdk #12058 (API support feature request 의 currently-existing 부분): https://github.com/cloudflare/workers-sdk/issues/12058
- 2026-05-24 gistcore 진단 세션 — `_legacy/` Abyssal v3 디자인 재구축 후 23일간 deploy 멈춤 → API 진단 + build token 갱신 → 두 Worker 모두 60초 만에 복구 (`a9a76dd5` fail → `02bbf574` success)

## 관련

- `knowledge/canon/cf-deploy.md` — 메커니즘/정책 (이 canon 으로 정정: line 42-43 "AI 는 못 한다" 부분 잘못된 정보)
- `knowledge/canon/cf-token-permissions.md` — 토큰 권한 모델 + 사용자 "All API" mega-token measurement + 권한 의심 차단 게이트
- `knowledge/canon/cf-api-mastery.md` — 전 영역 endpoint 카탈로그 + AI hallucination 차단. 이 canon 이 Workers Builds 1영역의 깊은 진단이라면 cf-api-mastery 는 전 영역 횡단 매뉴얼
- `knowledge/canon/gh-actions-policy.md` — Workers Builds 가 GitHub Actions minutes 0 사용하는 근거
- `knowledge/canon/secret-store.md` — athsra v3 token inject
- `knowledge/canon/solo-main-workflow.md` — main 직접 push → Workers Builds 자동 deploy
- `.claude/skills/deploy/SKILL.md` — 운영 절차 (이 canon 이 API source of truth)
- `.claude/skills/audit/SKILL.md` — 분기 점검 시 cf-audit 에 위 정기 점검 스크립트 통합 가능
