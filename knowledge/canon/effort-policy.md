---
title: Effort Policy — 새 agent 의 effort 를 고르는 기준
version: 2.1.0
last_updated: 2026-09-23
source: [opus-4-7-effort-policy.md v2.5.0 (authoritative 분포·모델·env 정책 — 2026-09-23 한 칸 내림), Harness v2.4 초판]
sync_to_siblings: true
applicability: always
consumers: [preflight, context-isolation-setup]
---

<!--
v1.0.0(2026-04-17)은 자체 agent→effort 매핑 표를 갖고 있었고, 그 표가
opus-4-7-effort-policy.md 의 표와 **서로 모순**된 채 28개 sibling 에 동기화되고
있었다(예: security-hardener 를 high 로, contract-builder 를 max 로 규정 — 둘 다
authoritative 표와 불일치). v2.0.0 에서 중복 표를 제거하고 이 문서를 "새 agent 를
만들 때 어느 레벨을 고를까"라는 **판단 기준**으로 좁힌다. 현행 값은 한 곳에만 산다.
-->

# Effort Policy — 새 agent 의 effort 고르기

> **현행 agent 별 effort 값과 분포는 이 문서에 없다.** authoritative SoT =
> [`opus-4-7-effort-policy.md`](opus-4-7-effort-policy.md) v2.5.0 §agent 분포 표
> (현재 **xhigh=7 · high=14 · medium=3** · max=0). 값을 두 곳에 두면 반드시 어긋난다 —
> v1.0.0 이 그렇게 어긋난 채 3개월을 갔다.
>
> 이 문서는 **새 agent 를 추가할 때 어느 레벨에 놓을지** 판단하는 기준만 다룬다.

## 결정 트리

```
틀렸을 때 비가역이거나 되돌리는 비용이 큰가?
  (보안·돈 이동·마이그레이션·아키텍처 결정·P0 장애)
  ├─ Yes → xhigh          (frontmatter 에 max 를 두지 않는다 — 아래)
  └─ No → read-only 수집/검색/분류인가?
          ├─ Yes → medium (+ Haiku 또는 Sonnet 모델)
          └─ No → high           ← universe 기본값(코딩·리뷰·생성·관측 — v2.5.0 에서 한 레벨로 합쳤다)
```

**기본값은 `high` 다**(2026-09-23 재측정 뒤 오너 결정 — v2.0.0 의 xhigh 기본을 대체). 정확성 우선은 그대로다: 실사건 5 케이스에서 high 위의 정확도 이득이 측정되지 않았고 시간만 1.7배(xhigh)·7배(max)였다. 표·근거 = `opus-4-7-effort-policy.md` §v2.5.0. 구현·설계 과제의 이득은 **미측정**이라, 그 축에서 실패가 관측되면 그 기록이 상향 근거가 된다.

## 금지 패턴

- **`CLAUDE_CODE_EFFORT_LEVEL` env 설정** — env 는 최상위 우선순위라 전 subagent 의 frontmatter effort 를 덮어쓴다(fleet-wide overthinking + `ultracode` 비활성). 세션 기본값은 `.claude/settings.json` 의 `effortLevel` 로 준다. 실사건 = `opus-4-7-effort-policy.md` §환경변수 정책
- **settings 파일에 `effortLevel: "max"`** — 2.1.258 실측 **수용된다**(2026-09-02, 허브 `-p` 세션 + pdgd 대화형). 종전 «무효값·거부» 서술은 낡았다. 그래도 기본은 `xhigh`: `max` 는 ultracode 와 양립하지 않고, 상시 max 는 «근거 있는 상향» 원칙과 어긋난다. `max` 는 `/effort max` 세션 토글로
- **`[1m]` 접미사** — Opus 5·Sonnet 5 는 1M 이 기본이자 유일한 컨텍스트 창이라 접미사가 무의미하고, Claude Code 가 subagent spawn 시 strip 하거나 실패시킨다
- **frontmatter 의 `max`** — 재측정에서 시간 초과 4/10 · 시간 7배(2026-09-23). max 는 세션 `/effort max` 와 라우팅 `escalation` opt-in(실패 증거 뒤)에만 쓴다. 비가역·expensive-if-wrong agent 는 `xhigh` 에 두고 이유를 `_effort_change_note` 에 남긴다
- **Haiku agent 에 `xhigh`/`max`** — Haiku 4.5 는 지원하지 않는다(가장 가까운 하위 레벨로 떨어진다)

## Claude Code 인터페이스

- `/effort` — 세션 슬라이더. `/effort max`(세션 전용), `/effort ultracode`(xhigh + workflow 오케스트레이션, v2.1.203+), `/effort auto`(모델 기본값으로 리셋)
- `ultrathink` — 프롬프트에 포함하면 그 턴만 심화. 세션 effort 는 불변
- agent/skill frontmatter `effort:` — 그 agent 실행 중에만 세션 값을 override (env 는 못 이김)

**우선순위**: env > subagent/skill frontmatter > 세션 설정 > 모델 기본값(Opus 5.5 `medium` · Opus 5 `high`). 「기본」 이 셋이다 — agent frontmatter 기본(`high` · 이 문서) · 세션 `effortLevel`(`xhigh` · `.claude/settings.json`) · 모델 기본(`medium` · 둘 다 없을 때).

## 관련 문서

- [opus-4-7-effort-policy.md](opus-4-7-effort-policy.md) — **authoritative** 분포·모델·가격·env 정책
- [model-escalation.md](model-escalation.md) — 언제 위/아래 rung 으로 움직이나
- `.claude/rules/opus-5-behavior.md` — Opus 5 행동 보정
- [context-isolation.md](context-isolation.md) — effort 를 올리기 전에 격리를 먼저 고려
- [prompt-caching-strategy.md](prompt-caching-strategy.md) — 높은 effort 세션에서 cache hit 확보

## 갱신 이력

- 2026-09-23: v2.1.0. 재측정(실사건 5 케이스 × 2회 — high 10/10 · xhigh 10/10 · max 시간 초과 4/10) 뒤 오너 결정으로 한 칸 내림 — 비가역 xhigh · 나머지 high · frontmatter max 없음. 결정 트리의 코딩·관측 분기를 하나로 합침(둘 다 high).
- 2026-07-26: v2.0.0. 중복 agent→effort 표 제거(opus-4-7-effort-policy.md 와 모순 상태였음) → 판단 기준 문서로 축소. `[1m]` 섹션 폐기(Opus 5 는 1M 단일). env-max·settings-max 금지 명문화.
- 2026-04-17: v1.0.0 초판. 17 agent 실측 기반 표 작성. `[1m]` suffix 기준 명시.
