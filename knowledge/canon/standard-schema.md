---
title: Standard Schema Spec — validation library portability
version: 1.0.0
last_updated: 2026-05-24
source: [2026-05-24 app-stack 신기술 평가 — Zod 4 vs Valibot vs Standard Schema spec, zod.dev/v4, standardschema.dev]
sync_to_siblings: true
applicability: per-app-opt-in
consumers: [contracts, api, api-builder, schema]
---

# Standard Schema — Validation library portability

> 2025-12 공개된 validation library interop spec. **Zod 4** 와 **Valibot** 둘 다 구현 — 둘 사이 framework portability 확보. universe 의 contracts/ 의 새 스키마는 Standard Schema 호환 라이브러리만 사용.

## TL;DR

```ts
// 어떤 호환 라이브러리든 같은 interface 노출
import type { StandardSchemaV1 } from '@standard-schema/spec';

// Zod 4
import { z } from 'zod';
const userSchema = z.object({ id: z.string(), email: z.email() });
// → userSchema satisfies StandardSchemaV1<{ id: string; email: string }>

// Valibot (drop-in replacement)
import * as v from 'valibot';
const userSchemaV = v.object({ id: v.string(), email: v.pipe(v.string(), v.email()) });
// → userSchemaV satisfies StandardSchemaV1<{ id: string; email: string }>

// Framework (Hono / SvelteKit form actions / oRPC) 가 StandardSchemaV1 만 받으면
// 둘 중 어느 lib 든 동일하게 작동
```

## 왜 이 표준인가

- **vendor lock-in 제거**: Zod 4 → Valibot 으로 1 file 교체 = 전체 lib swap 가능. bundle size sensitive (CF Workers API) 영역만 Valibot, 일반 영역 Zod 유지 가능.
- **Bundle 차이**: Zod 4 v3 대비 57% 감소 + 7-14x parse. Valibot 은 동일 schema 가 90% 더 작음 (login schema 1.37KB vs Zod 17.7KB). 둘 다 7x faster 영역.
- **framework 호환**: Hono / oRPC / SvelteKit form actions / TanStack Form 등이 점차 Standard Schema 만 받는 추세. 향후 framework upgrade 시 자동 호환.

## modfolio universe 채택

### 정책 (constraint)

contracts/ 의 **새 스키마는 Standard Schema 호환 라이브러리만**. 현재 Zod 사용 중 — Zod 3 → Zod 4 마이그 + Valibot 은 bundle sensitive 영역만 (CF Workers public API edge 등) 고려.

### 마이그 우선순위

1. **Zod 3 → Zod 4 (대부분)**: 현 contracts/ 의 `@modfolio/contracts` 패키지 전수 갱신. `bun run schema-impact` 로 영향 분석.
2. **Valibot 검토 영역**: CF Workers API edge 의 body validation (request → response — bundle 1MB 한도 압박 시).
3. **public API 외 일반 영역**: Zod 4 유지 (familiar API + 더 풍부한 type inference).

### 신 스키마 작성 패턴

```ts
// contracts/events/order.created.ts
import { z } from 'zod';

export const orderCreatedSchema = z.object({
  event_type: z.literal('order.created'),
  event_version: z.literal(1),
  payload: z.object({
    order_id: z.uuid(),
    amount: z.number().int().positive(),
    currency: z.enum(['KRW', 'USD']),
    created_at: z.iso.datetime(),
  }),
});

// Standard Schema 보장:
// orderCreatedSchema satisfies StandardSchemaV1<{ event_type: 'order.created'; ... }>
```

framework (Hono / SvelteKit / oRPC) 에서 unconditional 사용 가능.

## Zod 4 의 주요 변화 (v3 대비)

- `z.email()` / `z.uuid()` / `z.url()` — 별도 method (이전 `z.string().email()`)
- `z.iso.datetime()` / `z.iso.date()` — ISO 8601 전용 검증
- `@zod/mini` (1.9KB gzipped) — tree-shakable subset, CF Workers edge 용
- 7-14x faster parsing (object 6.5x, array 7x, string 14x)
- bundle 57% 감소 (v3 약 17KB → v4 약 7KB)
- breaking change 적음 — 대부분 migration codemod 자동

## 정공법 정합

- **장기 시야**: Standard Schema = 2025-12 출범, 2026 framework 채택 가속 — 6-12개월 후에도 유효
- **확장성**: Valibot 외 새 호환 lib 등장 시 (예: ArkType) 동일 패턴으로 흡수
- **에러·경고 0**: Zod 4 의 type inference 가 v3 보다 strict — `as any` 우회 의존 0
- **마이그 경로 명확**: Zod 3 → 4 codemod (`zod-codemod`) + breaking change checklist 공식 제공

## 함정

- **Zod 3 ↔ Zod 4 동시 사용 X**: 한 repo 안에서 메이저 mix 시 type inference 충돌. `bun run schema-impact` 로 전수 갱신 후 한꺼번에 PR.
- **Standard Schema spec 자체 stable, library adoption 시차**: Hono / oRPC 가 따라잡는 데 6개월. 그 동안 library-specific helper 일부 사용.
- **CF Workers bundle 1MB 한도**: Zod 4 / Valibot 둘 다 안에 들어가지만, 여러 스키마 + 다른 dependency 누적 시 압박. `@zod/mini` 또는 Valibot 선택지.

## 관련

- `contracts/events/` — modfolio 이벤트 계약 (전수 Zod 사용)
- `knowledge/canon/drizzle-conventions.md` — Drizzle 의 zod-validation 통합
- `knowledge/canon/tech-trends-2026-05.md` — 본 canon 채택 배경 (Adopt as constraint)
- Standard Schema spec: https://standardschema.dev/
- Zod 4 release: https://zod.dev/v4
- Valibot vs Zod 4 분석: https://www.pkgpulse.com/guides/valibot-vs-zod-v4-typescript-validator-2026
