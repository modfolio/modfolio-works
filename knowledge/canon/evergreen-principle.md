---
title: Evergreen Principle — 권고 + 정보 공유
version: 2.2.0
last_updated: 2026-04-22
source: [knowledge/canon/evergreen-principle.md, v2.10 reference-only 재정립]
sync_to_siblings: true
applicability: always
consumers: [preflight, harness-pull, sso-integrate, ecosystem]
---

# Evergreen Principle — 권고 + 정보 공유

> **이 캐논은 권고 (recommendation)이지 강제(enforcement)가 아니다.**
> universe는 modfolio-connect의 최신 버전을 **기록·공유**하며,
> 어떤 연결 프로젝트이 언제 업그레이드할지는 **각 앱이 자체 결정**한다.

## universe의 역할 (강제 X)

- modfolio-connect의 latest published 버전을 `ecosystem.json` 루트 `connectSdkLatest` 필드에 기록
- 연결 프로젝트들이 현재 어느 버전을 쓰고 있는지 feedback에서 수집해 다른 앱들이 참고할 수 있게 공유
- mismatch를 발견하면 **정보로 제공** (FAIL 아님, WARN 아님 — INFO)

## 권고 (연결 프로젝트이 자율 채택)

연결 프로젝트 owner에게 권하는 패턴:

1. modfolio-connect의 새 버전이 release되면 가급적 빠르게 따라간다 (보안 패치 적시 적용 + contract 정합)
2. major release(예: v6 → v7)에 호환성 작업이 필요하면 연결 프로젝트 시점에 맞춰 진행
3. universe가 제시하는 timeline은 없다 — owner 판단

## 왜 권하는가

- Connect SDK는 OIDC PKCE + DPoP + SCIM + SAML + MCP delegation 같은 contract surface
- fragmentation은 보안·UX 디버깅 비용을 곱한다
- 그러나 fragmentation 회피보다 **각 앱의 자율과 자체 검증**이 더 중요한 정공법

## universe가 하지 않는 것

- ❌ 연결 프로젝트별 SDK 버전 결정 / 강제
- ❌ 마이그레이션 timeline / batch / roadmap 발행
- ❌ "MUST upgrade" / "FAIL on mismatch" 같은 enforcement
- ❌ 자동 업그레이드 PR 생성

## universe가 하는 것

- ✅ `ecosystem.json connectSdkLatest`에 modfolio-connect 최신 버전 기록 (참조용)
- ✅ harness-pull 보고서에 child SDK vs ecosystem.connectSdkLatest mismatch를 INFO로 표시
- ✅ feedback에서 각 앱의 SDK 버전 수집해 ecosystem 상태 mirror
- ✅ Connect SDK breaking change가 발생하면 `knowledge/journal/`에 변경 사실 기록 (각 앱이 참조)

## 적용 범위

이 원칙은 우선 `@modfolio/connect-sdk`에 적용한다. v2.6부터 `@modfolio/harness` 자체도 GitHub Packages에 publish되지만(restricted access) **버전 선택과 도입 시점은 각 member 자율**. universe는 `ecosystem.json.harnessLatest`로 최신 버전만 기록하고 INFO 제공. 향후 다른 공식 universe-published 패키지(예: `@modfolio/contracts`)도 같은 패턴. 어떤 패키지든 **강제는 universe의 역할이 아니다**.

## v2.6 — `@modfolio/harness` consumption 경로

- GitHub Packages: `https://npm.pkg.github.com`, access `restricted`
- consumer flow (member에서):
  ```bash
  # athsra v3 표준 (canon `secret-store.md` v1.13+):
  athsra run <repo> -- bun add -D @modfolio/harness
  bun run harness-pull           # v2.10+ 기본 report-only (diff 출력)
  bun run harness-pull -- --apply  # 검토 후 child 가 명시 동의
  ```
- 기존 경로 (`MODFOLIO_UNIVERSE_PATH` env / sibling / 직접 script) 는 v2.5와 동일하게 유지
- v2.6 pivot 맥락 — `knowledge/journal/20260419-harness-v2.6-npm-publish.md`, `knowledge/canon/adoption-debt-patterns.md` 패턴 14

## v2.10 — Reference-only + Range-first (정공법 재정립)

사용자 철학 확언 (2026-04-22): **"ecosystem 은 modfolio universe 의 모든 것을 받아와서 파악하고 최신이 어떤 건지 알려주는 참고서 같은 거지 대장 같은 게 아니야"**. 이 원칙을 코드 동작과 일치시키는 규정:

### 강화된 규율

1. **Range-first, pin 은 lockfile 에서만**: universe 가 child `package.json` 에 **버전을 주입할 일이 있으면 항상 range (caret/tilde 등)**. exact pin 금지. 실제 pin 은 child 의 `bun.lock` 에서만 발생 — child 가 언제 resolve 할지 자유.
2. **Dynamic reflection**: override 처럼 "다른 의존의 버전을 따라가야 하는" 값은 **child 의 실제 값에서 동적 생성**. universe 가 하드코딩한 고정값 주입 금지. 예: `overrides['@biomejs/cli-linux-x64-musl']` 는 child 의 `@biomejs/biome` range 에서 파생.
3. **Report-only default**: `bun run harness-pull` 기본은 **diff 출력만**. mutation 은 `--apply` 명시 후에만. child 가 검토 → 수용 순서.
4. **Auto-normalize 허용 범위**: exact pin → caret range 로 승격 같이 **명백히 진화적인 변환**만 자동. 내용 재설계는 child 몫.
5. **`.claude/harness-lock.json`**: child 가 특정 경로의 자동 주입 자체를 거부할 수 있음. 기본 mutation 목록 (`package.json`, `.claude/**`, etc.) 전체를 잠글 수 있다.

### 폐기된 패턴 (v2.10 이전)

- ❌ `overrides["@biomejs/cli-linux-x64-musl"]: "npm:@biomejs/cli-linux-x64@2.4.8"` — exact-pin 하드코딩 주입
- ❌ `bun add -D @modfolio/harness@${harnessLatest}` — universe 가 child 에 exact 버전 박기
- ❌ 묵시적 mutation — 사용자 동의 없이 `bun run harness-pull` 이 파일 수정

자세한 교훈 — `knowledge/canon/adoption-debt-patterns.md` 패턴 16.
