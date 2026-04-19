---
title: Effort Policy — low / medium / high / xhigh / max
version: 1.0.0
last_updated: 2026-04-17
source: [Anthropic Claude Opus 4.7 effort system, Harness v2.4]
sync_to_children: true
consumers: [preflight, context-isolation-setup]
---

<!--
Effort 레벨을 언제 쓰는지 명문화된 정책이 없어, 신규 agent가 기본 `max`로 잡히는 drift가 있었다.
이 canon은 agent의 역할별로 어떤 effort를 쓸지 기준을 제공한다.
-->

# Effort Policy — 언제 어떤 effort 레벨을 쓰나

| 레벨 | 사용 기준 | 대표 agent |
|------|-----------|-----------|
| **max** | 전체 추론 흔적이 필요한 작업. 결정이 한 번만 내려지며 되돌리기 어려운 경우 | `design-engineer`, `contract-builder`, `schema-builder`, `incident-handler`, `architecture-sentinel` |
| **xhigh** | 정공법 리뷰. 검증에 가까운 역할, 대안 비교 | `code-reviewer`, `design-critic`, `accessibility-auditor`, `ecosystem-auditor`, `migrations-auditor` |
| **high** | 일반 생성·구현 작업 | `api-builder`, `component-builder`, `page-builder`, `test-builder`, `quality-fixer`, `security-hardener`, `perf-profiler`, `visual-qa` |
| **medium** | 정보 수집, 분류, 인덱싱 | `knowledge-searcher`, `innovation-scout` |
| **low** | 단순 변환, 파싱 | (현재 해당 agent 없음) |

## 결정 트리

```
대화 결과가 오래 유지되거나 되돌리기 어려운가?
  ├─ Yes → max
  └─ No → 검증/리뷰 성격인가?
          ├─ Yes → xhigh
          └─ No → 일반 생성/수정인가?
                  ├─ Yes → high
                  └─ No → 정보 수집만인가?
                          ├─ Yes → medium
                          └─ No → low
```

## `[1m]` suffix 가이드

1M context variant는 effort와 **독립적**이다. 사용 기준:

- 대형 diff 리뷰 (>50 파일) → `[1m]`
- Figma metadata + 디자인 토큰 비교 → `[1m]`
- 여러 레포 교차 참조 → `[1m]` 또는 [context-isolation.md](context-isolation.md)의 worktree-per-subagent

우리 현재 `[1m]` 할당 agent 3개:
- `design-engineer` — Figma metadata + 여러 canon 교차
- `page-builder` — 대형 레이아웃 + Figma 원본
- `code-reviewer` — 대형 diff (≥20 파일)

## 금지 패턴

- 신규 agent의 기본 effort를 `max`로 둠 — 이유가 있어야 max다
- agent 본문이 짧은데 `xhigh`/`max` — 짧은 본문 = high 이하가 맞는 자리
- `[1m]`을 "혹시 몰라서" 남발 — 토크나이저 + 비용 증가

## Claude Code 인터페이스

- `/effort` (v2.1.111+): 세션 내 슬라이더로 토글. arrow key + Enter.
- `CLAUDE_CODE_EFFORT_LEVEL` env (운영 체제 수준, 가장 강): `max` 권고.
- agent frontmatter `effort:` 필드: 해당 agent만의 오버라이드.

우선순위: **agent frontmatter > env > slash command 세션 토글**.

## 관련 문서

- [context-isolation.md](context-isolation.md) — effort를 올리기 전에 격리를 먼저 고려
- [prompt-caching-strategy.md](prompt-caching-strategy.md) — 높은 effort 세션에서 cache hit 확보의 중요성

## 갱신 이력

- 2026-04-17: v1.0.0 초판. 17 agent 현재 effort 값 실측 기반 표 작성. `[1m]` suffix 기준 명시.
