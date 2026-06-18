---
title: Harness Adoption Guide — 첫 도입(0→adopted) + 자동 픽업 + 항상-최신
version: 1.4.0
last_updated: 2026-06-18
source: [v2.33.0 dogfood, v3.1.0 velocity recovery, v3.4.0 NAS substrate, v3.7.0 App Registry/payment/dreaming + first-contact bootstrap (2026-06-14), v3.9.1 stale-adopter un-stick + harness:report (2026-06-14), v3.12 session-open = 기본 advisory·자동 pull opt-in (2026-06-18), CHANGELOG.md]
sync_to_siblings: true
applicability: always
consumers: [harness-pull, preflight, initializer, modfolio, session-handoff]
---

# Harness Adoption Guide — 첫 도입 + 항상-최신

도입은 2 단계다: **(0) 첫 접촉**(브랜드 뉴 프로젝트가 처음 `@modfolio/harness` 를 당겨오는 1회) → **(1+) 지속 픽업**(이후 매 세션 SessionStart 가 drift 를 **안내**, 사용자가 pull → 최신; `autoPull:true` opt-in repo 는 자동). 아래 §0 이 첫 접촉, 나머지가 지속 운영.

## 0 → Adopted — 브랜드 뉴 프로젝트 첫 도입 (first contact)

기존 가이드는 `@modfolio/harness` 가 **이미 설치된** sibling 을 가정했다. 아직 아무것도 없는 프로젝트는 먼저 이 "첫 접촉"을 1회 한다 — 이후는 SessionStart drift 안내(기본) 또는 `autoPull:true` 자동(opt-in)으로 유지.

### 한 줄 (권장)

```bash
cd ~/code/<your-new-project>
bash ~/code/modfolio-ecosystem/scripts/ops/adopt-harness.sh           # 미리보기(dry-run)
bash ~/code/modfolio-ecosystem/scripts/ops/adopt-harness.sh --apply   # 적용까지
```

스크립트가 멱등으로: `.npmrc` 셋업 → `GITHUB_TOKEN` 확인 → `@modfolio/harness`+`@modfolio/contracts` `@latest` 설치(caret) → `harness-pull` 동기. **로컬 파일만**(commit/push 안 함).

### 수동 (스크립트 없이)

1. `.npmrc` (프로젝트 루트) — `templates/npmrc.example` 복사:
   ```
   @modfolio:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```
2. 토큰(read:packages) — athsra: `athsra set <repo> GITHUB_TOKEN=ghp_...` 후 `athsra run <repo> -- <cmd>`. ⚠️ 리터럴 금지, `file:`/`link:` 금지(`contracts.md`).
3. 설치: `bun add -D @modfolio/harness@latest && bun add @modfolio/contracts@latest`
4. 첫 동기: `bunx modfolio-harness-pull --dry-run` → 검토 → `--apply`

**fully external** (ecosystem clone 없음, gh 인증만):
```bash
gh api repos/modfolio/modfolio-ecosystem/contents/scripts/ops/adopt-harness.sh --jq .content | base64 -d | bash
```

### 그 다음 = drift 안내 (기본) + 사용자 pull

- **caret 범위**(`^<ecosystem.harnessLatest>`, 예 `^3.8.0`) → `bun update` 시 최신 minor/patch.
- **SessionStart drift 안내** (v3.12, 기본) → `.claude/harness-lock.json` 에 `{ "enableSessionPickup": true }` 후 `--apply` 1회 → 이후 매 세션 진입 시 drift 를 **감지·안내** (수동 동기화 명령 1줄). drift = transient.
- **자동 self-heal 을 원하면 (opt-in)** → lock 에 `{ "autoPull": true }` 추가 → 세션 진입 시 스스로 `bun update` + `harness-pull --apply` + commit (working tree clean + origin behind 아님 일 때만). 근거·문제이력 = `evergreen-principle.md` §v2.5.
- **hook 프로필 (v3.13+)** → `.claude/harness-lock.json` 의 `{ "profile": "velocity" | "strict" }` 가 어떤 hook set 을 wiring 할지 결정. **기본 `velocity`** = 결정적 안전 가드 2개(`pre-destructive`·`pre-payment`)만 wiring, per-turn 토큰·지연 0(fast-MVP). `strict` = 전체 hook(실사용자 앱 — `solo-main-workflow.md` 전환 트리거). 전체 = `velocity-mode.md`.
- **App Registry** → `@modfolio/contracts/registry` import (바로 아래).

