---
name: generate-review
description: 생성→리뷰 통합 파이프라인. 생성 agent 실행 후 multi-review 자동 검증 + P0-P3 triage
context: fork
user-invocable: true
---


# /generate-review — 생성→리뷰 통합 파이프라인

생성 agent 실행 → multi-review 3-agent 병렬 → FAIL시 quality-fixer → 최대 2회 반복 → 에스컬레이션

## 프로세스

1. **생성 agent 실행** (component-builder, api-builder, schema-builder 등 — 사용자 요청에 따라)
2. **multi-review 실행**: 3개 에이전트 병렬
   - **design-critic**: 디자인 토큰/레이아웃/모션 검증
   - **accessibility-auditor**: WCAG AA/접근성 검증
   - **architecture-sentinel**: 불변 원칙/생태계 규칙 검증
3. **결과 처리**:
   - **ALL PASS** → 완료
   - **FAIL (기계적)** → quality-fixer agent로 자동수정 → 재검증
   - **FAIL (아키텍처)** → 사용자 에스컬레이션
4. **최대 2회 반복** 후에도 FAIL → 사용자에게 보고

## Agent Teams (선택적 강화)

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 활성화 시:
- 3개 리뷰어가 서로 발견사항 공유/토론 가능
- 상충하는 의견 (예: a11y vs 디자인 트레이드오프) 토론
- 팀 리드가 종합 보고서 생성

비활성 시: 기존 multi-review 패턴 (병렬 독립 실행, 결과 통합) 자동 사용.

## 사용 예시

```
/generate-review — gistcore에 speaking session 카드 컴포넌트 만들고 검증까지
/generate-review — modfolio-pay에 구독 API + 테스트 생성하고 풀 리뷰
```
