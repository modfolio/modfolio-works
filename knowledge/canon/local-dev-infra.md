---
title: Local Dev Infra — mod-ai-toolkit v2 Tier 1
version: 1.1.0
last_updated: 2026-04-27
source: [Harness v2.4 Phase 4, C:/Projects/mod-ai-toolkit, ecosystem-level dev port 할당 보강 2026-04-27 (m365-auth-init signoz 8080 충돌 정공법 해소)]
sync_to_siblings: true
applicability: always
consumers: [preflight]
---

<!--
22 member repo가 `mod-ai-toolkit v2`의 공통 개발 인프라를 어떻게 활용하는지 명시한다.
universe가 소유하는 docker-compose override + Caddy 라우팅 + catalog가 기본 자원.
-->

# Local Dev Infra — mod-ai-toolkit v2 Tier 1 통합 가이드

**전제**: `C:/Projects/mod-ai-toolkit`에 harness v2.4의 `docker-compose.override.modfolio.yml` + 신규 Caddy 라우팅 + catalog 항목이 배포되어 있다.

## 기동

```bash
cd C:/Projects/mod-ai-toolkit
cp .env.modfolio.example .env   # placeholder 채우기 (Langfuse salt, LiteLLM master key 등)
docker compose -f docker-compose.yml -f docker-compose.override.modfolio.yml \
  --profile observability --profile modfolio-dev up -d
```

dashboard: `http://localhost:18180` — `observability` + `modfolio Dev Backbone` workspace에 신규 서비스가 모두 뜬다.

## 각 앱이 사용하는 방식

⚠️ **이 통합은 opt-in**. 기본 member repo는 Claude/Postgres/Redis 등을 각자 연결 (예: Claude는 `api.anthropic.com`, DB는 Neon). toolkit 경유는 로컬 개발 편의용으로 원하는 repo만 아래 env를 `.env.local`에 추가한다. 이전 canon에서 "모든 repo가 ANTHROPIC_BASE_URL 경유" 로 기술한 부분은 2026-04-18 철회 ([project_toolkit_optin.md](../../../memory/project_toolkit_optin.md)).

member repo의 `.env.local` (toolkit opt-in 시):

```env
# Postgres (Neon 대신 dev 인스턴스)
DATABASE_URL=postgresql://modfolio:<password>@localhost:5432/<repo_name>_dev

# Redis (Upstash 대신 로컬)
REDIS_URL=redis://localhost:6379

# R2 미러 (S3 호환)
R2_ENDPOINT=http://localhost:<r2_port>
R2_ACCESS_KEY_ID=r2mirror
R2_SECRET_ACCESS_KEY=<from .env>

# LiteLLM proxy (모든 Claude API 호출)
ANTHROPIC_BASE_URL=http://llm.mod-ai.localhost/v1
ANTHROPIC_API_KEY=sk-<virtual-key-per-repo>

# Langfuse (필요 시 직접 호출)
LANGFUSE_HOST=http://langfuse.mod-ai.localhost
LANGFUSE_PUBLIC_KEY=<from Langfuse project>
LANGFUSE_SECRET_KEY=<from Langfuse project>

# Resend 대신 MailHog
SMTP_HOST=localhost
SMTP_PORT=1025

# Flagsmith
FLAGSMITH_ENVIRONMENT_KEY=<from Flagsmith project>
FLAGSMITH_API_URL=http://flags.mod-ai.localhost/api/v1/

# Meilisearch
MEILISEARCH_HOST=http://meili.mod-ai.localhost
MEILISEARCH_API_KEY=<from .env master key>
```

## 서비스 매트릭스

