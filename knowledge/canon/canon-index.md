---
title: Canon INDEX
version: 1.6.4
last_updated: 2026-06-18
sync_to_siblings: true
applicability: always
consumers: [preflight]
---

<!--
Harness v2.4 신설. 20+ canon이 flat dir에 쌓이면서 신규 엔지니어가 "어디 보지?"를
매번 묻는 drift가 있었다. 여기가 1-line 인덱스 + 태그 + agent decision tree.

v2.12.1 (2026-04-25): 각 canon 에 `applicability` frontmatter 추가. universe 내 모든
repo (ecosystem 포함) 가 이 분류를 참고해 "이 canon 을 지금 따라야 하나?" 를 판단한다.
분류는 canon 작성자의 권고 — 강제 아님 (evergreen-principle).
-->

# Canon INDEX — 1-line 요약 + agent decision tree

## Applicability 분류 (2026-04-25 도입)

| Tag | 의미 | 예시 |
|---|---|---|
| `always` | universe 전체 권고. 모든 repo 가 방향성 정합 기대. 적용 시기는 각 repo 자율. | evergreen-principle, anti-slop, design-tokens, drizzle-conventions |
| `per-app-opt-in` | 해당 스택/기능 사용 시에만 채택. 미사용 repo 는 skip 가능. | m365-graph-integration (Microsoft Graph 사용 시), d1-read-replicas (D1 사용 시), prompt-caching (Claude SDK 사용 시) |
| `doc-only` | 참조 material. sync 는 visibility 목적, 적용 의도 없음. | (현재 sync=true 인 canon 중엔 없음, 참고성 canon 은 sync_to_siblings:false 로 유지) |

> 각 canon 파일 frontmatter `applicability:` 로 선언. 이 INDEX 는 요약만 제공 —
> 실제 적용 여부는 해당 repo owner 판단 (Hub-not-enforcer).

## 원칙 / 거버넌스

- [evergreen-principle.md](evergreen-principle.md) — 연결 프로젝트는 항상 최신 Connect SDK. universe는 권고, 강제 X.
- [agentic-engineering.md](agentic-engineering.md) — Karpathy 2026-02 프레임. atomic task / vibe·rigor 경계 / Prompt→Generate→Review→Feedback→Iterate / untrusted code 가정.
- [anti-slop.md](anti-slop.md) — "패턴 매칭 최적화"의 슬롭 패턴 + negative space 디자인 원칙.
- [payment-safety.md](payment-safety.md) v1.0 (신설 2026-06-14) — 자율 agent 무단 지출 차단. `pre-payment-guard` 결정적 hook (tiered 다중승인) + 자율 하드차단 + audit. `applicability: always`.
- [velocity-mode.md](velocity-mode.md) v1.0 (신설 2026-06-18) — fast-MVP hook 프로필. `velocity`(가드 2개, 기본)/`strict`(전체, opt-in). 훅=0토큰·실비용=지연. `harness-lock.json profile`. solo-main-workflow 자매. `applicability: conditional`.
- [secrets-policy.md](../../.claude/rules/secrets-policy.md) (rule) — 하드코딩 금지, 로테이션 주기.
- [lethal-trifecta.md](../../.claude/rules/lethal-trifecta.md) (rule) — private+untrusted+outward 동시 차단. payment-safety 의 자매 룰.

## 개발 환경

- [nas-infra.md](nas-infra.md) — **modfolio-infra(NAS)** substrate: 이중 git/레지스트리/CI($0), Restic→R2 3-2-1 백업. ADR-010 면제. `applicability: always`. (local-dev-infra.md superseded → `archive/`)
- [modern-orchestration-evaluation.md](modern-orchestration-evaluation.md) — Docker/PaaS/mise/Devcontainer 2026-04 평가.
- [operations.md](operations.md) — 계정/운영 전반.
- [secret-store.md](secret-store.md) — 시크릿 관리 표준 (athsra v3 — CF Worker + R2 + E2EE). **Phase 2.1 active (npmjs.org `@athsra/cli@0.1.0` public)**. `applicability: always`.
- [email-domain-aliases.md](email-domain-aliases.md) — 도메인 alias (CF Email Routing + GW Send-as). `applicability: per-app-opt-in`.
- [totp-microsoft-authenticator.md](totp-microsoft-authenticator.md) — 23 dev 서비스 TOTP 통합 가이드 (M365 Authenticator). `applicability: per-app-opt-in`.
- [m365-graph-integration.md](m365-graph-integration.md) — Microsoft Graph SDK 통합 표준 (Personal MSA + OAuth refresh token). `applicability: per-app-opt-in`.

