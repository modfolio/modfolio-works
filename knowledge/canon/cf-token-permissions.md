---
title: Cloudflare API Token — 권한 모델 + 사용자 토큰 실측값 (mega "All API")
version: 1.0.0
last_updated: 2026-05-24
source: [2026-05-24 사용자 가설 검증 세션 — 직접 API probe 측정, developers.cloudflare.com/fundamentals/api/reference/permissions]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops, security, api-builder]
---

# Cloudflare API Token — 권한 모델 + 사용자 토큰 실측값

> **AI 가 CF 작업 시 "권한이 없어서 안 됩니다" 라고 보고하기 전에 이 canon 의 측정값을 먼저 확인한다.** 사용자 (`winterermod@gmail.com`) 의 `All API` 토큰은 **2026-05-24 기준 366개 카탈로그 중 353개 distinct permission groups 를 보유**한 effectively mega-token. "권한 부족" 가정은 hallucination 일 확률이 매우 높다.

## TL;DR (AI 가 봐야 할 한 문단)

사용자 토큰 = "All API" (`d27fe99ea9a6bd639b5afd10524e1560`, 2026-05-24 측정). athsra `modfolio-ecosystem/CLOUDFLARE_API_TOKEN` 으로 universe 어디서든 inject. **modfolio 운영에 필요한 모든 권한 보유 — Workers/Pages/DNS/Workers Routes/SSL/Page Rules/Rulesets/Firewall/KV/R2/D1/Builds/Queues/Workflows/Members/Roles/Tail/Secrets Store/Images/AI Gateway 전부 200**. 단 1개 미보유 = `Zone:Custom Hostnames:Edit` (Cloudflare for SaaS 멀티테넌트 호스트 발급용 — 일반 도메인 운영 불필요). AI 가 "권한 부족" 의심하면 §"권한 의심 차단 게이트" 시퀀스 실행 후 발화.

## 측정값 (2026-05-24, 재현 가능)

### 카탈로그 vs 보유 비교

| 항목 | 값 | 출처 endpoint |
|------|----|----|
| CF 전체 permission groups (모든 SKU 합산) | **366** | `GET /user/tokens/permission_groups` |
| 사용자 토큰 distinct groups | **353** | `GET /user/tokens/{id}` 의 `.result.policies[].permission_groups` unique |
| 보유율 | **96.4%** | — |
| 미보유 추정 13개 영역 | Custom Hostnames (확인), Magic Transit/Magic WAN, Stream 일부, SaaS 전용 일부, Email Routing 일부 | 영역별 read probe |

### 사용자 토큰의 실제 policies 구조 (2026-05-24)

```
policies (3 개) — 각 policy 가 한 scope 의 permission groups 묶음
├── Policy 1: zone scope (모든 zone)
│   resources: { "com.cloudflare.api.account.zone.*": "*" }
│   permission_groups: 90 개 (DNS Edit, Workers Routes Edit, SSL, Page Rules, Rulesets ...)
├── Policy 2: user scope (본인)
│   resources: { "com.cloudflare.api.user.8e295b5a8d676a6eff7a66e7091e30bc": "*" }
│   permission_groups: 6 개 — 첫 그룹 = "API Tokens Write" (id 686d18d5ac6c441c867cbf6771e58a0a)
└── Policy 3: account scope (모든 account)
    resources: { "com.cloudflare.api.account.*": "*" }
    permission_groups: 264 개 (Workers, Pages, KV, R2, D1, Builds, Queues, Workflows ...)
```

> **결정적 fact**: Policy 2 에 **"API Tokens Write" 보유 확인** → `POST /user/tokens` (새 토큰 발급), `PUT /user/tokens/{id}` (권한 추가/제거), `DELETE /user/tokens/{id}` (삭제), `PUT /user/tokens/{id}/value/roll` (값 리롤) **전부 자동화 가능**. 사용자 user_id = `8e295b5a8d676a6eff7a66e7091e30bc`.

### Resources key 형식 (정확한 wildcard 규칙)

