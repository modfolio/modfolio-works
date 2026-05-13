---
name: ralph-loop
description: Ralph Loop 기법. 측정 가능한 완료 기준으로 자율 반복 개선. 생성→검증→수정 사이클
effort: xhigh
user-invocable: true
---


# /ralph-loop — 자율 반복 개선 루프

이미 설치된 ralph-loop 플러그인을 활용하는 자율 반복 개선 기법.

## 핵심 원칙

- **단순 반복이 아님**: 각 반복에서 수정된 파일 + git 히스토리 + 테스트 결과를 피드백으로 받아 점진적 개선
- **측정 가능한 완료 기준 필수**: 테스트 통과, lint 클린, 타입체크 통과 등
- **`<promise>` 태그**: 완료 선언 메커니즘 — 거짓 선언 방지 내장

## 활용 시나리오

### 테스트 커버리지 확보
```
/ralph-loop "modfolio-pay의 결제 모듈 테스트 커버리지 80% 달성.
모든 API 엔드포인트에 단위 테스트 추가.
완료 기준: bun run test 통과 + 커버리지 80% 이상.
완료 시: <promise>DONE</promise>" --max-iterations 20
```

### 새 앱 스캐폴딩
```
/ralph-loop "새 앱 {name} 스캐폴딩. SvelteKit 5 + Drizzle + Neon 구성.
lint + typecheck + build 모두 통과할 때까지 반복.
완료 시: <promise>SCAFFOLD_COMPLETE</promise>" --max-iterations 30
```

### 대규모 리팩토링
```
/ralph-loop "Svelte 4 → 5 마이그레이션. 모든 export let → $props(),
slot → {@render}, on:click → onclick 변환.
기존 테스트 모두 통과 + bun run check 클린.
완료 시: <promise>MIGRATION_DONE</promise>" --max-iterations 50
```

## 주의사항

- **반드시 `--max-iterations` 설정** (안전 장치)
- 성공 기준이 명확하지 않으면 사용하지 마라
- 디자인 판단이 필요한 작업에는 부적합
- 각 반복의 피드백을 주의 깊게 모니터링

## Bash Engine — Unattended Mode (v2.35 P1.3, 2026-05-13)

Claude session 안에서 `/ralph-loop` 호출 = attended mode (사용자 모니터링). Unattended mode (overnight, CI runner, batch) 는 `scripts/ralph-loop/engine.sh` 로 외부 자동 반복.

```bash
bash scripts/ralph-loop/engine.sh "<goal description>" [max-iterations=10]
```

### 동작

1. `IMPLEMENTATION_PLAN.md` 자동 초기화 (goal + task 섹션)
2. `claude-progress.txt` 에 session header append
3. 매 iteration:
   - claude CLI 헤드리스 호출 (`claude -p "$prompt"`)
   - prompt = goal + plan file + progress file + iteration N + completion rule
   - 결과 stdout 마지막 20 줄 출력
   - `<promise>DONE</promise>` (또는 `$RALPH_PROMISE_TAG`) 감지 시 종료
   - 실패 시 errors stdout 다음 iteration prompt 에 inject (errors-and-all)
4. 세션 종료 시 `claude-progress.txt` 에 footer append (iterations, status)

### Env 옵션

- `RALPH_PROMISE_TAG` (default: `DONE`) — completion marker
- `RALPH_PROGRESS_FILE` (default: `claude-progress.txt`)
- `RALPH_PLAN_FILE` (default: `IMPLEMENTATION_PLAN.md`)
- `CLAUDE_CMD` (default: `claude`) — headless Claude Code CLI 경로

### 사용 예

```bash
# overnight 자동 마이그레이션
RALPH_PROMISE_TAG=MIGRATION_DONE bash scripts/ralph-loop/engine.sh \
  "Svelte 4 → 5 마이그레이션. export let → \$props, on:click → onclick 변환. bun run check 통과 시: <promise>MIGRATION_DONE</promise>" \
  50
```

### Exit code

- `0` = `<promise>$RALPH_PROMISE_TAG</promise>` 감지, 정상 종료
- `2` = max iterations 도달, promise 없음
- 기타 = bash 자체 에러

### 정공법 정합

- 1원칙 (근본 수정) — `<promise>` 태그 = 거짓 선언 방지 메커니즘
- 2원칙 (에러 0) — 각 iteration 의 stderr 가 다음 prompt 에 자동 inject
- 3원칙 (장기 시야) — `claude-progress.txt` + `IMPLEMENTATION_PLAN.md` 가 cement (cross-session)
- 4원칙 (신기술 포텐셜) — `/goal` 도구 도착 시 evaluator 분리 가능 (P1.4 통합)
- 5원칙 (리소스 투자) — `claude -p` 헤드리스 비용 인정 (unattended 가치)

## 관련 canon

- [agentic-engineering.md](../../../knowledge/canon/agentic-engineering.md) — 본 skill 의 메타 frame (Prompt → **Generate** → Review → Feedback → **Iterate**). §1.1 atomic task — ralph-loop 가 N=3 이상 무한 루프 시 task 분해 부족 신호.
- [long-running-harness.md](../../../knowledge/canon/long-running-harness.md) — 5+ iteration 시 `claude-progress.txt` 단일 진행 로그 작성 권고. 매 iteration end 에 entry append (결과 + 다음 step + blocked).
- [attention-budget.md](../../../knowledge/canon/attention-budget.md) v1.1+ — L3 (Memory tool) Trial 1차 적용 후보. `--memory-tool` mode 로 token saving 측정 가능.

## /goal vs /ralph-loop — 책임 분리 (2026-05+)

| 도구 | 종료 조건 | 평가 cost | 적합 |
|---|---|---|---|
| `/goal` | Haiku 평가기 binary 통과 | ~$0.001/turn | binary 종료 조건 명확할 때 (예: tests green) |
| `ralph-loop` | 명시 step 완료 | $0 (skill scripted) | 다단계, 사용자 game plan, 측정 가능 완료기준 |

권고:
- "tests green 까지" / "release-gate 통과" → `/goal`
- "5 stage 순차 진행" / "마이그 cycle" → `ralph-loop`
- "spec compliance 100%" → `/goal` + spec validation script

source: `~/.claude/plans/20260513-evolve-goal-command.md`
