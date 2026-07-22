---
title: Frontier Day — 프론티어 모델 복귀 시 표준 agenda
version: 1.0.0
last_updated: 2026-07-11
source: [reasoning-playbooks.md v1.0.0 (distillation 루프), Inter-Cascade arXiv 2509.22984 (deferred escalation → banked strategy), model-escalation.md v1.1.0]
sync_to_siblings: true
applicability: conditional
consumers: [debrief, playbooks, harness-dream]
---

# Frontier Day — 프론티어 복귀 프로토콜

> Fable 5 / GPT 5.x / Gemini 급 프론티어 모델 접근이 (재)생길 때마다 실행하는 표준 agenda. 목적: 프론티어 시간을 **1회성 소비가 아닌 영속 자산 축적**에 최대 효율로 쓴다. 벤더 무관 — 같은 agenda 를 GPT/Gemini 에서 돌려도 debrief 스키마·provenance 태그가 흡수한다. 회당 예산 ~$15-30.

## agenda (순서대로)

1. **queue drain** — `memory/frontier-queue.jsonl` 의 `status: "queued"` 를 `workaround_cost` × 나이 순으로 정렬해 처리. 각 답변은 debrief 카드(escalation 블록 포함)로 남기고 entry 를 `status: "answered"` + `answer_ref: "<capture_id>"` 로 갱신. sibling 발 질문은 `feedback/<repo>/frontier-question-*.md` 에서 합류.
2. **candidate 일괄 리뷰** — `knowledge/playbooks/*.md` 의 `## Candidates` 중 standard-tier 미확증 카드를 프론티어가 일괄 판정 (promote 후보/기각 의견). 집행은 /dream 게이트 + `debrief:curate -- --apply-decision` — N=3 확증 대기의 저렴한 대체재.
3. **GEPA pass** — 실패 증거(harmful 카운터·failed 카드) 쌓인 agent/skill 프롬프트를 `/harness-compile` 로 리뷰 (diff 제안, human-gated).
4. **경계맵 갱신** — 이번 frontier day 의 escalation 관찰("하위 모델이 뭘 놓쳤나")을 `model-escalation.md` 의 escalate-if/stay-down-if 신호에 반영 제안.
5. **self-debrief** — frontier day 자체를 `/debrief` 로 마감 (escalation 블록 포함, 카드 1장).

## frontier-queue entry 형식 (`memory/frontier-queue.jsonl`, append-only)

```json
{"ts":"2026-07-14","repo":"modfolio-connect","task_class":"api","question":"...","context_refs":["knowledge/journal/....md"],"attempts":2,"workaround_cost":"low|med|high","status":"queued|answered|obsolete","answer_ref":"<capture_id>"}
```

enqueue 조건 (`reasoning-playbooks.md` §프론티어 부재): ① escalation rung 도달인데 프론티어 부재 ② 같은 error-class 가 활성 카드에도 불구 ≥2회 재발 ③ candidate 60일 미확증. sibling 은 기존 feedback rail 로 (신규 transport 없음).

## 속도 불변

frontier day 는 **반나절 이하 1세션** 이 기본 — 세리머니가 아니다. queue 가 얕으면(≤2) 1·5번만 하고 끝. 검토를 위한 검토 금지 (오너 2026-07-11, `reasoning-playbooks.md` §속도 불변).

## 관련

- `reasoning-playbooks.md` — 루프 전체 · `debrief-format.md` — 카드 규범
- `model-escalation.md` v1.1.0 — rung-2 사전 질의·rule (d)
- `scripts/retro/batch-export.ts mine` — 대량 소급 채굴은 Batch(50%)로 (interactive 세션 아껴서 queue drain 에)
