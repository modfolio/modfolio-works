---
title: Project Infrastructure Registry — athsra · email · domain · Neon DB 단일 SoT
version: 1.0.0
last_updated: 2026-06-26
source: [2026-06-26 Neon API 전수 인벤토리(org-lucky-rain-45176041, 23 projects — modfolio-on 신설 포함) + athsra envelope host-mapping 검증(19 active app 전부 자기 전용 DB 매핑, 충돌 0) + DB-per-service 정리(little-unit modeng/y2a/neondb drop, opic-mode deprecated) + email-domain-aliases v1.1.0 + domain-architecture v1.0]
sync_to_siblings: true
applicability: always
consumers: [ops, new-app, preflight, deploy, secret, modfolio]
supersedes: []
---

# Project Infrastructure Registry — 단일 조회처

> **목적**: 모든 프로젝트가 자기(와 남의) **athsra 시크릿 프로젝트 · 이메일 · 도메인 · Neon DB** 를 **헷갈림 없이, 충돌 없이** 한 곳에서 확인. 이 표가 4축(secret/email/domain/db) 의 cross-reference SoT 다. DB 상세는 [`db-endpoints.md`], 이메일 메커니즘은 [`email-domain-aliases.md`], 도메인/배포는 [`domain-architecture.md`], 시크릿 표준은 [`secret-store.md`] 로 defer.

## 불변 원칙 (이 레지스트리가 강제하는 것)

1. **DB-per-service**: DB 를 쓰는 모든 앱은 **자기 전용 Neon project** 를 가진다. 통합 DB(한 project 에 여러 앱) 안티패턴 금지. (2026-06-25 결정, `db-endpoints.md` §DB 경계.)
2. **athsra project == repo 이름** (예외 없음 — 검증됨). 시크릿 키 표준 = `DATABASE_URL`.
3. **email = 1 슈퍼계정(`mod@modfolio.io`) 단일 inbox** 로 전 브랜드 도메인 귀결 (GW 별칭 도메인 자동 미러). 앱별 GW 계정 추가결제 없음.
4. **충돌/혼동 발견 시 이 표를 먼저 갱신** — 분산된 곳에 중복 기록하지 않는다(drift 방지).

## 마스터 레지스트리 (2026-06-26 실측 검증)

> Neon endpoint 는 **pooled host** (실제 connection string 의 password 는 athsra `DATABASE_URL` — 여기 명시 X). 모든 Neon project 는 org `modfolio`(`org-lucky-rain-45176041`), region `aws-ap-southeast-1`, plan=free.