policies[].resources 의 key 는 다음 4 패턴 중 하나:

| 패턴 | 의미 |
|------|------|
| `com.cloudflare.api.account.<account_id>` | 특정 account 한정 |
| `com.cloudflare.api.account.*` | **모든 account** (본인 소속 전부 — 사용자 토큰 사용) |
| `com.cloudflare.api.account.zone.<zone_id>` | 특정 zone 한정 |
| `com.cloudflare.api.account.zone.*` | **모든 zone** (모든 account 의 모든 zone — 사용자 토큰 사용) |
| `com.cloudflare.api.user.<user_id>` | user-level (본인 자신) |

value 는 보통 `"*"` (full access). 더 좁히려면 sub-resource 객체 사용 가능 (드뭄).

### 영역별 read probe (200 = 보유)

```
Account-level (전부 200):
  Workers Scripts/KV/R2/D1/Builds/Tail/Queues/Workflows/Members/Roles/Secrets Store/AI Gateway/Images/Pages

Zone-level (modfolio.io zone 측정, 1개만 403):
  ✅ Zone Settings, DNS Records, Workers Routes, SSL Certificates, Page Rules, Rulesets, Firewall, Origin CA/DNS Settings
  ❌ Custom Hostnames (Cloudflare for SaaS — 사용자 zone 이 SaaS 활성 X)

User-level (전부 200):
  Verify, List own tokens, Permission groups catalog, User detail, Memberships
  → 토큰 자체 편집 endpoint (PUT/POST/DELETE /user/tokens) 호출 가능
```

### 재현 명령 (분기 1회 권장 — 토큰 권한 drift 점검)

```bash
athsra run modfolio-ecosystem -- bash -c '
H="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
AID="$CLOUDFLARE_ACCOUNT_ID"

# 1. 토큰 활성 + id 추출
curl -s -H "$H" "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  | jq "{success, status: .result.status, id: .result.id}"

# 2. 토큰 본인의 권한 그룹 카운트
TID=$(curl -s -H "$H" "https://api.cloudflare.com/client/v4/user/tokens/verify" | jq -r ".result.id")
curl -s -H "$H" "https://api.cloudflare.com/client/v4/user/tokens/$TID" \
  | jq "{name: .result.name, distinct_groups: ([.result.policies[].permission_groups[].name] | unique | length)}"

# 3. 영역별 read probe — 200 이면 read 가능 (보통 write 도 동일 scope)
ZID=$(curl -s -H "$H" "https://api.cloudflare.com/client/v4/zones?per_page=1" | jq -r ".result[0].id")
for url in \
  "/accounts/$AID/workers/scripts?per_page=1" \
  "/accounts/$AID/pages/projects?per_page=1" \
  "/accounts/$AID/builds/tokens" \
  "/zones/$ZID/dns_records?per_page=1" \
  "/zones/$ZID/workers/routes" \
  "/zones/$ZID/custom_hostnames?per_page=1" \
  "/zones/$ZID/ssl/certificate_packs?per_page=1"
do
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$H" "https://api.cloudflare.com/client/v4$url")
  echo "$code  $url"
done
'
```

기대 결과: 위 7개 중 6개 200, custom_hostnames 만 403 (2026-05-24 기준). 만약 200/403 분포가 달라졌다면 토큰이 변경/회수된 것 — Dashboard 에서 권한 확인.

## 권한 모델 (3-tier scope)

CF API token 은 **3 카테고리** 로 권한이 분리되어 있다. 한 토큰이 여러 카테고리를 가질 수 있고, 한 카테고리 안에서 여러 그룹을 가질 수 있다.

### 1) Account-level (`com.cloudflare.api.account.*`)

특정 account 의 리소스. 한 토큰을 여러 account 에 적용 가능 (resources 선택).

