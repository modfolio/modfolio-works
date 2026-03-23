---
description: Skill 프롬프트 자체를 Autoresearch 패턴으로 자율 최적화. eval 케이스 pass rate 측정 후 반복 개선
disable-model-invocation: true
effort: max
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(bun run check:*), Bash(bun run typecheck:*)
context: fork
user-invocable: true
---


# /optimize-skill — Skill 프롬프트 Meta-Optimization

Skill의 프롬프트 품질을 Autoresearch 루프로 최적화한다.

## 원칙

"프롬프트를 수정 → eval 실행 → pass rate 측정 → 개선이면 유지, 악화면 revert"

## 시작 프로토콜

### 1. 대상 Skill 선택

사용자로부터 최적화할 Skill/Agent 경로를 받는다:
- 예: `.claude/skills/component.md`
- 예: `.claude/agents/component-builder.md`

### 2. Eval 케이스 준비

**기존 eval 파일이 있으면** (`memory/evals/{skill-name}-eval.json`): 로드
**없으면** 자동 생성:
1. 대상 Skill의 description과 내용을 분석
2. should-trigger 케이스 7개 + should-not-trigger 케이스 3개 생성
3. 각 케이스에 assertions 정의
4. `memory/evals/{skill-name}-eval.json`에 저장

### 3. Baseline 측정

1. 현재 Skill 프롬프트로 모든 eval 케이스의 assertions 분석
2. Pass rate 계산: (통과 assertions / 전체 assertions) * 100
3. "Baseline pass rate: {N}%" 출력

### 4. 반복 루프

```
ITERATION 1..N:

  Step A: 이전 실패 케이스 분석
    - 어떤 assertion이 실패했는가
    - 프롬프트의 어떤 부분이 부족한가

  Step B: 프롬프트 수정 (1가지만)
    - Skill 파일의 지시사항 1개만 변경
    - 변경 전 백업: cp {skill}.md {skill}.md.bak

  Step C: 전체 eval assertions 재평가
    - 새 pass rate 계산

  Step D: 판단
    IF pass rate 상승:
      → git commit -m "optimize-skill({name}): {change} [{old}% → {new}%]"
      → .bak 삭제

    IF pass rate 하락 또는 동일:
      → mv {skill}.md.bak {skill}.md (revert)

  Step E: 5회마다 진행 요약
```

### 5. 최종 보고

```
## Skill Optimization Report
- Target: {skill_path}
- Baseline pass rate: {N}%
- Final pass rate: {N}%
- Iterations: {total} (kept: {N} / reverted: {N})

### Changes Made
1. {description} [{old}% → {new}%]

### Remaining Failures
- Case N: {description} (개선 여지)
```

## 안전장치

- 프롬프트 수정 전 반드시 .bak 백업
- pass rate 하락 시 즉시 복원
- assertion 자체를 완화하는 수정 금지 (정공법)
- 대상 Skill 파일 외 다른 파일 수정 금지

## 권장 사용

- 새 Skill 작성 후 품질 보증: 초안 → eval 10개 → /optimize-skill 10회
- 반복 품질 문제 발견 시: pattern-history 확인 → 해당 Skill 최적화
- skill-effectiveness에서 fix_needed_after 높은 Skill 우선
