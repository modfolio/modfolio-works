---
title: Eval Patterns — 6-Layer Test Stack + LLM-Judge
version: 1.0.0
last_updated: 2026-04-17
source: [Atlan 6-layer guide, Braintrust/Langfuse 2026, Harness v2.4 Phase 3]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [preflight]
---

<!--
agent 품질 자동 평가 레이어 부재. 이 canon은 우리 하네스가 채택한 6-layer eval stack + LLM-judge
패턴을 명시한다. 실제 도구는 Langfuse self-host (Phase 4 Tier 1).
-->

# Eval Patterns — 6-Layer Test Stack

AI 시스템(우리 하네스 + 앱 내 AI 기능) 품질을 분리 계층으로 평가한다. 한 층이 무너져도 다른 층이 잡을 수 있다.

---

## Layer 0 — Data Foundation

Eval 결과를 신뢰하려면 먼저 데이터가 깨끗해야 한다.

- Fixture/golden dataset이 stable한가? (`tests/fixtures/*.json` + `contracts/` Zod 검증)
- 시드 데이터가 reproducible한가?
- PII가 dataset에 없는가?

**도구**: 우리는 `contracts/` Zod 스키마를 fixture 검증에 직접 사용. mock-server (Tier 1) 가 자동 생성.

## Layer 1 — Unit

특정 함수/에이전트 프롬프트의 개별 입출력 검증.

- Vitest + Bun test (각 레포의 기본 test runner)
- Agent system prompt를 snapshot으로 보존 (drift 감지)

**기준**: 커버리지 ≥ 60% on critical path.

## Layer 2 — Integration (Multi-step)

여러 에이전트/스킬이 이어지는 워크플로우의 end-to-end:

- `harness-pull` 전체 + 각 phase
- `component` → `code-reviewer` → `quality-fixer` 파이프라인
- `design-engineer` → `page-builder` → `visual-qa`

**도구**: Langfuse (self-host Tier 1) — session 단위로 묶은 trace 수집 + golden run 비교.

## Layer 3 — E2E 시뮬레이션

실제 사용자 시나리오 재현.

- 22 repo의 critical path: 로그인(SSO) → 메인 feature 사용 → 로그아웃
- modfolio-pay 결제 flow (Toss 테스트 키)
- gistcore 학습 세션 (실제 TTS 호출)

**도구**: Playwright/Vitest + Langfuse trace. 자동화는 n8n modfolio 템플릿 (Tier 1).

## Layer 4 — Adversarial / Red Team

의도적 악성 입력에 대한 저항성.

- Prompt injection (우리 agent 시스템 프롬프트 탈취 시도)
- SQL injection (drizzle 쿼리)
- XSS (사용자 입력 렌더링)

**도구**: Promptfoo (Phase 7 Trial). `security-hardener` agent의 스캔 리스트.

## Layer 5 — Production CI/CD Regression

배포 직전 gate + 배포 후 모니터링.

- `bun run quality:all` (check + typecheck + test:harness + neutral-framing + audit)
- CF Workers 배포 후 1시간 Langfuse error rate 관측
- `scripts/hooks/stop-pattern-history.ts` ESCALATE 감지

**우리 기본 gate 순서**:
1. pre-commit: biome + typecheck + ts_ignore_or_any 스캔 (block 모드 시)
2. PR: quality:all 완주 + 22 harness-pull dry-run
3. 배포 후: Langfuse error rate + Airtable Pattern History

## LLM-as-Judge 패턴

특정 agent 출력의 "품질"을 자동 평가할 때:

```
입력: agent 호출 결과 (예: code-reviewer의 리뷰 리포트)
judge: Claude Haiku 4.5 (medium effort)
rubric:
  - 1-5 scale
  - 항목: 정확성, 구체성, 실행 가능성, 근거 인용, 톤
output: JSON {scores: {...}, avg: number, critique: string}
```

Langfuse의 `evaluations` 기능으로 기록. 일정 샘플(5-10%) 자동 judge → 평균이 점진적 drift 감지.

**주의**: LLM-judge 자체의 편향. 같은 모델 계열 judge는 생성자와 동일한 맹점을 가질 수 있음 → 가끔 사람 샘플 검토 필수.

## 회귀 방지 체크리스트

새 agent 추가 시:
- [ ] Layer 1: 대표 입력 3개 unit test
- [ ] Layer 2: 실제 skill과의 integration test 최소 1개
- [ ] Layer 3: 하나의 실제 시나리오 기반 trace
- [ ] Langfuse dataset에 golden run 저장

## 관련

- [cost-attribution.md](cost-attribution.md) — quality / cost 메트릭
- [observability.md](observability.md) — trace 수집 기반
- [local-dev-infra.md](local-dev-infra.md) — Langfuse self-host
- [incident-response.md](incident-response.md) — 품질 회귀 incident 절차

## 갱신 이력

- 2026-04-17: v1.0.0 초판. 6-layer eval stack + LLM-judge 패턴 명문화. Langfuse/Promptfoo 역할 매핑.
