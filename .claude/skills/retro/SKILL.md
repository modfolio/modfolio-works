---
name: retro
description: Git 기반 스프린트 회고. 통계 분석 + 패턴 식별 + 자가학습 시스템 입력 (메모리 쓰기는 사용자 승인 후)
user-invocable: true
---


# /retro — 스프린트 회고

Git 히스토리를 분석하여 자동 회고 보고서를 생성한다.
메모리 반영은 보고서 출력 후 사용자가 결정한다.

## 프로세스

### 1. 기간 선택

사용자에게 질문:
- 24시간 (어제 작업)
- 7일 (이번 주)
- 14일 (스프린트)
- 30일 (월간)

### 2. Git 통계 수집 (병렬 실행)

```bash
# 기본 통계
git log --since="{period}" --oneline | wc -l          # 커밋 수
git log --since="{period}" --stat --format="" | tail   # 변경 파일 수
git log --since="{period}" --numstat --format=""       # 추가/삭제 줄 수

# 패턴 분석
git log --since="{period}" --format="%s" | grep -c "^feat:"    # feat 비율
git log --since="{period}" --format="%s" | grep -c "^fix:"     # fix 비율
git log --since="{period}" --format="%s" | grep -c "^refactor:" # refactor 비율
git log --since="{period}" --format="%s" | grep -c "^test:"    # test 비율

# 핫스팟 분석
git log --since="{period}" --name-only --format="" | sort | uniq -c | sort -rn | head -10

# 위험 신호
git log --since="{period}" --format="%s" | grep -ic "revert"   # 되돌림
git log --since="{period}" --diff-filter=M -- "*.schema.ts" "*/schema.ts" | wc -l  # 스키마 변경
git log --since="{period}" --diff-filter=M -- "package.json" | wc -l  # 의존성 변경

# 시간대 분포
git log --since="{period}" --format="%H" | sort | uniq -c | sort -rn | head -5

# 가장 큰 단일 커밋 (범위 초과 후보)
git log --since="{period}" --numstat --format="%H %s" | head -50
```

### 3. 보고서 생성

```markdown
## Retro Report ({period})

### 요약
- 커밋: {n}개 | 변경 파일: {n}개 | +{n} / -{n} 줄
- feat: {n}% | fix: {n}% | refactor: {n}% | test: {n}%

### 잘한 점 (What went well)
- {분석 기반}

### 개선할 점 (What to improve)
- {분석 기반}

### 반복 패턴 (Recurring patterns)
- {핫스팟 파일, 반복 수정, revert 패턴 등}

### 위험 신호
- 가장 큰 커밋: {hash} — {files}개 파일 (범위 초과?)
- Revert: {n}회
- 스키마 변경: {n}회

### 다음 스프린트 제안
- {분석 기반 액션 아이템}
```

### 4. 메모리 반영 (사용자 승인 필요)

보고서 출력 후 사용자에게 질문:
- 반복 패턴을 `memory/pattern-history.md`에 추가할까?
- 개선 제안을 `memory/skill-effectiveness.md`에 반영할까?
- `memory/decisions-log.md`와 크로스체크 필요한 항목이 있는가?

**자동 쓰기 금지** — 사용자가 승인한 항목만 메모리에 반영.
