---
title: modfolio-db — Modfolio DB 시스템 (self-host 본진 · NAS mf-kr-1)
version: 1.0.0
last_updated: 2026-08-23
source: [ADR-022 (2026-08-23 오너 승인, 외부 AI 검토 v1 반영), 2026-08-23 Neon API 전수 실측 + NAS 69 컨테이너 실측, 상세 설계서 modfolio_db_system_plan_2026-08-23.md]
sync_to_siblings: true
applicability: always
consumers: [dev, ops, deploy, secret, new-app, preflight]
supersedes: []
---

# modfolio-db — Modfolio DB 시스템

> **상태 (2026-08-23 실측): Wave 0 완료 · Wave 1 리전 가동.** dev 전환 안내는 각 repo 에
> `feedback/` 패킷으로 도착한다 — **이 canon 을 읽고 미리 전환하지 말 것**(좌표는 안내가 SoT).
> 결정 전문 = ADR-022. 이 canon 은 멤버가 알아야 할 규범만 담는다.
>
> ```
> mfdb-postgres  PG 18.6 · ssl=on · pgvector 0.8.6 · tailnet :5433   가동
> mfdb-valkey    Valkey 9 · :6380                                      가동
> mfdb-nats      NATS 2.14.5 JetStream · :4222                         가동
> mfdb-neon-http Bearer 인증 멀티테넌트 프록시 · :4445                  가동
> ```
>
> **`@neondatabase/serverless` 경로도 이제 열렸다.** 라이브 왕복 검증 10/10 (단문 타입 파싱 ·
> batch 트랜잭션 · SQLSTATE 정확 전달 · 인증 4대조 · 미재현 경로 501).

## 한 줄

**NAS(`mf-kr-1`)가 Modfolio DB 시스템의 본진이다.** dev 는 즉시, prod 는 앱별 게이트 통과 순.
Neon 등 managed 는 스케일이 오면 **영역별로** 사는 escape route 다.

## 왜 (실측 2026-08-23)

Neon 무료 소진의 기전은 부하가 아니라 **깨어 있던 시간**이다 — CU 비율이 전 project
0.25~0.28(최소 오토스케일 고정)이라 `100 CU-h ÷ 0.25 = 400h = 하루 13.3시간`이면 소진.
pdgd 10.2 h/day·pay 8.6 h/day = 개발 근무일 그 자체. 그리고 로컬 dev DB 를 가진 repo 는
pdgd 뿐이었다 — **전 repo 의 `bun run dev` 가 프로덕션 Neon 을 치고 있었다.**

## 멤버가 지켜야 하는 것 (MUST)

1. **데이터 계급 선언** — `ecosystem.json` 자기 항목의 `dataSubstrate: managed|cf-native|
   self-hosted` (허브가 `bun run data:substrate` 로 검사). 자기 실측과 미러가 다르면 repo
   실측이 SoT(ADR-014) — `feedback-send` 로 정정 통보
2. **dev 전환은 안내 패킷의 좌표로** — athsra `DEV_DATABASE_URL`(+`DEV_DB_TOKEN`) 를 받으면
   dev 스크립트만 그쪽으로. **prod `DATABASE_URL` 은 건드리지 않는다**
3. **드라이버를 바꾸지 않는다** — `@neondatabase/serverless` 는 그대로. dev 는
   `neonConfig.fetchEndpoint`(mfdb 프록시) + `authToken` 만 설정한다. postgres-js 로 갈아타면
   dev 가 prod 와 다른 의미론(`db.batch()`·무트랜잭션)으로 돌아 dev-green/prod-red 가 된다
4. **prod 이전은 게이트 통과 후** — ADR-010a 4게이트(금융·인증 아님 / 유료 사용자 0 /
   **복원 drill 통과** / 무결성 요건) + canonical 은 PITR(pgBackRest+WAL) 필수 +
   **Hyperdrive Compatibility Gate**(advisory lock·LISTEN/NOTIFY·요청 간 PREPARE·세션 SET
   미사용) 통과. 이전은 각 repo 판단(Hub-not-enforcer)
5. **금융(pay)·인증(connect D1)은 이동 금지** — `db-endpoints.md` 경계 그대로

## 구조 (요약 — 전문 ADR-022)

```
① 데이터 평면   앱 ↔ 자기 DB 직접. 게이트웨이 없음 (Zero Physical Sharing)
② 제어 평면    mfdb CLI: provision / cell / snapshot / drill  (주인 modfolio-infra)
③ 거버넌스     결정적 가드 · append-only 감사 · 정책 파일 agent-deny
```

- **인스턴스 공유 · 데이터 격리**: `mfdb-postgres`(pg18+pgvector) 하나에 repo 당
  `CREATE DATABASE <repo> OWNER app_<repo>` + `REVOKE CONNECT … FROM PUBLIC` —
  DB-per-service 의 dev-티어 구현이다(통합 DB 아님)
- **인증은 identity**: `mfdb-neon-http` 프록시는 Bearer(`DEV_DB_TOKEN`)→서버측 매핑으로
  대상 DB 를 정한다. `Neon-Connection-String` 헤더는 호환성 파라미터일 뿐 권한 근거가 아니다
