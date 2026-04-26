---
title: Adoption Debt Patterns
version: 1.5.0
last_updated: 2026-04-22
source:
  [
    v2.3.2 canary 확산,
    v2.4 20-member Dev Container 확산,
    v2.5 독립화 리팩터링,
    v2.6 npm publish 경로,
    v2.9 biome musl glibc workaround,
    v2.10 exact-pin 주입의 함정,
  ]
sync_to_siblings: true
applicability: always
consumers: [harness-pull, preflight, ops]
---

# Adoption Debt Patterns — 하네스 도입을 막는 흔한 잔재

> v2.3.2 하네스를 22개 member에 확산하는 동안 실측으로 발견된 **공통 adoption-blocking debt**를 기록. 새 adoption 시 먼저 점검하면 `pre-commit-guard`가 막는 상황을 사전 방지할 수 있다.

## 왜 이 문서가 있는가

하네스 자체는 pull 시 100% PASS했지만, member의 **이전 상태 debt**가 `pre-commit-guard` 실행 단계에서 드러나 commit이 막히는 사례가 여럿 나왔다. universe는 hub이므로 member debt를 직접 수정하지 않지만, 어떤 debt가 "adoption을 막는가"를 기록하고 **`bun run harness-pull -- --cleanup`** 자동 수정 가능한 것을 모아둔다.

## 16가지 패턴

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

### 13. Bind mount cross-member contamination (v2.5 해결)

**증상**: universe Dev Container 1개가 22 member를 `/workspaces/modfolio-members` bind mount로 관리할 때, member별 infra gap(NPM_TOKEN / mise shim / safe.directory / esbuild 버전 / 호환성)이 누적 탐지됨. 각각의 hotfix가 또 다른 증상을 유발.

**원인**: "하나의 컨테이너에 여러 독립 프로젝트"라는 구조 결정. 각 member의 환경 요구가 다른 member의 실행에 영향을 미치는 cross-contamination.

**정공법 (v2.5 리팩터)**:
- universe Dev Container에서 bind mount 제거 — universe는 hub 역할만
- 각 member는 자기 Dev Container로 독립 작동 — member 소유자 자율
- `syncToolkitConfig` → `observeToolkitConfig` — universe는 member의 toolkit 상태를 **파악**만 하고 덮어쓰지 않음 (`pull-manifest.json.toolkitObservation`)
- `findUniverseRoot` 3-way 전략 — env / sibling / bunx-published

**교훈**: 증상이 5개 이상 누적되면 구조 결정 자체를 의심. "한 번의 정공법 리팩터가 다섯 번의 증상 패치보다 짧다."

참조: `docs/releases/2026-04-19-harness-v2.5.md`, `knowledge/journal/20260419-harness-v2.5-independence.md`

---

### 14. Private registry 환상 — 장벽은 토큰에 귀속 (v2.6)

**증상**: v2.5에서 "외부 기여자 진입 장벽 제거"를 목표로 `bunx github:modfolio/modfolio-universe#<tag>` 경로를 예고했으나, v2.6 PoC에서 404. universe 레포가 `private: true`이기 때문.

**원인**: universe가 private인 한 어떤 packaging 경로를 써도 **외부 기여자는 modfolio org 접근 토큰이 필요**. npm publish든, bunx github:든, git clone이든 결과는 동일하다. "publish하면 외부 기여자가 바로 쓸 수 있다"는 건 public 레포일 때만 성립.

