---
title: Managed Artifacts — 도구가 자동 재작성하는 파일과 diff 오독 방지
version: 1.0.0
last_updated: 2026-07-04
source: [2026-07-04 diff 오독 사건 — `.claude/settings.json` 의 line-diff(`git diff | head -30`)를 보고 "bypassPermissions 제거·env 추가·외부 변경"으로 오독·경보했으나 key-level 비교 결과 실제 변경은 에이전트 자기 편집이 남긴 Edit 권한 3줄뿐(biome --write 키 재정렬 + Claude Code 권한 자동기록 = churn), scripts/json-diff.ts 로 즉시 규명. 자매 = fact-ownership.md(무엇이 권위)·concurrency-safety.md(공유 쓰기)·rule agent-evidence.md(주장=증거)]
sync_to_siblings: true
applicability: always
consumers: [preflight, ops]
---

# Managed Artifacts — 도구가 자동 재작성하는 파일과 diff 오독 방지

> **손으로 쓴 의도(intent)와 도구가 생성·재작성한 상태(state)는 다르다.** 후자의 diff 는 대개 포매팅·재정렬·자동기록 churn 이지 "누가 뭘 바꿨다"가 아니다 — **line-diff 로 단정하지 말고 key-level 로 확인**한다. 이 canon 은 fact-ownership(무엇이 권위 SoT 인가)·concurrency-safety(공유 쓰기 표면)의 자매 축이다.

## 사건 (2026-07-04) — 이 canon 의 이유

에이전트가 `git diff .claude/settings.json | head -30` 만 보고 "`bypassPermissions` 제거됨 · `env` 추가됨 · `fallbackModel` 제거됨 → 외부/보안 변경 의심"으로 **사용자에게 경보**했다. key-level 비교(`bun run json-diff`)의 실제 결과: **top-level 키 추가/제거 0**, `bypassPermissions` **그대로**, 유일한 변경 = 에이전트 자신이 그 세션에 편집한 스킬 경로의 `Edit(...)` 권한 **3줄 자동 추가**. 원인 2겹: ① `biome --write` 가 JSON 키를 재정렬 → line-diff 가 대량 `-/+` ② Claude Code 가 편집 경로 권한을 allowlist 에 자동기록. 둘 다 **관리 파일의 정상 churn**이었다.

## 에이전트-관리 / 자동생성 파일 카탈로그

| 파일 | 누가 재작성 | 예상 churn | 권위(손 의도)? |
|---|---|---|---|
| `.claude/settings.json` | Claude Code(도구 사용 시 권한 자동기록·모델/effort/permission-mode 변경) + biome 포맷 | `allow`/`Bash(...)`/`Edit(...)` 자동 추가, 키 재정렬 | 부분 — 대부분 자동 상태 |
| `.claude/settings.local.json` | Claude Code 세션 권한(gitignored) | 세션별 grant | ❌ **커밋 금지** |
| `.mcp.json` | harness merge + Claude Code MCP 인증 | 서버 추가·토큰 필드 | 부분 |
| `biome.json` | biome 자기포맷 + harness cleanup 멱등 삽입 | 키 재정렬·제외목록 정규화 | 부분(멤버 소유 glob 은 손 의도) |
| `.npmrc` | harness-pull `resolveNpmrcScopeAction`(--apply 시 `@modfolio:registry` 라인 pkg.modfolio.io flip) + Phase 0.5 bootstrap 시드 | scope 라인만 line-level flip(다른 라인 보존) | 부분 — scope 는 미러(단일 registry), 토큰/타 scope 는 손 의도 |
| `bun.lock` | bun | 해시·resolve 재계산 | ❌ 생성물 |
| CLAUDE.md `<!-- ECOSYSTEM_START -->…END` 구간 | harness-pull 재생성(self-facts 로컬 판독) | 매 pull 재생성 | ❌ 미러(fact-ownership) |
| `ecosystem.json` 각 앱 `packages` | `version-sync --apply` 상향 미러 | 하위 패키지 버전 | ❌ 미러(fact-ownership) |
| `memory/*.jsonl`, `memory/pattern-history.md` | Stop hook 자동갱신 | append | ❌ 텔레메트리 |
| `data/audit/*`, `docs/audit/latest*` | delta-audit 재생성 | 스냅샷 | ❌ 생성물 |

## 방법 — diff 를 읽고 주장하기 전 (MUST)

1. **구조화 파일(JSON/YAML/lockfile/재정렬된 파일)의 변경은 line-diff 로 단정하지 않는다.** 반드시 key-level 의미 비교:
   ```bash
   bun run json-diff <file> [ref]     # ref 기본 HEAD → 실제 키/값/배열원소 델타만 출력
   ```
   빈 델타 = "포매팅·재정렬 churn, 의미 변경 0" — 이때 "키 제거/추가"라고 말하지 않는다.
2. **truncated diff(`| head`)로 결론 금지.** 판단 근거 diff 는 전체를 보거나 요약 도구를 쓴다.
3. **관리 파일인지 먼저 판별.** 위 카탈로그에 있으면 세션 중 diff 는 **예상된 자동 churn**이다 — 외부/침해/회귀로 단정하기 전에 (a) key-level 비교 (b) `git log`·mtime (c) 그 변경이 이번 세션 내 에이전트 행위(편집·`--apply`·포맷)의 부산물인지 대조.
4. **경보(⚠) 전 반증 1스텝.** "제거됨/유실/외부 변경/보안 이상" 은 disconfirming 체크를 통과한 뒤에만, 근거 명령 결과를 **인용해서** 발화한다(고장 주장에도 증거 — `agent-evidence.md`).

## 멀티세션 정합 (concurrency-safety 연결)

같은 repo 를 Claude Code 창 2개로 열면 `settings.json`·`settings.local.json`·`.mcp.json` 이 **공유 쓰기 표면**이 된다(concurrency-safety §멀티세션). 관리 파일 diff 가 "내가 안 했는데 바뀜"으로 보이면, 외부 침해가 아니라 **다른 세션/도구의 정상 자동기록**일 확률이 높다 — 카탈로그 + key-level 로 먼저 확인.

## 반-패턴

- ❌ 재정렬된 JSON 의 line-diff 를 보고 "키 제거/추가" 단정
- ❌ `git diff | head` 로 본 일부만으로 결론
- ❌ 관리 파일의 자동 churn 을 "외부 변경/보안 이상"으로 사용자에게 경보(반증 없이)
- ❌ `settings.local.json` 커밋 / 생성물(lock·audit·memory)을 손 의도처럼 취급
- ❌ 관리 파일 churn 을 "정공법 diff 0" 명분으로 억지 되돌림 — 손 의도가 아니면 방치가 정상(다음 도구 실행이 재생성)

## 훅 없음 (velocity 정합)

diff 오독은 **판단(추론) 실패**라 결정적 grep 훅으로 못 잡는다 — per-turn 훅을 추가하지 않는다. 대신 방법을 **온디맨드 도구(`json-diff`) + rule(`agent-evidence`) + 이 canon** 으로 박는다(fact-ownership·concurrency-safety 와 동일 전략: 사람 기억이 아니라 시스템).

## 관련

- `.claude/rules/agent-evidence.md` — 주장=증거(이 canon 의 상위 rule, UNIVERSAL_RULES 전파)
- `fact-ownership.md` — 미러 vs SoT(무엇이 권위) · `concurrency-safety.md` — 공유 쓰기 표면
- `scripts/json-diff.ts` — key-level 의미 diff 도구(`bun run json-diff`)
- 사건 기록 — `knowledge/journal/20260704-fact-ownership-session.md`
