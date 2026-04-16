---
name: observability
description: CF Workers 트레이싱/OTLP 설정, SigNoz 연동, wrangler.jsonc observability 구성 시 사용
user-invocable: true
---

# /observability — CF Workers 트레이싱

## 핵심 설정

`wrangler.jsonc`에 추가:
```jsonc
{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

## 구성 요소

1. **CF Automatic Tracing** — wrangler.jsonc `observability.enabled: true`
2. **OTLP Export** — Workers에서 trace 수집 → SigNoz/Grafana 전송
3. **SigNoz 로컬** — `docker compose up` (개발용)
4. **Destinations** — CF Dashboard > Workers > Tracing > 목적지 설정

## 체크리스트

- [ ] `wrangler.jsonc`에 observability 블록 추가
- [ ] CF Dashboard에서 destination 설정 (미설정 시 traces 버려짐)
- [ ] 로컬 SigNoz로 개발 중 trace 확인
- [ ] p50 < 50ms 성능 예산 준수 (canon/observability.md 참조)

## 참조

상세 패턴은 `knowledge/canon/observability.md` 참조.
