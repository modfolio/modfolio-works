---
title: Modfolio Universe — Billing / Credit / Entitlement Architecture (결제·크레딧·구독 표준 SoT)
version: 1.3.0
last_updated: 2026-07-03
source: [2026-06-22 사용자 결정(pay=중앙 SoT·통합 지갑+구독·entitlement 실시간), modfolio-pay 0.7.0 현황(Toss·wallet·credit-rates·subscriptions 30+ 테이블), contracts 1.5.0(credit/subscription/entitlement events + billing 인터페이스 + SSO claim; 1.4.0 event user_id 비-UUID 완화, 1.5.0 BalanceResponse.tier + EntitlementsSnapshot 통합 계약 GAP 확정), 2026-06-25 pay session-19(coarse-entitlement provider 구현 완료 `9b103a0` · contracts validator wholesale swap 비viable 확정), 2026-07-03 v1.3.0 앱 온보딩 플레이북 추가 + contracts 현행 1.7.0 재검증(EntitlementsSnapshot 요약에 user_id 누락 정정 — 스키마 정합)]
sync_to_siblings: true
applicability: always
consumers: [pay, sso-integrate, new-app, api, ops]
supersedes: []
---

# Modfolio Universe — Billing / Credit / Entitlement Architecture

결제·크레딧·구독·접근권(entitlement)의 **단일 SoT**. `payment-safety.md`(agent 무단 지출 차단 가드)와 **다른 문서** — 이건 "사용자 결제를 받고 서비스를 제공하는" 제품/사업 아키텍처다.

## 「확정」 (canonical — 재논의 아님, 변경 시 이 블록만 갱신 후 sync)

### 1. modfolio-pay = 돈의 단일 SoT (merchant-of-record)
- 결제·정산·환불·지갑·크레딧·구독·credit-rate 의 **유일 권위 소스**. PG = **Toss Payments**(사용자 사업자 심사·정산). PortOne 은 legacy.
- 합법 모델: 결제 → **사용자 사업자 입금(pay = merchant)** → 각 프로젝트는 **그에 상응하는 서비스 제공**(service delivery). pay 가 돈을 들고, 프로젝트는 entitlement/credit 을 **소비만** 한다.
- 다른 어떤 프로젝트도 자체 결제·자체 격리 크레딧을 **새로 만들지 않는다**. 전부 pay 를 통한다.

### 2. 통합 크레딧 지갑 + 구독 (사용자당 단일)
- **통합 지갑**: 사용자당 **크레딧 잔액 1개**. 한 번 충전 → 어느 프로젝트에서나 소비. 프로젝트별 **소비 rate**(pay `credit-rates`)로 환산(예: gistcore N/use, umbracast M/use).
- **구독**: 플랜 = universe-wide 또는 `project_scope` 한정. 구독 → entitlement 파생.
- **entitlement** = 구독/크레딧/관리자 grant 로부터 파생된 **접근권**(`entitlement_key`, 예 `gistcore.realtime`).

### 3. 실시간 전달 (stale 금지)
- **잔액·구독·entitlement 의 권위 = pay 실시간 API**(`@modfolio/contracts/billing` `BalanceResponse`/`EntitlementCheckResponse`). **항상 fresh** — 소비 판단에 stale 값 신뢰 금지.
- **웹 실시간 반영**: pay 가 **live push**(SSE/WebSocket, CF Durable Object — `agents-sdk`/`durable-objects` skill) 로 잔액 변화를 구독 클라에 밀어 UI 즉시 갱신.
- **SSO 토큰 claim(`@modfolio/contracts/sso` `entitlements`)**: `active_plans`/`tier` **coarse 게이팅 전용**. 빠른 1차 분기에만 — **잔액·미터링 판단 금지**(짧은 TTL + 실시간 API 보완).

### 4. 소비 = atomic debit (원자적·idempotent)
- 프로젝트가 크레딧을 쓸 땐 pay 에 **atomic debit**(`DebitRequest` → `DebitResponse`) 호출. `idempotency_key` 필수(중복 소비 방지). 부족 시 `rejected`(insufficient_credits) — 권위 결과.
- feature gate 는 `EntitlementCheckRequest`(실시간) 또는 SSO coarse claim(1차) → 정밀은 항상 pay.
- 실패-자동환불 패턴(예: umbracast 변환 실패 시 크레딧 복원) = `credit.refunded` + debit 역연산.

