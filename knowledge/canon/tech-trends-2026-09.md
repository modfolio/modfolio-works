---
title: Tech Trends 2026-09 — 현행화 판단 (Claude Code 2.1.257~261 · 스택 실물 · 적응형 currency 루프)
version: 1.2.0
last_updated: 2026-09-06
source: [code.claude.com/docs/en/settings (2.1.257 scope-aware defaultMode · modelSettings, 2026-09-06 실측), code.claude.com/docs/en/sub-agents + skills (frontmatter 필드 목록), registry.npmjs.org dist-tags 2026-09-06 (typescript 7.0.2 · biome 2.5.12 · wrangler 4.129.0 · vitest 5.0.0 · zod 4.5.4 · astro 7.3.1 · @astrojs/cloudflare 14.3.0 · drizzle-orm 0.45.2 / rc 1.0.0-rc.4 · @sveltejs/kit 2.70.3 / next 3.0.0-next.25), github.com/oven-sh/bun/releases (bun-v1.4.2 2026-09-05), github.com/colinhacks/zod/releases/tag/v4.5.0 (z.iso.datetime requires seconds · code-point length), docs.astro.build upgrade-to/v6·v7 + integrations-guide/cloudflare (locals.runtime 제거 · cloudflare:workers env · cfContext), github.com/better-auth/better-auth/releases (v1.7.0 Account.issuer · signIn.social), 허브 실측 (verify:stack-currency v3 fleet 179 위반 · currency:probe 2026-09-06), Writ lane 4건 (dle-desk 416f9be/82506db · naviaca 35ba881 · modfolio-admin 8d77a1c · muje 7895aa3)]
sync_to_siblings: true
applicability: always
consumers: [harness-evolve, preflight, modfolio, innovation-scout]
---

# Tech Trends 2026-09 — 현행화 판단

> 이 문서는 **권고**다(Hub-not-enforcer). 채택·시기는 각 repo 자율. 형식은 `evolve:retrospect` 가 읽는 H2 규약
> (`## Adopt P0` · `## Trial P1` 은 `### N. 항목`, `## Trial P2` · `## Skip` 은 표)이다 — 2026-04/06/07/08 이 이 규약을
> 벗어나 넉 달간 0건으로 읽혔다(2026-09-06 파서 보강으로 104건 복구). 다음 달부터 **이 형식을 지킨다.**
>
> 오너 결정(2026-09-06 원문): *"Fable 5.1을 기본으로 하고 싶긴한데 사용량이 제한되어 있어서... 1주 사용 한도에서 run out
> 하는 일이 없는 선상에서"* · *"subscription 사용량 이상으로 claude 에 한해서는 돈을 더 쓰고싶지 않은데"* · *"cron 같은
> 거로 기계적으로 하는 게 아니라 스마트하게 알아서 판단해서"*.

## Adopt P0

### 1. Claude Code ≥2.1.257 설정 의미론 — `permissions.defaultMode` 는 user/managed/CLI 스코프

project/local `.claude/settings.json` 의 `bypassPermissions`·`auto` 는 **무시된다**(settings-reference 원문). 허브가 32 repo 에
심던 값은 효과 없는 선언이었다. 운반체 = `~/.claude/settings.json` 또는 `claude --permission-mode bypassPermissions`.
`harness-pull` 이 멤버 잔재를 걷어낸다(`settings-adapt` · 노트 출력). 게이트 `verify:claude-code-currency`.

### 2. agent/skill frontmatter 는 문서 필드만 — `cache_control`·`allowedTools`·`Task` 는 no-op

24 agent 의 `cache_control:`(문서에 없음), `allowedTools:`(문서 필드는 `tools:`), `Task` 도구 참조(→ `Agent`) 를 걷어냈다.
캐시 TTL 은 `ENABLE_PROMPT_CACHING_1H` env + `promptCacheTtl/subagentPromptCacheTtl`(2.1.243) 로. 오너 게이트 스킬은
`disable-model-invocation: true`. `context: fork` 스킬은 `model:` 명시(Fable 메인이면 2× 단가로 fork 된다).

### 3. Bun 1.4.2 · Biome 2.5.12 · wrangler 4.129 + workers-types v5 단일 — 08월 Hold 해제

허브 `engines.bun ">=1.3.0 <1.4.0"` 이 설치된 1.4.0 을 배제하고 있었다(자기 런타임 배제) → `>=1.3.0`. Biome 2.5.12 는
export 정렬을 더 엄하게 본다(dle-desk 1건 자동 수정). workers-types v4/v5 를 둘 다 가진 repo 가 7 이었다 — 직접 선언은 v5 로.

### 4. `@modfolio/contracts` 1.28.0 · `connect-sdk` 10.7.0 — harness-pull 리포트 INFO 가 채널

