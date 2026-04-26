---
title: Agentic Engineering — methodology canon
version: 1.0.0
last_updated: 2026-04-26
source:
  [
    Karpathy 2026-02 vibe-coding 종언 선언,
    NxCode 2026 agentic engineering complete guide,
    CodeRabbit 2025.12 AI code-review stats,
    Modfolio harness v2.10-v2.13 운영 실측,
  ]
sync_to_siblings: true
applicability: always
consumers: [preflight, ralph-loop, multi-review, generate-review, fix]
---

<!--
Karpathy 가 2026-02 essay 에서 "vibe coding" 의 일상화 선언을 철회하고
"agentic engineering" 으로 패러다임을 재정의한 후, 2026-Q2 에 들어서
프로덕션에서의 LLM 협업 표준이 빠르게 정합 중. 본 canon 은 modfolio
ecosystem 의 17 agent + 40+ skill + 7-stage hook 시스템이 이미 구현하고
있는 agentic engineering 을 한 곳에 anchor 하고, 신규 sibling repo 가
이 frame 에 맞춰 자기 워크플로우를 정렬할 수 있게 한다.
-->

# Agentic Engineering — Methodology Canon

> **Vibe coding 은 끝났다. Agentic engineering 으로 진화한다.**
> — Karpathy 2026-02

이 canon 은 modfolio ecosystem 의 LLM 협업 워크플로우 표준이다. 강제 아니다 (Hub-not-enforcer). 각 sibling repo 가 자기 시점에 정합한다.

## 0. 왜 이 canon 이 필요한가

2025 년의 "vibe coding" 은 prototype/MVP 수준에서 강력했지만, 프로덕션·계약·스키마·보안 작업에는 부적합했다. 통계가 이를 증명한다 (CodeRabbit 2025.12):

- AI 공저 코드는 같은 조건의 인간 작성 코드보다 **1.7x major issue, 2.74x 보안 취약** 발생
- 개발자 92% 가 AI 도구 매일 사용, 코드 41% 가 AI 생성

Karpathy 는 2026-02 essay 에서 "vibe coding" 일상화를 철회하고 **agentic engineering** 패러다임으로 재정의했다. 핵심: AI 에이전트가 **계획 / 작성 / 테스트 / 배포** 를 자율 수행하되, **구조화된 인간 감독 아래** 에서. 즉 "AI 에 맡기고 잊는다" 가 아니라 "AI 와 함께 공학하는 규율".

modfolio ecosystem 은 이미 이 프레임을 운영해왔지만 (17 agent + multi-review + ralph-loop + Stop hook + agent-evidence 룰) 한 단어로 anchor 된 적은 없었다. 본 canon 이 그 anchor.

## 1. 핵심 원칙 5

### 1.1 Atomic task 분해

**금지**: "build a CRM" 같은 거대 prompt. 결과는 hallucination + 누락 + 보안 hole.

**권고**: task 단위가 LLM 컨텍스트 자체로 self-sufficient 한지 확인. 한 prompt 안에서 결정 가능한 단위까지 쪼갠다.

| 나쁜 예 | 좋은 예 |
|---|---|
| "고객 관리 시스템 만들어줘" | "Implement OAuth2 middleware for /api/auth/oidc with PKCE flow per @modfolio/connect-sdk@^7.0.0. Reject without state param. Return 401 with structured error matching contracts/events/auth.ts" |
| "테스트 추가해줘" | "Add Vitest unit tests for `parsePullManifest` covering empty file, missing fields, malformed JSON. Use existing fixture pattern in scripts/harness-pull/tests/fixtures.ts" |

ecosystem 내 매핑: `multi-review` / `ralph-loop` / `generate-review` 의 task 단위가 이 정합. 사용자가 task 정의 시 본 canon 1.1 의 "self-sufficient 검증" 단계를 거친다.

### 1.2 Hybrid approach — vibe vs rigor

상황에 따라 검증 강도를 다르게.

**vibe 범주** (낮은 검증 강도, 빠른 iteration):
- 새 페이지 prototype (`page-builder` + `design-engineer` 1 패스)
- 내부 도구 / dev script
- prompt experimentation
- MVP 데모

**rigor 범주** (높은 검증 강도, 정공법 필수):
- 계약 / 스키마 변경 (`contract-builder` + `multi-review` + `schema-impact` + `ralph-loop`)
- 마이그레이션 (`migrations-auditor` + `release-gate`)
- 인증 / 결제 / SSO (`security-hardener` + `multi-review` + 인간 코드 리뷰)
- 데이터 마이그레이션 / 비가역 destructive 작업

**경계 판단**: 변경의 **롤백 비용** + **사용자 영향 범위** 가 기준. vibe 범주 결과를 rigor 범주에 그대로 commit 하면 통계 (1.7x major / 2.74x 보안) 가 발현된다.

