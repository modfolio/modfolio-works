---
title: Long-Running Harness — Multi-Context-Window Task Pattern
version: 1.0.0
last_updated: 2026-05-13
source: [Anthropic Engineering "Effective harnesses for long-running agents" (https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), 2026-05-13 v2.0 dogfood Adopt P0 #5 (claude-progress.txt + initializer pattern)]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [session-handoff, ralph-loop, initializer, harness-evolve, modfolio]
---

# Long-Running Harness — multi-session task 표준

Anthropic Engineering 2026-05 게시의 "Effective harnesses for long-running agents" 패턴을 modfolio universe 에 정합 cement. 1 세션 안에 끝나지 않는 task — migration, 대형 refactor, multi-phase plan, cross-machine continuity — 의 token attribution + cold-start cost 흡수.

## 언제 사용

- 1 세션 안에 안 끝나는 작업 (마이그레이션, 대형 refactor, multi-phase plan)
- cross-machine continuity 필요 (집 ↔ 사무실)
- `ralph-loop` 5+ iteration 이상
- `harness-evolve` Phase 3 (WebSearch) 와 Phase 4 (synthesize) 사이 multi-session

## 모델 ↔ modfolio 매핑

modfolio 이미 70% 흡수 상태:
- `session-handoff` skill — context cement + git remote sync ✓
- `knowledge/journal/*.md` — 의사결정 기록 ✓
- `~/.claude/plans/*.md` — in-flight plan ✓
- PreCompact hook — unstaged draft 차단 ✓

**미흡한 30%**: 작업 단위 진행 로그가 plan / journal / commit 에 분산 — 단일 파일로 정렬. + initializer pattern 으로 cold-start 자동화. 본 canon 이 그 정렬.

## 단일 진행 로그 — `claude-progress.txt`

위치: task root (예: `~/code/modfolio-ecosystem/claude-progress.txt`) 또는 `.claude/progress.txt`.

구조:

```
# Task: <one-line title>
# Started: YYYY-MM-DD
# Owner: <author>
# Plan: ~/.claude/plans/<plan-id>.md
# Stage Status: A=완료 / B=in-progress / C=pending

## 2026-05-13 (Session 1)
- Decision: 정공법으로 가산식 score 채택
- Done: scripts/evolve/retrospect.ts + test (19 case green)
- Blocked: WebSearch agent 응답 대기

## 2026-05-13 (Session 2)
- Decision: --no-cross-check flag 도입 (specialized 3-agent 모드)
- Done: synthesize.ts + 10 plan 파일 작성
- Next: tech-trends 갱신 + skip registry +4 entries + canon cement
```

규칙:
1. 매 세션마다 append. 직전 세션 entries 는 수정 X (기록 무결성).
2. 의사결정 + blocked 만 기록 — code 변경 자체는 git log 참조.
3. session 시작 시 가장 최근 5-10 entry 읽어 컨텍스트 복원.

## Initializer agent

세션 시작 시 호출. main thread 의 cold-start 부담 분담. 정의: `.claude/agents/initializer.md` (Haiku, read-only).

read 대상:
1. `claude-progress.txt` (가장 최근 5-10 entries)
2. `git log --since='3 days' --oneline`
3. `git status` (uncommitted draft)
4. 최근 modified `~/.claude/plans/*.md`

출력: 3 line — "직전 session 에서 X 까지 완료 / 다음 step 은 Y / blocked: Z (또는 none)".

main thread 는 이 요약으로 즉시 작업 진입.

호출:
```
/initialize                # 자동 탐색
/initialize <task-name>    # 특정 task 의 progress.txt 지정
```

또는 SessionStart hook 으로 자동 (별도 plan).

## session-handoff 통합

`.claude/skills/session-handoff/SKILL.md` 의 종료 step:
1. task root 에 `claude-progress.txt` 있으면 이번 session entry append + git stage
2. 부재 시: 이번 task 가 multi-session 이면 progress.txt 생성 권고

## ralph-loop 통합

`.claude/skills/ralph-loop/SKILL.md` 의 매 iteration end:
1. progress.txt 의 `Iteration N` entry append — 결과 + 다음 step + blocked

## sibling 적용 (Hub-not-enforcer)

`applicability: per-app-opt-in` — long-running task 가 있는 sibling 부터 자율 채택:
- `modfolio-pay` (결제 marketplace 통합, multi-phase)
- `modfolio-admin` (RBAC migration)
- `gistcore` (AI feature multi-iteration)
- 기타: 단일 cycle 으로 끝나는 task 가 대부분이면 도입 불필요

ecosystem 측은 harness publish 로 canon + agent 동기, sibling 이 채택 결정.

## modfolio universe 의 attention budget 정합

본 canon 은 `attention-budget.md` 의 **L2 (structured external memory)** 의 구체화:
- L1: in-context (현 turn 의 messages)
- **L2: structured external file** — progress.txt / journal / canon / plans (이 canon 이 표준화)
- L3: persistent memory directory (Anthropic memory tool, 별도 Trial)

L2 의 정렬은 attention budget 절감 + cross-session continuity 의 정공법.

## 정공법 정합

- **3원칙 (장기 시야 + 확장성)**: multi-session task 의 token attribution + cold-start cost 흡수. 1M context 도 finite resource.
- **5원칙 (리소스 투자)**: cold-start 빠름 → 매 세션 setup time 절감 누적.

## Anti-patterns

- ❌ progress.txt 가 단순 git log 중복 — 의사결정 + blocked 만 기록
- ❌ initializer agent 가 main thread 결정 대체 — read-only, 요약만
- ❌ progress.txt 가 secret/sensitive 정보 포함 — code 는 git, secret 은 athsra

## 관련 canon

- `attention-budget.md` (L1/L2/L3 frame, L2 의 표준화)
- `agentic-engineering.md` § 1.3 Workflow
- 외부: [Anthropic Engineering — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