| Permission group | unlocks (API endpoint prefix) | 필수성 (modfolio) |
|------------------|-------------------------------|-------------------|
| Workers Scripts:Edit | `/accounts/{id}/workers/scripts/**`, `/workers/services/**`, `/workers/dispatch/**`, deployments, versions, secrets, **workers/domains (Worker custom domain)**, builds (일부) | 필수 |
| Workers KV Storage:Edit | `/accounts/{id}/storage/kv/namespaces/**` | 필수 |
| Workers R2 Storage:Edit | `/accounts/{id}/r2/buckets/**` | 필수 |
| Workers Pipelines:Edit | `/accounts/{id}/pipelines/**` | 사용 시 필수 |
| D1:Edit | `/accounts/{id}/d1/database/**` | 필수 |
| **Cloudflare Pages:Edit** | `/accounts/{id}/pages/projects/**` (project, deployments, domains, env vars) | 필수 (cf-pages app 14개 운영) |
| Workers Tail:Read | `/accounts/{id}/workers/tail` | 권장 (로그) |
| Account Settings:Read | `/accounts/{id}` (account 메타) | 권장 |
| Members:Read | `/accounts/{id}/members` | 선택 |
| Workflows:Edit | `/accounts/{id}/workflows/**` | 사용 시 |
| AI Gateway:Run | `/accounts/{id}/ai-gateway/**` | 사용 시 |
| Queues:Edit | `/accounts/{id}/queues/**` | 사용 시 |
| Secrets Store:Edit | `/accounts/{id}/secrets_store/**` | 사용 시 |

> **"Edit Cloudflare Workers" 템플릿이 포함하지 않는 권한** (별도 추가 필요): Pages:Edit, D1:Edit, Pipelines:Edit. 사용자 "All API" 토큰은 이걸 별도로 다 추가한 상태 — modfolio 의 cf-pages app 운영이 가능한 이유.

### 2) Zone-level (`com.cloudflare.api.account.zone.*`)

특정 zone (도메인) 의 리소스. 한 토큰을 여러 zone 에 적용 가능 (resources 선택, all zones in account 선택 가능).

| Permission group | unlocks |
|------------------|---------|
| Zone:Read | `GET /zones`, `GET /zones/{id}` |
| Zone Settings:Edit | `/zones/{id}/settings/**` (always_use_https, ssl mode, http3, etc.) |
| **DNS:Edit** | `/zones/{id}/dns_records/**` (A/AAAA/CNAME/TXT/MX/SRV/CAA 전부) |
| Cloudflare Workers Routes:Edit | `/zones/{id}/workers/routes` (zone level route 매핑) |
| **SSL and Certificates:Edit** | `/zones/{id}/ssl/**`, `/zones/{id}/custom_certificates/**` |
| **Custom Hostnames:Edit** | `/zones/{id}/custom_hostnames/**` (Cloudflare for SaaS 멀티테넌트 — 사용자 토큰 미보유) |
| Page Rules:Edit | `/zones/{id}/pagerules/**` |
| Rulesets:Edit | `/zones/{id}/rulesets/**` (Transform/WAF custom rules) |
| Firewall Services:Edit | `/zones/{id}/firewall/rules` (legacy), `/zones/{id}/rulesets` (modern WAF) |
| Cache Purge | `POST /zones/{id}/purge_cache` |
| Logs:Edit | Logpush job 관리 |

### 3) User-level (`com.cloudflare.api.user.*`)

본인 계정의 자기 자신 작업. **토큰 자체를 관리하는 endpoint 가 여기 속함.**

| Permission group | unlocks |
|------------------|---------|
| User Details:Read | `GET /user`, `GET /user/billing/profile` |
| Memberships:Read | `GET /memberships` (어느 org 에 속해있는지) |
| **API Tokens:Read** | `GET /user/tokens`, `GET /user/tokens/{id}`, `GET /user/tokens/permission_groups` |
| **API Tokens:Edit** | **`POST /user/tokens` (새 토큰 발급), `PUT /user/tokens/{id}` (권한 추가/제거), `DELETE /user/tokens/{id}`, `PUT /user/tokens/{id}/value/roll` (값 리롤)** |

