---
title: Harness Adoption Guide — v2.33.0 적용 + 자동 픽업 자동화
version: 1.0.0
last_updated: 2026-05-13
source: [v2.33.0 dogfood — /harness-evolve v2.0 + 10 Adopt P0/P1 cement, CHANGELOG.md v2.33.0]
sync_to_siblings: true
applicability: always
consumers: [harness-pull, preflight, initializer, modfolio, session-handoff]
---

# Harness Adoption Guide — v2.33.0

ecosystem 이 발행한 신 자산을 **sibling 이 다음 세션 열 때 알아서 픽업하도록** 만드는 표준. sibling 에서 `bunx modfolio-harness-pull --apply` 호출 후 본 canon 의 적용 step 따르면 즉시 최신 방식 개발 가능.

## v2.33.0 변경 요약 (한 줄 1줄)

`/harness-evolve` v2.0 (Phase 2 retrospective + Phase 4 synthesize script + Lethal Trifecta governance) + 10 Adopt P0/P1 cement (OTel GenAI semconv / DO auto-tracing / Queues metrics / D1 PRAGMA / `/goal` command / claude-progress.txt + initializer / xhigh effort recalibration / Lethal Trifecta / OpenInference Claude SDK Trial / Memory tool L3 Trial).

## 자동 픽업 메커니즘 (3중 자동화)

### 1. SessionStart hook 자동 셋업 (권장, opt-in marker 방식)

**가장 깔끔한 방법** — sibling 의 `.claude/harness-lock.json` 에 1 줄 marker 추가:

```jsonc
{
  "lockedPaths": [],
  "enableSessionPickup": true
}
```

이후 `bunx modfolio-harness-pull --apply` 호출 시 harness-pull 가 sibling 의 `.claude/settings.json` 에 SessionStart hook 자동 주입 (`scripts/hooks/session-start-pickup.ts` 호출).

작동:
- sibling repo 진입 시 자동 실행 (Claude Code 세션 시작 시점)
- ecosystem 측 inbox 메시지 (`feedback/<repo>/inbox/*.md`) 최근 entries 표시
- installed harness 버전 vs `ecosystem.harnessLatest` 격차 표시
- `bunx modfolio-harness-pull --dry-run` 권고
- non-modfolio repo 는 silent skip

**Hub-not-enforcer 정합**: marker 없으면 hook 주입 X. sibling owner 명시 opt-in 시만.

### 1-alt. 사용자 host-level 셋업 (모든 repo 일괄)

22 sibling 모두 marker 추가 대신, 사용자 `~/.claude/settings.json` (user-level, project 무관) 에 한 번 셋업:

```jsonc
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "test -f package.json && grep -q '@modfolio/harness' package.json && bunx modfolio-harness-pull --dry-run 2>/dev/null | head -30 || true"
          }
        ]
      }
    ]
  }
}
```

작동 동일. marker 방식과 차이: marker 는 sibling 별 명시 opt-in (Hub-not-enforcer 더 강), host-level 은 사용자 한 번 셋업 (모든 modfolio repo 일괄).

권고: marker 방식 우선 (sibling owner 결정 명시), 사용자 host-level 은 보완.

### 2. `bunx modfolio-harness-pull --apply` — 변경 적용

SessionStart hook 가 변경 사항 보고 → 사용자가 검토 → 적용 결정:

```bash
bunx modfolio-harness-pull --dry-run   # 변경 사항 확인
bunx modfolio-harness-pull --apply     # 적용
```

자동 동기 자산:
- 6 canon (`sync_to_siblings: true`): observability v1.6, attention-budget v1.1, opus-4-7-effort-policy v1.1, agentic-engineering, long-running-harness, harness-adoption-guide
- 신 rule: `.claude/rules/lethal-trifecta.md` + `lethal-trifecta-allowlist.json` (skeleton)
- 신 agent: `.claude/agents/initializer.md`
- 5 skill SKILL.md 갱신: release, audit, ralph-loop, session-handoff, security-scan, migration
- 6 agent frontmatter 변경 (sibling 측 동일 agent 있으면): page-builder / component-builder / api-builder / schema-builder / contract-builder / quality-fixer → xhigh

### 3. `/initialize` 또는 자동 initializer agent — cold-start 픽업

세션 시작 직후:

```
/initialize
```

응답 (3-line):
```
Last session: <YYYY-MM-DD> · <last action>
Next step: <one-line> (plan: <plan-path or "none">)
Blocked: <or "none">
```

`claude-progress.txt` 가 있으면 multi-session task 의 진행 상황 자동 복원. 부재 시 git log + recent plans 로 fallback.

initializer agent 는 read-only (Haiku, disallowedTools: Edit/Write/Bash) — 정보 수집만 하고 결정은 main thread.

## sibling 별 적용 step (Hub-not-enforcer)

### 즉시 적용 가능 (sibling 결정 0, harness-pull 만으로 완료)

- **canon 갱신**: `knowledge/canon/*.md` 자동 sync — 별도 action 0
- **신 rule lethal-trifecta**: governance check 가 ecosystem 의 `/modfolio` 또는 `bun run scripts/modfolio/check.ts` 호출 시 자동 작동
- **신 agent initializer**: `/initialize` 호출 시 즉시 사용 가능
- **신 skill 가이드**: SKILL.md 갱신 자동 — 다음 skill 호출 시 신 내용 반영

### sibling owner 결정 후 적용

#### A. DO/Worker auto-tracing (CF observability v2)

조건:
- sibling 이 Cloudflare Workers + Durable Object / service binding / Queue 사용
- 통합 trace 가치 (debugging / latency 분석 / cost attribution)

