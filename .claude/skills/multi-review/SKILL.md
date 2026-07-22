---
name: multi-review
description: 4-agent 병렬 리뷰 — design-critic + accessibility-auditor + architecture-sentinel + security-hardener. P0-P3 심각도 태깅
context: fork
effort: xhigh
user-invocable: true
---


# Multi-Review — 4-Agent 병렬 검증

4개 전문 에이전트를 병렬 실행하여 코드/디자인/보안 품질을 다각도로 검증.

> v2.13.0 (2026-04-26): security-hardener 추가로 3 → 4 agent. 근거는 `knowledge/canon/agentic-engineering.md` §1.4 (untrusted code 가정) + CodeRabbit 2025.12 통계 (AI 공저 코드 2.74x 보안 취약).

## 실행 방법

`/multi-review` 호출 시:
1. **design-critic** → 디자인 토큰/레이아웃/모션 검사
2. **accessibility-auditor** → WCAG AA/접근성 검사
3. **architecture-sentinel** → 불변 원칙/생태계 규칙 검사
4. **security-hardener** → OWASP Top 10 + 시크릿 노출 + 인증/인가 검사

4개 에이전트를 **병렬로** 실행하고, 결과를 통합 보고.

## 발견 → triage 2-단계 (Opus 4.8 under-reporting 보정)

> Anthropic `prompting-claude-opus-4-8`: Opus 4.8 은 "확실한 것만 / 사소한 건 빼고" 류 리뷰 지시를 이전 모델보다 더 충실히 따라, 이슈를 찾아내고도 자기 bar 아래라고 보고 **누락**할 수 있다(precision↑ measured recall↓). 그래서 리뷰를 두 단계로 분리한다:

1. **발견 단계 (4-agent)** = **coverage-first**. 각 리뷰어는 불확실·저심각 항목까지 **전수** 보고하고, 항목마다 `[conf: high|med|low]` + severity 를 태깅한다. 리뷰어가 스스로 "minor / 애매" 라고 **버리지 않는다** — 각 agent md 의 "발견 원칙" 참조.
2. **triage 단계 (본 skill 통합)** = **filter/rank**. 4-agent 가 올려보낸 전량을 여기서 P0-P3 로 랭킹·취사선택한다. 필터링은 **오직 이 단계**에서 (uncertain 은 버리지 않고 P3 로). 랭킹 시 각 finding 을 **이번 diff 도입 vs pre-existing** 으로 분류 — 판정은 추측이 아니라 변경 파일 목록(`git diff --name-only`)과 finding 파일의 교집합으로. pre-existing 은 버리지 않되(P3 + 근원 기록) 이번 변경의 회귀와 섞지 않는다.

즉 리뷰어에게 "중요한 것만" 을 요구하지 않는다 — 리뷰어는 다 올리고, 순위는 triage 가. (`generate-review` 도 동일 2-단계.)

## 호출 가이드라인 (토큰 비용 관리)

4-agent 병렬은 3-agent 대비 약 33% 토큰 비용 증가. 효율적 사용:

| 상황 | 권고 |
|---|---|
| P0/P1 PR (계약/스키마/보안/인증/결제) | 4-agent 전체 호출 |
| P2 PR (UI 변경, 새 페이지, 디자인 오버홀) | 4-agent 권고 (security-hardener 가 cookie/CSP/header 도 본다) |
| P3 PR (typo/주석/문서) | skip 또는 design-critic 만 단독 |
| 빠른 프리뷰 / 작은 commit | 단독 agent 호출 (`/security-scan` 등) |

- security-hardener 는 `Stop hook (haiku quality-gate)` 와 **역할 분리**: Stop hook 은 grep 기반 sweep (시크릿/색상/우회), security-hardener 는 OWASP 깊이 분석. 중복 X.

## 결과 처리

- **ALL PASS** → 진행 가능 — 단, agent 의 PASS 는 **요청 범위 전체를 실제로 검토했을 때만** 인정. 보고에 범위 축소·timeout·"일부만 확인" 신호가 있으면 그 축은 PASS 가 아니라 부분 증거 — 미검토 범위를 명시하고 해당 agent 만 재실행 (aggregate PASS 로 승격 금지)
- **ANY FAIL** → 이슈 수정 후 재실행
- **2회 연속 FAIL (같은 패턴)** → Auto Memory에 반복 패턴 기록