| repo / app | 도메인 | 브랜드 이메일¹ | Neon project (id) | Neon endpoint (pooled) | DB | athsra project | CF worker | status |
|---|---|---|---|---|---|---|---|---|
| **modfolio** (parent app) | app.modfolio.io | mod@modfolio.io | little-unit-85427187 | ep-dawn-poetry-a1lxsb75 | **press** ⚠️ | modfolio | modfolio-app | active |
| modfolio (landing) | modfolio.io | mod@modfolio.io | (↑ 동일) | — | — | modfolio | modfolio | landing |
| **modfolio-press** | press.modfolio.io | press@modfolio.io | cool-wind-91337006 | ep-fancy-shadow-a1jjkxil | neondb | modfolio-press | modfolio-press | landing |
| **modfolio-admin** | admin.modfolio.io | admin@modfolio.io | misty-snow-67223068 | ep-twilight-credit-aow1mseq (c-2) | **D1 primary(live)** · neon wired·**empty**³ | modfolio-admin | modfolio-admin | active |
| **modfolio-dev** | dev.modfolio.io | dev@modfolio.io | mute-hall-91451444 | ep-winter-darkness-ao0gxzzw (c-2) | neondb | modfolio-dev | modfolio-dev | landing |
| **modfolio-on** | on.modfolio.io | on@modfolio.io | soft-mud-41838205 | ep-gentle-union-aohdgwzp (c-2) | neondb (+ Upstash Redis 별도) | modfolio-on | modfolio-on | landing |
| **modfolio-docs** | docs.modfolio.io | info@modfolio.io | — | — | — (정적) | modfolio-docs | modfolio-docs | landing |
| **modfolio-ecosystem** | ecosystem.modfolio.io | mod@modfolio.io | — | — | — (관제탑) | modfolio-ecosystem | modfolio-ecosystem-dashboard | active |
| **athsra** | athsra.com · app.athsra.com | athsra@athsra.com→mod | — (self-host) | — | D1 `athsra-tokens` + R2 | athsra | athsra-worker | active |
| **modfolio-infra** (NAS) | hangul.modfolio.io 등 | infra@modfolio.io | — | — | — (NAS 엔진) | modfolio-infra-nas | — | active |
| **modfolio-connect** | connect.modfolio.io | connect@modfolio.io | aged-snow-34248279 | ep-square-night-aou986no (c-2) | **D1 identity primary(live, 3-worker)²** · neon wired·**empty**³ | modfolio-connect | modfolio-connect | active |
| **modfolio-pay** | pay.modfolio.io | pay@modfolio.io | square-lake-18054555 | **prod** ep-autumn-dream-a1hplb1t · **staging** ep-twilight-boat-a1cya12d | neondb (`mp_*`) | modfolio-pay | modfolio-pay | active |
| **naviaca** | naviaca.com | naviaca@naviaca.com→mod | falling-mouse-75084834 | ep-morning-dust-a1lfdtw2 | neondb | naviaca | (cf builds) | active |
| **gistcore** | gistcore.com | gistcore@gistcore.com→mod | sparkling-frost-76453629 | ep-lively-voice-a158fro5 | neondb (`gc_*`) | gistcore | (cf builds) | active |
| **fortiscribe** | fortiscribe.com | fortiscribe@fortiscribe.com→mod | cool-dust-05717743 | ep-curly-hill-a1s2t1vd | neondb | fortiscribe | (cf builds) | landing |
| **atelier-and-folio** | atelierfolio.com | anf@modfolio.io | calm-cherry-46781049 | ep-mute-hall-a1kvx4hs | neondb | atelier-and-folio | (cf builds) | active |
| **pdgd** | pdgd.kr | pdgd@pdgd.kr→mod | gentle-math-03627101 | ep-frosty-grass-ao9e3rrz (c-2) | neondb | pdgd | (cf builds) | active |
| **dle-desk** | dledesk.com | dledesk@dledesk.com→mod | mute-art-06278090 | ep-rapid-pine-a1o8999l | neondb | dle-desk | (cf builds) | active |
| **muje-hwp** | disac.pdgd.kr | muje@modfolio.io | steep-base-24370139 | ep-soft-hall-ao3tq356 (c-2) | neondb | muje-hwp | (cf builds) | landing |
| **keepnbuild** | keepnbuild.com | knb@modfolio.io | little-smoke-86398277 | ep-snowy-rain-aogv8qdp (c-2) | neondb (이전 Turso) | keepnbuild | (cf builds) | landing |
| **worthee** | worthee.io | worthee@worthee.io→mod | fancy-lake-87901954 | ep-still-lab-a1ujjqyh | neondb | worthee | (cf builds) | active |
| **amberstella** | amberstella.com | amberstella@amberstella.com→mod | lingering-pond-64774027 | ep-young-river-aovvxxug (c-2) | neondb (+ R2/DO) | amberstella | (cf builds) | landing |
| **munseo** | munseo.app | munseo@modfolio.io | hidden-cell-94462959 | ep-summer-thunder-aoewj6ki (c-2) | **D1 + R2 primary(live)** · neon wired·**empty**³ | munseo | (cf builds) | active |
| **umbracast** | umbracast.com | umbracast@umbracast.com→mod | plain-silence-62641176 | ep-delicate-firefly-a1dbn5hj | neondb (+ R2) | umbracast | (cf builds) | active |
| **sincheong** | sincheong.app | sincheong@modfolio.io | proud-rice-13550102 | ep-lively-shadow-a1kzjdlg | neondb | sincheong | (cf builds) | active |
| modfolio-works/ls/axiom/studio | (지주/그룹 landing) | works/ls/axiom/studio@modfolio.io | — | — | — (그룹 엔티티, DB 없음) | modfolio-{works,ls,axiom,studio} | — | group |

