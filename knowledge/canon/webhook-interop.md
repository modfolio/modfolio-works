---
title: Webhook 서명 상호운용 — 5 문법 공존 실태와 수렴 경로
version: 1.2.0
last_updated: 2026-07-27
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
| **canonical** (Standard Webhooks) | `webhook-signature` | `v1,<base64>` | `{id}.{ts}.{body}` | ✅ `webhook-timestamp` | ~~0 repo~~ → **2 repo** (2026-08-04: modfolio-notify · modfolio-sign — 아래 §채택 0 이 깨졌다) |
| `t-v1-hex` (de-facto) | `X-Webhook-Signature` | `t=<ts>,v1=<hex>` | `<t>.<body>` | ✅ `t` | athsra·gistcore·connect·pay·press·visualize·worthee |
| `sha256-hex` | `x-webhook-signature` / `x-modfolio-signature` | `sha256=<hex>` | 구현별 상이 (아래 †) | 구현별 상이 † | **producer** atelier-and-folio · **consumer** modfolio-admin |
| `bare-hex` | `x-modfolio-signature` | `<hex>` | 구현별 상이 | ❌ | gistcore·connect (일부 경로) |
| `bearer-secret` | `Authorization` | `Bearer <shared secret>` | **서명 없음** | ❌ | pay→(gistcore/pdgd) |

> † **2026-07-27 정정 (atelier-and-folio 실측 보고).** `sha256-hex` 행은 원래 "서명 대상 =
> raw body, 리플레이 가드 = ❌ 없음" 으로 적혀 있었으나 **producer 실구현과 달랐다.**
> `apps/app/server/api/mentor/events/outbound/gist-candidate.post.ts` 는
> `hmacSha256Hex(secret, \`${timestamp}.${signedBody}\`)` 로 **`{ts}.{body}` 를 서명**하고
> `x-modfolio-timestamp` 헤더를 함께 보낸다 — 즉 `t-v1-hex` 와 **서명 대상이 같고 리플레이
> 가드도 있다**. 다른 것은 값 인코딩과 헤더 분리 방식뿐(한 헤더에 `t=,v1=` 를 합치는 대신
> 두 헤더로 나눔). 이 문법을 쓰는 다른 구현은 재실측하지 않았으므로 "구현별 상이" 로 둔다.
>
> 정정이 필요했던 이유: 아래 §안전 속성이 "`sha256-hex` 는 리플레이 가드가 없으니 가장 먼저
> 빼야 한다" 는 **우선순위 판단을 이 칸 위에 세우고 있었다.** 최소한 ANF 에 대해서는 그
> 근거가 성립하지 않는다. 덧붙여 ANF 의 발신부는 `GIST_INGEST_URL` 미설정으로 **stub
> 경로(202)** 이고 수신부는 **501** 이라, 아래 확정 충돌 중 ANF 관련 건은 **현재 실트래픽이 없다**.
>
> 이 절의 §스캐너 사각지대와 같은 교훈이다 — **정적 문법 매칭은 보안 속성을 결정하지 못한다.**

### ⚠ 이 절의 원래 헤드라인은 **오독이었다** (2026-07-27 정정)

v1.0 은 이렇게 적었다:

> ```
> producer t-v1-hex  →  consumer sha256-hex   (… → modfolio-admin)
> ```

**그 배선은 존재하지 않는다.** `modfolio-admin` 의 `/api/operations/callback` 은 universe 이벤트
소비자가 아니라 **외부 배포 시스템의 콜백 수신부**다 — 라우트 docblock 이 명시한다:
*"deployment results. Authenticated via HMAC-SHA256. … 1. Per-hook `callback_secret`
(from `ma_deploy_hooks`)"*. 즉 시크릿이 **훅마다 다르고**, 발신자는 그 훅을 등록한 외부
시스템이지 fleet producer 가 아니다. `contracts/events/wiring.ts` 에 `modfolio-admin` 이
**0회** 등장하는 것이 그 방증이다(v1.0 은 이 부재를 "미배선"으로 읽었지만, 실제로는
"universe 이벤트 배선이 아님"이다).

**정적 스캐너가 문법만 보고 방향과 발신자를 보지 않아서** 정상 배선을 충돌로 셈했다.
같은 문법이 같은 헤더에 실렸다는 사실만으로 두 repo 가 서로 연결된다고 가정할 수 없다.

### 실제로 지금 깨지는 배선 (2026-07-26~27 실측)

```
modfolio-pay 중앙 sink (canonical, Authorization 없음, 단건 봉투)
   →  gistcore · modfolio-press  (Bearer 필수 + {events:[…]} 배치 봉투 기대)
```

**독립적 실패 두 개**다: ① `Authorization` 부재 → 401 ② 인증을 통과시켜도 `events` 배열이
없어 0건 처리(gistcore 는 200 을 돌려주므로 **실패로도 안 보인다**). pay 자신의 테스트가
발신 계약을 못박고 있다 — `event-sink.test.ts:146` *"바디는 엔벨로프 그 자체 — camelCase
래퍼도 Bearer 도 없다"*, `:154` `expect(headers.Authorization).toBeUndefined()`.

