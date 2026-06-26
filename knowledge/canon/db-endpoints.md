---
title: DB Endpoint Mapping — modfolio universe (혼동 방지 lookup)
version: 1.1.0
last_updated: 2026-06-26
source: [P0.0 DB endpoint 혼동 정리 cycle (2026-05-07), 2026-06-26 Neon API 전수 인벤토리(23 projects, org-lucky-rain-45176041) + DB-per-service 완주(little-unit 통합잔재 제거 · opic-mode deprecated · 19 active app 전용 DB 검증) — 전체 per-app 4축 표는 project-infrastructure-registry.md]
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

> **전체 per-app 표(domain·email·Neon project/endpoint·athsra·cf·status 4축)는 [`project-infrastructure-registry.md`] 가 단일 SoT** (2026-06-26 Neon API 전수 검증). 본 문서는 **DB 경계 원칙 + 작명주의 + 변경기록**에 집중 — 중복 표를 유지하지 않는다(drift 방지).

**요약 (2026-06-26 실측)**: Neon project **23개**(org `modfolio`/`org-lucky-rain-45176041`, region ap-southeast-1, plan=free; modfolio-on 신설 포함). **19 active app 전부 자기 전용 Neon project 매핑 검증** (athsra `DATABASE_URL` host = 전용 project endpoint), **교차배선/충돌 0건**. 통합 DB 안티패턴(little-unit 1 project 에 press/modeng/y2a/neondb 4 DB) **제거 완료** → `press`(부모앱) 만 잔존. D1 사용처(connect 의 identity 공유 D1, athsra 의 `athsra-tokens`)는 Neon 과 **병존**(인증/토큰 경계). pay 는 prod/staging 2-branch.

(Neon endpoint 는 pooled host name 만. password 는 athsra `DATABASE_URL` / wrangler secret 보관 — 본 canon 에 명시 X.)

## DB 경계 원칙 (bounded context — 공용 DB 금지)

2026-06-14 결정 (Codex 점검 정합). **공유는 DB 가 아니라 SSO token · event/webhook · contracts/registry 로만** (Zero Physical Sharing). DB 는 bounded context 별로 **분리**:

- **modfolio (parent)** — Data Hub 전용 Neon. 자기 컨텍스트만.
- **modfolio-pay** — 결제/정산/원장 전용 Neon (`mp_*`). parent Neon 과 **공유 금지** (금융 경계).
- **modfolio-connect / account / login** — Connect 내부 **identity D1** 공유 (3-worker 가 같은 D1). **Neon 아님**, parent Neon 으로 **합치지 말 것** (인증 경계 흐려짐).
- **modfolio-press** — 별도 Neon. parent 의 DB 명이 우연히 `press` 라 혼동 주의 (문서·registry 에서 계속 강하게 구분).
- **자회사 앱** — 앱별 별도 Neon project 권장. 비용 예외 필요 시 **같은 Neon organization 안에서만** 묶고 project/DB 는 분리 (cross-tenant 격리 유지).

근거: 인증·결제·허브 데이터 경계가 흐려지면 blast radius·마이그레이션 커플링·권한 사고가 커진다. "공용 DB" 의 편의 < 경계 분리의 안전.

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

- **canon `project-infrastructure-registry.md` — 전 프로젝트 4축(athsra·email·domain·Neon) 마스터 SoT (이 표의 권위 상위 문서)**
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

**2026-06-26 — DB-per-service 완주 + 통합 DB 제거**:
- Neon API 전수 인벤토리(22→23 projects, modfolio-on 신설) + athsra host-mapping 검증: **19 active app 전부 자기 전용 Neon project, 교차배선 0**.
- **little-unit (modfolio) 통합 잔재 제거**: `modeng`(579행 옛 영어수업)·`neondb`(57행 레거시 멀티앱)·`y2a`(빈) drop, `press`(부모앱)만 유지. 백업 = 브랜치 `backup-pre-cleanup-2026-06-26`(br-wild-king, storage-only $0, 전 DB 보존) + JSON 덤프 선행.
- **opic-mode (silent-snow) deprecated**: 868행 content seed만(user 0), gistcore(sparkling-frost)가 동일 820 questions+10배로 이미 흡수 → archive 유지, 신규 개발 금지.
- 발견: ecosystem.json 의 일부 `db` 힌트(admin/dev/connect/keepnbuild/amberstella/munseo/umbracast 의 "D1"/"Turso")가 stale — 06-25 DB-per-service provisioning 후 Neon 으로 전환·병존. **project-infrastructure-registry.md 가 검증된 권위**.
