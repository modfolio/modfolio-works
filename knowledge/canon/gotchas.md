---
title: Gotchas & Lessons Learned
version: 1.6.0
last_updated: 2026-07-28
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
- **워크스페이스 항목은 glob 이지 부모 폴더가 아니다** (2026-07-26 실측). `"apps/*"` = "apps 의 자식들", `"sdk"` = "**sdk 자신이 패키지**". 둘을 같게 다뤄 `pattern.replace(/\/?\*.*$/,'')` 로 뭉개면 리터럴 항목의 `package.json` 을 영영 안 연다 — modfolio-connect 의 `["apps/*","packages/*","sdk"]` 에서 **`@modfolio/connect-sdk` 가 hub 미러·멤버 `## 이 repo 실측` 표 양쪽에서 통째로 누락**돼 있었다(미러엔 connect 패키지 10개가 있었는데 정작 유니버스 최다소비 SDK 만 없었다). 수집되지 않는 사실은 그 사실의 주인(repo)이 정정할 수도 없다 → `expandWorkspacePattern()` (harness 3.28.0)

## npm 버전 조회 — scoped 패키지는 `--registry` 를 무시한다 (2026-07-26 실측)
- `npm show @scope/pkg version --registry=<X>` 의 **`--registry` 가 먹지 않는다.** scoped 패키지는 `.npmrc` 의 `@scope:registry` 라인이 lookup 을 가져간다. 실측: registry 3곳(npmjs·pkg.modfolio.io·GitHub Packages)을 각각 지정한 세 호출이 **전부 같은 값 `8.3.0`** 을 답했고, 실제 packument 는 pkg `9.3.0` · npmjs `9.3.0` · GitHub `8.3.0` 이었다.
- **왜 위험한가**: "게시됐나?" 확인이 조용히 **엉뚱한 레지스트리**를 읽는다. canonical 게시가 실패하고 백필만 성공한 상황에서 다음 실행이 `already-current` 로 판정하면 **canonical 게시를 영영 건너뛴다**(pkg 를 canonical 로 만든 목적 자체가 무효화). `scripts/lib/pkg-publish.ts` 에서 실제로 그 상태였다.
- **처방**: packument 를 HTTP 로 직접 받는다 — `curl -s https://registry.npmjs.org/@scope%2fpkg | jq -r '."dist-tags".latest'` (스코프 `/` 는 `%2f`). 레지스트리를 바꾸려면 URL 을 바꾼다. CLI 플래그를 믿지 않는다.
- 같은 함정의 과거 발현: 2026-06-23 "connect-sdk 미발행" 오진, 2026-07-04 8.3.0 오보 — 셋 다 원인이 동일하다.
- **⚠ 2026-07-27 — 처방이 절반만 적용돼 있었다**: `fetchPkgVersion`(pkg 쪽)만 HTTP packument 로 고쳤고 **GitHub 쪽 `fetchGithubVersion`·contracts 백필 체크는 `npm show --registry=` 그대로**였다. 실측: `npm show @modfolio/contracts --registry=<GitHub>` → **1.18.0**(= root `.npmrc` scope 인 pkg 값), GitHub 실제 = **1.17.0**. `contracts-publish` 가 그 값으로 "이미 최신 — skip" 을 찍어 **백필이 한 번도 시도되지 않았고 비상 미러가 한 버전 뒤에서 얼어 있었다**(에러 0). 이 canon 이 예고한 실패 모드가 **거울 방향으로** 실현된 것.
- **교훈**: 함정을 적어두는 것으로 끝나지 않는다. **그 함정을 쓰는 모든 호출부를 세어서 전부 고쳤는지 확인**해야 한다. 처방이 한 곳에만 적용되면 나머지는 "canon 에 적혀 있으니 괜찮다"는 착각 아래 남는다. 현행 잠금 = `pkg-publish-auth.test.ts` 의 grep-level 검사(양 publish 스크립트에 `--registry=`·`npm show` 금지, 음성 대조 확인).

