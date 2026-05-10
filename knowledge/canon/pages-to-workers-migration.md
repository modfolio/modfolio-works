---
title: Pages → Workers Migration Pattern
version: 1.0.0
last_updated: 2026-04-24
source: [modfolio-ecosystem dashboard migration 2026-04-22~24, knowledge/journal/20260422-dashboard-cf-workers-migration.md]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [deploy, ops]
---

<!--
생태계 내 Cloudflare Pages 배포를 Workers 로 이관하는 공통 pattern.
2026-04-22 dashboard 1회 시도 rollback + 2026-04-24 재시도 과정에서 정립.
member repo 가 자체 Pages 이관 필요 시 이 문서 순서로 실행.
-->

# Pages → Workers 이관 pattern

**배경**: Cloudflare 는 2026-Q2 기준 Workers 를 기본 배포 경로로 권고. Pages 는 legacy 유지. D1 Global Read Replicas / DO SQLite / Agents SDK v2 / Observability v2 등 2026 신기능 대부분이 Workers 전용. 새 앱은 Workers 로 시작하고 기존 Pages 앱은 본 pattern 으로 이관.

**핵심 원칙**:
- **dual-domain 전환** (Pages + Worker 동시 운영 후 수시간~수일 soak) — atomic swap 금지. 2026-04-22 atomic 시도 → 8분 다운타임.
- **KV SESSION 등 state-bearing binding 은 동일 namespace ID 재사용** — 세션 증발 방지.
- **Rollback < 60초** — Pages 프로젝트를 마지막까지 살려두고 custom domain 만 detach/attach.
- **deployments count < 100** — Pages 프로젝트 삭제 전제. 100+ 이면 bulk delete 선행 필요.

## 전제 체크리스트

- [ ] WSL2 native 환경 (Dev Container bind-mount issue 회피)
- [ ] `wrangler` 4.84+ (4.82 telemetry prompt hang bug 회피)
- [ ] `bunx --bun wrangler telemetry disable` 전역 실행
- [ ] `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` 주입 경로 확보 (athsra `<repo>` 권장, canon `secret-store.md` v1.13+)
- [ ] 해당 repo 의 DNS zone `modfolio.io` 가 CF 에 있음 (custom domain auto-CNAME 조건)
- [ ] `modfolio-connect` OAuth client 의 `redirect_uris` 편집 권한 (SSO 쓰는 앱이면)

## 공통 절차 (13 단계)

아래 `<project>` = Pages 프로젝트 이름, `<worker>` = 신규 Worker 이름 (rename 동반 시 신규 이름), `<domain>` = custom domain.

### 1. Wrangler 설정 작성

**Astro 6 + @astrojs/cloudflare 13.x** 기준 wrangler.jsonc 템플릿:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "<worker>",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2026-04-17",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "binding": "ASSETS", "directory": "./dist" },
  "kv_namespaces": [
    { "binding": "SESSION", "id": "<기존 Pages 의 SESSION namespace id>" }
  ],
  "images": { "binding": "IMAGES" },
  "observability": { "enabled": true, "logs": { "head_sampling_rate": 1 } }
}
```

**SvelteKit 5 + @sveltejs/adapter-cloudflare** 기준:

```jsonc
{
  "name": "<worker>",
  "main": ".svelte-kit/cloudflare/_worker.js",
  "compatibility_date": "2026-04-17",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "binding": "ASSETS", "directory": ".svelte-kit/cloudflare" },
  "observability": { "enabled": true }
}
```

**주의**:
- `main` 은 프레임워크 adapter 가 제공하는 entrypoint. Astro 6 에서 `dist/_worker.js/index.js` 는 legacy, package import (`@astrojs/cloudflare/entrypoints/server`) 가 규범.
- `compatibility_date` 는 로컬 workerd 바이너리 지원 범위 내로 보수적 선택. CF 서버 측은 최신 workerd 를 쓰므로 이 값과 무관.
- KV/Images/D1/R2 등 **모든 binding 을 wrangler.jsonc 에 명시**. Pages 시절 대시보드 UI 에서만 설정되었다면 반드시 코드로 이관.

### 2. KV SESSION namespace ID 확보

```bash
athsra run <repo> -- bunx --bun wrangler kv namespace list > /tmp/kv-list.json
# SESSION 관련 namespace id 를 수동 확인 (값은 secret 아님, commit 가능)
```

동일 id 를 step 1 의 `kv_namespaces[].id` 에 넣는다. 신규 namespace 생성 금지 (live session 증발).

### 3. Code 도메인 레퍼런스 교체 (rename 동반 시)

도메인 이름을 바꾸는 경우 grep 으로 전수 변경:

```bash
grep -rn "<old-domain>" . --exclude-dir=node_modules --exclude-dir=.git
```

대상 예:
- `src/**/config.ts` 또는 `astro.config.ts` 의 `site: 'https://<old>'`
- `wrangler.jsonc` 내 comment 예시
- `ecosystem.json` 해당 앱 entry
- `scripts/ops/cf-*-migrate.sh` 같은 helper 스크립트의 DOMAIN 상수
- `CLAUDE.md` 의 context 줄

journal/archive 는 역사적 기록이므로 변경 대상 아님.

커밋 분리: `refactor(<app>): <old-domain> → <new-domain> 코드 레퍼런스 교체`.

### 4. OAuth client redirect_uri 이중화 (SSO 앱 한정)

`modfolio-connect` 의 `OAUTH_CLIENTS[<app-client-id>].redirect_uris` 배열에 **새 도메인 callback 을 추가** (기존 유지). modfolio-connect 배포.

```typescript
redirect_uris: [
  "https://<old-domain>/auth/callback",   // 기존 유지 (단계 10 까지)
  "https://<new-domain>/auth/callback",   // 신규
]
```

검증: `curl -s https://connect.modfolio.io/.well-known/openid-configuration` 정상 + admin UI / D1 쿼리로 이중 URI 확인.

