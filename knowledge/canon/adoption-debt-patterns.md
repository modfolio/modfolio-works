---
title: Adoption Debt Patterns
version: 1.1.0
last_updated: 2026-04-18
source: [v2.3.2 canary 확산 실측, v2.4 20-member Dev Container 확산]
sync_to_children: true
consumers: [harness-pull, preflight, ops]
---

# Adoption Debt Patterns — 하네스 도입을 막는 흔한 잔재

> v2.3.2 하네스를 22개 member에 확산하는 동안 실측으로 발견된 **공통 adoption-blocking debt**를 기록. 새 adoption 시 먼저 점검하면 `pre-commit-guard`가 막는 상황을 사전 방지할 수 있다.

## 왜 이 문서가 있는가

하네스 자체는 pull 시 100% PASS했지만, member의 **이전 상태 debt**가 `pre-commit-guard` 실행 단계에서 드러나 commit이 막히는 사례가 여럿 나왔다. universe는 hub이므로 member debt를 직접 수정하지 않지만, 어떤 debt가 "adoption을 막는가"를 기록하고 **`bun run harness-pull -- --cleanup`** 자동 수정 가능한 것을 모아둔다.

## 7가지 패턴

### 1. Biome v1 legacy config

**증상**: `× Found an unknown key 'organizeImports'.` / `× Found an unknown key 'ignore'.`

**원인**: `biome.json`이 Biome v1 format. v2.x CLI가 config error로 early exit.

**정공법 수정**:
```diff
 {
-  "organizeImports": { "enabled": true },
+  "assist": {
+    "actions": {
+      "source": { "organizeImports": "on" }
+    }
+  },
   "files": {
-    "ignore": ["node_modules", "dist", ".output"]
+    "includes": ["**", "!**/node_modules", "!**/dist", "!**/.output", "!**/.astro", "!**/.svelte-kit"]
   }
 }
```

**주의**: `!dist`가 아니라 `!**/dist` — 중첩 workspace (`apps/*/dist`)까지 정확히 제외해야 astro/svelte 빌드 산출물이 biome 검사 대상에서 빠진다.

**자동화**: `bun run harness-pull -- --cleanup`이 감지 후 제안 + opt-in 수정.

---

### 2. biome 버전 drift

**증상**: `i The configuration schema version does not match the CLI version 2.4.x`

**원인**: `package.json`에 `"@biomejs/biome": "^2.0.0-beta"` 같은 오래된 핀.

**정공법 수정**: 최신으로 업데이트.
```diff
-  "@biomejs/biome": "^2.0.0-beta"
+  "@biomejs/biome": "^2.4.8"
```

---

### 3. tsconfig.json include 스테일 경로

**증상**: `error TS18003: No inputs were found in config file 'tsconfig.json'. Specified 'include' paths were '["src/**/*.ts"]'`

**원인**: 초기 template의 `src/**/*.ts` include가 실제 `apps/*/src/...` 구조와 불일치. scaffold 잔재.

**정공법 수정**:
- monorepo라면 root tsconfig의 typecheck를 제거하고 app별 `-p apps/<app>/tsconfig.json` 호출
- 또는 root `include`를 `apps/**/*.ts` 같은 실재 경로로 조정

---

### 4. CRLF 문자열 잔재 (Windows autocrlf)

**증상**: biome check가 `␍` (CR) 감지 후 `file format` 오류를 길게 출력.

**원인**: `.gitattributes` 없던 시절에 git autocrlf로 CRLF 저장된 파일들.

**정공법 수정** (3단계 한 번에):
```bash
git add --renormalize .                     # index를 .gitattributes 기준 LF로 rewrite
git checkout-index -a -f                    # working tree를 LF로 재작성
bunx biome check --write --unsafe .         # organize imports + LF 최종 포맷
```

v2.3 harness-pull가 `.gitattributes` (LF canonical)를 bootstrap하므로, 이후 정상 LF 유지.

---

### 5. node_modules 미설치

**증상**: `Cannot find module 'astro/astro.js'` 같은 런타임 해결 실패.

**원인**: member가 `bun install`을 실행하지 않은 상태에서 typecheck/check 실행.

**정공법 수정**: `bun install` 한 번. `--cleanup` helper가 감지 후 실행.

---

### 6. astro check + bun on Windows (libuv/css-tree bug)

**증상**: `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76`

**원인**: `astro check`가 내부적으로 사용하는 `css-tree@3.1.0` + bun의 libuv 조합이 Windows에서 async handle을 cleanup 못 함. 환경 버그이지 member 코드 debt가 아님.

**정공법 우회**:
- root `package.json`의 `typecheck`에서 astro check를 분리 → `typecheck:astro`로 옮김
- 기본 `typecheck`는 `tsc --noEmit` 또는 svelte-check만
- astro check 복구는 libuv/css-tree 상류 fix 후 `typecheck:astro`에서 실행

universe 자신도 같은 우회를 적용함 (`check:dashboard` 분리 — universe 커밋 `7dc3a68`).

---

### 7. nested monorepo typecheck scope 혼란

**증상**: root `typecheck`가 `cd apps/landing && bun run check`처럼 엉뚱한 하위 스크립트를 호출.

**원인**: template scaffold 잔재. 실제로 "typecheck"가 아닌 "check"를 부르는 과거 단계가 남음.

**정공법 수정**: root script 이름을 의미에 맞게 정리. 단계별 script를 명시.
```json
"typecheck": "tsc --noEmit -p apps/app/tsconfig.json",
"typecheck:landing": "cd apps/landing && bun run typecheck",
"typecheck:astro": "cd apps/landing && bun run check"
```

---

### 8. git safe.directory 미등록 (Dev Container)

