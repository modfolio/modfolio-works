---
description: 새 Modfolio 앱 스캐폴딩 — Cloudflare Pages + 프레임워크 템플릿
effort: low
allowed-tools: Read, Glob, Grep
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
└── wrangler.toml             # CF Workers/Pages 설정
```

## 새 앱 추가 후 필수 작업

### 1. modfolio-connect 클라이언트 등록

- client_id: `{repo-name}` (예: `naviaca`)
- redirect URIs: `https://{domain}/auth/callback`, `http://localhost:*/auth/callback`

### 2. ecosystem.json 갱신

```json
{
  "name": "{App Name}",
  "repo": "{repo-name}",
  "domain": "{domain}",
  "appDomain": "app.{domain}",
  "framework": "{Framework}",
  "db": "{DB}",
  "deployment": "cf-pages",
  "cfProject": "{cf-project-name}",
  "version": "0.1.0",
  "status": "planned"
}
```

### 3. CF Pages 프로젝트 생성

- **반드시 GitHub 연동으로 생성** (Direct Upload 금지)
- Landing + App 각각 별도 CF Pages 프로젝트

### 4. Doppler 프로젝트 생성

- 프로젝트명: `{repo-name}`
- 환경: dev / stg / prd

### 5. 외부 서비스 등록

- Sentry: 새 프로젝트 -> DSN을 Doppler에
- PostHog: 새 프로젝트 -> API 키를 Doppler에
- Resend: `mod@{domain}`으로 가입 -> API 키를 Doppler에
- Neon: DB 생성 -> 연결 문자열을 Doppler에

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
