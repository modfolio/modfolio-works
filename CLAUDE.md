<!-- ECOSYSTEM_START: auto-synced from modfolio-universe, do not edit -->

# Modfolio 생태계 컨텍스트

> 이 섹션은 modfolio-universe에서 자동 동기화됩니다. 직접 편집하지 마세요.
> 수정: `modfolio-universe/knowledge/` 디렉토리에서 하세요.

---

# Modfolio Universe — Global Knowledge

> 이 파일은 모든 modfolio 프로젝트의 CLAUDE.md에 자동 동기화된다.
> 수정은 modfolio-universe/knowledge/global.md에서만 할 것.

## 생태계 개요

**Modfolio Universe**는 15개 이상의 앱으로 구성된 SaaS 생태계다. 각 앱은 독립 브랜드로 운영되며, 공통 인프라(SSO, 이벤트, 결제)를 공유한다.

- **조직**: github.com/modfolio
- **플랫폼**: 100% Cloudflare Edge Native (Workers + Pages + D1 + R2)
- **런타임**: Bun
- **언어**: TypeScript (strict)
- **린터**: Biome v2

## 3대 불변 원칙

1. **House of Brands** — 앱 간 UI 라이브러리 공유 금지. 각 앱은 독립 디자인 시스템. **각 앱은 독립적인 기술 스택을 사용한다.**
2. **Zero Physical Sharing** — 코드 공유는 SSO 토큰 / 데이터 스키마(`@modfolio/contracts`) / Webhook API로만.
3. **100% Cloudflare Edge Native** — Vercel, AWS, GCP 배제. CF Pages + Workers만.

## 앱별 기술 스택 (2026-03-15 갱신)

### 인프라 앱

| 앱 | 프레임워크 | DB | 역할 |
|---|---|---|---|
| modfolio landing | Astro | - | 모회사 랜딩 |
| modfolio app | SvelteKit 5 | Neon (Postgres) | Data Hub |
| modfolio-admin | Qwik City | D1 | 어드민 패널 |
| modfolio-dev | SolidStart | D1 | 개발자 도구 & API 콘솔 |
| modfolio-on | SolidStart | Neon + Upstash Redis | 커뮤니티 |
| modfolio-press | SvelteKit 5 | Neon (Postgres) | 출판/매거진 커머스 |
| modfolio-docs | Astro + Starlight | - | 문서 사이트 |

### 유니버설 서비스

| 앱 | 프레임워크 | DB | 역할 |
|---|---|---|---|
| modfolio-connect | SvelteKit 5 + Better Auth | D1 | SSO/OIDC |
| modfolio-pay | SvelteKit 5 | Neon (Postgres) | 결제 게이트웨이 |

### 자회사 앱

| 앱 | 그룹 | 프레임워크 | DB | 역할 |
|---|---|---|---|---|
| Naviaca | Works | Nuxt 3 | Neon (Postgres) | 학원 CRM/LMS |
| GistCore | Works | SvelteKit 5 | Neon (Postgres + pgvector) | AI 스피킹 연습 |
| Fortiscribe | Works | SvelteKit 5 | Neon (Postgres + pgvector) | AI 작문 첨삭 |
| KeepNBuild | LS | SolidStart | Turso (libSQL) | 여행 설계 |
| Worthee | LS | SolidStart | Neon (Postgres) | 셀프 관리 |
| Amberstella | Axiom | SvelteKit 5 | D1 + Durable Objects | 실시간 셔틀 |
| Munseo | Studio | Hono (CF Workers) | D1 + R2 | 문서 변환 |
| Umbracast | Studio | Hono (CF Workers) | D1 + R2 | 오디오 변환 |
| Sincheong | Studio | SvelteKit 5 | Neon (Postgres) | 폼 빌더 |

### 프레임워크 분포 (7종)

| 프레임워크 | 앱 수 |
|---|---|
| SvelteKit 5 | 8 (modfolio app, modfolio-connect, modfolio-press app, modfolio-pay, GistCore, Fortiscribe, Amberstella, Sincheong) |
| SolidStart | 4 (modfolio-dev, modfolio-on, KeepNBuild, Worthee) |
| Astro | 3 (modfolio landing, press landing, docs) + 자회사 그룹 랜딩 3 + 각 앱 랜딩 |
| Hono (CF Workers) | 2 (Munseo, Umbracast) |
| Qwik City | 1 (modfolio-admin) |
| Nuxt 3 | 1 (Naviaca) |
| Qwik | 1 (Modfolio Axiom landing) |