## npm `_authToken` 키는 **슬래시로 끝나야 한다** (nerf dart, 2026-07-27 실측)
- npm 은 자격증명을 `//host/path/:_authToken=…` 형태("nerf dart")로 매칭하고, **콜론 앞이 슬래시로 끝나야** 한다. `//npm.pkg.github.com:_authToken=…` 는 **매칭되지 않아** 유효한 토큰이 있어도 `ENEEDAUTH` 가 난다.
- **왜 안 걸렸나**: 키를 `registry.replace(/^https?:/, '')` 로 만들면 **레지스트리 URL 이 우연히 `/` 로 끝나는 경우에만** 올바른 키가 나온다. canonical(`…/npm/`)은 끝나고 GitHub Packages(`https://npm.pkg.github.com`)는 안 끝난다 → **백필만 매 릴리즈 실패**. 레지스트리 URL 의 우연한 모양에 의존하는 설정은 설정이 아니라 운이다.
- **두 버그가 서로를 가렸다**: 실패 detail 이 `output.slice(0, 800)` 이었는데 npm 은 **에러보다 먼저** tarball 매니페스트를 `npm notice` 로 전부 찍는다(이 패키지 ~200 파일). 800자 예산을 파일 목록이 다 써서 **이유가 한 번도 표시된 적이 없다.** 백필 실패는 (의도대로) 한 줄 warn 이라 **비상 스위치가 조용히 stale** 이 됐다.
- **처방**: 키 생성은 `authKeyFor()`(`scripts/lib/pkg-publish.ts`) — 스킴 제거 + 후행 슬래시 정규화. 실패 출력은 `publishFailureDetail()` — `npm notice` 줄 제거 후 **tail** 보존(npm 은 에러를 마지막에 찍는다). 회귀 잠금 = `scripts/__tests__/pkg-publish-auth.test.ts`.
- **일반 교훈**: 비치명(warn) 경로일수록 **실패 이유가 보이는지**를 따로 확인해야 한다. 치명 경로는 멈추니까 눈에 띄지만, warn 은 이유가 잘려도 아무도 모른다.

## h3 / Nuxt — `statusMessage` 는 **비-ASCII 를 지운다** (2026-07-27, atelier 실측)

`statusMessage` 는 HTTP 상태 라인에 실리는 값이라 h3 가 살균한다(헤더 인젝션 방지 — 그 살균은
옳다). 그래서 **한글이 통째로 사라진다**:

```
"같은 모듈을 중복해 담을 수 없습니다."          →  "     ."
"AI 학습 디자이너가 아직 설정되지 않았습니다."  →  "AI     ."
```

로그 노이즈가 아니었다 — ANF 의 `/admin/catalog` 계열 6곳이 `err?.data?.statusMessage` 를 그대로
렌더해서 **오너가 안내 문구 대신 `"     ."` 을 보고 있었다**(15건·10파일).

**정공법**: 우회하지 말고 h3 권고대로 산문을 `message` 로 옮긴다(본문 전용이라 살균 대상 아님).
`message` 만 주면 `statusMessage` 는 응답에 아예 안 실리므로,
`data.statusMessage ?? … ?? data.message` 폴백을 쓰는 UI 는 자연히 message 로 내려온다.

한국어 UI 를 쓰는 repo 는 전부 해당 가능 — 확인:

```bash
rg -n 'statusMessage:\s*"[^"]*[가-힣]' <server-dir> --glob '!*.test.ts'
```

## Svelte 5 — keyed `{#each}` 키를 문자열 `+` 로 합성하지 않는다 (2026-07-27, pay 실측)

pay 대시보드가 `{#each}` 키를 `title + sub + time`(전부 **화면 표시 문자열**)로 만들고 있었다.
같은 상품·같은 결제수단·같은 상대시각 2건이면 `each_key_duplicate` 가 던져지고 **목록이 통째로
사라진다.**

