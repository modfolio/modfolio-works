---
description: 3-agent 병렬 리뷰 — design-critic + accessibility-auditor + architecture-sentinel. P0-P3 심각도 태깅
effort: max
model: opus
context: fork
allowed-tools: Read, Glob, Grep, Agent
---

# Multi-Review — 3-Agent 병렬 검증

3개 전문 에이전트를 병렬 실행하여 코드/디자인 품질을 다각도로 검증.

## 실행 방법

`/multi-review` 호출 시:
1. **design-critic** → 디자인 토큰/레이아웃/모션 검사
2. **accessibility-auditor** → WCAG AA/접근성 검사
3. **architecture-sentinel** → 불변 원칙/생태계 규칙 검사

3개 에이전트를 **병렬로** 실행하고, 결과를 통합 보고.

## 결과 처리

- **ALL PASS** → 진행 가능
- **ANY FAIL** → 이슈 수정 후 재실행
- **2회 연속 FAIL (같은 패턴)** → Auto Memory에 반복 패턴 기록

## 언제 사용하나

- 대규모 UI 변경 완료 후
- 새 앱/페이지 구현 완료 후
- 아키텍처 변경 (새 의존성, 새 패턴 도입) 후
- 디자인 오버홀 후

## 통합 보고서 형식

```markdown
## Multi-Review Report

### Design Critic: PASS/FAIL
(위반 사항 목록)

### Accessibility Auditor: PASS/FAIL
(위반 사항 목록)

### Architecture Sentinel: PASS/FAIL
(위반 사항 목록)

### 종합 판정: ALL PASS / NEEDS FIX
```
