---
description: Figma + Canva 양방향 디자인 파이프라인. Anti-Slop 5-Layer 엔진 + Canvas to Code + Code to Canvas + 브랜드 에셋 + 시각 검증
effort: max
model: opus
allowed-tools: Read, Glob, Grep, Agent
user-invocable: true
---

# /design — Anti-Slop 5-Layer 디자인 파이프라인

design-engineer (opus) 중심. Figma = UI/UX 코드, Canva = 마케팅/브랜드 에셋.

> **핵심 원칙**: "AI에게 더 나은 코드를 가르치지 말고, 나쁜 코드가 표현 불가능한 아키텍처를 설계하라."
> **제약 역설**: AI에 자유를 주면 평범해지고, 제약을 주면 혁신한다.

## Anti-Slop 제약 시스템 (Layer 1)

**금지 목록 (Negative Prompting):**
- 중앙 정렬 히어로 섹션 (centered hero with CTA button)
- 3-column 카드 그리드 (three equal white cards in a row)
- 보라-파랑 그라데이션 (purple-to-blue gradient backgrounds)
- 범용 폰트 단독 사용 (Inter, Roboto without distinctive pairing)
- 스톡 일러스트/아이콘 기본값 (unmodified Heroicons/Lucide)
- 둥근 모서리 + 드롭 섀도우 기본 조합 (rounded-lg shadow-md pattern)

**필수 대안 (Positive Constraints):**
- 시각적 메타포 명시 (Orbit, Bento Grid, Museumcore, Cyberbrutalism, Tactile 3D 중 선택)
- 비선형 레이아웃 (asymmetric grid, non-linear flow)
- 타이포그래피 위계 (headline serif + body sans, 최소 2단계 weight 차이)
- 앱 고유 디자인 시스템 토큰 (공유 금지, House of Brands)

## 4-Phase 디자인 파이프라인 (Layer 2: GAN-Inspired)

```
Phase 1: Trend Exploration (자율)
  → AI가 2026 디자인 트렌드 2개 선별 + 프로젝트 맥락 맞춤 이유 설명
  → 사용자가 선택
  → 레퍼런스: Cyberbrutalism, Bento Grid, Museumcore, Tactile Maximalism

Phase 2: IA Restructuring
  → 평면적 데이터 계층을 해체 → 다차원 관계 수립
  → 시각적 메타포 제안 (Orbit, Bento, 3D Tactile 등)
  → 출력: 마크다운 정보 아키텍처

Phase 3: Design Token Extraction
  → (참조 디자인 있으면) Playwright로 탐색 → Accessibility Tree
  → Vision LLM으로 역공학: 색상, 타이포, 간격, 패턴
  → Semantic Density 0.85 목표 (Raw HTML 금지)
  → 출력: JSON 디자인 토큰

Phase 4: Constrained Implementation
  → Anti-Slop 제약 적용
  → Modern CSS 전략 (View Transitions, Scroll-Driven, @property)
  → MCP 문서 확인 후 코딩 (Astro MCP, Svelte MCP)
  → design-engineer agent에 위임
```

## Recursive Meta-Prompting (Layer 3: RMP)

Generator 내부 자가 검증:
1. 내부적으로 5-7개 "세계적 수준" 평가 기준 수립
2. 디자인 후보 생성
3. 자체 기준 대비 평가
4. "AI Slop" 패턴이면 즉시 거부
5. 비선형 그리드, 타이포 중심 레이아웃, 비대칭 패턴 탐색
6. 만족할 때까지 재귀 반복

## Design Constitution (Layer 4)

명시적 원칙 대비 자가 평가 (Constitutional AI 적용):
1. 승인된 디자인 토큰만 사용하는가? (하드코딩 색상/간격 금지)
2. WCAG AA 대비율 4.5:1 이상인가?
3. AI Slop 패턴(보라 그라데이션, 균일 카드 그리드)을 피하는가?
4. 터치 타겟 44x44px 이상인가?
5. 시맨틱 HTML 구조인가? (div soup 금지)
6. 최상위 내비게이션 5-7개 이하인가? (Miller's Law)
7. Norman 감성 3계층: visceral(미적 응집) + behavioral(태스크 최적화) + reflective(브랜드 서사)

## 6-Gate 품질 파이프라인 (Layer 5)

Generator 평가 완료 후 visual-qa agent가 실행:
1. LINT — Biome + 토큰 위반 탐지
2. ACCESSIBILITY — axe-core (WCAG AA)
3. VISUAL FIDELITY — LPIPS/SSIM (참조 대비, 있을 때만)
4. PERFORMANCE — Lighthouse (Performance>=80, LCP<=2.5s, CLS<=0.1)
5. SLOP DETECTION — 금지 패턴 grep (centered hero, 3-card grid, purple gradient)
6. TOKEN COMPLIANCE — CSS 변수 사용률 >=80%

## i18n 아키텍처 제약 (처음부터 내장)

- CSS 논리적 속성 전용 (margin-inline-start, not margin-left)
- 문자열 외부화 (하드코딩 텍스트 금지)
- 텍스트 30-40% 확장 수용 유연 컨테이너
- RTL 레이아웃 HTML dir 속성으로 미러링
- Intl API 사용 (날짜, 숫자, 통화)

## Figma 워크플로우

```
Figma 링크 있음 → Canvas to Code
  → figma MCP: get_design_context로 디자인 데이터 읽기
  → 앱 토큰 팔레트와 매핑 → 코드 생성

설명만 있음 → 4-Phase 파이프라인 실행
  → design-engineer (opus)로 결정 → 코드 생성

Code to Canvas
  → generate_figma_design으로 라이브 UI를 Figma에 캡처
  → 사용자에게 Figma에서 비주얼 조정 요청

검증 (Generator-Evaluator 루프)
  → design-critic: 4가지 가중 평가 (40/30/15/15)
  → visual-qa: 6-Gate 파이프라인
  → FAIL시 → Generator에 구체적 피드백 → 재생성 (5-15 iterations)
```

## Canva 워크플로우 (브랜드/마케팅 에셋)

- **Figma**: UI 컴포넌트/페이지 코드
- **Canva**: 프레젠테이션/소셜/마케팅 에셋

## 사용 예시

```
/design — 이 Figma 프레임을 Svelte 컴포넌트로 구현해줘: [figma-link]
/design — modfolio 랜딩을 새 디자인으로 만들어줘 (미니멀, 다크)
/design — gistcore 대시보드 레이아웃을 Figma에 캡처해줘
/design — Modfolio 투자 피치덱 5슬라이드 Canva에서 만들어줘
```
