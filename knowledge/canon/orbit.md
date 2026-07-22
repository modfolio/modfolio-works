---
title: Orbit (궤도) — universe 순회 강화 캠페인과 Orbit Writ
version: 1.0.0
last_updated: 2026-07-21
source: [2026-07-21 오너 세션 "모든 sibling 에 대한 액세스와 편집을 내가 허가할께 — 이 작업에 이름을 붙이고 하네스에 등록", docs/adr/ADR-016-orbit-writ.md]
sync_to_siblings: true
applicability: always
consumers: [orbit, feedback-collect, harness-pull, release, preflight]
---

# Orbit (궤도) — universe 순회 강화 캠페인

> **한 번의 Orbit = universe 를 한 바퀴 도는 1회 순회.** 28 repo 를 전수 관측하고, 판정하고, 집행하고, 하네스로 역흡수하고, 전파하고, 기록한다. 오너가 `/orbit` 한 마디로 재개한다 — 배경 설명 불필요.
>
> Muse(뮤즈, `reasoning-playbooks.md`)의 자매축: **Muse = 판단을 영속화**, **Orbit = 생태계를 순회 강화**.

## 왜 sibling 도 이 문서를 받는가

순회 중 hub 가 **당신의 repo 에 직접 커밋할 수 있다.** 그 권한의 범위·수명·기록 방식을 당신도 알아야 한다(fact-ownership 과 같은 이유 — 일방적으로 정해진 것을 나중에 발견하지 않도록). 아래 §Writ 가 그 계약이다.

## 스테이지 머신

순회는 한 세션에 끝나지 않는 것이 정상이다. 상태는 `memory/orbit/current.json`(hub, git-tracked)에 있고 `/orbit` 은 **항상 현재 스테이지에서 재개**한다.

| stage | 하는 일 | Writ |
|---|---|---|
| `open` | 순회 개시 — fleet 스냅샷 고정 + 지난 순회 미결 승계 | 🔒 |
| `survey` | T1~T10 전수 관측 (read-only) | 🔒 |
| `triage` | findings 를 P0~P3 × owner 로 판정 → repo 별 패킷 확정 → **⛔ 오너 승인** | 🔒 |
| `execute` | repo 단위 집행, repo 1개 = 체크포인트 1개 | 🔓 |
| `harness` | 일반 교훈을 harness/canon 으로 역흡수 → release-gate → 이중 게시 | 🔓 |
| `propagate` | fleet 이 최신 하네스 수신 → 28/28 재확인 | 🔓 |
| `close` | 완료 정의 검증 → journal·ledger 기록 → Writ 회수 | 🔒 |

**재개 규약**: `repos[].status`(pending/in_progress/done/skipped/failed)가 체크포인트다. `done` repo 는 **절대 재실행하지 않는다**(멱등). 세션이 끊기든 머신을 옮기든 이어붙는다.

## 관측 트랙

T1 fleet-state · T2 linkage(이벤트 계약) · T3 url-registry · T4 deploy-health · T5 secrets/security · T6 quality-gates · T7 knowledge-truth(fact-ownership) · T8 evergreen/deps · T9 feedback-backlog · T10 codebase-health.

**원칙: 새로 만들지 말고 감싼다.** 사실의 대부분은 이미 검증된 hub 스크립트가 만든다(`harness-adoption-report`·`event-wiring-scan`·`probe-domains`·`ecosystem-report`·`registry:check`). survey 의 역할은 그것들을 돌려 **증거가 붙은 finding** 으로 바꾸는 것. 증거 없는 주장은 finding 이 될 수 없다(`.claude/rules/agent-evidence.md`).

> ⚠ 관측 함정(실사례): `event-wiring` 의 `(없음) [platform-adapter.json]` 은 "**구독 선언이 없음**"이지 "파일이 없음"이 아니다. 실측은 25/28 이 파일 보유, 구독 선언은 3 repo 뿐. 두 사실을 뭉치면 3-repo 문제가 25-repo 문제로 둔갑한다. 열 제목을 읽고, 세지 말고 확인할 것.

## Orbit Writ — cross-repo 쓰기 위임장

**hub 는 순회 중이 아닐 때 sibling repo 를 수정하지 않는다.** 이 불변은 폐기된 적 없고, 2026-07-21 부터 **기계로 집행**된다(그전엔 프로즈뿐이었다).

