---
name: harness-dream
description: 하네스 자가개선 — 내부 텔레메트리(pattern-history·feedback·payment-approvals·loop·cost·reasoning-playbooks)를 주기적으로 통합해 반복 실수·선호를 추출하고 canon/feedback 개선안을 제안. playbook 승격/은퇴 게이트 포함. 반영은 사용자 승인 후. 단축어 /dream.
user-invocable: true
---


# /dream — Dreaming 통합 (하네스 자가개선)

Anthropic "Claude Dreaming"(세션 텔레메트리 주기 통합 → 반복 패턴·실수 추출 → 사람 검토 후 반영) 패턴을 우리 하네스에 적용. `/retro`(git 통계)·`/harness-evolve`(외부 트렌드)와 **상호보완하는 세 번째 학습 입력 = 내부 런타임 텔레메트리**.

**REPORT-ONLY**: canon/feedback 자동 반영 없음. 제안만 생성, 적용은 사용자 승인 게이트 후 (Hub-not-enforcer). cron/무인 실행은 리포트 생성까지만.

## 프로세스

### 1. 통합 리포트 생성 (결정적)

```bash
bun run dream                       # 리포트 → stdout
bun run dream -- --out .evolve-state/dream-report.md   # 파일로 (cron report-only)
```

입력(전부 best-effort, 없으면 skip):
- `memory/pattern-history.jsonl` — 반복 정공법 위반(@ts-ignore/as any 등)
- `memory/feedback.jsonl` — 반복 피드백 테마
- `memory/payment-approvals.jsonl` — 결제 가드 활동(차단·자율 거부 추세 = 파산 방지 신호)
- `.evolve-state/loop-events.jsonl` — loop 반복·종료 사유
- `.evolve-state/cost-ledger.jsonl` — 비용 합계
- **`memory/debriefs/` + `knowledge/playbooks/` + `memory/frontier-queue.jsonl`** — reasoning-playbook 큐레이션 상태 (4번째 학습 입력, v3.20): 미병합 카드·Active/Candidate/Retired 분포·curator 제안(PROMOTE/RETIRE/EVICT)·frontier-queue depth. `reasoning-playbooks.md` 참조.

산출: "Dream Consolidation Report" — 반복 위반 / 피드백 테마 / 결제 가드 활동 / loop·cost / 모델 사용 / **reasoning playbooks** / **제안(human-gated)**.

### 2. 제안 검토 → 승인 게이트 (AskUserQuestion)

리포트의 "Proposed actions" 를 사용자에게 제시:
- 어떤 제안을 적용할까? (multiSelect)
- 적용 형태: canon 갱신 / rule 보강 / `/evolve` 핸드오프 / payment-allowlist 등록 / **playbook 승격·은퇴** / 보류

**자동 쓰기 금지** — 승인한 항목만 반영. ecosystem: canon/feedback. sibling: 자기 `memory/` 만 (sibling canon 직접수정 X).

playbook 결정의 집행은 결정적 executor 로만 (인간이 bullet 문법을 손편집하지 않는다):

```bash
bun run debrief:curate -- --apply-decision PB-SEC-0007:promote   # 승인된 승격
bun run debrief:curate -- --apply-decision PB-SEC-0007:retire    # 승인된 은퇴 (tombstone)
```

### 3. 통합 핸드오프

- 반복 위반 → `/evolve` 또는 해당 rule 갱신
- 결제 자율 거부 → audit(`memory/payment-approvals.jsonl`) 검토 + payment-safety 점검
- 비용 급증 → cost-attribution 점검

## 스케줄 (선택, report-only)

`/schedule` 로 월간 등록 가능 — **무인 실행은 리포트만**(canon 무변경). 사용자가 다음 세션에 검토.

```bash
# 예: cron 이 report-only 로 호출
bun run dream -- --out .evolve-state/dream-report.md
```

## 안전

- memory-poisoning 방어: `governance.ts checkMemoryPoisoning` 이 knowledge/ churn 감시 — 잘못된 consolidation 폭주 차단.
- 결정성: `--now <iso>` 로 타임스탬프 주입, 코어 `consolidate()` 는 순수(테스트됨).

## 관련

- `knowledge/canon/harness-dreaming.md` — 설계 + 안전 모델
- `.claude/skills/retro/SKILL.md` — git 통계 회고 (자매)
- `.claude/skills/harness-evolve/SKILL.md` — 외부 트렌드 합성 (자매)
- `scripts/dream/consolidate.ts` — 구현
