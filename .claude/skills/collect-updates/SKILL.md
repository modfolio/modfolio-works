---
description: 생태계 업데이트 수집 — 모든 프로젝트의 최신 변경 요약
effort: low
allowed-tools: Read, Glob, Grep
user-invocable: true
---


# Skill: /collect-updates — 생태계 업데이트 수집

모든 자식 레포의 `docs/updates/`를 수집하여 생태계 지식에 통합하는 가이드.

## 사용법

```
/collect-updates              # 전체 레포 수집
/collect-updates naviaca      # 특정 레포만
```

## 수집 방법

### 로컬 (권장)

```bash
# 특정 레포
ls C:\Projects\modfolio-universe\{repo}\docs\updates\*.md

# 전체 레포 스캔
for repo in naviaca gistcore modfolio-connect sincheong worthee modfolio-press munseo; do
  echo "=== $repo ==="
  ls C:\Projects\modfolio-universe\$repo\docs\updates\*.md 2>/dev/null || echo "(없음)"
done
```

### GitHub API

```bash
gh api repos/modfolio/{repo}/contents/docs/updates --jq '.[].name'
```

## 수집 후 처리

1. 각 update 파일을 읽고 카테고리 확인
2. **gotcha** → `knowledge/journal/`에 journal 엔트리로 통합 + `_index.md` 갱신
3. **pattern** → `knowledge/global.md` 또는 `knowledge/projects/{repo}.md`에 반영
4. **suggestion** → `docs/proposals/`에 제안 문서 생성 (ADOPT/ADAPT/DEFER/DECLINE 평가)
5. **question** → 해당 레포의 `docs/plan/`에 응답 plan 작성
6. 처리 완료된 update는 **삭제하지 않는다** (히스토리 유지)

## 처리 기록

수집 후 `knowledge/journal/`에 수집 기록 엔트리 생성:

```markdown
# YYYY-MM-DD: 생태계 업데이트 수집

## 카테고리
discovery

## 태그
#ecosystem #updates

## 내용
- {repo}: {update 파일명} — {한줄 요약} → {처리 결과}
- ...

## 결과
{N}개 레포에서 {M}개 update 수집, {K}개 처리 완료
```

## 수집 주기

- 새 세션 시작 시 또는 major milestone 후 수동 실행
- Planner/Reviewer가 주기적으로 확인
