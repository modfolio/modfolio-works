---
title: Cloudflare API Mastery — 영역별 endpoint 카탈로그 + AI hallucination 차단
version: 1.1.0
last_updated: 2026-06-14
source: [2026-05-24 사용자 가설 검증 — "권한 다 있는데 AI 가 못한다고 hallucinate", direct API 측정, developers.cloudflare.com/api, 2026-06-14 athsra_run MCP 재검증]
changelog: ["1.1.0 (2026-06-14): 세션 내 athsra_run MCP 직접조작 경로 추가(CLI athsra run 과 등가, 터미널 불필요) + 2026-06-14 재검증 stamp(42 workers/10 pages/5 d1/20 kv/1 r2/10 queues 전부 200) + agent-auth-ux direct-operation 표준 연결"]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops, api-builder, all-agents]
---

# Cloudflare API Mastery — 영역별 endpoint 카탈로그 + AI hallucination 차단

> **사용자 fact (2026-05-24)**: "All API" 토큰 = 366 permission groups 중 353 보유 (96.4%, modfolio 운영 100% 커버). athsra `modfolio-ecosystem/CLOUDFLARE_API_TOKEN` inject. **AI 는 이 canon 의 endpoint/body/함정 카탈로그를 검증하기 전 "권한 부족 / 작동 불가 / API 한계" 보고 금지** (전부 hallucination 보고됨, `cf-token-permissions.md` 측정값 참조).

이 canon 은 (1) modfolio 가 실제 운영 중인 모든 CF 작업의 정확한 endpoint + body + 검증, (2) **AI 가 자주 hallucinate 했던 패턴 + 정공법 대안**, (3) wrangler v4 와 API 의 차이를 못 박는다. `cf-workers-builds-api.md` 가 Workers Builds 1개 영역의 깊은 진단이라면, 이 canon 은 **전 영역 횡단** 매뉴얼.

## 토큰 주입 = 두 경로 (둘 다 토큰 미노출)

CF API/wrangler 의 모든 인증은 athsra 주입 `CLOUDFLARE_API_TOKEN`(+`CLOUDFLARE_ACCOUNT_ID`)로 한다. 하드코딩·`wrangler login` 금지. AI 는 **사용자에게 터미널 명령을 떠넘기지 않고 직접 실행**한다 (`agent-auth-flow.md` direct-operation 표준).

| 경로 | 언제 | 형태 |
|---|---|---|
| **`athsra_run` MCP** (권장, 세션 내) | AI 가 이 대화 세션에서 직접 조작 | `athsra_run(project="modfolio-ecosystem", command="bun"\|"curl"\|"node", args=[...], return_output=true)`. 터미널 0. 알려진 빌드/런타임 명령(bun/node/npm/wrangler/bunx/npx/curl 등) 직접; 그 외는 `confirm="modfolio-ecosystem"`. **secret 값은 응답에서 자동 scrub** |
| **`athsra run` CLI** (등가, 스크립트/터미널) | bash 스크립트·CI·문서 예시 | `athsra run modfolio-ecosystem -- bash -c '... $CLOUDFLARE_API_TOKEN ...'` |

> 아래 모든 § recipe 의 `athsra run <repo> -- ...` 는 세션 내에서는 `athsra_run` MCP 와 등가다. REST 직접 호출은 `command="bun"` + `fetch` 또는 `command="curl"` 로.

### 재검증 (2026-06-14, `athsra_run` MCP)

mega-token + 주입 + 직접조작이 **전 영역 작동** 실측:

```
tokens/verify → status: active
zones 200·workers 200(n=42)·pages 200(n=10)·d1 200(n=5)·kv 200(n=20)·r2 200(n=1)·queues 200(n=10)
```

→ "CF 가 API 로 안 된다 / 권한 부족 / 대시보드 전용" 결론은 hallucination (§ 7 H1·H8). 토큰·주입·직접조작 모두 검증됨. 의심 전 이 stamp + `cf-token-permissions.md` 게이트 먼저.

## 사용 흐름 (AI 가 따라야 할 순서)

```
사용자 CF 작업 요청
  ↓
[STEP 0] § 8 "사용자 작업 시나리오별 quick recipe" 에서 매칭 시나리오 찾음 (S1~S7)
         → 매칭되면 그 recipe 그대로 실행 (가장 빠른 경로)
  ↓
[STEP 1] 매칭 시나리오 없음 → cf-token-permissions.md 의 권한 의심 차단 게이트 통과
  ↓
[STEP 2] 해당 영역 § 1~6 (Workers/Pages/DNS/Domain/Hostname/Zone) 의 endpoint + body 확인
  ↓
[STEP 3] 실행 — 정확한 method/path/body, athsra run 으로 wrap, raw HTTP 응답 캡처
  ↓
[STEP 4] 실패 시 § 7 hallucination 카탈로그 (H1~H13) 패턴 매칭 → 정공법 적용
  ↓
[STEP 5] § 9 검증 패턴 으로 사용자 보고 — raw response body 포함, "안 됨" 결론은 STEP 4 통과 후만
```

---

## § 1. Workers

### 1.1 Worker script 자체

base: `https://api.cloudflare.com/client/v4/accounts/{account_id}`

