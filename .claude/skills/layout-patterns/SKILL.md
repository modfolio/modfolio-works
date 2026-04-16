---
name: layout-patterns
description: 레이아웃 구조 원칙 참조. 시맨틱/접근성/법적 고지는 외부 표준(WCAG/법) 정합, pixel 값·breakpoint·헤더 높이 등 구체 수치는 앱 자율.
user-invocable: true
---

# /layout-patterns — 레이아웃 구조 원칙 참조

이 스킬은 **구조 원칙 + 법적 고지 위치 안내**를 제공한다. 구체 수치와 시각적
스타일은 앱 자율이라 "80px 고정 헤더" 같은 처방은 없다.

## 판단 대상 (canon 참조)

접근성·시맨틱 기초와 구조적 감지 신호는 canon에서 관리:

- [canon/layout-patterns.md](../../knowledge/canon/layout-patterns.md) — 구조 원칙
- [docs/internal/legal-and-brand-info.md](../../docs/internal/legal-and-brand-info.md) — 사업자/SNS 정보 (푸터 참조)

## 앱 자유 결정 (처방 X)

- 헤더 높이, 고정 여부, 스크롤 동작
- 푸터 단 수, 컬럼 배치
- 네비게이션 패턴 (탑바/사이드바/햄버거/오버레이)
- 브레이크포인트 값
- max-width 값
- 섹션 여백
- 전통적 vs 비전통적 레이아웃

## 사용법

- 신규 페이지 만들 때: canon의 접근성·시맨틱 기초만 확인 → 나머지는 앱 브랜드 정체성으로 결정
- 법적 고지가 필요한 앱: `docs/internal/legal-and-brand-info.md`에서 정보 가져와 원하는 위치에 노출
