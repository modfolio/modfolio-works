---
name: debrief
description: 태스크 종료 시 reasoning debrief 카드 작성 — 판단 원리를 구조화 캡처해 playbook 코퍼스에 축적. escalation(max/Fable/프론티어) 사용 후 필수, P0 해결·gate-green 완료 시 권고
user-invocable: true
---

# /debrief — reasoning 캡처

방금 끝낸(끝내는) 태스크의 **판단 원리**를 DebriefCard 로 추출해 영속 싱크에 적재한다. 작성 규범 = `knowledge/canon/debrief-format.md` (**먼저 읽기** — 좋은 카드의 조건), 루프 전체 = `knowledge/canon/reasoning-playbooks.md`.

## 절차

### 1. outcome 증거부터 수집 (부풀림 금지)

실제 참조만: 커밋 sha (`git log -1 --format=%h`), gate 실행 결과 (`bun run quality:all` green 시각), live URL 확인, 테스트 pass. **증거 없으면 `status: "unverified"`** — 승격은 어차피 증거 필수라 정직이 유일한 전략. 실패한 태스크는 `status: "failed"` 로 그대로 캡처 (실패 카드 = guardrail 후보, 버리지 않는다).

### 2. 카드 JSON 작성

`debrief-format.md` 의 규범 적용 — 핵심 3가지:
- **전략을 쓰라, 일지를 쓰지 마라**: `decision_principles[]` 는 when(재인식 가능 조건)→action(실행 가능 지시)→why(메커니즘) 1-5개.
- **H2T 질문**: "이 태스크를 더 약한 모델이 했다면 무엇을 놓쳤을까, 어떤 원칙이 막나?" → `weaker_model_traps[]` (검출 신호 포함).
- **escalation 이었다면 필수**: `escalation{from_model, trigger, what_weaker_missed}` — 능력 경계의 정확한 위치가 최고가치 캡처.

이번 태스크 중 참조한 playbook bullet 이 있으면 `used_playbook_ids[]` 에 `PB-*` ID 기록 (카운터가 이것으로만 갱신됨). 채우지 않는 필드: `capture_id`·`captured_at`·`provenance.tier`·`task.repo` — CLI 가 결정적으로 주입/산정 (tier 자기신고는 덮어써짐).

### 3. CLI 로 검증·적재

```bash
echo '<card-json>' | bunx modfolio-debrief          # 설치 패키지 (sibling)
echo '<card-json>' | bun scripts/debrief/cli.ts     # 허브 checkout
# 검증만: --dry-run
```

- **exit 1 (rejected)**: stderr 의 Zod issue 목록을 읽고 JSON 을 고쳐 **재파이프** (스키마-강제 루프). 우회하거나 포기하지 않는다.
- **exit 0**: `memory/debriefs/<repo>.jsonl` (허브 가시) 또는 `.claude/debriefs/outbox.jsonl` (detached — 다음 허브-가시 실행에서 자동 flush).

### 4. 마무리 1줄 보고

`debrief: <capture_id 앞 8자> [<tier>/<task_class>] principles=<n> → <싱크 경로>` 형식으로 사용자에게 알린다.

## 트리거 요약 (reasoning-playbooks.md §capture 규율)

| 상황 | 의무 |
|---|---|
| `/effort max`·`/model fable`·프론티어 모델 세션 종료 | **필수** (escalation 블록 포함) |
| P0/P1·incident 종결 | 강력 권고 (실패 카드 포함) |
| 승인된 큰 설계 (plan-mode) | 권고 (`artifacts.plan_file`) |
| 일상 gate-green | 선택 (standard tier 축적) |

## 비-Claude 표면 (GPT/Gemini CLI 등)

동일 프로토콜 — `templates/agents-md/debrief-section.md` 블록을 그 도구의 AGENTS.md 에 넣으면 이 SKILL 을 읽고 같은 CLI 로 적재한다. provider 는 `provenance.provider` 에 정직하게 (ToS provenance 규율).

## 반-패턴

- ❌ 세션 요약을 카드라고 제출 (일지 ≠ 전략)
- ❌ 원칙 6개 이상 나열 (큐레이션 회피 — 일반화되는 것만)
- ❌ unverified 를 verified 로 (poisoning)
- ❌ 거절 시 카드 포기 (Zod issue 는 고치라고 있는 것)