| 서비스 | 로컬 URL | 목적 | 필수 env |
|--------|----------|------|---------|
| Langfuse | `http://langfuse.mod-ai.localhost` | agent trace + eval + prompt mgmt | salt, encryption, public/secret keys |
| OTEL Collector | `http://otel.mod-ai.localhost` | OTLP 수집 → Langfuse | OTEL_LANGFUSE_AUTH |
| LiteLLM Proxy | `http://llm.mod-ai.localhost` | Claude API 게이트웨이 | master key, Anthropic key |
| Postgres dev | `localhost:5432` | Neon local mirror | user/pass |
| Redis dev | `localhost:6379` | queue/cache | (none) |
| MailHog | `http://mail.mod-ai.localhost` | SMTP catch-all | (none) |
| Mock server | `http://mock.mod-ai.localhost` | contracts/ fixture | (none) |
| MinIO R2 | `http://r2.mod-ai.localhost` | S3 호환 storage | user/pass |
| Flagsmith | `http://flags.mod-ai.localhost` | feature flags | secret key |
| Meilisearch | `http://meili.mod-ai.localhost` | full-text search | master key |
| MCP Gateway | `http://mcp.mod-ai.localhost` | MCP aggregator | (config.yaml) |
| Temporal UI | `http://temporal.mod-ai.localhost` | workflow 관찰 | (none) |
| SigNoz | `localhost:8080` | observability self-host (toolkit observability profile) | (none) |

## ecosystem-level dev port 할당 (member repo CLI/dev server 용, 2026-04-27 v1.1.0)

mod-ai-toolkit 의 docker compose 가 `8080`/`5432`/`6379`/`1025`/`8025` 같은 흔한 port 를 차지하므로, ecosystem 의 member repo CLI/dev server 는 **18000 대역 high port** 를 사용한다 (toolkit dashboard `18180` 와 같은 영역). 충돌 방지 + grep 으로 식별 용이.

| Port | 용도 | 출처 |
|------|------|------|
| 18180 | mod-ai-toolkit dashboard | toolkit (Phase 4) |
| **18181** | **m365-auth-init OAuth callback** | `scripts/ops/m365-auth-init.ts` (Phase 3 prereq) |
| 18182~18189 | reserved (향후 ecosystem CLI 용) | — |

**규칙**:
- 신규 dev server / OAuth callback / inspector 등은 `18180` 영역에서 다음 빈 번호 채택 + 본 표 갱신
- 8080 / 3000 / 5000 / 5173 같은 conventional port 는 채택 금지 (mod-ai-toolkit 또는 다른 dev tool 충돌 잦음)
- Azure App Registration 의 redirect URI 도 본 표와 정합 (canon `m365-graph-integration` § Microsoft Entra App Registration)

## 프로덕션 매핑

`ecosystem.json`의 `modAiToolkit.productionExposure.plannedHostsBase = "mod-ai.modfolio.io"`.
CF Tunnel profile 활성화 시 `*.mod-ai.modfolio.io`로 외부 노출 (Connect SSO + Cloudflare Access 강제).

## Dev Container 통합 (Phase 6 Tier 2)

각 member repo에 universe가 배포하는 `.devcontainer/devcontainer.json` 템플릿이 위 서비스 URL을 환경변수로 기본 주입한다. VSCode에서 "Reopen in Container" 하면 즉시 이 backbone에 연결된 개발 환경이 뜬다.

## 문제 해결

- 모든 서비스 재기동: `docker compose ... restart`
- 특정 서비스 로그: toolkit dashboard에서 "로그" 버튼 또는 `docker compose logs -f <service>`
- 데이터 초기화: `./data/<service>` 디렉토리 삭제 (주의: dev 데이터만)
- Langfuse 404 → Clickhouse 마이그레이션 대기 (최대 2분)
- LiteLLM 500 → `litellm-postgres` 기동 확인

## 관련

- [cost-attribution.md](cost-attribution.md) — LiteLLM virtual key 운영
- [eval-patterns.md](eval-patterns.md) — Langfuse dataset 활용
- [observability.md](observability.md) — OTEL 수집 경로
- [modern-orchestration-evaluation.md](modern-orchestration-evaluation.md) — 대안 스택 평가

## 갱신 이력

- 2026-04-17: v1.0.0. Harness v2.4 Phase 4 승격 시점 초판.
