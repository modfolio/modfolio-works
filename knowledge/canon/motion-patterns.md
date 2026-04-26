---
title: Motion Patterns
version: 1.0.0
last_updated: 2026-03-27
source: [.claude/skills/motion-patterns/SKILL.md]
sync_to_siblings: true
applicability: always
consumers: [motion-patterns, component, design, design-critic]
---

# Motion Patterns — Canonical Reference

> 물리 기반 모션을 권장하되, 브랜드 성격에 따라 linear, ease-in-out 등 전통적 easing도 유효하다. Brand Passport에 명시된 모션 철학이 우선한다.

## 스프링 물리 파라미터

| 파라미터 | 범위 | 효과 |
|---------|------|------|
| `stiffness` (장력) | 100~300 | 높을수록 빠르고 날카로운 반응 |
| `damping` (마찰) | 10~30 | 높을수록 진동 없이 안착 |
| `mass` (질량) | 1~3 | 높을수록 무겁고 느린 반응 |

## SvelteKit 기본 도구 (추가 의존성 없음)

```svelte
<script>
  import { spring, tweened } from 'svelte/motion';

  const coords = spring({ x: 0, y: 0 }, {
    stiffness: 0.1,
    damping: 0.5
  });
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

**간격**: 60-120ms가 자연스러움. 200ms 이상은 느리게 느껴짐.

## 프레임워크별 도구

| 프레임워크 | 기본 도구 | 추가 라이브러리 |
|-----------|----------|---------------|
| Svelte | `svelte/motion`, `svelte/transition`, `svelte/animate` | — |
| Solid | CSS transitions | `solid-transition-group` |
| Astro | CSS `@keyframes` + `animation-delay` | — |

## 성능 참고 (권장이지 강제 아님)

1. Compositor 레이어에 머무는 `transform` / `opacity` 애니메이션이 일반적으로 60fps 확보에 유리
2. `width` / `height` / `top` / `left` 같은 Layout 속성 애니메이션은 리플로우 유발 가능성
3. `will-change: transform` 남용 시 메모리 비용 (필요할 때만)
4. 고급: rAF + translate3d 직접 조작으로 성능 극대화 가능

어떤 속성을 애니메이션할지는 앱의 모션 철학 + 성능 요구에 따라 결정. critic은 속성 선택에 FAIL을 주지 않는다.

## 접근성 MUST (prefers-reduced-motion) — WCAG 정합

이건 접근성 법적 표준이므로 강제 유지:

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

## 물리 엔진 (랜딩 페이지 한정)

SaaS 핵심 UI에는 비권장. 랜딩 히어로/인터랙티브 데모에 한해 시도.

| 엔진 | 상태 (2026-03) | 장점 | 단점 |
|------|---------------|------|------|
| Matter.js | 유지보수 모드 (v0.20.0) | 안정, 풍부한 예제 | 87KB |
| Rapier.js | 활발 (Rust→WASM) | 고성능, SIMD | WASM 번들 |
| Planck.js | 안정 (Box2D 포트) | 결정론적 | 활동 보통 |

B2B 랜딩 인터랙티브 데모: 전환율 **12.3%** vs 정적 4.7% (2025 데이터, 랜딩 페이지 한정 수치).
주의: 모바일 중저가 기기에서 성능 문제 가능.