**bun 1.3.5 실측 한계** (2026-04-19 PoC):
- `bunx github:owner/repo#<ref>` → `GET https://api.github.com/repos/.../tarball/<ref> - 404` (private repo 미지원)
- `GITHUB_TOKEN`, `GITHUB_ACCESS_TOKEN` env 전부 무시 — bun이 tarball API 호출에 Authorization 싣지 않음
- `git+https://github.com/...` prefix, git credential helper 구성도 같은 엔드포인트로 라우팅되어 모두 404
- 공식 auth 지원 경로는 `[install.scopes]` scoped npm registry 뿐 ([oven-sh/bun/guides/install/registry-scope](https://github.com/oven-sh/bun/blob/main/docs/guides/install/registry-scope.mdx))

**정공법 v2.6 — Option A**:
- `@modfolio/harness`를 GitHub Packages (`https://npm.pkg.github.com`, access: restricted)에 publish
- 각 member의 `.npmrc`에 이미 존재하는 `@modfolio:registry=https://npm.pkg.github.com` + `_authToken=${GITHUB_TOKEN}` 설정을 재활용
- consumer flow: `bun add -D @modfolio/harness@<version>` → `bunx modfolio-harness-pull ...` (local node_modules 해석)
- "clone 없이 one-shot bunx"는 성립 안 함 (bun의 bunx 전역 캐시가 cwd의 `.npmrc`/bunfig를 읽지 않음) — member는 devDep으로 add 후 실행

**교훈**:
1. **"private registry = 장벽 제거"는 환상**. 장벽은 registry 기술이 아니라 token scope에 있다.
2. **bunx ≠ bun add**. bunx 전역 캐시는 cwd config를 읽지 않는다. scoped private package는 반드시 `bun add` 선행 후 실행.
3. **실험 없이 "예고"하지 말라**. v2.5는 Option C를 "예고"했지만 v2.6 PoC에서 막혔다. 다음 major 릴리즈 플랜에서는 core mechanism PoC를 릴리즈 전에 완료.

참조: `docs/releases/2026-04-19-harness-v2.6.md`, `knowledge/journal/20260419-harness-v2.6-npm-publish.md`

### 15. Biome musl false-positive on glibc Dev Container (v2.9)

**증상**: VS Code Biome extension 이 3연타로 알림을 던지고 LSP 가 올라오지 않음.
- `biome client: couldn't create connection to server`
- `Server initialization failed`
- `Pending response rejected since connection got disposed`

동시에 `bun install` 이 `@biomejs/cli-linux-x64-musl` 추출 단계에서 13분+ hang. modfolio, modfolio-connect 등 여러 member 에서 같은 양상 재현 (2026-04-22).

**원인**: bun 1.3.5 이 member Dev Container (Ubuntu 24.04, glibc) 에서 Biome 선택적 바이너리를 해석할 때 `linux-x64-musl` 변종까지 다운로드를 시도한다. Ubuntu 는 glibc 이라 애초에 필요 없는 바이너리인데, bun 이 libc 를 구분하지 못해 두 변종 모두 요청 → musl tarball 추출이 bun 내부에서 hang. biome CLI binary 가 준비되지 않은 상태에서 VS Code Biome extension 이 LSP 초기화를 시도해 위 3 에러로 이어진다.

과거 기록: universe 자체는 `8660394 fix(devcontainer): 정공법 — musl hang 근본 해결` 커밋에서 `overrides` 로 gnu 변종을 강제 리다이렉트했다. 하지만 v2.6~v2.8 의 `harness-pull` 은 이 `overrides` 를 member 로 전파하지 않아 (Identity file 원칙) 각 member 마다 개별 재발.

**정공법 v2.9 수정**:
```jsonc
// 각 member 의 package.json
"overrides": {
  "@biomejs/cli-linux-x64-musl": "npm:@biomejs/cli-linux-x64@2.4.8"
}
```

**자동화**: `scripts/harness-pull/resolve.ts` 의 `resolvePackageJsonAction()` 이 member `package.json.overrides` 에 해당 key 가 **없을 때만** 주입. child 가 의도적으로 다른 값을 두었으면 보존 (Hub-not-enforcer). `.claude/harness-lock.json` 에 `package.json` path 를 잠그면 자동 주입 자체를 차단할 수 있다.

**즉시 해결 (v2.9 배포 전 긴급)**:
```bash
npm pkg set overrides.@biomejs/cli-linux-x64-musl="npm:@biomejs/cli-linux-x64@2.4.8"
rm -rf node_modules bun.lock
bun install
# VS Code: Developer: Reload Window → Biome LSP 재가동 확인
```

**교훈**:
1. **Identity vs Infrastructure 구분**: `package.json` 전체는 child identity 이지만 `overrides` 의 libc workaround 같은 *컨테이너 환경 귀속* field 는 infrastructure debt 에 해당. harness 가 이미 `scripts.harness-pull` 을 주입하는 선례와 동일 범주로 처리한다.
2. **공급자 측 fix 가 consumer 로 전파되지 않으면 debt 는 반복 재발**. 같은 증상이 3+ member 에서 확인되면 개별 수정이 아니라 resolve-단계 자동화로 승격한다.
3. **LSP 3연타 패턴은 CLI binary 부재 신호**. "server initialization failed" 단독이 아니라 세 에러가 순서대로 뜨면 대체로 선행 단계의 설치 hang/실패가 원인이다.

참조: `knowledge/journal/20260422-harness-v2.9-biome-musl.md`, `scripts/harness-pull/resolve.ts` (`resolvePackageJsonAction`), `scripts/harness-pull/tests/resolve-package-json.test.ts`

### 16. Exact-pin 주입의 함정 — Hub-not-enforcer 위반 (v2.10)

**증상** (2026-04-22 modfolio 재발):
- universe 가 v2.9 에서 "패턴 15 자동화" 를 자랑했으나 실제로는 `npm:@biomejs/cli-linux-x64@2.4.8` 을 **exact-pin 으로 하드코딩 주입**. child 가 `@biomejs/biome@^2.4.8` 을 `2.4.12` 로 resolve 하면 override 는 `2.4.8` 만 가리킴 → biome LSP 가 optional native binary version skew 로 "I/O error 2" exit code 1.
- `bun add -D @modfolio/harness@${harnessLatest}` 도 exact 버전 주입 → `"@modfolio/harness": "2.8.1"` 형태로 package.json 에 박힘 → `bun install` 으로 2.9.x 자동 업그레이드 불가.
- 사용자 진단: "우리가 주는 가이드는 무언가를 고정하는 게 아니라 항상 최신 state 를 유지할 수 있도록… ecosystem 은 참고서 같은 거지 대장 같은 게 아니야".

**원인**:
- Hub-not-enforcer 원칙을 **명목상** 내세우면서 실제 로직은 enforcer 처럼 동작. `knowledge/canon/evergreen-principle.md` 가 선언한 "child 주권" 과 `resolve.ts` 의 mutation 코드가 모순.
- "부재 시만 추가 (Hub-not-enforcer)" 주석을 달았지만 **추가하는 값 자체가 exact-pin** 이라 child 가 실제로 업그레이드하면 skew 발생.
- exact-pin 은 유지부담 최악. 업스트림 minor/patch 가 나올 때마다 universe 에서 bump + re-publish 필요.

**정공법 v2.10 수정**:
1. `overrides['@biomejs/cli-linux-x64-musl']` 값을 **child 의 `@biomejs/biome` devDep range 에서 동적 생성**:
   ```jsonc
   // child 가 "^2.4.12" 이면
   "overrides": { "@biomejs/cli-linux-x64-musl": "npm:@biomejs/cli-linux-x64@^2.4.12" }
   // child 에 biome 이 없으면 override 주입 자체 skip (강제 금지)
   ```
2. `scripts.harness-pull` 은 항상 `modfolio-harness-pull` (npm bin) — 버전 독립.
3. `@modfolio/harness` exact pin (예: `"2.8.1"`) 을 발견하면 **caret range (`"^2.8.1"`) 로 정규화**. `bun install` 으로 2.x 패치 자동 따라감.
4. Phase 0.5 bootstrap 의 `bun add -D @modfolio/harness` 에서 **버전 생략** — bun 이 latest 조회 후 caret 저장.

**자동화 (resolve.ts `resolvePackageJsonAction`)**: 변경은 child 가 이미 원하는 값을 두고 있으면 skip (Hub-not-enforcer), `.claude/harness-lock.json` 으로 package.json path 잠금 가능.

**교훈**:
1. **Exact-pin 은 enforcer 의 증상**. 참고서 모델에서는 range 만 권고, pin 은 child lockfile 에서만 발생해야 한다.
2. **"부재 시만" 안전장치는 주입 값이 range 일 때만 유효**. exact-pin 을 "부재 시만" 주입해도 child 가 나중에 업그레이드하면 skew.
3. **Hub-not-enforcer 는 동작까지 일치해야 진짜**. 선언만 두고 코드가 반대로 가면 사용자 신뢰 손실.
4. **Evergreen = child 자유 선택 + universe 최신 권고**. universe 가 박아넣으면 evergreen 아님.

참조: `knowledge/journal/20260422-harness-v2.10-dynamic-sync.md`, `knowledge/canon/evergreen-principle.md` (Range-first 원칙), `scripts/harness-pull/resolve.ts` L596+.

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
