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

- **ALL PASS** → 진행 가능
- **ANY FAIL** → 이슈 수정 후 재실행
- **2회 연속 FAIL (같은 패턴)** → Auto Memory에 반복 패턴 기록

## 언제 사용하나

- 대규모 UI 변경 완료 후
- 새 앱/페이지 구현 완료 후
- 아키텍처 변경 (새 의존성, 새 패턴 도입) 후
- 디자인 오버홀 후

## 추가 확인 포인트

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

### 종합 판정: ALL PASS / NEEDS FIX
```

## 관련 canon

- [agentic-engineering.md](../../../knowledge/canon/agentic-engineering.md) — 본 skill 의 메타 frame (Prompt → Generate → **Review** → Feedback → Iterate). §1.4 untrusted code 가정 + §2.3 verification chain.
