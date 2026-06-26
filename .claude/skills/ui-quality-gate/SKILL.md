---
name: ui-quality-gate
description: UI 자가 검증 체크리스트 + 정규화 관문
user-invocable: true
---


# UI Quality Gate — 자가 검증 체크리스트

> UI 코드 생성/수정 후 자가 검증. `/ui-quality-gate`로 호출하거나
> code-reviewer 에이전트가 자동 참조.
> 표준 출처: `knowledge/canon/ui-enterprise-baseline.md`(상태 표면 + WCAG 2.2 AA floor) · `design-tokens.md`(토큰).

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

### 모션/접근성 (WCAG 2.2 AA floor — `canon/ui-enterprise-baseline.md` Part 2)
- [ ] 애니메이션에 prefers-reduced-motion 폴백 (버튼/토스트/전환 포함 — 일부 클래스만 가드 금지)
- [ ] transform/opacity만 애니메이션 (layout 속성 없음)
- [ ] 시각 효과 레이어에 pointer-events: none
- [ ] WCAG AA 대비율 (텍스트 4.5:1, UI 3:1)
- [ ] async 상태(저장/에러/녹음/스트리밍)에 aria-live (SC 4.1.3)
- [ ] 폼: label 연결 + 에러 `aria-invalid`/`aria-describedby` (SC 3.3.1)
- [ ] 클릭 요소 키보드 조작 가능(`div`/`td` onclick 금지) + `:focus-visible` 가시

### 반응형
- [ ] mobile-first (min-width 브레이크포인트)
- [ ] clamp() 우선 (미디어 쿼리 최소화)
- [ ] 터치 타겟 최소 44x44px

### 상태 표면 (완성 floor — `canon/ui-enterprise-baseline.md` Part 1)
async/data 의존 뷰(목록/상세/검색/제출/업로드/스트리밍)는 4상태를 모두 처리:
- [ ] **loading** — 레이아웃 예약 skeleton (CLS 0 지향, 스피너 단독 지양)
- [ ] **empty** — "왜 비었나 + 다음 행동(CTA)" (빈 화면 금지)
- [ ] **error** — 사람이 읽는 메시지 + 복구 경로 (무음/JSON-only 실패 금지)
- [ ] 라우트 간 상태 처리 **일관성** (일부 페이지만 skeleton = fleet 최빈 갭)

## 정규화 관문

대규모 UI 작업 완료 시:
1. 새로/수정된 컴포넌트 10개 랜덤 샘플링
2. 각각 위 체크리스트 적용
3. 8/10 이상 통과 → 계속 진행
4. 미달 → 토큰 체계 자체를 검토 (구현을 억지로 맞추지 않음)