### DB 분포 (6종)

| DB | 앱 수 |
|---|---|
| Neon (Postgres) | 9 (naviaca, gistcore, fortiscribe, modfolio app/on/press/pay, worthee, sincheong) |
| D1 | 6 (modfolio-connect, modfolio-admin/dev, amberstella, munseo, umbracast) |
| Turso (libSQL) | 1 (KeepNBuild) |
| R2 | 2 (Munseo, Umbracast) |
| Durable Objects | 1 (Amberstella) |
| Upstash Redis | 1 (modfolio-on) |

## 생태계 공통 패턴

프로덕션 검증된 공통 구현 패턴. 상세: 각 skill 참조.

| 패턴 | 사용 앱 | 핵심 | Skill |
|------|---------|------|-------|
| Adobe Fonts | 8+ | Typekit `fmh4fod` + Pretendard fallback + CLS metric overrides | `/typography` |
| Connect SDK Hook 합성 | 5+ | dbSetup → cors → rateLimit → auth composable handles | `/sso-integrate` |
| Drizzle ORM 규칙 | 5+ | app-prefix 테이블, nowCol/pk 헬퍼, snake_case SQL | `/drizzle-patterns` |
| Design Token 3-Tier | 4+ | primitives → semantic → accent, cascade layers, 8pt grid | `/design-tokens` |
| Outbox Event | 3+ | fire-and-forget publish, dedup key, 90일 보존 | `/contracts` |
| AI Model Router | 2 | multi-provider fallback, task routing, prompt caching | `/ai-patterns` |
| Resend Email | 2+ | HTML template builders, fire-and-forget | `/email-patterns` |
| Rate Limiting | 2+ | in-memory sliding window + D1-based distributed | — |
| Observability (OTLP) | 전체 | CF Automatic Tracing → SigNoz, wrangler.jsonc only, 벤더 SDK 금지 | `/observability` |
| Design Tooling | 전체 | Paper(양방향 이터레이션) + Figma(협업/공유). Code↔Paper는 MCP 직접, Code→Figma는 캡처 | `/design` |

CF Pages 규칙: `pages_build_output_dir` + `nodejs_compat` + wrangler.jsonc. 상세: `/deploy` skill.
Observability 규칙: CF Automatic Tracing + OTLP export → SigNoz. 벤더 SDK 금지. 상세: `/observability` skill.

## SSO 연동 가이드 (v5.1.0, 2026-03-17)

모든 앱의 인증은 **modfolio-connect**를 통한다.

### URL 구조

| 서비스 | URL | 역할 |
|--------|-----|------|
| Login UI | `https://login.modfolio.io` | OIDC 엔진 + 로그인/가입 화면 |
| Dashboard | `https://account.modfolio.io` | 유저 프로필/보안/조직 관리 |
| Landing | `https://connect.modfolio.io` | SaaS 랜딩 페이지 |
| OIDC Discovery | `https://login.modfolio.io/.well-known/openid-configuration` | 자동 설정 |

### 인증 플로우 (SDK가 자동 처리)

```
[1] 유저가 앱의 보호된 페이지 접근
      ↓
[2] SDK 미들웨어: 세션 쿠키 확인 → 없으면 prompt=none 시도 (silent SSO)
      ↓ (실패 시)
[3] login.modfolio.io/{clientId}로 리다이렉트 (PKCE S256)
      ↓
[4] 유저 로그인 (비밀번호/소셜/패스키/Magic Link)
      ↓
[5] 앱의 /auth/callback으로 리다이렉트 (authorization code)
      ↓
[6] SDK: code → /sso/token POST → access_token + refresh_token 발급
      ↓
[7] 세션 쿠키 설정 → 앱 진입
```

### SDK 설치 + 기본 연동

```bash
# .npmrc (GitHub Packages 인증)
echo "@modfolio:registry=https://npm.pkg.github.com" > .npmrc

# SDK 설치 (반드시 v5.1.0 이상)
bun add @modfolio/connect-sdk@^5.1.0
```

#### 프레임워크별 어댑터

