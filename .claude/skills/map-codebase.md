---
description: 기존 코드베이스 분석. 스택/아키텍처/컨벤션/기술부채를 Explore Agent로 매핑. 새 앱 전환 시 사용
effort: medium
allowed-tools: Read, Glob, Grep
---

# /map-codebase — 코드베이스 분석

기존 코드베이스의 현재 상태를 체계적으로 분석하여 보고한다.

## 사용 시점

- 새 앱에서 처음 작업을 시작할 때
- 오랫동안 작업하지 않았던 레포로 복귀할 때
- /innovation-check 전에 현재 상태 파악
- 코드베이스 전체 구조 이해가 필요할 때

## 프로세스

Explore 서브에이전트(haiku)를 "very thorough" 레벨로 실행하여 4가지 영역을 분석:

### 1. Stack Analysis
- `package.json` 의존성 + 버전
- 프레임워크 식별 (SvelteKit/Astro/Hono/Nuxt/SolidStart)
- DB 타입 (Neon/D1/Turso)
- 빌드/린트 도구

### 2. Architecture Analysis
- 디렉토리 구조 (2 depth)
- 라우트 구조 (pages, API routes)
- 컴포넌트 계층
- 데이터 흐름 (서버 → 클라이언트)

### 3. Convention Analysis
- 네이밍 패턴 (파일명, 변수명)
- CSS/스타일링 패턴 (토큰 사용 여부)
- 에러 처리 패턴
- 테스트 패턴 (있다면)

### 4. Debt Analysis
- TODO/FIXME/HACK 코멘트
- @ts-ignore, as any, biome-ignore 현황
- deprecated API 사용
- 테스트 커버리지 상태

## 출력

사용자에게 직접 보고. 별도 파일 생성 불필요 — 세션 내 컨텍스트로 활용.
