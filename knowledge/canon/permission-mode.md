---
title: 권한 모드 — bypassPermissions 표준 (zero-prompt, fleet)
version: 1.0.0
last_updated: 2026-05-18
source: [2026-05-18 속도회복 세션, claude-code-guide 권위 확인 + 실측]
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

## 표준 구성 (3계층, 정공법)

### 1. 프로젝트 `.claude/settings.json` — fleet cement (1순위, 가장 신뢰)
```jsonc
{ "permissions": { "defaultMode": "bypassPermissions", "allow": [ ... ] } }
```
- precedence 상 User 설정보다 우선 + CLI·확장 양쪽에 일관 적용 + harness 가 전 sibling 에 전파.
- 하네스 생성기 `scripts/harness-pull/settings-adapt.ts` 가 `defaultMode = existing ?? "bypassPermissions"` 로 **전 sibling 에 cement**. child 가 의도적으로 다른 값을 박았으면 그것만 존중(Hub-not-enforcer).

### 2. User `~/.claude/settings.json` — 경고 스킵 (1회, 개인)
```json
{ "permissions": { "defaultMode": "bypassPermissions" },
  "skipAutoPermissionPrompt": true, "skipDangerousModePermissionPrompt": true }
```
- 이미 설정돼 있음(2026-05-18 확인). 빨간 경고 prompt 제거 — 프로젝트 설정으로는 불가하므로 이 계층 필수.

### 3. VS Code 확장 설정 — 피커 노출 + 새 세션 기본값 (편의, 1회)
VS Code `settings.json`(User):
```json
{ "claudeCode.allowDangerouslySkipPermissions": true,
  "claudeCode.initialPermissionMode": "bypassPermissions" }
```
- (1)만으로도 새 세션은 bypass 로 시작하나, 이 설정은 피커에 Bypass 를 노출시켜 수동 재선택을 가능케 한다(보조).

## 적용 절차

1. 위 1·2 는 harness/ecosystem 이 cement (이 세션에서 완료 — `.claude/settings.json` + 생성기).
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