**증상**: `fatal: detected dubious ownership in repository at '/workspaces/modfolio-members/<repo>'`

**원인**: Dev Container가 root 호스트 uid로 마운트한 디렉토리를 vscode uid가 읽으려 할 때 git이 거절. bind-mount로 올라온 member repo 22개 전부 해당.

**정공법 수정**:
- universe `.devcontainer/setup.sh`가 `/workspaces/modfolio-members/*/` 하위를 자동으로 `safe.directory`에 등록 (v2.4.1+).
- wildcard `*` 전역 허용은 **사용하지 않는다** (전역 보안 약화).

**자동화**: 이후 Dev Container rebuild 시 setup.sh가 처리. 이미 실행된 세션에는 `git config --global --add safe.directory <path>`로 member별 추가.

---

### 9. bunx + mise shim → `No version is set for shim: bun` silent fail

**증상**: `bun run harness-pull` Phase 3.5 biome format이 silent skip됨. 이후 `bun run check`에 수십 개 format errors.

**원인**: `bunx biome`이 `bun` shim을 경유하는데, Dev Container나 새 환경에서 mise 전역 기본 bun 버전이 설정 안 돼 shim이 `No version is set for shim: bun`으로 fail. silent catch가 실패를 삼킴.

**정공법 수정 (universe v2.4.1)**:
- `.devcontainer/setup.sh`가 `mise use -g bun@<detected>` 자동 실행.
- `scripts/harness-pull.ts` Phase 3.5: `node_modules/.bin/biome` 직접 호출 우선, fallback으로 `bunx biome`. 실패 시 경고 + stderr 3줄 로그.

---

### 10. esbuild 다중 버전 → svelte-check "The service was stopped" crash

**증상**: svelte-check 또는 astro check가 `Cannot start service: Host version "0.27.3" does not match binary version "0.25.4"` 이후 `The service was stopped` 크래시. `<style>` 블록 같은 특정 위치에서 ERROR로 표기되지만 실제 코드 문제 아님.

**원인**: vite 7 (0.27) / astro 6 (0.25) / svelte-kit (0.24) 등이 각자 다른 esbuild peer를 요구 → node_modules에 esbuild 버전 3-5개 공존. svelte-check가 런타임에 섞인 버전을 로드해 host/binary mismatch.

**정공법 수정**:
- `rm -rf node_modules && bun install` — bun 1.3.5+ 의 resolver가 호환되는 peer set을 재해결해 crash 회복.
- 이 조치로 버전은 여전히 여럿 공존하지만 peer 경계가 정리돼 svelte-check가 일관된 버전으로 실행됨.

**검증**: umbracast v2.4 canary에서 13 esbuild 패키지 공존 상태에서도 `0 errors + 12 a11y warnings`로 회복 확인.

---

### 11. `NPM_TOKEN` 미설정 → `@modfolio/*` 401

**증상**: `error: GET https://npm.pkg.github.com/@modfolio%2fconnect-sdk - 401` 이후 `bun install` fail.

**원인**: member `.npmrc`가 `//npm.pkg.github.com/:_authToken=${NPM_TOKEN}` 사용. 호스트에 GITHUB_TOKEN은 있어도 NPM_TOKEN이 별도 설정 안 된 경우 resolve fail.

**정공법 수정 (universe v2.4.1)**:
- `.devcontainer/devcontainer.json` `remoteEnv`에 `NPM_TOKEN: "${localEnv:NPM_TOKEN}${localEnv:GITHUB_TOKEN}"` — NPM_TOKEN 있으면 그것, 없으면 GITHUB_TOKEN fallback.
- 이 concat 트릭: 둘 중 하나만 설정돼도 값이 채워지며, 둘 다 있으면 NPM_TOKEN이 GitHub Packages 접근 권한만 가진 전용 토큰이면 그것 우선 (GITHUB_TOKEN은 broader scope).

---

### 12. nuxt + bun oxc-walker `transformSync is not a function`

**증상**: `nuxt typecheck` 실행 시 `transformSync is not a function` at `oxc-walker` 내부.

**원인**: Nuxt 4.3.1의 내장 transformer가 bun 1.3.5와 호환 안 됨. upstream 라이브러리 이슈 (`nuxt` + `oxc-walker` + `bun` 조합). harness 범위 밖.

**현재 상태**: naviaca v2.4 adoption 이월. member owner가 (a) nuxt 버전 조정, (b) Node로 실행 (c) upstream patch 중 선택해 해결.

**식별**: `check`나 `typecheck` 스크립트가 `nuxt typecheck`를 직접 호출하면서 oxc-walker 호출 스택이 보이면 동일 이슈.

---

## 대규모 debt는 owner 책임

다음 종류는 **adoption 스코프 밖**:
- Connect SDK 메이저 업그레이드 (v0.x → v7.x 같은 브레이킹)
- repo 전반에 걸친 수십~수백 건의 strict-TS 위반 (예: noUncheckedIndexedAccess로 생긴 optional chain 필요 지점)
- 앱 아키텍처 리팩터가 전제되는 type 미스매치
- Nuxt + bun upstream transformer 호환성 (패턴 12)

이들은 harness가 정리할 수 없고, member owner가 먼저 다듬은 뒤 `bun run harness-pull`로 adoption을 완료한다.

## 사용 순서

새 adoption 시:
1. `bun run harness-pull --dry-run` — 무엇이 바뀔지 확인
2. `bun run harness-pull -- --cleanup` — 자동 수정 가능한 debt 먼저 정리 (opt-in)
3. `bun run harness-pull` — 실제 pull
4. `bun run check && bun run typecheck` — member 자체 게이트
5. `git commit` — `pre-commit-guard`가 `quality:all` 재실행해 최종 확인
