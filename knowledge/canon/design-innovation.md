---
title: Design Innovation — Detection & Self-Check Tools
version: 2.0.0
last_updated: 2026-04-14
source: [knowledge/canon/design-innovation.md]
sync_to_siblings: true
applicability: always
consumers: [design, component, page]
---

# Design Innovation — Detection & Self-Check Tools

> 디자인을 강제 정의하지 않는다. 다만 **반복(repetition)을 검출**하고 **자가 점검 도구**를 제공한다.
> 무엇이 좋은 디자인인가는 각 앱이 결정한다.

## Design Brief Protocol (선택적 자가 점검)

새 화면 / 컴포넌트를 만들기 전 작성자가 스스로 답해보면 좋은 3문장. **외부 강제 아님**.

1. **Purpose**: 이 화면/컴포넌트의 고유한 목적은? (다른 화면과 구별되는 이유)
2. **Feeling**: 사용자가 느껴야 할 감정/분위기는? (나머지 생태계와 어떻게 다른가)
3. **Constraint Push**: 의도적으로 밀어붙이는 제약은? (어떤 기존 패턴을 깨는가)

여러 변형을 탐색하고 싶을 때 사용. 단일 안에 만족한다면 생략 가능.

## Anti-Repetition Heuristics (검출 도구 — 강제 가이드 아님)

| 검출 신호 | 동작 |
|----------|------|
| 구조적 유사도 — 최근 3개 유사 컴포넌트와 눈에 띄는 공통 구조 | 반복 신호 감지 (결정은 작성자) |
| 단일 변형 — 대안 탐색 흔적 없음 | 반복 신호 감지 (결정은 작성자) |

수치 임계(80% 등)도, "권장" 문구도 두지 않는다. 반복 신호를 알려줄 뿐이다.

## Headless Component 원칙

컴포넌트의 **행동**과 **시각적 표현**을 분리:

- **잠금 (Behavior)**: click 이벤트, focus ring, 키보드 내비, aria 속성
- **자유 (Expression)**: 배경색, 패딩, border-radius, 타이포그래피, 모션

동일 행동 컴포넌트의 시각적 변형을 두려워하지 않는다.
"버튼은 이렇게 생겨야 한다"가 아니라 "버튼은 이렇게 동작해야 한다."

## Context-Aware Token

동일 시맨틱 이름, 맥락별 다른 값 — viewport / 화면 유형 / 인터랙션 상태별 오버라이드.
상세 패턴은 [canon/design-tokens.md](design-tokens.md)의 "Context-Aware Token Overrides" 참조.
