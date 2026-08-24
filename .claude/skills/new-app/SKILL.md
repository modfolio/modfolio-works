---
name: new-app
description: 새 Modfolio 앱 스캐폴딩 — Cloudflare Workers + 프레임워크 템플릿
user-invocable: true
---


# Skill: 새 앱 스캐폴딩

새 앱을 생태계에 추가하는 가이드. README.md의 AI Scaffolding Guide 기반.

## ★ 0단계 — **짓기 전에 이미 있는지 묻는다** (2026-08-24 신설)

이 스킬은 2026-08-24 까지 `find_provider` 를 **0회** 언급했고 capability 를 **0회** 언급했다.
그러면서 §5 에서 새 앱에게 Sentry·PostHog·Resend·Neon 을 **직접 가입하라**고 시켰다 —
`modfolio-notify` 가 이메일을 소유하고 있고 `ADR-022`(mfdb)가 dev DB 를 Neon 에서 떼려고
존재하는데도. **스캐폴딩 스킬이 재발명을 가르치고 있었다.**

`assembly-law`(재사용의 형태)와 `atlas`(재사용의 주인)가 law tier 인데, 새 앱이 처음 만나는
문서가 그 둘을 한 번도 부르지 않으면 법은 산문으로만 존재한다.

```
# 이 앱이 필요로 할 것을 하나씩 물어본다. 만들기 전에.
mcp__ecosystem-state__find_provider  { need: "결제" }
mcp__ecosystem-state__find_provider  { need: "이메일 알림" }
mcp__ecosystem-state__list_capabilities            # 전수 지도
```

CLI 로도 같은 색인을 볼 수 있다: `bun run atlas:gate` · `bun run capability:ledger`.

### ⚠ 0건을 「없다」로 읽지 않는다 — 두 가지 이유

1. **색인이 얇다.** 응답이 `index: {parts, described, suggested}` 를 함께 준다.
   `described`(소유자가 직접 쓴 설명) 비율이 낮으면 **의도 질의로 안 찾아진다.**
   2026-08-24 실측: 부품 73개 중 **`plainly` 있는 것 48개** — 25개는 허브 제안 문장으로만 답한다.
2. **MCP 색인은 서버 기동 시점 스냅샷이다.** 같은 세션에서 `registry:generate` 를 돌려도
   돌고 있는 MCP 프로세스는 **옛 수를 계속 낸다**(2026-08-24 실측: 파일 73 · MCP 37).
   수가 이상하면 MCP 를 재시작하고 다시 묻는다.

찾은 게 있으면 **그 repo 에 요청**한다(`feedback/<repo>/`) — 복사하지 않는다(assembly-law §1).
없으면 그때 만든다. 그리고 **만든 것을 `platform-adapter.json` 의 `provides` 에 선언**한다 —
선언하지 않으면 다음 앱이 또 만든다.

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

### 5. 외부 서비스 — **먼저 소유자를 묻고, 없을 때만 가입한다**

⚠ 이 절은 2026-08-24 이전에 네 서비스를 **무조건 직접 가입**하라고 시켰다. 그건 틀렸다 —
그중 둘은 이미 universe 안에 주인이 있다.

| 필요 | 먼저 볼 곳 | 실측 (2026-08-24) |
|---|---|---|
| **이메일·알림** | `modfolio-notify` | **주인 있음.** `@modfolio/notify-sdk` + `https://notify.modfolio.io/api/v1`. Resend 를 직접 가입하면 발송 채널이 둘이 되고 optout·전달 상태가 갈린다 |
| **dev 데이터베이스** | `mfdb` (ADR-022) | **주인 있음.** 경로 B = `https://mfdb-api.modfolio.io`, 드라이버(`@neondatabase/serverless`)를 안 바꾼다. ⚠ **새 Neon 프로젝트를 만드는 것이 바로 그 계량기를 다시 켜는 일이다** — 2026-08-23 에 data-transfer 쿼터가 야간 백업을 막았다 |
| **관측·트레이싱** | `modfolio-infra` | 판단 부품은 있다(`@modfolio/trace-sampling`). **수집 백엔드(Sentry 류)는 아직 없다** — 필요하면 가입하되 infra 에 먼저 묻는다 |
| **제품 분석·실험** | `modfolio-admin` | 실험 배정 부품 있음(`@modfolio/experiment-assign`). **분석 백엔드(PostHog)는 없다** — 위와 같다 |

절차:

1. `find_provider` 로 묻는다 → 있으면 **그 좌표를 소비**한다(가입하지 않는다)
2. 없으면 가입하고, **키는 athsra 로**: `athsra set <repo> <KEY>=...`
3. 가입했으면 **`capability-ledger.md` 에 그 역량이 있는지** 본다 —
   없으면 허브에 제보(`feedback/modfolio-ecosystem/`). 두 번째 앱이 또 가입하지 않도록.

⚠ prod DB 는 별개 판단이다. `mfdb` 경로 B 는 **아직 «prod-ready» 가 아니다**(ADR-022 §6 미완).
   dev 를 계량기에서 떼는 것이 지금의 목적이다.

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