### 5. 계약 (contracts 1.5.0+, ecosystem 정의)
- **이벤트**(`@modfolio/contracts` — 사후 동기화·캐시 무효화·감사 미러, 권위 아님):
  `credit.topped_up`/`credit.consumed`/`credit.refunded` · `subscription.activated`/`.changed`/`.cancelled` · `entitlement.granted`/`.revoked`. (이벤트 `user_id` 는 1.4.0 부터 `z.string()` — Connect id 비-UUID 정합.)
- **emit 검증 = pay 로컬 drop-safe lenient (의도적 · 2026-06-25 확정 — wholesale swap 비viable)**: contracts 이벤트 스키마는 **공유 subset 의 additive SoT** 이지 pay emit 의 strict 게이트가 **아니다**. pay 는 contracts **superset producer** — contracts 미정의 이벤트(`subscription.renewed`/`.plan_changed`/`.paused`/`.resumed`/`.renewal_failed` · `payment.failed`·`payment.partial_refunded`·`wallet.balance_low`·`budget.alert.triggered`)를 emit 한다(import 할 shared 스키마 자체가 없음). 겹치는 이벤트도 pay `publishEvent` 는 `z.number()` 로 유지(정수/양수 불변식은 ledger source 가 보증) — contracts 의 `.positive()`/`.nonnegative()`/`.datetime()`/`event_id: z.string().uuid()` 를 emit-validator 로 그대로 채택하면 **구조적-정상 정산 이벤트가 outbox 도달 전 silent drop**(특히 outbox 재전송 경로 `event_id = nanoid()` ≠ uuid). → **contracts 는 additive SoT 유지 · pay 는 lenient emit validator 유지**. 정합 보증 = pay `event-schemas.contract.test.ts`(겹치는 이벤트 대표 emit 이 shared 스키마를 만족하는지 양방향 shape-drift lock + 비-UUID user_id 수용 lock).
- **소비 인터페이스**(`@modfolio/contracts/billing`): `BalanceQuery`/`BalanceResponse`(`tier?` = coarse 등급 소스, pay=SoT) · `DebitRequest`/`DebitResponse` · `EntitlementCheckRequest`/`EntitlementCheckResponse` · `EntitlementsSnapshotQuery`/`EntitlementsSnapshot`(`{user_id,active_plans,tier?,as_of}` — connect SSO hot-path 전용 coarse projection; **pay 제공됨 2026-06-25 `9b103a0`** — `GET /api/v1/billing/entitlements-snapshot`(신규) + `BalanceResponse.tier`(`GET /api/v1/billing/balance`), M2M api-key auth(Connect 서비스키); tier taxonomy `free<standard<pro<enterprise`(`billing-tier.ts` 단일소스, 미매핑 plan=undefined 로 over-grant 방지)).
- **SSO claim**(`@modfolio/contracts/sso`): `entitlements:{active_plans,tier?}` (coarse). 소스 = pay `BalanceResponse`/`EntitlementsSnapshot`.
- consumer 는 **published `@modfolio/contracts`** 만 의존(`file:` 금지 — `contracts.md`).

### 6. PayMode (test/live)
- per-order test/live(`X-Pay-Mode`) — athsra 4D 드릴 진행분 흡수. test key(`mpak_test_*`)·webhook·credit-rate(overage)는 pay 측 확정 후 본 canon 에 cement.

## 경계 (역할 분리)
- **ecosystem**: 계약(events·billing·SSO claim) + 본 canon + per-sibling 구현 spec(opinion). **구현 안 함**.
- **modfolio-pay**: 실시간 balance/entitlement API + live push + atomic debit + 이벤트 emit 구현(SoT).
- **modfolio-connect**: SSO 토큰 hot-path 에서 pay `balance`/`entitlements-snapshot` 호출(`resolveEntitlements` — 짧은 TTL 캐시 + 실패 시 claim 생략으로 graceful degrade, 로그인 안 막음; 인증 = pay service key/athsra `PAY_SERVICE_KEY`) → coarse `entitlements:{active_plans,tier}` claim 주입. pay 이벤트 수신 시 캐시 무효화 + CAEP `token-claims-change`.
- **소비 프로젝트**: 표준 entitlement-check + debit 채택. 자체 격리 크레딧/entitlement 은 pay 통합으로 마이그레이션(umbracast `uc_credits`·press `entitlements`).
- Hub-not-enforcer: ecosystem 은 표준·권고, 채택·구현은 각 repo 자율.

## 앱 빌링 온보딩 플레이북 (any app → pay, step-by-step)

