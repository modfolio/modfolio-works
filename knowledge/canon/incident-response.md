---
title: Incident Response — P0/P1 Triage SOP
version: 1.0.0
last_updated: 2026-04-17
source: [Harness v2.4 Phase 3, incident-handler agent]
sync_to_children: true
consumers: [preflight]
---

<!--
5건 hotfix가 최근 1개월 발생했으나 표준 playbook이 없었다. 이 canon은 incident-handler agent가
따르는 SOP + 재발 방지 체크리스트를 명시한다.
-->

# Incident Response — P0/P1 Triage SOP

## 등급 정의

| 등급 | 기준 | 응답 시간 |
|------|------|-----------|
| **P0** | 서비스 중단, 데이터 손실 위험, 결제/SSO 실패 | 즉시 (< 15분) |
| **P1** | 기능 저하, 일부 사용자 영향, 우회 수단 존재 | < 1시간 |
| **P2** | 경미, 일부 경로만 영향 | < 24시간 |

## 생태계 앱별 P0 정의

| 앱 | P0 시그널 |
|----|-----------|
| `modfolio-connect` | SSO 로그인 실패율 > 5%, OIDC discovery 400/500 |
| `modfolio-pay` | 결제 실패율 > 2%, Toss 웹훅 처리 실패 |
| `modfolio-admin` | 관리 콘솔 다운 (운영 마비) |
| `gistcore` / `anf` / 기타 앱 | 로그인 실패, 유료 기능 차단 |
| `modfolio-ecosystem` 자체 | harness-pull 전 레포에서 실패 |

## 표준 단계

1. **감지** → `incident-handler` agent 호출 또는 직접 진단
2. **분류** → P0/P1/P2
3. **완화** → rollback 가능성 우선 검토
4. **복구 확인** → 5분 이상 안정 관측
5. **포스트모템** → `docs/incidents/<date>-<slug>.md` 생성 (템플릿은 `incident-handler` agent 본문 참조)
6. **재발 방지** → `knowledge/canon/` 업데이트 또는 `memory/pattern-history.jsonl` 추가

## Rollback 우선순위

1. **CF Workers 배포 rollback** — `wrangler deployments rollback` (가장 빠름, 최근 24h 내만)
2. **Feature flag off** — Flagsmith에서 즉시 토글 (프로덕션 노출 불가 시)
3. **DB 마이그레이션 revert** — `drizzle-kit drop` + 이전 스키마 재적용 (최후 수단, 데이터 손실 검토)
4. **전체 앱 offline** — maintenance mode (독립 도메인 앱만, 생태계 공유 서비스는 최대한 회피)

## 생태계 공유 서비스 특수 취급

- `modfolio-connect` 장애 → 22 앱 SSO 영향. Connect 자체 rollback이 항상 우선.
- `modfolio-pay` 장애 → 결제 의존 앱에 maintenance banner 동시 배포.
- `modfolio-ecosystem` harness-pull 장애 → member repo에서 `--rollback`으로 직전 lock 복원 ([Harness v2.4 Phase 1a](../../scripts/harness-pull/rollback.ts)).

## 기록

- `memory/incidents.jsonl` — 한 줄당 incident: `{"date","severity","apps","summary","postMortemPath"}`
- Langfuse event (`type: "incident"`) — 자동 export by `scripts/obs/langfuse-export.ts` (Phase 5)
- Airtable Decisions Log — 사용자 결정 기록용

## 금지

- 증상만 가리는 hotfix (`try/catch` 무시, retry 루프로 감추기)
- 포스트모템 생략
- 원인 불명 상태에서 "아마 X일 것"으로 결론 내기

## 관련

- [evergreen-principle.md](evergreen-principle.md) — SDK drift로 인한 incident는 Connect 버전 확인이 먼저
- [observability.md](observability.md) — OTLP trace가 incident 조사 핵심 자원
- [cost-attribution.md](cost-attribution.md) — incident 발생 시 비용 폭증 감지
