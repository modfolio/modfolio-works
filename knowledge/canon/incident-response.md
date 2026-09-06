---
title: Incident Response — P0/P1 Triage SOP
version: 1.1.0
last_updated: 2026-09-05
source: [Harness v2.4 Phase 3, incident-handler agent]
sync_to_siblings: true
applicability: always
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

## 개인정보 «유출등» — 두 번째 축 (개정 개인정보 보호법 · 2026-09-11 시행)

⚠ **위 등급표는 축이 하나다 — 가용성.** 「서비스 중단 · 데이터 손실 위험 · 결제/SSO 실패」는
전부 «작동하는가» 를 묻는다. 그런데 **아무것도 안 멈춘 채로 신고 의무가 생기는 사건**이 있고,
그건 이 표 어디에도 안 들어간다. 축을 하나 더 둔다.

**«유출등» = 분실 · 도난 · 유출 · **위조 · 변조 · 훼손**.** 외부로 나간 정황이 없어도
저장물 손상 · DB 오염 · 개인정보처리시스템에 대한 **불법적 접근을 알게 된 경우**는 판단 대상이다.

| 상황 | 등급 | 시계 |
|---|---|---|
| 개인정보 유출등의 **가능성을 인지** | **P0** | 인지 시각부터 **72시간** |
| 대상을 특정할 수 없음 | P0 | 「유출 **가능성**」으로 통지 (특정을 기다리지 않는다) |

⚠ **시계는 «확인» 이 아니라 «가능성 인지» 에서 출발한다.** 개정 취지가 정확히 그것이다 —
침해가 확인된 뒤 통지하는 데 그치지 않고, **현실적 가능성이 확인된 단계**에서 정보주체가
스스로 피해를 예방할 기회를 주는 것. 원인 규명을 기다리면 이미 늦다.

⚠ 그리고 이 canon 의 §금지 *"원인 불명 상태에서 「아마 X일 것」으로 결론 내기"* 는
**포스트모템 문장**에 대한 금지이지 **통지를 미루라는 뜻이 아니다.** 두 문장이 충돌하는
것처럼 읽히는 자리라 명시한다 — 사건 중에 이 문서를 읽는 사람은 둘 중 편한 쪽을 고른다.

**절차**: 가능성 인지 → 대상 특정(병행) → **통지·신고** → 증거 보전(감사 로그 덤프 ·
Workers Logs 즉시 export — 보존기간이 짧다) → 접근 차단(계정 잠금 · 토큰 회전) → 기록.

**왜 이것이 앱별이 아니라 canon 인가**: 유출은 한 앱의 문제가 아니다. `modfolio-connect` 는
22앱의 계정 축을, `modfolio-pay` 는 결제 정보를 다룬다. 각 repo 가 자기 방침에 따로 적으면
«누가 몇 시간 안에 무엇을 하나» 가 앱마다 갈린다.

> ⚠ **이 절은 운영 SOP 이지 법률 자문이 아니다.** 신고 기준(규모·정보 유형·침입 여부)이
> **우리 표면에 적용되는지**는 각 repo 가 자기 데이터로 판단한다 — 허브는 그 판정을
> 대신하지 않는다. 다툼이 있으면 전문가에게 묻는다.
>
> **출처와 검증 상태**: 제보 = pdgd `pdgd-finding-2026-09-04-pipa-incident-canon-gap.md`.
> 허브가 **독립 확인한 것**: ① 이 canon 에 해당 어휘 0건(`rg` 128편 전수 — 다른 canon 에도
> 없다) ② 시행일 2026-09-11 · 72시간 · 위조/변조/훼손 포함이 공개 자료와 일치.
> 허브가 **확인하지 않은 것**: 조문 번호의 1차 출처 대조, 우리 각 표면의 적용 여부.
>
> 같은 개정에 **이 canon 범위 밖의 축이 둘 더 있다**(오너 결정 대상): CPO 지정·변경·해제 시
> **이사회 의결 및 신고** 의무화 · 일정 규모 이상 **ISMS-P 인증** 의무화.

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