| 프레임워크 | import | 함수 |
|-----------|--------|------|
| SvelteKit | `@modfolio/connect-sdk/sveltekit` | `createSvelteKitAuth(options)` |
| Astro | `@modfolio/connect-sdk/astro` | `createAstroAuth(options)` |
| SolidStart | `@modfolio/connect-sdk/solidstart` | `createSolidStartAuth(options)` |
| Qwik | `@modfolio/connect-sdk/qwik` | `createQwikAuth(options)` |
| Nuxt | `@modfolio/connect-sdk` | core 함수 직접 사용 |
| CAEP 수신 | `@modfolio/connect-sdk/ssf` | `createSSFReceiver(options)` |

#### SvelteKit 예시 (3개 파일)

```typescript
// src/lib/server/auth.ts
import { createSvelteKitAuth } from "@modfolio/connect-sdk/sveltekit";
export const auth = createSvelteKitAuth({
  clientId: "앱의-client-id",   // 예: "naviaca", "gistcore", "worthee"
  // connectUrl, loginUrl, issuer → 기본값 자동 (변경 불필요)
  // refreshTimeout: 3000       → 기본 3초 (변경 불필요)
});

// src/hooks.server.ts
import { auth } from "$lib/server/auth";
export const handle = auth.handle;

// src/routes/auth/login/+server.ts   → export const GET = auth.loginHandler;
// src/routes/auth/callback/+server.ts → export const GET = auth.callbackHandler;
// src/routes/auth/logout/+server.ts  → export const GET = auth.logoutHandler;
```

#### ConnectUser 타입 (JWT에서 추출)

```typescript
interface ConnectUser {
  id: string;           // UUID
  email: string;
  name: string;
  roles: string[];
  avatar?: string;
  orgs?: Array<{ id: string; slug: string; role: string }>;
  permissions?: string[];
  amr?: string[];       // pwd, otp, mfa, fed:kakao 등
  tenantId?: string;
  tenantDomain?: string;
}
```

### v4 → v5 마이그레이션 주의

**Breaking Change 1개만**: `tokens.token` → `tokens.access_token`
```diff
- const jwt = tokens.token;         // v4: deprecated 폴백 (v5에서 제거)
+ const jwt = tokens.access_token;  // v5: 유일한 필드
```

### CF Pages 환경변수

SDK를 처음 도입하는 앱의 CF Pages에 `NPM_TOKEN` 필요:
```bash
# ~/.npmrc에서 GitHub Packages 토큰 읽기
TOKEN=$(grep "npm.pkg.github.com/:_authToken=" ~/.npmrc | cut -d= -f2)
# CF Pages에 설정
npx wrangler pages secret put NPM_TOKEN --project-name={cf-project-name}
```

상세: `knowledge/projects/modfolio-connect.md` 또는 `.claude/skills/sso-integrate.md` 참조.

## Workflow: Dialogue-Driven Development

- **Planner**: docs/plan/ 작성 (Codex, ChatGPT, Gemini, Claude 등 어떤 AI든 가능)
- **Builder**: 코드 구현 + docs/review/ 작성 (Claude Code 주)
- **Reviewer**: review 읽고 판정 PASS/ITERATE/REDIRECT (어떤 AI든 가능)
- **Quality Gate** (필수): `bun run check && bun run typecheck`
- **Git 안전**: `--force`, `--no-verify` 금지. 민감정보 커밋 금지.

## 상세 정보 참조 (Skills)

상세 정보는 필요할 때 skill을 호출:

| Skill | 용도 |
|-------|------|
| `/sso-integrate` | SSO 연동 (client_id, OIDC 플로우, JWT 클레임) |
| `/deploy` | CF Pages 배포 (설정, 빌드 명령, API 토큰) |
| `/ecosystem` | 도메인 맵 (Landing/App 전체 테이블) |
| `/contracts` | 이벤트 계약 (Zod 스키마, 이벤트 타입) |
| `/ops` | 시크릿/계정 (Doppler, 이메일, 계정 전략) |
| `/new-app` | 새 앱 스캐폴딩 가이드 |
| `/audit` | ecosystem.json vs 실제 상태 검증 |
| `/journal` | 개발 저널 기록 (판단, 실수, 발견) |
| `/review` | 실행 리뷰 작성 |
| `/plan` | 구현 계획 작성 |
| `/typography` | Adobe Fonts + Pretendard + CLS 방지 |
| `/drizzle-patterns` | Drizzle ORM 규칙 (prefix, helpers, migrations) |
| `/design-tokens` | 3-tier 디자인 토큰 아키텍처 |
| `/ai-patterns` | AI 모델 라우터 + fallback + 프롬프트 캐싱 |
| `/email-patterns` | Resend 이메일 (fire-and-forget, 템플릿) |