⚠ **dev 전용 경고가 아니다** — Svelte 5.56.8 `internal/client/dom/blocks/each.js:351-357` 은
DEV 가 아닐 때 진단 정보만 빼고 `e.each_key_duplicate('', '', '')` 를 **그대로 던진다.**
프로덕션 결함이다. 게이트 22/22 는 초록이었고 에러는 dev 서버 로그에만 찍혔다.

규칙: **키에 구분자 없는 문자열 연결 금지.** `"a"+"bc" === "ab"+"c"` 라 조각이 달라도 키가 같아질
수 있다. 합성이 필요하면 구분자를 낀 템플릿 리터럴을 쓴다. 더 근본적으로는 **표시용 필드를 키로
쓰지 않는다** — pay 의 키는 PG 식별자 덕에 *우연히* 고유했고, "고객에게 키 노출 금지"라는
**정당한 변경**이 그 고유성을 조용히 깼다.

## Playwright — 마스크 셀렉터가 0개를 잡으면 **조용히 무력화**된다 (2026-07-27, pay 실측)

`mask` 에 준 셀렉터가 아무 요소도 매칭하지 않으면 마스킹이 그냥 안 되고 스크린샷은 계속 초록이다가
어느 날 갑자기 깨진다. **셀렉터가 실제 요소를 잡는지 확인하는 테스트를 같이 둔다.**

관련: 시각 회귀에서 결정론을 깨는 건 데이터보다 **시각**인 경우가 많다(`input[type=date]` 가 오늘로
초기화 · 롤링 30일 창). 서버 계산이면 `clock.install()`(브라우저 시계)로도 못 고정하므로 **시간
파생 영역만 마스킹**한다 — 데이터에서 오는 변동은 가리지 않는다(그건 봐야 하는 신호다).

## `vite dev` 콜드 실행이 브라우저 게이트를 흔든다 (2026-07-27, pay 실측)

콜드 실행 중 의존성 최적화가 새 의존성을 발견하면 **전체 리로드**를 일으킨다. 스캔·촬영 도중이면
`Execution context was destroyed, most likely because of a navigation` 로 죽거나 반쯤 그려진 화면이
찍힌다. **앱 코드와 무관하다.**

`retries` 로 덮으면 진짜 실패까지 덮인다 → globalSetup 에서 라우트를 한 번씩 방문해 예열한다.
실측(pay a11y 26 테스트): 예열 전 첫 테스트 45.1s·1 failed → 예열(31s) 후 첫 테스트 4.1s,
전 테스트 3~8s 균일, 26 passed. **총 시간은 비슷한데 변동이 사라진다** — 플레이크의 원인이 그 변동.

## 파일 제외를 suffix 매칭으로 하면 이웃 파일을 함께 지운다 (2026-07-27, pay 실측)

발신 정합 스윕의 제외 조건이 `!f.endsWith("events.ts")` 라 의도한 `events.ts` 말고
`credit-events.ts` 까지 걷어냈다 — **11개 발신 지점이 무검사**였다(해제 시점 라이브 버그는 없었다).
경로 제외는 정확한 경로나 앵커된 패턴으로 한다.

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

## Astro 7 — 에이전트 세션에서 `astro dev` 가 데몬화된다 (2026-07-26, connect 실측)

**fleet 공통 · landing 계열 전부 해당.** Astro 7.0+ 는 **AI 코딩 에이전트를 감지하면
`astro dev` 를 detached 백그라운드 프로세스로 전환**한다(공식 "Background mode"). 부모는
서버 정보를 찍고 **즉시 exit 0** 한다.

- **증상**: Playwright `webServer` 로 `astro dev` 를 띄우는 e2e 가 스펙 하나도 못 돌고
  `Process from config.webServer exited early` 로 전체 실패. 포트는 **LISTEN 하는데 응답은
  안 하는** 좀비가 점유(HTTP 000) → **"포트 충돌"로 오진하기 쉽다.**
- **왜 오래 숨나**: **사람이 터미널에서 돌리면 재현되지 않는다**(휴리스틱 미발동). connect 에서
  07-22 → 07-26 나흘간 "포트 점유로 e2e 미실행"이라는 **틀린 이월 사유**로 남아 있었다.
