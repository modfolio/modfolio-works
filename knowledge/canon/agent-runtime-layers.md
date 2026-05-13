---
title: Agent Runtime Layers — L1 Subagent / L2 Managed Agent Frame
version: 1.0.0
last_updated: 2026-05-13
source: [Anthropic Managed Agents 2026-04-08 GA beta (https://platform.claude.com/docs/en/release-notes/overview), Anthropic Multiagent Sessions & Outcomes 2026-05-06 (https://platform.claude.com/docs/en/release-notes/overview), Anthropic Agent Memory 2026-04-23, harness v3.0 P2.5 (plan crystalline-sparking-sky)]
sync_to_siblings: true
applicability: always
consumers: [harness-evolve, modfolio, plan, claude-api, multi-review]
---

# Agent Runtime Layers — L1 / L2 Frame

> **핵심 원칙**: modfolio universe 의 agent 는 **두 runtime layer** 로 분류한다. layer 분리는 단순 명칭이 아니라 **권한 / 비용 / 자율성** 의 책임 boundary.

## Layer 정의

### L1 — Subagent (Task fork, ephemeral)

**runtime**: Claude Code session 안의 `Task` 도구 fork. 호출자 (Lead / 사용자) 가 종료 후 자동 회수.

**특징**:
- ephemeral context (session 종료 시 소멸)
- 비용 = host session 의 token (cache 정합 유지)
- 자율성 = host 의 명시 task spec 안에서만
- 권한 = host 의 `disallowedTools` / `allowedTools` 상속
- 종료 시점 = task 완료 또는 host 결정

**modfolio universe 매핑 (v2.35 기준 23 agent)**:
- 모든 21 + 2 신 agent (lead-planner / evaluator) 가 L1
- `.claude/agents/*.md` frontmatter spec
- Task 도구로 fork, structured artifact 로 return

**대표 use case**:
- Multi-Agent Research 3-tier (Lead Planner / Generator / Evaluator)
- multi-review 4-agent 병렬 분산
- ralph-loop iteration 안에서 한 stage 처리

### L2 — Managed Agent (Anthropic Cloud-hosted, persistent)

**runtime**: Anthropic 의 Managed Agents API (2026-04-08 GA beta). Cloud-hosted sandbox + built-in tools + SSE streaming + session lifecycle webhooks.

**특징**:
- persistent session (Anthropic Cloud 가 lifecycle 관리)
- 비용 = $0.08/session-hour 런타임 + 표준 token
- 자율성 = 사전 spec 된 capability 안에서 자체 추론·실행
- 권한 = Managed Agents API key + scoped permission
- 종료 시점 = condition 도달 / 사용자 stop / 시간 초과

**modfolio universe 매핑 (v3.0 시점 — P3 보류)**:
- 현재 modfolio 의 L2 agent **0개**
- 도입 시점 = 6개월 GA stability 관찰 후 (`tech-trends-2026-11.md` Trial 카테고리 entry)
- 1차 spike = 1 sibling dogfood + 30일 cost ledger 측정

**대표 use case (가정)**:
- 장시간 background research (Slack 답변 / 일정 모니터링 / 외부 webhook 응답)
- cross-machine continuity (사용자 머신 외 cloud 에서 자율 진행)
- 정기 cron-driven heavy work (modfolio universe 외 환경에서 사용)

## L1 vs L2 비교 매트릭스

| 차원 | L1 Subagent | L2 Managed Agent |
|---|---|---|
| Runtime | Claude Code session 안 (Task fork) | Anthropic Cloud sandbox |
| Lifetime | ephemeral (task 완료 시 회수) | persistent (시간 / condition 종료) |
| Identity | host session 의 sub-process | 독립 agent (own API key / session id) |
| 비용 | host token 만 | $0.08/h + token |
| 권한 모델 | `allowedTools` / `disallowedTools` (frontmatter) | scoped Managed Agents permission |
| 종료 결정자 | host (사용자 / Lead Planner) | self / condition / timeout |
| Memory | host context window | persistent memory (4/23 GA) |
| 검증 | host 의 `bun run quality:all` | Anthropic 의 Outcomes (5/6 GA beta) |
| Hub-not-enforcer 정합 | 명확 — 22 sibling owner 가 직접 통제 | 모호 — Cloud-hosted, owner 직접 통제 불가 (R2 위험) |

## modfolio universe 의 L2 도입 기준 (P3 보류 사유)

P3 plan (crystalline-sparking-sky H 섹션) 의 5 사유:

1. **자율성 충돌** — L2 는 Anthropic Cloud-hosted, sibling owner 직접 통제 불가
2. **비용 불확실** — $0.08/h × 22 sibling × cron = 월 $1,000+ 가능
3. **L1/L2 layer 모호** — 본 canon (v3.0 P2.5) cement 전 도입 시 dual-stack drift
4. **GA stability 부족** — 2026-04-08 GA, 2026-05-13 현재 5주 — 6개월 관찰 권고
5. **마이그 경로 모호** — 기존 23 L1 agent → L2 의 마이그 path 불명확

본 canon (P2.5 cement) 가 사유 #3 해결 (frame 준비). 사유 #1, #2, #4, #5 는 6개월 관찰 + 1 sibling spike 로 해결.

## L2 도입 시 (재평가 trigger, 2026-11-13 후보)

조건 충족 시 `tech-trends-2026-11.md` Trial entry 추가:

- [ ] Anthropic Managed Agents GA + Multiagent Sessions + Memory 모두 GA (beta 해제)
- [ ] 사례 연구: Anthropic 또는 사용자 community 의 6개월+ production deployment
- [ ] 비용 model: token + session-hour 분리 측정 가능 (cost-attribution.md 정합)
- [ ] modfolio sibling 1개 (예: modfolio-ecosystem 자체) 의 30일 spike 결과
- [ ] L1 → L2 마이그 path 문서 (agent frontmatter spec 의 어떤 부분이 호환되는가)

조건 미충족 시 P3 유지.

## Hybrid 패턴 (도입 시 후보)

L1 + L2 공존 시:

- **Lead Planner (L1)** orchestrates → **Generator (L2)** for long-horizon task → **Evaluator (L1)** for verdict
- **L2** for cron-driven monitoring → trigger **L1 sub-session** for action
- **L2 Memory** as shared knowledge → **L1 agents** read 권한만

각 layer 의 책임 boundary 유지가 핵심. 혼합 anti-pattern:

- ❌ L1 이 L2 의 long-running 작업을 wait 함 (host session 차단)
- ❌ L2 가 sibling owner 통제 우회 (R2 위반)
- ❌ L1 frontmatter spec 을 L2 에 그대로 적용 (incompatible)

## 정공법 5원칙 정합

| 원칙 | L1/L2 frame 정합 |
|---|---|
| 1. 근본 원인 수정 | "agent 가 너무 많아" → ❌ N 늘리기 / ✅ layer 분리로 책임 명확화 |
| 2. 에러·경고 0 | L2 도입 시 cost / 권한 / 자율성 boundary 위반 자동 검출 (governance.ts 확장 path) |
| 3. 장기 시야 + 확장성 | L1 (23 agent) + L2 (0 → N) 분리로 점진 확장 가능 |
| 4. 신기술 포텐셜 | L2 = Anthropic 2026 Q2 신기능. 도입 path 마련만, 채택은 P3 |
| 5. 리소스 투자 | frame 작성 cost < dual-stack drift 회피 가치 |

## 출처

### Primary

- [Anthropic Release Notes 2026-04-08 Managed Agents GA beta](https://platform.claude.com/docs/en/release-notes/overview)
- [Anthropic Release Notes 2026-05-06 Multiagent Sessions & Outcomes public beta](https://platform.claude.com/docs/en/release-notes/overview)
- [Anthropic Release Notes 2026-04-23 Agent Memory public beta](https://platform.claude.com/docs/en/release-notes/overview)
- [Anthropic Engineering — Multi-Agent Research System (April 2026)](https://www.anthropic.com/engineering/multi-agent-research-system)

### 관련 modfolio canon

- `multi-agent-research-pattern.md` — L1 의 3-tier 패턴 (Lead Planner / Generator / Evaluator)
- `agentic-engineering.md` — agent 전체 frame
- `evergreen-principle.md` — Hub-not-enforcer (L2 도입 시 자율성 보호 필요)
- `tech-trends-2026-05.md` — Trial 카테고리 (현재 Managed Agents P3 보류 entry)
- `cost-attribution.md` — L2 session-hour 비용 attribution path
- `opus-4-7-effort-policy.md` v1.2+ — L1 agent 의 effort × thinking_budget 정책

## 갱신 이력

- **2026-05-13 v1.0.0** — 초판. plan crystalline-sparking-sky P2.5 cement. L1/L2 frame 명문화 — Managed Agents (P3 보류) 도입 path 준비. 23 L1 agent / 0 L2 agent baseline. 6개월 후 (2026-11) 재평가 trigger 명시.
