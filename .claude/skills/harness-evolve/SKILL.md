---
name: harness-evolve
description: universe 차원 트렌드 진단 + 도입 제안 + plan 작성. 내부 진단 → retrospective → 3-agent 병렬 WebSearch → script 기반 synthesize (가산 score + URL HEAD + anti-cheating + sibling-adoption + cost ledger) → AskUserQuestion 게이트 3중 → plan + canon. 권고만, 자동 도입 X. 단축어 /evolve. v2.0 (2026-05-13) — Phase 2 retrospective + Phase 4 synthesize script 추가.
user-invocable: true
---

# /harness-evolve — universe 트렌드 진단 + 도입 제안

modfolio universe 의 하네스/기술 스택을 **현 시점 (call 시 명시)** 기준으로 진단하고, 외부 트렌드를 3-agent 병렬 WebSearch 로 수집해 도입 후보를 가산식 score + 4-tier 분류 + plan 파일로 출력. **권고만 — 자동 도입 절대 X.** 정공법 + Hub-not-enforcer 정합.

**v2.0 변경 요약 (2026-05-13)**:
- Phase 2 신규: Retrospective layer (이전 권고의 verified/unverified 자동 추적 + skip registry).
- Phase 4 신규 script (`synthesize.ts`): 가산식 score + URL HEAD 검증 + anti-cheating filter + sibling-adoption 매트릭스 + cost ledger.
- score 식 변경 (5-dim 곱셈식 폐기 → 가산식, score gaming 차단).
- `evolve-skip-registry.md` canon 신설: 영구 Skip 결정의 6-month expiry trigger.

## 언제 사용

- 월 1회 정기 review (`tech-trends-{YYYY-MM}.md` 갱신 주기와 정렬)
- 새 기술 도입 검토 시점 (Anthropic 신 모델 / CF 신 기능 / 신 표준 발표 직후)
- 하네스 자체 강화 ideation (skills/agents/hooks/canon 추가 필요할 때)
- skip 결정의 `revisitAfter` 도래 시 (자동 후보 복귀)

## 언제 사용 X

- per-session 점검 (이건 `/preflight`)
- universe → sibling 표준 sync (이건 `/harness-pull`)
- 14 트랙 현 상태 진단 (이건 `/modfolio`)
- per-PR 코드 품질 검증 (이건 `/multi-review`)

## 사용법

```bash
# 전체 흐름 (Phase 1+2 자동, Phase 3 handoff, Phase 4 는 --resume)
bun run evolve                                       # 기본: --focus all --depth standard
bun run evolve -- --focus methodology                # 영역 좁히기
bun run evolve -- --depth shallow                    # 얕은 검색 (~$0.2/회)
bun run evolve -- --depth deep                       # 깊은 검색 (~$1.5/회)

# 빠른 lookback (WebSearch 0, Phase 1+2 만)
bun run evolve:retrospect

# dry-run (WebSearch 만 skip, Phase 1+2 항상 실행)
bun run evolve:dry-run

# Phase 3 WebSearch 완료 후 input.json 저장했으면
bun run evolve:resume

# offline / CI 환경 (URL HEAD 검증 skip)
bun run evolve -- --no-url-check

# 단축어
/harness-evolve
/evolve
```

### Routine 등록 (선택, Claude Code v2.1.112+)

매월 1일 자동 실행하고 싶으면:

```bash
/schedule create \
  --name "harness-evolve-monthly" \
  --cron "0 9 1 * *" \
  --skill "harness-evolve" \
  --args "--focus all --depth standard"
```

AskUserQuestion 게이트는 routine 모드에서도 유지 (사용자 반응 후 Phase 5 진행).

## 6-Phase 동작 알고리즘 (v2.0)

### Phase 0 — 입력 파싱 + entry guard

`scripts/evolve/run.ts`:
- `isPackagedBundle(process.cwd())` 체크 — node_modules 안에서 호출 시 즉시 abort.
- 위치 감지: `package.json.name === '@modfolio/harness'` 면 ecosystem 모드, 아니면 sibling.
- CLI args: `--focus`, `--depth`, `--time-range`, `--dry-run`, `--no-url-check`, `--retrospect-only`, `--resume`.