- **prod 경로 2종**(앱별 선택):
  - **A = Hyperdrive + Workers VPC — 2026-08-23 라이브 통과.** Worker→Hyperdrive→VPC
    (verify_full·hostname)→Tunnel→NAS **PG 18.6**. 드라이버 기본 설정으로도 성공(311ms).
    ⚠ **공식 지원 매트릭스는 9.0–17.x** — 「지원 밖」이지 「불가능」이 아니다. 회귀 시
    지원을 못 받는 위험은 우리가 진다. #10791 미재현 이유는 **미검사**
    ⚠ **선결: 공인 인증서.** Hyperdrive 는 VPC 의 검증 모드와 무관하게 자체 검증하고,
    VPC 경유 시 CA 업로드가 불가(`mtls cannot be used with service_id`)라 자가서명은
    원리적으로 통과 못 한다. LE(DNS-01) + VPC **hostname 모드**가 답이다(IP 모드면 불일치)
  - **B = Tunnel+Access → mfdb-neon-http** (dev 와 동일 드라이버·의미론) — ⚠ **미구축**.
    prod 노출·Access service token 이 아직 없다. 비교 지연도 미측정
- **백업**: RPO(`maxDataLoss`)+RTO(`maxRecoveryTime`) 쌍 선언 · 복원 drill(`bun run
  drill:restore -- --target <repo>`) — 0행 복원 = 판정 불능(exit 2), 성공 아님. **`data:substrate`
  게이트가 drill 신선도(30일)를 본다** — 스케줄러 없이도 노후가 빨갛게 뜬다
- **불변 백업 티어**: `r2://modfolio-db-immutable` (30일 Age lock — 삭제 거부 실증 완료).
  ⚠ **restic 버킷은 일부러 잠그지 않는다** — `--keep-daily 7 --keep-weekly 5 --keep-monthly 12
  --prune` 이 도는 곳이라 잠그면 prune 이 실패하고 저장소가 무한히 자란다. 계획의
  「백업 prefix 를 잠근다」를 그대로 실행했으면 백업을 지키려다 백업을 깨뜨렸을 것이다
- **Cells**: 목적 단위 격리 소형 DB. durable = sqlite/libsql 만, turso-rust 는 frontier 병행.
  **이벤트**: `mfdb.outbox` 트랜잭션 기록 → relay → NATS `mfdb.*` — **universe 앱간 계약은
  불변**(contracts/webhook — Workers 는 NATS 구독 물리 불가)

## Differential Conformance Harness (프록시 신뢰의 근거)

동일 SQL corpus 를 **실 Neon 과 mfdb 프록시에 동시 전송** → semantic 동일성 비교:

```
corpus   DDL·DML·타입 왕복(numeric/timestamptz/jsonb/bytea/array) · 에러 유발(SQLSTATE) ·
         batch 의미론 전 조합(Neon-Batch-Isolation-Level × Read-Only × Deferrable — 드라이버
         1.1.0 이 실제로 보내는 헤더 6종 실측) · fullResults/arrayMode/rawTextOutput 조합
비교     JSON 구조 · SQLSTATE · 트랜잭션 결과 · 타입 serialization
판정     불일치 = 프록시 결함(기본). 의도적 미재현은 README 열거 + 프록시가 명시 에러
대상     사용량 0 scratch Neon project (corpus 비용 미미)
```

green = "Neon-호환 HTTP 층"이라는 **검증된 Modfolio 기술 자산**. 조용한 불일치 금지.

**현 상태 (2026-08-23): 25/25 동일 — 「Neon 과 같게 돈다」를 주장할 수 있다.**
실행 = `athsra run modfolio-infra-nas -- bun scripts/mfdb-conformance.ts` (infra).

⚠ **두 번, 라이브 대조가 아니었으면 못 잡았을 것을 잡았다.**
① 초판이 `Neon-Raw-Text-Output` 을 «미재현» 으로 명시 거부했는데 그 헤더는 옵션이 아니라
   드라이버가 **매 요청에 항상 보내는 와이어 규약**이었다 — **모든 쿼리가 501**.
② 그 뒤 왕복은 10/10 통과했지만 차등 대조가 **23/25** 를 냈다: **배열이 빈 배열로** 왔다
   (postgres.js 가 `fetch_types` 로 배열 파서를 별도 층에 만들어 우리 항등 override 를 우회).
   **프록시만 보면 «배열이 왔다» 로 보인다 — Neon 을 옆에 세워야 «다른 배열» 이 보인다.**

## 하지 않는 것

- ❌ 데이터 경로 중앙 게이트웨이 · 전 앱 공유 단일 DB
- ❌ 클라이언트 제공 헤더를 권한 근거로
- ❌ beta(pg19·turso-rust·RustFS)를 canonical 데이터의 유일 사본 자리에
- ❌ outbox 없는 mfdb 이벤트 발행 · Lock 없는 백업 prefix
- ❌ pdgd repo 직접 수정(포함 = 기질 제공·조율이지 대리 작업이 아니다)

## 미검사 축 (초록으로 읽지 말 것)

- Hyperdrive PG18 — **차단 확인**(미검사 아님), 해소 시점 미지(workers-sdk #10791 추적)
- 경로 B 실지연·Access token 운영성 — Wave 2 실측 전 미판정
- Neon 전송량 계량 — **API 관측 불가**(consumption_history = Scale 전용, 2026-08-23 403 실측).
  스코프는 라이브 자연실험(project 정지 중 타 project 정상)으로 project-단위 판정
- sqld namespace·turso-rust multi-process 제약 — lab 진입 시 실측

## 관련

ADR-022(결정 전문) · ADR-010a(4게이트) · ADR-021(Neon 사건, 정정 포함) ·
`project-infrastructure-registry.md`(4축 SoT) · `db-endpoints.md`(경계) ·
`free-tier-ledger.md`(무료 한도 원장) · `nas-infra.md`(NAS 토폴로지) ·
`secret-store.md`(athsra — lease 경계는 ADR-022 D12)