> sibling 이 **pay 소스를 읽지 않고** 빌링을 붙이는 소비자 가이드. 원칙 SoT = 위 「확정」 블록 — 여기는 실행 순서만. base = `my.modfolio.io`, 계약 = **published `@modfolio/contracts@^1.7.0`** `/billing`·`/events`. **`file:`/`link:` 로컬 의존 절대 금지** — CI(Workers Builds)는 sibling 경로가 없어 `bun install` 무음 실패(`contracts.md` 규칙, pay 3일 outage 원인).

### Step 0 — 과금 모델 결정

| 모델 | 언제 | 실사례 |
|---|---|---|
| 구독 entitlement gate | 기능 접근권만 (사용량 무관) | — (아래 gistcore 가 병행형) |
| 크레딧 소비 (atomic debit) | 사용량 과금·쿼터·실패환불 | **umbracast** (일일 크레딧 쿼터 + 변환실패 자동환불) |
| 둘 다 | 플랜 gate + 사용량 병행 | **gistcore** (구독 + 크레딧 rate) |
| 주문 결제 (단건) | 물리/단건 판매 — pay 주문·결제 API | **press** (주문 결제) |

자체 격리 크레딧/자체 PG 신설 금지(「확정」§1) — 전부 pay 를 통한다. 크레딧 환산은 pay `credit-rates` 의 프로젝트별 `rate_id` 로.

### Step 1 — SSO coarse gate (1차 UI 게이팅만)

- SSO 토큰 claim `entitlements:{active_plans,tier?}`(`@modfolio/contracts/sso`)로 **UI 1차 분기만** — 플랜 배지·업그레이드 CTA·coarse 메뉴 노출.
- **금지**: claim 으로 잔액·소비·미터링 판단(stale-claim 금지, 「확정」§3). 돈이 걸린 판단은 전부 Step 2 실시간 API.

### Step 2 — 실시간 API (balance / entitlement-check / debit)

**인증 (M2M, 두 경로 중 택1)**:
1. **Bearer Connect JWT** — sourceApp 은 `aud` 에서 파생 (사용자 컨텍스트 있는 서버-서버).
2. **`X-Api-Key: mpsk_*` + `X-User-Id`** (+ `X-Pay-Mode: live|test`) — per-app 서비스 키. `mpsk_` 키는 athsra `<repo>` project 로 주입(예: `PAY_SERVICE_KEY` — 하드코딩/커밋 금지).

| 엔드포인트 | 계약 (`/billing`) | 용도 |
|---|---|---|
| `GET /api/v1/billing/balance?user_id` | `BalanceResponse` | 크레딧+구독+entitlements+`tier?`+`as_of` — 항상 fresh |
| `GET /api/v1/billing/entitlement-check` | `EntitlementCheckRequest→Response` | 실시간 feature gate (`granted`·`source`·`expires_at?`) |
| `POST /api/v1/billing/debit` | `DebitRequest→DebitResponse` | atomic·idempotent 소비 — **유일한 차감 경로** |
| `GET /api/v1/billing/entitlements-snapshot` | `EntitlementsSnapshot` | connect SSO hot-path 전용 — 일반 앱은 위 3개만 |

fetch wrapper — **타임아웃 + `res.ok` 하드닝 필수** (pay 장애가 앱 hang 이 되지 않게):

```ts
async function payFetch(path: string, userId: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`https://my.modfolio.io${path}`, {
    ...init,
    headers: {
      'X-Api-Key': env.PAY_SERVICE_KEY, // mpsk_* — athsra 주입
      'X-User-Id': userId,
      'X-Pay-Mode': env.PAY_MODE, // 'live' | 'test'
      'content-type': 'application/json',
      ...init.headers,
    },
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`pay ${path} → ${res.status}`);
  return res.json();
}
```

debit — `idempotency_key` 는 **주문/작업 ID 기반 결정적 생성**(랜덤·타임스탬프 금지 — 재시도가 같은 키를 내야 중복 차감이 안 된다). `credits` 또는 `rate_id` 둘 중 하나 필수(서버 검증):

```ts
import { DebitRequest, DebitResponse } from '@modfolio/contracts/billing';

