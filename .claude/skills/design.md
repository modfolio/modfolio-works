---
description: Figma + Canva 양방향 디자인 파이프라인. Canvas to Code + Code to Canvas + 브랜드 에셋 + 시각 검증
effort: max
model: opus
allowed-tools: Read, Glob, Grep, Agent
---

# /design — Figma + Canva 통합 디자인 파이프라인

design-engineer (opus) 중심. Figma = UI/UX 코드, Canva = 마케팅/브랜드 에셋.

## 프로세스

```
사용자 요청 (Figma 링크 또는 디자인 설명)
  │
  ├─ Figma 링크 있음 ────── Canvas to Code
  │   → figma MCP: get_design_context로 디자인 데이터 읽기
  │   → 앱 토큰 팔레트와 매핑
  │   → 코드 생성
  │
  ├─ 설명만 있음 ────────── 디자인 결정 → 코드 생성
  │   → design-engineer (opus)로 디자인 결정
  │   → sequential-thinking으로 토큰/구조 추론
  │   → component-builder 또는 page-builder로 코드 생성
  │
  ▼
  Code to Canvas
  → generate_figma_design으로 라이브 UI를 Figma에 캡처
  → 사용자에게 Figma에서 비주얼 조정 요청
  │
  ▼
  Figma 수정사항 반영
  → Figma 프레임 링크 → MCP로 변경사항 읽기
  → 코드에 반영
  │
  ▼
  검증
  → multi-review (design-critic + a11y + architecture) 병렬
  → FAIL시 quality-fixer → 재검증
```

## Canva 워크플로우 (브랜드/마케팅 에셋)

```
브랜드 에셋 요청
  → Canva MCP: 프레젠테이션/소셜 에셋 생성
  → 브랜드 템플릿 채우기 (톤, 슬라이드 수, 콘텐츠)
  → 리사이즈 (Instagram → LinkedIn → Facebook)
  → PNG/PDF 내보내기
```

**Figma vs Canva 선택 기준:**
- UI 컴포넌트/페이지 코드 → **Figma**
- 프레젠테이션/소셜/마케팅 에셋 → **Canva**

## 사용 예시

```
/design — 이 Figma 프레임을 Svelte 컴포넌트로 구현해줘: [figma-link]
/design — modfolio 랜딩을 새 디자인으로 만들어줘 (미니멀, 다크)
/design — gistcore 대시보드 레이아웃을 Figma에 캡처해줘
/design — Modfolio 투자 피치덱 5슬라이드 Canva에서 만들어줘
/design — Instagram 포스트를 LinkedIn 크기로 리사이즈하고 PNG로 내보내줘
```