---

## 다른 생태계 앱 현황

- **Modfolio** (`modfolio`, v0.5.0-agentic, landing): Corporate landing + data hub
- **Modfolio Admin** (`modfolio-admin`, v0.4.0-operations, active): Enterprise admin panel
- **Modfolio Dev** (`modfolio-dev`, v0.2.0-sso, landing): Developer tools & API console
- **Modfolio On** (`modfolio-on`, v0.2.0-sso, landing): Ecosystem integrated community
- **Modfolio Press** (`modfolio-press`, v0.3.0-newsletter, landing): Publishing & magazine commerce platform
- **Modfolio Docs** (`modfolio-docs`, v0.2.0, landing): System guides & documentation
- **Modfolio Connect** (`modfolio-connect`, v1.0.0, active): Universal SSO/Identity Platform
- **Modfolio Pay** (`modfolio-pay`, v0.5.0-payment-platform, active): Universal payment gateway
- **Naviaca** (`naviaca`, v0.3.0-full-crm, active): School/Academy CRM + LMS + SIS
- **GistCore** (`gistcore`, v0.5.0-subscription-design, active): AI OPIc speaking practice app
- **Fortiscribe** (`fortiscribe`, v0.2.0-sso, landing): **AI 작문 첨삭 앱**. 영어/한국어 작문 제출 → AI 첨삭 → 피드백.
- **Modfolio LS** (`modfolio-ls`, v0.1.0, landing): 
- **KeepNBuild** (`keepnbuild`, v0.2.0-sso, landing): **맞춤 여행 설계 앱**. 사용자가 여행 일정을 직접 설계하고 관리.
- **Worthee** (`worthee`, v0.3.0-phase2, active): **셀프 관리/자기 명예 앱**. 목표 설정, 습관 추적, 자기 관리.
- **Modfolio Axiom** (`modfolio-axiom`, v0.1.0, landing): 
- **Amberstella** (`amberstella`, v0.2.0-sso, landing): **셔틀/모빌리티 실시간 앱**. 셔틀 위치 추적, 탑승 관리.
- **Modfolio Studio** (`modfolio-studio`, v0.1.0, landing): 
- **Munseo** (`munseo`, v0.2.0-sso, active): Document conversion/management utility
- **Umbracast** (`umbracast`, v0.2.0-sso, landing): **오디오 변환/관리 유틸리티**. 오디오 파일 형식 변환.
- **Sincheong** (`sincheong`, v0.4.0-sveltekit5, active): **범용 폼 빌더 및 관리 앱**. 동적 폼 생성, 제출 관리, 대기열 자동화.

---

## 이 프로젝트의 생태계 지식

# modfolio-works — 프로젝트 지식

## 역할

**Education Group Portal**. Modfolio Works 계열 교육 앱들의 통합 랜딩 포탈.

## 기술 스택

- **Framework**: Astro SSR (랜딩 포탈 전용)
- **DB**: 없음 (하위 앱들이 각자 DB 보유)
- **인증**: modfolio-connect SSO (OIDC PKCE)
- **도메인**: `works.modfolio.io`
- **배포**: CF Pages (`modfolio-works`)
- **버전**: `0.1.0`

## 하위 앱

| 앱 | 도메인 | 역할 |
|----|--------|------|
| Naviaca | naviaca.com | 학원 CRM/LMS |
| GistCore | gistcore.com | AI OPIc 스피킹 연습 |
| Fortiscribe | fortiscribe.com | AI 작문 첨삭 |

## 구현된 기능

- SSO 로그인 포탈
- 하위 앱 카드 그리드 (앱 소개 + 바로가기)
- Adobe Fonts 타이포그래피 (Typekit `fmh4fod`)

## 현재 상태

- **status**: `landing` — Portal shell
- **다음**: 디자인 고도화, 하위 앱 상태 연동 (health check)

<!-- ECOSYSTEM_END -->










---

# Modfolio Works

## 이 레포의 역할

Modfolio Works 자회사 그룹. 교육/학습 도메인 앱 그룹의 통합 랜딩 포탈.

## 모노레포 구조

```
apps/
  landing/   # 정적 랜딩 (port 4321) — teal 라이트 테마
  app/       # SSR 앱 (port 4322) — obsidian 다크 테마
```

