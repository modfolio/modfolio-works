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
   - **security-hardener**: OWASP Top 10 + 시크릿 노출 + 인증/인가 검증 (v2.13.0 추가) — 인증 gate 신설·중첩 diff 는 이중 session authority 의심: 동일 IdP 의 proxy gate + 앱 OIDC 공존, bare URL 진입만 4xx, 인증 cookie 2개 동시 요구, 인증 통과 후 같은 IdP 재redirect 가 검출 신호
3. **결과 처리**:
   - **ALL PASS** → 완료. 단 PASS 는 **최약 필수 게이트** 기준으로 판정: 리뷰·테스트 결과에 timedOut/skipped/incomplete 신호가 있으면 aggregate PASS 를 전체 성공으로 승격하지 말고 미완료 범위를 재실행해 종료 코드·전체 count 확보
   - **FAIL (기계적)** → quality-fixer agent로 자동수정 → 재검증 — fixer/subagent 의 "green" claim 은 증거가 아니다: 메인이 게이트를 직접 재실행해 exit code 원문을 확인한 뒤에만 PASS 기록
   - **FAIL (아키텍처)** → 사용자 에스컬레이션
4. **최대 2회 반복** 후에도 FAIL → 사용자에게 보고

## 발견 → triage 2-단계 (Opus 4.8 under-reporting 보정)

> Anthropic `prompting-claude-opus-4-8`: Opus 4.8 은 "확실한 것만" 류 지시를 과충실히 따라 발견을 **누락**할 수 있다(precision↑ measured recall↓). 그래서:
> - **step 2 (multi-review 4-agent) = 발견 / coverage**: 리뷰어는 불확실·저심각까지 `[conf]` + severity 를 태깅해 **전수** 보고(스스로 버리지 않음).
> - **step 3 (P0-P3 triage) = filter / rank**: 올라온 전량을 여기서 랭킹·취사선택. 필터는 이 단계에서만 (uncertain 은 P3, 버리지 않음).
>
> 상세 원칙은 `multi-review` skill 의 "발견 → triage 2-단계" 참조.

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
