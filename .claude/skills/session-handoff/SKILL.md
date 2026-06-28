---
name: session-handoff
description: 세션 종료 인계 — 컨텍스트 정리 + journal + 다음 세션 paste-ready prompt + commit/push 까지 한 번에. 다른 머신에서도 이어갈 수 있도록 git remote 에 모든 작업 cement. 단축어 /handoff 도 동일.
user-invocable: true
---

# /session-handoff — 세션 종료 종합 인계

작업 중이든 마무리든, 한 번 호출로 (1) 컨텍스트 정리 → (2) journal 작성 → (3) 다음 세션 paste-ready prompt 생성 → (4) commit + push 까지 끝낸다. **다른 머신 (집/사무실/랩탑) 에서도 이어갈 수 있도록** git remote 에 모든 작업을 cement 한다.

## 언제 사용

- 세션 종료 시 (작업 완료, 또는 중간에 멈춰야 할 때)
- 머신 이동 직전 (집 → 사무실, 데스크톱 → 노트북)
- 컴퓨터 끄기 직전이라도 — 속도보다 충실성 우선

## 언제 사용 X

- 작업 진행 중간 (이건 `/journal` 이 더 적합 — 단일 회상 엔트리)
- 7-30일 스프린트 회고 (이건 `/retro`)
- ecosystem 에 feedback 전송 (이건 `/feedback-send`)

## 사용법

```
/session-handoff                              # 대화형 (슬러그 자동 추론)
/session-handoff "athsra-1x2-d1-token-table"  # 슬러그 명시
/handoff "..."                                # 단축어
```

## 5-Phase 동작 알고리즘

### Phase 0 — Pre-check (5-15초, read-only)

```bash
REPO=$(basename "$(git rev-parse --show-toplevel)")
HOST=$(hostname | tr '[:upper:]' '[:lower:]')
DATE=$(date +%Y%m%d)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
WIP=$(git status --porcelain | wc -l)
REMOTE_AHEAD=$(git rev-list --count "@{u}"..HEAD 2>/dev/null || echo 0)
REMOTE_BEHIND=$(git rev-list --count HEAD.."@{u}" 2>/dev/null || echo 0)
LAST_JOURNAL_HEAD=$(git log -1 --format=%H -- "knowledge/journal/" 2>/dev/null)
```

판정 X. 정보 수집만.

### Phase 1 — 컨텍스트 수집 (15-30초, read-only)

```bash
# 마지막 journal 이후 commit list (없으면 fallback HEAD~20)
SINCE="${LAST_JOURNAL_HEAD:-HEAD~20}"
git log $SINCE..HEAD --format="%h %s" --no-merges
git log $SINCE..HEAD --name-only --format="" | sort -u
git log $SINCE..HEAD --numstat --format=""

# 변경 파일 카테고리 분류 (canon/rules/skills/journal/scripts/apps/code)
# 진행 plan 식별
ls -t ~/.claude/plans/*.md 2>/dev/null | head -3
git log $SINCE..HEAD -- ".claude/plans/" 2>/dev/null

# WIP 파일 분석 (uncommitted)
git status --porcelain | head -20
git diff --stat
git diff --cached --stat
```

### Phase 2 — 사용자 질문 (AskUserQuestion ×2-3)

**Q1 (free-text 1줄)**: "주제 슬러그 (kebab-case, 비워두면 자동 추론)"

**Q2 (single)**: "WIP 처리 방식?" (WIP > 0 일 때만)
- a. **journal+handoff+WIP 같은 commit → main** (기본 — 무사용자 solo-main-workflow.md 표준)
- b. **WIP 별도 commit** (`wip: snapshot {slug}`) → journal+handoff commit (둘 다 main)
- c. **WIP stash** → journal+handoff only commit (다음 세션 stash pop)
- d. **branch 분기** (`git switch -c handoff/{date}-{slug}`) — **실사용자 앱에서만** 권고 (solo-main 트리거 도래 시). 무사용자는 기본 a (main 직접이 표준 — 회피 대상 아님)

**Q3 (single)**: "push 여부?"
- a. **Yes — 다른 머신에서 이어가기** (기본). 무사용자=main 일반 push. 실사용자 앱 분기 시 `-u origin {branch}`
- b. **Branch only** — 실사용자 앱 분기 push (다음 머신 fetch)
- c. **No — 같은 머신만** (다른 머신 이어가기 불가 명시 후 진행)

### Phase 3 — 산출물 작성 (Gate 1: 1번 confirm)

journal + handoff prompt 통합 preview 콘솔 출력 → `y/n/edit`:
- `y` → 두 파일 동시 작성
- `n` → skip (Phase 4 진행 X, 종료)
- `edit` → 사용자 텍스트 입력 받아 재반영

