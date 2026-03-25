# Landing App — 구조 & 텍스트 정리

> 기준일: 2026-03-24 | 경로: `apps/landing/`

## 디렉토리 구조

```
apps/landing/src/
├── components/
│   ├── Nav.astro                    ← 전역 네비게이션 (mega menu + mobile drawer)
│   └── landing/
│       ├── Hero.astro               ← 히어로 섹션
│       ├── AppHighlight.astro       ← 앱 카드 그리드 (홈에서 사용)
│       ├── AppShowcase.astro        ← ⚠ 미사용 (영문 상태 텍스트)
│       ├── SocialProof.astro        ← 통계 섹션
│       ├── CTA.astro                ← 콜투액션 섹션
│       ├── FAQ.astro                ← ⚠ 미사용 (4개 항목, /faq 페이지와 중복)
│       └── Footer.astro             ← 전역 푸터
├── layouts/
│   └── Base.astro                   ← HTML 셸 (메타, 폰트, JSON-LD)
├── lib/
│   └── apps.ts                      ← 하위 앱 데이터 레지스트리
├── pages/
│   ├── index.astro                  ← / (홈)
│   ├── about.astro                  ← /about (소개)
│   ├── apps.astro                   ← /apps (교육 앱)
│   └── faq.astro                    ← /faq (자주 묻는 질문)
└── styles/
    ├── reset.css
    ├── tokens.css                   ← 디자인 토큰 (Teal hue 175 라이트)
    └── global.css
```

---

## 라우팅 맵

| 경로 | 페이지 타이틀 | 주요 컴포넌트 |
|------|-------------|-------------|
| `/` | Modfolio Works — 교육의 미래를 연결합니다 | Hero → AppHighlight → SocialProof → CTA → Footer |
| `/about` | 소개 — Modfolio Works | (인라인 섹션 4개) → Footer |
| `/apps` | 교육 앱 — Modfolio Works | (인라인 앱 섹션 3개) → Footer |
| `/faq` | FAQ — Modfolio Works | (인라인 아코디언 8개) → Footer |

---

## 레이아웃: Base.astro

- **메타**: charset, viewport, description, theme-color `#0E7C7B`, color-scheme `light`, OG (ko_KR)
- **폰트**: Adobe Fonts `fmh4fod` (Goldenbook) + Pretendard Variable (jsDelivr CDN)
- **JSON-LD**: Organization "Modfolio Works", 설명 "교육 그룹 — Naviaca, GistCore, Fortiscribe"
- **스킵링크**: "본문으로 건너뛰기"

---

## 데이터 레지스트리: lib/apps.ts

| 필드 | Naviaca | GistCore | Fortiscribe |
|------|---------|----------|-------------|
| tagline | 학원 운영의 모든 것을 한 곳에서 | AI와 대화하며 영어가 는다 | 작문 실력이 눈에 보인다 |
| description | 학생 관리, 수업 편성, 출석, 성적, 결제까지 — 학원에 필요한 모든 기능을 하나의 시스템으로. | OPIc 실전 시나리오를 AI 튜터와 반복 연습. 발화 분석과 즉각 피드백으로 스피킹 실력을 끌어올립니다. | 영어, 한국어 작문을 제출하면 AI가 문법, 구조, 논리를 첨삭. 반복 훈련으로 글쓰기 근육을 키웁니다. |
| outcome | 학원 운영 시간을 절반으로 줄입니다 | OPIc IM3 이상을 3개월 안에 달성합니다 | 작문 점수를 눈에 보이게 올립니다 |
| domain | naviaca.com | gistcore.com | fortiscribe.com |
| url | https://app.naviaca.com | https://app.gistcore.com | https://app.fortiscribe.com |
| accent | oklch(0.52 0.11 175) teal | oklch(0.55 0.12 155) green-teal | oklch(0.62 0.1 65) amber |
| status | active | active | landing |

---

