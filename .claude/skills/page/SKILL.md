---
name: page
description: 페이지 레이아웃 생성 파이프라인. layout-patterns 규격 기반 + 반응형 + Figma 연동
user-invocable: true
---

## Auto Context
@knowledge/canon/layout-patterns.md

> 참고: 랜딩 카피 프레임워크(FBO/PAS/BAB/AIDA 등)는 universe `knowledge/canon/landing-copywriting.md`에 정리돼 있다. 각 앱의 브랜드 보이스는 앱 자율이므로 자동 로드하지 않는다. 필요 시 universe 레포에서 직접 참고.

# /page — 페이지 레이아웃 생성

layout-patterns 규격 로드 → page-builder agent → multi-review (design-critic + a11y + architecture) 병렬 검증

## 프로세스

1. **대상 앱과 페이지 유형 식별**
2. **layout-patterns 스킬에서 구조 규격 로드** (header, footer, section 규격)
3. **Figma 링크 있으면**: 디자인 구조 로드
4. **page-builder agent 실행**: 레이아웃 생성
5. **multi-review 실행**: design-critic + accessibility-auditor + architecture-sentinel 3개 병렬
6. **FAIL시**: quality-fixer로 자동수정 → 재검증
7. **최종**: `bun run check` + `bun run typecheck` 통과

## 사용 예시

```
/page — modfolio 랜딩 페이지 Hero + Features + CTA 구조로 만들어줘
/page — gistcore 대시보드 레이아웃 생성해줘
```