| 작업 | method | path | 비고 |
|------|--------|------|------|
| script list | GET | `/workers/scripts` | 모든 worker name + script_tag |
| script detail | GET | `/workers/scripts/{name}` | metadata + bindings |
| service (env 포함) | GET | `/workers/services/{name}` | **default_environment.script_tag 가 Workers Builds API 의 worker_tag** |
| script upload (raw) | PUT | `/workers/scripts/{name}` | 비추 — wrangler deploy 가 정공법 |
| script delete | DELETE | `/workers/scripts/{name}` | 모든 binding 같이 제거 — 사전 확인 |
| deployments list | GET | `/workers/scripts/{name}/deployments` | source: `wrangler`/`ci`/`dashboard` 식별 |
| deployment delete | DELETE | `/workers/scripts/{name}/deployments/{id}` | **latest (active) 는 불가** — rollout 후 시도 |
| versions list | GET | `/workers/scripts/{name}/versions` | versions upload 한 것 (active 아닌 것 포함) |
| version detail | GET | `/workers/scripts/{name}/versions/{id}` | message, annotations |
| secret put | PUT | `/workers/scripts/{name}/secrets` | body: `{"name":"K","text":"V","type":"secret_text"}` |
| secret list (메타) | GET | `/workers/scripts/{name}/secrets` | name + type만, value 없음 |
| secret delete | DELETE | `/workers/scripts/{name}/secrets/{name}` | runtime secret 제거 |
| settings (vars 포함) | GET/PATCH | `/workers/scripts/{name}/settings` | wrangler.jsonc `vars` 와 대응되는 평문 환경변수. **PATCH body 는 multipart/form-data** (`settings` JSON 파트) — JSON content-type 시 415 |
| subdomain (workers.dev) | GET/POST | `/workers/scripts/{name}/subdomain` | `{"enabled": true/false, "previews_enabled": true/false}` |
| account subdomain | GET/PUT | `/workers/subdomain` | account 전체의 `*.workers.dev` 이름 (1회 설정) |

### 1.2 Worker custom domains (Account-level, ≠ Pages domain)

> **자주 혼동되는 영역**. Worker custom domain ≠ Pages domain ≠ DNS record ≠ Zone:Custom Hostnames(SaaS). 4개가 분리된 시스템.

| 작업 | method | path | 비고 |
|------|--------|------|------|
| Worker domain list | GET | `/workers/domains?per_page=50` | account 전체의 Worker→domain 매핑 |
| Worker domain attach | PUT | `/workers/domains` | body: `{"zone_id": "<zid>", "hostname": "<fqdn>", "service": "<worker_name>", "environment": "production"}`. **idempotent — 같은 hostname 이 다른 worker 에 붙어있으면 옮김** |
| Worker domain detach | DELETE | `/workers/domains/{domain_id}` | body 없음. domain_id 는 list 응답의 `id` |

wrangler 명령 등가물:
```bash
athsra run <repo> -- bunx --bun wrangler domains add <hostname> --name <worker>
athsra run <repo> -- bunx --bun wrangler domains list
athsra run <repo> -- bunx --bun wrangler domains remove <hostname>
```

### 1.3 Worker routes (Zone-level, `<host>/<path>` 패턴 라우팅)

> Worker custom domain 과 다른 시스템 — routes 는 zone 안의 path 패턴, custom domain 은 전체 hostname.

| 작업 | method | path | 비고 |
|------|--------|------|------|
| routes list | GET | `/zones/{zone_id}/workers/routes` | |
| route create | POST | `/zones/{zone_id}/workers/routes` | body: `{"pattern":"example.com/*","script":"<worker>"}` |
| route update | PUT | `/zones/{zone_id}/workers/routes/{route_id}` | |
| route delete | DELETE | `/zones/{zone_id}/workers/routes/{route_id}` | |

### 1.4 KV / R2 / D1

KV namespace: `/accounts/{aid}/storage/kv/namespaces` (list/create), `/{ns_id}/values/{key}` (put/get/delete), `/{ns_id}/keys` (list keys)

R2 bucket: `/accounts/{aid}/r2/buckets` (list/create/delete), object S3-compat endpoint은 별도 `<aid>.r2.cloudflarestorage.com/<bucket>/<key>`

D1: `/accounts/{aid}/d1/database` (list/create/delete), `/{db_id}/query` (POST body: `{"sql":"SELECT ..."}`), `/{db_id}/export` (백업)

wrangler v4 ⚠️ — KV/R2/D1 데이터 명령 **기본 local**. production 조작 시 `--remote` 필수 (`cf-deploy.md` § 2-3).

### 1.5 Tail (runtime logs)

```bash
athsra run <repo> -- bunx --bun wrangler tail <worker_name> --format pretty
# 또는 API: POST /accounts/{aid}/workers/scripts/{name}/tails → WebSocket URL 반환
```

---

## § 2. Pages (cf-pages app 운영 — 14개)

> **자주 hallucinate 되는 영역**: AI 가 Pages 를 "deprecated 라 API 없음" 으로 가정하는 사례 빈번. **사실 아님** — Pages API 는 풀 카탈로그 작동 중. Workers 로 권장 이관 (`pages-to-workers-migration.md`) 이지만 운영 중인 cf-pages app 은 정상 관리.

base: `https://api.cloudflare.com/client/v4/accounts/{account_id}/pages`

### 2.1 Projects

| 작업 | method | path | 비고 |
|------|--------|------|------|
| list | GET | `/projects?per_page=25` | 페이지네이션 |
| detail | GET | `/projects/{name}` | name 은 dashboard 의 project 이름 (id 아님) |
| create | POST | `/projects` | body: `{"name":"...","production_branch":"main"}` + (선택) build_config |
| update | PATCH | `/projects/{name}` | build_config, env vars, source 등 부분 갱신 |
| delete | DELETE | `/projects/{name}` | **deployments < 100 일 때만 성공** (drift 함정 — 아래 cleanup 참고) |

### 2.2 Deployments

| 작업 | method | path | 비고 |
|------|--------|------|------|
| list | GET | `/projects/{name}/deployments?per_page=25&page=N` | |
| detail | GET | `/projects/{name}/deployments/{id}` | |
| create (direct upload) | POST | `/projects/{name}/deployments` | wrangler pages deploy 로 충분 — API 직접 호출 비추 |
| **delete** | DELETE | `/projects/{name}/deployments/{id}?force=true` | **`force=true` 없으면 aliased deployment 거부**. **latest production (aliases 비어있지 않은 최신) 은 force 도 불가** |
| retry | POST | `/projects/{name}/deployments/{id}/retry` | 실패한 build 재시도 |
| rollback | POST | `/projects/{name}/deployments/{id}/rollback` | 해당 deployment 를 production 으로 승격 |

