---
title: Debrief Format — 좋은 카드의 조건 (authoring prior)
version: 1.0.0
last_updated: 2026-07-11
source: [ReasoningBank arXiv 2509.25140 (Title/Description/Content 전략 카드·전략>워크플로>trajectory ablation), H2T arXiv 2408.09365 + LEAP (대조 원칙 유도), Anthropic faithfulness 연구 (사후 재구성 한계), SkillsBench (authoring prior 단독 = 거버넌스 이득 ~57%), contracts/debrief card.ts (스키마 SoT)]
sync_to_siblings: true
applicability: always
consumers: [debrief, playbooks, harness-compile]
authored_by: claude-fable-5 (2026-07-11 S1 수확 세션 — frontier-authored prior)
---

# Debrief Format — 카드 하나가 좋으려면

> 이 문서가 **품질 레버의 절반**이다: 실측상 좋은 작성 규범(authoring prior) 단독으로 거버넌스 이득의 ~57%. 스키마(필드 목록)는 `contracts/debrief/card.ts` 가 SoT — 이 문서는 각 필드를 **어떻게 채워야 하위 모델이 실제로 똑똑해지는가**만 다룬다.

## 제1원칙: 전략을 쓰라, 일지를 쓰지 마라

ReasoningBank ablation: **전략-레벨 메모리 > 워크플로 메모리 > raw trajectory**. 카드는 "내가 뭘 했나"의 기록이 아니라 "**다음에 비슷한 상황을 만난 다른(더 약한) 모델이 어떤 판단 규칙을 적용해야 하나**"의 추출물이다.

- ❌ "JWT 검증 코드를 리팩터링하고 테스트를 고쳤다" (일지 — 재사용 불가)
- ✅ "**When** 여러 앱이 같은 SSO 발급자를 공유할 때 **do** aud 클레임을 앱별로 pin 하고 공유-audience 토큰을 거부하라 — why: 공유 클레임은 앱 간 replay 가능" (전략 — 상황이 오면 발동)

## decision_principles (1-5개) — 카드의 심장

각 원칙은 `when`(발동 조건) → `action`(실행 지시) → `why`(메커니즘) 3박자:

- **`when` 은 facet 어휘로**: 다음 세션의 검색 쿼리가 이 필드와 매칭된다. "복잡한 상황에서" 같은 무정형 표현 대신 "D1 batch 안에서 조건부 UPDATE 가 0 row 를 반환할 때"처럼 **재인식 가능한 조건**.
- **`action` 은 실행 가능하게**: 하위 모델이 그대로 따라할 수 있는 지시. "주의 깊게 검토하라"(무엇을?) 금지 — "FOR UPDATE 없는 D1 에서는 UPDATE ... WHERE status='pending' 의 changes 수를 확인해 0 이면 경합 패배로 처리하라".
- **`why` 는 메커니즘, 서사 금지**: "그게 더 안전해서"가 아니라 "동시 요청이 같은 row 를 잡으면 last-writer-wins 로 앞선 커밋이 유실되므로". 메커니즘이 있어야 하위 모델이 **변형 상황에 일반화**한다.
- 원칙 수 1-5개 강제는 의도적: 10개 나열은 큐레이션 회피다. 이 태스크에서 **정말 일반화되는 것**만.

## weaker_model_traps — H2T 질문 (최고 레버리지 필드)

작성 직전 스스로에게 묻는다: "**이 태스크를 Opus-xhigh 가 했다면 무엇을 놓쳤을까, 그리고 어떤 원칙이 그 실수를 막는가?**"

- 프론티어 모델만 쓸 수 있는 필드가 아니다 — Opus 도 "Sonnet subagent 라면 놓쳤을 것"을 쓴다.
- 좋은 trap 은 **검출 신호**를 포함한다: "리뷰가 >500줄 auth diff 에서 P0/P1 을 0개 보고하면 under-reporting 을 의심하라" — 하위 모델이 자기 상태를 자가진단할 수 있게.
- 이 필드가 escalation 경계 지도(`model-escalation.md` v2)의 원료다.

## escalation 블록 — 있으면 반드시 채운다

escalate 되어 돌아온 태스크(Opus 실패 → Fable 해결)는 **시스템 전체에서 가장 가치 있는 캡처 순간**이다 (Inter-Cascade). `trigger` 에는 escalate 근거(rule (b) 의 1줄), `what_weaker_missed` 에는 **능력 경계의 정확한 위치** — "Opus 는 X 를 시도했지만 Y 상호작용을 보지 못했다". 다음 유사 태스크는 이 카드 덕에 escalate 없이 풀리는 것이 목표.