> **사용자 "All API" 토큰은 API Tokens:Read 200 확인** (List 가능). Edit 보유 여부는 PUT/POST 시도 시점에 확인 (위 사용자 가설 — "다 넣어놨다" — 와 정합 가능성 높음).

## 토큰 자체를 API 로 관리 (사용자 요청: "하나의 토큰으로 모든 작업")

> 사용자 의도: 권한 자체를 편집하는 API 로 mega-token 을 자동 유지. 정확한 endpoint 카탈로그 + 권한 카탈로그.

### 핵심 endpoint

```
GET    /user/tokens                          # 내 모든 토큰 list (id, name, status, policies, expires_on)
GET    /user/tokens/{id}                     # 특정 토큰 상세 — permission_groups, resources, condition
GET    /user/tokens/verify                   # 호출에 사용된 토큰의 id + status (현재 토큰 자가 진단)
GET    /user/tokens/permission_groups        # 카탈로그: 모든 사용 가능한 permission group (id + scope)
POST   /user/tokens                          # 새 토큰 발급. body 에 policies 명시
PUT    /user/tokens/{id}                     # 토큰 갱신 — policies/resources/condition 전부 교체 (idempotent replace)
PUT    /user/tokens/{id}/value/roll          # 토큰 값을 새 값으로 리롤. id 유지, 권한 유지, 값만 새로 (구버전 무효화)
DELETE /user/tokens/{id}                     # 토큰 삭제 (즉시 invalid)
```

### 시나리오 R1 — 새 토큰 발급 (POST /user/tokens)

가장 단순한 신규 토큰 (예: CI 전용, Workers + Pages 만):

```bash
athsra run modfolio-ecosystem -- bash -c '
H="Authorization: Bearer $CLOUDFLARE_API_TOKEN"

# 1. 필요한 permission group id 찾기 (이름으로 검색)
curl -s -H "$H" "https://api.cloudflare.com/client/v4/user/tokens/permission_groups?per_page=400" \
  | jq ".result[] | select(.name | test(\"Workers Scripts Write|Pages Write\"; \"i\")) | {id, name}"
# 예시 결과 (실제 id 는 호출 시점 카탈로그 기준):
#   Workers Scripts Write: e086da7e2179491d91ee5f35b3ca210a
#   Pages Write:           8d28297797f24fb8a0c332fe0866ec89

# 2. POST 호출 — body 의 최소 필수 = name. policies 도 사실상 필수 (없으면 무용지물)
curl -s -X POST "https://api.cloudflare.com/client/v4/user/tokens" \
  -H "$H" -H "content-type: application/json" \
  -d "{
    \"name\": \"ci-deploy-2026-05-24\",
    \"policies\": [{
      \"effect\": \"allow\",
      \"resources\": { \"com.cloudflare.api.account.$CLOUDFLARE_ACCOUNT_ID\": \"*\" },
      \"permission_groups\": [
        { \"id\": \"e086da7e2179491d91ee5f35b3ca210a\" },
        { \"id\": \"8d28297797f24fb8a0c332fe0866ec89\" }
      ]
    }]
  }" | jq "{id: .result.id, value_visible_once: .result.value, status: .result.status}"

# 3. 응답의 .result.value = 실제 Bearer 문자열 (이번 1회만 표시!) → 즉시 athsra 에 보관
#    (다음 GET 호출에서는 metadata 만 나오고 value 는 빠짐)
'
```

**필수 / 선택 필드** (POST body 기준):
- 필수: `name` (string)
- 권장: `policies` (1+ entries — 없으면 토큰이 아무것도 못함)
- 선택: `condition.request_ip.in / not_in` (CIDR 화이트리스트/블랙리스트), `expires_on` (ISO 8601), `not_before` (ISO 8601)

**함정**:
- value 캡처 못 하면 토큰 재발급 외 복구 불가 — 항상 jq 로 즉시 추출 + athsra set
- 권한 escalation 불가 — 현 토큰에 없는 permission group 을 새 토큰에 부여 시도 시 403. 사용자 "All API" 는 거의 mega 라 해당 케이스 드뭄
- token name 은 dashboard 의 list 표시용 — 같은 name 여러 토큰 가능