#### Bulk deployment cleanup (Pages 프로젝트 삭제 전제 — count < 100)

`pages-to-workers-migration.md` § 13 에 완성된 script 있음. 핵심:

```bash
athsra run <repo> -- bash -c '
PROJECT="<project>"
page=1
while true; do
  RESP=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/deployments?per_page=25&page=$page")
  # production aliased deployment 제외
  IDS=$(echo "$RESP" | jq -r ".result[] | select((.aliases // []) | length == 0) | .id")
  [ -z "$IDS" ] && break
  for id in $IDS; do
    curl -s -X DELETE -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/deployments/$id?force=true" \
      > /dev/null
    sleep 0.3   # rate limit 예방 (1200 req/5min/account)
  done
  page=$((page+1))
done
'
```

### 2.3 Domains (Pages domain — Worker custom domain 과 다름)

| 작업 | method | path | 비고 |
|------|--------|------|------|
| list | GET | `/projects/{name}/domains` | |
| attach | POST | `/projects/{name}/domains` | body: `{"name":"app.modfolio.io"}`. CF 가 자동 CNAME → `<project>.pages.dev`. **DNS zone 이 같은 account 에 있을 때만 auto-CNAME**. 외부 DNS 면 사용자가 직접 CNAME 추가 |
| detail | GET | `/projects/{name}/domains/{name}` | |
| **delete** | DELETE | `/projects/{name}/domains/{name}` | hostname 자체 삭제. DNS record 는 별도 — Zone DNS API 로 정리 필요 |

wrangler 명령:
```bash
athsra run <repo> -- bunx --bun wrangler pages domain list --project-name <project>
athsra run <repo> -- bunx --bun wrangler pages domain add <hostname> --project-name <project>
athsra run <repo> -- bunx --bun wrangler pages domain remove <hostname> --project-name <project>
```

### 2.4 Env vars (Pages)

Pages env vars 는 **project-level + branch-specific** 두 종류. 일반/secret 구분.

```
PATCH /projects/{name}                       # body 의 deployment_configs.production.env_vars 또는 .preview.env_vars
                                              # secret 은 {"type":"secret_text","value":"..."}
                                              # plain 은 {"value":"..."}
```

wrangler 명령:
```bash
athsra run <repo> -- bunx --bun wrangler pages secret put NAME --project-name <project>
athsra run <repo> -- bunx --bun wrangler pages secret list --project-name <project>
athsra run <repo> -- bunx --bun wrangler pages secret delete NAME --project-name <project>
```

> Pages 의 env var 는 Worker env var 와 다른 endpoint. AI 가 자주 혼동 — `/workers/scripts/{name}/secrets` 를 Pages 에 시도하면 404.

---

## § 3. DNS Records (Zone-level)

base: `https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records`

| 작업 | method | path | 비고 |
|------|--------|------|------|
| list | GET | `?per_page=100&type=A,CNAME,TXT` | type filter, name filter (`name=app.modfolio.io`), match=`any`/`all` |
| create | POST | (root) | body: `{"type":"A","name":"www","content":"1.2.3.4","ttl":3600,"proxied":true}`. `name` 은 short 또는 FQDN |
| detail | GET | `/{id}` | |
| update (full replace) | PUT | `/{id}` | body 의 모든 필드 명시 |
| update (partial) | PATCH | `/{id}` | body 의 변경 필드만 |
| **delete** | DELETE | `/{id}` | id 는 list/detail 에서 확보. **name 으로 직접 삭제 불가** — list → filter → id → delete 패턴 |
| import (BIND) | POST | `/zones/{zid}/dns_records/import` | multipart, file=BIND zone file |
| export | GET | `/zones/{zid}/dns_records/export` | BIND format |
| scan | POST | `/zones/{zid}/dns_records/scan` | 신규 zone 자동 record 추정 |

### 자주 쓰는 record type 패턴

```bash
# A record (IPv4)
{"type":"A","name":"www","content":"203.0.113.1","ttl":1,"proxied":true}

# CNAME (Workers custom domain auto-CNAME 대응)
{"type":"CNAME","name":"app","content":"<worker-name>.<account-subdomain>.workers.dev","ttl":1,"proxied":true}

# TXT (SPF/DKIM/site verify)
{"type":"TXT","name":"@","content":"v=spf1 include:_spf.example.com -all","ttl":3600,"comment":"spf record"}

# MX
{"type":"MX","name":"@","content":"mail.example.com","priority":10,"ttl":3600}

# CAA (인증서 발급 제한)
{"type":"CAA","name":"@","content":"0 issue \"letsencrypt.org\"","ttl":3600}
```

### Bulk DNS cleanup (예: 옛 도메인 retire 시)

```bash
athsra run modfolio-ecosystem -- bash -c '
ZID="<zone_id>"
PATTERN="^(staging|test|legacy)\\."
H="Authorization: Bearer $CLOUDFLARE_API_TOKEN"

# 1. 매칭되는 record id 추출
IDS=$(curl -s -H "$H" \
  "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records?per_page=200" \
  | jq -r ".result[] | select(.name | test(\"$PATTERN\")) | .id")

# 2. 삭제
for id in $IDS; do
  curl -s -X DELETE -H "$H" \
    "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records/$id" \
    | jq -r ".result.id // .errors"
  sleep 0.3
done
'
```

---

## § 4. Custom Hostnames (Cloudflare for SaaS — 사용자 토큰 미보유)