## rejected_alternatives — 왜 그 길이 아닌가

시도했다 버린 접근만 (가설로 세웠다 기각한 것 포함). `why_rejected` 는 메커니즘: "성능이 나빠서"가 아니라 "sha256 manifest 대조가 파일당 O(1)인데 이 방식은 재색인 전체 스캔이라 코퍼스 성장과 함께 O(n) 누적". 하위 모델이 같은 막다른 길에 토큰을 태우지 않게 하는 필드.

## outcome — 정직이 유일한 전략

- 증거 없으면 `unverified`. 승격은 어차피 outcome 증거 필수라 부풀림은 소용없고, `verified` 위조는 memory-poisoning 으로 코퍼스 전체의 신뢰를 깎는다.
- `failed` 는 버리는 카드가 아니다 — 실패 카드는 anti-pattern guardrail 후보로 **의도적으로 수집**된다 (ReasoningBank: 실패 신호 +3.2pp). 실패했으면 실패했다고 쓰고 원칙을 "하지 마라" 형으로.
- `evidence.ref` 는 재확인 가능한 참조: commit sha, `bun run quality:all` 실행 시각, live URL.

## facets — 검색이 카드의 운명을 결정한다

`repo`·`framework`·`subsystem`·`error-class` 급 명사 2-8개. 너무 일반적("typescript")이면 모든 질의에 매칭돼 노이즈, 너무 구체적("2026-07-11-오후-버그")이면 영원히 검색 안 됨. 기준: **6개월 뒤 비슷한 문제를 만난 세션이 칠 검색어**.

## 반-패턴

- ❌ **내성 서사**: "곰곰이 생각해보니 ~가 떠올랐다" — debrief 는 사후 재구성이지 사고의 기록이 아니다 (Anthropic faithfulness 연구). 절차만.
- ❌ **일지/워크플로 나열**: "1. 파일 읽음 2. 수정함 3. 테스트" — trajectory 는 전략보다 열등 (ablation 실증).
- ❌ **10개 원칙 나열**: 큐레이션 회피. 일반화되는 것만 1-5개.
- ❌ **outcome 부풀리기**: unverified 를 verified 로 — poisoning.
- ❌ **자기 tier 신고**: CLI 가 산정한다. 카드에 tier 를 써도 덮어써진다.
- ❌ **플레이북 전체 재작성 제안**: 카드는 delta 다. 기존 bullet 수정은 curator 카운터와 /dream 게이트의 일.

## 워크드 예시 (실제 카드 축약)

```json
{
  "provenance": { "model": "claude-fable-5", "provider": "anthropic", "surface": "claude-code" },
  "task": {
    "repo": "modfolio-ecosystem", "task_class": "architecture",
    "error_class": "context-collapse",
    "facets": ["harness", "distillation", "knowledge-corpus", "llm-rewrite"],
    "summary": "축적형 지식 코퍼스의 갱신 경로 설계 — LLM 재작성 vs 결정적 merge 선택"
  },
  "decision_principles": [{
    "title": "축적 코퍼스는 결정적 delta-merge 로만 갱신",
    "when": "LLM 산출물이 성장형 지식 파일(플레이북·cheatsheet·rules)에 반영될 때",
    "action": "LLM 은 append 후보만 내고, merge/dedup/카운터는 ID 기반 비-LLM 스크립트가 수행. 전체 재작성 경로는 만들지 않는다",
    "why": "반복 LLM 재작성은 단조 요약 압력으로 코퍼스를 붕괴시킨다 (실측 18,282→122 토큰/1스텝)"
  }],
  "weaker_model_traps": ["'LLM 이 플레이북을 다듬게 하자'는 제안이 나오면 context collapse 를 지적하고 delta+카운터 설계로 우회하라 — 겉보기에 더 깔끔해 보이는 쪽이 함정이다"],
  "outcome": { "status": "verified", "evidence": [{ "kind": "gate-green", "ref": "quality:all 2026-07-11" }] }
}
```

## 관련

- `reasoning-playbooks.md` — 루프 전체(캡처→큐레이션→주입→컴파일)와 거버넌스
- `.claude/skills/debrief/SKILL.md` — 실행 절차 (이 문서의 규범을 스킬로)
- `contracts/debrief/card.ts` — 필드·제약 SoT
