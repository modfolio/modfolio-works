---
name: design-tokens
description: 디자인 토큰 구조 탐색, 시맨틱 변수 추가, 토큰 계층 이해 시 사용
user-invocable: true
---

# /design-tokens

## Auto Context
@knowledge/canon/design-tokens.md
!find . -name 'tokens.css' -o -name 'variables.css' 2>/dev/null | head -3

> House of Brands: 각 앱의 **값**은 다르지만 **구조와 명명**은 동일. 특정 색상값을 처방하지 않는다.

## 3계층 구조

```
Primitives → Semantic → Accent
```

명명: `--{속성}-{역할}-{변형}` (예: `--color-text-primary`, `--space-4`)

## 사용 프로토콜

1. 해당 앱의 토큰 파일(tokens.css/variables.css) 읽기
2. 토큰 팔레트 안에서만 구현 — 팔레트 밖 값 사용 금지
3. 미달 시 **구현이 아닌 토큰 체계를 수정**

## 앱 자율

- 모든 실제 값(색상, spacing, radius, shadow, 모션)은 각 앱이 자유 결정 (Brand Passport는 선택 도구)
- 토큰 bypass 여부는 binary 구조 검출 (canon/design-tokens.md "Token Compliance" 참조)
- SVG 인라인 색상 등 불가피한 하드코딩은 예외 인정

## 상세 레퍼런스

명명 규칙, cascade layer, alpha variant, same-product alignment 등 상세는 `knowledge/canon/design-tokens.md` 참조.
