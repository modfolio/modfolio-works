---
description: 생태계 기술 스택 최신성 + 혁신성 감사. Stability Filter 포함 + deprecated API 탐지
effort: high
allowed-tools: Read, Glob, Grep, Agent
user-invocable: true
---


# /innovation-check — 기술 스택 혁신성 검사

ecosystem.json 로드 → innovation-scout agent → deprecated API 탐지 → 업그레이드 권장

## 프로세스

1. **ecosystem.json 로드**: 앱별 프레임워크/DB 버전 확인
2. **innovation-scout agent 실행**: context7 MCP로 최신 버전 조회 + deprecated API 탐지
3. **업그레이드 권장 목록 생성**: breaking change 영향 포함
4. **결과 기록**: knowledge/journal에 감사 결과 기록

## 검사 대상

- 프레임워크 버전 (SvelteKit, SolidStart, Astro, Hono, Nuxt, Qwik)
- ORM 버전 (Drizzle)
- Auth 버전 (Better Auth)
- Runtime 버전 (Bun)
- 빌드 도구 (Biome, TypeScript)
- 주요 의존성 (각 앱 package.json)

## 사용 예시

```
/innovation-check — 전체 생태계 버전 감사
/innovation-check — gistcore의 의존성 최신성 확인
/innovation-check — deprecated API 사용 전수 조사
```