## 기존 stale 어댑터 — self-heal 부트스트랩 갭 (1회 un-stick)

> 강제 아님 — 각 repo 자율. ecosystem 은 상태를 정확히 알고 권고만 한다 (Hub-not-enforcer).

자동 self-heal(SessionStart `bun update`)은 **v3.9.0 에서 처음 도입**됐다. 그래서 그보다 낮은 버전(예 3.2~3.5)에 묶인 repo 는 자기를 갱신해 줄 코드를 **아직 갖지 못한다** — 열어도 스스로 최신으로 못 올라온다(chicken-and-egg). caret(`^3.2.0`)이 3.9.0 을 허용해도 `bun.lockb` 가 낮은 버전을 pin 하므로 `bun install` 로는 안 넘어온다.

**해결(1회, 각 repo 자율)**: 해당 repo 에서 `adopt-harness.sh` 재실행 — 멱등이고, `bun add @latest` 가 lockfile pin 을 덮어써 최신으로 un-stick + `@modfolio/contracts` 도입까지 한다. 그 1회 이후부터는 SessionStart 가 매 세션 drift 를 **안내**하고(기본 advisory, v3.12), 안내된 명령을 사용자가 치면 정합 유지 — `autoPull:true` 를 켠 repo 는 그 과정이 자동.

```bash
cd ~/code/<stuck-repo>
bash ~/code/modfolio-ecosystem/scripts/ops/adopt-harness.sh           # dry-run 미리보기
bash ~/code/modfolio-ecosystem/scripts/ops/adopt-harness.sh --apply   # 적용
```

**전파 상태 가시성(ecosystem 측, read-only)**: 누가 어느 버전에 묶였고 contracts 를 도입했는지 한눈에 —

```bash
bun run harness:report          # 표: DECLARED / INSTALLED / CONTRACTS / STATE (behind 등)
bun run harness:report:json     # 머신 소비
```

ecosystem 은 이 리포트로 **항상 전파 진실을 안다**. 그러나 sibling 을 직접 갱신하지 않는다 — 위 un-stick 은 각 repo 가 자율 실행. registry 소비(`@modfolio/contracts/registry`)도 그 repo 가 원할 때 도입(현재 도입 0 = 정상, 강제 아님).

## App Registry 소비

URL 손코딩(OIDC redirect_uri·CORS·SSO·webhook) 종료. `@modfolio/contracts@^1.1.0` 설치 후:

```ts
import { oidcRedirectUris, authEndpoints, corsOriginsFor, webhookUrl, getApp } from '@modfolio/contracts/registry';
const redirects = oidcRedirectUris('naviaca');      // ['https://app.naviaca.com/auth/callback', ...]
const { issuer, authorize, token, jwks } = authEndpoints() ?? {};   // connect OIDC 엔드포인트
```

런타임은 패키지의 **정적 import**(Workers-safe). harness-pull 이 `.claude/app-registry.json` fresh 미러도 sync(build-time/tooling 용, 매 pull 갱신). canon `app-registry.md`.

## v3.1+ 정합 (2026-05-24 추가)