- **해법 — 러너 경계에서만 끈다**:
  ```ts
  // playwright.config.ts
  { command: 'bun run --cwd apps/landing dev:local -- --port 4321',
    port: 4321,
    env: { ASTRO_DEV_BACKGROUND: '0' } }   // ← 이 한 줄
  ```
  대화형 `dev:local` 의 백그라운드 모드는 실제 편의이므로 **끄지 않는다.** 잔재는 `astro dev stop`.
- **일반 규칙**: 테스트 러너가 **프로세스를 소유한다고 전제**하는 곳(Playwright `webServer`, CI
  래퍼)에서는 dev 서버의 자동 백그라운드화를 명시적으로 비활성화한다. "포트는 LISTEN 인데 HTTP 가
  안 온다"는 **점유 문제가 아니라 소유권 문제**의 지문이다.

## Adobe Fonts — CJK 는 CSS 임베드로 못 쓴다 (2026-07-26, connect 실측)

**한글 폰트를 Adobe kit 에 넣어도 한글이 렌더링되지 않는다.** connect 가 실제로 겪었고, kit
API·CSS 로드·네트워크 200 등 **모든 지표가 정상으로 보이는데** 실제 페인트는 리눅스 기본
중국어 글꼴(`WenQuanYi Zen Hei`)이었다.

- **권고**: 한글(및 CJK) 웹폰트는 **self-host** — 예: `@fontsource-variable/noto-serif-kr`.
- **kit 라이프사이클은 스크립트로 전부 가능**하되 **`font-display` 만 API 표면에 없다**(6각도 실증).
- **검증 지표 주의**: CSS 200·kit 에 face 존재·네트워크 요청 성공은 **한글이 실제로 그려지는지를
  증명하지 않는다.** 실제 페인트 폰트를 확인해야 한다.

## `pgrep -f <패턴>` 으로 백그라운드 작업을 기다리면 **감시자가 자기를 센다** (2026-07-28 실측)

에이전트가 긴 작업을 띄우고 기다릴 때 흔히 쓰는 형태:

```sh
until ! pgrep -f ingest-rag >/dev/null; do sleep 60; done; echo DONE
```

**이 루프는 끝나지 않는다.** `pgrep -f` 는 **전체 명령줄**을 매칭하는데, 그 명령줄 안에
`ingest-rag` 문자열이 들어 있는 프로세스가 바로 **이 감시 루프 자신**이다. 대상이 30분 전에
끝났어도 감시자는 자기를 보고 "아직 돈다" 고 판단한다.

실측(이 저장소, 2026-07-28): 색인이 `완료 — ingested/replaced 41 · error 0` 으로 끝난 뒤에도
감시가 27분 더 "RUNNING" 을 보고했고, 로그 꼬리를 직접 읽고서야 드러났다. **두 개의 감시가
같은 방식으로 걸려 있었고 둘 다 타임아웃으로만 끝났다.**

**대신 쓸 것** — 우선순위대로:

1. **작업의 산출물을 본다** — 로그에 찍히는 완료 문자열이나 종료 코드.
   `until grep -q "^완료 —" run.log; do sleep 30; done` — 자기를 매칭할 수 없다.
2. **pid 를 잡아 둔다** — `kill -0 <pid>` 는 문자열이 아니라 프로세스를 본다.
3. 굳이 pgrep 을 쓴다면 자기 제외: `pgrep -f 'pattern' | grep -v $$` 는 셸 래퍼까지는
   못 걸러낸다. 1·2 를 먼저 고려하라.

일반형: **관측 도구가 관측 대상 집합에 자기를 포함시키면, 그 도구는 자기 존재를 신호로
읽는다.** 같은 형태가 "스캐너가 자기 저장소를 스캔" 에서도 나온다 — `agent-evidence.md`
§초록불 참조.

## Biome `vcs.useIgnoreFile` 을 켜면 기존 `files.includes` 제외가 통째로 무효화된다 (2026-07-28, connect 실측)

