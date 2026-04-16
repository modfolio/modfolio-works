---
title: Layout Patterns — Structural Principles
version: 3.0.0
last_updated: 2026-04-14
source: [.claude/skills/layout-patterns/SKILL.md]
sync_to_children: true
consumers: [layout-patterns, page, design, fix]
---

# Layout Patterns — Structural Principles

> 구조와 정보 구성의 원칙만 정의. 시각적 스타일, pixel 값, 사업자 정보 같은
> 운영 데이터는 canon에 두지 않는다.
> 법적/브랜드 참고 자료: [docs/internal/legal-and-brand-info.md](../../docs/internal/legal-and-brand-info.md)

## 접근성·시맨틱 기초 (외부 표준)

### 시맨틱 구조

- 시맨틱 HTML 랜드마크 사용 (`nav`, `main`, `footer`, `article`, `section`)
- 키보드 네비게이션이 논리적 순서로 작동할 것
- Skip navigation 링크 존재

### 접근성

- 터치 타겟이 사용 빈도에 비해 구조적으로 과소하지 않을 것 (수치는 앱별 접근성 판단)
- focus ring 가시 (커스텀 or 브라우저 기본)
- `prefers-reduced-motion` 폴백

### 법적 고지 노출

사업자 등록이 필요한 거래를 하는 앱은 사업자 정보가 사용자에게 접근 가능한 위치에 노출되어야 한다.
구체 내용은 [docs/internal/legal-and-brand-info.md](../../docs/internal/legal-and-brand-info.md),
노출 위치/방식은 앱 자율.

## 구조적 감지 신호 (처방 X)

다음 구조적 이상이 감지되면 알려준다. 해결 방식은 작성자 결정:

- 페이지에 랜드마크(`<nav>`, `<main>`, `<footer>`)가 전혀 없음
- 헤더에 접근성 요소(a11y landmark, skip link)가 빠짐
- 모바일에서 가로 스크롤이 의도치 않게 발생 (overflow audit)

## App Decisions (처방 X — 앱 자유)

각 앱은 다음을 자유롭게 결정:
- 헤더 높이 / 스타일 / 고정 vs 스크롤
- 푸터 구조 (단 수 / 컬럼 수 / 정렬)
- 네비게이션 패턴 (탑바 / 사이드바 / 햄버거 / 오버레이 / 풀스크린)
- 브레이크포인트 값
- max-width 값
- 전통적 vs 비전통적 레이아웃 (가로 스크롤, 풀스크린, 비대칭 등)
