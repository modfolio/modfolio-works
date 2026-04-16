---
name: feedback-collect
description: 연결 프로젝트 피드백을 종합하여 ecosystem.json과 지식을 최신화. 피드백 종합 시 사용
user-invocable: true
---

# /feedback-collect

**이 스킬은 스크립트를 실행하는 것이 전부다.**

## 실행

```bash
bun run feedback-collect            # 피드백 종합 + ecosystem 갱신
bun run feedback-collect --dry-run  # 변경 미리보기
```

## 스크립트가 하는 일

1. 전체 pull-manifest.json + feedback.json 수집
2. ecosystem.json SDK 버전 정보 반영 (연결 프로젝트 상태 mirror)
3. knowledge/projects/ SDK 버전 정보 반영 (연결 프로젝트 상태 mirror)
4. framework/db 불일치 경고 (report-only)
5. aggregate-feedback + ecosystem-health 실행
6. 변경 리포트 출력

## Automation 경계 (hub 철학)

이 skill은 **연결 프로젝트의 실제 상태를 universe 메타에 mirror**하는 것이 주 역할이다.
- ✅ 연결 프로젝트에서 관측된 값을 universe에 반영 (state mirror)
- ❌ 연결 프로젝트 파일을 직접 수정하지 않음 (enforcement 아님)
- ❌ SDK 업그레이드 등 decision을 연결 프로젝트에 강요하지 않음

`--dry-run`으로 어떤 metadata가 갱신될지 미리 보고, 결과는 report-only.
실제 연결 프로젝트의 상태 변경은 owner 결정.

## 언제 사용

- 연결 프로젝트 작업 후 universe에서 종합할 때
- 정기 생태계 점검 시
- harness-pull 전 universe 원본 최신화 시
