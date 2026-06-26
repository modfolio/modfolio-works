---
title: Velocity 모드 — fast-MVP hook 프로필 (lean 기본 / strict opt-in)
version: 1.0.0
last_updated: 2026-06-18
source: [2026-06-18 v3.13 세션, 사용자 명시 결정 (fast-MVP ZERO 오버헤드)]
sync_to_siblings: true
applicability: conditional
consumers: [harness-pull, ops, release]
---

# Velocity 모드 — hook 프로필

> **무사용자 fast-MVP 단계: harness 가 wiring 하는 hook 을 결정적 안전 가드 2개로 축소(`velocity`, 기본). 전체 set 은 `harness-lock.json {"profile":"strict"}` opt-in. velocity 가 없애는 건 토큰이 아니라 지연(latency)이다.**

`applicability: conditional` — `velocity` 는 **무사용자 pre-production** 앱의 기본. 실사용자 보유 앱은 `strict` (trigger: `solo-main-workflow.md`).

## 핵심 정정 — 훅은 토큰을 쓰지 않는다

흔한 오해: "hook/cron 이 백그라운드에서 토큰을 비정상 소모한다." **실측상 거짓이다.**

- harness hook 은 **전부 결정적 스크립트** — LLM/에이전트 호출 0 → **토큰 0**. (과거 Stop Haiku 에이전트는 v3.1 에 제거됨.)
- 등록된 cron 0개. `/dream`·`/evolve`·`/retro`·`/audit` 는 **수동 전용** — 작업 후 자동 실행 없음.

훅의 실제 비용은 **지연(wall-clock)** 이다:

- `post-biome-check` 가 **편집마다** `bun run check` (2~10초) — fast-MVP 편집 루프의 최대 마찰.
- SessionStart drift pickup (세션 열 때마다), `pre-push-guard` 의 `quality:all` (push마다 5~60초).
- PreToolUse(Bash) 6-hook 체인 — 명령마다 bun 프로세스 startup ~수백 ms.

토큰을 진짜 많이 쓰는 주체는 hook 이 아니라 **(1) reasoning effort, (2) 매 턴 고정 컨텍스트, (3) 서브에이전트/스킬 호출**이다. velocity 는 **지연을 제거**하고, 토큰은 effort·context 로 별도 관리한다.

## 두 프로필

`adaptSettings()` (`scripts/harness-pull/settings-adapt.ts`) 가 `harness-lock.json` 의 `profile` 로 wiring 을 가른다. **hook 스크립트 파일(SHARED_HOOKS)은 양쪽 모두 ship** — wiring 만 다르다.

| | **velocity** (기본) | **strict** (opt-in) |
|---|---|---|
| `PreToolUse(Bash)` | `pre-destructive-guard`, `pre-payment-guard` | + commit/push/gh-api/injection notice |
| `PreToolUse(mcp__.*)` | `pre-payment-guard` | `pre-payment-guard` |
| `PreToolUse(Read\|WebFetch\|WebSearch)` | — | `pre-injection-detect` |
| `PreToolUse(Edit\|Write)` | — | ui-edit / gha-workflow notice |
| `PostToolUse` | — | `post-biome-check`·`post-contract-touch`·`post-secret-redact` |
| `PreCompact` / `Stop` / `SessionEnd` / `SubagentStop` | — | 결정적 telemetry/pattern hook |
| `SessionStart` | — | drift pickup (advisory, `autoPull` opt-in) |

`undefined` → `velocity`. velocity 는 빈 event 배열을 prune 해 settings.json 이 깨끗하다.

## 설정

```jsonc
// .claude/harness-lock.json — 앱 소유자가 설정, pull 이 덮어쓰지 않음
{ "lockedPaths": [], "profile": "strict" }   // 실사용자 앱만. 미설정 = velocity
```

