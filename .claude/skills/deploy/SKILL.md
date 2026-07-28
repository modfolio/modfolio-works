---
name: deploy
description: Cloudflare Workers 배포 가이드. Workers Builds GitHub 연동 + wrangler.jsonc 설정 + 마이그레이션
user-invocable: true
---


## Auto Context
@wrangler.jsonc
@package.json
@knowledge/canon/operations.md
!git branch --show-current

# Skill: 배포 (CF Workers)

> 배포 정공법 SoT = `knowledge/canon/cf-deploy.md` 「확정」 블록. 신규/기존 앱 = CF Workers Builds(GitHub 연동 push-to-deploy). Pages 잔존은 이관 대기(완료 아님).

## Step 0: CF 프로젝트명 확인 (필수)

배포 전 `ecosystem.json`에서 이 레포의 CF 프로젝트명을 확인:
- `cfProject` / `cfLandingProject` → Landing 프로젝트명
- `cfAppProject` → App 프로젝트명
- **절대** 임의로 프로젝트명을 만들지 않음. ecosystem.json이 source of truth
- 명명 규칙: Landing = `{name}`, App = `{name}-app` (상세: canon/operations.md)

## 원칙

**GitHub Actions 배포 금지. CF Workers Builds(GitHub 연동) 사용.**

### 이유
- CF가 Pages를 Workers로 흡수 중 (2025-04 deprecated 선언)
- Workers가 Durable Objects, Cron Triggers, Queue Consumers 등 더 많은 바인딩 지원
- Workers Builds가 GitHub repo를 직접 감지해 자동 빌드/배포
- Static Assets 기능으로 Pages의 정적 파일 서빙을 Workers에서 동일 지원

## wrangler.jsonc 설정 (프레임워크별)

> **2026-04 권장 공통 블록** (모든 프레임워크에 추가):
>
> ```jsonc
> {
>   "compatibility_date": "2026-04-15",
>   "compatibility_flags": ["nodejs_compat"],
>   "observability": { "enabled": true, "head_sampling_rate": 1 }
> }
> ```
>
> 상세 템플릿: `canon/wrangler-standards-2026.md`. Observability 기본값·튜닝: `canon/observability.md`.
> Dynamic Workers / DO Facets 사용 시 `compatibility_flags`에 `"streams_enable_constructors"` 추가.

### Astro (랜딩 + docs + dashboard)

```jsonc
{
  "name": "{project-name}",
  "compatibility_date": "2026-04-15",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist/client/"
  },
  "main": "./dist/_worker.js",
  // 바인딩 (필요 시)
  // "d1_databases": [{ "binding": "DB", "database_name": "...", "database_id": "..." }],
  // "r2_buckets": [{ "binding": "BUCKET", "bucket_name": "..." }]
}
```

### SvelteKit 5

```jsonc
{
  "name": "{project-name}",
  "compatibility_date": "2026-04-15",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".svelte-kit/cloudflare/"
  },
  "main": ".svelte-kit/cloudflare/_worker.js"
}
```

어댑터: `@sveltejs/adapter-cloudflare` v7.2+ (adapter-cloudflare-workers는 deprecated)

### SolidStart

```jsonc
{
  "name": "{project-name}",
  "compatibility_date": "2026-04-15",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".output/public/"
  },
  "main": ".output/server/index.mjs"
}
```

Vinxi/Nitro preset: `cloudflare` (not `cloudflare-pages`)

### Nuxt 3

```jsonc
{
  "name": "{project-name}",
  "compatibility_date": "2026-04-15",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".output/public/"
  },
  "main": ".output/server/index.mjs"
}
```

Nitro preset: `cloudflare` in `nuxt.config.ts`

### Qwik City

```jsonc
{
  "name": "{project-name}",
  "compatibility_date": "2026-04-15",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "dist/"
  },
  "main": "server/entry.cloudflare-workers.mjs"
}
```

### Hono (API Workers)

```jsonc
{
  "name": "{project-name}",
  "compatibility_date": "2026-04-15",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/index.ts"
  // assets 없음 (API only)
}
```

## Turbo monorepo 빌드 설정

| 앱 | build_command | output |
|----|---------------|--------|
| Astro landing | `bun install && bun run build -- --filter=landing` | `apps/landing/dist/` |
| SvelteKit app | `bun install && bun run build -- --filter=app` | `apps/app/.svelte-kit/cloudflare/` |
| Nuxt app | `bun install && bun run build -- --filter=app` | `apps/app/.output/` |
| SolidStart app | `bun install && bun run build -- --filter=app` | `apps/app/.output/` |

## Pages → Workers 마이그레이션 절차

### 사전 조건
- `wrangler.jsonc` 수정 완료 (`pages_build_output_dir` → `assets.directory`)
- 프레임워크 어댑터 업데이트 (adapter-cloudflare v7.2+, @astrojs/cloudflare v13+)

### 절차

