---
title: Canon INDEX
version: 1.0.0
last_updated: 2026-04-17
sync_to_children: true
consumers: [preflight]
---

<!--
Harness v2.4 신설. 20+ canon이 flat dir에 쌓이면서 신규 엔지니어가 "어디 보지?"를
매번 묻는 drift가 있었다. 여기가 1-line 인덱스 + 태그 + agent decision tree.
-->

# Canon INDEX — 1-line 요약 + agent decision tree

## 원칙 / 거버넌스

- [evergreen-principle.md](evergreen-principle.md) — 연결 프로젝트는 항상 최신 Connect SDK. universe는 권고, 강제 X.
- [anti-slop.md](anti-slop.md) — "패턴 매칭 최적화"의 슬롭 패턴 + negative space 디자인 원칙.
- [secrets-policy.md](../../.claude/rules/secrets-policy.md) (rule) — 하드코딩 금지, 로테이션 주기.

## 개발 환경

- [local-dev-infra.md](local-dev-infra.md) — **mod-ai-toolkit v2** Tier 1 서비스 사용법.
- [modern-orchestration-evaluation.md](modern-orchestration-evaluation.md) — Docker/PaaS/mise/Devcontainer 2026-04 평가.
- [wrangler-standards-2026.md](wrangler-standards-2026.md) — Cloudflare Workers 배포 표준.
- [operations.md](operations.md) — 시크릿/Doppler/계정 운영.

## AI · Context · Cost

- [tech-trends-2026-04.md](tech-trends-2026-04.md) — 월별 trend. Adopt/Trial/Avoid 표.
- [claude-code-2-1-112-diff.md](claude-code-2-1-112-diff.md) — v2.1.105-112 changelog.
- [context-isolation.md](context-isolation.md) — worktree-per-subagent + SubagentOutputStyle.
- [prompt-caching-strategy.md](prompt-caching-strategy.md) — 1h vs 5m TTL 분류.
- [effort-policy.md](effort-policy.md) — low/medium/high/xhigh/max WHEN 기준.
- [opus-4-7-effort-policy.md](opus-4-7-effort-policy.md) — Opus 4.7 effort 시스템 배경.
- [cost-attribution.md](cost-attribution.md) — LiteLLM virtual key + Langfuse 태깅.
- [eval-patterns.md](eval-patterns.md) — 6-layer eval stack + LLM-judge.
- [memory-architecture.md](memory-architecture.md) — 커스텀 Memory Tool 설계.
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
- [gh-actions-policy.md](gh-actions-policy.md) — GitHub Actions 정책.

## 데이터 / DB

- [drizzle-conventions.md](drizzle-conventions.md) — Drizzle ORM 규약.
- [adoption-debt-patterns.md](adoption-debt-patterns.md) — 하네스 adoption 부채 패턴.

## 디자인

- [design-tokens.md](design-tokens.md) — 시맨틱 변수 + z-index/breakpoint.
- [design-tooling.md](design-tooling.md) — Figma + Canva.
- [design-innovation.md](design-innovation.md) — 혁신 원칙 (negative space).
- [landing-copywriting.md](landing-copywriting.md) — 랜딩 카피 가이드.
- [layout-patterns.md](layout-patterns.md) — 레이아웃 구조 원칙.
- [motion-patterns.md](motion-patterns.md) — 스프링 모션 + 접근성.
- [typography.md](typography.md) — 타이포그래피 변수/스케일.

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
- 피드백 종합 → `/feedback-collect`, `/feedback-send`
- 배포 가이드 → `/deploy`
- 릴리즈 파이프라인 → `/release`
- 보안 감사 → `/security-scan`
- 회고 → `/retro`
- 저널 기록 → `/journal`

---

## 갱신 이력

- 2026-04-17: v1.0.0 초판. 29 canon 1-line 인덱스 + agent/skill decision tree.
