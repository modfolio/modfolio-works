---
name: modfolio
description: 종결급 진단·계획 메타 skill. 14 트랙 병렬 진단 → Smart Triage → plan 자동 작성 (plan mode 안). 작업 중 찜찜할 때 막 돌려도 안전한 단일 진입점
effort: xhigh
user-invocable: true
---

# /modfolio — 종결급 진단·계획 메타 skill

ecosystem 의 38 skill + 20 agent + 12 hook + 44 canon 시스템이 제대로 활용되고 있는지 한 번에 점검하는 단일 진입점. **작업 중 찜찜할 때 막 돌려도 안전.**

## 워크플로우

### plan mode 안에서 호출 (정공법, Action Preview 활성)

```
사용자: plan mode 진입 → /modfolio
  ↓
14 트랙 병렬 진단 (5-10분)
  ↓
Smart Triage 로 P0/P1/P2/P3 우선순위 + dependency graph
  ↓
plan 파일 자동 갱신 (진단 + 수정 절차)
  ↓
사용자 검토 + 편집 (다듬기 단계)
  ↓
ExitPlanMode → 자동 실행 (분할 commit 까지)
```

### plan mode 밖에서 호출 (보고만)

```
사용자: /modfolio
  ↓
14 트랙 진단
  ↓
콘솔 보고서 (압축 형태)
  ↓
"plan mode 진입 후 다시 호출하면 자동 plan 작성" 안내
```

## 14 진단 트랙

### 기본 7 (위치 모드 공통)

1. **harness-coherence** — 채택 버전 vs `ecosystem.harnessLatest`
2. **knowledge-coverage** — canon 적용 (always 우선) + MEMORY.md
3. **skill-agent** — `.claude/{skills,agents}` frontmatter + 권고 정합
4. **stack-evergreen** — Bun/TS/Biome/Zod/wrangler 버전
5. **effort-policy** — `CLAUDE_CODE_EFFORT_LEVEL=max` + agent effort 분포
6. **feedback-cycle** — 마지막 send 시점 + pending 변경
7. **secrets-ops** — athsra `<repo>` 등록 + `.gitignore` 정합 + 평문 `.env` 부재 (canon `secret-store.md` v1.13+)

### 추가 7

8. **temporal** — 지난 report 비교, regression 감지, 격차 나이
9. **smart-triage** — dependency graph + Next Best Action
10. **action-preview** — plan 파일 자동 작성 (plan mode 안에서만 활성)
11. **meta-diagnosis** — Langfuse cache hit, agent effort 분포 (toolkit 가동 시만)
12. **external-signal** — CF 배포, bun outdated, gh issue/PR (GH Actions 제외)
13. **ecosystem-rollup** — 22 sibling 채택률 + 가장 뒤쳐진 repo (ecosystem 모드)
14. **hook-integration** — SessionEnd 자동 호출, 24h 미실행 알림

### 추가 트랙 (canon `attention-budget.md` v1.0+ 기반)

15. **context-budget** — agent system prompt 평균 길이 / cache_control 적용률 / canon 누적 read 패턴. 정공법 3원칙 ("장기 시야") 의 정량 측정.
    - 측정: `cache_control 적용률` (현 0/20 = P0 위반) / `agent prompt 평균 token` / `canon 분할 권장` (5KB+ canon)
    - 권장 한계 (canon `attention-budget.md` § "측정 메트릭"):
      - cache hit rate > 50% (장시간) / > 80% (multi-agent reuse)
      - agent prompt < 5K (작은 agent) / < 15K (전문 agent)
      - canon < 5 회 read/세션 (초과 시 분할 또는 cache)
    - 위반 발견 시 → P0 plan 자동 작성 (plan mode 안)
    - 측정 도구: `scripts/evolve/diagnose-current.ts` 의 `cache_control` 적용률 (Phase 2 별도 plan 으로 `scripts/budget/*` 추가)

## 위치 감지

