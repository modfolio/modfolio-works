---
name: test
description: 테스트 스위트 생성. Vitest 기반 단위/통합/스키마/API 테스트 커버리지 확보
user-invocable: true
# 2026-09-06 skill:usage — 60일·전 프로젝트(463 전사) 호출 0회 → 모델 목록에서 제외(사용자 /name 은 유지 · 예약 실행 제외). 되돌리기 = 이 두 줄 삭제.
disable-model-invocation: true
---


# /test — 테스트 스위트 생성

대상 모듈 분석 → test-builder agent → 실행 검증

## 프로세스

1. **대상 파일/모듈 식별**
2. **test-builder agent 실행**: 테스트 유형 자동 판별 (단위/통합/스키마/API)
3. **실행 검증**: `bun run test` 통과 확인
4. **실패 시**: 에러 분석 → 수정 → 재실행

## 사용 예시

```
/test — modfolio-connect의 auth middleware 테스트 만들어줘
/test — modfolio-pay의 결제 스키마 검증 테스트 추가
/test — naviaca의 CRM API 엔드포인트 전체 테스트
```
