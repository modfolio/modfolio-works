# Modfolio Universe — Global Knowledge

> 이 파일은 모든 modfolio 프로젝트에 동기화된다. 수정은 modfolio-universe에서만.
> 상세 정보는 각 skill을 호출할 것.

## 생태계 개요

**Modfolio Universe**는 15개 이상의 앱으로 구성된 SaaS 생태계. 각 앱은 독립 브랜드로 운영되며, 공통 인프라(SSO, 이벤트, 결제)를 공유.

- **조직**: github.com/modfolio
- **플랫폼**: 100% Cloudflare Edge Native (Workers + D1 + R2)
- **런타임**: Bun | **언어**: TypeScript (strict) | **린터**: Biome v2

## 3대 불변 원칙

1. **House of Brands** — 앱 간 UI 라이브러리 공유 금지. 각 앱은 독립 디자인 시스템 + 독립 기술 스택. 각 앱은 Brand Passport (`docs/brand-passport.md`)에 디자인 결정의 근거를 기록.
2. **Zero Physical Sharing** — 코드 공유는 SSO 토큰 / 데이터 스키마(`@modfolio/contracts`) / Webhook API로만.
3. **100% Cloudflare Edge Native** — Vercel, AWS, GCP 배제. CF Workers만.
4. **디자인 다양성** — 구조(토큰 명명, cascade layer, 접근성)만 공유한다. 색상값, 그림자, 모션, 타이포그래피, 레이아웃의 실제 값은 각 앱이 Brand Passport에 따라 자유롭게 결정한다.

## 도메인 아키텍처 (2-프로젝트 모델)

각 브랜드는 두 개의 독립 프로젝트로 분리:
- `domain.com` = 앱 (SvelteKit / SolidStart 등)
- `www.domain.com` = 랜딩 (Astro)

**entryMode**: `app-first` (앱 홈 직접) 또는 `landing-first` (302 redirect).
**인프라 앱**: 서브도메인 모델 (`*.modfolio.io`).

## 기술 스택 요약

**프레임워크**: SvelteKit 5 | SolidStart | Astro | Hono | Qwik | Nuxt 3
**DB**: Neon Postgres | D1 | Turso | R2 | Durable Objects | Upstash Redis

앱별 상세 스택: `ecosystem.json` 또는 `/ecosystem` skill 참조.

## 유니버설 서비스

| 서비스 | 역할 | 프레임워크 |
|--------|------|-----------|
| modfolio-connect | SSO/OIDC (login.modfolio.io) | SvelteKit 5 + Better Auth |
| modfolio-pay | 결제 게이트웨이 | SvelteKit 5 |

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
- **CF 배포**: Workers Builds (GitHub 연동). Pages → Workers 마이그레이션 완료. 상세: `/deploy`
- **시크릿**: 프로젝트별 관리. Doppler 또는 CF Workers Secrets 중 런타임에 맞는 방식을 사용. 상세: `/ops` skill