### 시나리오 R2 — 기존 토큰에 권한 추가 (GET → jq merge → PUT)

> **PUT 동작 주의** — CF docs 가 "partial vs full replace" 명확히 안 함. 실측 안전 가정 = **full replace** (모든 필드 명시). GET → modify → PUT 패턴이 정공법.

특정 permission group 1 개를 기존 토큰에 추가:

```bash
athsra run modfolio-ecosystem -- bash -c '
H="Authorization: Bearer $CLOUDFLARE_API_TOKEN"

TID=$(curl -s -H "$H" "https://api.cloudflare.com/client/v4/user/tokens/verify" | jq -r ".result.id")

# 추가할 permission group id 결정 (예: Custom Hostnames Write 가 있다고 가정)
NEW_PERM_ID="<custom_hostnames_write_group_id>"   # /user/tokens/permission_groups 에서 검색
TARGET_POLICY_INDEX=0   # 어느 policy 에 추가 (Zone scope 면 보통 0 — 위 측정 표 참고)

# 1. 현 토큰 GET
curl -s -H "$H" "https://api.cloudflare.com/client/v4/user/tokens/$TID" > /tmp/cur-token.json

# 2. jq 로 머지 — TARGET_POLICY_INDEX 의 permission_groups 배열에 신규 id append (중복 제거)
jq --arg pid "$NEW_PERM_ID" --argjson idx "$TARGET_POLICY_INDEX" "
  .result
  | .policies[\$idx].permission_groups += [{id: \$pid}]
  | .policies[\$idx].permission_groups |= unique_by(.id)
  | {name, policies, condition: (.condition // {})}
" /tmp/cur-token.json > /tmp/new-token.json

# 3. PUT 으로 갱신 (전체 필드 명시)
curl -s -X PUT "https://api.cloudflare.com/client/v4/user/tokens/$TID" \
  -H "$H" -H "content-type: application/json" \
  -d @/tmp/new-token.json \
  | jq "{id: .result.id, modified_on: .result.modified_on, n_groups_per_policy: [.result.policies[].permission_groups | length]}"

# 4. 자가 검증 — 추가 직후 read probe 200 확인 (예: Custom Hostnames list)
ZID=$(curl -s -H "$H" "https://api.cloudflare.com/client/v4/zones?per_page=1" | jq -r ".result[0].id")
curl -s -o /dev/null -w "%{http_code} after PUT\n" -H "$H" \
  "https://api.cloudflare.com/client/v4/zones/$ZID/custom_hostnames?per_page=1"
'
```

### 시나리오 R3 — 기존 토큰에서 권한 제거

```bash
athsra run modfolio-ecosystem -- bash -c '
H="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
TID=$(curl -s -H "$H" "https://api.cloudflare.com/client/v4/user/tokens/verify" | jq -r ".result.id")

REMOVE_PERM_ID="<group_id_to_remove>"

curl -s -H "$H" "https://api.cloudflare.com/client/v4/user/tokens/$TID" > /tmp/cur-token.json

jq --arg pid "$REMOVE_PERM_ID" "
  .result
  | .policies = [.policies[] | .permission_groups |= map(select(.id != \$pid)) | .]
  | {name, policies, condition: (.condition // {})}
" /tmp/cur-token.json > /tmp/new-token.json

curl -s -X PUT "https://api.cloudflare.com/client/v4/user/tokens/$TID" \
  -H "$H" -H "content-type: application/json" \
  -d @/tmp/new-token.json \
  | jq "{id: .result.id, modified_on: .result.modified_on}"
'
```

### 시나리오 R4 — 값만 리롤 (값 leak 의심 시, 권한 유지)

