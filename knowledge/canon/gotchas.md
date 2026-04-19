---
title: Gotchas & Lessons Learned
version: 1.1.0
last_updated: 2026-04-17
source: [knowledge/claude/gotchas.md]
sync_to_children: true
consumers: [preflight]
---

# Modfolio Universe - Gotchas & Lessons Learned

> 프레임워크별 실전 지식. 각 프로젝트에서 발견된 함정과 해결책.

## Biome v2
- Schema URL must match installed version exactly (e.g., `2.3.14/schema.json`)
- `organizeImports` removed → use `assist.enabled: true`
- `files.ignore` removed → use `files.includes` with `!pattern` negation
- Run `bunx biome format --write .` before `bunx biome check .` to fix formatting
- `biome format` only fixes formatting — `biome check --write` fixes lint/assist issues (import ordering)
- `biome check src/` errors when no supported files exist → use `--no-errors-on-unmatched` for MDX-only dirs
- Skeleton a11y: `<div role="status">` triggers `useSemanticElements` → use `<output>` element instead
- `useLiteralKeys` rule flags `process.env['KEY']` → use `process.env.KEY`
- `noUnknownAtRules: off` needed for UnoCSS `@unocss` CSS at-rules
- `.svelte` files need overrides: noUnusedImports/noUnusedVariables off, useConst off (Svelte 5 `$state` requires `let` for template-reassigned vars but Biome can't see template usage)
- Biome can't parse `.astro`/`.svelte` templates → use overrides

## Next.js + Cloudflare
- `@unocss/postcss` conflicts with Next.js webpack PostCSS pipeline → use plain CSS for shell phase
- `@unocss/postcss` string format fails in monorepo (hoisted node_modules); `@unocss/webpack` has `Cannot read 'replace'` bug with Next.js 15.5 → use `@unocss/cli` pre-build step instead
- UnoCSS CLI approach: `unocss "app/**/*.tsx" -o app/uno-generated.css && next build`; import `./uno-generated.css` in layout; exclude from biome via `files.includes: ["!app/uno-generated.css"]`
- Next.js auto-installs `@types/node` via pnpm if missing → add to devDeps explicitly
- `output: 'export'` incompatible with dynamic `[id]` routes → remove for admin apps with client-side routing
- OpenNextJS Cloudflare doesn't fully support Windows → CI-only for CF deployment
- Next.js static export deploys to `out/` (not `dist/`)

## SvelteKit + Cloudflare
- `@sveltejs/adapter-cloudflare` outputs to `.svelte-kit/cloudflare/`
- `svelte-check` needs `vite` as devDep for vite.config.ts resolution
- Svelte 5 uses `$props()` and `{@render children()}` syntax
- `wrangler deploy` for SvelteKit needs `node_modules` (esbuild resolves bare `@sveltejs/kit`)
- SvelteKit apps MUST deploy from CI job (not artifact-based deploy matrix)
- pay-app deploys directly in CI job; NOT in deploy-map.json
- Svelte 5 rune 사용 파일(`.ts`)은 반드시 `.svelte.ts` 확장자 필수. `$state()`, `$derived()` 등 rune을 일반 `.ts`에서 쓰면 Svelte 컴파일러가 변환하지 않아 런타임 500 에러 발생 (예: `toast.ts` → `toast.svelte.ts`, modfolio-pay commit `4330277`)

## SvelteKit Auth Consumer Pattern
- Same pattern as SolidStart: `createAuthServer` with shared DB + secret, session validation only
- `hooks.server.ts` + `sequence()` replaces SolidStart middleware (session → auth guard → logging)
- `event.locals.session` passes session data between hooks and routes
- `src/lib/server/` convention prevents client-side import of server-only modules
- `better-auth/svelte` for client-side auth hooks (nanostores-based)
- `PUBLIC_` prefix for client env vars (replaces `VITE_` in SolidStart)
- `app.d.ts` session type: use `Awaited<ReturnType<typeof import('$lib/server/session').getServerSession>>` to stay in sync with Better Auth types — avoid hardcoding session shape
- `zod` must be explicit dep in SvelteKit apps too (same as SolidStart SSR bundling issue)

## PortOne (포트원) V2
- Korean PG aggregator; chosen over Stripe (no US entity) and Toss (expensive)
- Server: `@portone/server-sdk` — `PortOneClient({ secret })` factory (NOT constructor)
- Client: `@portone/browser-sdk` — `import * as PortOne from '@portone/browser-sdk/v2'` (note `/v2` subpath)
- Webhook: Standard Webhooks spec — `Webhook.verify(secret, rawBody, headers)` with `webhook-id`, `webhook-signature`, `webhook-timestamp` headers
- Env vars: `PORTONE_API_SECRET` (server), `PORTONE_WEBHOOK_SECRET` (webhook), `PUBLIC_PORTONE_STORE_ID` + `PUBLIC_PORTONE_CHANNEL_KEY` (client, not secrets)
- Payment flow: client `requestPayment()` → server `getPayment()` verification → webhook for async events

## SolidStart
- Needs `src/entry-server.tsx` + `src/entry-client.tsx` explicitly
- `.vinxi/` is Vinxi build cache → exclude from Biome and .gitignore
- SolidJS packages export raw `.tsx` source (ADR-003) → compiled at app level
- `'use server'` at module top gives Vite warning (ignored during bundle) but SolidStart handles it
- Transitive deps (e.g. `drizzle-orm`, `better-auth`) must be explicit in app package.json for Vite/Rollup SSR build resolution
- `better-auth/solid` → `createAuthClient` returns `useSession()` as Solid `Accessor`
- `better-auth/react` → `createAuthClient` returns `useSession()` as `{ data, isPending, error }`
- Better Auth admin client: `listUserSessions({ userId })` takes `userId` directly, NOT `{ query: { userId } }`
- Better Auth admin: `setRole` expects `role: 'user' | 'admin'`, not `string`
- Better Auth `authClient.$options.baseURL` may not be typed → use `process.env.NEXT_PUBLIC_AUTH_URL` instead

## SolidStart Auth Consumer Pattern
- Consumer apps (non-connect) validate session cookies via `createAuthServer` with same DB + secret
- NO `emailAndPassword`, NO `socialProviders` — login handled by connect-app (my.modfolio.io)
- `auth-guard.ts`: `requireAuth()` redirects to `my.modfolio.io/login?redirect=<current-url>` (not `/login`)
- `auth-client.ts`: Use `better-auth/solid` for `useSession()` reactive hook, point `baseURL` to connect-app
- `env.d.ts`: Must declare `ImportMetaEnv` + `ImportMeta` for Vite `import.meta.env` types (vinxi doesn't auto-provide)
- `tsconfig.json`: Add `paths: { "~/*": ["./src/*"] }` for Vinxi's `~` alias resolution in `tsc --noEmit`
- `zod` must be explicit dependency if env.ts uses `import type { z } from 'zod'`
- connect-app `auth-client.ts`: must NOT import server-side `env` (process.env) — runs on client too. Since connect IS the auth hub, omit baseURL (defaults to current origin)
- `@modfolio/redis` `createRateLimiter` returns `{ check() }` (not `limit()`), result is `{ isAllowed, remaining, resetAt }` (not `{ success, remaining, reset }`)

## Astro / Starlight
- Starlight sidebar: use `link: '/'` for index page, NOT `slug: ''` (throws AstroUserError)
- Starlight sidebar: `autogenerate: { directory: 'section-name' }` for auto-gen sections
- Biome can't parse `.astro` templates → use overrides

## Qwik
- Build needs `build.client` + `build.server` scripts in package.json
- `qwik build` internally runs `bun run lint` — lint errors block the build
- **CF Pages `_worker.js` import bug**: Qwik's cloudflare-pages adapter generates `_worker.js` with bare import `"server/entry.cloudflare-pages"` instead of relative `"./server/entry.cloudflare-pages.js"`. CF Pages' esbuild fails to resolve bare imports. Fix: add `build.fix-worker` post-build script in package.json that replaces the import path
- `router-head.tsx`: Vite warns about "Duplicate key `dangerouslySetInnerHTML`" — this is a Qwik internal generated code warning, can be safely ignored
- Qwik SSG results may show "0 pages" when all routes are SSR-only (expected behavior)
- `using deprecated parameters for the initialization function` warning from Vite 7 + Qwik — informational, does not affect build

## CI/CD
- Config-driven: `.github/deploy-map.json` (23 deployable apps)
- `upload-artifact` needs `include-hidden-files: true` for `.svelte-kit/`
- Deploy: `bunx --bun wrangler` (not wrangler-action, avoids packageManager issues)
- Concurrency control: prevent simultaneous deploys, cancel-in-progress for PRs
- Turborepo remote cache: `rharkor/caching-for-turbo` (GitHub Actions cache)
- Deploy uses `last-deploy-sha` cache to diff against last successful deploy (not just HEAD~1)
- `workflow_dispatch` trigger allows manual CI re-runs from GitHub Actions UI
- If E2E fails → deploy skipped → next push picks up missed changes via cached SHA diff

## Vitest 4 Migration
- `vi.fn().mockImplementation(() => ...)` arrow functions can't be used with `new` — use `function` keyword
- Base vitest config must have `exclude: ['dist', ...]` to avoid running stale dist test artifacts
- tsc does NOT clean outDir — stale `dist/__tests__/` from old builds will be picked up by vitest

## Drizzle ORM
- drizzle-kit uses CJS internally (`bin.cjs`) — schema files loaded via `require()`
- `.js` extension imports (`from './auth.js'`) fail in drizzle-kit because CJS can't resolve `.js` → `.ts`
- Fix: use extensionless imports (`from './auth'`) in schema files; bundlers handle this fine
- `drizzle.config.ts` `schema` supports glob patterns (`'./src/schema/*.ts'`) for multi-file schemas

## Workspace
- `tsconfig.json` `extends` resolves via Bun workspace for `@modfolio/config/tsconfig/*`
- Library packages (database, auth-client, env, analytics, monitoring) must build before dependents
- turbo.json `dependsOn: ["^build"]` handles this

## Resend Email
- `resend` npm package imports `@react-email/render` as optional peer dep → breaks SolidStart/Cloudflare Workers bundling
- Use direct REST API (`POST https://api.resend.com/emails` with Bearer token) instead of SDK for non-React/Next.js apps

## Better Auth Client API
- Password reset: `authClient.requestPasswordReset()` (NOT `forgetPassword`)
- Password change with token: `authClient.resetPassword({ token, newPassword })`

## .gitignore
- `server/` matches everywhere in tree — use `/server/` for root-only or `apps/*/server/` for app-level build outputs
- Qwik `server/` is a build output directory (SSR bundle) — should be ignored

## PixiJS v8
- `Texture.fromURL()` removed in v8 → use `Assets.load(path)` from `pixi.js`
- `Application` init is async: `const app = new Application(); await app.init({ canvas, ... })`
- `Graphics` API is chainable: `graphic.circle(0,0,5); graphic.fill({color, alpha})`
- `Text` constructor: `new Text({ text, style })` (object form, not positional args)

## GSAP + Lenis
- Lenis ↔ GSAP sync: `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add(time => lenis.raf(time * 1000))`
- `gsap.ticker.lagSmoothing(0)` prevents GSAP from skipping frames when Lenis is active

## Biome Formatting (Pre-Commit Mandatory)
- ALWAYS run `bun run format` before committing, especially after bulk file edits
- Biome enforces line-length limits — long import lines (5+ named exports) will be split into multi-line
- Example: `import { defineConfig, presetIcons, presetUno, presetWebFonts, transformerVariantGroup } from 'unocss'` exceeds limit → Biome reformats to one-per-line
- Subagents/Cursor may generate syntactically correct but unformatted code — always format before commit
- Verification chain (순서 중요): `bun run format` → `bun run lint` → `bun run check` → `bun run build`
- `bun run lint` checks formatting too — if format wasn't run, lint will fail in CI

## Biome CSS
- `!important` in CSS triggers `noImportantStyles` rule — cannot use `biome-ignore` per project rules
- Reduced-motion `!important` pattern: handle in each component via JS `matchMedia` check instead of global CSS override

## Windows
- `git mv` can fail with Permission denied → use `cp -r` + `rm -rf`
- `wrangler dev` has limitations → use `bun run dev` locally
- `nul` file can be accidentally created (Windows reserved name) → delete if found in repo root

## Astro 6 (2026-03)
- Node 22.12+ 필수
- `Astro.glob()` 제거 → `import.meta.glob()` 사용
- `<ViewTransitions />` → `<ClientRouter />`
- `Astro.locals.runtime` 제거 → 직접 platform API 사용
- Content Collections 레거시 제거 → Content Layer API + `src/content.config.ts`
- `.cjs/.cts` 설정 파일 지원 제거 → `.mjs/.ts` 사용
- Zod 4: `z.string().email()` → `z.email()`, error `{ message: }` → `{ error: }`
- `@astrojs/cloudflare` v13 필수 (Workers adapter)

## CF Pages → Workers 마이그레이션
- `pages_build_output_dir` → `assets.directory` + `main` in wrangler.jsonc
- `wrangler pages dev` (8788) → `wrangler dev` (8787)
- Workers는 CF DNS 관리 도메인만 Custom Domain 지원
- Pages 삭제 전 deployment 100개 이상이면 99 이하로 정리 필수
- SvelteKit: adapter-cloudflare-workers deprecated → adapter-cloudflare v7.2+ 사용
- Deploy command: `bunx --bun wrangler deploy`

## CF 2026-04 업데이트 함정
- **Observability 기본값 변경**: 2026-03-01 이후 신규 Worker는 `observability.enabled = true` 자동 활성. 기존 Worker는 명시 필요. 월 10M spans 초과 시 $0.60/1M 과금 — `head_sampling_rate: 0.1` 조정 고려
- **Dynamic Workers + DO Facets**: `compatibility_flags: ["streams_enable_constructors"]` 필요. 기존 KV-backed DO는 `new_classes` 그대로, 신규만 `new_sqlite_classes` (강제 이관 금지 — `canon/cross-worker-do-pattern.md §Facets`)
- **wrangler JSON 선호**: CF 신기능은 JSON-only (`wrangler.jsonc`) 채널로 출시. TOML은 제거 단계적 — 단, 기존 TOML 강제 변환 금지 (harness-pull identity file 보호)
- **D1 Global Read Replicas 자동 GA**: write 직후 read는 Sessions API bookmark 전달 필수 (`canon/d1-read-replicas.md`). default 라우팅은 fastest replica (stale 허용)
- **Browser Run** (Browser Rendering 리브랜드): 동시 세션 30→120개. Live View 공유 시 PII 노출 주의
- **Workflows V2 limits**: 50K concurrent, 2M queued, 300/sec creation. 기존 Queue 패턴과 중복 투자 주의 — 앱별 ADR
- **`[1m]` context variant**: Claude Opus 4.7/4.6 모두 1M 지원 (`/model claude-opus-4-7[1m]`). 새 토크나이저가 최대 +35% 토큰 소비 가능 — 실효 비용 관찰 필요
- **`CLAUDE_CODE_EFFORT_LEVEL max` 다운그레이드 버그** (Issue #30726, #40093): agent frontmatter `effort` + env 이중 설정으로 완화. `/effort` slash 런타임 재확인 가능. Claude Code v2.1.111+ 확인 필수