23 repo 가 contracts 1.23.0 이었다. 의견서 23장 대신 pull 리포트의 `Contracts 차이` 한 줄(`PullFeedback.contractsVersion`).

### 5. 적응형 currency 루프 — cron 0 · 판단은 오너가 연다

`SessionStart` 펄스 ⑤(0 토큰) → `bun run currency:probe`($0 · 20h 스로틀 · ETag) → `bun run currency:judge`
(`currency:budget --reserve` 통과 시만 · 단일 Sonnet 정찰자 · 입력 = `currency-delta.md`) → tech-trends + skip-registry
`probe:` 트리거. 미터는 **주간 subscription 여유**(`config/currency-budget.json` · 관측 최대 주 대비 비율).

### 6. 배포 전 런타임 프로브 — Astro/Workers 앱은 `astro preview`(workerd) 로 한 번 친다

`@astrojs/cloudflare` 13+ 는 `locals.runtime` 을 **제거**했고(`env` → `import { env } from 'cloudflare:workers'` ·
`ctx` → `locals.cfContext`) 앱의 자체 `App.Locals` 선언이 타입 검사를 가린다. check·lint·test·build·dry-run 다섯 게이트가
초록인 채 프로덕션 `/api/*` 가 500 이었다(dle-desk 2026-09-06). **런타임 프로브가 유일한 검출기**다 — `predeploy` 로.

## Trial P1

### 1. Astro 7.3 + `@astrojs/cloudflare` 14.3 (+ `@astrojs/svelte` 9)

dle-desk·muje 가 5→7 을 넘었다. 체크리스트: `wrangler main = "@astrojs/cloudflare/entrypoints/server"` · `platformProxy` 제거 ·
`locals.runtime.*` 전량 이관 · `imageService` 기본이 `cloudflare-binding`(astro:assets 안 쓰면 무관) · `astro dev` 가 workerd.
⚠ **7.3.1 + 14.3.0 쌍의 `astro dev` 는 브라우저 동시 요청에서 빈 문서를 낸다**(pay 랜딩 Playwright 128 테스트 중 34~51 · 기준선 7.2.0/14.2.0 은 128/128 ·
2026-09-06 실측 · 원인 분리는 쌍까지). 프로덕션 워커·prerender 랜딩은 영향 미확인. `astro dev` 를 브라우저로 두드리는 repo 는 skip-registry #14 의
probe(`pkg:astro>7.3.1` · `pkg:@astrojs/cloudflare>14.3.0`)가 뜰 때까지 7.2/14.2 에 둔다.
Vite 8 · Rust 컴파일러(HTML 검증 엄격) · `src/fetch.ts` 예약.

### 2. TypeScript 7.0.2 (tsgo) — 허브·loom 은 7, `@astrojs/check` 소비자는 6

`@astrojs/check@0.9.10` 의 peer 가 `^5||^6` 이라 Astro 앱은 TS6 에 묶인다(허브 dashboard 예외 등록 · 재검토 2026-11-06).
플릿 floor 는 6(naviaca 의 5.9 잔재 해소). `erasableSyntaxOnly: true` 는 허브 tsconfig 에 켰다 — parameter property 6건이 전부였다.

### 3. `probe:` 트리거 — skip-registry 의 재평가 조건을 기계 문법으로

`- probe: cc>=2.2.0` · `pkg:wrangler>=5` · `tag:next>=3.0.0`. 사람 문장은 그대로 두고 옆에 한 줄. `currency:probe` 가 잰다.

### 4. zod v3 직접 선언 → v4.4 (4.5 는 Hold 그대로) — 레인 실측 레시피

`z.number/z.string/z.boolean/z.object/z.infer` 만 쓰는 패키지(naviaca booking-slots · modfolio-admin experiment-assign · muje rpa-plan)는
`^3.25` → `^4.4.3` 으로 무변경 통과했다. contracts 처럼 `.datetime()` 을 쓰는 곳만 4.5 Hold 의 대상이다. 플릿의 v3 직접 선언 11 repo 는
이 레시피로(각 repo 판단 · dual 해소).

## Trial P2

