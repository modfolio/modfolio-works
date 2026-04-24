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
2. 각 연결 프로젝트의 `knowledge/feedback-pending/*.md` 를 `<ecosystem>/feedback/<repo>/feedback-pending/` 로 mirror (Phase C, v2.12). **host sibling layout 필요** — Dev Container 내부에서는 skip. mtime 기반 idempotent (같은 파일은 덮어쓰지 않음). 원본은 그대로 두고 **복사만** — member owner 가 자기 파일 언제 archive 할지 결정.
3. framework/db 불일치 경고 (report-only)
4. ecosystem-report + feedback-archive 실행
5. 변경 리포트 출력

> Mirror 대상 파일: `<parent>/<repo>/knowledge/feedback-pending/*.md`. 해당 디렉토리가 없으면 silent skip.

## Automation 경계 (hub 철학)

이 skill은 **연결 프로젝트의 실제 상태를 ecosystem 메타에 mirror**하는 것이 주 역할이다.
- ✅ 연결 프로젝트에서 관측된 값을 ecosystem 에 반영 (state mirror)
- ❌ 연결 프로젝트 파일을 직접 수정하지 않음 (enforcement 아님)
- ❌ SDK 업그레이드 등 decision을 연결 프로젝트에 강요하지 않음
- ✅ feedback-pending *.md 는 복사만 — 원본은 member 쪽에 그대로 남음

`--dry-run`으로 어떤 metadata가 갱신될지 미리 보고, 결과는 report-only.
실제 연결 프로젝트의 상태 변경은 owner 결정.

## 언제 사용

- 연결 프로젝트 작업 후 ecosystem에서 종합할 때
- 정기 생태계 점검 시
- harness-pull 전 ecosystem 원본 최신화 시
