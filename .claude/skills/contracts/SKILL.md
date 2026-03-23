---
description: Zod 이벤트 계약 스키마 가이드. ModfolioEventBase + discriminated union + 버전 관리 + breaking change 영향 분석
effort: medium
allowed-tools: Read, Glob, Grep
user-invocable: true
---


# Skill: 이벤트 계약

## Auto Context
@contracts/events/index.ts
@ecosystem.json

앱 간 데이터 교환을 위한 Zod 스키마 이벤트 계약 가이드.

## 패키지

- **이름**: `@modfolio/contracts` (GitHub Packages)
- **레지스트리**: `https://npm.pkg.github.com`
- **소스**: `modfolio-universe/contracts/`

## 기본 구조

```typescript
import { z } from 'zod'

export const ModfolioEventBase = z.object({
  event_id: z.string().uuid(),
  event_type: z.string(),
  event_version: z.string(),        // "1.0.0"
  timestamp: z.string().datetime(),  // ISO 8601
  source_app: z.string(),           // "naviaca", "gistcore"
  source_env: z.enum(['dev', 'stg', 'prd']),
  user_id: z.string().uuid(),       // Connect SSO user ID
  payload: z.record(z.unknown()),
})
```

## 사용법

```typescript
import { parseModfolioEvent, type ModfolioAnyEvent } from '@modfolio/contracts'

// Webhook 엔드포인트에서 이벤트 파싱
const result = parseModfolioEvent(req.json())
if (result.success) {
  const event = result.event
  if (event.event_type === 'course.completed') {
    // TypeScript가 payload 타입 자동 추론
    console.log(event.payload.course_id)
  }
}
```

## 등록된 이벤트 타입

| event_type | 발생 앱 | 설명 |
|-----------|--------|------|
| `course.completed` | naviaca | 수업/과정 완료 |
| `speaking.session.completed` | gistcore | 스피킹 세션 완료 |
| `writing.submission.reviewed` | fortiscribe | 작문 첨삭 완료 |
| `itinerary.confirmed` | keepnbuild | 여행 일정 확정 |
| `goal.achieved` | worthee | 목표 달성 |
| `ride.boarded` | amberstella | 셔틀 탑승 |
| `document.converted` | munseo | 문서 변환 완료 |
| `audio.converted` | umbracast | 오디오 변환 완료 |
| `form.submitted` | sincheong | 폼 제출 완료 |
| `ebook.purchased` | modfolio-press | eBook 구매 |
| `newsletter.subscribed` | modfolio-press | 뉴스레터 구독 |
| `payment.completed` | modfolio-pay | 결제 완료 |

## 새 이벤트 추가 체크리스트

1. `contracts/events/`에 Zod 스키마 정의 추가
2. `contracts/events/index.ts`에 export 추가
3. `bun run schema-impact` 실행 -> 영향받는 앱 확인
4. 자회사 앱에서 이벤트 발생 로직 구현
5. Modfolio App Webhook 핸들러에 새 이벤트 타입 추가
6. 양쪽 dev 환경에서 E2E 테스트

## Breaking Change 규칙

- 기존 이벤트의 breaking change는 `event_version` 올림 필수
- 필드 추가는 OK (optional로)
- 필드 삭제/타입 변경은 새 버전으로
- 영향받는 앱 목록을 plan/review 문서에 명시
