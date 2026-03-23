---
description: UI 자가 검증 체크리스트 + 정규화 관문
effort: max
model: opus
allowed-tools: Read, Glob, Grep
user-invocable: true
---


# UI Quality Gate — 자가 검증 체크리스트

> UI 코드 생성/수정 후 자가 검증. `/ui-quality-gate`로 호출하거나
> code-reviewer 에이전트가 자동 참조.

## 체크리스트

### 토큰 준수
- [ ] 모든 색상이 CSS 변수 사용 (하드코딩 HEX/RGB 없음)
- [ ] 모든 spacing이 토큰 스케일 사용 (임의 px 없음)
- [ ] 모든 font-family가 CSS 변수 계층 사용
- [ ] 모든 border-radius가 토큰 스케일 사용
- [ ] 모든 box-shadow가 명명된 elevation 사용

### 타이포그래피
- [ ] font-size에 clamp() 사용 (또는 토큰 변수)
- [ ] 본문 텍스트에 max-width: 65ch 적용
- [ ] text-align: justify 없음
- [ ] 제목 간 최소 2단계 weight 차이

### 모션/접근성
- [ ] 애니메이션에 prefers-reduced-motion 폴백
- [ ] transform/opacity만 애니메이션 (layout 속성 없음)
- [ ] 시각 효과 레이어에 pointer-events: none
- [ ] WCAG AA 대비율 (텍스트 4.5:1, UI 3:1)

### 반응형
- [ ] mobile-first (min-width 브레이크포인트)
- [ ] clamp() 우선 (미디어 쿼리 최소화)
- [ ] 터치 타겟 최소 44x44px

## 정규화 관문

대규모 UI 작업 완료 시:
1. 새로/수정된 컴포넌트 10개 랜덤 샘플링
2. 각각 위 체크리스트 적용
3. 8/10 이상 통과 → 계속 진행
4. 미달 → 토큰 체계 자체를 검토 (구현을 억지로 맞추지 않음)
