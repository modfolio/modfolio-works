---
title: Fable 5.1 행동 보정
applicability: 메인 세션 모델이 claude-fable-5-1 일 때 · 위임·검증·편집·출력 방식을 정할 때
consumers: [all-agents]
related_canon: [model-escalation, opus-4-7-effort-policy, claude-code-2026h1-features]
# `paths:` 없음 = 의도(상시 주입). opus-5-behavior.md 와 쌍이며 **적용 모델**로 갈린다.
# frontmatter 는 Codex 색인용이라 주입을 가르지 않는다 — 읽는 쪽이 자기 모델로 가른다.
---

# Fable 5.1 행동 보정 — 메인 세션이 `claude-fable-5-1` 일 때

**적용 범위**: 지금 실행 중인 모델이 `claude-fable-5-1` 이면 이 파일이 `opus-5-behavior.md`
§1(자기검증)·§2(위임 상한)·§5(출력 길이)를 **대체**한다. `model: claude-opus-5` 로 고정된
서브에이전트 안에서는 `opus-5-behavior.md` 가 정본이다. §3(범위)·§4(coverage-first)는 두 모델
공통 — 그대로 지킨다. Claude Code 자체 시스템 프롬프트가 이미 주입하는 일반 지침은 반복하지 않는다.

근거(Anthropic Fable 5.1 가이드 — `claude-api` 스킬 번들 `shared/model-migration.md`
§Migrating to Claude Fable 5.1): *"instead of suppressing delegation (a common prior-model
guardrail), use sub-agents frequently"* · *"Separate fresh-context verifier sub-agents tend to
outperform self-critique"* · *"Prompts and skills written for prior models are often too
prescriptive… and reduce output quality"*.

## 1. 위임 — 상한 없음, 비동기, 모델은 명시

- 독립 하위작업은 서브에이전트에 **비동기로** 맡기고 계속 일한다. 궤도를 벗어나거나 맥락이
  빠진 것에만 개입한다.
- 내장 Explore/Plan/general-purpose 는 frontmatter 가 없어 **세션 모델·effort 를 상속**한다
  (= Fable 5.1 · 비싸다). 호출마다 `model` 을 명시한다 — 탐색·기계적 fan-out 은 `opus`,
  대량 검색은 `sonnet`, 신규 설계 판단만 상속.
- `agent-evidence.md` 는 불변: 서브에이전트의 초록 주장은 증거가 아니다. 게이트는 메인이
  재실행하고 결과를 인용한다.

## 2. 검증 — fresh-context 검증자는 허용

긴 빌드의 검증을 **별도 fresh-context 서브에이전트**에 맡겨도 된다. 뒤집히는 것은 «자기비판
지시 금지» 이지 «검증자 분리» 가 아니다. 판정은 여전히 기계 게이트와 출력 인용이다.

## 3. 편집 — 수술적으로

Edit 가 기본, Write 는 신규 파일·전면 교체에만. 이 모델은 작은 변경에도 파일 전체를 다시
쓰는 경향이 Fable 5 보다 크다.

## 4. 출력 — opus-5 §5 와 반대 방향

산문이 조밀하고 서식을 덜 쓰는 것이 기본이다. 분량을 맞추려 늘리지 말고, 독자에게 필요한
표·목록은 억제하지 않는다. 수 분짜리 턴은 정상 — «결과를 마지막에 몰아 보고하라» 류 문구를
프롬프트에 넣지 않는다.

## 5. 기존 프롬프트는 대본이 아니라 의도로

`.claude/agents/`·skills 의 단계별 절차는 Opus 4.8/5 용으로 쓰였다. 절차를 문자 그대로
밟기보다 **목표·제약**으로 읽는다. 새 프롬프트는 단계 나열 대신 목표와 제약을 적는다.

## 관련

- `opus-5-behavior.md` — Opus 5 컨텍스트의 정본 (§3·§4 공통)
- `knowledge/canon/model-escalation.md` rule (e) — Frontier-Bench 수치는 Fable **5** 실측 · 5.1 재측정 2026-09-09
