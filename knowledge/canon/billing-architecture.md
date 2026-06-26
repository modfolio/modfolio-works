---
title: Modfolio Universe — Billing / Credit / Entitlement Architecture (결제·크레딧·구독 표준 SoT)
version: 1.2.0
last_updated: 2026-06-26
source: [2026-06-22 사용자 결정(pay=중앙 SoT·통합 지갑+구독·entitlement 실시간), modfolio-pay 0.7.0 현황(Toss·wallet·credit-rates·subscriptions 30+ 테이블), contracts 1.5.0(credit/subscription/entitlement events + billing 인터페이스 + SSO claim; 1.4.0 event user_id 비-UUID 완화, 1.5.0 BalanceResponse.tier + EntitlementsSnapshot 통합 계약 GAP 확정), 2026-06-25 pay session-19(coarse-entitlement provider 구현 완료 `9b103a0` · contracts validator wholesale swap 비viable 확정)]
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
- **소비 인터페이스**(`@modfolio/contracts/billing`): `BalanceQuery`/`BalanceResponse`(`tier?` = coarse 등급 소스, pay=SoT) · `DebitRequest`/`DebitResponse` · `EntitlementCheckRequest`/`EntitlementCheckResponse` · `EntitlementsSnapshotQuery`/`EntitlementsSnapshot`(`{active_plans,tier?,as_of}` — connect SSO hot-path 전용 coarse projection; **pay 제공됨 2026-06-25 `9b103a0`** — `GET /api/v1/billing/entitlements-snapshot`(신규) + `BalanceResponse.tier`(`GET /api/v1/billing/balance`), M2M api-key auth(Connect 서비스키); tier taxonomy `free<standard<pro<enterprise`(`billing-tier.ts` 단일소스, 미매핑 plan=undefined 로 over-grant 방지)).
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

## `payment-safety.md` 와의 구분
- **billing-architecture(이 문서)**: 사용자 결제를 받고 서비스를 제공하는 **제품 아키텍처**(런타임 결제 흐름).
- **payment-safety**: **agent 가 세션 중 무단 지출**하는 것을 막는 가드(개발/운영 안전). 둘은 직교 — 런타임 결제는 payment-safety 범위 밖, 본 canon 범위.

## Anti-patterns
- ❌ 프로젝트가 자체 결제 PG·자체 격리 크레딧 신설 (→ pay 통합)
- ❌ SSO 토큰 claim 으로 잔액 판단 (stale — 실시간 API 권위)
- ❌ debit 없이 크레딧 차감 추정 / idempotency_key 누락 (중복 소비)
- ❌ consumer 의 `@modfolio/contracts` `file:`/`link:` 로컬 의존 (CI 무음 실패 — `contracts.md`)

## 관련
- contracts: `@modfolio/contracts` events/billing/sso (1.5.0+) · `.claude/rules/contracts.md`
- canon: `payment-safety.md`(자매 — agent 지출가드) · `rate-limiting.md`(`/api/billing`·`/api/subscriptions`) · `agentic` SSO = `agent-auth-ux.md`
- 실시간 인프라: `agents-sdk`·`durable-objects` skill (live push)
