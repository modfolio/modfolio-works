---
description: 토큰 제약 내 UI 컴포넌트 생성 파이프라인. Figma Canvas to Code + 디자인 토큰 검증
effort: high
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(bun run check:*), Bash(bun run typecheck:*)
user-invocable: true
---


## Auto Context
@ecosystem.json

# /component — 컴포넌트 생성 파이프라인

토큰 팔레트 읽기 → component-builder agent → design-critic 검증 → FAIL시 재수정 (최대 2회)

## 프로세스

1. **대상 앱과 프레임워크 식별** (사용자 요청에서 추론)
2. **토큰 팔레트 읽기**: 앱의 CSS 변수 파일에서 사용 가능한 토큰 추출
3. **Figma 링크 있으면**: Canvas to Code 모드로 디자인 데이터 로드
4. **component-builder agent 실행**: 토큰 제약 + 프레임워크 규칙 내 컴포넌트 생성
5. **design-critic agent 실행**: 생성된 컴포넌트 디자인 검증
6. **FAIL시**: 위반 사항을 component-builder에 피드백 → 재수정 (최대 2회)
7. **최종 검증**: `bun run check` 통과

## 사용 예시

```
/component — Figma 링크에서 pricing card 구현해줘
/component — gistcore의 토큰으로 audio player 만들어줘
/component — naviaca CRM 대시보드에 통계 카드 추가해줘
```
