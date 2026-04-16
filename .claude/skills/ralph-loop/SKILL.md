---
name: ralph-loop
description: Ralph Loop 기법. 측정 가능한 완료 기준으로 자율 반복 개선. 생성→검증→수정 사이클
user-invocable: true
---


# /ralph-loop — 자율 반복 개선 루프

이미 설치된 ralph-loop 플러그인을 활용하는 자율 반복 개선 기법.

## 핵심 원칙

- **단순 반복이 아님**: 각 반복에서 수정된 파일 + git 히스토리 + 테스트 결과를 피드백으로 받아 점진적 개선
- **측정 가능한 완료 기준 필수**: 테스트 통과, lint 클린, 타입체크 통과 등
- **`<promise>` 태그**: 완료 선언 메커니즘 — 거짓 선언 방지 내장

## 활용 시나리오

### 테스트 커버리지 확보
```
/ralph-loop "modfolio-pay의 결제 모듈 테스트 커버리지 80% 달성.
모든 API 엔드포인트에 단위 테스트 추가.
완료 기준: bun run test 통과 + 커버리지 80% 이상.
완료 시: <promise>DONE</promise>" --max-iterations 20
```

### 새 앱 스캐폴딩
```
/ralph-loop "새 앱 {name} 스캐폴딩. SvelteKit 5 + Drizzle + Neon 구성.
lint + typecheck + build 모두 통과할 때까지 반복.
완료 시: <promise>SCAFFOLD_COMPLETE</promise>" --max-iterations 30
```

### 대규모 리팩토링
```
/ralph-loop "Svelte 4 → 5 마이그레이션. 모든 export let → $props(),
slot → {@render}, on:click → onclick 변환.
기존 테스트 모두 통과 + bun run check 클린.
완료 시: <promise>MIGRATION_DONE</promise>" --max-iterations 50
```

## 주의사항

- **반드시 `--max-iterations` 설정** (안전 장치)
- 성공 기준이 명확하지 않으면 사용하지 마라
- 디자인 판단이 필요한 작업에는 부적합
- 각 반복의 피드백을 주의 깊게 모니터링