```bash
athsra run modfolio-ecosystem -- bash -c '
H="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
TID=$(curl -s -H "$H" "https://api.cloudflare.com/client/v4/user/tokens/verify" | jq -r ".result.id")

curl -s -X PUT "https://api.cloudflare.com/client/v4/user/tokens/$TID/value/roll" \
  -H "$H" | jq "{success, new_value_visible_once: .result}"
# 새 토큰 값 즉시 athsra set modfolio-ecosystem CLOUDFLARE_API_TOKEN=... 으로 교체
# 이전 값은 즉시 무효화 — 다른 머신/agent 의 캐시는 next call 부터 fail
'
```

### "mega-token 추가/유지" 자동화 패턴 (대규모 권한 변경)

전체 permission_groups 카탈로그를 가져와서 그 전부를 한 토큰에 부여하는 흐름 (R2 의 확장):

```bash
# 1. 모든 가용 permission group + scope 별 분류 (account / zone / user)
athsra run modfolio-ecosystem -- bash -c '
H="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
curl -s -H "$H" "https://api.cloudflare.com/client/v4/user/tokens/permission_groups?per_page=400" \
  | jq "[.result[]] | group_by(.scopes[0]) | map({scope: .[0].scopes[0], n: length, ids: [.[].id]})" \
  > /tmp/cf-perm-groups-by-scope.json
'

# 2. 사용자 user_id 추출 (user-scope policy 의 resource key 에 필요)
UID=$(athsra run modfolio-ecosystem -- curl -s \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/user" | jq -r ".result.id")

# 3. PUT body 빌드 — 3 policies (account.* / zone.* / user.<UID>)
#    R2 의 jq 머지 + 전체 카탈로그 적용 (코드 길어서 생략 — 필요 시 위 jq 패턴 + cf-perm-groups-by-scope.json 으로 자동 생성)
```

### 주의 (정공법)

1. **PUT 은 replace 다 (PATCH 아님)** — 기존 policies 전부 새 body 로 덮어쓴다. 부분 추가 X. 추가 시 먼저 GET 으로 현 policies 받아서 머지 후 PUT.
2. **권한 escalation 차단** — 토큰이 가진 권한만큼만 자기/다른 토큰에 부여 가능. Workers 만 가진 토큰으로 Pages 권한 추가 불가. (사용자 "All API" 는 이미 거의 mega 라 self-extension 가능 영역 적음.)
3. **자기 자신 self-edit 위험** — PUT 으로 자기 토큰을 변경 시 다음 호출부터 새 권한 적용. **권한 축소 자살** (예: API Tokens:Edit 제거) 가능 — 복구는 dashboard 1회 작업. 자가 검증 명령으로 모든 read probe 200 인지 확인 후 적용.
4. **토큰 값 자체는 발급 시점에만 표시** — `POST /user/tokens` 응답의 `value` 가 실제 사용 가능한 Bearer 문자열. 이후 GET 으로는 다시 볼 수 없음 (id 만). 즉시 athsra `set modfolio-ecosystem CLOUDFLARE_API_TOKEN=...` 으로 보관.
5. **roll 은 값 리롤 only** — 권한 변경 안 함. 토큰 값 leak 의심 시 사용 (모든 서버/agent 의 캐시 무효화).

### Custom Hostnames 1개만 추가하고 싶을 때 (사용자 토큰 미보유 1개)

```bash
# 카탈로그에서 Custom Hostnames Write id 찾기
athsra run modfolio-ecosystem -- bash -c '
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/user/tokens/permission_groups?per_page=400" \
  | jq ".result[] | select(.name | test(\"Custom Hostnames|Custom SSL\"; \"i\")) | {id, name, scopes}"
'
# → id 확보. PUT body 의 zone-level policy.permission_groups 에 append 후 PUT.

# 단 Custom Hostnames 는 Cloudflare for SaaS 활성 필요. zone 별 활성:
# Dashboard → Zone → SSL/TLS → Custom Hostnames → Enable Cloudflare for SaaS.
# 활성 X 인 zone 에서는 권한이 있어도 endpoint 가 404 또는 plan upgrade 안내 반환.
```

