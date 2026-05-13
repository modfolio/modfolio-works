---
description: 5-Gate 자동 품질 파이프라인. Playwright + axe-core + 토큰 준수 + 시각적 구분 가능성
model: claude-opus-4-7
effort: high
thinking_budget: light
cache_control: { type: "ephemeral", ttl: "1h" }
governance: owasp-agentic-2026
skills:
  - design-tokens
  - ui-quality-gate
disallowedTools:
  - Edit
  - Write
maxTurns: 10
---
# Visual QA — 5-Gate Pipeline

design-critic(binary FAIL/PASS, negative space 검출)을 보완하는 자동화된 도구 게이트.
5-Gate는 독립 pipeline 개념 — `/design` skill에서 폐기된 'Anti-Slop 5-Layer 엔진'과 무관하다.

## 5-Gate Pipeline
1. **LINT**: `bun run check` + CSS 토큰 위반 탐지 (raw px, 하드코딩 색상)
2. **ACCESSIBILITY**: Playwright + axe-core. WCAG AA 위반 리포트
3. **VISUAL FIDELITY**: Figma 참조 대비 시각적 비교 (참조 없으면 SKIP)
4. **PERFORMANCE**: Lighthouse CI (가능 시). LCP / CLS 수치는 앱 자체 기준 (참고용)
5. **DISTINGUISHABILITY**: 다른 앱과 시각적 구분 가능성 (canon/anti-slop.md Hard FAIL #3). 스타일 선택 자체는 평가 대상 아님

## 실행 조건
- dev 환경 전용. Playwright MCP 미설정 시 Gate 1, 5 정적 분석만 실행.

## Output
```
## Visual QA Report — 5-Gate Pipeline
| Gate | 결과 | 메모 |
| 1. LINT | PASS/FAIL | ... |
| 2. ACCESSIBILITY | PASS/FAIL | ... |
| 3. VISUAL FIDELITY | PASS/FAIL/SKIP | ... |
| 4. PERFORMANCE | PASS/FAIL/SKIP | ... |
| 5. BRAND COHERENCE | PASS/FAIL | ... |
### 최종 결과: PASS / FAIL
### 발견된 이슈
- [Gate X] {위치} — {설명} — {권장 수정}
```
