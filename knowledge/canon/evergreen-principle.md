---
title: Evergreen Principle — 권고 + 정보 공유 (+ 절대 불변: no direct sibling edit)
version: 2.5.1
last_updated: 2026-07-04
source: [knowledge/canon/evergreen-principle.md, v2.10 reference-only 재정립, v2.3 drift 재정의 2026-05-18, v2.4 절대불변 'ecosystem 은 다른 repo 직접 수정 X' cement 2026-06-09 사용자 명시, v2.5 session-open = 기본 advisory·자동 pull 은 opt-in 2026-06-18 (harness v3.12), v2.5.1 자매 canon fact-ownership 연결 2026-07-04 (ADR-014)]
sync_to_siblings: true
applicability: always
consumers: [preflight, harness-pull, sso-integrate, ecosystem]
---

# Evergreen Principle — 권고 + 정보 공유

> **이 캐논은 권고 (recommendation)이지 강제(enforcement)가 아니다.**
> universe는 modfolio-connect의 최신 버전을 **기록·공유**하며,
> 어떤 연결 프로젝트이 언제 업그레이드할지는 **각 앱이 자체 결정**한다.
>
> ## 🔒 절대 불변 (어떤 환경·머신·도구에서든)
>
> **ecosystem 은 사용자의 건별 명시 허가 전까지 다른 repo 를 직접 수정·commit·push 하지 않는다.**
> sibling 에 줄 수 있는 것은 **의견(피드백)** 뿐이고, 그 의견을 채택·적용·되돌릴지 **판단·실행은 그 repo 자신**이 한다. ecosystem 은 강제하지 않는다. — read-only(clone/grep) 로 상태 *파악*은 허용(ecosystem 은 모든 것을 알아야 하므로), 게이트되는 것은 **수정**이다. "전부 다 / 정공법" 같은 포괄 지시는 cross-repo 직접 쓰기 허가가 **아니다** — 직접 수정은 "그 repo 의 이 파일을 직접 고쳐도 돼?" 수준의 행위별 허가가 있어야만 한다.

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

- ❌ **다른 repo 의 파일을 직접 edit/commit/push** — 사용자 **건별 명시 허가** 전까지 절대 금지 (위 🔒 절대 불변). 포괄 지시("전부 다"/"정공법")로 가정하지 않는다.
- ❌ 연결 프로젝트별 SDK 버전 결정 / 강제
- ❌ 마이그레이션 timeline / batch / roadmap 발행
- ❌ "MUST upgrade" / "FAIL on mismatch" 같은 enforcement
- ❌ 자동 업그레이드 PR 생성

## universe가 하는 것

- ✅ `ecosystem.json connectSdkLatest`에 modfolio-connect 최신 버전 기록 (참조용)
- ✅ harness-pull 보고서에 child SDK vs ecosystem.connectSdkLatest mismatch를 INFO로 표시
- ✅ feedback에서 각 앱의 SDK 버전 수집해 ecosystem 상태 mirror
- ✅ Connect SDK breaking change가 발생하면 `knowledge/journal/`에 변경 사실 기록 (각 앱이 참조)
- ✅ sibling 에 대한 의견·권고는 **ecosystem 자기 공간**(`feedback/<repo>/ecosystem-opinion-*.md` 등)에 기록 — sibling 이 읽고 채택·적용·되돌림 판단은 **그 repo 자율**. sibling repo 의 파일에 ecosystem 이 직접 쓰지 않는다.

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

## v2.3 — drift 재정의: transient-not-canonical (2026-05-18)

사용자 명시 결정 (2026-05-18): v2.6/v2.10 의 "강제 X, pull-based" 는 **그대로 유지**한다. 다만 "버전 drift 가 정상 분산 상태" 라는 *프레이밍* 을 폐기한다.

