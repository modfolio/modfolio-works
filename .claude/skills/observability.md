---
description: Cloudflare Automatic Tracing + OTLP 표준 + SigNoz 로컬 옵저버빌리티. wrangler.jsonc 설정 가이드
effort: medium
allowed-tools: Read, Glob, Grep
---

# Observability — 생태계 표준

> 앱 코드에 벤더 SDK 금지. wrangler.jsonc 설정 + CF Automatic Tracing만 사용. OTLP 표준만.

## 아키텍처

```
CF Pages/Workers (프로덕션)
  │ CF Automatic Tracing (코드 변경 0, OTLP 스팬 자동 생성)
  ↓
CF OTLP Export (CF 대시보드에서 destination 설정)
  │
  ↓
CF Tunnel → 로컬/서버 OTel Collector (:4317 gRPC / :4318 HTTP)
  │
  ↓
SigNoz (localhost:3301) — Logs + Traces + Metrics 통합 UI
```

## wrangler.jsonc 설정

모든 앱의 `wrangler.jsonc`에 추가:

```jsonc
{
  // ... 기존 설정 유지 ...
  "observability": {
    "traces": {
      "enabled": true,
      "head_sampling_rate": 1,
      "destinations": ["modfolio-signoz"],
      "persist": false
    },
    "logs": {
      "enabled": true,
      "head_sampling_rate": 1,
      "destinations": ["modfolio-signoz-logs"],
      "persist": false
    }
  }
}
```

| 키 | 값 | 설명 |
|----|----|------|
| `head_sampling_rate` | `1` | 100% 샘플링. 트래픽 증가 시 `0.1`(10%)로 조정 |
| `destinations` | `["modfolio-signoz"]` | CF 대시보드에서 생성한 destination 이름 |
| `persist` | `false` | CF 대시보드 저장 비활성 → 외부 전송만 (비용 절감) |

### OTLP Destination (설정 완료)

| Destination | Endpoint | Dataset |
|-------------|----------|---------|
| `modfolio-signoz` | `https://otel.modfolio.io/v1/traces` | `opentelemetry-traces` |
| `modfolio-signoz-logs` | `https://otel.modfolio.io/v1/logs` | `opentelemetry-logs` |

CF Named Tunnel `modfolio-otel` → `otel.modfolio.io` → 로컬 SigNoz OTel Collector (:4318).
계정 레벨 설정 — 모든 앱이 destination 이름으로 참조.

## 프레임워크별 wrangler.jsonc 위치

| 프레임워크 | 앱 | wrangler.jsonc 위치 |
|-----------|-----|---------------------|
| SvelteKit 5 | connect, pay, press, gistcore, fortiscribe, amberstella, sincheong, modfolio app | 루트 또는 `apps/app/wrangler.jsonc` |
| SolidStart | dev, on, keepnbuild, worthee | 루트 또는 `apps/app/wrangler.jsonc` |
| Astro (SSR) | modfolio landing, docs, 그룹 포탈들 | 루트 또는 `apps/landing/wrangler.jsonc` |
| Qwik City | admin | `apps/app/wrangler.jsonc` |
| Nuxt 3 | naviaca | `apps/app/wrangler.jsonc` |
| Hono (CF Workers) | munseo, umbracast | 루트 `wrangler.jsonc` |

## Correlation ID

CF가 모든 요청에 `cf-ray` 헤더를 자동 주입. 추가 SDK 불필요.

서비스 간 호출에서 correlation을 원하면:

```typescript
// server hook / middleware (프레임워크 무관)
const requestId = request.headers.get('cf-ray') ?? crypto.randomUUID();
// 다른 서비스 호출 시 전파
fetch(url, { headers: { 'x-request-id': requestId } });
```

## Workers 과금 (2026-03-01~)

| 플랜 | 포함량 | 초과 | 보존 |
|------|--------|------|------|
| Workers Free | 200K spans/일 | 불가 | 3일 |
| Workers Paid | 10M spans/월 | $0.60/1M | 7일 |

`persist: false`로 CF 대시보드 저장을 끄면 span 과금만 적용. 실제 데이터는 SigNoz에 보존.

## Neon GitHub Integration (DB 안전망)

Neon을 사용하는 9개 앱 대상. PR마다 자동 DB branch + schema diff.

### 대상 앱

| 앱 | DB prefix |
|-----|-----------|
| naviaca | `na_` |
| gistcore | `gc_` |
| fortiscribe | `fs_` |
| modfolio (app) | `mf_` |
| modfolio-on | — |
| modfolio-press | `pp_` |
| modfolio-pay | `mp_` |
| worthee | `wt_` |
| sincheong | `sc_` |

### 설정 (1회)

1. **Neon GitHub App 설치**: https://github.com/apps/neon-database → `modfolio` 조직에 설치
2. **레포별 활성화**: 위 9개 레포 선택
3. **동작**:
   - PR 열림 → Neon branch 자동 생성 (`preview/pr-{번호}`)
   - 마이그레이션 실행 → branch에서 먼저 테스트
   - Schema diff → PR 코멘트로 자동 게시
   - PR 병합/닫힘 → Neon branch 자동 삭제

### Preview 환경 연동

PR의 preview 배포에서 Neon branch DB를 사용하려면:

```
CF Pages > Settings > Environment Variables > Preview:
  DATABASE_URL = {Neon branch 연결 문자열}
```

Neon GitHub App이 PR 코멘트에 연결 문자열을 자동으로 제공.

## SigNoz 로컬 셋업

`modfolio-universe/tools/signoz/` 디렉토리 참조.

```bash
cd tools/signoz && ./setup.sh        # SigNoz 기동
# SigNoz UI: http://localhost:8080
# Login: admin@modfolio.io / Modfolio2026!
```

CF Named Tunnel (고정 URL):

```bash
~/.local/bin/cloudflared tunnel run --url http://localhost:4318 modfolio-otel
# otel.modfolio.io → localhost:4318 (고정)
```

### 요구사항

- Docker + Docker Compose
- 최소 4GB RAM (Docker 할당)
- `cloudflared` CLI

## 확장 로드맵

```
지금: 로컬 Docker + CF Tunnel (비용 0)
  ↓
사무실 서버: docker-compose 그대로 이전 (24/7)
  ↓
사용자 1만명: OTLP endpoint만 변경 → Grafana Cloud / SigNoz Cloud / Datadog
```

OTLP 표준이므로 모든 단계에서 **앱 코드 변경 0**. wrangler.jsonc의 destination 이름만 변경하거나, CF 대시보드에서 destination endpoint만 교체.

## 적용 체크리스트

1. [ ] wrangler.jsonc에 `observability` 블록 추가
2. [ ] CF 대시보드에 OTLP destination 생성 (계정 1회)
3. [ ] CF Tunnel 실행 + SigNoz Docker 기동
4. [ ] 배포 (main push → CF Pages 자동 빌드)
5. [ ] SigNoz UI에서 트레이스 확인
6. [ ] (Neon 앱) Neon GitHub App 활성화