> 일반 도메인 운영에는 **불필요**. Cloudflare for SaaS = 멀티테넌트 SaaS 앱이 고객 도메인 (`customer.example.com`) 을 가져와서 동적 발급 시 사용. modfolio 에서 사용 가능성 거의 0.

권한 추가 필요: `cf-token-permissions.md` § "Custom Hostnames 1개만 추가하고 싶을 때". Zone 의 Cloudflare for SaaS 도 별도 활성 필요.

base: `https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames`

| 작업 | method | path | 비고 |
|------|--------|------|------|
| list | GET | `?per_page=50` | |
| create | POST | (root) | body: `{"hostname":"customer.example.com","ssl":{"method":"http","type":"dv","settings":{"min_tls_version":"1.2"}}}` |
| detail | GET | `/{id}` | |
| **delete** (cert 같이) | DELETE | `/{id}` | hostname + SSL cert 같이 제거 |

---

## § 5. Zone-level 기타

### 5.1 Zone settings

```
GET    /zones/{zid}/settings                  # 전체 설정 dump
PATCH  /zones/{zid}/settings                  # body: {"items":[{"id":"ssl","value":"strict"}]}
GET    /zones/{zid}/settings/{setting_id}     # 단일 — id 예: ssl, always_use_https, http3, min_tls_version, brotli
PATCH  /zones/{zid}/settings/{setting_id}     # body: {"value":"on"} or string/object 별
```

자주 쓰는 setting id: `ssl` (off/flexible/full/strict), `always_use_https`, `http3` (on/off), `min_tls_version` (1.0/1.1/1.2/1.3), `tls_1_3` (on/off/zrt), `automatic_https_rewrites`, `brotli`, `early_hints`.

### 5.2 Cache purge

```bash
# Purge everything
curl -s -X POST -H "$H" -H "content-type: application/json" \
  "https://api.cloudflare.com/client/v4/zones/$ZID/purge_cache" \
  -d '{"purge_everything":true}'

# Purge specific URLs (rate limit: 1000 URL/min)
curl -s -X POST -H "$H" -H "content-type: application/json" \
  "https://api.cloudflare.com/client/v4/zones/$ZID/purge_cache" \
  -d '{"files":["https://modfolio.io/_app/js/start.js"]}'

# Purge by hostname (Enterprise)
# -d '{"hosts":["modfolio.io"]}'
```

### 5.3 Page Rules / Rulesets

- Legacy Page Rules: `/zones/{zid}/pagerules` (deprecated, 새 zone 에 안 쓰는 게 정공법)
- Modern Rulesets (Transform/WAF custom rules): `/zones/{zid}/rulesets`, `/rulesets/{id}/rules`

---

## § 6. wrangler v4 — API 와 wrangler 의 매핑 + 함정

`cf-deploy.md` § 2-3 의 정확한 명령 표가 source of truth. 핵심:

- `wrangler deploy` ≠ `wrangler publish` (v3 이름 제거됨)
- `wrangler --version` ≠ `wrangler version` (서브커맨드 제거)
- KV/R2/D1 데이터 명령은 **v4 기본 local** — production 은 `--remote` 필수
- `wrangler secret put` 은 stdin 으로 값 전달 (비대화형). `--secret` 플래그 사용 안 함
- `wrangler pages deploy` (현행) ≠ `wrangler pages publish` (deprecated)

athsra inject 패턴 (모든 wrangler 명령 공통):
```bash
athsra run <repo> -- bunx --bun wrangler <cmd>
# CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID 자동 inject — OAuth interactive 차단됨
```

---

## § 7. AI Hallucination 카탈로그 (정공법 핵심)

> **이 섹션이 이 canon 의 raison d'être**. 사용자 보고 (2026-05-24): "권한 있는 mega-token 인데 AI 가 계속 못한다 hallucinate". 패턴별로 정공법 박음.

### H1. "API 권한이 없습니다" 가정

**증상**: AI 가 작업 실패 시 즉시 "토큰 권한이 없어서…" 결론.

**왜 hallucination 인가**: 사용자 토큰은 353/366 permission groups 보유 (`cf-token-permissions.md` 측정값). 토큰 결함이 진짜 원인일 확률 < 4%.

**정공법**:
1. `cf-token-permissions.md` § "권한 의심 차단 게이트" 의 Gate A/B/C 실행
2. 모두 200 통과 시 — 권한 아님. 다른 원인 (H2~H12) 점검
3. 진짜 403 만 보고 (raw response 인용)

### H2. 잘못된 endpoint path

**증상**: 404 또는 "no such endpoint", route 추정으로 시도

**자주 틀리는 패턴**:
- Worker domain 을 `/workers/scripts/{name}/domains` 로 시도 — **틀림**. 정답: `/workers/domains` (account-level, body 에 service+hostname)
- Pages deployment 를 `/pages/deployments/{id}` 로 시도 — **틀림**. 정답: `/pages/projects/{name}/deployments/{id}`
- DNS record 를 `/zones/{zid}/dns/records/{id}` (slash) — **틀림**. 정답: `/zones/{zid}/dns_records/{id}` (underscore)
- Worker tag 를 script name 으로 혼용 — **틀림**. Workers Builds API 는 `script_tag` (32-hex), CRUD 는 script `name` 둘 다 등장 — 위치 별 다름

**정공법**: § 1~5 의 endpoint 표를 그대로 인용 + curl 시도 시 path 를 사용자에게 보여주기.

### H3. Body 형식 누락 / 잘못된 form

**증상**: 400 `Invalid request body` / `12002`

**자주 틀리는 패턴**:
- Workers Builds manual trigger: `POST /builds/triggers/{uuid}/builds` body `{}` → 12002. **정답 `{"branch":"main"}`** (`cf-workers-builds-api.md` § "함정 정리")
- Worker settings PATCH: JSON content-type 시도 → 415. **정답 multipart/form-data** with `settings` 파트
- DNS record create: `name` 에 trailing dot 안 붙임 — CF 가 자동 정규화하지만 명시 권장
- Custom domain attach: `{"hostname":"..."}` 만 보냄 → 400. **정답 `{"zone_id","hostname","service","environment"}` 4개 필수**

