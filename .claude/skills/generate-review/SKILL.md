---
name: generate-review
description: 생성→리뷰 통합 파이프라인. 생성 agent 실행 후 multi-review 자동 검증 + P0-P3 triage
context: fork
effort: xhigh
user-invocable: true
---


# /generate-review — 생성→리뷰 통합 파이프라인

생성 agent 실행 → multi-review 4-agent 병렬 → FAIL시 quality-fixer → 최대 2회 반복 → 에스컬레이션

## 프로세스

1. **생성 agent 실행** (component-builder, api-builder, schema-builder 등 — 사용자 요청에 따라)
2. **multi-review 실행**: 4개 에이전트 병렬
   - **design-critic**: 디자인 토큰/레이아웃/모션 검증
   - **accessibility-auditor**: WCAG AA/접근성 검증
   - **architecture-sentinel**: 불변 원칙/생태계 규칙 검증
   - **security-hardener**: OWASP Top 10 + 시크릿 노출 + 인증/인가 검증 (v2.13.0 추가)
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

## Claude Code `/ultrareview` 병용 (2026-04 신규, v2.1.111+)

- **`/ultrareview`** — Claude Code 빌트인. PR 전체 diff를 병렬 multi-agent로 리뷰 (Anthropic 클라우드 실행). 범용 코드 스멜·보안·버그 탐지
- **`/generate-review`** + `multi-review` — Modfolio 도메인 특화. 디자인 토큰·생태계 불변 원칙·접근성 domain-specific

**권장 2단계**: PR 단계 `/ultrareview` (범용) → 머지 직전 `/generate-review` (Modfolio 도메인). **병용이지 대체 아님**.

## Multi-Agent Research 3-tier 통합 (v2.35 P1.5, 2026-05-13)

본 skill 은 **Lead Planner → Generator → Evaluator 3-tier** 의 가장 가벼운 instance:

1. **Tier 1** — 사용자 prompt 가 곧 Lead Planner role (또는 `lead-planner` agent fork)
2. **Tier 2** — Generator agent (component-builder / api-builder / 등) 가 작업 수행
3. **Tier 3** — `multi-review` 4-agent 분산 또는 `evaluator` 통합 verdict

복잡한 다단계 작업 → `lead-planner` agent 명시 호출. 단순 generate→review → 본 skill 직접 사용.

상세: `knowledge/canon/multi-agent-research-pattern.md` v1.0+.

## 관련 canon

- [agentic-engineering.md](../../../knowledge/canon/agentic-engineering.md) — 본 skill 의 메타 frame (Prompt → **Generate** → **Review** → Feedback → Iterate). §2.1 skill ↔ 단계 매핑 표 참조.
- [multi-agent-research-pattern.md](../../../knowledge/canon/multi-agent-research-pattern.md) — Lead Planner → Generator → Evaluator 3-tier (v2.35 P1.5)
