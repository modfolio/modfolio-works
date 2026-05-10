---
title: Prompt Caching Strategy — 1h vs 5m TTL
version: 1.1.0
last_updated: 2026-05-06
source: [Claude Code v2.1.108 ENABLE_PROMPT_CACHING_1H, Harness v2.4, Stage A.2 cache_control rollout 2026-05-06 (modfolio-ecosystem 자산 매핑 + 측정 path)]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [preflight, harness-evolve, modfolio]
---

<!--
ENABLE_PROMPT_CACHING_1H (v2.1.108)를 실제로 활용하려면 "무엇을 1h 범위에 넣을지"
정책이 필요하다. 그렇지 않으면 cache entry가 너무 자주 invalidate되어 이점이 사라진다.
-->

# Prompt Caching Strategy — 1h vs 5m TTL

**원칙**: 고정적이고 재사용 빈도가 높은 프롬프트 세그먼트는 **1시간 TTL** 캐시로, 세션 단위 맥락은 **5분 TTL**로 나눈다.

---

## 설정

`.claude/settings.json`:

```json
{
  "env": {
    "ENABLE_PROMPT_CACHING_1H": "1"
  }
}
```

Claude Code v2.1.108+에서 유효. `DISABLE_PROMPT_CACHING*` 계열 env가 설정되어 있으면 무시됨.

## 분류 기준

### 1h TTL 후보 (변경이 드물고 여러 세션에서 재사용)

- `CLAUDE.md` (user + project) — 세션 시작마다 읽힘
- `.claude/agents/*.md` — agent 실행마다 system prompt로 포함
- `.claude/skills/*/SKILL.md` — skill 호출마다 삽입
- `knowledge/canon/*.md` — 자주 참조되는 핵심 canon (`evergreen-principle.md`, `tech-trends-2026-04.md`, `design-tokens.md` 등)
- `contracts/**/*.ts` — 이벤트 스키마 (드물게 변경)
- `ecosystem.json` — 앱 레지스트리 (소폭 변경)

### 5m TTL (기본) 대상

- 현재 세션의 사용자 프롬프트 + 대화 이력
- 방금 읽은 파일 내용
- tool 결과
- 한 세션 내에서만 유효한 임시 맥락

### modfolio-ecosystem 자산 매핑 (2026-05-06 stocktake, harness v2.23.0)

`harness-evolve --dry-run` 진단 의 자산 분포 (`scripts/evolve/diagnose-current.ts`) 에 본 정책을 적용한 매핑:

| 자산 | 갯수 | TTL | 안정성 근거 |
|---|---|---|---|
| `CLAUDE.md` (root + nested) | 1+ | **1h** | 세션 시작마다 read, 변경 빈도 ~월 1-2회 |
| `.claude/agents/*.md` | 20 | **1h** | agent 호출마다 system prompt 포함, frontmatter 변경 ~분기 |
| `.claude/skills/*/SKILL.md` | 42 | **1h** | skill 호출마다 read, 본문 변경 ~월 1회 |
| `.claude/rules/*.md` | 14 | **1h** | 모든 agent 가 reference, evergreen (timestamp 0) |
| `knowledge/canon/*.md` (applicability=`always`) | 24 | **1h** | 자주 참조 + last_updated 갱신만 invalidate (실제 본문 변경 시만) |
| `knowledge/canon/*.md` (applicability=`per-app-opt-in`) | 18 | **1h** | sibling 별 선택 reference |
| `knowledge/canon/*.md` (applicability=`doc-only`) | 5 | **5m** | tech-trends 류 — 월별 갱신 빈도 ↑ |
| `knowledge/canon/tech-trends-*.md` (latest) | 1 | **5m** | 본문 변경 빈도 가장 높음 — 1h 영역에 두면 자주 invalidate |
| `contracts/**/*.ts` | TBD | **1h** | 이벤트 스키마, breaking change 시만 변경 |
| `ecosystem.json` | 1 | **1h** | 앱 레지스트리 — 소폭 변경, 1h 안정 |
| 사용자 prompt + 대화 이력 | n/a | **5m** | 세션 단위 |
| Tool 결과 | n/a | **5m** | 임시 |

**총 1h 영역 약 120 항목** (CLAUDE.md 1 + agents 20 + skills 42 + rules 14 + canon always+opt-in 42 + ecosystem.json 1) — Claude Code 가 자동 caching 하는 범위 (canon `prompt-caching.md` §5) 와 일치.

**주의**: `last_updated` 만 갱신해도 cache invalidate 됨. 실제 본문 변경 없으면 frontmatter touch 자제 (§ Anti-patterns 명시). 이는 `attention-budget.md` § "modfolio universe 의 attention budget 위반 패턴" 과 직접 정합.

## 측정

세 가지 measurement path (정공법 = 가장 직접적인 path 부터):

### 1. modfolio-ecosystem 로컬 측정 (jsonl 기반, Stage A.2 신규)

`~/.claude/projects/*/conversations/*.jsonl` 의 turn-level usage 객체 집계 (Anthropic Usage&Cost API 미연동 단계의 fallback):

```bash
bun run scripts/budget/cache-hit-report.ts          # 최근 N 세션 평균 cache_read / total
bun run scripts/budget/cache-hit-report.ts --json   # 기계 가독
```

→ canon `attention-budget.md` § "측정 메트릭" 의 5 메트릭 직접 보고. Stage A.2 C-3 으로 신설.

### 2. Langfuse 대시보드 (이미 운영 중인 sibling 의 경우)

**cache_read_input_tokens** 비율이 의미 지표:

- **목표**: `cache_read / (cache_read + cache_creation + input)` ≥ 70%
- **경고**: < 50% → 1h 대상이 너무 넓게 잡혔을 가능성 (자주 바뀌는 파일이 1h 영역에 포함됨)

### 3. LiteLLM proxy / Anthropic Usage&Cost API

LiteLLM proxy 에서 cost delta 로 확인 가능 (cache read 는 90% 저렴). Anthropic Usage&Cost API (Admin key 필요, tech-trends-2026-05.md Trial P1 #3) 도입 시 가장 정확한 cross-account 집계 가능.

## 실무 가이드

- **canon을 수정할 때** `last_updated` 갱신과 실제 본문 변경 모두가 cache invalidation 트리거. 사소한 오타 수정이라면 배치로 묶어서 반영.
- **skill 수정 빈도 관리**: skill 본문 수정이 잦으면 해당 skill 실행 세션 모두 cache miss. 수정은 의미 있는 덩어리로 묶자.
- **대형 canon 분할**: 2KB 이상 자주 바뀌는 canon은 "fast" 섹션 + "stable" 섹션으로 분리 검토 (예: `tech-trends`는 월별 갱신 — stable 부분만 1h 대상).

## Anti-patterns

- `lastUpdated` 필드만 바꾸려고 canon 매일 touch → 1h cache 무력화. 실제 내용 변경 없을 때는 `last_updated` 갱신 자제.
- session 시작 직전 skill/agent 대량 수정 → 첫 turn cache 전부 miss.

## 관련 문서

- [context-isolation.md](context-isolation.md) — 격리된 세션 간에도 canon cache는 공유됨
- [cost-attribution.md](cost-attribution.md) — cache hit rate × 요금 모델 = 실제 비용

## 갱신 이력

- 2026-04-17: v1.0.0 초판. `ENABLE_PROMPT_CACHING_1H` 정책 명문화. cache_read ≥ 70% 목표 수치 설정.