## 언제 사용하나

- 대규모 UI 변경 완료 후
- 새 앱/페이지 구현 완료 후
- 아키텍처 변경 (새 의존성, 새 패턴 도입) 후
- 디자인 오버홀 후

## 추가 확인 포인트

- **동시성 렌즈** (canon `concurrency-safety.md`, architecture-sentinel + security-hardener 공통): 결제·차감·재고·상태전이 diff 에 TOCTOU(read-check-write 갭) · partial write(tx 부재) · 멱등키 결함(부재/랜덤/비원자 예약) · unique constraint 부재가 없는지. D1 대상 코드에 `FOR UPDATE` 가 보이면 오답(존재하지 않음).
- **인증 경계 렌즈** (architecture-sentinel + security-hardener 공통): 앱이 이미 자기 OIDC/session 을 관리하는데 diff 가 그 앞에 **동일 IdP 기반 proxy gate**(CF Access 등)를 추가·교체하면 이중 session authority 의심 — 별도 위협 경계 입증 없으면 P1. 검출 신호: 로그아웃 상태 bare URL 에서만 로그인 4xx · 두 gate 의 cookie 가 동시에 필요 · 인증 통과 후 같은 IdP 로 재redirect. 로그인 진입점을 바꾸는 diff 는 happy-path(기존 session)만이 아니라 bare-entry/callback/logout/expiry 경로가 검토 표면.
- **마크다운 렌더 렌즈** (canon `llm-markdown-safety.md`, security-hardener): LLM/사용자 md 가 `{@html}` 에 닿는 diff — raw HTML escape + URL 허용목록 + 단일 렌더 모듈인지. DOM 의존 새니타이저(isomorphic-dompurify)가 Workers SSR 경로에 들어오면 P0(workerd init throw = 인증 사용자만 500, 익명 스모크 미검출 — canon `cf-deploy.md` §workerd SSR 검증).
- raw 색상(`hex`/`rgb`/`oklch`)이 토큰 레이어 밖에 남아 있는지
- `@layer reset, base, tokens, components, utilities` 구조가 실제 CSS에 반영됐는지
- 같은 제품의 landing/app 사이 semantic token drift가 없는지

## 통합 보고서 형식

```markdown
## Multi-Review Report

### Design Critic: PASS/FAIL
(위반 사항 목록)

### Accessibility Auditor: PASS/FAIL
(위반 사항 목록)

### Architecture Sentinel: PASS/FAIL
(위반 사항 목록)

### Security Hardener: PASS/FAIL
(OWASP/시크릿/인증 위반 사항 목록)

### Triage (P0-P3) — 4-agent 전량을 여기서 랭킹 (발견 단계는 필터 안 함)
- P0 {파일:라인} — {이슈} `[conf: high]`
- P1 / P2 …
- P3 {저심각·uncertain 도 여기 — 버리지 않음} `[conf: low]`

### 종합 판정: ALL PASS / NEEDS FIX
```

## Multi-Agent Research 3-tier 통합 (v2.35 P1.5, 2026-05-13)

4-agent (design-critic / accessibility-auditor / architecture-sentinel / security-hardener) 는 **Tier 3 분산 Evaluator**. 다음과 통합:

- **Tier 1** = `lead-planner` agent — task decomposition + Generator delegate
- **Tier 2** = 도메인 specialist Generator (component-builder / page-builder / api-builder / ...)
- **Tier 3** = 본 multi-review 4-agent (분산) **또는** `evaluator` agent (통합 verdict)

복잡 변경 (PR 전체) → multi-review 4-agent 분산 → `evaluator` 가 final aggregator. 단일 task → `evaluator` 1회 호출.

상세 패턴: `knowledge/canon/multi-agent-research-pattern.md` v1.0+ §"3-Tier 정의".

## 관련 canon

- [agentic-engineering.md](../../../knowledge/canon/agentic-engineering.md) — 본 skill 의 메타 frame (Prompt → Generate → **Review** → Feedback → Iterate). §1.4 untrusted code 가정 + §2.3 verification chain.
- [multi-agent-research-pattern.md](../../../knowledge/canon/multi-agent-research-pattern.md) — Lead Planner → Generator → Evaluator 3-tier (v2.35 P1.5)
