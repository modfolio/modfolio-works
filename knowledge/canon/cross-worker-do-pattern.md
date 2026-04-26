---
title: Cross-Worker Durable Object Binding
version: 1.1.0
last_updated: 2026-04-17
source: [modfolio-connect 2026-04-16 handoff §4-2]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [deploy, observability]
---

# Cross-Worker Durable Object Binding

> 한 Worker의 Durable Object를 다른 Worker가 binding으로 호출하려면 **명시적 script_name + 양쪽 wrangler 설정**이 필요하다.

## 배경

modfolio-connect의 `apps/auth`가 `apps/workflows`에 정의된 `RateLimiterDO`를 cross-worker binding으로 호출한다. 기존 in-worker DO 패턴만 알던 팀원은 `script_name` 필드를 누락해 deploy가 조용히 stale 버전을 가리키는 사례를 겪었다.

## 필수 구성

### Owner worker (DO 정의 쪽)

`wrangler.jsonc` 최소 블록:

```jsonc
{
  "name": "modfolio-connect-workflows",
  "durable_objects": {
    "bindings": [
      { "name": "RATE_LIMITER", "class_name": "RateLimiterDO" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["RateLimiterDO"] }
  ]
}
```

### Consumer worker (다른 Worker에서 호출하는 쪽)

```jsonc
{
  "name": "modfolio-connect-auth",
  "durable_objects": {
    "bindings": [
      {
        "name": "RATE_LIMITER",
        "class_name": "RateLimiterDO",
        "script_name": "modfolio-connect-workflows"
      }
    ]
  }
}
```

**script_name 누락 = 자기 자신의 DO로 해석 → silently missing binding** → runtime에 "class not found" 아니면 예상 불가 상태.

## 안전한 점진 전환

1. **dual-write 기간**: 기존 store(D1/KV) + 새 DO 둘 다 write. Analytics Engine이나 log로 divergence 비교
2. **토글 플래그**: `RATE_LIMITER_AUTHORITATIVE` 같은 secret으로 읽기 경로 스위치
3. **fallback 유지**: DO 호출이 실패하면 이전 store로 graceful degrade — 단, 에러는 반드시 observability 계층에 기록

## 안티패턴

- DO binding 추가 후 consumer wrangler.jsonc만 deploy (owner deploy 빠짐)
- `script_name` 누락
- dual-write 없이 한 번에 authoritative 전환
- fallback 없이 DO 실패를 사용자에게 500 error로 그대로 노출

## Durable Object Facets (2026-04-13 CF 신기능)

Dynamic Workers와 함께 출시. 각 DO 인스턴스가 **격리된 SQLite 데이터베이스**를 보유 (1 agent = 1 app + 1 DB 패턴). multi-tenant SaaS에서 per-tenant 상태 분리에 유리.

### migration tag

```jsonc
{
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["PerTenantAgent"] }
  ]
}
```

**주의**: Facets는 SQLite backend 필요. 기존 KV-backed DO (`new_classes`)는 **그대로 유지**하고, 신규 클래스만 `new_sqlite_classes`로 선언. 강제 이관 금지 (Evergreen Principle 준수).

### 안전한 점진 전환 (기존 KV-backed → SQLite Facets)

1. 신규 DO 클래스를 `new_sqlite_classes`로 추가 — 기존 KV DO는 건드리지 않음
2. dual-write: 기존 KV + 새 Facet 둘 다 write, divergence를 Analytics Engine/log로 모니터
3. 읽기 토글로 점진 전환
4. 충분한 관찰 기간 후 KV DO 은퇴 — owner 판단

### 활용 후보

| 앱 | 이득 | 상태 |
|----|------|------|
| modfolio-admin | DO 3개 — per-tenant 분리 시 Facets 고려 | candidate |
| amberstella | D1+DO 실시간 shuttle, per-route 격리 | candidate |
| modfolio-connect | RateLimiterDO per-client 격리 | optional (현재 동작 정상) |

공식: [Durable Object Facets — CF Blog](https://blog.cloudflare.com/durable-object-facets-dynamic-workers/)
