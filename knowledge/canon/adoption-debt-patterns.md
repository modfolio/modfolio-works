---
title: Adoption Debt Patterns
version: 1.0.0
last_updated: 2026-04-17
source: [v2.3.2 canary 확산 실측]
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

## 대규모 debt는 owner 책임

다음 종류는 **adoption 스코프 밖**:
- Connect SDK 메이저 업그레이드 (v0.x → v7.x 같은 브레이킹)
- repo 전반에 걸친 수십~수백 건의 strict-TS 위반 (예: noUncheckedIndexedAccess로 생긴 optional chain 필요 지점)
- 앱 아키텍처 리팩터가 전제되는 type 미스매치

이들은 harness가 정리할 수 없고, member owner가 먼저 다듬은 뒤 `bun run harness-pull`로 adoption을 완료한다.

## 사용 순서

새 adoption 시:
1. `bun run harness-pull --dry-run` — 무엇이 바뀔지 확인
2. `bun run harness-pull -- --cleanup` — 자동 수정 가능한 debt 먼저 정리 (opt-in)
3. `bun run harness-pull` — 실제 pull
4. `bun run check && bun run typecheck` — member 자체 게이트
5. `git commit` — `pre-commit-guard`가 `quality:all` 재실행해 최종 확인