#### Journal 템플릿 (`knowledge/journal/YYYYMMDD-{slug}.md`)

```markdown
# YYYY-MM-DD: {제목 자동 추론 또는 사용자 입력}

## 카테고리
{decision | mistake | discovery | trial-and-error | reference | lesson}

## 태그
#{repo} #{프레임워크} #{기능} ...

## 맥락
{이번 세션 무엇 작업했는가 — commit messages 요약}

## 내용
{Phase 1 commit list + diff 요약}

## 결과
{최종 상태 + HEAD sha + 통과한 검증}

## 관련 파일
- 변경된 canon: {목록}
- 변경된 skill: {목록}
- 새 plan: {목록}
- 다음 세션 인계 prompt: ~/.claude/plans/{repo}-{slug}-handoff.md

---

## 인계 prompt (다음 세션 paste — dual-write)

> 이 섹션은 다른 머신에서 이어갈 때 사용. ~/.claude/plans/ 가 user-local 이므로
> git commit + push 로 동기화되는 journal 안에 임베드.

\`\`\`
{repo} {slug} 다음 세션 시작.

## 현재 상태 ({date} {time} 기준)
### {repo} (~/code/{repo}/)
- HEAD: {sha} {commit subject}
- branch: {branch}
- working tree: {clean | dirty}
- 최근 commits ({since} 이후 N개):
{commit list}

## 변경된 핵심 파일
- canon: {list} | skills: {list} | code: {list}

## 완료된 분기점 (이번 세션)
{commit subject 요약}

## 다음 분기점 — 결정 가이드
{우선순위 N개 — plan/journal 에서 추론}

## 핵심 file 위치
- journal: knowledge/journal/{date}-{slug}.md
- 관련 plan: {plan path 들}

## 첫 명령 권장
\`\`\`bash
cd ~/code/{repo}
git pull --ff-only
git status
head -100 knowledge/journal/{date}-{slug}.md
\`\`\`
\`\`\`
```

#### Handoff prompt 파일 (`~/.claude/plans/{repo}-{slug}-handoff.md`)

위 journal 의 "## 인계 prompt" 섹션을 standalone 파일로 dual-write. user-local 빠른 access 용. 같은 머신 동일 세션 내 반복 호출에 유리.

### Phase 4 — Stage + Commit + Push (Gate 2: 1번 confirm)

```bash
# 1. Stage (Q2 답변 따라)
case $WIP_MODE in
  same-commit)   git add knowledge/journal/$JOURNAL_FILE && git add -A ;;
  separate)      git add -A && git commit -m "wip: snapshot $SLUG" ;;
  stash)         git stash push -u -m "wip-handoff-$SLUG" ;;
  branch-fork)   git switch -c handoff/$DATE-$SLUG && git add -A ;;
esac
git add knowledge/journal/$JOURNAL_FILE  # 항상 journal stage

# 2. Quality gate (가능한 repo 만, 실패 시 사용자 결정)
if [ -f package.json ] && grep -q '"quality:all"' package.json; then
  bun run quality:all || echo "QUALITY GATE FAIL — 사용자 결정 필요"
fi

# 3. Commit message preview → y/n/edit
COMMIT_MSG="docs(journal+wip): $DATE $SLUG"
# preview...

# 4. Commit (HEREDOC, --no-verify 절대 X)
git commit -m "$(cat <<'EOF'
docs(journal+wip): {date} {slug}

{Phase 1 commit list 요약 2-3줄}
다음 세션 인계: ~/.claude/plans/{repo}-{slug}-handoff.md
journal 안 임베드: knowledge/journal/{date}-{slug}.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

# 5. Push (Q3 답변 따라)
case $PUSH_MODE in
  yes)         git push ;;
  branch-only) git push -u origin "$BRANCH" ;;
  no)          echo "INFO: commit only — 다른 머신 이어가기 불가" ;;
esac
```

### Phase 5 — 콘솔 출력

```
===== /session-handoff 완료 =====

산출물:
  ✓ journal:        knowledge/journal/{date}-{slug}.md
  ✓ handoff prompt: ~/.claude/plans/{repo}-{slug}-handoff.md
  ✓ commit:         {sha} docs(journal+wip): {date} {slug}
  ✓ pushed to:      origin/{branch}   (또는 INFO: 로컬만)

다음 머신/세션에서 이어가기:
  1. cd ~/code/{repo} && git pull --ff-only
  2. 새 Claude Code 세션 시작
  3. 다음 중 하나로 컨텍스트 받기:
     a. ~/.claude/plans/{repo}-{slug}-handoff.md 의 "## 인계 prompt" 섹션 paste (같은 머신)
     b. knowledge/journal/{date}-{slug}.md 의 "## 인계 prompt" 섹션 paste (다른 머신)

검증 통과:
  - Phase 0 pre-check: branch={branch}, WIP={N}, ahead={M}, behind={K}
  - Phase 1 수집: {N} commits / {M} files
  - Gate 1+2: 사용자 승인 또는 skip 명시
```

