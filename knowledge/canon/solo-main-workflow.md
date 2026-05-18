---
title: Solo main 워크플로 — 무사용자 pre-production ceremony 폐기
version: 1.0.0
last_updated: 2026-05-18
source: [2026-05-18 속도회복 세션 §C, 사용자 명시 결정]
sync_to_siblings: true
applicability: conditional
consumers: [deploy, ops, release, session-handoff]
---

# Solo main 워크플로

> **무사용자 pre-production 1인 개발: main 직접 commit + push. branch/PR/merge ceremony 폐기. 문제 시 `git revert`. 앱에 실사용자 생기면 그 앱만 PR 흐름 재도입.**

`applicability: conditional` — 이 canon 은 **앱 상태가 무사용자(landing/scaffolded/내부 active 이나 외부 사용자 0)** 일 때만 활성. 실사용자 보유 앱은 표준 PR 흐름.

## 결정 (2026-05-18, 사용자 원문)

> "1인 개발이고 결국 다 커밋이 다 기록이 남는데 뭔가 잘못되면 그냥 되돌리면 되잖아? branch를 만들어서 작업할 필요가 있나? 정공법으로 항상 main에서 작업하고 main을 그냥 업데이트 하고 그러면 되는거 아닌가?"

정공법 정합: branch→PR→merge 는 코드 안전이 아니라 **다중 협업자 review 동기화** 장치다. 협업자 0·리뷰어 0 단계에서 그 가치는 0, 비용만 남는다 (per-PR Neon DB 브랜치 + PR-CI fan-out → GitHub Free org 2000분/월을 modfolio-pay 단독으로 소진시켜 org 전체 Actions 마비, 2026-05). git history 가 곧 안전망 — revert 가 근본 복구.

## 표준 워크플로 (무사용자 앱)

1. `main` 에서 직접 작업 → `git add` → `git commit` → `git push`
2. 실수 = `git revert <sha>` 또는 직전 상태 체크아웃. 전부 기록되어 복구 가능
3. branch 생성·PR 생성·merge **하지 않음** (필요·요청 시 예외)
4. 품질: 매 커밋 게이트 없음(`pre-commit-guard` v3.1 비차단). push 시 `pre-push-guard` 가 quality 를 **비차단 표시**. 하드 게이트 = `/release`(`release:gate`) — 실제 ship 시점에만 강제
5. 배포 = CF Workers Builds push-to-deploy(`cf-deploy.md`). cron = CF Cron Trigger. GH Actions 는 수동 publish 만(`gh-actions-policy.md`)

## 사용자 전환 트리거 (이 canon 비활성 → 표준 PR 복귀)

앱이 아래 중 **하나라도** 충족하면 그 앱(만) 표준 PR 흐름·CI 재도입:

- `ecosystem.json` 의 해당 앱이 외부 실사용자 트래픽 보유 (status active + 공개 도메인 + 실유저)
- 결제/PII/인증 등 회귀 시 사용자 피해가 즉시 발생하는 production 경로
- 협업자 2인 이상 합류 (review 동기화 가치 발생)
- 사용자가 해당 앱에 명시적으로 PR 흐름 요청

전환은 **앱 단위**다. 무사용자 sibling 들은 계속 solo main. ecosystem 은 강제하지 않고 트리거 도래를 INFO 로 알릴 뿐(Hub-not-enforcer).

## 안전망 (ceremony 폐기해도 유지)

- `pre-destructive-guard`(v3.1): `rm -rf /`·시스템경로·`git push --force`(main)·시크릿파일 삭제만 차단. 정상 작업 마찰 0, 복구 불가 사고만 방어
- git remote = 영구 백업. push 자주 → 머신 손실에도 안전
- `/release` 가 ship 전 하드 품질 게이트 (정공법 코드품질은 폐기가 아니라 시점 이동)

## Anti-patterns

- ❌ 무사용자 앱에 "관행"으로 feature branch + PR — Neon/CI 비용만 발생
- ❌ ceremony 폐기를 "품질 폐기"로 오해 — quality:all 은 `/release` 에서 그대로 강제
- ❌ 실사용자 생긴 앱을 계속 solo main — 트리거 도래 시 그 앱은 복귀
- ❌ ecosystem 이 sibling 에 PR 흐름 강제 — 권고만(Hub-not-enforcer)

## 관련

- `knowledge/canon/gh-actions-policy.md` — ceremony 가 태우던 GH Actions 비용 근거
- `knowledge/canon/cf-deploy.md` — 배포·cron 의 CF 네이티브 경로
- `knowledge/canon/evergreen-principle.md` — Hub-not-enforcer(앱별 자율 전환)
- `.claude/skills/release/` · `.claude/skills/session-handoff/` — branch 생성 단계 제거 대상
- memory `project_solo-main-workflow`, `feedback_auto-mode-classifier`