ecosystem 내 매핑: `.claude/rules/fundamentals-first.md` 의 "정공법" 트리거가 곧 rigor 모드. "실용 모드" 가 vibe 모드.

### 1.3 Workflow — Prompt → Generate → Review → Feedback → Iterate

agentic engineering 의 5-단계 표준 워크플로우. modfolio 의 이미 운영 중인 hook + skill 시스템에 매핑된다.

| 단계 | 책임 | modfolio 매핑 |
|---|---|---|
| **Prompt** (Human) | task 정의 + atomic 분해 | `/plan` slash command, `.claude/plans/*.md` 작성 |
| **Generate** (AI) | 코드/문서 생성 | `ralph-loop` skill, `page-builder` / `contract-builder` / `schema-builder` agent |
| **Review** (Human + AI) | 다층 검증 | `multi-review` (3-4 agent 병렬) + Stop hook (haiku quality gate) + 인간 코드 리뷰 |
| **Feedback** (Human) | 결과 평가 + 다음 prompt 정제 | `stop-feedback-log` hook, `feedback-collect` skill |
| **Iterate** | 다음 cycle 준비 | `journal` skill, `retro` skill, `pattern-digest` |

각 단계는 **이전 단계 산출물의 untrusted 가정** 이 디폴트. 즉 Generate → Review 사이에 자동 검증 (Stop hook), Review → Feedback 사이에 인간 판단, Feedback → Iterate 사이에 retro 가 끼어든다.

### 1.4 Untrusted code 가정

모든 AI 생성 코드는 **unreviewed 상태에서는 untrusted** 로 간주한다. 1.7x major / 2.74x 보안 통계는 이 가정의 수치적 근거.

ecosystem 내 untrusted 가정의 실 구현:

| 검증 레이어 | 위치 | 무엇을 막는가 |
|---|---|---|
| `pre-commit-guard.ts` | `scripts/hooks/` | `@ts-ignore`, `as any`, `biome-ignore` 우회 패턴 |
| `pre-destructive-guard.ts` | `scripts/hooks/` | `rm -rf`, `git reset --hard`, `--force` 등 비가역 명령 |
| Stop hook (haiku agent) | `.claude/settings.json` | 하드코딩 색상/시크릿/`@ts-ignore` + animation w/o `prefers-reduced-motion` |
| `stop-pattern-history.ts` | `scripts/hooks/` | 슬롭 패턴 5종 (hallucinated import / cross-language leak / removed safety check 등) |
| `multi-review` skill (3-4 agent) | `.claude/skills/multi-review/` | 디자인 / 접근성 / 아키텍처 / **보안** (D-1 추가) |
| `code-reviewer` agent (Opus 4.7 [1m]) | `.claude/agents/` | 대형 diff 의 의미적 검토 |

**원칙**: 이 레이어들 중 **하나라도 우회** 하면 untrusted 가정 위반. `--no-verify` / `git commit --amend --no-verify` 등은 정공법 위반 (`.claude/rules/fundamentals-first.md`).

### 1.5 Evidence over assertion

`.claude/rules/agent-evidence.md` 의 핵심 — agent 가 사실 주장 시 **명령 실행 결과** 를 근거로 삼는다. "X는 없음 / 0개 감지 / 구현 안 됨" 같은 절대 진술을 grep/Read 없이 단정 X.

