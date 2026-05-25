---
title: Harness Freeze — 3.4.0 baseline (2026-05-22)
version: 1.2.0
last_updated: 2026-05-22
source: [2026-05-20 사용자 피로 피드백 + 완성도 패스 결과, 2026-05-21 사용자 요청 3.3.0 버그픽스 release, 2026-05-22 사용자 요청 NAS·GHA·이중 레지스트리 3.4.0 release]
sync_to_siblings: true
applicability: always
consumers: [harness-pull, harness-publish, ops, all-app-sessions]
---

# Harness Freeze — 3.4.0 baseline

> **2026-05-20 사용자 결정**: 한 세션에 22 repo × 평균 4 commit = 90+ harness
> 커밋이 흐르고 앱 코드 라인은 0 — "이건 정상 평형 아님". harness 를 **`3.2.0`
> 에서 명시적 freeze** 하고 당분간 앱 개발에 집중. 이 canon 이 그 결정과
> 운영 규칙의 source of truth.

## 결정

- **Baseline = `@modfolio/harness@3.4.0`** (2026-05-22 publish — GitHub Packages
  registry latest, Forgejo registry best-effort 동시 publish). 모든 sibling 의
  fleet target. freeze 가 fleet 을 여기 고정한다. `package.json`·`plugin.json`·
  `ecosystem.json.harnessLatest` 전부 3.4.0 정합.
- **3.4.0 = 사용자 요청 NAS/GHA release** — modfolio-infra(NAS) substrate
  ecosystem 1급 통합 + GitHub Actions 전면 제거(canon `gh-actions-policy.md`
  v2.0) + 이중 레지스트리(GitHub Packages + Forgejo npm registry) + audit
  exemption 처리. 직전 baseline 3.3.0(2026-05-21). 상세는 `CHANGELOG.md` 3.4.0.
- freeze 는 3.4.0 작업으로 해제되지 않았다 — 사용자가 특정 개선만
  요청(operating rule #4)했고 baseline 만 3.3.0 → 3.4.0 이동. 앱 개발 집중
  기조 유지.
- **Freeze 기간 권고: 4–8주** 또는 다음 의도적 release window 까지. 카운트다운
  아님 — "당분간" 의 사용자 정의. 해제 = 사용자 명시.

## Freeze 중 운영 규칙 (강제)

### Claude 세션 행동

1. **앱 세션에서 harness drift/이슈 발견 시 즉시 고치지 말 것.** `harness-backlog.md`
   에 한 줄만 적고 앱 작업 계속. 절대 fleet sync·publish·hook 패치 자동 점프 X.
2. **`feedback_always_latest` 메모리의 "drift = 즉시 root 수정" 규칙은 freeze
   기간 동안 무효화**. 그 규칙은 evergreen-principle 의 일반 적용이지만, 본 canon
   이 더 좁은 적용성으로 override (정공법 1원칙 정합 — 사용자 피로 = 근본 원인,
   freeze 가 그 root 수정).
3. **session-start-pickup 자동 pull**: 동작 유지(clean tree → auto, dirty →
   advisory). 이 훅은 `ecosystem.json.harnessLatest` 를 읽어 sibling 격차를
   판단하므로 `harnessLatest` 는 **publish 된 버전만** 가리켜야 한다 — 미publish
   버전을 넣으면 fleet 전체가 phantom "behind" nudge 를 받는다(2026-05-21 실측).
4. **사용자가 "harness 개선해줘" 명시 요청하면** freeze 일시 해제로 간주, 작업
   수행. 묵시 추론으로 freeze break 금지.

### Publish 정책

- 신규 publish 금지(GitHub Packages).
- 예외 (critical-only): 보안 incident, lethal-trifecta 우회 가능 버그, prod
  에서 명백한 데이터 손실 hook. 위 셋 중 하나 발생 시 patch publish 가능,
  publish 직후 backlog 정리 + freeze 갱신.
- `harness-publish.ts` 의 [1/4] test gate 가 자동 차단망 — 회귀 시 publish 불가.

### Sibling 행동

- 각 repo 의 `session-start-pickup` 가 advisory 출력은 계속. 사용자가 원할 때만
  `bun run harness-pull -- --apply`. 강제 X.
- backlog 추가는 ecosystem session 에서만 (sibling 세션은 발견 시 ecosystem 으로
  PR/note — 일반적이지 않음, freeze 기간엔 거의 발생 안 함).

## Freeze 해제 트리거

- (A) 사용자 명시 unfreeze 선언.
- (B) Backlog 누적이 minor/major release 가치를 명백히 넘김 → 사용자에게 보고
  후 release window 진행.
- (C) Critical 보안 incident → patch publish, 그 직후 freeze 갱신 (3.2.x → 새
  freeze baseline).

## 진실 추적

- 신규 backlog 항목은 `harness-backlog.md` 에 누적. 다음 release window 에서 일괄.
- 이 canon 의 freeze 상태 변경(해제/연장)은 commit 메시지 + journal 로 cement.

## 갱신 이력

### 3.4.0 (2026-05-22) — 사용자 요청 NAS/GHA 통합 release

운영 규칙 #4("사용자가 'harness 개선해줘' 명시 요청 시 freeze 일시 해제로
간주") 발동. 사용자 3-라운드 질의 응답 (`/home/mod/.claude/plans/elegant-twirling-alpaca.md`)
으로 명확화: "gh actions 안 쓰고 무료로 구축" + "GitHub+NAS 이중 병행" + "정공법,
unfreeze 해서라도 update + publish 까지 제대로". modfolio-infra(2026-05-21
등록) NAS substrate 가 등록만 됐고 harness·ops 가 100% GitHub 결속이던 7-갭
정공법 일괄 해소: GitHub Actions 5 워크플로 + 2 템플릿 전부 삭제 → Forgejo Actions
self-hosted runner 로 이전(분 $0), `@modfolio/harness` 이중 레지스트리,
`delta-audit.ts` exemption honor 로 `release:gate` false-positive 해소, ADR-010
신규로 ADR-002(CF-only) 의 의도된 면제 공식화. 상세는 `CHANGELOG.md` 3.4.0.

