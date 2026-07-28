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

### 2. playbook 로드 — repo 에 따라 경로가 다르다

**허브(modfolio-ecosystem) checkout:**

```bash
cat knowledge/playbooks/<task-class>.md
```

**sibling repo:** 코퍼스는 **패키지에 동봉되지 않는다.** `package.json` 의 `files` 가 `"!knowledge/playbooks/**"` 로 명시 제외하며, 이는 실수가 아니라 복합 게이트(counter-gate + ab-gate) 통과 전까지의 **의도적 보류**다(`reasoning-playbooks.md` §fleet 개통 복합 게이트). 따라서 sibling 에서는 RAG 로 질의한다:

```
mcp__knowledge-rag__knowledge_query(query: "<task-class> <현재 문제 요약>", top_k: 5)
```

playbook 파일들은 RAG 인덱스에 포함돼 있으므로 이 경로가 sibling 의 **정상 경로**다. MCP 가 없으면 이 단계를 건너뛴다 — playbook 없이 진행하는 것이 잘못된 경로를 `cat` 하는 것보다 낫다.

> ⚠ 2026-07-26 정정: 이 절은 sibling 에게 `node_modules/@modfolio/harness/knowledge/playbooks/...` 를 읽으라고 지시하고 있었다. 그 경로는 패키징 제외 때문에 **존재한 적이 없다** — 동기화된 스킬이라 27개 repo 전부가 없는 파일을 가리키고 있었다.

**`## Active` 섹션만 신뢰해 사용한다.** Candidates 는 미승격(허브 검토용), Retired 는 tombstone(따르지 말 것 — 은퇴 사유가 있다).

### 3. 관련 bullet 선별 — top-k 3-5 하드 캡

현재 태스크의 facet(repo·framework·error-class)과 `When:` 조건이 맞는 bullet 만 **최대 5개** 고른다. 전체 파일을 컨텍스트에 들고 다니지 않는다 — 과다 주입은 실측 성능 저하 (Memp, `reasoning-playbooks.md` §주입).

더 신선한/교차-class 검색이 필요하면 RAG 병행 (있을 때):

```
mcp: knowledge_query — query: "<task_class> <error_class> <framework> <repo>", top_k: 5
```

### 4. 사용 기록 (카운터 루프)

실제로 판단에 사용한 bullet 의 `PB-*` ID 를 태스크 종료 `/debrief` 의 `used_playbook_ids[]` 에 기록한다 — helpful/harmful 카운터는 이 경로로만 갱신되며, 이것이 나쁜 bullet 을 은퇴시키고 좋은 bullet 을 승격시키는 유일한 신호다.

> **v3.25.0 부터 이 스킬을 수동으로 열 필요가 줄었다.** `UserPromptSubmit` 훅(`user-prompt-playbook-inject.ts`)이 매 프롬프트를 결정적으로 분류해 관련 Active bullet top-k 를 자동 주입하고, 주입된 ID 를 세션 원장에 남겨 `/debrief` 가 `injected_playbook_ids` 를 자동으로 채운다. 이 스킬은 **주입이 놓친 것을 직접 파거나**(교차-class·RAG 병행), **주입을 끄고 싶을 때** 쓴다.
>
> ⚠ **주입 ≠ 사용.** `injected_playbook_ids`(사실, 자동)와 `used_playbook_ids`(판단, 수동)는 끝까지 분리된다. 주입된 걸 전부 used 로 적으면 카운터가 부풀려져 게이트가 거짓 통과한다 — 0.8% 라는 정직한 숫자보다 나쁜 결과다.

## 반-패턴

- ❌ playbook 파일 전체를 붙여넣기 (top-k 3-5 캡)
- ❌ Retired bullet 적용 (tombstone — 은퇴 사유 존재)
- ❌ bullet 손편집 (merge 는 `bun run debrief:curate`, 승격/은퇴는 /dream 게이트)
- ❌ 사용하고 `used_playbook_ids` 미기록 (카운터 루프 단절 — 시스템이 배우지 못함)
