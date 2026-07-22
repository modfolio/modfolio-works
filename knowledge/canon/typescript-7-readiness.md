---
title: TypeScript 7 Readiness — Svelte/Astro/Vue repo 는 TS 6 유지 + side-by-side 카나리아
version: 1.0.0
last_updated: 2026-07-12
source: [modfolio 실측 2026-07-12 (feedback/modfolio/2026-07-12_ts7-workers-ssr-xss-findings.md §1, 커밋 2cb6336·993d602), TypeScript 7.0 공식 발표문, sveltejs/language-tools#2733]
sync_to_siblings: true
applicability: always
consumers: [code-reviewer, deploy, evolve]
---

# TypeScript 7 — 현재 채택 불가 (Svelte/Astro/Vue 계열 전 repo)

> **결정: universe 표준은 TS 6 유지. TS 7 은 side-by-side 카나리아로만.**
> 해제 조건 = **TS 7.1 신 API 출시 + svelte-check/@astrojs/check 상류 포팅** (`sveltejs/language-tools#2733`, 라벨 blocked/upstream).

## 왜 (modfolio 실측 2026-07-12 — 두 장벽은 서로 독립)

### 장벽 ① TS 7 은 JS 컴파일러 API 를 싣지 않는다

`typescript@7.0.2` 해부: `lib/typescript.js`·`lib/tsserver.js` **파일 자체가 없음**. 메인 진입점 = 버전 문자열 파일, 실행은 Go 네이티브 바이너리. `import ts from "typescript"` → `{ version }` 뿐 — `ts.createProgram`·LanguageService 전무. `svelte-check`·`@astrojs/check` 는 그 API 를 임베드하므로 **로드조차 못 하고 크래시**한다. MS 공식: 임베딩 도구는 "can only currently rely on TypeScript 6.0", Vue/MDX/Astro/Svelte 워크플로는 "will likely not yet be able to leverage TypeScript 7", 신 API 는 **7.1 예정** — 그때까지 6.0 과 side-by-side 가 공식 경로다.

### 장벽 ② tsgo 체커가 `@types/three` TSL 타입에서 종료하지 않는다

동일 tsconfig·동일 단일 파일: TS 6 = 3초·에러 0, TS 7 = **600초에도 미완료**(SIGKILL). `--listFilesOnly` 는 1초 → 행은 검사 단계. three/TSL 을 쓰는 repo(랜딩·비주얼 엔진 계열)는 tsgo 자체를 못 돌린다.

## 규칙

1. **`typescript` 는 6.x 유지.** 게이트(`svelte-check`·`astro check`·`tsc --noEmit`)를 TS 7 로 갈아치우지 않는다.
2. **준비 계측은 side-by-side**(MS 공식 경로): `typescript-7@npm:typescript@7.0.2` 별칭 + 카나리아 스크립트. `.bin/tsc`·`.bin/tsserver` 는 6 그대로(bin 충돌 없음 — modfolio 실측). TS 7 `exports` 가 내부 파일을 안 열어주므로 **공개 계약(`package.json` → `bin.tsc`)으로 실행**한다.
3. **⚠ 가짜 초록불 함정**: `tsc`(tsgo 포함)는 `.svelte`/`.astro` 를 **에러 없이 조용히 건너뛴다**. 게이트를 tsgo 로 바꾸면 UI 전체가 미검사인데 `exit 0` — 빨간불보다 위험. 카나리아는 **"검사 N개 / ⚠ 미검사 .svelte M개" 를 매 실행 강제 출력**해야 한다 (modfolio `scripts/typecheck-ts7.ts` 선례).
4. **⚠ peer 선언을 믿지 마라**: `svelte-check@4.7.2` peer 는 `typescript: >=5.0.0` 로 TS 7 을 허용하는 척하지만 실제로는 크래시. **peer 는 의도, 실행이 진실** — 버전 게이트 판단은 실측으로.
5. **지금 미리 할 것 — `baseUrl` 제거**: TS 7 은 `baseUrl` 제거(TS5102) + `paths` 비상대경로 금지(TS5090). `paths` 를 `"./src/..."` 상대경로로 바꾸면 TS 6·7 양쪽에서 동일 동작(TS 5+ 규약).

## 참고

- modfolio 실측: app `.ts` 218개가 TS 7 에서 에러 0 — **코드는 준비 완료, 막힌 건 툴체인**. 7.1 착륙 시 "이미 통과 증명된" 상태에서 플립.
- 상세 근거·카나리아 구현: modfolio `knowledge/journal/20260712-p0-xss-stack-ts7.md` + `scripts/typecheck-ts7.ts`.