## AI · Context · Cost

- [tech-trends-2026-04.md](tech-trends-2026-04.md) — 월별 trend. Adopt/Trial/Avoid 표.
- [tech-trends-2026-06.md](tech-trends-2026-06.md) v1.0 (신설 2026-06-14) — Claude Dreaming·AI payment guardrails·self-evolving agents. v3.7.0 에서 3건 Adopt 구현. 현재 월 SSoT.
- [claude-code-2-1-112-diff.md](claude-code-2-1-112-diff.md) — v2.1.105-112 changelog.
- [claude-code-2026h1-features.md](claude-code-2026h1-features.md) — 2026 H1 신기능 Adopt/Trial/Watch (Fable 5 available, Dynamic Workflows, /goal, fallback models). baseline 무변.
- [context-isolation.md](context-isolation.md) — worktree-per-subagent + SubagentOutputStyle.
- [prompt-caching-strategy.md](prompt-caching-strategy.md) — 1h vs 5m TTL 분류.
- [effort-policy.md](effort-policy.md) — low/medium/high/xhigh/max WHEN 기준.
- [opus-4-7-effort-policy.md](opus-4-7-effort-policy.md) — Opus 4.7 effort 시스템 배경.
- [cost-attribution.md](cost-attribution.md) — LiteLLM virtual key + Langfuse 태깅.
- [eval-patterns.md](eval-patterns.md) — 6-layer eval stack + LLM-judge.
- [memory-architecture.md](memory-architecture.md) — 커스텀 Memory Tool 설계.
- [harness-dreaming.md](harness-dreaming.md) v1.0 (신설 2026-06-14) — 하네스 자가개선. 내부 텔레메트리 통합 → 반복 패턴 추출 → 개선 제안 (report-only, human-gated). `/dream`. retro·evolve 자매. `applicability: always`.
- [agents-sdk-v2-patterns.md](agents-sdk-v2-patterns.md) — CF Agents SDK V2 + Project Think.
- [ai-patterns.md](ai-patterns.md) — 멀티 프로바이더 fallback/cache.

## 운영 / 신뢰성

- [observability.md](observability.md) — OTLP/SigNoz/Langfuse 연결.
- [incident-response.md](incident-response.md) — P0/P1 triage SOP.
- [rate-limiting.md](rate-limiting.md) — CF + Workers rate limit 패턴.
- [gotchas.md](gotchas.md) — 반복 트러블슈팅 기록.
- [cross-worker-do-pattern.md](cross-worker-do-pattern.md) — Durable Object + Facets.
- [cf-dynamic-workers-patterns.md](cf-dynamic-workers-patterns.md) — Dynamic Workers + Artifacts.
- [d1-read-replicas.md](d1-read-replicas.md) — D1 read replicas + Sessions API.
- [d1-schema-single-source.md](d1-schema-single-source.md) — D1 스키마 단일 소스.
- [gh-actions-policy.md](gh-actions-policy.md) v2.0 — **GitHub Actions 전면 금지**. CI 는 NAS Forgejo Actions($0).

## Cloudflare API · 배포 (전용 섹션, v1.6.0 정리)

> **AI 가 CF 작업 hallucinate 차단**: 권한 의심 전 `cf-token-permissions.md`, endpoint 의심 전 `cf-api-mastery.md` 검증.

- [cf-token-permissions.md](cf-token-permissions.md) v1.0 — **권한 모델 + 사용자 "All API" 토큰 실측값 (353/366 perm groups, 2026-05-24)** + 권한 의심 차단 게이트. `applicability: always`.
- [cf-api-mastery.md](cf-api-mastery.md) v1.0 — **영역별 endpoint 카탈로그** (Workers/Pages/DNS/Worker Domains/Custom Hostnames/Zone) + **AI hallucination 카탈로그** (H1~H13) + 검증 패턴.
- [cf-deploy.md](cf-deploy.md) v1.1 — 배포 메커니즘 + wrangler v4 정확 커맨드 + 비대화형 실행 표준.
- [cf-workers-builds-api.md](cf-workers-builds-api.md) v1.0 — Workers Builds API 깊은 진단 (build token silent expire, gh 연결 자동화).
- [pages-to-workers-migration.md](pages-to-workers-migration.md) v1.1 — Pages → Workers 이관 13단계 + bulk deployment cleanup.
- [wrangler-standards-2026.md](wrangler-standards-2026.md) — wrangler.jsonc 템플릿 (프레임워크별 build 블록 + binding).
- [cf-workflows-v2.md](cf-workflows-v2.md) v1.0 (신설 2026-05-24) — Workflows V2 GA + Dynamic Workflows. per-tenant durable execution. **Trial — POC sibling 1 spike 후 결정**.

