---
title: Gotchas & Lessons Learned
version: 1.1.0
last_updated: 2026-04-17
source: [knowledge/claude/gotchas.md]
sync_to_siblings: true
applicability: always
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

## SvelteKit CSRF — machine-to-machine 엔드포인트 (OIDC token, webhook)
- 내장 CSRF 보호(`csrf.checkOrigin`)는 cross-origin 의 form content-type POST(`application/x-www-form-urlencoded`·`multipart/form-data`·`text/plain`)를 **기본 차단** → `403 Cross-site POST form submissions are forbidden`
- OIDC 토큰 엔드포인트(RFC 6749 §4.1.3 = `application/x-www-form-urlencoded` POST 필수)·webhook receiver 등 비브라우저 form-POST 가 전부 막힘 (클라 origin ≠ 서버 origin)
- 해결: 해당 경로를 CSRF origin 검사에서 면제 — `hooks.server.ts` `handle` 에서 기본 csrf 이전에 처리하거나 OIDC/machine 경로만 origin 검사 자체 구현. client auth(PKCE `code_verifier`/client_secret)·webhook 서명이 form-CSRF 를 이미 대체하므로 안전
- 출처: modfolio-connect 2026-06-21 근본수정 (commit `452633f`, OIDC `/sso/token` 403 해소). 상세 의견 = `feedback/modfolio-connect/ecosystem-opinion-20260621-sso-token-csrf.md`

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

