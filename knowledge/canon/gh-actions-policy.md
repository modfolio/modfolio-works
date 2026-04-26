---
title: GitHub Actions — 최소화 정책
version: 1.0.0
last_updated: 2026-04-17
source: [modfolio-connect 2026-04-16 handoff §4-3]
sync_to_siblings: true
applicability: always
consumers: [deploy, ops]
---

# GitHub Actions — 최소화 정책

> **deploy / cron은 CF Workers Builds + CF cron에 맡긴다. GitHub Actions는 CI 품질 게이트와 외부 패키지 게시에만 쓴다.**

## 배경

연결 프로젝트들이 `.github/workflows/` 폴더를 deploy / scheduled cleanup / cron 용도로 쌓아 올리면서 두 가지 문제를 겪었다:

- **이중 deploy 경로**: GH Actions push 후 CF Workers Builds가 같은 Worker를 다시 build — 경쟁 상태에서 stale 버전이 prod로 올라감
- **cron 중복**: GH Actions schedule + CF native cron trigger 둘 다 등록된 채로 방치 → 같은 작업이 두 번 실행되거나 무음 실패

2026-04-16 modfolio-connect (`9f71d58`, `366bff5`)에서 GH Actions cleanup cron을 제거하고 CF Workers cron으로 일원화.

## 허용되는 workflow

| 분류 | 예시 | 근거 |
|---|---|---|
| PR 품질 게이트 | `ci.yml` — lint/typecheck/test on PR | PR review 대기 중에 병렬 검증 필요 |
| 외부 패키지 게시 | `sdk-publish.yml` — `@modfolio/connect-sdk` release 시 GitHub Packages 게시 | CF Workers가 할 수 없는 작업 |
| 보안 스캔 | CodeQL, Dependabot PR review | GitHub 네이티브 기능 |

## 금지되는 workflow

| 분류 | 근거 |
|---|---|
| `deploy.yml` (wrangler deploy) | CF Workers Builds push-to-deploy로 대체 |
| `cron` schedule | CF native cron trigger (`wrangler.jsonc triggers.crons`)로 이관 |
| 수동 release 버튼 (deploy 목적) | CF Workers Builds git push가 release |

## 이관 체크리스트

- [ ] `.github/workflows/` 안에 deploy / cron workflow가 있는가
- [ ] 같은 작업이 CF Workers Builds / cron으로 가능한가
- [ ] 가능하면 **우선 CF 경로를 설치**, 양쪽이 1주일 나란히 돌며 결과 일치를 확인한 뒤 GH Actions 비활성화
- [ ] `.github/workflows/<deprecated>.yml`은 한 번에 삭제하지 말고 주석으로 "deprecated: replaced by CF cron — remove after <date>" 표기 후 유예 기간 지나면 삭제

## 예외

공용 인프라(universe 자체 cron / cross-repo release triage)가 필요한 경우 예외 인정. 그러나 각 연결 프로젝트의 일반적 배포/스케줄은 CF 네이티브 경로가 기본이다.