velocity 로 **내려갈 때**, 이전에 wiring 됐던 strict hook 은 "멤버 로컬"로 오인되지 않고 제거된다 (`harnessHookFile` — SHARED_HOOKS 소속 명령은 harness 소유로 인식). 진짜 사용자 작성 로컬 hook(SHARED_HOOKS 아님)은 양쪽 모두 보존.

## 전파 runbook

ecosystem 은 sibling 을 직접 수정하지 않는다(Hub-not-enforcer). sibling 은 스스로 당겨간다:

1. v3.12 advisory(`session-start-pickup`)가 세션 열 때 drift 안내 — `bun update @modfolio/harness @modfolio/contracts && bunx modfolio-harness-pull -- --apply` 1줄.
2. 사용자가 1회 실행 → 새 harness 의 velocity `adaptSettings` 가 settings.json 을 lean 으로 재작성 → 이후 자동작업 정지.
3. **pinned**(`harnessVersion` 고정)·**dirty tree**·`autoPull:true` 아님 인 앱은 위 수동 1회가 전파 경로. 최악 = 더 풍부한 set 에 더 오래 머무름(fail-safe, 깨짐 아님).
4. 낙오 앱 식별: `bun run harness:report` (read-only drift 표).

## velocity 가 그대로 유지하는 것

- **안전망 2개** — `pre-destructive-guard`(rm -rf /·force-push)·`pre-payment-guard`(지출+`mcp__.*`). 0 토큰·<5ms. 'security' 가 아니라 무료 사고방지망.
- `permissions.deny`(payment-approval 토큰 보호)·`defaultMode: bypassPermissions`·`fallbackModel`.
- **`/release`(release:gate) 하드 게이트** — 코드품질 정공법은 폐기가 아니라 시점 이동. ship 전 전부 green 필수.

## ecosystem 본체 예외 — Evolution Pulse (SessionStart)

ecosystem(관제탑) 본체엔 sibling 프로필과 **무관한** `session-start-evolve-pulse.ts` SessionStart hook 이 추가돼 있다(ecosystem `.claude/settings.json`, `pkg.name==="@modfolio/harness"` 일 때만 작동 — sibling 은 no-op). 피드백→진화 루프를 cron 이 아니라 **session 시작 단계 트리거**로 깨운다(inbound feedback·진화신호·drift 1회 advisory). velocity 정합: **0-token**(결정적 파일 스캔, heavy 스크립트 재실행 안 함)·**actionable 시만 출력**·exit 0. "새 자동화 기본추가 금지"의 **사용자 명시 요청 예외**(2026-06-22). 자매 = `session-start-pickup.ts`(drift).

## strict 재진입

`solo-main-workflow.md` 의 전환 트리거(외부 실사용자·결제/PII production 경로·협업자 2인+·사용자 명시 요청)가 도래한 **그 앱만** `{"profile":"strict"}`. 앱 단위 자율.

## Anti-patterns

- ❌ "hook 이 토큰을 태운다" 가정 → hook 제거로 토큰 절감 기대. hook 은 0 토큰. 토큰은 effort/context 문제.
- ❌ velocity 를 "품질/안전 폐기"로 오해 — `/release` 게이트·안전 가드 2개 유지.
- ❌ ecosystem 이 sibling settings.json 직접 편집해 lean 화 — sibling 이 pull(Hub-not-enforcer).
- ❌ 실사용자 앱을 velocity 로 방치 — 트리거 도래 시 그 앱은 strict.

## 관련

- `knowledge/canon/solo-main-workflow.md` — 동일 트리거가 PR 흐름·hook 프로필 둘 다 결정
- `knowledge/canon/evergreen-principle.md` §v2.5 — session-pickup advisory(자동 pull opt-in)
- `knowledge/canon/payment-safety.md` — `pre-payment-guard` (velocity 에서도 유지)
- `scripts/harness-pull/settings-adapt.ts` — `adaptSettings()` profile 분기 구현
- memory `project_solo-main-workflow`, `feedback_harness-fatigue`
