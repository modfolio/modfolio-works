---
name: motion-patterns
description: 스프링 물리 모션 + 접근성 + Matter.js/Rapier.js
user-invocable: true
---

## Auto Context
@knowledge/canon/motion-patterns.md

# Motion Patterns — 스프링 물리 + 접근성

> 생태계 전체의 모션/애니메이션 가이드. CSS ease-in-out 대신 물리 기반 모션 추구.

## 기본 원칙: 스프링 물리

CSS 이징 함수(ease-in, ease-out, ease-in-out)는 시간 기반이라 기계적으로 느껴짐.
스프링 물리는 질량·장력·마찰 기반이라 자연스러운 감각을 줌.

핵심 파라미터:
- `stiffness` (장력): 높을수록 빠르고 날카로운 반응 (100~300)
- `damping` (마찰): 높을수록 진동 없이 안착 (10~30)
- `mass` (질량): 높을수록 무겁고 느린 반응 (1~3)

## SvelteKit 기본 도구 (추가 의존성 없음)

```svelte
<script>
  import { spring, tweened } from 'svelte/motion';
  import { fade, fly, slide, scale } from 'svelte/transition';

  // 스프링 — 대부분의 인터랙션에 적합
  const coords = spring({ x: 0, y: 0 }, {
    stiffness: 0.1,
    damping: 0.5
  });

  // tweened — 타임라인 기반 필요 시
  const progress = tweened(0, { duration: 400 });
</script>
```

95% 케이스에서 `svelte/motion`만으로 충분.

## 순차 등장 패턴

기계적 동시 출현 방지. 자연스러운 시선 유도.

```css
.item { animation: fadeIn 0.5s ease both; }
.item:nth-child(1) { animation-delay: 0ms; }
.item:nth-child(2) { animation-delay: 80ms; }
.item:nth-child(3) { animation-delay: 160ms; }
```

간격: 60-120ms가 자연스러움. 200ms 이상은 느리게 느껴짐.

## 프레임워크별 도구

| 프레임워크 | 기본 도구 | 추가 라이브러리 |
|-----------|----------|---------------|
| Svelte | `svelte/motion` (`spring`, `tweened`), `svelte/transition`, `svelte/animate` | — |
| Solid | CSS transitions | `solid-transition-group` |
| Astro | CSS `@keyframes` + `animation-delay` | — |
| React (참고) | — | Motion (Framer Motion), React Spring |

## 성능 참고 (canon/motion-patterns.md 정합 — 권장이지 강제 아님)

1. `transform` / `opacity` 애니메이션이 Compositor 레이어라 일반적으로 60fps 유리
2. `width` / `height` / `top` / `left` 같은 Layout 속성은 리플로우 유발 가능성
3. `will-change: transform`은 필요할 때만 (남용 시 메모리 비용)
4. 고성능 요구 시: rAF + translate3d 직접 조작

속성 선택은 앱의 모션 철학 + 성능 요구에 따라 결정.

## 접근성 (WCAG 정합)

모든 애니메이션에 적용:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

컴포넌트 단위 (Svelte):

```svelte
<script>
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>
```

## 실험적: 물리 엔진 (랜딩 페이지 한정)

SaaS 핵심 UI에는 비권장. 랜딩 히어로/인터랙티브 데모에 한해 시도 가능.

| 엔진 | 상태 (2026-03) | 장점 | 단점 |
|------|---------------|------|------|
| Matter.js | 유지보수 모드 (v0.20.0, ~17.5k stars) | 안정, 풍부한 예제, 2D 전문 | 마지막 커밋 2024-08, 87KB |
| Rapier.js | 활발 (Rust→WASM, 2026 로드맵) | 고성능, SIMD, GPU 물리 개발 중 | WASM 번들 크기 |
| Planck.js | 안정 (Box2D 포트) | 결정론적, 2D | 활동 보통 |

B2B 랜딩: 인터랙티브 데모 전환율 12.3% vs 정적 4.7% (2025 데이터).
주의: 모바일 중저가 기기에서 성능 문제 가능.
SvelteKit 3D: Threlte (Svelte + Three.js) + Rapier 조합 가능.