### Phase 1 — 내부 진단 (WebSearch 0, ~1초)

`scripts/evolve/diagnose-current.ts` — package.json / .claude/agents / .claude/skills / knowledge/canon / .claude/rules / hooks / ecosystem.json 매핑.

Stage A.2 정렬:
- cache_control TTL 분포 (1h / 5m / unset) — `attention-budget.md` v1.0+ baseline
- agent 본문 byte size (avg / max)
- stability flags (Date.now / uuid / per-session-token — cache invalidate trigger 검출)
- env 캐싱 정책 (`.claude/settings.json` 의 `ENABLE_PROMPT_CACHING_1H`)

출력: 콘솔 표 + `.evolve-state/diagnose-{YYYY-MM-DD}.json` (선택).

### Phase 2 — Retrospective (NEW, WebSearch 0, ~1초)

`scripts/evolve/retrospect.ts` — **이전 권고가 실제 어떻게 됐는가** 를 자동 추적.

- 모든 `knowledge/canon/tech-trends-*.md` parse (archive 포함):
  - 각 항목별 declared status (`✅ Adopt-1`, `Trial-spiked`, `Adopt-1-sketched` 등) 추출
  - category (Adopt P0 / Trial P1 / Trial P2 / Skip) 분류
- 각 항목 cross-check:
  - `~/.claude/plans/*evolve*` glob — 매칭 plan 파일 존재 확인
  - `git log --since=<sourceMonth>-01 --grep=<keywords>` — 실 commit 존재 확인
  - **verified = `impliesExecution(declaredStatus) && (plan ∨ commits)`** (false positive 방지 — Plan agent 권고)
- `evolve-skip-registry.md` parse:
  - 7 + 누적 entry 의 `revisitAfter` 와 `TODAY` 비교 → `overdue` flag
  - **overdue 인 skip 만 Phase 3 prompt 의 후보로 복귀**, 나머지는 "이미 평가 완료, 재검토 X" list 에 포함

출력: 콘솔 표 + `.evolve-state/retrospect-{YYYY-MM-DD}.json`.

`--retrospect-only` 모드면 여기서 종료.

### Phase 3 — 3-agent 병렬 WebSearch (~3-5분, ~$0.2-1.5/회)

`run.ts` 가 handoff prompt 출력 후 정지. 사용자가 메인 LLM 으로 Task fork ×3 실행:

| Agent | 영역 | focus=all 시 검색 키 |
|---|---|---|
| **A** | Anthropic / 모델 | `Claude Code`, `Anthropic`, `Managed Agents`, `Memory Tool`, `Opus 4.x`, `Sonnet 4.x`, `MCP spec`, `Skill marketplace`, `prompt caching` |
| **B** | Cloudflare / 인프라 | `Workers`, `D1`, `R2`, `Workflows`, `Browser Run`, `Code Mode`, `Project Think`, `Containers`, `DO Facets`, `Agents SDK V2` |
| **C** | 개발 패턴 / 방법론 | `context engineering`, `agentic engineering`, `harness engineering`, `AGENTS.md`, `AI eval`, `Braintrust`, `LangSmith`, `OWASP agentic`, `OpenTelemetry GenAI` |

`--focus` 가 좁혀지면 3 agent 가 그 영역의 sub-domain 분담.

**입력 JSON schema 강제** (Zod 검증 — `WebSearchInputSchema`):

```json
{
  "searched_at": "YYYY-MM-DD",
  "depth": "shallow|standard|deep",
  "estimated_cost_usd": 0.5,
  "agents": [
    {
      "id": "A|B|C",
      "candidates": [
        {
          "title": "...",
          "url": "https://anthropic.com/...",
          "category": "Adopt|Trial|Skip",
          "difficulty": "Low|Med|High",
          "one_line": "한 줄 요약",
          "rationale": "도입 사유 (정공법 정합 명시)",
          "value": 1-5,
          "effort": 1-5,
          "risk": 1-5,
          "security_critical": false,
          "sibling_propagation_cost": 1-5,
          "adds_new_canon_or_agent": false,
          "detection": {
            "type": "file|dep",
            "pattern": ".claude/canon/xxx.md  또는  @modfolio/xxx"
          }
        }
      ]
    }
  ]
}
```

