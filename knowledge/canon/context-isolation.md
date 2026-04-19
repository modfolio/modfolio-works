---
title: Context Isolation — Worktree-per-Subagent
version: 1.0.0
last_updated: 2026-04-17
source: [Anthropic "Effective context engineering", Claude Code v2.1.105 EnterWorktree, Harness v2.4]
sync_to_children: true
consumers: [preflight, context-isolation-setup]
---

<!--
Context rot이 실증된 문제가 되면서, "모든 subagent에 전체 맥락을 주는" 것이 오히려 품질을 떨어뜨린다.
이 canon은 우리 하네스가 격리된 worktree + 구조화 리포트로 맥락을 분리하는 기본 원칙을 명시한다.
-->

# Context Isolation — Worktree-per-Subagent

**원칙**: subagent에게는 **해당 작업에 필요한 최소 맥락만** 준다. 부모 세션의 전체 대화 이력은 기본적으로 전달하지 않는다.

---

## 왜

1. **Context rot**: 토큰 수가 늘수록 모델 정확도가 실측으로 떨어진다 (Anthropic "Effective context engineering" 2025-09).
2. **오염 방지**: 실패한 시도, 폐기된 가설, 중복 구현 논의가 누적되면 이후 판단을 흐린다. "pushing exploration to a separate window"가 병렬화보다 품질 개선 효과가 크다.
3. **`[1m]` 대체**: 대형 맥락 에이전트에 `[1m]` suffix로 1M 컨텍스트를 부여하기보다, **200k 기본 컨텍스트를 격리된 worktree로 나누는** 것이 비용·품질 모두 유리하다.

## 3 레벨 격리

| 레벨 | 설명 | 우리 기본값 |
|------|------|-------------|
| **L1: Complete isolation** | subagent에게 task 텍스트만 전달. 부모 맥락 없음 | 80% (Explore, Plan, general-purpose 등 대부분) |
| **L2: Filtered context** | 부모가 관련 있는 파일/섹션만 수동 전달 | 15% (특정 기능 구현을 위임할 때) |
| **L3: Full context** | 전체 대화 이력 공유 | ≤5% (매우 예외적 — 대개 필요 없음) |

## Worktree-per-Subagent 패턴 (Claude Code v2.1.105+)

Claude Code v2.1.105에서 `EnterWorktree` tool에 `path` 파라미터가 추가되어 **기존 worktree로 진입**하거나 **신규 worktree 생성 후 진입**이 가능하다. 이를 이용:

```
부모 세션 (main 브랜치)
  ├─ EnterWorktree(path="worktrees/feat-a")  → 격리된 세션에서 feature A 개발
  ├─ EnterWorktree(path="worktrees/feat-b")  → 동시에 별도 세션에서 feature B
  └─ main에 복귀해 부모 맥락으로 통합
```

장점:
- 각 worktree가 **자체 git index + working dir** → 파일 변경 충돌 없음
- 각 세션이 **독립 컨텍스트 윈도우** → 200k 격리
- `ExitWorktree`로 복귀 시 부모에 **SubagentOutputStyle** 구조화 리포트만 전달

## SubagentOutputStyle — 부모로 복귀할 때 리포트 형식

subagent가 부모에게 결과를 돌려줄 때, **자유 형식 텍스트가 아니라 구조화 JSON**을 돌려주는 것이 기본:

```json
{
  "summary": "한 문장 요약",
  "files_changed": ["scripts/foo.ts", "knowledge/canon/bar.md"],
  "tests_added": 3,
  "tests_passed": true,
  "known_limitations": ["case X untested"],
  "handoff_notes": ["다음 세션은 Y부터 시작"]
}
```

부모는 이 JSON만 자기 맥락에 가져간다. subagent의 800줄 사고 과정은 부모 맥락에 들어오지 않는다.

## 우리 하네스 적용

- **17 agent 중 Explore, general-purpose, Plan** → L1 기본. 각 agent가 자체 Bash + Grep + Read로 필요한 맥락을 스스로 읽어들임.
- **design-engineer, page-builder, code-reviewer** → 기존 `[1m]` suffix를 유지하되, 대형 Figma metadata 또는 대형 diff 처리용으로만 사용. 일반 작업은 기본 200k + L2 격리로 충분.
- **병렬 worktree**: 여러 feature를 동시에 개발할 때 `C:/Projects/modfolio-universe/<repo>/worktrees/<branch>` 패턴으로 생성. `.claude/settings.json` 유지 (child 레포 worktree도 동일 harness 적용).

## 금지 패턴

- L3 Full context를 "안전하니까"로 기본 사용하는 것 — 맥락은 자원이며 증가할수록 품질이 떨어진다.
- subagent에 부모 대화 통째로 붙여넣기.
- worktree 없이 동일 working dir에서 여러 subagent를 병렬 실행 (파일 충돌 + git state 오염).

## 관련 문서

- [effort-policy.md](effort-policy.md) — effort 레벨과 context 격리의 관계
- [prompt-caching-strategy.md](prompt-caching-strategy.md) — 격리된 세션 간 cache 전략
- [local-dev-infra.md](local-dev-infra.md) — Dev Container에서 worktree 관리

## 갱신 이력

- 2026-04-17: v1.0.0 초판. Harness v2.4 Phase 2에서 신설. worktree-per-subagent + SubagentOutputStyle 기본 패턴 명문화.
