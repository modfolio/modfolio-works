---
title: modfolio-db — Modfolio DB 시스템 (self-host 본진 · NAS mf-kr-1)
version: 2.1.0
last_updated: 2026-09-16
source: [ADR-022 (2026-08-23 오너 승인, 외부 AI 검토 v1 반영), **오너 결정 2026-09-16 (mfdb = 메인·프로덕션 · 모든 앱)**, 2026-08-23 Neon API 전수 실측 + NAS 69 컨테이너 실측, 2026-09-16 data:substrate 실측(24/14/10/0), 상세 설계서 modfolio_db_system_plan_2026-08-23.md]
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

**NAS(`mf-kr-1`)가 Modfolio DB 시스템의 본진이다 — dev 도 prod 도.** 목적지는 **모든 앱**이고,
managed 는 회사 규모가 커졌을 때 여는 escape route 다.

### ⚠ 2026-09-16 오너 결정이 이 줄의 기본값을 뒤집었다

이 자리에는 원래 *"prod 는 앱별 게이트 통과 순. Neon 등 managed 는 스케일이 오면 영역별로 사는
escape route 다"* 가 있었다. 즉 **managed 가 기본이고 self-host 가 선택**이었다. 오너가 반대로 정했다:

> mfdb 를 메인이자 프로덕션 DB 로 삼는다 — 예외 없이 모든 앱. 직접 구축하되
> 회사 규모가 커지면 유료 클라우드 서비스로 옮길 수 있게 만들어 둔다(원문 비공개 — _quotes.md#CN-35)

**무엇이 바뀌었고 무엇이 안 바뀌었나 — 이 구분이 전부다.**

| | 전 | 후 |
|---|---|---|
| **결정** (갈지 말지) | 앱마다 판단 | **정해졌다 — 모든 앱이 간다** |
| **경로** (어떻게 가나) | 아래 MUST 4 의 게이트들 | **그대로다** |

게이트는 «갈지 말지»를 묻는 장치가 아니라 **«안전하게 도착했는가»를 재는 장치**다. 결정이
내려졌다고 복원 drill 이나 PITR 이 면제되지 않는다. 순서가 바뀐 것뿐이다 —
전에는 «게이트를 통과하면 갈 수도 있다», 지금은 «가기로 했으니 게이트를 통과시켜라».

**이식성은 이미 갖춰져 있다 — 새로 만들 것이 없다.** 오너 요구(나중에 유료 클라우드로 옮길 수도 있게 —
원문 비공개 — _quotes.md#CN-28)는 **아래 MUST 3 이 그 구현이다**: 드라이버가 `@neondatabase/serverless` 로
고정돼 있어 mfdb 프록시와 managed Neon 이 같은 wire protocol 을 쓴다. 옮기는 일은
엔드포인트 교체이지 재작성이 아니다. 이 canon 을 읽고 «이식 계층을 만들어야겠다» 로 가지 말 것.

**출발점 실측** (2026-09-16 `bun run data:substrate`): db 항목 **24** · managed **14** ·
cf-native **10** · **self-hosted 0**. 오늘 mfdb 를 프로덕션으로 선언한 앱은 하나도 없다.
이 결정은 24개 선언을 전부 움직인다.

## 법 — 예외 없음 (오너, 2026-09-14 · 2026-09-16 재확인)

> (원문 비공개 — _quotes.md#CN-15) mfdb 를 메인이자 프로덕션 DB 로 — **예외 없이 모든 앱**(pay·connect 도 · 오너 지시가 MUST).
> 사용자가 10명 미만인 지금은 **유료 클라우드 DB 를 쓰지 않고** NAS 로 제대로 한다.
> (2026-09-14 pay 세션) Neon 은 백업으로 두다가 사용자가 **수백 명**이 되면 그때 유료로 쓴다.

**금융(pay)·인증(connect) 예외는 없다.** 이 canon 의 옛 MUST 5 와 ADR-010a 4게이트의
«금융·인증 아님» 전제는 **폐기**됐다. 오너 결정이 ADR 보다 위다 — ADR 은 그 결정을 기록하는 자리다.

⚠ **이 문단은 두 번 늦었다.** 오너는 2026-09-14 에 뒤집었고 ADR-022 D3 이 2026-09-15 에
기록했는데, **이 canon 의 MUST 5 는 옛 문장을 그대로 들고 있었다.** 2026-09-16 에 허브 세션이
canon 만 읽고 ADR 을 안 봐서 «미해결 경계» 로 오판했고, 그 오판이 편지 3장으로 나갔다.
→ 교훈은 규칙이 아니라 **배치**다: 뒤집힌 문장은 «주석을 달» 게 아니라 **지워야** 한다.
살아 있는 옛 문장은 다음 사람이 그것을 현행으로 읽는다.

### 되돌아보는 조건 (이 결정이 언제 재검토되나)

**사용자 수백 명.** 그 전에는 managed 유료 전환을 제안하지 않는다 — 비용이 이 결정의 근거다.
지금 사용자는 10명 미만이고, 그 사실이 바뀌면 그때 다시 잰다.

### 세 부류 — 「모든 앱」이 실제로 뜻하는 것 (2026-09-16 제품 코드 실측)

| 부류 | 수 | 이전 형태 | 비용 |
|---|---|---|---|
| **A. 이미 mfdb** | 4 | atelier-and-folio · modfolio-ecosystem · **modfolio-pay** · pdgd | 완료 |
| **B. Neon DSN 만** | 8 | dle-desk · fortiscribe · gistcore · modfolio-press · naviaca · sincheong · visualize · worthee | **DSN 교체** — 드라이버 동일(MUST 3), 엔드포인트만 바뀐다 |
| **C. D1 또는 DB 없음** | 11 | modfolio-connect · modfolio-admin · modfolio-sign · modfolio-notify · amberstella · keepnbuild · modfolio-dev · modfolio-on · muje · munseo · umbracast | **스키마 이전** — D1(SQLite) → PG. 방언·트랜잭션 의미론이 다르다 |

**B 가 싼 이유가 곧 MUST 3 이 존재하는 이유다.** 드라이버를 `@neondatabase/serverless` 로
고정해 뒀기 때문에 mfdb 프록시와 managed Neon 이 같은 wire protocol 을 쓴다 — 이전이
엔드포인트 교체이지 재작성이 아니다. **C 는 그 보호를 못 받는다**(D1 은 다른 엔진이다).

⚠ **C 를 B 처럼 견적 내지 않는다.** connect 는 소스 7,082 파일에 Neon 드라이버 참조가
**0건**이다 — 순수 D1 이다. 「모든 앱」에 포함되지만 **일정은 A·B 와 다른 단위**다.

### 왜 DB 를 나누는가 — 그리고 그 대가는 무엇인가 (ADR-023 · 2026-09-16)

오너가 물었다(원문 비공개 — _quotes.md#CN-16): 통합이어야 하지 않는가 — 사본을 만들어 동기화하는 방식이 맞는가.
정확한 질문이고, 답은 실측에 있다:

```
mfdb=# SELECT count(*) FROM modfolio_connect.public.users;
ERROR: cross-database references are not implemented
```

**PostgreSQL 은 DB 를 건너뛰는 질의를 못 한다.** 그래서 DB-per-service 는 «남의 엔티티를
쓰려면 사본(읽기 모델)을 가져라» 를 강제한다. 그 사본이 낡지 않으려면 **전파 계층**이 있어야
하고, 그것이 ADR-022 D10 의 outbox 다 — 2026-09-16 실측: **설계만 있고 어느 DB 에도 없었다.**

그래도 DB 를 나누는 이유는 **성장**이다(ADR-023 D1): 독립 배포·마이그레이션·복원·이전.
«한 DB · 앱별 스키마» 는 지금 규모에 더 편하지만 **되돌리기 어려운 방향**이라 기각했다
(ADR-023 D2 — 숨은 DDL 결합 · 한 앱만 복원 불가 · 클라우드 이전이 big-bang).

멤버가 지킬 것 둘:
- **사본은 갱신 경로를 가진다.** 세션 있는 경로는 SSO 토큰이 갱신한다. **세션 없는 경로**
  (뒤늦은 영수증 · 예약 알림 · 관리자 목록)가 있으면 `user.updated` 를 `subscribesTo` 로
  선언한다. 갱신 경로 없는 사본은 캐시가 아니라 조용히 낡는 데이터다.
- **상태를 바꾸는 트랜잭션은 outbox 행을 같이 쓴다.** 모양은 `contracts/events/outbox.ts`.
  `user.deleted` 처럼 «세션이 없어진 뒤 해야 할 일» 은 이 경로 말고는 전달될 수 없다.

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
4. **prod 이전은 게이트 통과 후** — canonical 은 PITR(pgBackRest+WAL) 필수 +
   **복원 drill 통과** + 무결성 요건 + **Hyperdrive Compatibility Gate**(advisory lock·
   LISTEN/NOTIFY·요청 간 PREPARE·세션 SET 미사용).
   ⚠ **게이트는 «갈지 말지» 를 묻지 않는다** — 목적지는 정해졌다(위 §법). 게이트가 묻는 것은
   **«안전하게 도착했는가»** 뿐이고, 결정이 내려졌다고 면제되지 않는다. 각 repo 가 정하는 것은
   **시점과 순서**다.
   ⚠ ADR-010a 4게이트의 첫 항목 «금융·인증 아님» 은 **폐기**됐다. 금융·인증이라서 **더 엄격한**
   drill·PITR·parity 를 요구하는 것이지, 제외 사유가 아니다. pay 가 그 형태를 이미 보여줬다
   (이전 전후 `db:parity` «검사 17개 · 표 54개 전부 같다» · 2026-09-14).
5. **경계는 유지된다 — 「한 인스턴스」가 「한 DB」가 아니다.** `db-endpoints.md` 의 격리 경계
   (pay 결제 원장 · connect identity)는 **이전 뒤에도 그대로**다: 같은 `mfdb-postgres` 안에서
   `CREATE DATABASE <repo> OWNER app_<repo>` + `REVOKE CONNECT … FROM PUBLIC`.
   **DB-per-service 의 self-host 구현이지 통합 DB 가 아니다.** 옮긴다고 합치지 않는다.

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
  - **B = Tunnel+Access → mfdb-neon-http** (dev 와 동일 드라이버·의미론) — **2026-08-23
    개통, 2026-08-25 허브 재검증.** 좌표 `https://mfdb-api.modfolio.io/sql` ·
    Access 서비스토큰(`CF-Access-Client-Id`/`-Secret`) 문지기 + `Authorization: Bearer
    <테넌트 토큰>` 이 **대상 DB 를 정한다**(identity). 재검증 3단: Access 없이 403 ·
    토큰으로 `/healthz` 200 · pdgd 테넌트로 실 SQL 왕복 `db=pdgd user=app_pdgd
    PostgreSQL 18.6`. 비교 지연은 아직 미측정
    > ⚠ [역사] **이 줄은 2026-08-25 까지 「미구축. prod 노출·Access service token 이 아직
    > 없다」로 남아 있었고 개통 이틀 뒤였다.** pdgd 가 그 문장을 근거로 «공개 종점이
    > 없습니다» 라고 판단해 blocking 요청을 올렸다 — **멤버를 막은 것은 인프라가 아니라
    > 허브의 낡은 문장이다.** 「낡은 운영 문서는 조용히 틀리지 않는다 — 사건 중에 틀린다」
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