- **`permissions.defaultMode = "bypassPermissions"`** — fleet 표준 (canon `permission-mode.md`). zero approve-prompt. 안전망 = 결정적 hook.
- **SessionStart hook default-ON** (`session-start-pickup.ts`) — IDE 진입 시 sibling 이 drift 를 **감지·안내** (기본 advisory, v3.12). 자동 `--apply`+commit self-heal 은 `harness-lock.json {autoPull:true}` opt-in 만. drift = transient-not-canonical (`evergreen-principle.md` §v2.3/§v2.5).
- **pre-commit guard quality:all 제거** — 매 커밋 즉시. quality 검증은 `pre-push-guard` 비차단 + `/release` 하드 게이트 시점에만 (canon `solo-main-workflow.md`).
- **NAS Forgejo Actions = $0 CI** (`nas-infra.md` + `gh-actions-policy.md` v2.0) — GitHub Actions 전면 금지. CI 컴퓨트는 NAS self-hosted runner.

## 동기되는 자산 = 항상 ecosystem.harnessLatest (버전 고정 금지)

harness-pull 이 당기는 집합은 *현재 최신* 이다 — 특정 버전 목록에 고정하지 않는다 (정공법: drift 방지):
- **canon**: `sync_to_siblings: true` 인 모든 `knowledge/canon/*.md` (목록 = `canon-index.md`)
- **rule/skill/agent/hook**: `scripts/harness-pull/constants.ts` 의 `UNIVERSAL_RULES` / `SHARED_SKILLS` / `SHARED_AGENTS` / `SHARED_HOOKS`
- **App Registry 미러**: `.claude/app-registry.json` (모든 universe 앱 URL — 위 §App Registry)
- **CLAUDE.md ecosystem 섹션** (관련 앱 표)

지금 무엇이 최신인지 = `ecosystem.harnessLatest`; 버전별 상세 = `CHANGELOG.md` (SSoT). 이 가이드는 버전 목록을 나열하지 않는다.

## 자동 픽업 메커니즘 (3중 자동화)

### 1. SessionStart hook 자동 셋업 (권장, opt-in marker 방식)

**가장 깔끔한 방법** — sibling 의 `.claude/harness-lock.json` 에 1 줄 marker 추가:

```jsonc
{
  "lockedPaths": [],
  "enableSessionPickup": true
}
```

이후 `bunx modfolio-harness-pull --apply` 호출 시 harness-pull 가 sibling 의 `.claude/settings.json` 에 SessionStart hook 자동 주입 (`scripts/hooks/session-start-pickup.ts` 호출).

작동:
- sibling repo 진입 시 자동 실행 (Claude Code 세션 시작 시점)
- ecosystem 측 inbox 메시지 (`feedback/<repo>/inbox/*.md`) 최근 entries 표시
- installed harness 버전 vs `ecosystem.harnessLatest` 격차 표시
- `bunx modfolio-harness-pull --dry-run` 권고
- non-modfolio repo 는 silent skip

**Hub-not-enforcer 정합**: marker 없으면 hook 주입 X. sibling owner 명시 opt-in 시만.

### 1-alt. 사용자 host-level 셋업 (모든 repo 일괄)

22 sibling 모두 marker 추가 대신, 사용자 `~/.claude/settings.json` (user-level, project 무관) 에 한 번 셋업:

```jsonc
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "test -f package.json && grep -q '@modfolio/harness' package.json && bunx modfolio-harness-pull --dry-run 2>/dev/null | head -30 || true"
          }
        ]
      }
    ]
  }
}
```

작동 동일. marker 방식과 차이: marker 는 sibling 별 명시 opt-in (Hub-not-enforcer 더 강), host-level 은 사용자 한 번 셋업 (모든 modfolio repo 일괄).

권고: marker 방식 우선 (sibling owner 결정 명시), 사용자 host-level 은 보완.

### 2. `bunx modfolio-harness-pull --apply` — 변경 적용

SessionStart hook 가 변경 사항 보고 → 사용자가 검토 → 적용 결정:

