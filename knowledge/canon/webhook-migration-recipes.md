---
title: Webhook 수렴 레시피 — repo 별 구체 절차
version: 1.0.0
last_updated: 2026-07-22
source: [Orbit #2 실측 (scripts/orbit/tracks/webhook-interop.ts), contracts 1.10.0 verifyModfolioEventCompat, knowledge/canon/webhook-interop.md]
sync_to_siblings: true
applicability: conditional
consumers: [api, contracts, orbit]
---

# Webhook 수렴 레시피

> `webhook-interop.md` 가 **왜**(문법 5종 공존·교착)라면, 이 문서는 **어떻게**다. 각 repo 가 자기 자리에서 복사해 쓸 수 있는 코드로.
>
> `applicability: conditional` — webhook 을 주고받는 repo 만. 판단·적용은 각 repo 자율(Hub-not-enforcer).

## 대원칙 — 소비자가 먼저, 생산자가 나중

```
① 소비자가 compat 검증기로 전환 (accept 에 현행 문법 명시)   ← 아무도 안 깨진다
② 레거시 메트릭이 0 으로 수렴할 때까지 생산자를 하나씩 canonical 로
③ 소비자의 accept 를 비운다 → canonical-only
```

**②를 먼저 하면 안 된다.** 생산자가 먼저 바꾸면 그 순간 모든 소비자가 401 이다. 이 순서가 교착을 푸는 유일한 방향이다.

## 소비자 레시피 (지금 바로 안전)

```ts
import { verifyModfolioEventCompat, dispatchModfolioEvent } from '@modfolio/contracts/webhook';

const raw = await request.text();          // ⚠ 반드시 RAW — 재직렬화하면 서명이 깨진다

const r = await verifyModfolioEventCompat(raw, request.headers, secret, {
  accept: ['t-v1-hex'],                    // 우리 생산자들이 지금 쓰는 문법만
  // legacyHeader: 'x-modfolio-signature', // 기본은 x-webhook-signature
});

if (!r.success) {
  // reason: missing_headers | timestamp_out_of_tolerance | invalid_signature | invalid_payload
  return new Response(r.reason, { status: 401 });
}

if (r.grammar !== 'standard-webhooks') {
  metrics.increment('webhook.legacy', { grammar: r.grammar });   // 0 되면 accept 제거
}

await dispatchModfolioEvent(r.event, {
  'payment.completed': async (e) => { /* e.payload 는 이미 타입 narrowing 됨 */ },
});
```

### repo 별 `accept` 값 (Orbit #2 실측 기준)

| repo | 현재 수신 문법 | 권장 `accept` | 비고 |
|---|---|---|---|
| **modfolio-admin** | `sha256=<hex>` | `['t-v1-hex','sha256-hex']` | 지금 fleet 생산자 7개(`t=,v1=`)를 **전부 401** 시키는 중. 둘 다 받다가 하나씩 제거 |
| **gistcore** | Bearer 공유시크릿 | `['t-v1-hex']` + Bearer 병행 | Bearer 는 무결성이 없어 우선 제거 대상 |
| **pdgd** | Bearer 공유시크릿 | `['t-v1-hex']` + Bearer 병행 | 위와 동일 |
| 신규 소비자 | — | `[]` (기본) | 처음부터 canonical-only |

## 생산자 레시피 (소비자 전환 확인 후)

```ts
import { deliverModfolioEvent } from '@modfolio/contracts/webhook';

await deliverModfolioEvent(event, {
  url: endpoint.url,
  secret: endpoint.secret,
});
// headers: webhook-id · webhook-timestamp · webhook-signature(v1,<base64>)
```

서명만 필요하고 전송은 직접 하고 싶다면 `signModfolioEvent(event, secret)` 이 `{headers, body}` 를 준다. **`body` 를 그대로 보내야 한다** — 다시 `JSON.stringify` 하면 바이트가 달라져 검증이 깨진다.

### repo 별 전환 지점

| repo | 위치 | 현재 |
|---|---|---|
| **modfolio-pay** | `apps/app/src/lib/server/webhook-manager.ts` | `t=,v1=` — 무결성 있음, 급하지 않음 |
| **modfolio-pay** | `apps/app/src/lib/server/events.ts` | **Bearer — 무결성 없음, 최우선** |
| athsra · gistcore · connect · press · visualize · worthee | 각 emit 지점 | `t=,v1=` |
| **atelier-and-folio** | `apps/app/server/api/mentor/events/outbound/` | `sha256=` — 소비자가 `t=,v1=` 라 현재도 불일치 |

## 안전 속성 (설계로 보장, 테스트로 잠금)

- **`accept` 기본값은 빈 배열** — 호환은 항상 opt-in. 실수로 신뢰 경계가 넓어지지 않는다.
- **canonical 헤더가 있는데 서명이 틀리면 레거시로 폴백하지 않는다.** 위조 canonical + 유효 레거시를 함께 보내 약한 경로를 노리는 공격이 막힌다.
- `t-v1-hex` 는 리플레이 가드 유지(`t` 검사). **`sha256-hex` 는 가드가 없다** — 문법 자체의 결함이므로 가장 먼저 빼야 할 대상.
- 허용 문법이 늘어도 **HMAC-SHA256 + 동일 시크릿**은 불변. 넓어지는 것은 인코딩이지 신뢰가 아니다.

## 흔한 실패

| 증상 | 원인 |
|---|---|
| 401 인데 시크릿은 맞음 | 문법 불일치. `webhook-interop.md` 의 충돌표 확인 |
| 로컬은 되는데 배포하면 401 | 프레임워크가 body 를 파싱·재직렬화. **raw text** 를 넘겨야 한다 |
| 가끔만 401 | 시계 오차 + `toleranceSec`(기본 300s). 서버 시각 확인 |
| `missing_headers` | canonical 3 헤더(`webhook-id`/`-timestamp`/`-signature`) 중 누락. 레거시라면 `legacyHeader` 지정 |

## 진행 확인

```bash
bun run scripts/orbit/tracks/webhook-interop.ts        # 문법 분포 + 충돌 쌍
```
순회마다 자동 실행된다(T2b). `canonical 채택` 숫자가 올라가고 `충돌 쌍`이 0 으로 가면 수렴 중.

## 관련

- `knowledge/canon/webhook-interop.md` — 왜(실태·교착·외부 스펙 검증)
- `knowledge/canon/event-consumption.md` — SSO claim vs webhook 게이팅 2경로
- `contracts/webhook/index.ts` — 구현·테스트 25건
