---
name: universe-sync
description: 스크립트 실행으로 지식/설정을 member repo에 전파. 반드시 bun run sync-knowledge 실행
argument-hint: "[--collect | --verify | --dry-run]"
disable-model-invocation: true
---

# /universe-sync

**이 스킬은 스크립트를 실행하는 것이 전부다. 에이전트가 직접 파일을 복사하면 안 된다.**

## 실행

```bash
bun run sync-knowledge
bun run sync-knowledge --dry-run   # 미리보기
```

## 스크립트가 하는 일

1. knowledge/canon, global.md를 member repos에 동기화
2. CLAUDE.md 생태계 섹션 갱신
3. ecosystem.json 교차 검증

## scope

- settings.json, skills, agents 동기화는 `/harness-pull` 담당
- 이 스크립트는 지식(knowledge) 계층만 다룸