agentic engineering 의 자연스러운 귀결: AI 가 "확인했다" 고 말하지만 실제로는 hallucinate 한 사례를 막는다. 우리는 이 룰을 2026-04-16 gistcore 피드백 (Issue #2) 후 도입했고, 본 canon 의 일부로 격상한다.

## 2. ecosystem 내 활용 매핑

### 2.1 Skill ↔ Agentic engineering 매핑

| Skill | Agentic engineering 단계 | rigor 레벨 |
|---|---|---|
| `/plan` (Plan mode) | Prompt | 항상 |
| `/modfolio` | **메타 진단 — 4 단계 전체 자가 점검** (v2.14.0 신설) | rigor (찜찜할 때 막 돌리기) |
| `/ralph-loop` | Generate + Iterate (반복) | rigor (자율 반복) |
| `/multi-review` | Review (다층) | rigor |
| `/generate-review` | Generate → Review 통합 | hybrid |
| `/fix` | Review → 수정 | rigor (P0/P1) |
| `/security-scan` | Review (보안 전담) | rigor |
| `/feedback-collect` / `/feedback-send` | Feedback | hybrid |
| `/journal` / `/retro` | Iterate (학습) | hybrid |

`/modfolio` 는 다른 skill 의 메타 — 전체 워크플로우 (Prompt → Generate → Review → Feedback → Iterate) 가 ecosystem 의 17 agent + 38 skill + 12 hook + 44 canon 시스템에서 제대로 운영되고 있는지 14 트랙으로 점검. plan mode 안에서 호출 시 Action Preview 가 plan 자동 작성 — 사용자가 ExitPlanMode 만 누르면 1-click 실행.

### 2.2 Agent effort 정책 매핑

`knowledge/canon/opus-4-7-effort-policy.md` 의 effort 분포가 곧 agentic engineering 의 검증 강도 분포:

- **max** (9 agent): rigor 작업 — design / 코딩 / contract / schema 생성
- **xhigh** (5 agent): rigor 검토 — code-reviewer / design-critic / architecture-sentinel / accessibility-auditor / security-hardener
- **high** (4 agent): hybrid — test-builder / visual-qa / ecosystem-auditor / migrations-auditor
- **medium** (2 agent): vibe — knowledge-searcher / innovation-scout (탐색)
- **Stop hook (haiku)**: 매 turn 종료 시 빠른 sweep

### 2.3 Hook 의 untrusted 검증 chain

```
Prompt
  ↓
[Generate (AI agent)]
  ↓
PreToolUse hooks ─────→ pre-destructive-guard / pre-commit-guard / pre-gh-api-guard
  ↓
[Tool 실행 (Edit/Write/Bash)]
  ↓
PostToolUse hooks ────→ post-biome-check / post-contract-touch
  ↓
PreCompact hook ──────→ draft 손실 방지 (.claude/plans/*.md / journal/*.md unstaged 시 차단)
  ↓
Stop hook (haiku) ────→ 하드코딩 / 우회 패턴 sweep
  ↓
SessionEnd ───────────→ OTLP metric / pattern history / feedback log
```

각 단계는 **이전 산출물의 untrusted 가정** + **현장 검증** 의 두 정공법.

## 3. 운영 가이드

### 3.1 Task 시작 전 체크

1. atomic 한가? (1.1)
2. vibe / rigor 어느 쪽인가? (1.2)
3. 어떤 skill 시퀀스가 적합한가? (2.1)
4. effort 레벨이 task 강도에 맞는가? (2.2)

### 3.2 Task 진행 중 신호

- ralph-loop 가 N=3 이상 무한 루프 → atomic 분해 부족 (1.1 위반). task 재정의 필요.
- multi-review 결과 P0/P1 다수 → 정공법으로 fix → ralph-loop 재진입
- Stop hook block → 우회 시도 X. **원인 수정**
- agent 가 "확인했다" 만 말하고 grep 결과 인용 없음 → agent-evidence 룰 위반 (1.5)

### 3.3 Task 종료 후

- journal entry: 결정 + 근거 + 편차 기록
- feedback-log: 다음 cycle 의 Prompt 정제 재료
- retro: 패턴 추출 (주간/월간)

## 4. 회피 (Anti-patterns)

| 패턴 | 왜 위험한가 | 대신 |
|---|---|---|
| AI 출력 그대로 commit | 1.7x major / 2.74x 보안 통계 | multi-review + Stop hook |
| `--no-verify` 우회 | 정공법 위반, 우회는 production 에서 재발 | hook block 의 원인 수정 |
| "빠른 한 수" 로 정공법 대체 | 단기 fix 가 영구 debt | rigor 모드 진입, 시간 더 투자 |
| AI 의 "확인했다" 신뢰 | hallucination 위험 | grep / Read / 명령 결과 인용 요구 |
| vibe 결과를 rigor 영역에 사용 | 계약 / 스키마 / 보안에서 발현 | hybrid 경계 (1.2) 명시 |
| 거대 prompt + 거대 PR | 리뷰 불가능 + 회귀 위험 | atomic 분해 + 작은 PR |

## 5. 출처 + 갱신 정책

### 출처
- Karpathy 2026-02 vibe-coding 종언 선언
- NxCode 2026 — Agentic Engineering: The Complete Guide
- CodeRabbit 2025.12 AI code review statistics
- Modfolio harness v2.10-v2.13 운영 실측 (multi-review / ralph-loop / Stop hook 효과)
- 본 ecosystem 의 기존 정공법 룰 — `.claude/rules/fundamentals-first.md`, `agent-evidence.md`

### 갱신 정책
- 분기별 통계 업데이트 (CodeRabbit 등 신규 발표 시)
- 새 skill / agent 추가 시 2.1 / 2.2 매핑 표 갱신
- antipattern 발견 시 4 섹션 즉시 추가

## 6. 관련 canon

- `knowledge/canon/evergreen-principle.md` — Hub-not-enforcer, pull-based
- `knowledge/canon/opus-4-7-effort-policy.md` — effort 분포 정책
- `knowledge/canon/anti-slop.md` — AI 슬롭 패턴 회피
- `.claude/rules/fundamentals-first.md` — 정공법 5 원칙
- `.claude/rules/agent-evidence.md` — 증거 기반 주장
- `knowledge/canon/tech-trends-2026-04.md` — 4월 트렌드 스냅샷 (본 canon 의 시점 근거)
