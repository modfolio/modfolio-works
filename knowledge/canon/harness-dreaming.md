---
title: Harness Dreaming — 내부 텔레메트리 자가개선 (report-only, human-gated)
version: 1.0.0
last_updated: 2026-06-14
source: [Anthropic "Claude Dreaming" (2026-05-06, self-improving agent memory — 세션 통합/패턴 추출/사람 검토 후 반영); 2026-06-14 사용자 요청 — 하네스가 스스로 발전/시스템 진화]
sync_to_siblings: true
applicability: always
consumers: [retro, harness-evolve, schedule]
---

# Harness Dreaming

> **하네스 자신의 런타임 텔레메트리를 주기적으로 통합 → 반복 실수·선호 추출 → 개선 *제안* → 사람 승인 후 반영. canon/feedback 자동 변경 없음 (REPORT-ONLY).**

## 왜

`/retro`(git 통계)·`/harness-evolve`(외부 웹 트렌드)는 있었지만, 하네스가 *자기 운영 중에 남긴 신호*(반복 정공법 위반, 반복 피드백, 차단된 결제 시도, loop 실패, 비용)를 durable 개선으로 압축하는 단계가 없었다. Anthropic Claude Dreaming 패턴(session logging → 메타추론 패턴 추출 → memory consolidation → 사람 검토 통합)을 하네스에 적용한 세 번째 학습 입력 = **내부 런타임 텔레메트리**.

## 4단계 (Dreaming 미러)

1. **collect** — `memory/pattern-history.jsonl`, `memory/feedback.jsonl`, `memory/payment-approvals.jsonl`, `.evolve-state/loop-events.jsonl`, `.evolve-state/cost-ledger.jsonl`, journal. best-effort(없으면 skip).
2. **extract** — 결정적 집계: 반복 패턴(threshold ≥3 = ⚠️), 피드백 테마, 결제 가드 활동(차단·자율거부), loop·cost.
3. **consolidate** — 개선 **제안** 생성(canon/rule 보강, `/evolve` 핸드오프, payment-allowlist 등록, audit 검토). 중복 병합·outdated 정리.
4. **review → apply** — `/dream` skill 의 `AskUserQuestion` 게이트. ecosystem: canon/feedback. sibling: 자기 `memory/` 만 (sibling canon 직접수정 X).

## 안전

- **REPORT-ONLY + human-gate**: 무인 자동 canon 반영 절대 없음 (Hub-not-enforcer). cron/무인 = 리포트 파일 생성까지만, 사람이 다음 세션 검토 (payment-safety §5 자율-무뮤테이션 원칙 정합).
- **memory-poisoning 방어**: `governance.ts checkMemoryPoisoning` 이 knowledge/ churn(1일 30% spike) 감시 → 잘못된 consolidation 폭주 차단 (OWASP ASI06).
- **결정성**: 코어 `consolidate(input)` 는 순수(fs·Date 없음, `now` 주입). 동일 입력 = 동일 리포트. 테스트: `scripts/dream/__tests__/consolidate.test.ts`.

## 구동

```bash
bun run dream                                          # 리포트 → stdout (대화형)
bun run dream -- --out .evolve-state/dream-report.md   # 파일 (cron report-only)
bun run dream -- --now 2026-06-14T00:00:00Z            # 타임스탬프 주입 (결정성)
```

## 자매 시스템 (3 학습 입력)

| skill | 입력 | 산출 |
|---|---|---|
| `/retro` | git 히스토리 | 스프린트 회고 |
| `/harness-evolve` | 외부 웹 트렌드 (3-agent WebSearch) | 도입 후보 + plan |
| **`/dream`** | 내부 런타임 텔레메트리 (JSONL) | 반복 패턴 + 개선 제안 |

셋 다 사람 승인 게이트 공유 — 자동 적용 없음.

## 관련

- `.claude/skills/harness-dream/SKILL.md` — 운영 가이드
- `scripts/dream/consolidate.ts` — 구현 (pure consolidate + collect + CLI)
- `knowledge/canon/payment-safety.md` §5 — 자율 무뮤테이션 원칙
- `knowledge/canon/evergreen-principle.md` — Hub-not-enforcer