step:
1. `wrangler.jsonc` 의 `compatibility_date` 확인 — `>= 2026-05-07`
2. `wrangler.jsonc.observability` 추가:
   ```jsonc
   "observability": {
     "enabled": true,
     "head_sampling_rate": 1.0    // dev 는 0.1 권장
   }
   ```
3. `wrangler deploy` → CF Trace dashboard 에서 통합 trace 확인

#### B. D1 PRAGMA optimize finalize

조건: sibling 이 D1 사용 + schema migration 수행

step:
1. migration script 의 마지막에 추가:
   ```bash
   wrangler d1 migrations apply <db-name> --remote
   bunx modfolio-migrate-finalize <db-binding> --remote
   ```
2. 또는 `package.json.scripts.db:migrate` 에 chaining: `"db:migrate": "wrangler d1 migrations apply X --remote && bunx modfolio-migrate-finalize X --remote"`

#### C. Lethal Trifecta governance — 위반 발견 시

조건: `/modfolio` 또는 `bun run scripts/modfolio/check.ts` 호출 시 `agentic-governance/asi-lethal-trifecta` warning 발견

step (각 위반에 1 회 선택):
1. **명시 human-approval**: 위반 file 의 frontmatter 에 `human_approval_required: true` 추가
2. **trifecta 끊기**: 3 조건 중 하나 제거 (sandbox 모드)
3. **allowlist 등록**: `.claude/rules/lethal-trifecta-allowlist.json` 에 entry 추가 (justification + revisit_after 강제)

#### D. xhigh effort — sibling 측 agent 측에서 자동 동기

조건: sibling 이 `.claude/agents/{page-builder,component-builder,...}.md` 보유

step:
- `harness-pull --apply` 가 자동 동기 — 별도 action 0
- A/B 비교 원하면 30일간 quality 회귀 모니터링 (canon `opus-4-7-effort-policy.md` v1.1 § "A/B 검증 정책")

#### E. /goal command 활용

조건: Claude Code v2.x+ 사용 + verifiable end-state 작업 (예: tests green, audit 정합성 100%)

step:
- 즉시 사용 가능 — `/goal <조건>` 으로 자율 반복 진입
- 책임 분리 (canon `agentic-engineering.md` § 2.1): `/loop` (시간 driven) vs `/goal` (binary end-state)

#### F. claude-progress.txt 패턴 — long-running task 가 있다면

조건: 1 세션 안에 안 끝나는 task (마이그, 대형 refactor, multi-phase plan)

step:
1. task root 에 `claude-progress.txt` 생성:
   ```
   # Task: <one-line>
   # Started: YYYY-MM-DD

   ## YYYY-MM-DD (Session 1)
   - Decision: ...
   - Done: ...
   - Next: ...
   - Blocked: ...
   ```
2. 매 session 종료 시 `session-handoff` skill 가 자동 append
3. 다음 session 시작 시 `/initialize` 가 자동 read

#### G. Memory tool L3 Trial (선택)

조건: ralph-loop / generate-review 같은 long-running skill 사용 + token saving 측정 의향

step:
1. `.claude/memory/{agent-name}/` 디렉토리 생성 (gitignore 확인)
2. ralph-loop 호출 시 memory tool option 활성
3. `bun run scripts/budget/cache-hit-report.ts --memory-tool` 로 saving 측정
4. canon `attention-budget.md` v1.1 § L3 의 판단 매트릭스에 따라 cement/skip

#### H. OpenInference Claude SDK (선택, 1 sibling spike)

조건: sibling 이 Anthropic SDK 직접 호출 (예: AI gateway, modfolio-connect, ai-patterns 사용처)

step: `~/.claude/plans/20260513-evolve-openinference-claude-sdk.md` 의 Stage A-D 따름

## 정공법 정합

- **1원칙 (근본 수정)**: 자동 픽업 메커니즘 자체를 cement — 매번 사용자가 수동 확인 부담 X
- **3원칙 (장기 시야)**: SessionStart hook 한 번 셋업 → 22 sibling 모두 작동
- **5원칙 (리소스 투자)**: hook 셋업 1 회 비용 → 매 세션 cold-start 비용 절감 누적

## 안전 가드

- SessionStart hook 은 dry-run 만 — 실 변경 X (사용자가 별도 `--apply` 호출)
- harness-pull 가 sibling 의 `.claude/harness-lock.json` path 잠금 존중
- `settings.local.json` 절대 안 건드림
- `wrangler.jsonc`, `biome.json` 등 sibling identity 파일 read-only

## Sibling 별 자율 결정

각 sibling owner 가 자기 시점에 채택. ecosystem 은:
- ✅ 권고 (본 canon + adoption-guide)
- ✅ 표준 (canon / rule / agent / skill)
- ✅ 가이드 (per-sibling 적용 step 명시)
- ❌ 강제 (Hub-not-enforcer)
- ❌ 자동 PR (sibling 결정 도용)

## 측정 (다음 monthly review)

- 22 sibling 의 v2.33.0 채택률 — `/modfolio` 의 ecosystem-rollup 트랙 (자동 추적)
- 신 canon (long-running-harness, attention-budget v1.1) sibling 흡수율 — `bun run audit:delta`
- Lethal Trifecta 발견 + 해결 — sibling 측 `/security-scan` 호출 결과

## 관련

- canon `evergreen-principle.md` — Hub-not-enforcer 원칙
- canon `long-running-harness.md` — claude-progress.txt + initializer 정합
- canon `observability.md` v1.6 — DO trace + GenAI agent-spans + Queues + D1
- skill `harness-pull` — sync 메커니즘
- skill `preflight` — 세션 시작 점검 (SessionStart hook 보완)
- agent `initializer` — cold-start 3-line summary
- 외부: [Anthropic Engineering — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