```
1. CF Dashboard → Pages 프로젝트 → Settings → Custom Domains → 모든 도메인 삭제
2. Deployments 탭 → 100개 이상이면 구 deployment 삭제 (99개 이하로)
   bunx --bun wrangler pages deployment list --project-name={name}
   bunx --bun wrangler pages deployment delete {deployment-id} --project-name={name}
3. Pages 프로젝트 삭제 (Dashboard 또는 API)
4. Workers & Pages → Create → Import from GitHub → 레포 선택
5. Workers Builds 설정: Build command + Output directory
6. Custom Domain 재설정: Workers → Settings → Domains & Routes
7. 배포 확인: git push → Workers Builds 자동 실행
```

### 주의사항
- Workers는 Cloudflare DNS 관리 도메인만 Custom Domain 지원 (외부 NS 불가)
- `wrangler pages dev` (포트 8788) → `wrangler dev` (포트 8787)로 변경
- `assets.run_worker_first: true` — 인증/로깅이 정적 에셋보다 먼저 실행되어야 할 때
- `.assetsignore` 파일로 업로드 제외 (node_modules, .git 등)

## 검증 — 배포가 실제로 나갔는가 (SoT = canon `cf-deploy.md` v1.4.0 §검증)

> **⚠ "라이브 200" 은 배포 확인이 아니다.** 배포 실패는 사이트를 죽이지 않는다 — **안 바꿀 뿐이다.**
> 구버전 워커가 그대로 200 을 서빙한다. modfolio-design 은 **CF 빌드 6연속 실패를 200 만 보고 놓쳤고**
> 그동안 WCAG AA 수정이 라이브에 못 나갔다(2026-07-26 실측).
>
> 이 함정이 고약한 이유는 200 이 **가장 안심되는 신호**라서다 — 확인했다는 느낌을 주면서 아무것도
> 확인하지 않는다. **완료 판정을 200 에 걸어 두면 실패가 조용히 누적된다.**

push 후 아래 **양성 증거를 하나 이상** 확보해야 배포 완료다:

| 증거 | 명령 / 확인 지점 |
|---|---|
| CF build outcome | `/builds/workers/{script_tag}/builds` → `build_outcome: "success"` (canon `cf-workers-builds-api.md`) |
| **배포 Version ID 변화** | `bunx wrangler deployments list` — 배포 전후 ID 가 **달라야** 한다 |
| 자산 해시 대조 | 빌드 산출물 해시 ↔ 라이브가 서빙하는 해시 |
| 배포본 안의 실제 값 | 이번 커밋이 바꾼 문자열·버전이 응답에 **실제로 보이는지** |

**200 은 "죽지 않았다" 의 증거이고, 위 넷이 "바뀌었다" 의 증거다.**

```bash
athsra run <repo> -- bunx wrangler whoami            # 토큰 유효 + account 일치
athsra run <repo> -- bunx wrangler deployments list  # Version ID 가 push 전후로 바뀌었는가
```

같은 축의 다른 사각지대 — 각 신호가 놓치는 것이 다르다:
- `build` 성공 ≠ **workerd 런타임 성공**(인증 게이트 뒤 SSR 은 익명 스모크로 검증된 적이 없다)
- 로컬 `dev` 성공 ≠ 엣지 동작(CSP·엣지 주입 리소스는 로컬에 안 보인다)
- 비대화형 `wrangler deploy` 는 **cron trigger 등록을 silent skip** 한다(별도 검증 필요)

세 신호가 각각 다른 것을 놓치므로 **무엇을 확인하려는지 먼저 정하고** 그것을 실제로 보는 신호를
고른다. 상세·정확 명령 = canon `cf-deploy.md` §검증.

## GitHub Actions — 전면 금지

GitHub Actions 컴퓨트는 deploy/CI/publish **어디에도 쓰지 않는다** (canon `gh-actions-policy.md` v2.0). 배포 = CF Workers Builds, CI = NAS Forgejo Actions/local, `@modfolio/*` publish = local track. 신규 `.github/workflows/*.yml` 생성 금지.

## CF API 정보 (athsra 주입 — secret-store v3)

CF 자격증명은 athsra 에 보관하고 비대화형 wrangler 는 `athsra run <repo> -- bunx wrangler ...` 로 주입한다 (값 노출 금지). 등록: `athsra set <repo> CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...`. doppler/dotenvx 경로는 폐기. 상세 = `cf-deploy.md` 경로 2.

## 새 앱 배포 체크리스트

1. `wrangler.jsonc` 작성 (프레임워크별 템플릿 참조)
2. Workers Builds에서 GitHub 연동 설정
3. 커스텀 도메인 연결 (CF DNS 필수)
4. 시크릿 설정 — **두 시점을 구분한다** (Doppler 는 2026-04-25 폐기, athsra v3 가 표준):
   - **build 시점**: Builds trigger 환경변수(`is_secret: true`)로 주입. build script 안에서
     `athsra run` 을 부르면 CF runner 엔 athsra 가 없어 `command not found` 로 빌드가 죽는다
   - **런타임**: `bunx --bun wrangler secret put {NAME}` (또는 Secret Store 바인딩)
   - **로컬 dev/일회성 deploy**: `athsra run <repo> -- <cmd>` 주입
5. GitHub push → Workers Builds 자동 빌드
6. **배포 검증** — 위 §검증의 양성 증거 확보(200 만으로는 완료 아님)
7. `ecosystem.json` cfProject 필드 갱신
