<!-- ECOSYSTEM_START: auto-synced from modfolio-ecosystem, do not edit -->

# Modfolio 생태계 컨텍스트

> 이 섹션은 modfolio-ecosystem에서 자동 동기화됩니다. 직접 편집하지 마세요.

# modfolio-ecosystem — Global Knowledge

> 이 파일은 모든 modfolio 프로젝트에 동기화된다. 수정은 modfolio-ecosystem에서만.
> 상세 정보는 각 skill을 호출할 것.

## 생태계 개요

**Modfolio 생태계**는 15개 이상의 앱으로 구성된 SaaS 생태계. 각 앱은 독립 브랜드로 운영되며, 공통 인프라(SSO, 이벤트, 결제)를 공유.

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

## 관련 앱 (유니버설 + works)

| App | Version | Status |
|-----|---------|--------|
| Modfolio Connect | 1.1.0 | active |
| Modfolio Pay | 0.7.0-design-evolution | active |
| Naviaca | 0.3.0-full-crm | active |
| GistCore | 0.5.0-subscription-design | active |
| Fortiscribe | 0.2.0-sso | landing |
| Atelier and Folio | 0.2.0-folio-core | active |

## 프로젝트 지식

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