```bash
bunx modfolio-harness-pull --dry-run   # 변경 사항 확인
bunx modfolio-harness-pull --apply     # 적용
```

자동 동기 자산: 위 "동기되는 자산 = 항상 ecosystem.harnessLatest" 참조 — 최신 집합을 통째로 sync (버전 고정 X). `.claude/harness-lock.json` 으로 잠근 path 만 제외.

### 3. `/initialize` 또는 자동 initializer agent — cold-start 픽업

세션 시작 직후:

```
/initialize
```

응답 (3-line):
```
Last session: <YYYY-MM-DD> · <last action>
Next step: <one-line> (plan: <plan-path or "none">)
Blocked: <or "none">
```

`claude-progress.txt` 가 있으면 multi-session task 의 진행 상황 자동 복원. 부재 시 git log + recent plans 로 fallback.

initializer agent 는 read-only (Haiku, disallowedTools: Edit/Write/Bash) — 정보 수집만 하고 결정은 main thread.

## sibling 별 적용 step (Hub-not-enforcer)

### 즉시 적용 가능 (sibling 결정 0, harness-pull 만으로 완료)

- **canon 갱신**: `knowledge/canon/*.md` 자동 sync — 별도 action 0
- **신 rule lethal-trifecta**: governance check 가 ecosystem 의 `/modfolio` 또는 `bun run scripts/modfolio/check.ts` 호출 시 자동 작동
- **신 agent initializer**: `/initialize` 호출 시 즉시 사용 가능
- **신 skill 가이드**: SKILL.md 갱신 자동 — 다음 skill 호출 시 신 내용 반영

### sibling owner 결정 후 적용

#### A. DO/Worker auto-tracing (CF observability v2)

조건:
- sibling 이 Cloudflare Workers + Durable Object / service binding / Queue 사용
- 통합 trace 가치 (debugging / latency 분석 / cost attribution)

step:
1. `wrangler.jsonc` 의 `compatibility_date` 확인 — `>= 2026-05-07`
2. `wrangler.jsonc.observability` 추가:
   ```jsonc
   "observability": {
     "enabled": true,
     "head_sampling_rate": 1.0    // dev 는 0.1 권장
   }
   ```
3. `wrangler deploy` → CF Trace dashboard 에서 통합 trace 확인

#### B. D1 PRAGMA optimize finalize

조건: sibling 이 D1 사용 + schema migration 수행

step:
1. migration script 의 마지막에 추가:
   ```bash
   wrangler d1 migrations apply <db-name> --remote
   bunx modfolio-migrate-finalize <db-binding> --remote
   ```
2. 또는 `package.json.scripts.db:migrate` 에 chaining: `"db:migrate": "wrangler d1 migrations apply X --remote && bunx modfolio-migrate-finalize X --remote"`

#### C. Lethal Trifecta governance — 위반 발견 시

조건: `/modfolio` 또는 `bun run scripts/modfolio/check.ts` 호출 시 `agentic-governance/asi-lethal-trifecta` warning 발견

step (각 위반에 1 회 선택):
1. **명시 human-approval**: 위반 file 의 frontmatter 에 `human_approval_required: true` 추가
2. **trifecta 끊기**: 3 조건 중 하나 제거 (sandbox 모드)
3. **allowlist 등록**: `.claude/rules/lethal-trifecta-allowlist.json` 에 entry 추가 (justification + revisit_after 강제)

#### D. xhigh effort — sibling 측 agent 측에서 자동 동기

조건: sibling 이 `.claude/agents/{page-builder,component-builder,...}.md` 보유

step:
- `harness-pull --apply` 가 자동 동기 — 별도 action 0
- A/B 비교 원하면 30일간 quality 회귀 모니터링 (canon `opus-4-7-effort-policy.md` v1.1 § "A/B 검증 정책")

#### E. /goal command 활용

조건: Claude Code v2.x+ 사용 + verifiable end-state 작업 (예: tests green, audit 정합성 100%)

