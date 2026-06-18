---
title: CF Workflows V2 + Dynamic Workflows — per-tenant durable execution
version: 1.0.0
last_updated: 2026-05-24
source: [2026-05 CF Workflows V2 GA + Dynamic Workflows MIT lib, blog.cloudflare.com/dynamic-workflows, 2026-05-24 신기술 평가 — Trial 후보]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [deploy, ai-patterns, new-app]
---

# CF Workflows V2 + Dynamic Workflows

> 2026-05 CF Workflows V2 GA. **Dynamic Workflows** = per-tenant / per-agent / per-request 워크플로우 코드 동적 변경 (정적 코드만 가능했던 제약 해소). 본 canon 은 universe 도입을 **Trial 단계로 명시** — POC sibling 1 spike 후 결정 (`tech-trends-2026-05.md`).

## 무엇이 다른가 (V1 vs V2 vs Dynamic)

| 항목 | Workflows V1 (legacy) | Workflows V2 (GA 2026-05) | Dynamic Workflows |
|------|----------------------|---------------------------|---------------------|
| 인스턴스 격리 | 단일 isolate 공유 | **인스턴스당 자체 DO + SQLite** | 인스턴스당 자체 + **dynamic code** |
| 동시 실행 | 제한 있음 | **50,000 concurrent** | 동일 + dynamic dispatch |
| 신규 인스턴스 | rate-limited | **300/sec** | 동일 |
| 코드 변경 | redeploy 필수 | redeploy 필수 | **runtime 동적 (workflow code 자체가 data)** |
| Durable Execution | 부분 | full (fibers, crash-recovery) | full + per-tenant code |
| 적합 use case | 표준 pipeline | 격리된 long-running task | per-tenant / per-agent 변형 처리 |

## Modfolio universe 잠재 use case

| sibling | use case | Dynamic 이 해결하는 것 |
|---------|----------|---------------------|
| **modfolio-connect** | SSO policy 분기 (per-tenant org SAML/OIDC config) | 정책별 코드 동적 생성 — 한 worker 안에서 |
| **modfolio-pay** | 결제 provider 분기 (Toss / Stripe / per-region) | 사용자별 결제 흐름 코드 동적 |
| **gistcore** | AI 튜터 세션 (28 tool types) per-user state | per-session DO + tool 코드 동적 |
| **modfolio-press** | cron sidecar 의 sibling 별 dispatch | sibling 마다 다른 cron worker 코드 자동 생성 |
| **umbracast** | audio conversion pipeline per-job (input format 변형) | format 별 변환 step 동적 |

→ House-of-Brands 정합 유지 (분리 sibling, control plane 만 공유).

## POC 후보 (사용자 결정 후 spike)

권장 POC = **gistcore** 또는 **modfolio-pay**. 둘 다 per-tenant / per-session 변형 요구가 명확.

### gistcore 시나리오

```ts
// 현재: 28 tool types 가 static code (한 worker 의 routing 분기)
// Dynamic Workflows 적용: per-session 의 tool subset 만 dynamic dispatch

export class GistcoreSession {
  async execute(userInput: string, sessionId: string) {
    const session = await this.getDO(sessionId);  // per-session DO + SQLite
    const enabledTools = await session.getEnabledTools();  // user 선호 + tier
    return await this.dynamicWorkflow({
      input: userInput,
      tools: enabledTools,  // dynamic — 사용자별 코드 path
      hibernation: 'allow',  // idle cost 0
    });
  }
}
```

### modfolio-pay 시나리오

```ts
// 현재: Toss / Stripe / per-region 정책이 static if/else
// Dynamic: per-merchant tenant 별 payment flow 동적

const flow = await loadPaymentFlow({ tenantId, provider, region });
// flow 자체가 코드 — 새 provider 추가 시 admin UI 에서 등록만으로 즉시 동작
await flow.execute(orderContext);
```

## 마이그 비용 + 위험

| 항목 | 평가 |
|------|------|
| 신규 코드 추가 | LOW — 기존 Worker 위에 V2/Dynamic binding 추가 |
| 기존 코드 변경 | OPTIONAL — V1 워크플로우는 그대로 유지 가능 |
| 학습 곡선 | MED — Dynamic dispatch 패턴 새로움 |
| Production 검증 | LOW (V2 GA) + MED (Dynamic MIT lib 외부 의존) |
| Vendor lock-in | LOW — CF Workflows V2 는 CF native 패턴, 다른 plat 으로 migration cost high 이지만 universe 100% CF anchor 정합 |

## 함정

- **MIT Dynamic Workflows lib** = CF core 아니라 외부 의존. version pinning + 정기 update 점검 필요
- **per-instance DO + SQLite** = storage cost 증가. instance 수 추정 + cost ledger 등록 권고 (`cost-attribution.md`)
- **Dynamic dispatch debug** = 정적 코드보다 traceability 낮음 — observability 정합 필수 (`observability.md` OTel + SigNoz)
- **Workflow code as data** = code injection 위험. 정공법 = code source 검증 (DB 또는 admin UI 만, untrusted external X) + lethal-trifecta 정합 (`.claude/rules/lethal-trifecta.md`)

## 정공법 정합

- **장기 시야**: Workflows V2 는 CF 의 메인 patterns 방향. 6-12개월 후에도 유효
- **확장성**: per-tenant 패턴 = SaaS multi-tenancy 의 표준. universe 의 House-of-Brands 정합
- **신기술 포텐셜**: Dynamic Workflows = 2026-05 의 가장 큰 CF Edge 발전. 채택 시 universe agentic 패턴 단순화
- **에러·경고 0**: V2 GA = production. lethal-trifecta governance 정합 필수 (Dynamic dispatch 시 trust boundary 검증)

## 다음 행동 (별도 plan / evolve)

1. POC sibling 결정 (gistcore 또는 modfolio-pay)
2. spike — V2 / Dynamic binding 추가 + 1 simple workflow + 측정
3. cost-attribution.md 에 per-instance DO cost 추정 등록
4. observability.md 의 OTel trace 패턴 정합 점검
5. 측정 후 본 canon 갱신 — POC 결과 + 채택/보류 결정

## 관련

- `knowledge/canon/cf-dynamic-workers-patterns.md` — Dynamic Workers (1 agent = 1 Worker + DO SQLite). Dynamic Workflows 와 정합 paradigm
- `knowledge/canon/cross-worker-do-pattern.md` — DO Facets + cross-worker
- `knowledge/canon/observability.md` — Workflows V2 trace 통합
- `knowledge/canon/cost-attribution.md` — per-instance cost ledger
- `.claude/rules/lethal-trifecta.md` v2.34 — code-as-data 시 trust boundary
- `knowledge/canon/tech-trends-2026-05.md` — Trial 결정 배경
- Blog: https://blog.cloudflare.com/dynamic-workflows/
- Docs: https://developers.cloudflare.com/workflows/
- InfoQ: https://www.infoq.com/news/2026/05/cloudflare-dynamic-workflows/