**증상의 출발점**: 생성 산출물이 포매터와 싸운다. `harness-pull --apply` 가 쓰는
`.claude/harness-feedback/pull-manifest.json` 을 Biome 이 거부해 `check` 가 빨강 —
**gitignore 돼 있는데 Biome 은 gitignore 를 안 본다.**

그래서 `vcs.useIgnoreFile: true` 가 근본 해법처럼 보인다. **아니다** — Biome 2.5.5 실측:

```
vcs 블록 off : 검사 대상 1,383 파일
vcs 블록 on  : 검사 대상 8,563 파일   ← 기존 files.includes 제외가 통째로 무효
```

`.svelte-kit`·`test-results`·`.claude/hooks` 의 formatter-off 오버라이드까지 빨개진다.
아이디어가 그럴듯해 보여서 여러 repo 가 각자 시도할 만한 함정이라 fleet 에 공유한다.

**대신 쓰는 것 두 가지** (connect 채택):

- **쓰기 스크립트가 스스로 포맷까지** — `... --write <file> && biome check --write <file>`.
  생성 즉시 포맷하면 그 산출물이 다시는 게이트와 싸우지 않는다.
- 도구가 쓰는 경로는 **제외 목록에 명시**한다(gitignore 에 의존하지 않는다).

## 배포본이 "자기완결" 이라고 주석에 적혀 있어도 아니다 (2026-07-28, modfolio-infra 실측)

**vite SSR 은 `dependencies` 를 external 로 남긴다.** 번들에는 `import { z } from "zod"` 같은
bare specifier 가 그대로 남고, `build/` 만 컨테이너에 마운트하면 `node_modules` 가 없다.
그런데 **아무것도 실패하지 않는다** — Bun 이 런타임에 공개 npm 에서 auto-install 로 메꾼다
(infra 실측: 컨테이너 캐시에 `zod`·`aws4fetch`·`fast-xml-parser` 트리가 있었다).

세 가지가 동시에 깨진다:

- **배포한 것과 도는 것이 달라진다** — 번들에는 없는 코드가 실행된다.
- **부팅이 npm 가용성에 묶인다** — 레지스트리가 느리거나 죽으면 컨테이너가 못 뜬다.
- **번들에 남은 이름이면 무엇이든 끌어와 실행된다** — 공급망 표면이 조용히 열린다.

**판정 규칙**: *산출물에 상대경로·런타임 내장 외의 import 가 남아 있으면 자기완결이 아니다.*
번들에서 bare specifier 를 grep 하는 게이트를 배포 직전(복사 **전**)과 CI 양쪽에 건다 —
한쪽만 걸면 다른 경로로 나간 산출물이 검사되지 않는다. 처방은 그 의존을
`devDependencies` 로 옮겨 **번들에 넣는 것**(external 목록에서 빼는 것)이다.

**해당 범위**: build-only 산출물을 배포하는 fleet 앱 전부 — SvelteKit `adapter-node`,
Astro node adapter, vite SSR. CF Workers 배포는 번들이 단일 파일이라 이 형태가 아니다.