> "각 sibling을 내가 프로젝트를 개발 시작하기 위해 vs code를 켜면 결국 최신으로 pull 하겠지만, 적어도 그 전까지는 ecosystem이 굳이 강요를 해서는 안되. 다만 그렇다고 해서 sibling이 뒤쳐진 하네스로 작업한다? 그걸 modfolio universe의 특정 값이라고 인식해서는 안되. 모든 프로젝트들은 최신 하네스로 할거니까. 단지 내가 그 프로젝트를 실행 해서 했는지 안했는지의 차이일 뿐이니까."

### 재정의

- **최신 하네스(=`ecosystem.json.harnessLatest`) 가 universe 의 유일 canonical 상태다.**
- 구버전을 쓰는 sibling 은 **"의도된 per-app pin" 이 아니다**. 그것은 **transient** — "그 프로젝트를 아직 (이번 release 이후) 열지 않았다" 의 일시 상태일 뿐이다.
- 따라서 harness-pull 보고서/`pull-manifest.json`/feedback 에서 sibling 의 구버전을 "그 앱의 선택값/정상 분산" 으로 **해석·기록하지 않는다**. "미개봉 transient (open 시 self-heal 예정)" 로 분류한다.
- "각 member 자율" 의 의미 = **언제 여느냐(open timing)의 자율**이지, *구버전에 머무르겠다는 선언*이 아니다. (v2.6 "버전 선택과 도입 시점은 각 member 자율" 문구는 이 의미로 읽는다.)

### 강제는 여전히 X — 메커니즘은 self-heal pull

Hub-not-enforcer 는 **변함없다**. ecosystem 은 push/PR/MUST-upgrade 를 하지 않는다. 대신 drift 가 스스로 사라지는 경로를 보장한다:

- sibling 의 `SessionStart` hook (`session-start-pickup.ts`) 이 IDE 진입 시 drift 를 **감지·안내**한다. **⚠ v2.5 (아래) 에서 갱신**: 기본은 **advisory only** (수동 동기화 명령 1줄). 자동 pull+commit self-heal 은 `harness-lock.json {autoPull:true}` 로 **명시 opt-in** 한 프로젝트만. (구 v2.3/v3.1 의 "여는 순간 자동 `--apply`+commit" default-ON 은 divergence/clobber 문제로 폐기 — §v2.5)
- push/commit 하는 주체는 끝까지 **sibling 자신** — ecosystem 이 아니다.
- hook 자체 비활성 = `.claude/harness-lock.json {enableSessionPickup:false}`. 자동 pull 비활성(기본) = `autoPull` 미설정. 자율·Hub-not-enforcer 보존.
- 큰 breaking change 시 owner 가 명시적으로 1회 cross-repo 전파(`scripts/ops/harness-propagate-all.sh`)하는 것은 예외로 허용 — 단 **루틴 경로 아님**.

### 그래서 바뀌는 것 / 안 바뀌는 것

| | v2.10 (이전) | v2.3 (현행) |
|---|---|---|
| 강제/force-push | X | X (동일) |
| pull-based | O | O (동일) |
| harness-lock opt-out | O | O (동일) |
| 구버전 sibling 해석 | "정상 분산/자율 값" | **"transient 미개봉, drift 안내 → 사용자 pull 시 정합"** |
| SessionStart pickup | opt-in | hook 안내 default-ON / **자동 pull 은 opt-in (§v2.5)** |
| 기대 정상상태 | 버전 분산 공존 | **최신 단일 = canonical** |

관련 — `knowledge/canon/solo-main-workflow.md`, `scripts/hooks/session-start-pickup.ts`, `scripts/harness-pull/settings-adapt.ts` `buildSessionStart`, memory `feedback_auto-mode-classifier`.

## v2.5 — session-open = 기본 advisory, 자동 pull 은 opt-in (2026-06-18, harness v3.12)

§v2.3 의 "drift = transient-not-canonical" 프레이밍은 **그대로 유지**한다. 바뀌는 것은 **drift 가 사라지는 경로의 기본값**이다.