## 전역 컴포넌트

### Nav.astro

**데스크톱 네비게이션 바:**
- 로고: **Modfolio Works** → `/`
- 메뉴: **앱** (mega menu 트리거) · **소개** → `/about` · **FAQ** → `/faq`
- CTA: **시작하기** → `https://edu.modfolio.io`

**Mega Menu — Education:**
| 아이콘 | 이름 | 설명 | 링크 |
|--------|------|------|------|
| N | Naviaca | 학원 CRM + LMS | naviaca.com |
| G | GistCore | AI 스피킹 연습 | gistcore.com |
| F | Fortiscribe | AI 작문 첨삭 | fortiscribe.com |

프리뷰 텍스트 (호버 시):
- Naviaca: "학생 관리, 수업 편성, 출석, 성적, 결제까지 학원에 필요한 모든 기능을 하나의 시스템으로 제공합니다."
- GistCore: "OPIc 실전 시나리오를 AI 튜터와 반복 연습. 발화 분석과 즉각 피드백으로 스피킹 실력을 끌어올립니다."
- Fortiscribe: "영어, 한국어 작문을 제출하면 AI가 문법, 구조, 논리를 다각도로 첨삭합니다."

**Mega Menu — Community:**
| 아이콘 | 이름 | 설명 | 링크 |
|--------|------|------|------|
| O | Modfolio On | 교육 커뮤니티 | on.modfolio.io |

프리뷰: "교육 현장의 이야기를 나누고, 교사와 학생이 함께 성장하는 커뮤니티입니다."

**Mega Menu — Platform:**
| 아이콘 | 이름 | 설명 | 링크 |
|--------|------|------|------|
| C | Connect | SSO 인증 | connect.modfolio.io |
| P | Pay | 결제 게이트웨이 | pay.modfolio.io |
| D | Docs | 문서 가이드 | docs.modfolio.io |

프리뷰:
- Connect: "한 번의 로그인으로 모든 Modfolio 앱에 접근. SSO, 패스키, 소셜 로그인을 지원합니다."
- Pay: "안전하고 투명한 결제 시스템. 학원과 학생 모두를 위한 통합 결제 게이트웨이입니다."
- Docs: "Modfolio 생태계의 기술 문서, 가이드, API 레퍼런스를 한곳에서 확인하세요."

기본 상태 힌트: "앱 위에 마우스를 올려보세요"

### Footer.astro

**상단:**
- 로고: **Modfolio Works**
- 태그라인: "교육의 미래를 연결합니다"
- 소셜: Instagram · LinkedIn · YouTube

**링크 컬럼:**

| Education | Platform | Ecosystem |
|-----------|----------|-----------|
| Naviaca → naviaca.com | Connect → connect.modfolio.io | LS → ls.modfolio.io |
| GistCore → gistcore.com | Pay → pay.modfolio.io | Axiom → axiom.modfolio.io |
| Fortiscribe → fortiscribe.com | Docs → docs.modfolio.io | Studio → studio.modfolio.io |

**하단 법적 고지:**
- 모드폴리오 · 대표 김동헌 · 사업자등록번호 104-95-65636 · 통신판매업 제2025-수원팔달-0953호
- 출판사 제2024-000037호 · 경기도 수원시 팔달구 효원로 278, 6층 602호 · contact@modfolio.io
- © 2026 Modfolio. All rights reserved.

---

## 페이지별 텍스트

### `/` — 홈

#### Hero

> **교육이**
> **달라져야 할 때**
>
> 학원 관리, 스피킹 연습, 작문 첨삭 —
> 따로 노는 도구들 사이에서 시간을 낭비하고 있습니다.
>
> Works가 하나로 연결합니다.
>
> [시작하기] → edu.modfolio.io
> [앱 둘러보기] → /apps

#### AppHighlight