```
package.json.name == "@modfolio/harness"        → ecosystem 모드 (관제탑 점검)
.npmrc 에 @modfolio:registry + harness devDep   → sibling 모드 (채택 점검)
neither                                         → 경고 + 비활성
```

## 실행 방법

```bash
# 기본 — 14 트랙 전부 (5-10분)
bun run modfolio

# 빠른 점검 — 핵심 5 트랙만 (1-2분)
bun run modfolio -- --quick

# Plan mode 안에서 — 자동 plan 작성
# (Claude Code 의 plan mode 진입 후 /modfolio 호출)

# 특정 시점 대비 회귀만
bun run modfolio -- --since=HEAD~5

# Langfuse 호출 skip (오프라인)
bun run modfolio -- --no-meta

# 기계 가독 출력
bun run modfolio -- --json
```

ecosystem · sibling 양쪽 모두 동일. v2.14.4+ 에서 sibling 의 `package.json.scripts.modfolio` 가 `harness-pull` 시 자동 등록 (idempotent — 이미 있으면 보존). v2.14.3 이하 sibling 또는 수동 제거 시 직접 binary 호출:

```bash
# 직접 binary (sibling 의 @modfolio/harness devDep)
bunx modfolio-check
```

## 산출물

- 콘솔 보고서 (압축, 색상 only TTY)
- `.modfolio-report.json` (gitignore, 기계 가독)
- `.modfolio-history/<timestamp>.json` (Temporal 비교, 30일 보관)
- `.claude/plans/<active>.md` 갱신 (plan mode 안에서 호출 시)

## 안전 가드

- **read-only 진단 기본** — 어떤 파일도 자동 수정 X
- **외부 영향 작업 자동 X** — feedback-send / harness-pull --apply / git push / publish 모두 사용자 명시
- **plan mode 자체가 false positive 가드** — 사용자가 plan 편집 단계에서 거름
- **GH Actions 제외** — CF 직결 빌드 정책 (사용량/복잡도 회피)

## 출력 예시

```
/modfolio Report — modfolio-pay (sibling) — 2026-04-26 14:32
   harness=2.12.0 → ecosystem.harnessLatest=2.13.0
   prior report: 2026-04-22 (4 days ago)

  [ OK ]  하네스 정합성              (45ms)
  [WARN]  지식 활용                  (120ms)
         [INFO] 3/24 always canon 미수신 (sibling)
  [WARN]  Skill·Agent 활용           (200ms)
         [INFO] 4개 skill 의 effort: xhigh frontmatter 누락
  ...

[NEW since last report] (2)
  [P1] 하네스 정합성 — v2.13.0 publish 미수신
  [P2] agentic-engineering canon 미수신

[NEXT BEST ACTION] (시간 예산 30분)
  [P1] @modfolio/harness@2.12.0 → ecosystem.harnessLatest=2.13.0
  -> bunx modfolio-harness-pull --dry-run && bunx modfolio-harness-pull --apply
     예상: 8분 / 3000 토큰 / 함께 해소 2건

[Action Preview] plan mode 밖에서 호출됨 — Action Preview 비활성
```

## 관련 canon

- [agentic-engineering.md](../../../knowledge/canon/agentic-engineering.md) — 본 skill 의 메타 frame. §2.3 untrusted-verification chain 의 자가 점검 인프라.
- [evergreen-principle.md](../../../knowledge/canon/evergreen-principle.md) — Hub-not-enforcer (외부 영향 작업 자동 X 의 근거).

## 언제 사용?

- **세션 시작 시**: 직전 사이클 이후 환경 정합 확인
- **작업 중 찜찜할 때**: 막 돌려서 즉시 진단
- **PR 직전**: 권고 사항 모두 흡수했는지 확인
- **주 1회 정기 점검**: ecosystem rollup 으로 22 sibling 추적
- **Plan 짜기 전**: 다음 cycle 의 P0/P1 식별
