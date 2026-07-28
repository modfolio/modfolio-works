---
title: TypeScript 7 Readiness — UI 검사기는 TS 6 유지, UI 파일 0 워크스페이스만 조건부 채택
version: 1.1.0
last_updated: 2026-07-28
source: [modfolio 실측 2026-07-12 (feedback/modfolio/2026-07-12_ts7-workers-ssr-xss-findings.md §1, 커밋 2cb6336·993d602), athsra 실측 2026-07-27 (부분채택 + bun shim 파손), TypeScript 7.0 공식 발표문, sveltejs/language-tools#2733]
sync_to_siblings: true
applicability: always
consumers: [code-reviewer, deploy, evolve]
---

# TypeScript 7 — UI 를 검사하는 자리에서는 채택 불가

> **결정: universe 표준은 TS 6 유지. TS 7 은 side-by-side 카나리아 + 규칙 1 의 세 조건을 계수로 만족하는 워크스페이스에 한해서만.**
> 해제 조건 = **TS 7.1 신 API 출시 + svelte-check/@astrojs/check 상류 포팅** (`sveltejs/language-tools#2733`, 라벨 blocked/upstream).

## 왜 (modfolio 실측 2026-07-12 — 두 장벽은 서로 독립)

### 장벽 ① TS 7 은 JS 컴파일러 API 를 싣지 않는다

`typescript@7.0.2` 해부: `lib/typescript.js`·`lib/tsserver.js` **파일 자체가 없음**. 메인 진입점 = 버전 문자열 파일, 실행은 Go 네이티브 바이너리. `import ts from "typescript"` → `{ version }` 뿐 — `ts.createProgram`·LanguageService 전무. `svelte-check`·`@astrojs/check` 는 그 API 를 임베드하므로 **로드조차 못 하고 크래시**한다. MS 공식: 임베딩 도구는 "can only currently rely on TypeScript 6.0", Vue/MDX/Astro/Svelte 워크플로는 "will likely not yet be able to leverage TypeScript 7", 신 API 는 **7.1 예정** — 그때까지 6.0 과 side-by-side 가 공식 경로다.

### 장벽 ② tsgo 체커가 `@types/three` TSL 타입에서 종료하지 않는다

동일 tsconfig·동일 단일 파일: TS 6 = 3초·에러 0, TS 7 = **600초에도 미완료**(SIGKILL). `--listFilesOnly` 는 1초 → 행은 검사 단계. three/TSL 을 쓰는 repo(랜딩·비주얼 엔진 계열)는 tsgo 자체를 못 돌린다.

## 규칙

1. **`typescript` 는 6.x 유지 — 단 아래 셋을 계수로 만족하면 워크스페이스 단위 부분 채택 가능** (v1.1.0, athsra 2026-07-27 실측 채택). 종전엔 전면 금지였는데, 금지의 **근거 3건이 전부 워크스페이스 속성**이라 계수로 검사할 수 있다. 선언이 아니라 세어서 판정한다:
   - ① **임베딩 검사기를 옮기지 않는다** — `svelte-check`·`astro check`·`vue-tsc` 는 TS 6 에 남긴다(장벽 ①).
   - ② TS 7 로 넘기는 워크스페이스의 **`.svelte`/`.astro`/`.vue` 파일 수 = 0** — 규칙 3 의 가짜 초록불을 *선언이 아니라 계수*로 막는다. 하나라도 있으면 그 워크스페이스는 대상이 아니다.
   - ③ **three/TSL 의존 0**(장벽 ②).

   athsra 실측(worker·cli·crypto 3 워크스페이스, UI 파일 0): typecheck 5/5 0 errors · test 2162 pass · build 3/3 · **검사 대상 감소 0**(UI 105개는 TS 6 검사기가 계속 본다). 조건을 못 맞추는 repo에는 종전 전면 유지가 그대로 적용된다.
2. **준비 계측은 side-by-side**(MS 공식 경로): `typescript-7@npm:typescript@7.0.2` 별칭 + 카나리아 스크립트. `.bin/tsc`·`.bin/tsserver` 는 6 그대로(bin 충돌 없음 — modfolio 실측). TS 7 `exports` 가 내부 파일을 안 열어주므로 **공개 계약(`package.json` → `bin.tsc`)으로 실행**한다.

   ⚠ **MS 공식 TS6 shim 은 bun 에서 작동하지 않는다** (athsra 2026-07-27 실측, bun 1.3.14). 공식 문서가 권하는 `"typescript": "npm:@typescript/typescript6@^6.0.2"` 형태는 **빈 객체를 export 한다**(`Object.keys(require('typescript')).length === 0`). shim 본체가 `module.exports = require("@typescript/old")` 한 줄인데 그 중첩 별칭 의존을 bun 이 설치하지 않고, 루트에 명시해도 `@typescript/old` 의 `package.json` `name` 이 그대로 `"typescript"` 라 별칭 안에서 자기 자신으로 되돌아가는 것으로 보인다. **대조**: `require('@typescript/old')` 직접 호출은 2248 키·6.0.3 정상 — 내부 패키지는 멀쩡하고 shim 의 간접층만 깨진다. **universe 는 bun 표준이므로 이 shim 에 기대면 안 된다** — TS 6 이 필요한 워크스페이스는 별칭 없이 실 `typescript@^6.0.3` 을 쓴다(깨질 간접층이 없다). 이 함정의 최악 형태는 조용함이다: shim 이 빈 객체를 주면 svelte-check·astro check 가 "TS 6 API 는 살아있다" 는 가정 아래 망가진다.
3. **⚠ 가짜 초록불 함정**: `tsc`(tsgo 포함)는 `.svelte`/`.astro` 를 **에러 없이 조용히 건너뛴다**. 게이트를 tsgo 로 바꾸면 UI 전체가 미검사인데 `exit 0` — 빨간불보다 위험. 카나리아는 **"검사 N개 / ⚠ 미검사 .svelte M개" 를 매 실행 강제 출력**해야 한다 (modfolio `scripts/typecheck-ts7.ts` 선례).
4. **⚠ peer 선언을 믿지 마라**: `svelte-check@4.7.2` peer 는 `typescript: >=5.0.0` 로 TS 7 을 허용하는 척하지만 실제로는 크래시. **peer 는 의도, 실행이 진실** — 버전 게이트 판단은 실측으로.
5. **지금 미리 할 것 — `baseUrl` 제거**: TS 7 은 `baseUrl` 제거(TS5102) + `paths` 비상대경로 금지(TS5090). `paths` 를 `"./src/..."` 상대경로로 바꾸면 TS 6·7 양쪽에서 동일 동작(TS 5+ 규약).

## 참고

- modfolio 실측: app `.ts` 218개가 TS 7 에서 에러 0 — **코드는 준비 완료, 막힌 건 툴체인**. 7.1 착륙 시 "이미 통과 증명된" 상태에서 플립.
- 상세 근거·카나리아 구현: modfolio `knowledge/journal/20260712-p0-xss-stack-ts7.md` + `scripts/typecheck-ts7.ts`.
