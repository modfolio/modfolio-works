---
title: Anti-Slop
version: 3.0.0
last_updated: 2026-04-14
source: [knowledge/references/260321-AI-Slop.md]
sync_to_children: true
consumers: [design, component, page, fix, design-critic, design-engineer]
---

# Anti-Slop — Negative-Space Reference

> AI Slop = 통계적 안전지대 회귀. 이 문서는 **회피해야 할 것**과 **검출 신호**만 정의한다.
> 권장 패턴 / 가중치 / 점수표는 의도적으로 두지 않는다 — prescriptive 가이드 자체가 슬롭의 원인.
> 각 앱의 시각 정체성 결정은 그 앱의 자율이다.

## Hard FAIL (3개 — binary 판정)

1. **하드코딩 HEX/RGB/OKLCH** — 토큰 체계 우회 (구조적 문제)
2. **WCAG AA 미달** — 접근성 위반 (법적 문제)
3. **다른 앱과 시각적 구분 불가** — House of Brands 위반 (전략적 문제)

위 3개 외의 디자인 선택은 모두 PASS. 중앙 정렬 히어로, 보라-파랑, 라운드+shadow 같은
스타일 선택은 그 앱의 자율 결정이며 design-critic은 이런 선택에 FAIL을 주지 않는다.

## Intentionality Test (셀프 체크 — 외부 강제 아님)

새 패턴을 지을 때 작성자가 스스로 답해보면 좋은 3가지. 답변을 강제로 요구하지 않는다.

1. 이 패턴이 이 앱의 정체성에 부합하는가?
2. 의도적 선택인가, AI 기본값에 그냥 따라간 결과인가?
3. 같은 생태계의 다른 앱과 시각적으로 구분되는가?

## Token Bypass — 검출 대상 (FAIL)

- `style="color: oklch(...)"` 같은 inline literal
- component `<style>` 안의 raw `oklch()` / `rgba()` / `#hex` 반복
- semantic token 없이 alpha tint를 직접 수식으로 복사

oklch() 형식 자체는 기술적 선택이지 품질 지표가 아니다. 하드코딩 여부(`var()` 사용 여부)가
판단 기준이다. rgb(), hsl(), hex 모두 `var()` 안에서 사용하면 동일하게 PASS.

## HCI 법칙 — 구조적 검출만 (WARN)

| HCI 법칙 | 검출 신호 (수치 임계 X, 구조적 비수치만) |
|---------|------------------------------------------|
| Miller's Law | 최상위 내비게이션 수가 단기 기억 용량을 명백히 초과할 때 |
| 게슈탈트 근접성 | 관련 요소가 서로 다른 간격 토큰으로 흩어질 때 |
| Fitts' Law | 자주 쓰는 액션이 구조적으로 터치 타겟 과소로 판단될 때 (수치는 앱별 접근성 가이드 참조) |

위는 검출 대상일 뿐 권장 패턴이 아니다. 해결 방식은 앱 자율.

## 모션 Anti-Slop — 회피 대상 (WARN)

- 동시 리니어 애니메이션 (stagger 없음)
- ease-in-out 기본 이징을 모든 곳에 일괄 적용
- `prefers-reduced-motion` 미준수

대체 방식의 구체값은 앱 자율. canon/motion-patterns.md는 참고 사례.