`detection` 필드는 sibling-adoption 매트릭스용 — 선택 (생략 시 `measurable: false`).

저장 위치: `.evolve-state/websearch-input.json` → `bun run evolve:resume` 으로 Phase 4 진입.

5분 TTL prompt cache breakpoint 로 동일 일자 재호출 무료.

### Phase 4 — Synthesize (NEW script, ~5초)

`scripts/evolve/synthesize.ts` — 가산식 score + URL HEAD + anti-cheating + cross-check + sibling-adoption + cost ledger 를 한 번에 처리.

**4-1. Anti-cheating filter** (정공법 자동 제외):

후보의 `title + one_line + rationale` 본문에 다음 패턴 발견 시 즉시 `Auto-Skip`:
- `--no-verify`, `as any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, `biome-ignore`, `eslint-disable`, `--no-gpg-sign`, `skip pre-commit hook`

**4-2. URL 검증**:

- 도메인 whitelist (anthropic / cloudflare / opentelemetry / genai.owasp / platform.claude / blog.cloudflare / claudefa / developers.google / npmjs / github / datatracker.ietf / resources.anthropic / www.anthropic) 외 → `unverified-domain`.
- HEAD request, 3s timeout, 1회 retry, 200/3xx 통과 → `verified`. 그 외 → `dead`.
- `--no-url-check` flag 면 모두 `verified` 로 통과.

**4-3. Cross-check 합의**:

동일 URL (trailing slash 정규화) 이 2+ agent 에 등장 → `crossChecked: true`. agent 1개만 추천 → automatic P2 강등.

**4-4. 가산식 score** (5-dim 곱셈식 폐기, Plan agent 권고):

```
base       = value × (6 - effort) / risk                  # range 0.2~25
penalties  = (security_critical_unmet     ? +3 : 0)       # 미커버 영역이면 가산
           + (sibling_propagation_cost≥4  ? -2 : 0)       # 22 sibling 적용 effort 큼
           + (adds_new_canon_or_agent     ? -1 : 0)       # attention budget 패널티
