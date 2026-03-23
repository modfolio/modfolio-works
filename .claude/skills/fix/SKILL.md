---
description: 품질 위반 자동수정. 리뷰 보고서 기반 P0/P1 기계적 수정 + 정공법 원칙
effort: medium
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(bun run check:*), Bash(bun run typecheck:*)
user-invocable: true
---


# /fix — 품질 위반 자동수정

마지막 리뷰 보고서(multi-review, stop hook) 읽기 → quality-fixer agent → PostToolUse 자동 재검증

## 프로세스

1. **마지막 리뷰 보고서 확인** (multi-review 또는 stop hook 결과)
2. **quality-fixer agent 실행**: 기계적 수정 가능한 항목 자동 수정
3. **PostToolUse hook이 자동으로 Biome check 실행**
4. **아키텍처 판단 필요한 항목 → 사용자에게 보고**

## 수정 가능 항목

- 하드코딩 색상 → CSS 변수
- 하드코딩 spacing → --space-* 토큰
- prefers-reduced-motion 누락 → @media 블록 추가
- aria-label 누락 → 의미적 라벨 추가
- @ts-ignore → 근본 타입 에러 수정

## 수정 불가 항목 (사용자 에스컬레이션)

- 컴포넌트 구조 재설계
- 디자인 토큰 체계 변경
- 아키텍처 패턴 변경
- 비즈니스 로직 수정