> **교육 앱**
>
> (앱 3개 카드 — 각각 apps.ts의 name, tagline, description 표시)
> [자세히 보기 →] → /apps#naviaca, /apps#gistcore, /apps#fortiscribe

#### SocialProof

> **Modfolio 생태계**
>
> **3** 교육 앱
> **1** 통합 로그인
> **Edge** 글로벌 배포
>
> Modfolio Connect SSO로 안전하게 보호됩니다

#### CTA

> **교육의 미래를 지금 시작하세요**
>
> Modfolio Connect 계정으로 1분 안에 시작
>
> [시작하기] → edu.modfolio.io

---

### `/about` — 소개

#### Mission

> Our Mission
>
> **교육의 미래를**
> **연결합니다**

#### Works가 하는 일

> Modfolio Works는 교육 현장의 문제를 기술로 해결하는 그룹입니다. 학원 운영 플랫폼 Naviaca, AI 스피킹 연습 앱 GistCore, AI 작문 첨삭 앱 Fortiscribe — 세 가지 앱이 하나의 계정 체계 아래 유기적으로 연결됩니다.
>
> 학원 원장은 Naviaca에서 학생을 관리하면서 GistCore와 Fortiscribe의 학습 데이터를 한눈에 확인합니다. 학생은 하나의 계정으로 스피킹 연습과 작문 첨삭을 오가며 영어 실력을 쌓습니다. 따로 노는 도구들 사이의 비효율을 없앱니다.

#### 생태계 구조

> Modfolio — 생태계 모회사
> **Works** — 교육 그룹
> Naviaca · GistCore · Fortiscribe — 교육 앱

#### 우리가 믿는 것

| 제목 | 설명 |
|------|------|
| 기술은 교육을 방해하지 않는다 | 좋은 교육 도구는 보이지 않습니다. 교사와 학생이 도구를 의식하지 않고 본질에 집중할 수 있도록 설계합니다. |
| 데이터는 학생의 것이다 | 학습 데이터의 소유권은 학생과 교육기관에 있습니다. 투명한 데이터 정책으로 신뢰를 쌓습니다. |
| 연결은 곧 가능성이다 | 학원 운영, 스피킹, 작문이 하나의 계정으로 연결될 때 교육의 전체 그림이 보입니다. |

---

### `/apps` — 교육 앱

#### 히어로

> Modfolio Works
>
> **교육 앱**
>
> 학원 운영, AI 스피킹, 작문 첨삭 — 교육에 필요한 모든 것을 하나의 계정으로.

#### 앱 섹션 (× 3)

각 앱마다:
- 이니셜 아이콘 (N / G / F)
- **앱 이름** + tagline
- outcome 텍스트
- 도메인 필 (naviaca.com / gistcore.com / fortiscribe.com)
- description 전문
- 상태 뱃지: **운영 중** (active) 또는 **출시 준비 중** (landing)
- [앱 방문하기 →] → 각 앱 URL

| 앱 | 상태 뱃지 |
|----|----------|
| Naviaca | 운영 중 |
| GistCore | 운영 중 |
| Fortiscribe | 출시 준비 중 |

---

### `/faq` — 자주 묻는 질문

#### 히어로

> FAQ
>
> **자주 묻는 질문**
>
> Modfolio Works와 교육 앱에 대해 궁금한 점을 모았습니다.

#### 아코디언 (8개)