각 앱은 독립적인 디자인 토큰 팔레트를 가진다:
- **Landing**: `apps/landing/src/styles/tokens.css` — Teal hue 175 기반 라이트
- **App**: `apps/app/src/styles/tokens.css` — Obsidian hue 275 기반 다크

## 하위 앱 도메인 레지스트리

소스: `apps/*/src/lib/apps.ts`

| 앱 | 도메인 | App URL | 상태 |
|----|--------|---------|------|
| Naviaca | naviaca.com | https://app.naviaca.com | active |
| GistCore | gistcore.com | https://app.gistcore.com | active |
| Fortiscribe | fortiscribe.com | https://app.fortiscribe.com | landing |

## 현재 디자인 상태

Landing v3: megamenu + gradient mesh hero + spacious sections (commit `eff735d`)
- Display font: Goldenbook (Adobe Fonts) + Georgia fallback with CLS metric overrides
- UI font: Pretendard

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **Framework**: Astro SSR (DB 없음)
- **Lint/Format**: Biome v2
- **Deployment**: Cloudflare Pages

## Commands

| Command | Description |
|---------|-------------|
| `bun run check` | Biome lint + format 검사 |
| `bun run check:fix` | Biome 자동 수정 |
| `bun run typecheck` | TypeScript strict mode 검사 |
| `bun run dev:landing` | Landing 개발 서버 (port 4321) |
| `bun run dev:app` | App 개발 서버 (port 4322) |
| `bun run build:landing` | Landing 빌드 |
| `bun run build:app` | App 빌드 |

## Quality Gate (필수)

모든 작업 완료 후 반드시 실행. 통과하지 않으면 commit 불가:

```bash
bun run check && bun run typecheck
```

## Context Rot Prevention

메인 세션은 오케스트레이션 전용. 무거운 작업은 서브에이전트에서.

### 징후 감지
- 이전에 합의한 규칙/제약을 무시하는 코드 생성
- 파일명, 변수명, 함수명을 잘못 기억
- 동일 실수 반복
- 생성 코드 품질이 세션 초반 대비 저하

### 서브에이전트 활용 기준
- 파일 1-2개 수정: 메인 세션에서 직접
- 파일 3개 이상: 서브에이전트 필수
- 리서치/탐색: Explore (haiku)
- 코드 생성: 도메인별 Agent (sonnet)
- 리뷰: Agent Teams (3 reviewer)

## 불변 원칙

> 생태계 공통 원칙은 `~/.claude/CLAUDE.md`에 정의. 아래는 이 레포 전용 규칙.

### Tier 1: 절대 위반 불가

1. **생태계 3대 원칙**: House of Brands / Zero Physical Sharing / 100% CF Edge Native
2. **오류 정공법**: `@ts-ignore`, `biome-ignore`, 예외 처리 우회 금지
3. **Git 안전**: `--force`, `--no-verify` 금지, 시크릿 커밋 금지

### Tier 2: 운영 규칙 (판단 가능, 기록 필수)

1. Plan의 **목적(intent)**에 충실
2. 실행 중 발견한 더 나은 패턴/구조/도구 적용 가능

> **안 되는 것만 명시하고, 나머지는 다 된다.**

## Skills (필요 시 호출)

### 참조형 (패턴/규칙 가이드)

| Skill | 용도 |
|-------|------|
| `/plan` | 기획 품질 기준 + Product Lens + Scope 결정 (Plan Mode 참조) |
| `/deploy` | CF Pages 배포 |
| `/journal` | 개발 저널 기록 |
| `/typography` | Adobe Fonts + Pretendard + CLS 방지 |
| `/design-tokens` | 3-tier 디자인 토큰 (구조 규칙 + 탐색 프로토콜) |
| `/motion-patterns` | 스프링 물리 모션 + 접근성 |
| `/ui-quality-gate` | UI 자가 검증 체크리스트 |
| `/observability` | CF 트레이싱 + OTLP + SigNoz |
| `/layout-patterns` | 헤더/푸터/섹션 레이아웃 규격 (참조용) |
| `/harness-check` | 하네스 전체 점검 + 자동 수정 (소스 대조 검증) |
| `/preflight` | 세션 시작 전 종합 점검 (MCP, 의존성, lint, git, 보안, 환경) |
| `/sso-integrate` | SSO 연동 (성장 시) |

### 생성형 (Agent 오케스트레이션)