## 권한 의심 차단 게이트 (AI 가 발화 전 거치는 시퀀스)

**AI 가 "권한 부족 / 안 됩니다" 보고하기 직전에 이 시퀀스를 실행**. 통과하면 권한이 아니라 *endpoint/body/resource ID* 가 문제 — `cf-api-mastery.md` 의 영역별 카탈로그 + hallucination 함정 확인 후 재시도.

```bash
# Gate A — 토큰 자체 활성 + 자기 자신 (id) 식별
athsra run modfolio-ecosystem -- curl -s \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify | jq -e .success

# Gate B — 영역에 대한 read probe (실패 작업의 영역과 동일 endpoint prefix)
# 예: Pages 작업 실패 → list projects 가 200 인지
athsra run modfolio-ecosystem -- bash -c '
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects?per_page=1"
'
# 200 = 권한 있음, "안 됨" 은 다른 원인 — endpoint/body/resource id 점검
# 403 = 진짜 권한 없음 (드뭄, 위 측정 표와 대조)

# Gate C — 실패한 명령의 raw HTTP response 캡처 (status + body)
# wrangler 명령이면 --verbose, curl 이면 -i 추가
```

**3 게이트 전부 200/통과 인데 작업 실패** → `cf-api-mastery.md` 의 hallucination 카탈로그 즉시 적용.

## 함정

| 함정 | 증상 | 정공법 |
|------|------|--------|
| "Edit Cloudflare Workers" 템플릿 = 모든 권한 가정 | Pages/D1/Pipelines 작업 시 403 | 위 측정 표 참고. 사용자 "All API" 는 별도 mega — 다른 dev 가 새 토큰 만들면 단일 템플릿 부족 |
| User-level 토큰이 zone 작업 가능? | 됨. 단 resources 에 명시적 zone 또는 `account.zone.*` 와일드카드 필요 | PUT body 의 `resources` 키 확인 |
| 토큰 만료 (expires_on) 미설정 | `expires_on: null` = 영구. 보안상 90일 권장 — 사용자 정책 "보안 나중에" 와 충돌 시 사용자 결정 우선 | dev 단계 = 영구 허용, prod 진입 시 로테이션 (secrets-policy.md) |
| 권한 충분한데 403 | endpoint 의 zone_id/account_id 불일치 (다른 account 의 리소스 시도) | `GET /zones?per_page=50` 으로 사용자의 모든 zone id 확인 |
| 권한 충분한데 401 | 토큰 leak 후 dashboard 에서 revoke 된 상태. last_used_on 확인 | 새 토큰 발급 + athsra set + 전 토큰 delete |

## 출처

- Permissions reference: https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- API token templates: https://developers.cloudflare.com/fundamentals/api/reference/template/
- Create token (procedural): https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- User tokens API (manage tokens with API): https://developers.cloudflare.com/api/resources/user/subresources/tokens/
- Custom Hostnames API (Cloudflare for SaaS): https://developers.cloudflare.com/api/resources/custom_hostnames/
- 2026-05-24 사용자 토큰 직접 measurement — 위 "측정값" 섹션 + journal

## 관련

- `knowledge/canon/cf-api-mastery.md` — 영역별 endpoint 카탈로그 + AI hallucination 함정. 권한 게이트 통과 후 여기로.
- `knowledge/canon/cf-deploy.md` — 배포 메커니즘. wrangler v4 vs API.
- `knowledge/canon/cf-workers-builds-api.md` — Workers Builds 전용 (gh 연결 / build token expire).
- `knowledge/canon/pages-to-workers-migration.md` — Pages → Workers 이관 + bulk deployment delete.
- `knowledge/canon/secret-store.md` — athsra v3 — `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` inject 경로.
- `.claude/rules/secrets-policy.md` — 로테이션 권고 + dev 정책 예외.
- memory `feedback_cf-no-permission-hallucination` — AI 가 권한 의심 전 이 canon 의 게이트 거치도록 강제.
