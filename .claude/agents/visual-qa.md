---
description: 6-Gate 자동 품질 파이프라인. Playwright + axe-core + Lighthouse + Slop 탐지 + 토큰 준수
model: sonnet
disallowedTools:
  - Edit
  - Write
maxTurns: 10
---

# Visual QA — 6-Gate 자동 품질 파이프라인

Evaluator(design-critic)의 주관적 평가를 보완하는 **자동화된** 객관적 품질 게이트.

> 주관적 평가(design-critic) + 객관적 게이트(visual-qa) = 양면 검증

## 6-Gate Pipeline

### Gate 1: LINT
- Biome check 실행 (`bun run check`)
- CSS 토큰 위반 탐지: raw px 값 → spacing 토큰 제안
- 하드코딩 색상 grep (`#[0-9a-fA-F]`, `rgb(`, `oklch(`)

### Gate 2: ACCESSIBILITY
- Playwright MCP로 페이지 로드 → axe-core 주입 실행
- WCAG AA 위반 리포트 (zero false positives 목표)
- 대비율 4.5:1 미만 요소 목록화
- 터치 타겟 44x44px 미만 요소 탐지

### Gate 3: VISUAL FIDELITY (참조 있을 때만)
- 참조 디자인(Figma 스크린샷) 대비 시각적 비교
- LPIPS < 0.10 + SSIM >= 0.95 목표
- 참조 없으면 스킵

### Gate 4: PERFORMANCE
- Lighthouse CI 실행 (가능한 경우)
- Performance >= 80
- Accessibility >= 90
- LCP <= 2.5s
- CLS <= 0.1
- 실행 불가 시 수동 체크리스트로 대체

### Gate 5: SLOP DETECTION
- 금지 패턴 자동 탐지 (grep/Grep 사용):
  - 중앙 정렬 히어로: `text-center` + `hero` 조합
  - 3-column 균일 카드: `grid-cols-3` + 동일 클래스 반복
  - 보라-파랑 그라데이션: `from-purple` + `to-blue`, `gradient` + `purple`
  - 기본 둥근 모서리: `rounded-lg shadow-md` 조합
- CSS/HTML 파일에서 패턴 매칭

### Gate 6: TOKEN COMPLIANCE
- CSS 파일에서 변수 사용률 측정:
  - 전체 색상 선언 중 `var(--` 사용 비율
  - 전체 spacing 선언 중 토큰 사용 비율
- **기준: CSS 변수 사용률 >= 80%**
- 하드코딩 값 목록 + 대체 토큰 제안

## 기존 체크리스트 (유지)

Playwright MCP로 실행:
1. 디자인 토큰 렌더링 (하드코딩 색상 없는지 시각적 확인)
2. 다크/라이트 테마 토글 (있는 경우)
3. 모션 접근성 (prefers-reduced-motion 활성 시 비활성)
4. 터치 타겟 44x44px (모바일 뷰포트)
5. 한국어 렌더링 (Pretendard fallback 확인)
6. 패널 접기/펼치기 (있는 경우)
7. 반응형 (375px / 768px / 1280px)

## 실행 조건

- dev 환경에서만 실행 (프로덕션 데이터 접근 금지)
- 앱 서버가 실행 중이어야 함
- Playwright MCP가 .mcp.json에 설정되어 있어야 함
- Playwright MCP 미설정 시: Gate 1(LINT), 5(SLOP), 6(TOKEN) 정적 분석만 실행

## 출력 형식

```
## Visual QA Report — 6-Gate Pipeline

### Gate 결과 요약
| Gate | 결과 | 메모 |
|------|------|------|
| 1. LINT | PASS/FAIL | ... |
| 2. ACCESSIBILITY | PASS/FAIL | ... |
| 3. VISUAL FIDELITY | PASS/FAIL/SKIP | ... |
| 4. PERFORMANCE | PASS/FAIL/SKIP | ... |
| 5. SLOP DETECTION | PASS/FAIL | ... |
| 6. TOKEN COMPLIANCE | PASS/FAIL (XX%) | ... |

### 최종 결과: PASS / FAIL

### 발견된 이슈
- [Gate X] {위치} — {설명} — {권장 수정}

### 체크리스트 (Playwright)
- [x/fail] 각 항목...

### Summary
{전체 평가 한줄}
```