**정공법**: 각 endpoint 의 정확한 body schema 는 § 1~5 표 + `curl -v` 로 raw error message 확인.

### H4. Resource ID 추출 실수

**증상**: 404 또는 "not found" — endpoint 는 맞는데 ID 가 잘못됨.

**자주 혼동되는 ID**:
- `script_id` (=name) vs `script_tag` (=32-hex). Workers Builds API 는 `script_tag` 만 받음
- `account_id` vs `account_name` ("Winterermod@gmail.com's Account"). API path 는 항상 `account_id`
- Pages `project_name` vs `project_id`. API path 는 `project_name` (=URL slug)
- `zone_id` vs `zone_name` ("modfolio.io"). path 는 `zone_id` (32-hex)
- `deployment_id` (worker) vs `deployment_id` (pages). 두 endpoint 가 다른 시스템 — 섞어 쓰면 404

**정공법**:
```bash
# 정확한 ID 추출 헬퍼 (모든 작업 직전에)
ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID"
ZONE_ID=$(curl -s -H "$H" "https://api.cloudflare.com/client/v4/zones?name=modfolio.io" | jq -r '.result[0].id')
WORKER_NAME="modfolio-app"
WORKER_TAG=$(curl -s -H "$H" "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/services/$WORKER_NAME" | jq -r '.result.default_environment.script_tag')
```

### H5. wrangler v3 명령을 v4 에서 시도

**증상**: `Unknown command: publish` / `Unknown subcommand: version`

**자주 틀리는 패턴**:
- `wrangler publish` → `wrangler deploy` (v4 이름)
- `wrangler version` → `wrangler --version` (플래그 형태)
- `wrangler dev --remote` 누락 — v4 의 dev 는 local 기본

**정공법**: `cf-deploy.md` § 2-3 표 사용. wrangler 버전 확인 (`bunx wrangler --version`).

### H6. wrangler v4 `--remote` 누락 → 무음 local

**증상**: 명령은 성공처럼 보이지만 production 에 반영 안 됨.

**자주 틀리는 패턴**:
- `wrangler kv key put ... --binding SESSION` → local KV 에만 씀
- `wrangler d1 execute ... --command "INSERT ..."` → local D1 에만 씀
- `wrangler r2 object put ...` → local R2 에만 씀

**정공법**: production data 명령에는 **항상 `--remote`**. 또는 API 직접 호출 (`/accounts/.../storage/kv/namespaces/{ns_id}/values/{key}`).

### H7. Interactive prompt 진입 → 무한 대기

**증상**: AI 환경에서 wrangler 가 응답 대기 (login, "Confirm? [Y/n]" 등) — 사용자 입력 못 받아서 hang.

**자주 트리거**:
- `CLOUDFLARE_API_TOKEN` 미 inject → OAuth 로그인 시도
- `wrangler login` 직접 실행
- 첫 deploy 시 `Confirm subdomain registration` 프롬프트
- `wrangler delete` 시 confirm
- telemetry prompt (해결: `bunx wrangler telemetry disable` 1회)

**정공법**:
- 모든 wrangler 명령 `athsra run <repo> --` 로 wrap (token inject + 어떤 stdin 도 닫음)
- 위험 명령은 `--force` / `-y` 플래그 추가 (delete, dispatch 등)
- telemetry 는 모든 환경에서 `wrangler telemetry disable` 1회 (`pages-to-workers-migration.md` 전제 체크리스트)

### H8. "이건 dashboard 에서만 됩니다" 가정

**증상**: AI 가 GitHub repo 연결, 환경변수 추가, Pages domain 변경 등을 "dashboard 전용" 으로 가정 → 사용자에게 수동 작업 떠넘김.

**왜 hallucination 인가**: 2026 기준 CF 의 거의 모든 dashboard UI 작업은 API 가용. Workers Builds 도 (이전 잘못된 canon 주장에도 불구) API 가능 — `cf-workers-builds-api.md` 가 입증.

**정공법**: § 1~5 의 endpoint 표 확인. 진짜 API 없는 작업은 **거의 없음**. 의심 시 https://developers.cloudflare.com/api/ search 후 보고. 1 회만 진짜 사람이 필요한 작업 = **Cloudflare GitHub App 의 GitHub org 설치** (`cf-workers-builds-api.md` § "사람 1회 작업").

### H9. Pages 가 "deprecated" 라 API 작동 안 함 가정

**증상**: AI 가 Pages 작업을 회피 — "Workers 로 가야 합니다", "Pages 는 곧 제거됩니다" 등.

**사실**: Pages 는 **2026-05 기준 정상 운영**. CF 권고는 신규 = Workers, 기존 Pages 는 운영 유지. modfolio 의 14개 cf-pages app 이 증거. API 풀 카탈로그 작동.

**정공법**: § 2 의 endpoint 표 그대로 사용. 이관은 별도 결정 (`pages-to-workers-migration.md`).

### H10. Stale endpoint / deprecated API 사용

**증상**: 404 또는 "endpoint not found" — 옛 (2023~2024) docs 의 endpoint 기억으로 시도.

**자주 틀리는 deprecated endpoint**:
- `/accounts/{aid}/workers/dispatch/namespaces/...` (구 dispatch 시스템) — 현행 `/accounts/{aid}/workers/dispatch/namespaces/{name}` 는 살아있지만 schema 변경됨
- `/zones/{zid}/firewall/rules` (구 legacy firewall) → 현행 `/zones/{zid}/rulesets` (Modern WAF)
- `/zones/{zid}/pagerules` — 살아있지만 신규 = `/rulesets` 사용
- `/accounts/{aid}/pages/deployments` (project 없이) — **존재 안 함**. 정답 `/projects/{name}/deployments`

