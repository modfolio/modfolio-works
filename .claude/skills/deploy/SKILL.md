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

> CF Pages → Workers 마이그레이션 완료. 모든 신규/기존 앱은 CF Workers로 배포.

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

## GitHub Actions 허용 범위

**배포 목적 Actions 금지. 다음 용도만 허용:**
- Biome lint + typecheck (빌드 없는 품질 검사만)
- `@modfolio/contracts` 패키지 publish (GitHub Packages)

## CF API 정보

| 항목 | 조회 방법 |
|------|-----------|
| Account ID | `doppler secrets get CF_ACCOUNT_ID --plain` |
| API Token | `doppler secrets get CF_API_TOKEN --plain` |

## 새 앱 배포 체크리스트

1. `wrangler.jsonc` 작성 (프레임워크별 템플릿 참조)
2. Workers Builds에서 GitHub 연동 설정
3. 커스텀 도메인 연결 (CF DNS 필수)
4. 환경변수/시크릿 설정 (Doppler에서 Workers에 복사)
5. `bunx --bun wrangler secret put {NAME}` 으로 시크릿 등록
6. GitHub push → Workers Builds 자동 배포 확인
7. `ecosystem.json` cfProject 필드 갱신