⚠ 같은 세션의 부수 발견: `cp` 기반 config sync 가 지우지 않아 **옛 해시 청크가 영구 누적**됐다
(2426 파일 vs 로컬 301). 동작은 멀쩡했지만 **디스크가 거짓말을 해서** 옛 청크를 읽고
"배포 미반영" 으로 오판했다 — 배포 잔재는 성능이 아니라 **진단**을 망가뜨린다.

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
- **`effortLevel: "max"` 가 안 먹는 것처럼 보이는 현상** (Issue #30726, #40093): **원인은 버그가 아니라 무효값일 가능성이 높다** — Claude Code 문서상 settings 파일의 `effortLevel` 은 `low|medium|high|xhigh` 만 받는다. `max` 와 `ultracode` 는 **세션 전용**(`/effort max`, `--effort`)이라 settings 에 적으면 무시된다. ⚠ **구 완화책이던 "frontmatter + env 이중 설정"은 철회됨** — env 는 최상위 우선순위라 전 subagent 의 보정된 frontmatter effort 를 덮어쓴다(정확히 우리가 피하려던 overthinking). 올바른 처방: settings 는 `xhigh`, `max` 는 `/effort max` 세션 토글, env 는 미설정. canon `opus-4-7-effort-policy.md` v2.0.0

## WSL 개발 워크스테이션

- **`networkingMode=mirrored` 금지 (2026-07-12)**: VS Code Remote-WSL **"freeze + 무한 reopen"의 원인** — MS 인정 버그(vscode-remote-release#9222/#10818/#11091, WSL#11184). mirrored 는 Windows/WSL 네임스페이스를 공유시켜 vscode-server localhost 연결을 깨뜨린다. 제거→NAT 복귀가 공식 해법(localhostForwarding 기본 ON 이라 Windows→WSL dev 서버 접속은 그대로). **재발 시 메모리를 의심하지 말고 `~/.vscode-server/data/logs/*/remoteagent.log` 부터**("The client has reconnected" 반복 = 이 버그). Windows 앱(Paper 등) localhost 접속은 게이트웨이 IP(`ip route list default`)로 — canon `design-tooling.md` §Paper.
- **/mnt/c 에 코드 금지**: 파일 생성 69배 느림(ext4 18ms vs 9p 1248ms, 500파일 실측). 코드는 항상 `~/code/`(ext4).
- **에이전트 셸의 `bun` 이 Windows shim 으로 해석됨 (2026-07-21 실측)**: Claude Code 의 Bash 도구는 세션 시작 시 **셸 스냅샷**(`~/.claude/shell-snapshots/snapshot-zsh-*.sh`)을 만들고 매 호출마다 `source` 한다. 그 안의 `export PATH='…'` 가 **`~/.bun/bin` 없이** 고정돼 있어서, zsh 시작 시 `~/.zshenv` 가 넣어준 prepend 를 **덮어쓴다**(증거: `BUN_INSTALL` 은 살아남고 PATH 만 유실 — 스냅샷은 PATH 만 명시 재설정). 결과로 `bun` 이 `/mnt/c/Users/…/Roaming/npm/bun`(**다른·구버전** 1.3.11)으로 잡히고, 그 bun 은 자식을 cmd.exe 로 띄워 `CMD.EXE was started with the above path` / `UNC paths are not supported` 로 죽는다.
  - **증상 구분**: 단일 `bun run check` 는 통과하는데 `bun run quality:all` 만 "command not found: biome" 로 죽으면 이것이다 — `quality:all` 스크립트 문자열이 **중첩 `bun run`** 을 부르고, 그 중첩 `bun` 만 PATH 로 해석되기 때문. "게이트 FAIL" 이 코드가 아니라 환경 때문인 전형적 **가짜 빨간불**.
  - **세션 내 workaround**: `env PATH="$HOME/.bun/bin:$PATH" bun run <script>`.
  - **영구 수정 — ✅ 적용 완료 (2026-07-27 19:21, 오너 실행)**: `sudo ln -sf ~/.bun/bin/bun /usr/local/bin/bun`. `/usr/local/bin` 은 스냅샷 PATH **2번째**라 `/mnt/c` shim(37번째)을 항상 이긴다. 스냅샷 재생성과 무관하게 영구. 실측: `/usr/local/bin/bun --version` → **1.3.14**(네이티브), 구 shim 1.3.11 은 그대로 있으나 더 이상 선택되지 않는다. **이 워크스테이션에서는 해소됐고, 다른 머신을 셋업할 때 같은 한 줄이 필요하다.**
  - **코드 측 근본 수정(완료)**: 우리 스크립트의 자식 spawn 은 더 이상 PATH 를 신뢰하지 않는다 — `scripts/lib/bun-exec.ts` / `scripts/hooks/_lib.ts` 의 `bunExec()`(= `process.execPath`, "나를 실행 중인 bun 과 같은 bun")을 쓴다. `bunx foo` = `bun x foo`. 회귀 테스트 `scripts/__tests__/bun-exec.test.ts`.
