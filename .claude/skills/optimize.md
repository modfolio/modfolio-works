---
description: Autoresearch 패턴 — 메트릭 기반 자율 반복 최적화. 번들 사이즈, 응답 시간, Lighthouse 점수, 테스트 커버리지, lint 위반 수 등 측정 가능한 메트릭을 지정하면 자율적으로 반복 개선
disable-model-invocation: true
effort: max
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
context: fork
---

# /optimize — Autoresearch 패턴

Karpathy autoresearch에서 차용한 메트릭 기반 자율 반복 최적화.

## 원칙

- 하나의 대상만 수정 (scope 제한)
- 하나의 메트릭만 측정 (binary 판단: 좋아졌나/나빠졌나)
- 개선이면 git commit으로 유지
- 악화면 자동 git revert
- N회 반복 또는 수렴까지

## 시작 프로토콜

### 1. 사용자로부터 3가지를 받는다

**Target**: 최적화할 파일 (가능한 한 좁게)
- 좋음: `apps/mc/src/components/PostCard.svelte`
- 나쁨: `전체 프론트엔드` (너무 넓음)

**Metric**: 실행 가능한 측정 명령어 (숫자 반환 필수)
- 번들 사이즈: `bun run build && du -sb dist/ | cut -f1`
- 테스트 커버리지: `bun run test -- --coverage 2>&1 | grep 'All files' | awk '{print $10}'`
- API 응답 시간: `curl -o /dev/null -s -w '%{time_total}' http://localhost:3000/api/posts`
- lint 위반 수: `bun run check 2>&1 | grep -c 'error\|warning'`
- 타입 에러 수: `bun run typecheck 2>&1 | grep -c 'error TS'`

**Direction**: `minimize` (작을수록 좋음) 또는 `maximize` (클수록 좋음)

### 2. Baseline 측정

```
1. git stash (미커밋 변경 보호)
2. 메트릭 명령어 실행 → baseline 값 기록
3. git stash pop
4. "Baseline: {metric_name} = {value}" 출력
```

### 3. 반복 루프

```
ITERATION 1..N:

  Step A: 현재 상태 + git log (최근 5개) + 이전 실험 결과 분석

  Step B: 개선 가설 1개 수립
    - 무엇을 변경할 것인가
    - 왜 개선될 것으로 예상하는가

  Step C: 변경 실행
    - 대상 파일만 수정 (다른 파일 수정 금지)
    - 한 번에 하나의 아이디어만

  Step D: 메트릭 측정

  Step E: 판단
    IF 개선 (direction에 따라):
      → git add + git commit -m "optimize({scope}): {description} [{old} → {new}]"
      → 이 변경을 기반으로 다음 반복

    IF 악화 또는 동일:
      → git checkout -- {target_file}  (자동 revert)
      → 다른 가설로 다음 반복

    IF 빌드/테스트 실패:
      → git checkout -- {target_file}  (자동 revert)
      → 실패 원인 분석 후 다음 반복

  Step F: 10회마다 진행 요약 출력
```

### 4. 종료 조건

- 사용자 지정 N회 완료
- 연속 5회 개선 없음 (수렴 판단)
- 사용자 중단

### 5. 최종 보고

```
## Optimize Report
- Target: {file}
- Metric: {metric_name}
- Direction: {minimize|maximize}
- Baseline: {baseline_value}
- Final: {final_value}
- Improvement: {percentage}%
- Iterations: {total} (kept: {N} / reverted: {N} / failed: {N})

### Kept Changes
1. {commit_hash}: {description} [{old} → {new}]

### Failed Hypotheses (learnings)
1. {hypothesis}: {why_it_failed}
```

## 안전장치

- 대상 파일 외 다른 파일 수정 금지
- 빌드가 깨지는 변경은 즉시 revert
- 기존 테스트가 실패하는 변경은 즉시 revert
- @ts-ignore, as any, biome-ignore 추가 금지 (정공법 원칙)

## /ralph-loop과의 차이

| 구분 | /ralph-loop | /optimize |
|---|---|---|
| 목표 | 이진 완료 기준 달성 | 연속 메트릭 개선 |
| 대상 | 여러 파일 가능 | 하나의 파일만 |
| 종료 | 모든 기준 통과 시 | N회 또는 수렴 시 |
| 실패 시 | 수정 후 재시도 | 즉시 revert + 다른 가설 |
| 용도 | 스캐폴딩, 리팩토링 | 성능 최적화, 품질 개선 |