step:
- 즉시 사용 가능 — `/goal <조건>` 으로 자율 반복 진입
- 책임 분리 (canon `agentic-engineering.md` § 2.1): `/loop` (시간 driven) vs `/goal` (binary end-state)

#### F. claude-progress.txt 패턴 — long-running task 가 있다면

조건: 1 세션 안에 안 끝나는 task (마이그, 대형 refactor, multi-phase plan)

step:
1. task root 에 `claude-progress.txt` 생성:
   ```
   # Task: <one-line>
   # Started: YYYY-MM-DD

   ## YYYY-MM-DD (Session 1)
   - Decision: ...
   - Done: ...
   - Next: ...
   - Blocked: ...
   ```
2. 매 session 종료 시 `session-handoff` skill 가 자동 append
3. 다음 session 시작 시 `/initialize` 가 자동 read

#### G. Memory tool L3 Trial (선택)

조건: ralph-loop / generate-review 같은 long-running skill 사용 + token saving 측정 의향

step:
1. `.claude/memory/{agent-name}/` 디렉토리 생성 (gitignore 확인)
2. ralph-loop 호출 시 memory tool option 활성
3. `bun run scripts/budget/cache-hit-report.ts --memory-tool` 로 saving 측정
4. canon `attention-budget.md` v1.1 § L3 의 판단 매트릭스에 따라 cement/skip

#### H. OpenInference Claude SDK (선택, 1 sibling spike)

조건: sibling 이 Anthropic SDK 직접 호출 (예: AI gateway, modfolio-connect, ai-patterns 사용처)

step: `~/.claude/plans/20260513-evolve-openinference-claude-sdk.md` 의 Stage A-D 따름

## 정공법 정합

- **1원칙 (근본 수정)**: 자동 픽업 메커니즘 자체를 cement — 매번 사용자가 수동 확인 부담 X
- **3원칙 (장기 시야)**: SessionStart hook 한 번 셋업 → 22 sibling 모두 작동
- **5원칙 (리소스 투자)**: hook 셋업 1 회 비용 → 매 세션 cold-start 비용 절감 누적

## 안전 가드

- SessionStart hook 기본 = drift 안내만 — 실 변경 X (사용자가 별도 `--apply` 호출). 자동 `--apply`+commit 은 `autoPull:true` opt-in repo 만 (v3.12, `evergreen-principle.md` §v2.5)
- harness-pull 가 sibling 의 `.claude/harness-lock.json` path 잠금 존중
- `settings.local.json` 절대 안 건드림
- `wrangler.jsonc`, `biome.json` 등 sibling identity 파일 read-only

## Sibling 별 자율 결정

각 sibling owner 가 자기 시점에 채택. ecosystem 은:
- ✅ 권고 (본 canon + adoption-guide)
- ✅ 표준 (canon / rule / agent / skill)
- ✅ 가이드 (per-sibling 적용 step 명시)
- ❌ 강제 (Hub-not-enforcer)
- ❌ 자동 PR (sibling 결정 도용)

## 측정 (다음 monthly review)

- 22 sibling 의 v2.33.0 채택률 — `/modfolio` 의 ecosystem-rollup 트랙 (자동 추적)
- 신 canon (long-running-harness, attention-budget v1.1) sibling 흡수율 — `bun run audit:delta`
- Lethal Trifecta 발견 + 해결 — sibling 측 `/security-scan` 호출 결과

## 관련

- canon `evergreen-principle.md` — Hub-not-enforcer 원칙
- canon `long-running-harness.md` — claude-progress.txt + initializer 정합
- canon `observability.md` v1.6 — DO trace + GenAI agent-spans + Queues + D1
- skill `harness-pull` — sync 메커니즘
- skill `preflight` — 세션 시작 점검 (SessionStart hook 보완)
- agent `initializer` — cold-start 3-line summary
- 외부: [Anthropic Engineering — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
