---
name: journal
description: 개발 저널 기록 — 일자별 작업 로그 + 의사결정 맥락 + knowledge/journal/ 관리
user-invocable: true
---


# Skill: /journal — 개발 저널 기록

개발 중 판단, 실수, 발견, 시행착오, 외부 레퍼런스를 기록하는 가이드.

## 사용법

```
/journal                          # 대화형으로 엔트리 작성
/journal "CF Pages 배포 실패 해결"  # 제목 지정하여 작성
```

## 파일 위치

```
knowledge/journal/YYYYMMDD-slug.md
```

## 엔트리 형식

```markdown
# YYYY-MM-DD: {제목}

## 카테고리
decision | mistake | discovery | trial-and-error | reference | lesson

## 태그
#sso #deployment #biome #sveltekit #architecture #cf-pages ...

## 맥락
[어떤 작업 중이었는지, 무엇이 문제였는지]

## 내용
[무엇을 시도했는지, 무엇이 작동했는지, 무엇이 실패했는지]

## 결과
[최종 해결책 또는 결론]

## 관련 파일
[영향받은 파일, 관련 ADR, 관련 review 문서]
```

## 카테고리 정의

| 카테고리 | 언제 사용 | 예시 |
|---------|----------|------|
| **decision** | 기술적 판단을 내렸을 때 | 프레임워크 전환, DB 선택, 아키텍처 변경 |
| **mistake** | 실수를 발견/수정했을 때 | CF Pages Direct Upload 문제, 잘못된 설정 |
| **discovery** | 새로운 사실을 알게 됐을 때 | 프레임워크 한계, API 동작 방식 |
| **trial-and-error** | 여러 방법을 시도한 과정 | 디버깅, 성능 최적화, 호환성 문제 |
| **reference** | 외부 지식을 기록할 때 | 영상, 기사, 문서에서 얻은 인사이트 |
| **lesson** | 배운 교훈을 정리할 때 | 패턴, 안티패턴, 모범 사례 |

## 작성 후 필수

1. `knowledge/journal/_index.md` 인덱스에 항목 추가
2. 중요한 발견이면 `knowledge/claude/gotchas.md`에도 짧게 추가
3. 생태계 전체에 영향이면 `knowledge/global.md` 또는 해당 프로젝트 파일 갱신

## 태그 컨벤션

- 프레임워크: `#sveltekit` `#solidstart` `#astro` `#hono` `#nuxt` `#qwik`
- 인프라: `#cf-pages` `#cf-workers` `#d1` `#neon` `#r2` `#doppler`
- 기능: `#sso` `#deployment` `#auth` `#database` `#styling`
- 도구: `#biome` `#drizzle` `#turborepo` `#bun` `#wrangler`
- 앱: `#naviaca` `#gistcore` `#connect` `#sincheong` 등
