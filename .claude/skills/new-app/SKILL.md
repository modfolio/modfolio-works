---
name: new-app
description: 새 Modfolio 앱 스캐폴딩 — Cloudflare Workers + 프레임워크 템플릿
user-invocable: true
---


# Skill: 새 앱 스캐폴딩

새 앱을 생태계에 추가하는 가이드. README.md의 AI Scaffolding Guide 기반.

## 스캐폴딩 프롬프트

```
이 아키텍처 매니페스토를 참고하여 [{app-name}] 레포지토리를 생성해줘.

요구사항:
- Turborepo 마이크로 모노레포 구조
- apps/landing: Astro (Zero JS, SEO 최적화)
- apps/app: [{프레임워크}]
- Bun 워크스페이스
- Biome v2 린트/포맷
- UnoCSS 스타일링 (앱별 독립 설정)
- Drizzle ORM + {DB} 설정
- TypeScript strict mode

Landing 도메인: [{domain}]
App 도메인: [app.{domain}]
```

## 디렉토리 구조 (Micro-Monorepo)

```
{app-name}/
├── apps/
│   ├── landing/              # Astro (마케팅/SEO)
│   │   ├── src/
│   │   ├── astro.config.ts
│   │   └── package.json
│   └── app/                  # 도메인별 프레임워크
│       ├── src/
│       └── package.json
├── packages/                 # [선택] 앱 내부 공유 타입
│   └── shared-types/
├── turbo.json
├── biome.json
├── bun.lock
├── package.json              # Bun 워크스페이스
├── CLAUDE.md                 # AI 에이전트 컨텍스트
└── wrangler.jsonc            # CF Workers 설정 (JSONC 선호, `canon/wrangler-standards-2026.md`)
```

## 새 앱 추가 후 권장 후속 작업 (앱 owner 판단)

ADR-009 (자회사 합류 advisory) 참조. 아래는 참고 순서일 뿐 — 앱 특성에 따라 조정.

### 1. modfolio-connect 클라이언트 등록 (SSO 사용 시)

- client_id: `{repo-name}` (예: `naviaca`)
- redirect URIs: `https://{domain}/auth/callback`, `http://localhost:*/auth/callback`

### 2. ecosystem.json 갱신

```json
{
  "name": "{App Name}",
  "repo": "{repo-name}",
  "domain": "{domain}",
  "framework": "{Framework}",
  "db": "{DB}",
  "deployment": "cf-workers",
  "cfProject": "{cf-project-name}",
  "version": "0.1.0",
  "status": "planned"
}
```

주의: `appDomain` 필드는 ADR-008이 `app.{외부도메인}` 패턴을 폐기 대상으로 정함.
`*.modfolio.io` 인프라 서브도메인은 허용. 외부 브랜드 앱은 생략 권장.

선택 필드: root 레벨 `cfFeatureHints[{repo-name}]`에 CF 신기능 후보 명시 가능 (Hub-not-enforcer, 앱 owner 판단):

- `d1-replicas` — D1 사용 시 자동 혜택 (`canon/d1-read-replicas.md`)
- `do-sqlite-candidate` / `do-facets-candidate` — DO per-tenant 격리 (`canon/cross-worker-do-pattern.md §Facets`)
- `agents-sdk-v2-candidate` — AI agent runtime (`canon/agents-sdk-v2-patterns.md`)
- `browser-run-candidate` — 브라우저 자동화
- `workflows-v2-candidate` — 대용량 워크플로우 (50K concurrent, 300/sec)
- `observability-v2` — 2026-03 이후 cf-workers 기본값 on
- `mcp-code-mode-candidate` — MCP 토큰 99.9% 절감
- `r2-sql-candidate` — R2 분산 쿼리 엔진 (Open Beta)
- `artifacts-candidate` — Git 호환 저장소 for agent

### 3. CF Workers 프로젝트 생성

- Workers & Pages → Create → Import from GitHub
- Landing + App 각각 별도 Workers 프로젝트
- `wrangler.jsonc` 설정은 `/deploy` skill 참조

### 4. athsra 시크릿 세팅 (canon `secret-store.md` v1.13+, 2026-05-02 universe 표준)

- `bunx @athsra/cli login` (머신 1회 — master phrase 입력 + Bearer token 발급)
- `athsra set {repo-name} KEY=value` 다건 (DATABASE_URL / OAUTH_SECRET / API_KEY 등)
- 평문 `.env` 작성 금지 — athsra 가 즉시 R2 ciphertext 로 저장
- `.gitignore` 에 `.env` 추가 (실수로 평문 commit 되지 않도록 정공법 방어)
- `.env.example` (placeholder 만, commit 가능) 작성 — 필요 키 reference + `athsra run` 예시
- master phrase 1Password 백업 (`op item create --category=password --title="athsra master phrase" --vault="modfolio-secrets"`)
- `ecosystem.json.secretsMigration.completed` 에 등재 (`<repo>: { migratedAt, notes, target: "athsra" }`)
- ❌ dotenvx / Doppler 신규 도입 금지 (2026-05-02 athsra v3 cement)

### 5. 외부 서비스 등록

- Sentry: 새 프로젝트 -> DSN 을 athsra 에 (`athsra set <repo> SENTRY_DSN=...`)
- PostHog: 새 프로젝트 -> API 키를 athsra 에
- Resend: `mod@{domain}` 가입 -> API 키를 athsra 에
- Neon: DB 생성 -> 연결 문자열을 athsra 에 (`athsra set <repo> DATABASE_URL=...`)

### 6. knowledge 파일 생성

- `knowledge/projects/{repo-name}.md` 생성

## 프레임워크 선택 가이드

| 용도 | 권장 | 이유 |
|------|------|------|
| 컨텐츠/SEO 중심 | Astro | Zero JS, Island Architecture |
| 대시보드/SPA | SolidStart | Fine-grained reactivity |
| 폼/CRUD 중심 | SvelteKit 5 | 컴파일러 최적화, 최소 번들 |
| 실시간/모바일 | SvelteKit 5 | Runes 반응성, 최소 런타임 |
| 관리자 패널 | TanStack Start | TanStack Router/Table/Form 생태계 |
| Edge API 전용 | Hono | 초경량, CF Workers 네이티브 |
| CRM/복잡한 폼 | Nuxt 3 | Vue Composition API, 점진적 도입 |