| 항목 | 상태 | 조건 · 근거 |
|---|---|---|
| Vitest 5.0.0 | Watch | `@cloudflare/vitest-pool-workers` 가 peer `^5` 를 받을 때. 지금은 4.1.11 (dle-desk) |
| SvelteKit 3 (next 3.0.0-next.25) | Watch | latest 태그에 오르고 codemod 가 나올 때 |
| drizzle 1.0 (rc.4) | Watch | `pkg:drizzle-orm>=1` 트리거 — pdgd 만 rc 선행(의도) |
| Zod 4.5.4 | Hold | `z.iso.datetime()` 이 초(秒)를 요구 · 코드포인트 길이 — contracts 의 `.datetime()` 28건이 수용 범위를 바꾼다. `schema-impact` + 발신자 실측 뒤 |
| better-auth 1.7 | Hold · `probe: pkg:better-auth>=1.7.3` | 1.7.0~1.7.2 는 `Account.issuer` NOT NULL + 백필이 필요하고 **1.7.3 이 그 요구를 없앤다**(1차 출처 1-7-upgrade-guide.mdx). 1.7.3 부터 클라이언트 API 만 바꾼다(`genericOAuthClient` 제거 · `signIn.social`). skip-registry #13 |
| `modelSettings`(모델별 effort) | Watch | `/effort` 가 쓰는 숫자 인코딩 · 미문서 → 손으로 쓰지 않는다 |
| `skillOverrides` · `skillListingBudgetFraction` | Watch | 스키마 1차 출처 확인 뒤. 스킬 정리는 `disable-model-invocation` 27개로 먼저 |
| TS 7.1 compiler API | Watch | 7.1 stable 시 `ts7:ready` 재실행 |
| `--permission-prompts none` (2.1.259) | Watch · `probe: cc>=2.1.259` | 무인 pod 세션의 프롬프트를 자동 거부. 이 박스는 2.1.258 이라 플래그가 없다 — skip-registry #12 |
| `managedMcpServers` (2.1.259) | Watch | universe-internal MCP 5종을 managed 로 옮길지는 lethal-trifecta allowlist 재검토 뒤 |

## Skip

| 항목 | 이유 | 재검토 |
|---|---|---|
| Fable 5.1 로 코딩형 상향 | rule (e) 유지 — 수치 없이 규칙을 뒤집지 않는다. 재측정은 오너 시작(pdgd `metrics/fable-5-1-day0/` + `model-usage-report --all-projects` + `.evolve-state/model-switch.jsonl`) | 2026-09-09 |
| 월 1회 cron `/evolve` | cron 은 2026-07-09 에 은퇴 · 오너 제약과 정면 충돌 — currency 루프가 대체 | — |
| `asyncRewake` 훅 | 요청 없는 모델 턴 + 매 세션 잔소리 — 펄스가 같은 줄을 준다 | `local<stable` 일 때만 재검토 |
| Qwik 2 (`@qwik.dev/core` 2.0.0-beta) | 프리릴리즈 — modfolio-admin 은 1.20 | latest 가 2.x 일 때 |
| `athsra run … -- wrangler deploy --env X` | env 가 사라졌다(가설 · 프로덕션 배포 실사건) — `-e X` 또는 `WRANGLER_ENV` | athsra 대조 실험 뒤 |

## Proposals (not applied)

- `@modfolio/placement` 가 TS 소스를 게시한다(`exports: ./src/index.ts`) — Nitro 소비자(naviaca)가 깨졌다. dist 게시로(dle-desk 의견서).
  허브 게이트 후보: 게시된 `@modfolio/*` 의 `exports` 가 `.ts` 면 finding.
- `harnessClaudeCodeVersion: "latest"` 는 잣대가 아니다 — `bun run currency:record` 가 실측 semver 로 바꾼다(`/release` 앞 단계 · 오너 트리거).
- Writ 규약에 «배포 제외» 명문화(`orbit.md`) — Writ 는 repo 쓰기 위임이지 배포 위임이 아니다.

## 판단 기록 — `currency:judge` 2026-09-06 (v1.1.0)

첫 실행: `currency:budget --reserve` 통과(여유 61%) → Phase 1/2 → 정찰자(Sonnet 5 · 10 후보 · $0) → synthesize(Trial P2 3 · 나머지는
URL/중복 필터). 결정: A 의 `--permission-prompts none` 은 로컬 버전 미달 → skip-registry #12(probe 트리거) · B 의 zod v3 직접 선언은
위 Trial P1 #4 레시피 · C 2건은 레지스트리에서 이미 해소. 정찰자의 «허브 node_modules 가 뒤처짐» 후보는 `.bun/` 잔재를 읽은
오독이라 제외(`verify:stack-currency:self` 0 이 반증). 정찰자에게 Write 도구가 없어 출력 파일을 메인이 대신 썼다 → 수정.

## 재평가 trigger

- `currency:probe` 가 `bun run currency:judge` 를 권하면(펄스 ⑤) — 오너가 연다. 이 문서의 다음 판은 그 판단의 산출물이다.
- probe 트리거: `pkg:vitest>=5` 가 pool-workers peer 와 함께 · `tag:next` SvelteKit 3 stable · `pkg:drizzle-orm>=1`.