score      = base + penalties
```

**tier cutoff**:
- ≥ 8 → `Adopt P0` (verified + crossChecked 인 경우만)
- 5~7.99 → `Trial P1` (verified + crossChecked 인 경우만)
- 3~4.99 → `Trial P2`
- < 3 → `Skip`
- `urlStatus !== verified` 또는 `crossChecked === false` → 최대 `Trial P2` 까지로 강등

**4-5. Sibling-adoption 매트릭스**:

- `findHostParent(process.cwd())` 로 host sibling layout 검출 (없으면 `measurable: false`).
- `getAllRepos(ecosystemPath, ['modfolio-ecosystem', 'modfolio-universe'])` 로 22 repo 목록.
- 각 repo 의 clone path 에서 `detection.type` 에 따라:
  - `file`: `existsSync(join(clonePath, detection.pattern))`
  - `dep`: `package.json.{dependencies,devDependencies}[detection.pattern]` 존재
- **denominator = cloned repos** (Plan agent 권고. clone 안 된 repo 는 분모에서 제외).
- 출력: `{ adopted: string[], pending: string[], total: number, rate: 0-1 }`.

**4-6. Cost ledger**:

`.evolve-state/cost-ledger.jsonl` append (JSONL):
- 각 evolve 호출당 1 entry: `{ timestamp, searchedAt, depth, estCostUsd, candidateCount }`.
- `cumulativeUsd` 는 ledger 전체 합산해서 출력 meta 에 표시 — 누적 비용 attribution.

출력: 콘솔 표 + `.evolve-state/candidates-{YYYY-MM-DD}.json`.

### Phase 5 — AskUserQuestion 게이트 ×3

메인 LLM 이 candidates JSON 보고 사용자에게:

- **Q1 (multiSelect)**: "어느 항목들을 plan 으로 작성할까요?" (Adopt P0 + Trial P1 만 표시)
- **Q2 (single)**: "Plan detail level?" (shallow / standard / deep)
- **Q3 (single, ecosystem 모드만)**: "tech-trends-{YYYY-MM}.md 갱신 방식?" (append-current / new-month)

추가: Phase 2 retrospect 의 `overdueSkips > 0` 이면:
- **Q4 (multiSelect)**: "재평가 trigger 도래한 skip 항목 {N}건 — 어떻게 처리?" (재평가 / 6개월 연장 / 영구 매장 X — 항목별)

### Phase 6 — Plan 파일 + canon 갱신 (Gate 2, 3)

#### Gate 2 — plan 파일 작성 (per-item, 사용자 선택분만)

- 위치: `~/.claude/plans/{YYYY-MM-DD}-evolve-{topic}.md`.
- 포맷: `/plan` skill 표준 (Product Lens + Scope + Implementation Steps + Verification + Rollback).
- frontmatter 자동 추가:
  ```yaml
  ---
  source_evolve_run: YYYY-MM-DD
  search_time: YYYY-MM-DD
  expiry: YYYY-MM-DD            # +6 weeks (Plan agent 권고)
  ---
  ```

#### Gate 3 — canon 갱신 (modfolio-ecosystem 모드만)

- `knowledge/canon/tech-trends-{YYYY-MM}.md` 신규 생성 또는 append.
- archive 패턴: 이전 월 파일 → `knowledge/canon/archive/`.
- skip 항목 추가/연장 시 `knowledge/canon/evolve-skip-registry.md` entry 업데이트.

sibling 모드: canon 갱신 X, "modfolio-ecosystem 에서 PR raise 권고" 메시지.

## 산출물

| 산출물 | 위치 | mutation 게이트 |
|---|---|---|
| 콘솔 진단 표 | stdout (Phase 1+2+4 마다) | 없음 |
| `.evolve-state/diagnose-{YYYY-MM-DD}.json` | local-only (.gitignore) | 없음 (read-only 진단) |
| `.evolve-state/retrospect-{YYYY-MM-DD}.json` | local-only | 없음 |
| `.evolve-state/websearch-input.json` | local-only | Phase 3 사용자 작성 |
| `.evolve-state/candidates-{YYYY-MM-DD}.json` | local-only | 없음 |
| `.evolve-state/cost-ledger.jsonl` | local-only | append-only |
| `~/.claude/plans/{date}-evolve-{topic}.md` | user-local, sibling 도 가능 | Gate 2 |
| `knowledge/canon/tech-trends-{YYYY-MM}.md` | ecosystem only | Gate 3 |
| `knowledge/canon/evolve-skip-registry.md` | ecosystem only | Gate 3 (또는 Q4 응답 시) |

## 안전장치 (정공법 + Hub-not-enforcer 정합)

| 항목 | 동작 |
|---|---|
| Entry guard | `isPackagedBundle(cwd)` — node_modules 안에서 호출 시 즉시 abort (Plan agent 권고) |
| 자동 도입 금지 | plan 파일까지만 작성. 실 구현은 사용자가 별도 세션에서 plan 보고 진행 |
| WebSearch 출처 강제 | domain whitelist 외부는 cross-check 가산 0 → 최대 Trial P2 (`agent-evidence.md` 정합) |
| URL HEAD 검증 | dead URL 자동 Trial P2 강등 (`--no-url-check` 로 skip 가능) |
| 시점 명문화 | 모든 출력 헤더 + plan frontmatter 에 `searched_at`, `expiry` |
| 정공법 자동 제외 | `--no-verify` / `as any` 류 9 패턴 자동 `Auto-Skip` |
| Cross-check 강제 | 2/3 agent 합의 시만 P0/P1 (단일 추천 자동 P2 강등) |
| Skip 영속성 + expiry | `evolve-skip-registry.md` + 6개월 `revisitAfter` 강제 (자가검열化 방지, Plan agent 권고) |
| canon write 권한 | modfolio-ecosystem 모드만 가능. sibling 은 read-only PR raise 안내 |
| dry-run 정책 | `--dry-run` = WebSearch 만 skip. Phase 1+2 는 항상 실행 (read-only, 비용 0) |
| False positive 방지 | retrospect 의 verified = declared status + (plan ∨ commits) — 합의 못 하면 `unverified` 표기, 자동 결론 X |
| Cost telemetry | 매 호출마다 `cost-ledger.jsonl` append + cumulative 표시 |

## universe-wide 적용 + 권한 분리

| 위치 | 호출 | canon write | plan 작성 | tech-trends 참조 |
|---|---|---|---|---|
| `modfolio-ecosystem` (hub) | ✓ | ✓ | ✓ | ✓ direct |
| sibling repo (예 connect) | ✓ | ✗ (read-only PR) | ✓ 자기 plans | ✓ harness-pull sync |
| 미연결 repo | ✗ (경고) | ✗ | ✗ | ✗ |

## 기존 스킬과 책임 분리

| 스킬 | 책임 | 빈도 | scope |
|---|---|---|---|
| `/preflight` | per-repo Evergreen 관찰 | per-session | per-repo |
| `/harness-pull` | universe → sibling 표준 sync | on-demand | universe → 22 sibling |
| `/modfolio` | 14 트랙 진단 (현 상태 검증) | on-demand | per-repo + ecosystem rollup |
| `/multi-review` | PR 코드 품질 4-agent | per-PR | per-repo |
| **`/harness-evolve`** | **universe 차원 trend 진단 + retrospective + plan** | **monthly** | **universe-wide** |

`/harness-evolve` 가 흡수해선 안 됨 — 각자 고유 scope.

## scope

- 트렌드 진단 + retrospective + plan 파일 작성까지만. 실 구현은 사용자가 plan 보고 별도 세션.
- WebSearch 비용 ~$0.2-1.5/회 — `--dry-run` 또는 `--depth shallow` 로 절감.
- canon 갱신 권한은 modfolio-ecosystem 만 — sibling 은 PR raise.
- sibling-adoption 매트릭스는 host sibling layout 전용 — Dev Container / 미clone 환경은 `measurable: false`.

## 위험 + 완화

| 위험 | 완화 |
|---|---|
| WebSearch 비용/시간 | `--dry-run` / `--depth shallow` / focus 좁히기 / 5분 TTL cache / cost ledger |
| Hallucination | 3-agent cross-check + 출처 URL HEAD + domain whitelist |
| 트렌드 noise (반짝 도입) | 4-tier 분류 + 사용자 게이트 + Trial 명시 + plan 6주 expiry |
| canon 권한 충돌 | 위치 감지로 ecosystem 모드만 write |
| Stale plan 파일 | plan frontmatter 의 `expiry` (6주 후) + tech-trends 월별 갱신 |
| Skip 자가검열化 | `evolve-skip-registry.md` 의 6-month `revisitAfter` 강제 + Phase 2 overdue 자동 부각 |
| Score gaming | 가산식 (5-dim 곱셈식 폐기) — penalties 자명 + range 안정 |
| Bundle 안 실행 | `isPackagedBundle` entry guard |

## 관련 canon / 파일

- `scripts/evolve/diagnose-current.ts` — Phase 1
- `scripts/evolve/retrospect.ts` — Phase 2 (NEW v2.0)
- `scripts/evolve/synthesize.ts` — Phase 4 (NEW v2.0)
- `scripts/evolve/run.ts` — Phase 0 orchestration (NEW v2.0)
- `knowledge/canon/evolve-skip-registry.md` — Skip 영속성 (NEW v2.0)
- `knowledge/canon/attention-budget.md` — Phase 1 cache_control baseline
- `knowledge/canon/agentic-engineering.md` — methodology frame
- `knowledge/canon/evergreen-principle.md` — Hub-not-enforcer
- `knowledge/canon/tech-trends-*.md` — 월별 SSoT (Phase 2 input + Phase 6 output)
- `.claude/rules/fundamentals-first.md` — 정공법 5원칙
- `.claude/rules/agent-evidence.md` — 출처 강제 root rule

## v2.0 변경 이력

- 2026-05-13: v2.0 — Phase 2 retrospective + Phase 4 synthesize script + 가산식 score + evolve-skip-registry canon + cost ledger + entry guard. Plan: `~/.claude/plans/glowing-shimmying-crystal.md`.
- 2026-05-06: v1.0 첫 dogfood — `tech-trends-2026-05.md` 생성 (28 candidate / 4 P0 / 6 P1).