지금 드러나지 않는 유일한 이유는 `MODFOLIO_EVENT_WEBHOOK_URL` 이 prod 에 없어 보이는 것뿐이다.
**sink 를 켜기 전에 소비자 이동이 먼저다.**

### 스캐너의 알려진 사각지대 (측정값을 읽을 때 감안할 것)

- **SDK 위임 소비자를 못 본다.** 규칙이 문법 리터럴(`sha256=`, `t=`)이 소스 라인에 보일 때만
  매치하므로, `connect-sdk` 의 `verifyWebhookSignature` 에 검증을 위임한 repo 는 히트 0 이다.
  fleet 최대 소비자 `modfolio`(3 라우트)가 스캔 결과에 **한 번도 등장하지 않는다.**
- 그래서 "canonical 채택 0" 류의 수치는 **하한**이지 실측 총계가 아니다.

> `bearer-secret` 은 **메시지 무결성이 아예 없다.** 공유 시크릿이 새면 임의 이벤트를 위조할 수 있고, 본문 바인딩도 리플레이 가드도 없다. 신규 배선에 채택 금지.
>
> **다만 contracts 1.16.0 부터 `verifyModfolioEventCompat` 이 이것도 받는다**(`accept: ['bearer-secret']`, opt-in). 모델링하지 않는다고 사라지지 않았기 때문이다 — bearer 소비자는 헬퍼를 **아예 탈 수 없었고**, 그래서 "compat 헬퍼로 이동하세요" 라는 이 canon 의 권고가 그들에게는 무용지물이었다. 이제는 전환기 동안 canonical 과 bearer 를 함께 받다가 `accept` 에서 빼는 것으로 끝낼 수 있다. 자격증명 비교는 길이까지 감추는 상수시간(HMAC 블라인딩)이고, **제시됐는데 틀린 Bearer 는 서명 문법으로 폴백하지 않는다**(여러 문을 두드리게 두지 않는다).

## 채택 0 이 깨졌다 — **2 repo** (2026-08-04) · 그리고 그 방식이 아래 교착 진단을 지지한다

| repo | 근거 | 실트래픽 |
|---|---|---|
| **modfolio-notify** | `packages/notify-sdk/src/webhook.ts` — Web Crypto 만(`node:` import 0건을 게이트로 강제) | ⚠ **아직 없음** (자기보고 2026-08-04) |
| **modfolio-sign** | `packages/sign-sdk/src/types.ts:437` — `webhook-id`/`-timestamp`/`-signature`, `v1,<base64>`, `{id}.{timestamp}.{body}`, tolerance 300 (허브가 읽기 전용 대조) | ❔ **미확인** — sign 이 답할 사실 |

⚠ **«채택 2» 와 «돌고 있는 canonical 배선 2» 는 다른 문장이다.** notify 가 이 구분을
자기 보고에 스스로 달았고(*"canon 이 ANF 건에서 «현재 실트래픽이 없다» 를 명시한 것과
같은 이유"*), 그 규율을 그대로 따른다.

### ★ 이 두 건이 아래 §교착 진단의 **대우(對偶)** 다

notify 의 분석이 정확하다:

> **notify 는 소비자가 아직 하나도 없다. 전환 비용이 0 이라 표준을 쓰는 데 아무 저항이 없었다.**

sign 도 같다 — 2026-08-03 에 배포된 신규 앱이고, 웹훅 소비자가 아직 붙기 전이다.
즉 **첫 두 채택자가 «신규이고 소비자가 없는» 이라는 같은 조건을 공유한다.** 이건 우연이
아니라 아래 교착의 정확한 이면이다: 기존 repo 가 안 옮긴 이유는 문법 취향이 아니라
**살아 있는 소비자**다.

**따라서 수렴 정책이 바뀐다:**

- ❌ "각자 canonical 로 옮기세요" — 살아 있는 소비자가 있는 한 아무도 못 움직인다(아래 §교착)
- ✅ **신규 배선은 canonical 로 시작한다** — 전환 비용이 0 인 유일한 순간이 그때다
- ✅ 기존 배선은 `verifyModfolioEventCompat` 로 소비자부터 이동, **그 배선은 소비자가 죽을 때 같이 죽는다**

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
- `sha256-hex` 는 **문법이 리플레이 가드를 규정하지 않는다** — 값 형식(`sha256=<hex>`)만
  정할 뿐 서명 대상과 타임스탬프 동봉이 구현에 맡겨져 있다. 그래서 같은 이름을 쓰는 두
  구현이 보안 속성에서 갈린다(실측: ANF 는 `{ts}.{body}` 서명 + timestamp 헤더로 가드가
  **있다** — §실측 표 † 참조). **"이 문법을 쓰면 가드가 없다" 가 아니라 "가드 유무를 문법이
  보장하지 못한다" 가 정확한 진술**이고, 후자가 오히려 빼야 할 이유로 더 강하다 —
  소비자가 producer 구현을 읽지 않고는 안전한지 알 수 없기 때문이다.

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
