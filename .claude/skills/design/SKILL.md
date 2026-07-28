---
name: design
description: Canva 단일 클라우드 크리에이티브 + forge(infra) 미디어 소비 파이프라인. 브랜드 납품물 저작 + 토큰 제약 검증. Figma/Paper 미사용(2026-07-26)
user-invocable: true
---

## Auto Context
@knowledge/canon/anti-slop.md
@knowledge/canon/design-tokens.md
@knowledge/canon/typography.md
@knowledge/canon/design-innovation.md

# /design — Canva(클라우드) + forge(로컬 미디어) 디자인 파이프라인

> 이 스킬은 **구현 파이프라인**이지 디자인 가이드가 아니다.
> 시각 정체성/스타일 결정은 각 앱의 자율. 캐논은 negative space만 강제한다.

## 도구 (2026-07-26 오너 결정 — canon `design-tooling` v2.0)

| 필요 | 도구 | 입구 |
|---|---|---|
| 브랜드 납품물(소셜 카드·피치덱·PDF) | **Canva** | MCP `canva` (OAuth) |
| 이미지 생성·배경제거·최적화 / 영상 메타·포스터·변환 / 카피·alt | **forge** (infra 소유 — 각 앱은 **소비만**) | MCP `forge` (Bearer) |
| 컴포넌트·토큰·계약 | 각 repo 자기 코드 | 그 repo 의 빌드·린트 경로 |

**Figma·Paper 는 미사용(보류)** — 폐기가 아니라 운영 중단이다. 계정·파일은 유지되고 절차 문서도
참조용으로 보존한다. 아래 §"Canvas to Code" 의 Figma 절차는 그에 따라 **보류 상태**다.

> 이 결정은 modfolio-design 이 SoR 을 소유한 canon `design-tooling.md` v2.0.0 에서 나왔다.
> 도구 선택은 universe 공통 결정이고, **경로·파일 배치는 각 repo 자율**이다.

## Canva MCP — 표면 실측 (2026-07-27, modfolio-design)

도구를 켜기 전에 알아두면 헛수고를 던다. design 이 실제로 밟아보고 공유한 것:

- **`generate-design-structured` 는 존재하지 않는다** (그들 문서의 기대값 오류였다).
- **편집은 된다** — `start-editing-transaction` → `perform-editing-operations` →
  `commit-editing-transaction`(+ `cancel-…`). *"Connect API 는 템플릿+autofill 중심이라 요소
  편집은 보장 안 됨"* 이라는 통념은 현재 MCP 표면에서는 **틀렸다**.
- **브랜드 템플릿이 계정 전체 0건** — 도구는 있는데 입력이 없다. 그래서
  `create-design-from-brand-template`·autofill 경로는 **오늘 못 쓴다.** 지금 되는 건
  `generate-design`(브리프→디자인) + 편집 + `export-design`.
- **브랜드킷의 색·폰트 값은 MCP 로 못 읽는다** — `list-brand-kits` 는 id·name·thumbnail 만 준다.
  킷 상세 도구가 없어 **"Canva 킷 색 ↔ 우리 토큰" 자동 정합 검사는 불가**다.
  ⚠ 이걸 모르고 검사기를 설계하면 중간에 막힌다.

## 영상 생성은 아직 없다

forge 는 `video.metadata` / `video.poster` / `video.transcode` 만 제공한다(**생성 없음**).
브랜드 영상이면 Canva, 진짜 생성이 필요하면 **infra 에 capability 신설이 정공법** —
여기서 우회 구현하지 않는다(assembly-law: 재사용은 contracts·MCP·endpoint 3표면으로만).

## Step 0: Design Brief (선택적 자가 점검)

여러 변형을 탐색하고 싶을 때 사용. 단일 안에 만족하면 생략 가능.
강제로 작성을 요구하지 않는다.

1. **Purpose** — 이 화면/컴포넌트의 고유한 목적
2. **Feeling** — 사용자가 느껴야 할 감정/분위기
3. **Differentiation** — 기존 화면과 차별화되는 포인트

상세: [canon/design-innovation.md](../../knowledge/canon/design-innovation.md)

## 프로세스

1. **입력 수집** — 디자인 요구사항 (Figma URL 경로는 보류 — 위 §도구)
2. **토큰 확인** — `/design-tokens`로 사용 가능한 토큰 팔레트 확인
3. **구현** — 토큰 제약 내 컴포넌트/페이지 구현
4. **검증** — `design-critic` agent로 negative-space 검증 (binary FAIL/PASS)
5. **반복** — FAIL 위반 0건이 될 때까지

## 검증 기준 (negative space만)

[canon/anti-slop.md](../../knowledge/canon/anti-slop.md) Hard FAIL 3개:

1. 하드코딩 색상/간격 (`var()` 밖에서 oklch/hex/rgb 사용)
2. WCAG AA 미달
3. 인접 앱과 시각적 indistinguishable

위 외의 디자인 선택(레이아웃, 비율, 모션, 색감, 폰트, 형태 등)은 작성자 자율.
"Spacing Rhythm 4px/8px 그리드", "Component Consistency 재사용 우선" 같은 처방을
스킬이 강제하지 않는다 — 이런 가이드 자체가 슬롭의 원인.

### 대비(contrast) 는 한 층으로 검증되지 않는다

WCAG AA 는 위 Hard FAIL 2번이라 floor 인데, **"검사했다"는 느낌은 도구 하나로 쉽게 생긴다.**
서로 대체 불가능한 층이 최소 셋이다 (modfolio-design 2026-07-27 실측):

| 층 | 잡는 것 | 못 잡는 것 |
|---|---|---|
| 토큰 매트릭스 (결정적) | 어느 화면에도 아직 안 그려진 조합 | 렌더 시에만 생기는 조합 |
| 로컬 axe (렌더) | 실제로 그려진 요소 | 데이터가 없어 안 그려진 요소 |
| 라이브 axe (실데이터 렌더) | 실데이터가 있어야 렌더되는 요소 | (가장 느리고 배포 후에만 가능) |

**"그려질 수 있는 것" · "그려진 것" · "실데이터로 그려진 것"은 다른 집합이다.**
하나로 다른 둘을 대체할 수 없다 — 어느 층을 돌렸는지 밝히고, 안 돌린 층은 안 돌렸다고 말한다.

## Canvas to Code (보류 — Figma 미사용)

Figma 를 다시 켜는 repo 를 위해 절차만 남긴다:

- Figma `get_design_context` → 코드 + 스크린샷 + 힌트 반환
- 반환된 코드는 참조용 — 프로젝트 스택에 맞게 적응 필수
- 디자인 토큰 CSS 변수 매핑 우선

## 제약 (토큰 시스템 정합)

- `oklch()`, `#hex`, `rgb()` 직접 사용 금지 → `var(--token)` 필수
- z-index는 명명 표준 사용 (`var(--z-modal)` 등 — 값은 앱 자유)
- 브랜드 정체성 참고: `docs/brand-passport.md` (앱이 자체 정의 — 강제 없음)
