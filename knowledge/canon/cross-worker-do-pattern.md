---
title: Cross-Worker Durable Object Binding
version: 1.0.0
last_updated: 2026-04-17
source: [modfolio-connect 2026-04-16 handoff §4-2]
sync_to_children: true
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