**정공법**: 모든 endpoint 사용 전 https://developers.cloudflare.com/api/ 의 path 검증.

### H11. Cloudflare for SaaS vs 일반 zone 혼동

**증상**: 일반 도메인 DNS 작업을 `/zones/{zid}/custom_hostnames` 로 시도 → 403 / 404

**원인**: Custom Hostnames = Cloudflare for SaaS 멀티테넌트 전용. 일반 도메인은 그냥 DNS record.

**정공법**:
- 자기 zone 안의 도메인 추가 → § 3 (DNS records) + § 1.2 (Worker custom domain) 또는 § 2.3 (Pages domain)
- 외부 고객의 도메인을 동적 발급 → § 4 (Custom Hostnames). 사용자 토큰은 이 권한 미보유 + zone 도 SaaS 비활성.

### H12. Rate limit 무지

**증상**: 429 Too Many Requests, 갑자기 모든 호출 실패.

**한도** (2026-05 기준):
- General API: **1200 req / 5min / account**
- DNS records bulk: per_page=25, sleep 0.3 권장 (migration.md 패턴)
- Pages deployments delete: rate 보호 sleep 0.5
- Custom hostname: 별도 더 낮은 한도

**정공법**: bulk 작업 시 sleep 삽입 + 429 시 exponential backoff. raw response 의 `Retry-After` 헤더 확인.

### H13. `athsra run` 없이 직접 curl 시도

**증상**: `$CLOUDFLARE_API_TOKEN` env 미 설정 → 401, 또는 토큰 하드코딩 시도 (secrets-policy 위반).

**정공법**: 모든 CF API curl 명령은 `athsra run <repo> -- bash -c '...'` 로 wrap. token 은 절대 명령 argv 에 노출 X.

---

## § 8. 사용자 작업 시나리오별 quick recipe (end-to-end)

> AI 가 사용자의 자연어 요청 ("환경변수 추가해", "GH 연결해", "Pages 다 지워" 등) 을 받으면 아래 시나리오 매칭 → 그대로 실행. 각 recipe 는 **검증 명령 포함** — 실패 시 § 7 hallucination 카탈로그 H1~H13 적용.

### S1. 기존 Worker 환경변수 추가/수정

3 종류 환경변수를 구분: **runtime secret (암호)**, **plain var (평문 wrangler.jsonc vars)**, **build-time env (Workers Builds)**.

#### S1-a. Runtime secret 추가 (wrangler — 가장 권장)

```bash
# stdin 으로 값 전달 (비대화형). 명령 argv 노출 0
athsra run <repo> -- bash -c '
  cd apps/<app>
  echo -n "<secret-value>" | bunx --bun wrangler secret put <NAME>
'

# 검증 — 메타만 (값은 안 보임)
athsra run <repo> -- bunx --bun wrangler secret list
```

#### S1-b. Runtime secret 추가 (API 직접)

```bash
athsra run <repo> -- bash -c '
curl -s -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/<worker>/secrets" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "content-type: application/json" \
  -d "{\"name\":\"<NAME>\",\"text\":\"<value>\",\"type\":\"secret_text\"}" \
  | jq "{success, name: .result.name}"
'
```

#### S1-c. Plain var (wrangler.jsonc 의 `vars` 블록) 수정

```bash
# 1. wrangler.jsonc 의 vars 블록 편집
# {"vars": {"API_URL": "https://...", "FEATURE_FLAG": "on"}}

# 2. 배포 — 새 vars 가 production 으로
athsra run <repo> -- bash -c "cd apps/<app> && bunx --bun wrangler deploy"

# 검증
athsra run <repo> -- bash -c '
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/<worker>/settings" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq ".result.bindings | map(select(.type == \"plain_text\"))"
'
```

#### S1-d. Build-time env var (Workers Builds 시점)

`cf-workers-builds-api.md` § "Trigger 환경변수" — 빌드 시점에만 inject (런타임 secret 과 별개).

```bash
athsra run <repo> -- bash -c '
TRIG_UUID="<trigger_uuid>"
curl -s -X PATCH \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/triggers/$TRIG_UUID/environment_variables" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "content-type: application/json" \
  -d "{\"NODE_VERSION\":{\"value\":\"22\"},\"BUILD_FLAG\":{\"value\":\"production\"}}" \
  | jq ".result"
'
```

**함정**:
- runtime vs build-time 혼동 (H4 변형) — runtime 은 `process.env.X` / `env.X`, build-time 은 `bun run build` 시점만
- secret list 가 값 안 줌 — 정상 (CF 정책). 값 확인은 wrangler tail 로 사용 흔적 추적

### S2. GH → 기존 Worker 에 연결 (Workers Builds 활성화)

`cf-workers-builds-api.md` § 5 "repo connection + trigger 신규 생성" 의 풀 스크립트 인용. 핵심:

```bash
# Pre-req: Cloudflare GitHub App 이 org 에 이미 설치 (1회 작업 — gh api /orgs/<org>/installations 확인)
ORG="modfolio"; REPO="<repo>"; WORKER="<worker-name>"; ROOT="apps/<app>"
ORG_ID=$(gh api /orgs/$ORG --jq .id)
REPO_ID=$(gh api /repos/$ORG/$REPO --jq .id)

athsra run $REPO -- bash -c "
  H=\"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\"
  AID=\"\$CLOUDFLARE_ACCOUNT_ID\"

  # Worker tag
  TAG=\$(curl -s -H \"\$H\" \"https://api.cloudflare.com/client/v4/accounts/\$AID/workers/services/$WORKER\" | jq -r '.result.default_environment.script_tag')

  # repo connection (idempotent PUT)
  CONN=\$(curl -s -X PUT -H \"\$H\" -H 'content-type: application/json' \
    \"https://api.cloudflare.com/client/v4/accounts/\$AID/builds/repos/connections\" \
    -d '{\"provider_type\":\"github\",\"provider_account_id\":\"$ORG_ID\",\"provider_account_name\":\"$ORG\",\"repo_id\":\"$REPO_ID\",\"repo_name\":\"$REPO\"}' \
    | jq -r '.result.repo_connection_uuid')

  # 유효 build token (가장 최근)
  TOK=\$(curl -s -H \"\$H\" \"https://api.cloudflare.com/client/v4/accounts/\$AID/builds/tokens\" | jq -r '.result[0].build_token_uuid')

  # trigger 생성
  curl -s -X POST -H \"\$H\" -H 'content-type: application/json' \
    \"https://api.cloudflare.com/client/v4/accounts/\$AID/builds/triggers\" \
    -d '{
      \"external_script_id\":\"'\$TAG'\",
      \"repo_connection_uuid\":\"'\$CONN'\",
      \"build_token_uuid\":\"'\$TOK'\",
      \"trigger_name\":\"Deploy default branch\",
      \"build_command\":\"bun install --frozen-lockfile && bun run build\",
      \"deploy_command\":\"bunx wrangler deploy\",
      \"root_directory\":\"$ROOT\",
      \"branch_includes\":[\"main\"],
      \"branch_excludes\":[],
      \"path_includes\":[\"*\"],
      \"path_excludes\":[]
    }' | jq '.result.trigger_uuid'
"
```

**검증**: 다음 `git push origin main` 후 30~60초 내 새 commit 으로 deployment 추가. 안 되면 § S5 진단.

### S3. Pages 삭제하고 Workers 만들기

`pages-to-workers-migration.md` 13 단계 풀 절차 — 요약:

```
1. wrangler.jsonc 작성 (Astro 6 / SvelteKit 5 / Next.js 별 main + assets + bindings)
2. KV SESSION 등 state-bearing binding 의 namespace id 재사용
3. (rename 시) 코드 도메인 레퍼런스 grep + 교체
4. (SSO 앱) modfolio-connect 의 redirect_uris 이중화
5. wrangler deploy --dry-run 으로 0 errors 확인
6. wrangler deploy (custom domain 미부여 — workers.dev 검증)
7. wrangler domains add <new-domain> --name <worker>
8. 24h~72h soak
9. (rename 시) wrangler pages domain remove <project> <old-domain>
10. wrangler domains add <old-domain> --name <worker>  (다운타임 5~30초)
11. D+7: modfolio-connect 에서 old callback 제거
12. (rename 완전 제거 시) wrangler domains remove <old-domain>
13. Pages project 삭제 (deployments < 100 선행 — § S4)
```

### S4. Pages deployment 100 미만으로 bulk delete (project 삭제 전제)

> 99 개 이하 = 100 미만. CF 정책: deployment 가 100 개 이상이면 `wrangler pages project delete` 실패.

```bash
athsra run <repo> -- bash -c '
PROJECT="<pages-project>"
H="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
AID="$CLOUDFLARE_ACCOUNT_ID"

page=1
deleted_total=0
while true; do
  RESP=$(curl -s -H "$H" \
    "https://api.cloudflare.com/client/v4/accounts/$AID/pages/projects/$PROJECT/deployments?per_page=25&page=$page")

  # production aliased deployment (aliases[] 비어있지 않은) 제외
  IDS=$(echo "$RESP" | jq -r ".result[] | select((.aliases // []) | length == 0) | .id")

  if [ -z "$IDS" ]; then break; fi

  for id in $IDS; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "$H" \
      "https://api.cloudflare.com/client/v4/accounts/$AID/pages/projects/$PROJECT/deployments/$id?force=true")
    if [ "$code" = "200" ]; then deleted_total=$((deleted_total+1)); fi
    sleep 0.3   # rate limit 예방
  done
  page=$((page+1))
done
echo "Deleted: $deleted_total"

# count 검증
curl -s -H "$H" "https://api.cloudflare.com/client/v4/accounts/$AID/pages/projects/$PROJECT/deployments?per_page=1" \
  | jq "{remaining: .result_info.total_count}"
'

# 100 미만 확인되면 project 삭제
athsra run <repo> -- bunx --bun wrangler pages project delete <pages-project>
```

**함정**:
- `?force=true` 누락 → aliased deployment 거부 (200 처럼 보이지만 result 가 비어있음)
- production 최신 deployment 는 force 도 거부 (CF 정책) — 의도된 보호
- sleep 0.3 보다 빠르면 429 — Retry-After 헤더 보고 backoff

### S5. 빌드 트리거 / 점검 / 진단

#### S5-a. 매뉴얼 빌드 트리거 (webhook 외 강제 실행)

```bash
athsra run <repo> -- bash -c '
curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/builds/triggers/<trigger_uuid>/builds" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "content-type: application/json" \
  -d "{\"branch\":\"main\"}" \
  | jq "{build_uuid: .result.build_uuid, status: .result.status}"
# body 가 {} 면 12002 — 반드시 {"branch":"..."}
'
```

#### S5-b. 최근 build 결과 + 로그

```bash
athsra run <repo> -- bash -c '
H="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
AID="$CLOUDFLARE_ACCOUNT_ID"
TAG=$(curl -s -H "$H" "https://api.cloudflare.com/client/v4/accounts/$AID/workers/services/<worker>" | jq -r ".result.default_environment.script_tag")

# 최근 3 builds 결과
curl -s -H "$H" "https://api.cloudflare.com/client/v4/accounts/$AID/builds/workers/$TAG/builds" \
  | jq ".result[0:3] | map({build_uuid, status, build_outcome, created_on})"

# 최신 build 의 전체 로그
BUILD=$(curl -s -H "$H" "https://api.cloudflare.com/client/v4/accounts/$AID/builds/workers/$TAG/builds" | jq -r ".result[0].build_uuid")
curl -s -H "$H" "https://api.cloudflare.com/client/v4/accounts/$AID/builds/builds/$BUILD/logs" \
  | jq -r ".result.lines[] | (.[0]|tostring) + \"  \" + .[1]"
'
```

