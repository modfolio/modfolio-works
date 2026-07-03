---
title: Cron Safety — Neon autosuspend resonance (DB-touching cron 빈도 상한)
version: 1.0.0
last_updated: 2026-06-30
source: [modfolio-pay 402 compute-quota incident + fix (2026-06-20, apps/app/wrangler.jsonc outbox cron */5→*/30), modfolio-press cron sidecar fix (2026-06-30, apps/cron/wrangler.jsonc */5→*/30, ecosystem overnight audit), knowledge/journal/20260630-overnight-rounds.md §"owner 결정/확인 대기" #3·#4]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops, observability, migration, preflight, modfolio]
---

# Cron Safety — Neon autosuspend resonance

> **목적**: DB 를 건드리는 Cloudflare Worker Cron 의 빈도 상한을 **불변 규칙**으로 박는다. 이 지식은 `modfolio-pay` 를 **402 (compute-quota 초과 = 실제 돈)** 로, `modfolio-press` 를 **거의 같은 사고 직전**까지 끌고 갔는데, 원인·해법이 **단일 wrangler 주석**에만 살아 있어 전파되지 않았다. canon 으로 cement + governance 게이트로 자동 검출한다.

## 🔒 불변 규칙 (FORBIDDEN)

**`DATABASE_URL` / Neon / Hyperdrive 바인딩을 (직접·간접으로) 사용하는 Worker 의 Cron Trigger 를 `*/5` 이하 (`*/1`~`*/5`, 또는 `* * * * *`) 로 두는 것은 금지다.**

- **DB-touching cron 최소 안전 간격 = `*/15`. 권장 = `*/30`.**
- 실시간성이 필요하면 **빈도를 올리지 말고**, write(producer) 경로에 **인라인 `ctx.waitUntil()` 디스패치**를 추가하고 cron 은 `*/30` **안전망(safety-net)** 으로 유지한다. (← `modfolio-pay` 가 채택한 패턴.)

이 규칙은 "유저 0, pre-production" 환경에서도 적용된다 — **트래픽이 없어도** cron 자체가 compute 를 24/7 깨운다.

## 왜 (resonance 메커니즘 — 정공법: 증상 아닌 원인)

Neon **Free** 플랜의 compute autosuspend 는 **5분 고정(변경 불가)** 이다. 마지막 쿼리 후 5분간 활동이 없어야 compute 가 잠든다(suspend → 0 CU).

`*/5` cron 이 DB 를 건드리면, 쿼리가 **정확히 그 5분 타이머가 만료되기 직전마다** 도착한다 → autosuspend 타이머가 **영원히 리셋** → **compute 가 절대 suspend 되지 않음** → 24/7 상시 가동.

```
suspend 타이머:  [── 5분 ──][── 5분 ──][── 5분 ──] ...
*/5 cron 쿼리:   ↑(t=0)     ↑(t=5)     ↑(t=10)        ← 매번 만료 직전 리셋 → 절대 안 잠듦
*/30 cron 쿼리:  ↑(t=0)                          ↑(t=30)  ← 5~30분 유휴 갭 → compute 잠듦
```

비용 산수 (Neon Free 한도 = **100 CU-h / project / 월**):

| cron 간격 | compute 가동 | 월 CU-h (0.25 CU 최소 compute 기준) | 결과 |
|---|---|---|---|
| `*/5` (또는 더 촘촘) | 24/7 상시 (절대 안 잠듦) | 0.25 × ~720h ≈ **180 CU-h** | **>> 100 한도 → HTTP 402** |
| `*/30` | wake 사이 ~25분 유휴 → 잠듦 | ≈ **30 CU-h** | Free 한도 내 ✅ |
| `*/15` | wake 사이 >10분 유휴 → 잠듦 | < 100 | 안전(하한) ✅ |

> 핵심은 "쿼리 수"가 아니라 **idle 갭**이다. `*/15` 이상이어야 5분 autosuspend 윈도우보다 긴 유휴가 생겨 compute 가 실제로 잠든다. `*/5` 는 idle 갭이 5분에 **딱 맞물려(resonance)** 절대 안 잠드는 최악의 값이다.

## 실측 incident (이 규칙의 출처)

### `modfolio-pay` — 402 발생 + 수정 (2026-06-20)

- `apps/app/wrangler.jsonc` 의 outbox/webhook delivery cron 이 `*/5` 였다 → prod Neon 이 **402 compute-quota-exceeded** (유저 0 인데도 100 CU-h 100% 소진).
- 수정: outbox cron `*/5` → `*/30` (그리고 hourly SLO snapshot 을 `:00` wake 윈도우에 공유시켜 추가 compute 0).
- wrangler.jsonc 주석에 "**이 값을 `*/5` 로 되돌리지 말 것**" 명시.
- 여파: `knowledge/journal/20260630-overnight-rounds.md` — "pay prod Neon 402 compute-quota(돈)" + "connect entitlements dormant(pay+Neon402 의존)" 로 **다운스트림 차단**까지 유발.

### `modfolio-press` — 같은 사고 직전 차단 (2026-06-30)

- `apps/cron/wrangler.jsonc` (CF Cron sidecar, GitHub Actions `*/5` schedule 대체) 가 **같은 `*/5` 함정**으로 셋업돼 있었다. 이 sidecar 는 DB 를 **간접**으로 건드린다 — `imprint.modfolio.io/api/cron/send-scheduled` 엔드포인트를 POST 하면 그쪽이 Neon 을 쿼리. **간접이어도 resonance 는 동일**하다.
- 수정: `*/5` → `*/30`. 동일 주석 cement.

> **교훈**: 둘 다 원인·수정이 **wrangler 주석에만** 있었다 → 세 번째 repo 가 같은 함정을 반복할 수 있었다. canon(본 문서) + `scripts/modfolio/governance.ts` 의 결정적 검출(`release-gate` 에서 실행) 로 **전파 + 자동 차단**.

## 올바른 패턴 (실시간성이 필요할 때)

```jsonc
// ❌ 금지 — DB-touching cron 을 빈도로 실시간화
"triggers": { "crons": ["*/5 * * * *"] }   // → Neon Free 402

// ✅ 정공법 — write 경로 인라인 디스패치 + cron 은 */30 안전망
//   producer (예: 주문 생성 / 발행 트리거) 핸들러 안에서:
//     ctx.waitUntil(deliverOutbox(env));   // 즉시 처리 (실시간)
//   그리고 cron 은 누락분만 쓸어담는 안전망:
"triggers": { "crons": ["*/30 * * * *"] }  // safety-net cadence
```

이 패턴은 (1) 실시간 지연 0, (2) Neon idle 갭 보존(compute 잠듦), (3) cron 은 producer 가 죽었을 때만 보강 — 세 목표를 동시에 만족한다.

## DB 를 안 건드리는 cron 은 예외

순수 외부 호출·KV·R2·로그 정리 등 **Neon/Postgres 를 쿼리하지 않는** cron 은 이 상한과 무관하다 (예: `athsra/apps/worker` 의 토큰 정리 cron, `modfolio-connect/apps/workflows` 의 시간 기반 워크플로). 빈도는 비즈니스 요구로만 결정.

규칙의 트리거 조건은 **두 가지 동시 충족**이다: ① `triggers.crons` 에 `<=*/5` 항목 + ② 같은 worker 가 `DATABASE_URL`(secret/vars) 또는 Hyperdrive/Neon 바인딩 참조. governance 검출도 이 AND 조건을 쓴다.

## House-of-Brands 정합

이 canon 은 **권고이자 안전 게이트**다. ecosystem 은 enforcer 가 아니므로 각 sibling 이 자기 wrangler 를 수정한다 — 그러나 `<=*/5` + DB 조합은 **"의도된 per-app 선택"이 아니라 거의 항상 비용 사고**이므로, `governance.ts` 가 **HIGH** finding 으로 올려 `release-gate` 에서 가시화한다(차단이 아닌 강한 신호 — sibling 의 ship 판단은 sibling 의 것). 공유 코드가 아니라 **계약(이 규칙) + 결정적 검출 패턴**만 전파된다(`sync_to_siblings: true`).

## 관련

- `knowledge/canon/db-endpoints.md` — sibling 별 Neon endpoint/DB 매핑 (어떤 worker 가 어떤 Neon project 를 쓰는지).
- `knowledge/canon/project-infrastructure-registry.md` — 4축 인프라 SoT (Neon DB-per-service).
- `knowledge/canon/cf-deploy.md` — CF Workers Builds 배포 + wrangler 표준.
- `knowledge/canon/cost-attribution.md` — Neon/CF 비용 귀속 (compute-quota 포함).
- `scripts/modfolio/governance.ts` `checkCronAutosuspendResonance` — 본 규칙의 결정적 검출 (release-gate).
- `knowledge/journal/20260630-overnight-rounds.md` — pay 402 + press fix incident 기록.