### 5. Dry-run deploy

```bash
athsra run <repo> -- bash -c "cd apps/<app> && bun run build && bunx --bun wrangler deploy --dry-run"
```

검증: `0 errors` + bindings 목록에 SESSION / IMAGES / 기타 필요 binding 전부 표시.

### 6. 실제 deploy (custom domain 미부여)

```bash
athsra run <repo> -- bash -c "cd apps/<app> && bunx --bun wrangler deploy"
```

검증: `curl -I https://<worker>.<account-subdomain>.workers.dev/` → HTTP 200. hang 시 Ctrl-C + telemetry 재확인. workers.dev URL 200 이 확보될 때까지 다음 단계 금지.

**안전성**: Pages 에 영향 없음. 기존 `<domain>` 은 여전히 Pages 서빙. 실패 시 Worker 삭제만으로 원상복구.

### 7. 새 도메인 Worker 에 부여

```bash
athsra run <repo> -- bunx --bun wrangler domains add <new-domain> --name <worker>
```

검증: `dig <new-domain> CNAME` + `curl -I https://<new-domain>/` → 200 (응답 헤더에 `cf-worker` 확인).
Rollback: `wrangler domains remove <new-domain>` (사용자 트래픽 아직 없음).

### 8. Smoke test + soak

- `<new-domain>` 에서 주요 유저 flow 완주 (로그인 / 주요 페이지 / 이미지 로딩).
- Workers observability 에서 5xx / session-lost 모니터.
- 최소 **24h**, rename 동반이면 **72h** 이중 도메인 soak 권장.

### 9. (rename 시) 기존 도메인 Pages 에서 detach

```bash
athsra run <repo> -- bunx --bun wrangler pages domain remove <project> <old-domain>
```

**다운타임 창 5~30초 시작** — 다음 단계 즉시 실행.

### 10. 기존 도메인 Worker 에 attach

```bash
athsra run <repo> -- bunx --bun wrangler domains add <old-domain> --name <worker>
```

검증: 두 도메인 모두 200. Rollback: `wrangler pages domain add <project> <old-domain>` (<60s 복구).

### 11. D+7 관찰 — modfolio-connect 에서 old callback 제거

```typescript
redirect_uris: [
  "https://<new-domain>/auth/callback",   // 유지
  // "https://<old-domain>/auth/callback"  // 제거
]
```

배포 후 신규 도메인으로 로그인 정상 작동 재확인.

### 12. (rename 완전 제거 시) old 도메인 Worker 에서도 제거

```bash
athsra run <repo> -- bunx --bun wrangler domains remove <old-domain>
```

이후 `<old-domain>` 은 NXDOMAIN 또는 default CF 404. alias 로 유지할지는 per-app 결정.

### 13. Pages 프로젝트 삭제 (deployments < 100 선행 필수)

**제약**: Cloudflare Pages 는 프로젝트 내 deployment 가 100 개 이상이면 `project delete` 가 실패한다. 본격 삭제 전 deployment cleanup 선행 필수.

**Bulk deployment cleanup 절차** (API 기반):

