---
title: Fleet Harness Propagation — 안전 전파 runbook (pull-first · dirty-skip · opt-out)
version: 1.0.0
last_updated: 2026-06-18
source: [2026-06-18 v3.13 velocity fleet 전파(27 repo) 실전 gotcha + harness-propagate-all.sh]
sync_to_siblings: true
applicability: conditional
consumers: [ops, harness-pull, release]
---

# Fleet Harness Propagation — 안전 전파 runbook

> **harness release 를 전 fleet 에 적용하는 절차. ecosystem 은 강제하지 않는다(Hub-not-enforcer) — `harness-propagate-all.sh` 는 owner(=사용자)가 명시 호출할 때만, 동시 작업·opt-out 을 존중하며 돈다. cron/hook 자동화 금지.**

`applicability: conditional` — major/minor harness release 의 fleet 정합 이벤트에만. 평시엔 SessionStart drift 안내(advisory) + 각 repo 자율 pull 로 충분.

## 0. 전제 — 강제 아님

- velocity 의 **핵심 가치(velocity-clean, 토큰·지연 0)는 functional**. 버전 숫자 완전 일치는 cosmetic — 동시 작업 중인 repo 와 싸우면서까지 강제하지 않는다.
- 전파 주체는 끝까지 **sibling 자신**(그들이 pull). ecosystem 은 도구 제공 + 사용자가 실행.

## 1. 진단 (read-only, 먼저)

```bash
bun run harness:report           # declared/installed/state 표 (current·behind·no-harness)
```
+ repo 별 tree 상태(clean/dirty) + branch + origin 동기(ahead/behind) 확인. dirty/diverged repo 를 식별해 전파 전략을 가른다.

## 2. 전파 모드 (escalate)

`scripts/ops/harness-propagate-all.sh` (default dry-run):
- `--dry-run` — sibling 미변경(no bun add). 단 stale repo 는 *구* harness-pull 을 돌려 신버전 효과를 못 보여줌(한계).
- `--apply` / `--apply-commit` / `--apply-commit-push` — 설치+apply (+commit) (+push).
- `--version=X.Y.Z`(기본 harnessLatest) · `--skip=repo1,repo2`.

## 3. gotcha (실전 — 반드시 가드)

1. **upstream tracking 부재** → `git push`(무인자) 거부. **`git push -u origin <branch>`** 로 push + tracking 설정(양쪽 mirror 포함).
2. **stale-base divergence** → propagate-all 이 stale 로컬 위에 adopt commit 하면 origin(사용자 신규 commit) 과 divergent. **각 repo `git pull --ff-only` 선행**(pull-first). ff 실패 = active/diverged → skip.
3. **dirty working tree (WIP)** → blind `git add -A` 가 사용자 WIP 를 harness commit 에 휩쓸어 넣음. **`git stash push -u` → adopt → commit → push → `git stash pop`**. pop conflict 시 WIP 는 stash 에 안전(`git stash list`).
4. **harness-managed 파일 로컬 수정** → athsra 처럼 sibling 이 `.claude/hooks/*`·canon 을 직접 고친 경우 adopt 가 clobber. **skip + 그 개선을 canonical 로 역흡수**(아래 §5).
5. **opt-out repo** → `harness-lock.json {autoPull:false}` 또는 active 개발 repo 는 **skip**(self-managed 예외, 결함 아님).
6. **jq false 함정** → `.autoPull // "—"` 는 `false` 도 default 반환(`//` 가 null+false 빈값 취급). 손실로 오인 말 것.

## 4. 권장 절차 (safe sweep)

```text
clean+synced repo: git pull --ff-only → adopt-harness.sh --apply → git add -A → commit → git push -u origin <br>
dirty(WIP) repo:   git stash -u → (위 adopt) → git push → git stash pop  (pop conflict → WIP in stash, 수동)
active/diverged:    git reset --hard origin/main 으로 사용자 작업 존중(내 cosmetic commit 폐기) 후 재시도 OR skip
opt-out/locked:     skip (사용자에게 1줄 안내: 각 repo 에서 adopt-harness.sh --apply)
```
adopt 후 검증: `settings.json` velocity(2 가드)·agent Stop 훅 0·`velocity-mode.md` 존재.

## 5. 역흡수 (sibling → canonical)

전파 중 sibling 이 **일반 버그를 직접 고친 것**(예: athsra hook-path 절대화·payment-guard 오탐, connect 진단)은 canonical 로 끌어올린다 — ecosystem 의 핵심 가치(정확한 권위 지식). general vs repo-specific 분류 후 general 만 흡수 + 회귀 test + canon 문서화. athsra_run 류 repo-전용 코드는 local 유지.

## 6. troubleshooting / rollback

- 전파 후 sibling 이상 → 그 repo `git revert <chore(harness) sha>` (각 repo 자율 복구, solo-main).
- ecosystem 측 publish 되돌림 → 이전 version 재publish(npm dist-tag) — 단 fleet 은 이미 받았을 수 있으니 patch-forward 권장.
- 낙오 repo 식별 → `bun run harness:report` (behind 목록).

## 관련

- `knowledge/canon/evergreen-principle.md` §v2.5 — session-open advisory·autoPull opt-in
- `knowledge/canon/velocity-mode.md` — hook 프로필(velocity/strict)
- `knowledge/canon/solo-main-workflow.md` — 전환 트리거(velocity↔strict)
- `scripts/ops/harness-propagate-all.sh` · `scripts/ops/adopt-harness.sh` · `scripts/ops/harness-adoption-report.ts`
- journal `20260618-harness-v3.13-velocity-fleet-propagation.md` — 본 runbook 의 case study
