# modfolio-ecosystem — Global Knowledge

> 이 파일은 모든 modfolio 프로젝트에 동기화된다. 수정은 modfolio-ecosystem에서만.
> 상세 정보는 각 skill을 호출할 것.
>
> ⚠ **아래 `SYNC_ESSENTIALS` 구간만 각 멤버 CLAUDE.md 로 들어간다** (`resolve.ts` 의
> `extractGlobalEssentials`). 구간 밖은 이 파일에만 남는다 — 멤버가 **매 세션 읽어야 하는
> 것**만 안에 둔다. 상한 60행, 초과·마커 부재는 **게이트 실패**(조용히 자르지 않는다).
> 예전에는 «앞 30행» 이라는 **위치**가 기준이어서, 위쪽에 문단 하나가 들어가는 것만으로
> 불변 원칙이 창 밖으로 밀려났다(2026-08-05 실측 — 게시 전 차단).

<!-- SYNC_ESSENTIALS_START -->
## 생태계 개요

**Modfolio 생태계**는 15개 이상의 앱으로 구성된 SaaS 생태계. 각 앱은 독립 브랜드로 운영되며, 공통 인프라(SSO, 이벤트, 결제)를 공유.

- **조직**: github.com/modfolio
- **플랫폼**: 100% Cloudflare Edge Native (Workers + D1 + R2)
- **런타임**: Bun | **언어**: TypeScript (strict) | **린터**: Biome v2

## 핵심 불변 원칙

1. **House of Brands** — 앱 간 UI 라이브러리 공유 금지. 각 앱은 독립 디자인 시스템 + 독립 기술 스택. 각 앱은 Brand Passport (`docs/brand-passport.md`)에 디자인 결정의 근거를 기록.
2. **Zero Physical Sharing** — 코드 공유는 SSO 토큰 / 데이터 스키마(`@modfolio/contracts`) / Webhook API로만.
3. **100% Cloudflare Edge Native** — Vercel, AWS, GCP 배제. CF Workers만.
4. **디자인 다양성** — 구조(토큰 명명, cascade layer, 접근성)만 공유한다. 색상값, 그림자, 모션, 타이포그래피, 레이아웃의 실제 값은 각 앱이 Brand Passport에 따라 자유롭게 결정한다.
5. **Hub-not-enforcer (강제 0, 절대 불변)** — modfolio-ecosystem 은 가이드/관제탑이지 강제자가 아니다. **사용자 건별 허가 전까지 다른 repo 를 직접 수정·commit·push 하지 않는다.** sibling 에 의견(피드백)은 주되 채택·실행 판단은 그 repo 자율. 어떤 환경·머신·도구에서든 불변. (`evergreen-principle.md`)

## 오너의 판단 성향 — `knowledge/voice/`

발화에서 축적된 말뭉치. 규약은 canon `owner-voice.md`. 충돌 시 **canon(실측) > voice(발화)** —
오너가 «그렇게 해» 라고 해도 실측이 반대면 그 사실을 말하고 진행한다.
⚠ 아래 하나는 **한쪽만 기억하면 매번 틀리므로** 인라인으로 둔다:

| 상황 | 행동 |
|---|---|
| **오너가 자리에 있다** | **적극적으로 묻는다.** 웹서치도 적극적으로 |
| **무인(밤샘·원격 모바일)** | **묻지 않는다.** 정공법으로 판단하고 근거를 기록에 남긴다 |

모드를 모르면 **먼저 확인한다.** 새 발화가 판단·선호·금지이면 `knowledge/voice/` 에 등재하되
**원문(quote) 없으면 등재하지 않는다** — quote 를 못 적는 항목은 관측이 아니라 추론이다.

## 도메인 아키텍처 (2-프로젝트 모델)

`domain.com` = 앱 · `www.domain.com` = 랜딩(Astro) · 인프라 앱 = 서브도메인(`*.modfolio.io`).
**entryMode** 현 default = **`landing-first`** (ADR-011, 2026-05-24). `app.<domain>` 사용 허용(sibling 자율 시점, §D2).
<!-- SYNC_ESSENTIALS_END -->

## 기술 스택 요약

**프레임워크**: SvelteKit 5 | SolidStart | Astro | Hono | Qwik | Nuxt 3
**DB**: Neon Postgres | D1 | Turso | R2 | Durable Objects | Upstash Redis

앱별 상세 스택: `ecosystem.json` 또는 `/ecosystem` skill 참조.

## 유니버설 서비스

| 서비스 | 역할 | 프레임워크 |
|--------|------|-----------|
| modfolio-connect | SSO/OIDC (login.modfolio.io) | SvelteKit 5 + Better Auth |
| modfolio-pay | 자체 결제·선불 크레딧 (자사 앱 공용, 제3자 PG 아님) | SvelteKit 5 |

SSO 연동 상세: `/sso-integrate` skill 참조.

## Pre-Work Protocol (필수)

> 코드 작성 전 반드시 실행.

### Step 0: 이력 확인
`memory/pattern-history.md`에서 ESCALATE 패턴 확인.

### Step 1: 작업 분류

| 강도 | 시그널 | 접근 |
|------|--------|------|
| Patch | "수정/fix/tweak" | 직접 수정, 스킬 선택적 |
| Enhance | "개선/improve/update" | 구조 유지 + 참조 스킬 로드 |
| Overhaul | "개편/redesign/from scratch" | 전체 파이프라인 + `/multi-review` |

### Step 2: 필수 스킬 로드

| 카테고리 | 필수 스킬 |
|----------|----------|
| UI/디자인 | `/design-tokens` + `/layout-patterns` |
| UI 컴포넌트 | `/design-tokens` + `/component` |
| 페이지 | `/layout-patterns` + `/page` |
| API | `/api` |
| 스키마/DB | `/schema` + `/drizzle-patterns` |
| SSO/인증 | `/sso-integrate` |
| 배포 | `/deploy` |
| 계약 | `/contracts` |
| 디자인 개편 | `/design` + `/design-tokens` + `/layout-patterns` |

### Step 3: 구현
스킬에서 로드된 제약 내에서 구현. `knowledge/canon/`에 정형화된 규칙이 있으면 반드시 참조.

## Workflow

- **Quality Gate** (필수): `bun run check && bun run typecheck` (커밋 전)
- **Git 안전**: `--force`, `--no-verify` 금지. 민감정보 커밋 금지
- **CF 배포**: CF Workers Builds (GitHub 연동 push-to-deploy, GHA 배포 금지, CF Free build quota 로 사실상 $0). Pages→Workers 이관 **진행 중**(완료 아님). 단일 SoT = `knowledge/canon/cf-deploy.md` 「확정」. 상세: `/deploy`
- **시크릿**: 프로젝트별 독립. **dev = athsra v3** (CF Worker R2 ciphertext + master phrase + Bearer token, canon `secret-store.md` v1.13+), **prod = CF Workers Secrets / Pages env / Secret Store** (네이티브 binding). Doppler/dotenvx 는 2026-05-02 폐기 (historical), 잔존 미전환 repo 만 일시 호환. 상세: `/ops` skill.