#### S5-c. Build token silent expire 진단/복구

`cf-workers-builds-api.md` § "TL;DR (가장 흔한 실패 시나리오 + 복구)" — 23일 침묵 후 발견되는 케이스. 로그에 "build token ... deleted or rolled" 보이면 `PATCH /builds/triggers/{uuid}` 로 build_token_uuid 갱신 (60초 복구).

#### S5-d. ecosystem 차원 정기 점검 (분기 1회)

`cf-workers-builds-api.md` § "ecosystem 차원의 정기 점검" 스크립트 — 모든 sibling 의 trigger build_token 점검.

### S6. 새 토큰 생성

`cf-token-permissions.md` § "시나리오 R1 — 새 토큰 발급" 의 풀 코드. 핵심:

```bash
# 1. /user/tokens/permission_groups 에서 필요 group id 검색
# 2. POST /user/tokens with {"name", "policies"}
# 3. 응답의 .result.value = 1회만 표시 → 즉시 athsra set <repo> CLOUDFLARE_API_TOKEN=...
```

### S7. 기존 토큰에 권한 추가/제거

`cf-token-permissions.md` § "시나리오 R2 / R3 / R4" — GET → jq merge → PUT 패턴 + 값 리롤. 핵심:

- **R2 추가**: `.policies[idx].permission_groups += [{id:NEW}] | unique_by(.id)` 후 PUT 전체 body
- **R3 제거**: `.policies[].permission_groups |= map(select(.id != REMOVE))` 후 PUT
- **R4 값 리롤** (권한 유지, 값만 새로): `PUT /user/tokens/{id}/value/roll`

**자가 검증 의무**: PUT 직후 영역 read probe 200 확인 — `cf-token-permissions.md` § "권한 의심 차단 게이트" 의 Gate B.

---

## § 9. 검증 패턴 (raw evidence-based 보고)

> `.claude/rules/agent-evidence.md` 정합. AI 가 "작업 완료" 또는 "실패" 보고 시 **항상 raw HTTP response** 첨부.

```bash
# 명령 결과 + status code 동시 캡처
athsra run <repo> -- bash -c '
RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/...")
echo "$RESP"
'
```

보고 형식:
- ✅ "200 — `.result.id = xxx`, `.success = true`. 검증 완료."
- ❌ "403 — `.errors[0] = {code: 9109, message: ...}`. § 7 H1 게이트 통과 후에도 권한 부족. dashboard 추가 필요."
- ❌ "12002 — body 누락 (`{}` → `{"branch":"main"}`). H3 적용 후 재시도 → 200."

**금지**: "안 됩니다", "권한이 없는 것 같습니다", "API 가 없는 것 같습니다" — `.claude/rules/agent-evidence.md` 위반.

---

## 출처 + 검증

- 사용자 토큰 직접 measurement (2026-05-24, 366 perm groups → 353 보유, 14개 영역 read probe): `cf-token-permissions.md` § 측정값
- Workers API: https://developers.cloudflare.com/api/resources/workers/
- Workers Domains delete: https://developers.cloudflare.com/api/resources/workers/subresources/domains/methods/delete/
- Pages API root: https://developers.cloudflare.com/pages/configuration/api/
- Pages deployment delete: https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/delete/
- DNS records API: https://developers.cloudflare.com/api/resources/dns/subresources/records/
- Custom Hostnames API: https://developers.cloudflare.com/api/resources/custom_hostnames/
- Zone settings: https://developers.cloudflare.com/api/resources/zones/subresources/settings/
- Cache purge: https://developers.cloudflare.com/api/resources/cache/methods/purge/
- Permissions reference: https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- wrangler v4 migration: https://developers.cloudflare.com/workers/wrangler/migration/update-v3-to-v4/
- Workers Builds: `cf-workers-builds-api.md` (별도 canon)
- 2026-05-24 gistcore 진단 세션 — `cf-workers-builds-api.md` 신설 배경

## 관련

- `knowledge/canon/cf-token-permissions.md` — **이 canon 진입 전 게이트**. 권한 측정 + 의심 차단.
- `knowledge/canon/agent-auth-ux.md` + `.claude/rules/agent-auth-flow.md` — 에이전트 직접 시작·직접 조작 표준. 이 canon = 그 표준의 **CF 레퍼런스 구현** (athsra_run 주입 + 직접조작).
- `knowledge/canon/cf-workers-builds-api.md` — Workers Builds API 단일 영역 깊은 진단 (build token expire 등).
- `knowledge/canon/cf-deploy.md` — 배포 메커니즘 + wrangler v4 정확 명령.
- `knowledge/canon/pages-to-workers-migration.md` — Pages 이관 시 endpoint 활용 (deployment bulk delete 등).
- `knowledge/canon/cf-dynamic-workers-patterns.md` — Dynamic Workers (AI agent 격리 실행).
- `knowledge/canon/wrangler-standards-2026.md` — wrangler.jsonc 표준.
- `knowledge/canon/secret-store.md` — athsra inject 경로.
- `.claude/rules/agent-evidence.md` — 증거 기반 보고 (이 canon § 8 의 모태).
- `.claude/rules/fundamentals-first.md` — 정공법 5 원칙 (이 canon 의 hallucination 카탈로그 = 1원칙 "근본 수정" 적용).
- memory `feedback_cf-no-permission-hallucination` — AI 가 "권한 부족" 발화 전 `cf-token-permissions` 게이트 강제.