## 표준 / Portability

- [anthropic-agent-skills-standard.md](anthropic-agent-skills-standard.md) v1.0 (신설 2026-05-24) — Anthropic Agent Skills 공개 표준 (agentskills.io). universe `.claude/skills/*` 이미 호환 — 외부 도구 (Cursor/Codex/Copilot) 와 portability 자산.

## 데이터 / DB

- [drizzle-conventions.md](drizzle-conventions.md) — Drizzle ORM 규약.
- [adoption-debt-patterns.md](adoption-debt-patterns.md) — 하네스 adoption 부채 패턴.
- [db-endpoints.md](db-endpoints.md) — sibling 별 DB endpoint mapping (Neon host + database name + athsra key). 작명 혼동 방지. `applicability: always`.
- [app-registry.md](app-registry.md) v1.0 (신설 2026-06-14) — universe 앱 이름+URL 단일 소스 (`@modfolio/contracts/registry`). OIDC redirect_uri·CORS·SSO·webhook 손코딩 제거. `applicability: always`.
- [standard-schema.md](standard-schema.md) v1.0 (신설 2026-05-24) — Zod 4 + Valibot interop spec. contracts/ 의 새 스키마는 호환 lib 만.

## 디자인

- [design-tokens.md](design-tokens.md) — 시맨틱 변수 + z-index/breakpoint + DTCG 2025.10 정합.
- [design-tooling.md](design-tooling.md) v1.1 — Figma MCP 풀 카탈로그 + Canva + skill set.
- [design-innovation.md](design-innovation.md) — 혁신 원칙 (negative space).
- [landing-copywriting.md](landing-copywriting.md) — 랜딩 카피 가이드.
- [layout-patterns.md](layout-patterns.md) — 레이아웃 구조 원칙.
- [motion-patterns.md](motion-patterns.md) v1.1 — 스프링 모션 + 접근성 + Svelte 5 motion 신 타입.
- [typography.md](typography.md) — 타이포그래피 변수/스케일.
- [icon-system.md](icon-system.md) v1.0 (신설 2026-05-24) — UnoCSS preset-icons + Iconify 표준 + Lucide/Tabler 셋.

---

## Agent Decision Tree

**"어떤 agent를 부를까?"** 결정 흐름:

```
코드 리뷰가 필요? → code-reviewer
디자인 리뷰? → design-critic
접근성 리뷰? → accessibility-auditor
아키텍처 큰 그림 리뷰? → architecture-sentinel

새 API endpoint? → api-builder
새 UI 컴포넌트? → component-builder
새 페이지? → page-builder
Zod 계약 변경? → contract-builder
DB 스키마 변경? → schema-builder
테스트 추가? → test-builder

품질 위반 자동 수정? → quality-fixer
보안 점검? → security-hardener
시각 QA? → visual-qa

마이그레이션 롤백 안전성? → migrations-auditor
P0 장애 발생? → incident-handler
CF Workers 비용/지연 분석? → perf-profiler

생태계 상태 점검? → ecosystem-auditor
신기술 탐색? → innovation-scout
지식 검색? → knowledge-searcher
디자인 엔지니어링? → design-engineer
```

**원칙**: 모호하면 `knowledge-searcher`로 먼저 탐색, 그 결과로 어느 specialized agent 부를지 결정.

---

## Skill Decision Tree

**"어떤 skill을 쓸까?"** (일부 발췌 — 전체는 `.claude/skills/*/SKILL.md` 목록 참조):

- 새 앱 스캐폴딩 → `/new-app`
- 기존 코드베이스 분석 → `/map-codebase`
- 앱 상태 점검 → `/ecosystem`, `/audit`
- **종결급 정합성 점검 (찜찜할 때 막 돌리기)** → `/modfolio` ← v2.14.0 신설
- 피드백 종합 → `/feedback-collect`, `/feedback-send`
- 배포 가이드 → `/deploy`
- 릴리즈 파이프라인 → `/release`
- 보안 감사 → `/security-scan`
- 회고 → `/retro`
- 저널 기록 → `/journal`

---

## 갱신 이력