¹ 브랜드 이메일: `→mod` 표시 = 그 브랜드 도메인 주소가 GW 별칭 도메인 자동 미러로 **`mod@modfolio.io` 단일 inbox 로 귀결**. 트랜잭션 발신은 `noreply@<domain>` + Resend. 상세 = `email-domain-aliases.md`.
² connect: 인증 identity 는 D1 공유(3-worker), Neon(aged-snow) 은 보조. DB 경계 = `db-endpoints.md`.
³ **D1-native 앱(admin·connect·munseo)의 Neon 은 2026-06-25 provisioning 으로 wired 됐으나 비어있음(0 테이블)** — 실 관계형 데이터는 D1(CF 바인딩, athsra 아님)에 있고 라이브. Neon 스키마/데이터 이행은 **앱-사이드 결정·실행**(Hub-not-enforcer) — ecosystem 은 provisioning + DATABASE_URL 배선까지만 책임. ⚠️ 그 앱 코드가 D1 대신 DATABASE_URL(빈 Neon)을 데이터 소스로 오인하지 않도록 주의(현재 D1 사용 중).
⚠️ modfolio parent 의 Neon DB 명이 우연히 `press` — repo `modfolio-press`(별도 project cool-wind) 와 **무관**. 영구 혼동주의.

## 미등록·deprecated (실측 2026-06-26)

| Neon project | 상태 | 비고 |
|---|---|---|
| **silent-snow-52237856** (opic-mode) | **DEPRECATED → gistcore** | 868행(content seed만, **user 0·결제 0**). gistcore(sparkling-frost)가 동일 820 questions + 10배 데이터로 **이미 흡수**. archive 유지($0), 신규 개발 금지. athsra 키는 ecosystem `OPICMODE_*`(레거시). |
| **late-fire-72797808** (project-truename) | scaffold (athsra wired) | 게임 9테이블, **0행**. 전용 Neon + **athsra `project-truename`/DATABASE_URL set (2026-06-26, SELECT 1 OK)**. 도메인 = 활성화 시점. |
| **polished-glade-57627942** (safeframe) | scaffold (athsra wired) | 사진/영수증 `sf_*` 12테이블, **0행**. 전용 Neon + **athsra `safeframe`/DATABASE_URL set (2026-06-26, SELECT 1 OK)**. 도메인 = 활성화 시점. |

## 2026-06-26 정리 기록 (DB-per-service 완주)