## 안전장치 (정공법 정합)

| 항목 | 동작 |
|---|---|
| pre-commit (v3.1) | 비차단 — 커밋이 quality 로 막히지 않음. 핸드오프 commit 즉시 진행 |
| `quality:all` 상태 | pre-push 가 **비차단** 표시만. 하드 게이트는 `/release`. 핸드오프는 push 막지 않되, quality 미green 이면 journal 에 명시 기록(은폐 X) |
| main branch force push | 절대 거부 (`pre-destructive-guard` 가 차단). 사용자 명시해도 거부 |
| main branch + WIP > 0 | **main 직접 commit 이 기본** (무사용자 solo-main-workflow.md 표준). 분기는 실사용자 앱에서만 |
| WIP 누락 파일 | Phase 1 에서 `git status --porcelain` 전수 검사, Gate 2 stage list preview |
| Gate 1/2 거부 (`n`) | mutation 0건, 종료 |
| 자동 mutation (Gate 외) | 절대 없음 (Hub-not-enforcer + 정공법) |

## Dual-write 패턴 (다른 머신 이어가기 핵심)

handoff prompt 가 두 위치에 작성되는 이유:

| 위치 | 동기화 | 용도 |
|---|---|---|
| `~/.claude/plans/{repo}-{slug}-handoff.md` | user-local (머신별 분리) | 같은 머신 빠른 access |
| `knowledge/journal/{date}-{slug}.md` 안 "## 인계 prompt" 섹션 | git commit + push | 다른 머신 fetch 후 paste 가능 |

이 dual-write 가 사용자 핵심 요구 — "집 데스크톱 → 사무실 노트북, 어디서든 이어갈 수 있어야" — 를 충족. `git pull --ff-only` 한 번이면 다른 머신에서 prompt access 가능.

## 기존 스킬과 책임 분리

| 스킬 | 책임 | 호출 빈도 |
|---|---|---|
| `/journal` | 단일 엔트리 회상 작성 (장인 모드) | 의미 있는 발견 1건마다 |
| `/feedback-send` | feedback JSON ecosystem 전송 | 작업 완료 / SDK 업그레이드 후 |
| `/retro` | 7-30일 스프린트 회고 (장기 통계) | 주간 / 월간 |
| `/preflight` | 세션 시작 8-gate 점검 | 매 세션 시작 (대칭 짝) |
| **`/session-handoff` (신규)** | **세션 종료 종합 인계 + commit/push** | **매 세션 종료** |

`/session-handoff` 는 위 셋을 흡수하지 않고 형식만 차용. 각자 고유 가치.

## universe-wide 적용

- 23 repo 모두 같은 SKILL.md 사본 (harness-pull 로 sync)
- per-repo 차이는 `$REPO` / `$HOSTNAME` / `$BRANCH` 변수로 자동 감지
- host-sibling 의존 X — `bun run handoff:prepare:apply` (multi-repo wip 검증) 와 책임 분리
- child 가 `.claude/harness-lock.json` 에 `.claude/skills/session-handoff/` 추가하면 sync 거부 가능

## scope

- 단일 repo 단일 세션 종료 인계 — multi-repo 머신 이동은 `bun run handoff:prepare:apply` 사용
- npm publish / 외부 시스템 mutation X — git remote 까지만
- 수동 commit 우선 사용자는 Q3 = "No" 선택 (commit + push 자동화 거부)

## claude-progress.txt 통합 (2026-05+, v2.0 dogfood Adopt P0 #5)

canon `long-running-harness.md` 정합. task root 또는 `.claude/progress.txt` 에 단일 진행 로그 cement — multi-session task 의 cross-machine continuity.

종료 step:
1. task root 에 `claude-progress.txt` 있으면 **이번 session entry append** + git stage:
   ```
   ## YYYY-MM-DD (Session N)
   - Decision: <이번 session 의 의사결정 1-3 줄>
   - Done: <완료한 작업>
   - Next: <다음 step>
   - Blocked: <또는 none>
   ```
2. 부재 시: 이번 task 가 multi-session 이면 progress.txt 생성 권고 (Q2-after-Q1 선택지)
3. 단일 cycle task 는 progress.txt 불필요 — journal + git log 충분

다음 세션 시작 시 `.claude/agents/initializer.md` (Haiku, read-only) 가 progress.txt + git status + recent plans 읽어 3-line summary 제공 — main thread cold-start 비용 흡수.

source: canon `long-running-harness.md`, `~/.claude/plans/20260513-evolve-progress-txt-pattern.md`