- 2026-04-17: v1.0.0 초판. 29 canon 1-line 인덱스 + agent/skill decision tree.
- 2026-04-22: design-tokens 한 줄에 DTCG 2025.10 정합 표기 추가 (canon v3.1.0 반영).
- 2026-04-26: v1.1.0. agentic-engineering.md (Karpathy 프레임) 신규 entry — 원칙/거버넌스 섹션. 43개 canon 전부 `applicability` 분류 완료 (always/per-app-opt-in/doc-only).
- 2026-04-26: v1.2.0. Skill Decision Tree 에 `/modfolio` 추가 (v2.14.0 신설 — 14 트랙 종결급 진단·계획 메타 skill).
- 2026-05-03: v1.3.0. secrets-dotenvx → archive (Phase 1 완료). secret-store v1.1 (athsra Phase 1 active, 8 repo dogfood).
- 2026-05-04: v1.3.1. secret-store v1.5 (athsra Phase 1.x.1 — soft-delete + version history. R2 3-tier layout. 5 신규 명령. 운영 무결성 마지막 hole 메움).
- 2026-05-04: v1.3.2. secret-store v1.6 (athsra Phase 2.1 — npmjs.org publish `@athsra/cli@0.1.0` + `@athsra/crypto@0.1.0` MIT public. 외부 alpha 진입 hurdle 제거).
- 2026-05-07: v1.4.0. **db-endpoints.md** 신규 — sibling 별 DB endpoint mapping 표 (작명 혼동 방지). modfolio (parent) 의 Neon DB 명이 `press` 로 작명 → repo `modfolio-press` 와 시각 충돌 사용자 보고. canon + ecosystem.json `infrastructure[].db` 객체 schema 동시 cement (P0.0 cycle).
- 2026-05-22: v1.5.0. **nas-infra.md** 신규(harness 3.4.0) — modfolio-infra NAS substrate 정합: 이중 git/레지스트리/CI($0). local-dev-infra.md(mod-ai-toolkit v2) superseded → `archive/`. **gh-actions-policy.md v2.0** "전면 금지" 로 강화 — `.github/workflows/` 0, CI 컴퓨트 = NAS Forgejo Actions self-hosted runner. ADR-010 신규(self-hosted-infra-substrate, ADR-002 의 의도된 면제).
- 2026-05-24: v1.6.0. **Cloudflare API · 배포 전용 섹션 신설**. 신규 canon 2개 — [cf-token-permissions.md](cf-token-permissions.md) (사용자 "All API" 토큰 353/366 perm groups 실측 + 권한 의심 차단 게이트), [cf-api-mastery.md](cf-api-mastery.md) (영역별 endpoint 카탈로그 + H1~H13 hallucination 카탈로그). cf-deploy v1.1 / pages-to-workers-migration v1.1 정정 — link out. 배경: 사용자 보고 "API mega-token 인데 AI 가 계속 못한다고 hallucinate". 사용자 토큰 직접 measurement 로 권한 fact 박고, endpoint/body 정확성으로 hallucination 차단.
- 2026-05-24: v1.6.1. **2026-05-24 staleness audit 결과 반영** — stale 5 (전부 2026-03-27) 차등 처리: ai-patterns v1.1 (CF AI Gateway / Opus 4.7 / Managed Agents 옵션), design-tooling v1.1 (Figma MCP 풀 카탈로그 + skill set), memory-architecture v1.1 (App-level + agent-runtime-layers / memory-architecture-eval / Claude Code memory 4 layer 분리), motion-patterns v1.1 (evergreen 인정 + Svelte 5 motion 신 타입), rate-limiting v1.1 (CF Workers Rate Limiting binding GA). minor gap — harness-adoption-guide v1.1 (v3.1+ bypassPermissions + SessionStart default-ON + pre-commit guard 제거 + NAS Forgejo).
- 2026-05-24: v1.6.2. **2026-04~05 신기술 도입 결과** — Adopt 4 canon 신설: icon-system v1.0 (UnoCSS preset-icons + Iconify), standard-schema v1.0 (Zod 4 + Valibot interop), anthropic-agent-skills-standard v1.0 (agentskills.io 표준 인지), cf-workflows-v2 v1.0 (Trial — POC spike). attention-budget v1.3 (Context Engineering 5 criteria 보강). tech-trends-2026-05 v1.1 (Adopt/Trial/Watch/Skip 표 + Better Auth 1.6 / Forgejo v15 / Astro 6 / Svelte 5 attachments / Zod 4 마이그 등 별도 plan 권고).