- **little-unit (modfolio) 통합 잔재 제거**: `press`(부모앱) **유지**, `modeng`(579행 옛 영어수업)·`neondb`(57행 레거시 멀티앱 course/oauth/old-mp)·`y2a`(빈) **drop**. → 백업 브랜치 `backup-pre-cleanup-2026-06-26` (br-wild-king-a1s07nhl, storage-only $0, 전 DB 스냅샷 보존) + JSON 덤프(modeng 579·neondb 57행) 선행 후 삭제. 복원 = 백업 브랜치.
- **19 active app 전부 자기 전용 Neon 매핑 검증** (athsra `DATABASE_URL` host = 전용 project endpoint). **교차배선/충돌 0건**.
- **modfolio-pay**: prod/staging 2-branch 분리 정상 (prod=ep-autumn-dream, staging=ep-twilight-boat).
- **orphan 앱 정식편입**: project-truename·safeframe → athsra envelope 생성 + pooled DATABASE_URL set + SELECT 1 연결 검증(빈 DB, 전용 project). 도메인/프레임워크 메타는 활성화 시점.
- **stale 키 정리**: ecosystem `NEON_UNIVERSE_API_KEY`(401 죽은 구키) 제거. 활성 `NEON_API_KEY` 유지(rotation 은 사용자 직접 — 채팅 평문노출분).
- **modfolio-on Neon 프로비저닝**: 설계상 Neon 명시(SolidStart, db=Neon+Upstash)였으나 미프로비저닝 → project `soft-mud-41838205`(ep-gentle-union) 신설 + athsra DATABASE_URL set + SELECT 1 OK. (Upstash Redis 는 별도 — 본 작업 범위 밖.) → org 총 **23 Neon projects**.
- **심층 검증(3차)**: DB 스키마 깊이 sweep — active 앱 전부 자기 스키마 보유(gistcore 45·naviaca 50·pdgd 59·pay 47·dle-desk 103 등), **단 D1-native 3앱(admin/connect/munseo)의 Neon=wired·empty**(D1 라이브, Neon 이행 앱-사이드 pending — ³). `athsra doctor --audit` 빈값 키 **0**. 도메인 전 CF·이메일 트리오 완비. ecosystem.json valid. published==main.
- **이메일 인증 트리오 완비** (감사 발견 → CF API 수정): SPF 누락 1건(modfolio.io) + DMARC 누락 13건(brand 도메인 전체 + muje.dev) → CF API 로 배포(modfolio.io SPF=`v=spf1 include:_spf.google.com ~all`, 13 도메인 DMARC=`v=DMARC1; p=none;`). → **15 CF 도메인 전부 SPF+DKIM+DMARC 완비**(deliverability). 라이브 전 도메인 CF, 17 serving + 3 landing(미배포). modfolio.co.kr(CF 외 DNS) 제외.

## 패키지 레지스트리 (dual-registry — 소비 혼동 주의)

`@modfolio` scope 는 **이중 레지스트리**다. consumer `.npmrc` 의 `@modfolio:registry` 가 scope 전체를 한 곳으로 보내므로 주의:

| 패키지 | 레지스트리 | 비고 |
|---|---|---|
| `@modfolio/connect-sdk` | **public npm** (registry.npmjs.org, token-free) | latest 8.1.0. GitHub Packages 미러는 **legacy 7.3.0 정체** |
| `@modfolio/contracts` · `harness` · `connect-foundation` · `connect-core` | **GitHub Packages** (private, `npm.pkg.github.com`) | `GITHUB_TOKEN` 필요 |

⚠️ **gotcha**: sibling 의 `.npmrc @modfolio:registry=https://npm.pkg.github.com`(contracts/harness 수신용)가 connect-sdk 까지 GH(7.3.0)로 끌어내려 **8.x 미수신**. npm `.npmrc` 는 per-scope 만(per-package override 불가). 근본수정 = connect 가 GH Packages 미러를 8.1.0 으로 dual-publish (connect 자율, opinion routed). 버전 실측 = `curl https://registry.npmjs.org/@modfolio/connect-sdk`.

## 신규 앱 도입 시 (이 표 갱신 필수)

1. Neon project 생성 → `db-endpoints.md` §신규 절차.
2. athsra `init <repo>` + `set <repo> DATABASE_URL=...` (write 는 master-pw 필요).
3. 도메인 = `domain-architecture.md` 패턴. 이메일 alias = `email-domain-aliases.md`.
4. **본 표에 row 추가** (4축 전부) + ecosystem.json `infrastructure[].db` 구조화 필드.

## 관련 canon

- `db-endpoints.md` — Neon/D1 endpoint DB 상세 + DB 경계 원칙
- `email-domain-aliases.md` — GW 단일 inbox + 별칭 메커니즘
- `domain-architecture.md` — 도메인/worker 명명 + 배포
- `secret-store.md` — athsra v3 시크릿 표준
- `billing-architecture.md` — pay = 돈 SoT (mp_* DB)