const debit = DebitResponse.parse(
  await payFetch('/api/v1/billing/debit', userId, {
    method: 'POST',
    body: JSON.stringify(
      DebitRequest.parse({
        user_id: userId,
        project_id: 'umbracast',
        rate_id: 'umbracast-convert', // pay credit-rates 등록값 (또는 credits 명시)
        idempotency_key: `umbracast:convert:${jobId}`, // 작업 ID 기반 — 결정적
      }),
    ),
  }),
);
if (debit.status === 'rejected') {
  // discriminated union — reason 별 UX 분기:
  //   insufficient_credits → 충전 유도 (옵션 필드 debit.balance 표시 가능)
  //   no_entitlement       → 플랜 업그레이드 유도
  //   invalid_request      → 앱 버그 — 로그 + 일반 오류
  return fail(debit.reason);
}
// status === 'ok' → credits_charged · balance_after · consumption_id (감사 보관)
```

**실패 시 UX 원칙 — 부분 이행 금지**: `rejected`/네트워크 실패면 서비스도 제공하지 않는다(debit ok ↔ 서비스 제공 원자성). debit 후 서비스가 실패하면 역방향 = `credit.refunded` + debit 역연산(umbracast 패턴, 「확정」§4).

### Step 3 — 이벤트 구독 (사후 미러 — 권위 아님)

- `credit.*`/`subscription.*`/`entitlement.*` webhook 수신 → **캐시 무효화·감사 미러만**(소비 판단은 항상 Step 2).
- 검증은 `safeParse` — throw 금지, 비정상 payload 는 **400**(500 반환 시 pay outbox 가 재시도 폭주 — gistcore 2026-07-03 하드닝 교훈):

```ts
import { CreditConsumedEvent } from '@modfolio/contracts';
const parsed = CreditConsumedEvent.safeParse(await request.json());
if (!parsed.success) return new Response(null, { status: 400 });
```

- `platform-adapter.json` 에 `subscribesTo: ["credit.consumed", …]` + `coreServices.pay: {mode:"consumer"}` 선언 — **정직 선언 원칙**: 실핸들러가 있을 때만(`platform-plane.md` §subscribesTo, 의도 선언 = 거짓 green).

### Step 4 — test-mode 드릴 (라이브 전 1회 필수)

`X-Pay-Mode: test` 로 e2e 1회: balance 조회 → entitlement-check → debit `ok` → **동일 `idempotency_key` 재-debit = 추가 차감 0** → 부족 상태에서 `rejected(insufficient_credits)` UX 확인 → webhook 수신 safeParse OK.

라이브 전 체크리스트:
- [ ] `mpsk_` 서비스 키 = athsra 주입 (코드/커밋 리터럴 0)
- [ ] `@modfolio/contracts` published `^1.7.0` (`file:`/`link:` 0)
- [ ] `idempotency_key` 결정적 생성 (주문/작업 ID 기반)
- [ ] `DebitResponse` rejected 3종 UX 분기 + 부분 이행 금지
- [ ] SSO claim 은 UI 게이팅만 (잔액 판단 코드 grep 0)
- [ ] webhook safeParse + 400 (500 금지) + `subscribesTo` 정직 선언

### 앱 통합 현황 (2026-07-03)

| 앱 | 상태 | 모델 |
|---|---|---|
| gistcore | **LIVE** | 구독 + 크레딧 rate |
| umbracast | **LIVE** | 일일 크레딧 쿼터 + 실패 자동환불 |
| modfolio-press | 진행중 (2026-07-03 실연동) | 주문 결제 |
| 나머지 sibling | 미통합 | Step 0 부터 |

## `payment-safety.md` 와의 구분
- **billing-architecture(이 문서)**: 사용자 결제를 받고 서비스를 제공하는 **제품 아키텍처**(런타임 결제 흐름).
- **payment-safety**: **agent 가 세션 중 무단 지출**하는 것을 막는 가드(개발/운영 안전). 둘은 직교 — 런타임 결제는 payment-safety 범위 밖, 본 canon 범위.

## Anti-patterns
- ❌ 프로젝트가 자체 결제 PG·자체 격리 크레딧 신설 (→ pay 통합)
- ❌ SSO 토큰 claim 으로 잔액 판단 (stale — 실시간 API 권위)
- ❌ debit 없이 크레딧 차감 추정 / idempotency_key 누락 (중복 소비)
- ❌ consumer 의 `@modfolio/contracts` `file:`/`link:` 로컬 의존 (CI 무음 실패 — `contracts.md`)

## 관련
- contracts: `@modfolio/contracts` events/billing/sso (1.5.0+, 현행 published 1.7.0) · `.claude/rules/contracts.md`
- canon: `payment-safety.md`(자매 — agent 지출가드) · `rate-limiting.md`(`/api/billing`·`/api/subscriptions`) · `agentic` SSO = `agent-auth-ux.md`
- 실시간 인프라: `agents-sdk`·`durable-objects` skill (live push)
