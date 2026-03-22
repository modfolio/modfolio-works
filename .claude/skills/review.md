# Skill: /review — 실행 리뷰 작성

Builder가 구현 완료 후 작성하는 실행 리뷰 가이드.

## 파일 위치

```
docs/review/YYYYMMDD-###-slug.md
```

## 템플릿

```markdown
# YYYYMMDD-###-slug — Review

## Implementation Summary

[구현한 내용 요약 — plan의 intent와 매칭]

## Quality Gate

```bash
[CLAUDE.md의 Quality Gate 명령어 실행 결과]
```

- [ ] Lint: PASS/FAIL
- [ ] TypeCheck: PASS/FAIL
- [ ] Build: PASS/FAIL

## Deviations

[plan과 다르게 한 부분. 없으면 "None"]

| 항목 | Plan | 실제 | 이유 |
|------|------|------|------|
| ... | ... | ... | ... |

## Suggestions

[다음 작업에 대한 제안. 없으면 "None"]

1. ...

## Discoveries

[구현 중 새롭게 알게 된 사실. 없으면 "None"]

1. ...

## Questions

[Planner/Reviewer에게 묻고 싶은 것. 없으면 "None"]

1. ...
```

## 작성 원칙

1. **Deviations**: intent 기준으로 판단한다. scope와 달라도 intent에 부합하면 OK.
2. **Suggestions**: 근거를 함께 적는다 (코드, 벤치마크, 문서).
3. **Discoveries**: 새로운 사실만 적는다 (이미 알려진 것 제외).
4. **Questions**: 구체적으로 적는다 (예/아니오로 답할 수 있게).

## 에스컬레이션

생태계 전체에 영향이 있는 발견이면:
- `docs/updates/`에도 별도 엔트리 생성 (`/updates` skill 참조)