| Skill | 용도 |
|-------|------|
| `/component` | 토큰 제약 내 UI 컴포넌트 생성 |
| `/page` | 페이지 레이아웃 생성 (opus) |
| `/design` | Figma 양방향 디자인 파이프라인 |
| `/fix` | 품질 위반 자동수정 |
| `/generate-review` | 생성→리뷰 통합 파이프라인 |
| `/multi-review` | 3-agent 병렬 리뷰 (design-critic + a11y + architecture) |
| `/security-scan` | OWASP Top 10 보안 감사 |
| `/ralph-loop` | 자율 반복 개선 루프 |
| `/release` | 릴리즈 파이프라인 (테스트→triage→분할커밋→PR) |
| `/retro` | 스프린트 회고 (Git 분석 + 자가학습 입력) |
| `/map-codebase` | 기존 코드베이스 분석 (스택/아키텍처/컨벤션/부채) |
| `/optimize` | Autoresearch 패턴 — 메트릭 기반 자율 반복 최적화 |
| `/api` | API 엔드포인트 + 테스트 생성 (성장 시) |
| `/test` | 테스트 스위트 생성 (성장 시) |

## Sub Agents

### 리뷰형 (읽기 전용)

| Agent | 역할 | 모델 |
|-------|------|------|
| `knowledge-searcher` | 지식베이스 검색/요약 | haiku |
| `ecosystem-auditor` | ecosystem.json vs 실제 상태 검증 | haiku |
| `code-reviewer` | 생태계 규칙 기반 코드 리뷰 | sonnet |
| `design-critic` | 디자인 토큰/레이아웃/모션 검증 | sonnet |
| `accessibility-auditor` | WCAG AA 접근성 검증 | sonnet |
| `architecture-sentinel` | 불변 원칙 + 생태계 규칙 검증 | sonnet |
| `visual-qa` | Playwright 기반 시각 검증 | sonnet |

### 생성형 (코드 생성/수정)

| Agent | 역할 | 모델 |
|-------|------|------|
| `component-builder` | UI 컴포넌트 생성 (Figma 연동) | sonnet |
| `page-builder` | 페이지 레이아웃 생성 | sonnet |
| `api-builder` | API 엔드포인트 생성 | sonnet |
| `test-builder` | 테스트 스위트 생성 | sonnet |
| `security-hardener` | 보안 감사 + 자동수정 | sonnet |
| `quality-fixer` | 품질 위반 자동수정 (P0-P3 triage + 정공법) | sonnet |
| `innovation-scout` | 기술 스택 혁신성 감사 (Stability Filter) | sonnet |
| `design-engineer` | Figma 양방향 디자인 파이프라인 | opus |

## Model Routing

| 모델 | 용도 |
|------|------|
| **Opus** | 오케스트레이션, 디자인 판단, 복잡한 리팩토링 |
| **Sonnet** | 코드 생성, 수정, 테스트, 리뷰 (기본) |
| **Haiku** | Explore (탐색/검색) |

에스컬레이션: Sonnet 2회 실패 → Opus 전환

## Paper.design 워크플로우

이 프로젝트는 Paper.design MCP를 통해 비주얼 디자인 이터레이션을 수행한다.

### 코드 → Paper (푸시)
1. 컴포넌트를 구현한 후, `write_html`로 Paper 캔버스에 푸시
2. 전체 페이지가 아닌 개별 컴포넌트/섹션 단위로 푸시할 것
3. 아트보드 이름은 컴포넌트 이름과 일치시킬 것

### Paper → 코드 (풀)
1. 사용자가 Paper에서 비주얼 수정 후 "반영해줘"라고 요청하면:
2. `get_jsx`로 수정된 구조 확인
3. `get_computed_styles`로 변경된 스타일 값 확인
4. 변경사항을 코드에 반영

### 주의사항
- Paper 캔버스의 HTML/CSS는 참조용이며, 프로젝트 소스코드가 정본(source of truth)
- Paper에서의 수정은 "의도 전달"이지 코드 직접 반영이 아님
- 스타일 변경 시 디자인 토큰/변수 체계가 있다면 토큰 값을 우선 적용

## 참조

- 생태계 관제탑: `modfolio-universe` (GitHub: modfolio/modfolio-universe)
- 지식: `knowledge/global.md`
- Skills: `.claude/skills/` | Agents: `.claude/agents/`
- 규칙: `.claude/rules/` (파일 패턴별 자동 로드)
- MCP: context7, github, cloudflare, playwright, neon, svelte, figma (CLI 등록), canva (CLI 등록), paper (로컬 Desktop), filesystem