| # | 질문 | 답변 |
|---|------|------|
| 1 | Modfolio Works는 무엇인가요? | Modfolio Works는 교육 분야에 특화된 앱 그룹입니다. 학원 운영 플랫폼 Naviaca, AI 스피킹 연습 앱 GistCore, AI 작문 첨삭 앱 Fortiscribe — 세 가지 앱이 하나의 계정 체계 아래 연결되어 교육의 전체 경험을 하나로 만듭니다. |
| 2 | 각 앱은 따로 가입해야 하나요? | 아닙니다. Modfolio Connect SSO로 한 번만 가입하면 Works 그룹의 모든 앱을 이용할 수 있습니다. 이메일, 소셜 로그인, 패스키 등 다양한 인증 방식을 지원합니다. |
| 3 | Naviaca는 어떤 학원에 적합한가요? | 규모에 관계없이 모든 학원에 적합합니다. 학생 관리, 수업 편성, 출석, 성적, 결제까지 학원 운영에 필요한 모든 기능을 제공합니다. 특히 여러 반을 운영하는 어학원이나 보습학원에서 효과적입니다. |
| 4 | GistCore의 AI 튜터는 어떻게 작동하나요? | GistCore는 OPIc 시험의 실전 시나리오를 기반으로 AI와 대화 연습을 합니다. 발화 분석, 문법 교정, 표현 추천 등 즉각적인 피드백을 제공하여 스피킹 실력을 체계적으로 향상시킵니다. |
| 5 | Fortiscribe는 어떤 언어를 지원하나요? | 영어와 한국어 작문을 지원합니다. AI가 문법, 구조, 논리, 표현을 다각도로 첨삭하며, 반복 훈련을 통해 글쓰기 실력을 측정 가능하게 향상시킵니다. |
| 6 | 가격 정책은 어떻게 되나요? | 각 앱은 독립적인 가격 정책을 운영합니다. 앱별 상세 가격은 각 앱의 공식 사이트에서 확인할 수 있습니다. 학원 단위 도입 시 Works 그룹 통합 요금제도 준비 중입니다. |
| 7 | 데이터는 안전한가요? | 모든 앱은 Cloudflare의 글로벌 엣지 네트워크에서 운영되며, 데이터는 암호화되어 전송 및 저장됩니다. Modfolio Connect SSO를 통한 인증으로 계정 보안을 강화하며, 데이터 소유권은 사용자에게 있습니다. |
| 8 | 학원에서 도입하려면 어떻게 하나요? | Modfolio Connect 계정을 생성한 후 각 앱에 로그인하면 바로 사용할 수 있습니다. 학원 단위 도입 및 커스터마이즈가 필요한 경우 contact@modfolio.io로 문의해주세요. |

---

## 미사용 컴포넌트

| 컴포넌트 | 상태 | 비고 |
|----------|------|------|
| `AppShowcase.astro` | 미사용 | 영문 상태 텍스트 ("Active"/"Coming Soon"), `/apps` 페이지가 인라인으로 대체 |
| `FAQ.astro` (컴포넌트) | 미사용 | 4개 항목만 포함, `/faq` 페이지가 8개 항목 인라인으로 대체 |

---

## 외부 링크 맵

| 대상 | URL | 사용 위치 |
|------|-----|----------|
| 시작하기 (CTA) | https://edu.modfolio.io | Hero, Nav, CTA, 모바일 드로어 |
| Naviaca 랜딩 | https://naviaca.com | Nav, Footer |
| Naviaca 앱 | https://app.naviaca.com | /apps 페이지 |
| GistCore 랜딩 | https://gistcore.com | Nav, Footer |
| GistCore 앱 | https://app.gistcore.com | /apps 페이지 |
| Fortiscribe 랜딩 | https://fortiscribe.com | Nav, Footer |
| Fortiscribe 앱 | https://app.fortiscribe.com | /apps 페이지 |
| Modfolio On | https://on.modfolio.io | Nav |
| Connect | https://connect.modfolio.io | Nav, Footer |
| Pay | https://pay.modfolio.io | Nav, Footer |
| Docs | https://docs.modfolio.io | Nav, Footer |
| LS | https://ls.modfolio.io | Footer |
| Axiom | https://axiom.modfolio.io | Footer |
| Studio | https://studio.modfolio.io | Footer |
| Instagram | https://instagram.com/modfolio.io | Footer |
| LinkedIn | https://linkedin.com/company/modfolio | Footer |
| YouTube | https://youtube.com/@modfolio | Footer |
