---
title: DB Endpoint Mapping — modfolio universe (혼동 방지 lookup)
version: 1.0.0
last_updated: 2026-05-07
source: [P0.0 DB endpoint 혼동 정리 cycle (2026-05-07), modfolio (parent app) athsra DATABASE_URL 실측, modfolio-press athsra 신규 등록 (DATABASE_URL = ep-fancy-shadow / neondb)]
sync_to_siblings: true
applicability: always
consumers: [secret, ops, modfolio, preflight]
---

# DB Endpoint Mapping — modfolio universe

> **목적**: 사이블링 repo 의 DB endpoint (host + database name + secret 위치) 한 곳 lookup. 작명 충돌 / 혼동 방지. password 명시 X — host + database name 만 (secret 자체는 athsra 또는 wrangler binding).

## 작명 혼동 사례 (2026-05-07 발견)

**modfolio** (parent app, `app.modfolio.io`) 의 Neon DB 명이 우연히 `press`. **repo `modfolio-press`** 와 무관.

| 혼동 가능 항목 | modfolio (parent) | modfolio-press |
|---|---|---|
| Neon endpoint | `ep-dawn-poetry-a1lxsb75-pooler.ap-southeast-1.aws.neon.tech` | `ep-fancy-shadow-a1jjkxil-pooler.ap-southeast-1.aws.neon.tech` |
| Database name | **`press`** ⚠️ | `neondb` |
| Table prefix | `mf_*` (Drizzle `tablesFilter`) | (없음) |
| repo | `modfolio` | `modfolio-press` |
| athsra project | `modfolio` | `modfolio-press` |
| athsra key | `DATABASE_URL` | `DATABASE_URL` |
| App role | Data Hub (Conversational Hub, PKG, AI) | Newsletter / 출판 커머스 |

→ 작명 우연이지만 사용자가 1회 혼동 보고. **canon (본 file) 으로 명시 + ecosystem.json `infrastructure[].db` 객체 schema** (P0.0.2) 로 검증 가능.

## 전 sibling DB 매핑

| sibling repo | DB type | endpoint hostname | database name | athsra project | athsra key | 작명 주의 |
|---|---|---|---|---|---|---|
| **modfolio (parent)** | Neon Postgres + pgvector | ep-dawn-poetry-a1lxsb75-pooler.ap-southeast-1.aws.neon.tech | **press** | modfolio | DATABASE_URL | ⚠️ DB name 'press' — repo 'modfolio-press' 와 별개 |
| **modfolio-press** | Neon Postgres | ep-fancy-shadow-a1jjkxil-pooler.ap-southeast-1.aws.neon.tech | neondb | modfolio-press | DATABASE_URL | — |
| modfolio-on | Neon Postgres + Upstash Redis | (사용자 확인 필요 — ecosystem.json infrastructure[Modfolio On].db 갱신 권고) | — | (등록 시점 알림) | — | — |
| modfolio-admin | D1 (Cloudflare) | (CF binding TOKENS_DB-style) | (D1 uuid 기반) | modfolio-admin | (wrangler secret) | D1 — Neon 아님 |
| modfolio-dev | D1 (Cloudflare) | — | — | modfolio-dev | — | D1 |
| modfolio-pay | D1 + Stripe + Toss | — | — | modfolio-pay | (다수) | D1 |
| modfolio-connect | D1 (Cloudflare) | — | — | modfolio-connect | (다수) | D1 |
| 기타 D1 sibling | D1 (Cloudflare) | — | — | (sibling 별) | — | D1 |
| athsra | D1 (`athsra-tokens`) + R2 (`athsra-secret-store`, `athsra-audit`) | (CF binding) | athsra-tokens | (self-hosted) | (CF wrangler secret) | self-hosted |

(Neon endpoint 는 host name 만. Connection string 의 password 는 athsra envelope / wrangler secret 보관 — 본 canon 에 명시 X.)

## 신규 sibling 도입 시 절차

1. Neon project 생성 (또는 D1 database create)
2. Neon endpoint hostname 확보 (e.g. `ep-foo-bar-aN-pooler.<region>.aws.neon.tech`) + database name 결정
3. **DB name 작명 권고**: repo 이름과 동일/부분 매칭 금지 (작명 혼동 방지). 예: repo `modfolio-press` 의 DB 명을 `press` 로 하지 말 것 (modfolio parent 처럼). `imprint`, `publishing`, `mp` 같은 무관 이름 권고.
4. athsra `init <repo>` + `set <repo> DATABASE_URL=postgresql://...` (또는 wrangler secret put for CF prod)
5. **ecosystem.json `infrastructure[]` 또는 `parent.apps.<name>` 의 `db` 필드 객체 schema** (필수):
   ```jsonc
   "db": {
     "type": "neon-postgres",   // or "d1", "upstash-redis"
     "endpoint": "ep-foo-bar-aN-pooler.<region>.aws.neon.tech",  // Neon 만
     "database": "<db-name>",
     "tablePrefix": "<prefix>_*",  // Drizzle tablesFilter (있으면)
     "athsraProject": "<repo>",
     "athsraKey": "DATABASE_URL"
   }
   ```
6. 본 canon `db-endpoints.md` 의 표에 신규 row 추가
7. `bun run typecheck` 으로 ecosystem.json schema 검증

## ecosystem.json `infrastructure[].db` schema 진화 (2026-05-07 P0.0.2)

**과거** (v3.10.19 이전): `"db": "Neon (Postgres)"` (string hint, 혼동 가능)

**현재** (v3.10.20+): 객체 schema (Neon 의 경우):
```jsonc
"db": {
  "type": "neon-postgres",
  "endpoint": "<host>",
  "database": "<db-name>",
  "athsraProject": "<repo>",
  "athsraKey": "DATABASE_URL"
}
```

**backward compat**: consumer (preflight, modfolio diagnostic 등) 가 `typeof db === 'string' ? db : db.type` 으로 fallback. 점진 전환 (Neon sibling 우선 객체 schema, D1 sibling 은 string 또는 객체 둘 다 OK).

## 운영 quick lookup

```bash
# 어느 sibling 의 DB 인지 endpoint 로 역추적
grep -B2 'endpoint.*ep-dawn-poetry' ecosystem.json
# → "Modfolio" parent app 의 db (database = "press", repo = modfolio)

grep -B2 'endpoint.*ep-fancy-shadow' ecosystem.json
# → "Modfolio Press" infrastructure entry (database = "neondb", repo = modfolio-press)
```

## 관련

- canon `secret-store.md` v1.13+ (athsra v3 표준)
- canon `secrets-policy.md` (rotation 권고)
- skill `.claude/skills/preflight/SKILL.md` (DB connection 검증)
- ecosystem.json `infrastructure[].db` 객체 schema (v3.10.20+)
- knowledge/projects/modfolio.md + modfolio-press.md (sibling 별 DB 명시)

## 인시던트 기록

**2026-05-07 — DB endpoint 혼동 정리 (P0.0)**:
- 사용자 보고: modfolio 와 modfolio-press 의 Neon DB 가 혼동 — 사용자가 명시적 매핑 제공
- 근본 원인: modfolio (parent) 의 DB 명이 `press` 로 작명 (우연) → repo `modfolio-press` 와 시각 충돌
- mitigation: 본 canon 신규 + ecosystem.json `db` 객체 schema 확장 (P0.0.2) + projects md 명시 (P0.0.3) + modfolio-press athsra 등록 (P0.0.1)
- password rotate 권고 (transcript 노출 — 사용자 시점 진행)
