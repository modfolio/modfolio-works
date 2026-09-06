---
title: 권한 모드 — bypassPermissions 표준 (zero-prompt, fleet)
version: 2.0.0
last_updated: 2026-09-06
source: [2026-05-18 속도회복 세션, claude-code-guide 권위 확인 + 실측; 2026-09-06 Claude Code 2.1.257 settings-reference 실측 — project/local 스코프의 bypassPermissions·auto 무시]
sync_to_siblings: true
applicability: always
consumers: [ops, preflight, harness-pull]
---

# 권한 모드 — bypassPermissions 표준

> **modfolio universe 표준 권한 모드 = `bypassPermissions`. 1인·무사용자 pre-production 에서 매번 approve 버튼 누르는 마찰 = 0. 안전망은 opaque AI classifier 가 아니라 결정적 `pre-destructive-guard` hook.**

## 왜 (사용자 결정 2026-05-18)

> "나는 매번 permission을 주는 버튼을 누르는 수고를 하고 싶지 않거든"

권한 마찰의 근본 원인은 settings.json allowlist 가 아니라 **VS Code 확장의 세션 권한 모드**다. 특히 **"Auto mode"** 는 AI classifier 로 "agent 자기설정 수정" 등을 하드 차단(bypass·user intent 무관). `정공법 1원칙`: opaque guardrail 우회가 아니라 **명시적 결정 모드 + 결정적 hook** 으로 대체.

## VS Code 확장 핵심 사실 (claude-code-guide 권위 확인)

1. **세션 모드 피커가 settings 의 `defaultMode` 를 override** 한다. precedence: Managed > **프로젝트 `.claude/settings.json`** > User `~/.claude/settings.json`. 피커를 클릭하면 그 세션 한정으로 위 전부를 덮는다.
2. 피커 기본 4종(Ask / Edit automatically / Plan / **Auto**)에는 **"Bypass permissions" 가 없다**. VS Code 설정 `claudeCode.allowDangerouslySkipPermissions: true` 를 켜야 피커에 나타난다.
3. **Reload Window 로는 적용 안 됨.** 설정 변경 후 **새 Claude Code 대화(세션)** 를 시작해야 적용된다.
4. `skipDangerousModePermissionPrompt`(첫 진입 빨간 경고 스킵)는 보안상 **프로젝트 `.claude/settings.json` 에서는 무시**되고 **User `~/.claude/settings.json` 또는 managed/CLI 에서만** 유효.
5. "Edit automatically" 모드 = classifier 없음(자기설정 편집 통과). 단 Bash 등 비편집 도구는 여전히 prompt 가능 → zero-prompt 아님. **진짜 zero-prompt = bypassPermissions.**

## 표준 구성 (정공법 · v2.0.0 — 운반체가 바뀌었다)

> ⚠ **(실측 2026-09-06) Claude Code ≥2.1.257 부터 `permissions.defaultMode` 의 `bypassPermissions`·`auto` 는
> project/local `.claude/settings.json` 에서 무시된다.** 공식 설정 레퍼런스 원문: *"values `auto` and
> `bypassPermissions` don't take effect from project or local settings; set them in user or managed settings instead."*
> v1.0.0 의 «프로젝트 settings = 1순위» 는 그날의 실측이었고 지금은 거짓이다. 표준(**bypass · zero-prompt**)은
> 그대로이고 **운반체만** 옮긴다. 집행: `bun run verify:claude-code-currency`(project/local 스코프의 두 값 = 위반).

### 1. User `~/.claude/settings.json` — 진짜 운반체 (1순위)
```json
{ "permissions": { "defaultMode": "bypassPermissions" },
  "skipAutoPermissionPrompt": true, "skipDangerousModePermissionPrompt": true }
```
- 이 머신은 이미 설정돼 있다(2026-05-18 확인 · 2026-09-06 재확인 `~/.claude/settings.json:373`). **새 머신은 이 한 줄이 없으면
  조용히 default 모드로 시작한다** — 훅은 모든 모드에서 돌므로 안전은 안 줄지만, 승인 버튼이 돌아온다.

### 2. CLI 플래그 — 세션 단위 확정
`claude --permission-mode bypassPermissions` (`claude --help` 실측 2026-09-06). `scripts/ops/pod.ts` 의 런처가 이 플래그를 명시한다
— 종전 주석 «settings `defaultMode` 로 이미 동작한다» 는 2.1.257 부터 거짓이라 정정했다.

### 3. 프로젝트 `.claude/settings.json` — **더 이상 쓰지 않는다**
- 하네스 생성기 `scripts/harness-pull/settings-adapt.ts` 의 `resolveDefaultModeMigration` 이 **허브가 심었던 값만 걷어내고**
  노트를 남긴다(`acceptEdits`·`plan` 같은 멤버 선택은 보존 · `auto` 는 보존+경고 — Hub-not-enforcer). 기본값을 다시 채우지 않는다:
  **없는 키는 거짓말을 못 한다.**
- 허브 자신의 `.claude/settings.json` 에서도 그 줄을 지웠다(2026-09-06).

### 4. VS Code 확장 설정 — 피커 노출 (편의, 1회)
```json
{ "claudeCode.allowDangerouslySkipPermissions": true,
  "claudeCode.initialPermissionMode": "bypassPermissions" }
```

## 적용 절차

1. (1) 은 오너가 머신마다 1회 · (2) 는 pod 런처가 자동 · (3) 은 하네스가 다음 pull 에서 걷어낸다.
2. 사용자 1회: VS Code 설정에 (3) 추가(선택), 그리고 **반드시 새 Claude Code 세션 시작**(Reload 아님).
3. 검증: 새 세션에서 모드 인디케이터가 "Bypass permissions" + approve 버튼 한 번도 안 뜸.

## 안전망 (bypass 라도 유지)

opaque classifier 제거 = 무방비 아님. 결정적 `pre-destructive-guard.ts` 가 **복구 불가능한 것만** 차단: `rm -rf /`·시스템경로·`git push --force`(main)·시크릿파일(.env/.pem/ssh) 삭제. 정상 작업 마찰 0. 근거: `solo-main-workflow.md`, memory `feedback_auto-mode-classifier`.

## 주의

- 피커를 수동으로 다른 모드로 클릭하면 그 세션만 override. zero-prompt 원하면 피커를 건드리지 말거나 Bypass 로 선택.
- managed settings 로 `disableBypassPermissionsMode` 가 걸려 있으면 조직 정책상 불가(현재 해당 없음 — 개인 계정).
- "Auto mode" 는 쓰지 않는다(이 universe 표준). classifier 마찰의 근원.

## 관련

- `scripts/harness-pull/settings-adapt.ts` `adaptSettings` — fleet defaultMode cement
- `scripts/hooks/pre-destructive-guard.ts` — 결정적 안전망
- `knowledge/canon/solo-main-workflow.md`, `evergreen-principle.md` §v2.3
- memory `feedback_auto-mode-classifier`