### 문제 (실운영, athsra 2026-06-18)

v3.1 default-ON 의 "프로젝트 열기 = 자동 `bun update` + `--apply` + 자동 commit" 이 세 가지 실문제를 냈다:

1. **수동 pull 모델과 충돌** — Hub-not-enforcer("sibling 이 *원할 때* pull")의 의도는 on-demand 인데, 실제 동작은 "세션 열 때마다 자동 발동" 이라 사용자 의도와 어긋났다.
2. **stale base 자동 commit → divergent 로컬** — athsra 에서 session-open auto-commit 이 로컬 커밋을 만들었는데 그 사이 원격에 48 커밋(실작업)이 쌓여 로컬이 ahead 1 / behind 48 로 분기 → `git reset --hard origin/main` 으로 수습해야 했다.
3. **멤버 소유 파일 clobber** — 구버전 `--apply` 가 brain CHANGELOG 템플릿(blank)으로 멤버의 릴리스 이력 CHANGELOG.md 를 덮었다. (현행 하네스는 CHANGELOG create-only 보호 — `resolve.ts` — 가 있으나, stale 어댑터가 구 코드로 self-heal 하다 발생.)

### 재정의 (기본값 뒤집기)

- **session-open 기본 = advisory only.** drift 를 감지하면 **수동 동기화 명령 1줄**만 안내하고, **자동 mutation/commit 은 하지 않는다**.
- **자동 self-heal 은 명시 opt-in** — `.claude/harness-lock.json` 에 `{ "autoPull": true }`. (이전 opt-out `{autoPull:false}` 의 의미 반전.)
- opt-in 자동 경로조차 **safe-by-default**: working tree clean + origin 보다 behind 아님 일 때만 commit. behind 면 "먼저 git pull" advisory 로 보류 (문제 2 의 근본 차단).
- **pull 은 사용자가 직접 칠 때만.** session-open 은 "뒤처졌다 + 이 명령 쳐라" 만 알린다.

### 안 바뀌는 것

| | v2.3 (이전) | v2.5 (현행) |
|---|---|---|
| 강제/force-push | X | X (동일) |
| pull-based | O | O (동일) |
| drift = transient 프레이밍 | O | O (동일) |
| SessionStart hook 설치 | default-ON | default-ON (동일 — 안내는 계속) |
| **session-open 자동 pull+commit** | **default (opt-out)** | **opt-in only (`autoPull:true`)** |
| 자동 commit divergence 가드 | 없음 | **behind 면 보류** |

Hub-not-enforcer·"최신 = canonical" 은 불변. 단지 **drift 해소를 사용자 행동(수동 pull)으로 되돌렸다** — ecosystem 이 sibling 세션에 자동 개입하는 표면을 줄인 정공법.

관련 — `scripts/hooks/session-start-pickup.ts` `harnessDriftPickup`/`isBehindUpstream`, `scripts/harness-pull/types.ts` `HarnessLockConfig.autoPull`, `knowledge/journal/20260618-harness-v3.12-session-pickup-advisory.md`.

## 자매 canon — fact-ownership (2026-07-04, ADR-014)

evergreen 은 **hub-owned 표준**(harness·canon·contracts)의 축이다 — "최신 하네스 = canonical" 은 그 축에서만 성립한다. **member-owned 사실**(각 repo 자신의 버전·배포 상태·이슈 resolution)의 축은 `fact-ownership.md` v1.0 — SoT 는 그 repo 실측이고, hub 의 `knowledge/projects/*`·`ecosystem.json` 기록은 **미러(관측 기록)**이며 불일치 시 실측이 옳다(미러 staleness = hub 버그, harness 3.17.0+ 는 자기 버전을 pull 시점 로컬 판독으로 표기). 두 축은 충돌하지 않는다: sibling 은 hub 표준을 참고해 최신을 유지하되, hub 기록 때문에 자기 사실·자기 판단이 뒤로 밀리지 않는다.