## CI/CD (배포 = Workers Builds, GHA 금지)
- 배포 = **CF Workers Builds** (push-to-deploy). SoT = `cf-deploy.md` 「확정」. GitHub Actions 배포/CI **전면 금지** (`gh-actions-policy.md` v2.0) — CI 컴퓨트는 NAS Forgejo Actions/local. (옛 `.github/deploy-map.json`·wrangler-action·workflow_dispatch 기반 GHA 파이프라인은 폐기됨.)
- 모노레포: Worker 별 **build-watch-paths** 로 바뀐 앱만 rebuild (build-min 절약). `root_directory = apps/<app>` 면 monorepo-root `bun.lock` 캐싱 경고 → symlink 또는 `cd ../..` 패턴.
- **build token silent expire** = 가장 흔한 무음 배포 실패. 진단/복구 + 분기 점검 = `cf-workers-builds-api.md`.
- **연속 실패가 쌓이면 CF 가 빌드 큐잉 자체를 멈춘다 (2026-07-18 connect 실사건)**: 체크런이 아예 생성되지 않아 **CF 장애처럼 보인다**. 실제로는 backoff 로 추정 — **수정 커밋을 push 하면 트리거가 자연 부활**한다(대시보드 개입 불필요). 그 사이 prod 유지는 `bunx wrangler deploy` 수동. 즉 "빌드가 아예 안 뜬다"를 인프라 장애로 오진하기 전에 **직전 연속 실패 이력**부터 본다.
- **레지스트리 전환은 `.npmrc` 만으로 끝나지 않는다 — lockfile 은 `.npmrc` 의 그림자가 아니다** (같은 사건의 원인1): `@modfolio` scope 를 pkg.modfolio.io 로 바꿔도 `bun.lock` 은 여전히 `npm.pkg.github.com` + `always-auth` 로 해상 → 토큰 없는 CI 에서 전 빌드 설치 실패. **전환 = `.npmrc` 수정 + `bun install` 재해상까지가 한 커밋.** harness 3.22.0 부터 `harness-pull` 이 이 반쪽 상태를 감지해 경고한다(`scripts/harness-pull/lock-drift.ts`, 자동 수정은 하지 않음 — lock 재생성은 실제 install 이라 멤버 판단).
- **wrangler 4.112+ 는 `@astrojs/cloudflare` 의 `legacy_env` 를 거부**한다 → Astro 앱은 `~4.110.0` 홀드 핀 또는 어댑터 상향까지 대기. wrangler 를 caret 으로 띄워두면 어느 날 갑자기 전 빌드가 깨진다.
- **CF cron 트리거 한도 = 계정당 5(Free) / 250(Paid)** — **per-Worker 한도는 공식 문서에 없다**([Workers Limits](https://developers.cloudflare.com/workers/platform/limits/), 2026-07-22 확인). ⚠ **2026-07-21 에 이 항목을 "계정당 3개"로 적었던 것은 오류다** — athsra 커밋 메시지(`계정 cron 트리거 3개 한도`)를 출처 확인 없이 canon 으로 승격했다. athsra 가 무언가에 막힌 것은 사실이나 그 수치는 문서와 불일치하므로, **한도를 근거로 설계를 바꾸기 전에 위 문서를 직접 확인**할 것. 우리 fleet 실측(2026-07-22): cron 선언 Worker 4개 · 트리거 합계 16 — Paid 기준 여유(16/250). 별건으로 DB-touching cron 은 `<=*/5` 금지(`cron-safety.md`, Neon autosuspend resonance).
  - 교훈: **커밋 메시지는 1차 출처가 아니다.** 벤더 한도·API 계약처럼 공식 문서가 존재하는 사실은 그 문서로 검증한 뒤 canon 에 올린다(`.claude/rules/agent-evidence.md`).

## Claude Code 훅 (차단형 가드)

- **exit 2 만 차단이고, 나머지 exit code 는 전부 "통과"다** ([Hooks reference](https://docs.claude.com/en/docs/claude-code/hooks), 2026-07-22 확인: *"Other exit codes represent a non-blocking error. stderr is shown to the user and execution continues."*). 따라서 **가드 안에서 예외가 나면 막으려던 그것이 조용히 실행된다** — 크래시는 곧 fail-open. 실사건(2026-07-22): `pre-payment-guard` 내부 TypeError 로 live Stripe 키 명령이 exit 1 = 허용으로 통과.
  - 대책 = `scripts/hooks/_fail-closed.ts` 의 `failClosed(name)` 을 **차단형 가드 첫 줄에** 배선(uncaughtException/unhandledRejection → exit 2). 현재 payment·destructive·orbit-writ 3종 적용. **advisory/notice 훅에는 적용 금지** — 고장난 알림이 작업을 막으면 그게 사고다.
- **stdout 에 JSON 을 쓰지 말 것**(차단형 가드): 스키마 검증에 실패하면 exit 2 여도 차단되지 않던 버그가 있었다(업스트림 수정됨). 우리 가드는 **stderr + exit 2** 만 쓴다 — 이 관례를 유지한다.
- **훅은 도구 호출을 가로챌 뿐, 그 호출이 띄운 자식 프로세스는 못 본다.** `bun run orbit:execute` 는 한 번의 Bash 호출이라 그 안의 git 명령들은 훅에 보이지 않는다 — 스크립트 내부에서 스스로 정책을 평가해야 한다(그래서 orbit executor 에 env 우회 스위치를 두지 않았다).

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
- **`[1m]` context variant**: Claude Opus 4.8/4.7/4.6 모두 1M 지원 (`/model claude-opus-4-8[1m]`). 새 토크나이저가 최대 +35% 토큰 소비 가능 — 실효 비용 관찰 필요
- **`CLAUDE_CODE_EFFORT_LEVEL max` 다운그레이드 버그** (Issue #30726, #40093): agent frontmatter `effort` + env 이중 설정으로 완화. `/effort` slash 런타임 재확인 가능. Claude Code v2.1.111+ 확인 필수

## WSL 개발 워크스테이션

- **`networkingMode=mirrored` 금지 (2026-07-12)**: VS Code Remote-WSL **"freeze + 무한 reopen"의 원인** — MS 인정 버그(vscode-remote-release#9222/#10818/#11091, WSL#11184). mirrored 는 Windows/WSL 네임스페이스를 공유시켜 vscode-server localhost 연결을 깨뜨린다. 제거→NAT 복귀가 공식 해법(localhostForwarding 기본 ON 이라 Windows→WSL dev 서버 접속은 그대로). **재발 시 메모리를 의심하지 말고 `~/.vscode-server/data/logs/*/remoteagent.log` 부터**("The client has reconnected" 반복 = 이 버그). Windows 앱(Paper 등) localhost 접속은 게이트웨이 IP(`ip route list default`)로 — canon `design-tooling.md` §Paper.
- **/mnt/c 에 코드 금지**: 파일 생성 69배 느림(ext4 18ms vs 9p 1248ms, 500파일 실측). 코드는 항상 `~/code/`(ext4).
- **에이전트 셸의 `bun` 이 Windows shim 으로 해석됨 (2026-07-21 실측)**: Claude Code 의 Bash 도구는 세션 시작 시 **셸 스냅샷**(`~/.claude/shell-snapshots/snapshot-zsh-*.sh`)을 만들고 매 호출마다 `source` 한다. 그 안의 `export PATH='…'` 가 **`~/.bun/bin` 없이** 고정돼 있어서, zsh 시작 시 `~/.zshenv` 가 넣어준 prepend 를 **덮어쓴다**(증거: `BUN_INSTALL` 은 살아남고 PATH 만 유실 — 스냅샷은 PATH 만 명시 재설정). 결과로 `bun` 이 `/mnt/c/Users/…/Roaming/npm/bun`(**다른·구버전** 1.3.11)으로 잡히고, 그 bun 은 자식을 cmd.exe 로 띄워 `CMD.EXE was started with the above path` / `UNC paths are not supported` 로 죽는다.
  - **증상 구분**: 단일 `bun run check` 는 통과하는데 `bun run quality:all` 만 "command not found: biome" 로 죽으면 이것이다 — `quality:all` 스크립트 문자열이 **중첩 `bun run`** 을 부르고, 그 중첩 `bun` 만 PATH 로 해석되기 때문. "게이트 FAIL" 이 코드가 아니라 환경 때문인 전형적 **가짜 빨간불**.
  - **세션 내 workaround**: `env PATH="$HOME/.bun/bin:$PATH" bun run <script>`.
  - **영구 수정(오너 1줄, sudo 필요)**: `sudo ln -sf ~/.bun/bin/bun /usr/local/bin/bun` — `/usr/local/bin` 은 스냅샷 PATH **2번째**라 `/mnt/c` shim(37번째)을 항상 이긴다. 스냅샷 재생성과 무관하게 영구.
  - **코드 측 근본 수정(완료)**: 우리 스크립트의 자식 spawn 은 더 이상 PATH 를 신뢰하지 않는다 — `scripts/lib/bun-exec.ts` / `scripts/hooks/_lib.ts` 의 `bunExec()`(= `process.execPath`, "나를 실행 중인 bun 과 같은 bun")을 쓴다. `bunx foo` = `bun x foo`. 회귀 테스트 `scripts/__tests__/bun-exec.test.ts`.
