---
title: Prompt Caching Strategy — 1h vs 5m TTL
version: 1.0.0
last_updated: 2026-04-17
source: [Claude Code v2.1.108 ENABLE_PROMPT_CACHING_1H, Harness v2.4]
sync_to_children: true
consumers: [preflight]
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

## 측정

Langfuse 대시보드의 **cache_read_input_tokens** 비율이 의미 지표:

- **목표**: `cache_read / (cache_read + cache_creation + input)` ≥ 70%
- **경고**: < 50% → 1h 대상이 너무 넓게 잡혔을 가능성 (자주 바뀌는 파일이 1h 영역에 포함됨)

LiteLLM proxy에서도 cost delta로 확인 가능 (cache read는 90% 저렴).

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