```
활성 조건   stage ∈ {execute, harness, propagate} AND writ.active
범위        writ.scope = triage 에서 패킷이 확정된 repo 만. 빈 scope = 거부(fail-closed)
클래스      deps · harness · config · adapter · contracts · registry · refactor · debug
집행        pre-orbit-writ-guard (PreToolUse: Bash|Edit|Write|NotebookEdit) → 위반 시 exit 2
회수        stage 이탈 또는 close 시 자동. 상시 권한은 존재하지 않는다
감사        memory/orbit/writ-audit.jsonl (append-only)
```

- **읽기는 절대 막지 않는다.** `git -C ~/code/<repo> log`·grep·cat 자유 — hub 는 모두 알아야 한다.
- **WHAT(클래스)은 훅이 아니라 커밋 시점에 강제된다.** staged 경로 ⊆ 패킷 allowlist. 셸 문자열로 변경 성격을 추론하는 척하지 않는다.
- **🔒 에이전트 자가 발급 금지.** writ 는 오너가 패킷을 승인했거나 명시 지시했을 때만 열린다. 편의를 위해 스스로 `orbit:writ grant` 를 누르지 않는다.
- **Writ 는 지출 승인이 아니다.** 결제·유료 리소스는 `payment-safety.md` 의 `pre-payment-guard` 가 별도로 계속 적용된다. 파괴적 작업도 마찬가지.

### 순회 밖 단건 허가

```bash
bun run orbit:writ grant <repo> --reason "오너 지시: X 파일 직접 수정 승인"
```
사유 필수, 감사 기록. 기존 "건별 허가"를 없앤 게 아니라 **기록 가능한 형태로 승격**한 것이다.

## repo 별 집행 규율

```
pull --ff-only 선행  →  패킷 적용  →  그 repo 자체 게이트 green
  →  staged 경로가 패킷 allowlist 안인지 검증  →  commit  →  push (no-force)
dirty / diverged / 활성 개발 중  →  skip + 사유 기록 (순회는 계속)
```
`scripts/ops/fleet-adopt.sh` 의 검증된 절차(dirty-skip·pull-first·allowlist 스테이징·no-force)가 골격이다. **skip 은 실패가 아니다** — 사유가 남으면 정상 산출물이고, 다음 순회로 이월된다.

> sibling 이 활성 개발 중(비-main 브랜치·dirty)이면 **건너뛰는 것이 옳다.** 순회는 남의 작업을 밀어내지 않는다.

## 완료 정의 (close 통과 조건)

코드로 강제된다(`checkCompletion`):

- 모든 finding 이 `resolved`(증거: 커밋 SHA + 게이트 출력) 또는 `deferred`(사유 + 다음 순회 이월) — **미분류 0**
- 집행 대상 repo 가 전부 `pending` 을 벗어남
- Writ 가 회수된 상태
- hub `quality:all` + `release:gate` green, `registry:check` PASS
- 배선 갭 / DNS 실패 / 미처리 피드백 수치를 **순회 전후로 기록**(줄었든 아니든 숫자로)

`commit ≠ deployed`, `gate-green ≠ 무결`. 배포까지 한 건 build success + 라이브 200 확인.

## 명령

```bash
bun run orbit              # 재개 — 현재 스테이지 + 다음 행동
bun run orbit open         # 새 순회 개시
bun run orbit:survey       # 관측만 (read-only, 언제든 안전)
bun run orbit:status       # 상태만
bun run orbit:writ status  # 위임장 상태
bun run orbit close        # 완료 정의 검증 후 종료
```

## 관련

- `docs/adr/ADR-016-orbit-writ.md` — 결정 근거·기각한 대안·정직한 한계
- `knowledge/canon/evergreen-principle.md` — Hub-not-enforcer (Writ 는 그 예외이자 그것의 기계적 집행)
- `knowledge/canon/fact-ownership.md` — 멤버 사실의 SoT 는 그 repo (순회가 미러를 고칠 때의 방향)
- `knowledge/canon/fleet-harness-propagation.md` — propagate 스테이지의 실무 runbook
- `knowledge/canon/reasoning-playbooks.md` — Muse. close 스테이지에서 판단을 카드로 남긴다
- `knowledge/canon/payment-safety.md` · `solo-main-workflow.md` · `concurrency-safety.md`