- freeze 는 해제되지 않았다 — baseline 만 3.3.0 → 3.4.0, 앱 개발 집중 기조 유지.
- `harness-backlog.md` 기존 항목은 본 release 범위 밖 — 그대로 누적 유지.
- publish: local track `bun run publish:harness` → [4/5] GitHub Packages
  primary + [5/5] Forgejo registry best-effort. NAS 미준비 시 [5/5] SKIP/WARN
  후 exit 0 — sibling 들은 기본 GitHub Packages 에서 consume. **GitHub Actions
  분 0** (publish 가 local + Forgejo runner).
- sibling 은 각자 다음 세션에서 `session-start-pickup` + `bun install` 로
  자기 페이스 흡수(evergreen pull, 활성 세션 무중단).

### 3.3.0 (2026-05-21) — 사용자 요청 버그픽스 release

운영 규칙 #4("사용자가 'harness 개선해줘' 명시 요청 시 freeze 일시 해제로
간주") 발동. modfolio·modfolio-connect 의 2026-05-21 피드백이 3.2.0 구조적
버그 4종을 실측 보고 — 깨진 MCP 패키지명, `SHARED_HOOKS` dangling 참조,
`CLAUDE.md` blank-line 무한 누적, biome indent drift. 넷 다 harness 채택 멤버
전체에 영향(범용 하네스 전제 위반). 정공법 일괄 수정 + 미등록 훅 4개 baseline
채택 + `tests/universal-compat.test.ts` 회귀 게이트 신설. 상세는 `CHANGELOG.md`
3.3.0.

- freeze 는 해제되지 않았다 — baseline 만 3.2.0 → 3.3.0, 앱 개발 집중 기조 유지.
- `harness-backlog.md` 기존 항목은 본 release 범위 밖 — 그대로 누적 유지.
- **publish 완료** (2026-05-21, `harness-publish` [1/4] test gate 통과). 처음엔
  commit/push 만 하고 staged 로 뒀으나, `harnessLatest` 가 미publish 3.3.0 을
  가리켜 sibling phantom "behind" nudge 를 유발 → 사용자 판단으로 정식 publish,
  `harnessLatest`=registry latest=3.3.0 정합. sibling 은 각자 다음 세션에서
  `session-start-pickup` + `bun install` 로 자기 페이스 흡수(evergreen, 활성
  세션 무중단).

## 관련

- `feedback_harness-fatigue` (memory) — 사용자 피로 + 동작 가이드
- `evergreen-principle.md` §v2.3 — drift transient(이 freeze 가 일시적 예외)
- `solo-main-workflow.md` — 무사용자 pre-production 의 속도 우선
- `attention-budget.md` — 1M token 도 유한 → harness 작업이 앱 attention 의 cost
- `CHANGELOG.md` 3.3.0 — 현 baseline release 변경 내역 (직전 3.2.0)
