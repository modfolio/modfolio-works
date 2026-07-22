---
title: Webhook 서명 상호운용 — 5 문법 공존 실태와 수렴 경로
version: 1.0.0
last_updated: 2026-07-21
source: [Orbit #1 실측 2026-07-21 (scripts/orbit/tracks/webhook-interop.ts), contracts 1.10.0 verifyModfolioEventCompat, knowledge/canon/event-consumption.md]
sync_to_siblings: true
applicability: always
consumers: [api, contracts, security-scan, code-reviewer, orbit]
---

# Webhook 서명 상호운용

> **universe 의 first-party 이벤트 전달에 서로 호환되지 않는 서명 문법 5종이 동시에 살아 있다.** 최악의 형태는 **같은 헤더 이름, 다른 값 문법** — 연결하면 100% 401 이 나는데 로그에는 "인증 실패"만 남아 시크릿 문제로 오진된다.

## 외부 검증 (2026-07-22 웹서치)

수렴 목표가 우리만의 발명이 아님을 1차 출처로 확인했다 — [Standard Webhooks spec](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md):

- 서명 헤더 = `webhook-signature: v1,<base64(HMAC-SHA256)>` — **우리 구현과 동일**
- 서명 대상 = `{msgId}.{timestamp}.{payload}` — **우리 `signedContent(id, timestamp, body)` 와 동일**
- 회전 시 공백 구분 다중 서명 — 우리도 동일
- (미채택) 시크릿에 `whsk_` prefix 권고 — 편의 관례이지 요구사항 아님. 우리는 athsra 키명으로 식별하므로 불채택.

→ `contracts/webhook` 는 표준 정합이다. 이 canon 의 "canonical" 은 사내 방언이 아니라 업계 스펙을 가리킨다.

## 실측 (2026-07-21, Orbit #1)

`bun run scripts/orbit/tracks/webhook-interop.ts` — 28 repo 정적 스캔.

| 문법 | 헤더 | 값 | 서명 대상 | 리플레이 가드 | 실사용 |
|---|---|---|---|---|---|
| **canonical** (Standard Webhooks) | `webhook-signature` | `v1,<base64>` | `{id}.{ts}.{body}` | ✅ `webhook-timestamp` | **0 repo** ❗ |
| `t-v1-hex` (de-facto) | `X-Webhook-Signature` | `t=<ts>,v1=<hex>` | `<t>.<body>` | ✅ `t` | athsra·gistcore·connect·pay·press·visualize·worthee |
| `sha256-hex` | `x-webhook-signature` / `x-modfolio-signature` | `sha256=<hex>` | raw body | ❌ 없음 | **producer** atelier-and-folio · **consumer** modfolio-admin |
| `bare-hex` | `x-modfolio-signature` | `<hex>` | 구현별 상이 | ❌ | gistcore·connect (일부 경로) |
| `bearer-secret` | `Authorization` | `Bearer <shared secret>` | **서명 없음** | ❌ | pay→(gistcore/pdgd) |

### 확정된 충돌 (연결 시 100% 401)

```
producer t-v1-hex  →  consumer sha256-hex   (athsra·gistcore·connect·pay·press·visualize·worthee → modfolio-admin)
producer sha256-hex →  consumer t-v1-hex    (atelier-and-folio → athsra·pay)
```

`modfolio-admin` 의 수신부는 `signature.startsWith("sha256=")` 가 아니면 즉시 401 이다. `modfolio-pay` 의 발신부는 `t=<ts>,v1=<hex>` 를 보낸다. **헤더 이름이 같아서** 배선은 성공한 것처럼 보이고, 실패는 시크릿 불일치처럼 읽힌다 — 계약(스키마) 검사로는 절대 안 잡히는 종류다.

> `bearer-secret` 은 **메시지 무결성이 아예 없다.** 공유 시크릿이 새면 임의 이벤트를 위조할 수 있고, 본문 바인딩도 리플레이 가드도 없다. 신규 배선에 채택 금지.

## 왜 canonical 채택률이 0 이었나 (구조적 교착)

contracts 1.8.0 이 바로 이 문제를 없애려고 `@modfolio/contracts/webhook` 를 냈는데 **아무도 안 썼다.** 게으름이 아니라 구조다:

- **소비자**가 canonical 로 갈아타면 → 기존 producer 전부가 즉시 401
- **생산자**가 canonical 로 갈아타면 → 기존 consumer 전부가 즉시 401

**누구도 먼저 움직일 수 없으니 아무도 안 움직인다.** 표준을 "발행"하는 것만으로는 수렴이 일어나지 않는다는 것을 이 사건이 실증한다 — 마이그레이션 경로가 없는 표준은 문서일 뿐이다.

## 수렴 경로 — 소비자가 먼저 움직인다

`contracts 1.10.0` 의 **`verifyModfolioEventCompat()`** 이 교착을 푼다. 소비자는 canonical **과** 명시 허용한 레거시 문법을 동시에 받아들일 수 있으므로, **혼자서도 안전하게 먼저 이동**할 수 있다.

```ts
import { verifyModfolioEventCompat } from '@modfolio/contracts/webhook';

const r = await verifyModfolioEventCompat(await req.text(), req.headers, secret, {
  accept: ['t-v1-hex'],          // 우리 producer 들이 아직 쓰는 문법만
});
if (!r.success) return new Response(r.reason, { status: 401 });
if (r.grammar !== 'standard-webhooks') {
  metrics.increment('webhook.legacy', { grammar: r.grammar });   // 0 이 되면 accept 제거
}
```

**순서**: ① 소비자가 compat 로 전환(accept=현행 문법) → ② 레거시 트래픽 메트릭이 0 으로 수렴할 때까지 생산자를 하나씩 canonical 로 → ③ `accept` 를 비우면 canonical-only.

### 안전 속성 (설계상 보장)

- **`accept` 기본값은 빈 배열** — 호환은 항상 opt-in. 실수로 신뢰 경계가 넓어지지 않는다.
- **canonical 헤더가 있는데 서명이 틀리면 레거시로 폴백하지 않는다.** 유효한 canonical 헤더 + 위조 서명 + 유효한 레거시 서명을 함께 보내 약한 경로를 노리는 공격이 막힌다(회귀 테스트로 잠금).
- 허용 문법이 늘어도 **HMAC-SHA256 + 동일 시크릿**은 불변. `t-v1-hex` 는 리플레이 가드를 유지한다.
- `sha256-hex` 는 리플레이 가드가 **없다** — 문법 자체의 결함이므로 가장 먼저 빼야 할 대상이다.

## 신규 배선 규칙

- 새 producer/consumer 는 **canonical 만** 쓴다(`signModfolioEvent` / `deliverModfolioEvent` / `verifyModfolioEvent`).
- 손구현 HMAC 금지. 헤더 이름을 새로 만들지 않는다.
- `Authorization: Bearer` 를 이벤트 인증으로 쓰지 않는다(무결성 없음).
- 회귀 방지: `bun run scripts/orbit/tracks/webhook-interop.ts` 가 순회마다 문법 분포와 충돌 쌍을 보고한다.

## 정직한 한계

이 스캐너는 **정규식 정적 분석**이다. 어떤 producer 가 실제로 어떤 URL 을 때리는지는 env/DB 에 있어 소스만으로 알 수 없다. 그래서 보고는 "이 쌍은 지금 깨져 있다"가 아니라 **"이 쌍이 연결되면 깨진다"** 이다. 판단은 각 repo 가, 근거는 `file:line` 으로 제공한다(Hub-not-enforcer). 주석은 구현이 아니므로 스캔에서 제외한다 — 이 fleet 의 주석은 서명 포맷을 그대로 적어두는 습관이 있어, 포함하면 존재하지 않는 상호운용을 발명하게 된다(실제로 1차 스캔이 그렇게 틀렸다).

## 관련

- `knowledge/canon/event-consumption.md` — SSO claim vs webhook 게이팅 2경로
- `knowledge/canon/billing-architecture.md` — pay 이벤트는 사후 동기화 미러(권위는 pay API)
- `contracts/webhook/index.ts` · `contracts/events/wiring.ts` — 계약·토폴로지
- `knowledge/canon/orbit.md` — 이 실측이 나온 순회 캠페인
