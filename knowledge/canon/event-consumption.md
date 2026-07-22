---
title: Event Consumption — @modfolio/contracts/webhook + 기능 게이팅 2경로
version: 1.0.0
last_updated: 2026-07-05
source: [contracts 1.8.0 webhook helper 신설(2026-07-05), event_wiring_gaps 실측(24 intended 흐름 ~0 배선), wiring.ts "siblings hand-rolled off-contract", connect-sdk 8.7.0 entitlements claim]
changelog: ["1.0.0 (2026-07-05): 초판 — @modfolio/contracts/webhook 소비/생산 헬퍼 + SSO claim vs webhook 게이팅 2경로 선택 가이드. 24 event-wiring 갭의 손구현 마찰 해소."]
sync_to_siblings: true
applicability: always
consumers: [all-agents, api, contracts, sso-integrate]
related_canon: [platform-plane, visualize-architecture, billing-architecture]
related_rules: [contracts]
---

# Event Consumption — 앱이 universe 이벤트를 소비하는 표준

## 한 줄

`@modfolio/contracts/webhook` 가 웹훅 **서명 검증 + 파싱 + 타입 디스패치**를 제공한다 — 소비 앱은 핸들러 로직만 쓰면 된다(HMAC 손구현 금지). 이게 없어서 24개 intended 이벤트 흐름이 대부분 미배선이었다(`event_wiring_gaps`, `wiring.ts` "siblings hand-rolled off-contract").

## 소비자 (consumer) — 3줄 프론트도어

```ts
import { verifyModfolioEvent, dispatchModfolioEvent } from '@modfolio/contracts/webhook';

export async function POST(req: Request) {
  const result = await verifyModfolioEvent(await req.text(), req.headers, env.MODFOLIO_EVENT_WEBHOOK_SECRET);
  if (!result.success) return new Response(result.reason, { status: 400 });
  await dispatchModfolioEvent(result.event, {
    'subscription.cancelled': (e) => revokeAccess(e.user_id),      // payload 타입 자동 narrowing
    'credit.consumed': (e) => decrementBalance(e.user_id, e.payload.amount),
  });
  return new Response(null, { status: 202 });
}
```

- `verifyModfolioEvent(body, headers, secret, {toleranceSec?, nowSec?})` — HMAC-SHA256 서명 검증(constant-time, Web Crypto) + timestamp replay 가드 + 스키마 파싱 → `{success, event}` | `{success:false, reason}`. `reason` = `missing_headers`|`timestamp_out_of_tolerance`|`invalid_signature`|`invalid_payload`.
- `dispatchModfolioEvent(event, handlers)` — `event_type` 별 핸들러로 라우팅(payload 타입 narrowing). 등록 안 한 타입이면 `false`(2xx-ack 해서 producer 재시도 멈춤).
- **`body` 는 raw 요청 문자열 그대로**(재직렬화 금지 — 서명이 raw 바이트를 덮음).

## 생산자 (producer)

```ts
import { deliverModfolioEvent } from '@modfolio/contracts/webhook';
await deliverModfolioEvent(event, { url: consumerWebhookUrl, secret });  // sign + POST
// 또는 저수준: signModfolioEvent(event, secret) → {body, headers} 직접 전송
```

## 규약 (Standard Webhooks — pay 의 PortOne 선례와 동일)

헤더 `webhook-id` · `webhook-timestamp`(unix초, tolerance 기본 300s) · `webhook-signature`(`v1,<base64 HMAC-SHA256>`, 공백구분 다중=로테이션). 서명 대상 = `{id}.{timestamp}.{body}`. **Web Crypto 전용**(`node:crypto` 없음) → CF Workers 네이티브(불변원칙 #3).

## 기능 게이팅 2경로 — SSO claim vs webhook (중요: 헷갈리지 말 것)

같은 "이 유저가 Pro 인가?"를 두 방식으로 알 수 있다. 용도가 다르다:

| | **SSO entitlements claim** (connect-sdk 8.7.0) | **pay webhook** (@modfolio/contracts/webhook) |
|---|---|---|
| 소스 | SSO 토큰의 `entitlements:{active_plans,tier}` claim | `subscription.*`·`entitlement.*`·`credit.*` 이벤트 |
| 신선도 | 로그인/토큰갱신 시점(eventual, ~분) | 실시간(즉시) |
| 인프라 | 없음(토큰 읽기만) | 웹훅 엔드포인트 + secret + `subscribesTo` 선언 |
| 적합 | **coarse 게이팅** — UI/라우트 노출, "Pro 기능 보임?" | **실시간 상태 동기** — 취소 즉시 접근 회수·크레딧 잔액·환불 |
| 부적합 | 즉시 회수 필요(취소 후 다음 토큰까지 유효) | 단순 표시(과한 인프라) |

**규칙**: 화면/라우트 게이팅 = SSO claim(가볍게). 돈·접근의 **즉시 정합**이 필요하면 = webhook. 둘 다 필요하면 병행(SSO claim 로 낙관 표시 + webhook 로 정정).

## 채택 (consumer, per-app 자율 — Hub-not-enforcer)

1. `bun add @modfolio/contracts@latest` (pkg.modfolio.io, `file:../` 금지 — `contracts.md`).
2. 웹훅 라우트: 위 3줄 프론트도어.
3. `platform-adapter.json` 의 `subscribesTo` 에 구독할 `event_type` 선언 → `event_wiring_gaps` 에서 갭 소멸.
4. `MODFOLIO_EVENT_WEBHOOK_SECRET`(athsra 주입) — producer 와 공유.

## Hub-not-enforcer / Zero Physical Sharing

이 헬퍼는 **공유 웹훅 API + 스키마**(허용 공유 축)의 프로토콜 플러밍이다 — UI 도 비즈니스 로직도 아니다(핸들러는 각 앱). connect-sdk 가 SSO 토큰에 하는 것의 대칭. 배선 채택은 각 앱 자율.

## 관련

- `contracts/webhook/index.ts` — 헬퍼 구현(sign/verify/dispatch/deliver)
- `contracts/events/wiring.ts` — producer→consumer 토폴로지(누가 뭘 구독해야 하나)
- `knowledge/canon/billing-architecture.md` — pay 이벤트/entitlements 소스
- `knowledge/canon/platform-plane.md` — `subscribesTo` 선언(platform-adapter.json)
- mcp `event_wiring_gaps` / `event_consumers` — 배선 갭 가시화
