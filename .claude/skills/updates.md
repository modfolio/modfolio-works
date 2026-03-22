# Skill: /updates — 생태계 업데이트 리포트

이 레포에서 발견한 **생태계 전체에 중요한 정보**를 modfolio-universe에 보고하는 가이드.

## 사용법

```
/updates                          # 대화형으로 엔트리 작성
/updates "Biome v2 새 패턴 발견"   # 제목 지정하여 작성
```

## 파일 위치

```
docs/updates/YYYYMMDD-slug.md
```

## 언제 작성하는가

- 새로운 프레임워크/라이브러리 gotcha 발견
- 새로운 Biome/TypeScript 패턴 발견
- CF Pages/Workers 동작 관련 새 사실
- SSO 연동 중 발견한 이슈
- 생태계 전체에 적용할 만한 패턴/안티패턴
- 스키마/계약 관련 변경 제안

## 템플릿

```markdown
# YYYY-MM-DD: {제목}

## 카테고리
gotcha | pattern | suggestion | question

## 태그
#{framework} #{area}

## 출처
- 레포: {이 레포 이름}
- 작업 맥락: {어떤 작업 중 발견}
- 관련 review: docs/review/{slug}.md (있는 경우)

## 내용
[발견한 내용, 구체적 코드/설정 포함]

## 생태계 영향
- 영향받을 수 있는 앱: [앱 목록 또는 "동일 프레임워크 사용하는 모든 앱"]
- 긴급도: low | medium | high
```

## 카테고리 정의

| 카테고리 | 용도 |
|---------|------|
| **gotcha** | 함정/주의사항 — 다른 앱도 빠질 수 있는 문제 |
| **pattern** | 모범 사례 — 생태계 전체에 적용할 만한 패턴 |
| **suggestion** | 제안 — 생태계 규칙/템플릿 변경 제안 |
| **question** | 질문 — universe에서 판단이 필요한 사항 |

## 수집 주기

modfolio-universe가 주기적으로 모든 자식 레포의 `docs/updates/`를 수집하여
생태계 지식에 통합한다. 수집 후에도 파일은 삭제되지 않는다 (히스토리 유지).
