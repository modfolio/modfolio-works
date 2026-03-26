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

## 프레임워크별 헤드리스 UI 전략

프레임워크에 따라 적절한 헤드리스 UI를 선택한다 (House of Brands: 각 앱 독립).

| 프레임워크 | 헤드리스 UI | 설치 방식 | 스타일링 |
|-----------|-----------|----------|---------|
| SvelteKit 5 | shadcn-svelte (Bits UI 기반) | `bunx shadcn-svelte@latest add {component}` | UnoCSS Wind4 |
| SolidStart | Kobalte (~35 컴포넌트) | `bun add @kobalte/core` | UnoCSS Wind4 |
| Qwik City | 커스텀 (Qwik UI 미성숙) | 직접 구현 | UnoCSS Wind4 |
| Nuxt 3 | Nuxt UI (전용) | 이미 사용 중 | UnoCSS |
| Hono | N/A (API only) | - | - |
| Astro (랜딩) | 순수 HTML/CSS | 직접 구현 | UnoCSS Wind4 |

**기본 6종** (새 프로젝트 초기 셋업): Button, Dialog, Popover, Dropdown, Tabs, Accordion

> shadcn-svelte는 **패키지가 아니라 소스 코드 복사**. 각 앱이 자기만의 사본을 소유한다.

## 사용 예시

```
/component — Figma 링크에서 pricing card 구현해줘
/component — gistcore의 토큰으로 audio player 만들어줘
/component — naviaca CRM 대시보드에 통계 카드 추가해줘
```
