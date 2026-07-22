---
name: playbooks
description: task-class 별 reasoning playbook 로드 — 과거 프론티어/검증된 판단 원리(Active bullet)를 hard task 시작 전 top-k 3-5 로 주입. escalation rung-2 판단 전 필수 1스텝
user-invocable: true
---

# /playbooks — reasoning playbook 로더

축적된 판단 원리 bullet 을 현재 태스크 컨텍스트에 주입한다. 루프 전체 = `knowledge/canon/reasoning-playbooks.md`.

## 언제

- **escalation rung-2 판단 전 필수 1스텝** (`model-escalation.md` v1.1) — 과거 frontier 카드가 이미 답을 갖고 있으면 escalate 없이 xhigh 로 해결.
- 익숙하지 않은 error-class / 처음 보는 서브시스템 / expensive-if-wrong 태스크 시작 시.

## 절차

### 1. task-class 판정

현재 태스크를 14 class 중 하나로: `security` `payment` `architecture` `incident` `api` `schema` `ui` `deploy` `infra` `testing` `refactor` `ops` `docs` `other`.

### 2. playbook 파일 로드 (정적 rail — 어디서나 작동)

```bash
# 허브 checkout:
cat knowledge/playbooks/<task-class>.md
# sibling (npm 동봉 — @modfolio/harness files 에 knowledge/ 포함):
cat node_modules/@modfolio/harness/knowledge/playbooks/<task-class>.md
```

**`## Active` 섹션만 신뢰해 사용한다.** Candidates 는 미승격(허브 검토용), Retired 는 tombstone(따르지 말 것 — 은퇴 사유가 있다).

### 3. 관련 bullet 선별 — top-k 3-5 하드 캡

현재 태스크의 facet(repo·framework·error-class)과 `When:` 조건이 맞는 bullet 만 **최대 5개** 고른다. 전체 파일을 컨텍스트에 들고 다니지 않는다 — 과다 주입은 실측 성능 저하 (Memp, `reasoning-playbooks.md` §주입).

더 신선한/교차-class 검색이 필요하면 RAG 병행 (있을 때):

```
mcp: knowledge_query — query: "<task_class> <error_class> <framework> <repo>", top_k: 5
```

### 4. 사용 기록 (카운터 루프)

실제로 판단에 사용한 bullet 의 `PB-*` ID 를 기억해 두고, 태스크 종료 `/debrief` 의 `used_playbook_ids[]` 에 기록한다 — helpful/harmful 카운터는 이 경로로만 갱신되며, 이것이 나쁜 bullet 을 은퇴시키고 좋은 bullet 을 승격시키는 유일한 신호다.

## 반-패턴

- ❌ playbook 파일 전체를 붙여넣기 (top-k 3-5 캡)
- ❌ Retired bullet 적용 (tombstone — 은퇴 사유 존재)
- ❌ bullet 손편집 (merge 는 `bun run debrief:curate`, 승격/은퇴는 /dream 게이트)
- ❌ 사용하고 `used_playbook_ids` 미기록 (카운터 루프 단절 — 시스템이 배우지 못함)
