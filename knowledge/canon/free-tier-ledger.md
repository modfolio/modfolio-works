---
title: Free-Tier Ledger — 무료 한도 원장 (한도·계량 축·측정 좌표)
version: 1.0.0
last_updated: 2026-08-23
source: [ADR-022 (오너: "무료 한도 내에서 최대한 사용"), neon.com/docs/introduction/plans (2026-08-23 대조), 2026-08-23 Neon API 전수 실측]
sync_to_siblings: true
applicability: always
consumers: [ops, dev, deploy, preflight]
supersedes: []
---

# Free-Tier Ledger — 무료 한도 원장

> **원칙 (이 원장이 존재하는 방식)**: 여기에는 **한도(외부 사실)·계량 축·측정 좌표·대조일**만
> 적는다. **사용량 수치는 적지 않는다** — 관측 시점에 얼어붙는 표는 반드시 늙는다. 사용량은
> `bun run quota:scan` 이 소비 시점에 잰다. 이 표의 값이 1차 출처와 어긋나면 **표가 낡은
> 것**이다(대조일이 판정 기준).

## 원장

| 서비스 | 한도 (무료) | 계량 축 | 범위 | 측정 | 1차 출처 대조일 |
|---|---|---|---|---|---|
| **Neon** | **100 CU-h/월** · 스토리지 **0.5 GB** · project **100개** · scale-to-zero 5분(비활성화 불가) | **compute 가 깨어 있던 시간 × CU**(부하 아님 — CU 는 최소 0.25 에 고정되는 것이 fleet 실측) | **project 당** | `quota:scan` (`GET /api/v2/projects?org_id=…` · `cpu_used_sec/3600`) | 2026-08-23 |
| Neon 전송량 | **5 GB/월** | public network transfer | **project 당으로 판정** — 근거: 2026-08-23 자연실험(pdgd project 정지 중 pay·app 정상 서빙) + FAQ per-project 문구. ⚠ docs 요약 1건은 계정 단위로 읽혔음 — 반증 재발 시 재판정 | ⚠ **API 관측 불가** — consumption_history 는 Scale 전용(403 실측 2026-08-23). 정지 사건으로만 관측된다 | 2026-08-23 |
| Neon 초과 시 | compute **suspend**(그 project 만) · 월 경계 리셋 (`quota_reset_at`) | — | project 당 | `quota:scan` 이 `quota_reset_at` 출력 | 2026-08-23 |
| Cloudflare Workers | ⚠ **미대조** — 이 원장에 값을 적으려면 1차 출처 대조가 먼저다 | 요청 수/CPU-ms | — | (quota:scan 미배선 — 미검사로 출력) | — |
| Cloudflare R2 | ⚠ 미대조 | 저장/Class A·B 작업 | — | (미배선 — 미검사) | — |
| Resend | ⚠ 미대조 | 발신 통 수 | — | (미배선 — 미검사) | — |
| Upstash Redis | ⚠ 미대조 (modfolio-on 만 사용) | 명령 수 | — | (미배선 — 미검사) | — | (실측 2026-08-25 — 여전히 미대조)

> ⚠ 미대조 행에 기억으로 숫자를 채우지 않는다. 대조하면 그때 값·출처·날짜를 같이 적는다.

## 임계 규칙 (ADR-021 D6 을 실행 가능하게)

- `quota:scan` 이 project 별 CU-h 를 재서 **70% 이상 = WARN**(해당 repo 이름 대서 출력),
  **100% 초과 = OVER**. 통지는 `-- --notify` 로 opinion 파일 생성(자동 스팸 방지 — 기본은 출력만)
- **조회 실패는 판정하지 않는다** — 자격 부재 = SKIPPED(exit 0·명시 출력), 자격 있는데 API
  불통 = **판정 불능(exit 2)**. "조회 실패 = 최신"으로 읽는 침묵이 제5축의 원죄였다
  (`project-infrastructure-registry.md` §제5축)

## 구조적 처방 (한도 감시보다 먼저)

한도 임박 경보는 2차 방어다. 1차는 **dev 를 계량기에서 떼는 것**(ADR-022) — dev 가
modfolio-db 로 옮겨가면 Neon CU-h 의 지배 소비(개발 세션 깨어있음)가 구조적으로 사라진다.
전환 repo 의 효과는 «CU-h 증가 정지 재측정»으로 증명한다.

## 관련

ADR-022 · ADR-021(사건 기록) · `modfolio-db.md` · `project-infrastructure-registry.md` §제5축
(노후화 축 — 같은 판정 규칙 공유)
