---
title: Landing OS — 랜딩 제작 방법론 (참고 가이드)
version: 1.0.0
last_updated: 2026-09-01
source: [owner:immersive-diorama-spatial-web-architecture-2026.md, docs/proposals/20260901-spatial-web-landing-adoption.md]
sync_to_siblings: true
applicability: per-app-opt-in
tier: reference
consumers: []
---

# Landing OS — 랜딩 제작 방법론

> **강제 아님 — 오너 원문(2026-09-01):** *"일종의 가이드로서 모든 프로젝트에 다
> 전수 하고 싶긴 한데, 강요는 안했으면 좋겠어. 어디까지나 참고해서 각 앱이 자기
> 스스로 개선을 할 수 있도록."* 게이트 없음. 각 앱의 브랜드·보이스·구현은 자율이다.

## 왜 이 문서가 있나

기능 목록을 바로 랜딩으로 바꾸면 「화려한데 무슨 서비스인지 모르는」 페이지가 나온다.
문제는 디자인이 아니라 **정보 구조가 정리되기 전에 화면으로 넘어가는 것**이다.
그래서 랜딩은 다음 파이프라인으로 만든다 — 각 단계는 이전 단계의 산출물만 입력으로 받는다:

```
Product Facts → User Need → Positioning → Message Map
→ IA → Wireframe → Copy → Visual System → Motion → Code
```

## 1. Product Facts — 과장 없는 사실 추출

```
What it is / Primary users / Problems it addresses /
Current capabilities / What makes it different /
Things it does NOT do / Current limitations
```

- ✗ "강력한 AI 기반 통합 플랫폼" → ✓ "업로드된 서류에서 강사명과 학교명을 추출한다"
- **NOT do / limitations 를 비우지 않는다** — 이 두 칸이 카피의 과장을 막는 근거다.

## 2. User Need — WHO · JOB · WHY

누가 오는가 / 무엇을 하려고 오는가 / 기존 방식의 무엇이 불편한가. 세 줄이면 된다.

## 3. Positioning — WHAT · WHO · OUTCOME 한 문장

- ✗ "차세대 AI 기반 올인원 운영 플랫폼"
- ✓ "프로그램 일정, 인력, 서류를 한곳에서 관리하세요."
- **이 문장은 오너 확인 항목이다** — 법적·브랜드 진술이라 AI 초안 뒤 사람이 확정한다.

## 4. Message Map — 기능을 Mental Bucket 으로

기능 N개를 카드 N장으로 펼치지 않는다. **3개 이하의 의미 단위**로 묶고, 각 pillar 는
「사용자가 얻는 결과」가 제목이고 기능은 그 아래 근거로만 온다.

## 5. IA — Information Scent

메뉴명은 멋진 말이 아니라 **목적지가 예측되는 말**: ✗ Explore·Discover·More →
✓ Pricing·For Schools·API Documentation. (우리 실측 사례: folio 세션 제목이
상태 문자열 "Completed session" 이던 것 — 같은 부류다.)

## 6. 페이지 구조 — 방문자의 질문 순서대로

```
뭐지? → 나랑 관련 있나? → 뭐가 좋아지지? → 어떻게 작동하지?
→ 기존과 뭐가 다르지? → 믿을 만한가? → 어떻게 시작하지?
```
= HERO → PROBLEM → VALUE → HOW → CAPABILITIES → USE CASE → PROOF → CTA.
전부 넣을 필요 없다 — 답이 없는 섹션은 빼는 것이 맞다.

## 7. Wireframe First + Headings-only Test

색·모션 전에 텍스트 와이어프레임. **본문을 다 지우고 헤딩만 읽어도 서비스가
이해되면 통과** — 색을 빼서 이해가 안 되면 정보 구조가 약한 것이다.

ⓘ **이 축은 이미 자동으로 잰다** — 허브의 `verify:landing-clarity` 가 레지스트리의
라이브 랜딩을 훑어 `brand-h1`(h1 이 브랜드명뿐) · `empty-heading`(무내용 제목:
「핵심 기능」·「서비스」·「PROGRAMMES」류)을 보고한다. 2026-08-30 실측에서
**금칙어 적중은 14곳 중 1건뿐**이었고 진짜 실패는 «과장된 형용사»가 아니라
**«내용 없는 명사»**였다 — 그래서 §8 금칙어만 지키면 통과라고 읽으면 안 된다.
자기 랜딩을 재려면 허브에 물어보면 된다(보고 전용 · 강제 아님).

## 8. 카피 금칙어 (AI 초안 프롬프트에 주입)

```
혁신적인 · 강력한 · 스마트한 · 차세대 · 완벽한 · 원활한
seamless · revolutionary · powerful · all-in-one · game-changing
unlock · supercharge · effortlessly
```
대신 **구체적 명사 · 구체적 동사 · 사용자가 얻는 변화**. 프레임워크(FBO·PAS 등)는
[[landing-copywriting]] 참조 — 그쪽도 참고 전용이다.

## 9. Visual/Motion 층 — 구조가 선 뒤에만

- 토큰 **구조**(Typography 롤 · 4px spacing · radius · width 롤)는 이 문서가 이름을
  제안하고 **값은 각 앱이 정한다** (House of Brands — tap-expand 판례와 같은 축).
- 공용 마케팅 컴포넌트 npm 은 만들지 않는다. 섹션 어휘(Hero·FeatureRows·Steps·
  Pricing·FAQ·CTA)와 variant 상한(예: Hero = centered|split|screenshot)만 공유한다.
- 모션 예산: 단순(fade·reveal·light parallax) = **CSS scroll-driven, PE 전용**
  (Firefox 안정판 미지원 2026-09 실측 — 없어도 성립해야 한다) · 시네마틱 = GSAP
  (2025-04부터 전 플러그인 상용 무료) · 페이지 전환 = View Transition **same-document 만**
  (cross-doc 미Baseline). 3D/공간 연출은 그룹 허브(modfolio.io)의 축 — 앱 랜딩이
  따라 하면 House of Brands 차별화가 죽는다.
- §성능·접근성은 타협 축이 아니다: HTML 텍스트 · 키보드 · reduced-motion ·
  모바일 폴백 · LCP 예산. 몰입 연출은 「두 번째 스크롤에도 남는가」로 판정한다.

## 산출물 보관 관례 (권고)

각 앱 repo `docs/landing-os/` 아래 `product-facts.md` · `message-map.md` ·
`wireframe.md` — 카피보다 **먼저** 커밋한다. 다음 랜딩 개편 때 이 파일부터 갱신.

## 관련

- [[landing-copywriting]] — 카피 프레임워크 (참고 전용)
- `docs/proposals/20260901-spatial-web-landing-adoption.md` — 이 canon 의 도입 검토·기술 검증
- 원전: 오너 문서 `immersive-diorama-spatial-web-architecture-2026.md` §1–6·§40–42