```bash
athsra run <repo> -- bash -c '
  PROJECT="<project>"
  page=1
  while true; do
    RESP=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/deployments?per_page=25&page=$page")
    IDS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get(\"result\") or []; [print(p[\"id\"]) for p in r if not p.get(\"aliases\")]")
    [ -z "$IDS" ] && break
    for id in $IDS; do
      curl -s -X DELETE -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/deployments/$id?force=true" > /dev/null
      sleep 0.5
    done
    page=$((page+1))
  done
'
```

**포인트**:
- `?force=true` 플래그로 aliased deployment 도 삭제 가능. 단 production (`aliases` 비어있지 않은) 최신 deployment 는 filter 로 제외.
- `per_page=25` pagination — 2026-04 CF API 응답 기본. 너무 크면 API 타임아웃.
- `sleep 0.5` — CF API rate limit 예방.

검증: `wrangler pages deployment list --project-name <project>` → count < 100.

**프로젝트 삭제**:

```bash
athsra run <repo> -- bunx --bun wrangler pages project delete <project>
```

검증: `wrangler pages project list` 에서 미출현.

### ecosystem.json 갱신

이관 완료 후 해당 앱 entry 수정:

```jsonc
{
  "deployment": "cf-workers",       // "cf-pages" → "cf-workers"
  "cfProject": "<worker>",          // rename 시 새 이름
  "domain": "<new-domain>",         // rename 시 새 도메인
  // "migration": { ... }             // 완결 시 섹션 제거
}
```

## 프레임워크별 주의

### Astro 6 + @astrojs/cloudflare 13.x

- `main` 은 package import 경로 (`@astrojs/cloudflare/entrypoints/server`). 기존 Pages 가 `dist/_worker.js/index.js` 였으면 이 필드만 바꾸면 됨.
- `astro build` 산출물은 `dist/` 로 가고 정적 asset 은 `./dist` 아래 — assets binding directory 동일.
- Workers Builds (Git integration) 를 쓸 경우 **`wrangler.jsonc.name` 이 CF 대시보드의 Worker 이름과 정확히 일치**해야 함. 이름 불일치 = 빌드 실패.

### SvelteKit 5 + @sveltejs/adapter-cloudflare

- `main` 은 `.svelte-kit/cloudflare/_worker.js` (adapter default 출력).
- `assets.directory` 는 `.svelte-kit/cloudflare` (동일 폴더에 static + manifest).
- `vite build` 후 `svelte-kit build` → adapter 가 `.svelte-kit/cloudflare/` 에 Worker 산출. 빌드 script: `"build": "vite build"`.

### Next.js (@opennextjs/cloudflare)

- OpenNext adapter 사용. `main` 은 `.open-next/worker.js`, assets 는 `.open-next/assets/`.
- `compatibility_flags`: `["nodejs_compat"]` + `["streaming"]` 권장.
- 자세한 변환은 OpenNext 공식 docs 참조 (빠르게 변경되므로 canon 에 고정하지 않음).

## Rollback 시나리오

| 단계 | 위험 | Rollback |
|------|------|----------|
| 6 deploy | Worker 생성 실패 | Worker 삭제 (`wrangler delete <worker>`). Pages 무영향 |
| 7 new domain attach | DNS 미전파 / HTTPS 에러 | `wrangler domains remove <new-domain>`. 신규 트래픽 없으므로 영향 0 |
| 9-10 old domain 이동 | attach 실패 → `<old-domain>` down | `wrangler pages domain add <project> <old-domain>` < 60s 복구 |
| 13 Pages 삭제 | **복구 불가** | 사전에 `wrangler pages deployment list --project-name <project> > /tmp/backup.json` 으로 deployment list 백업 + production deployment artifact 별도 다운로드 |

## 이관 완료 정의

- [ ] `curl -I https://<new-domain>/` → 200, `cf-worker` 헤더
- [ ] (rename 시) `curl -I https://<old-domain>/` → 200 OR NXDOMAIN (정책에 따라)
- [ ] Workers observability 에 traffic 기록
- [ ] SSO flow 완주 확인
- [ ] Pages 프로젝트 삭제 (또는 보관 정책에 따라 유지)
- [ ] `ecosystem.json` 해당 entry 업데이트
- [ ] journal 1건 작성 (blocker / 해결 / 실측 포함)

## 관련 파일

- `knowledge/canon/secret-store.md` v1.13+ — CF creds 주입 경로 (athsra)
- `knowledge/canon/wrangler-standards-2026.md` — wrangler.jsonc 표준 (있는 경우)
- `knowledge/canon/observability.md` — Workers observability 설정
- `scripts/ops/cf-*-migrate.sh` — 프로젝트별 migrate 스크립트 (각 repo 에서 작성)
