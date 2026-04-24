---
name: ecosystem-sync
description: 스크립트 실행으로 지식 계층을 연결 프로젝트로 배포. host sibling 환경 전용 (Dev Container 안에서는 SKIP).
argument-hint: "[--collect | --verify | --dry-run]"
disable-model-invocation: true
---

# /ecosystem-sync

**이 스킬은 스크립트를 실행하는 것이 전부다. 에이전트가 직접 파일을 복사하면 안 된다.**

> **Rename note (2026-04-22)**: 원래 `/universe-sync` 였다. repo 이름이 `modfolio-ecosystem` 으로 바뀌면서 skill 이름도 일치시켰다. 기존 member repo 에 배포된 `.claude/skills/universe-sync/` 폴더는 `DEPRECATED_SKILLS` 에 등록되어 다음 harness-pull `--prune-deprecated` 시 제거된다.

## 실행 환경

**host sibling layout 전용**. ecosystem 과 연결 프로젝트 repo 가 같은 부모 폴더에 clone 되어 있을 때만 동작한다. modfolio-ecosystem Dev Container 내부에서는 다른 프로젝트가 보이지 않아 SKIP 된다 (v2.5 이후 독립 컨테이너 시대).

## 실행

```bash
# host 터미널 (WSL / macOS / Linux)
cd /path/to/modfolio-ecosystem
bun run sync-knowledge
bun run sync-knowledge --dry-run   # 미리보기
```

## 스크립트가 하는 일

1. `knowledge/canon`, `global.md` 를 연결 프로젝트의 `knowledge/` 로 배포
2. CLAUDE.md 생태계 섹션 갱신
3. `ecosystem.json` 교차 검증

Hub-not-enforcer 원칙상 이 배포는 **연결 프로젝트 소유자가 동의한 범위**에서만 작동해야 한다 (`harness-lock.json` 으로 개별 path 보호 가능). 일방적 덮어쓰기 금지.

## scope

- `settings.json`, skills, agents 동기화는 `/harness-pull` 담당
- 이 스크립트는 지식(knowledge) 계층만 다룸
