---
title: Opus Effort Policy (baseline Opus 5.5)
version: 2.6.1
last_updated: 2026-09-24
source: [knowledge/canon/opus-4-7-effort-policy.md, platform.claude.com whats-new-opus-5 (1M default·thinking 기본 ON·effort 변환률·512 토큰 캐시 하한), code.claude.com model-config (effort 우선순위·모델 기본값 high·settings 는 max 거부·ultracode·[1m] 스트립), Frontier-Bench v0.1 (Opus 5 43.3 / Fable 5 33.7 / Opus 4.8 21.1), 2026-07-26 v2.0.0 (Opus 5 전환 + effort 상향 프로파일 — 오너 결정: 재작업 비용 > 토큰 비용; .mise.toml env-max 실사건 정정), claude-api 스킬 번들 2.1.280 shared/model-migration.md §Migrating to Claude Opus 5.5 (기본 effort medium · 라벨 1:1 비대응 · 같은 라벨에서 더 오래 생각), platform.claude.com pricing (2026-09-23 fetch — Opus 5.5 $4/$20 · cache read 0.05×), 2026-09-23 v2.3.0 (Opus 5.5 전환 — 오너 결정 «전부 전환»·«현 라벨 유지» · Desktop 세션 effort env 주입 실측), 2026-09-23 v2.4.0 (우선순위 실측 8건 — settings env 가 OS env 를 이긴다 · 빈 값이 Desktop 주입을 지운다 · 오너 요청 — 세션 effort 설정과 무관하게 라우팅·frontmatter 대로), 2026-09-23 v2.4.1 (멤버는 게이트가 아니라 pull 자가치유 · pay 관측), 2026-09-23 v2.5.0 (실사건 5 케이스 × 2회 재측정 → frontmatter 한 칸 내림 · 오너 결정), 2026-09-24 v2.6.1 (세션 기본 effortLevel 문장 정정 — 3.93.0 후보 독립 리뷰 E)]
sync_to_siblings: true
applicability: always
consumers: [preflight, plan, generate-review, modfolio, harness-evolve, claude-api, context-engineering]
---

# Opus Effort Policy — 권고 (baseline Opus 5.5)

> 이 문서는 **권고**이며 강제가 아니다. 각 앱은 자체 `.claude/settings.json`에서 override 가능.

> **파일명 동결**: `opus-4-7-effort-policy.md` 는 **안정적 cross-ref 식별자**다 — 30+ append-only 이력 레코드 + 10여 active canon 링크가 이 이름을 참조하므로 rename 시 orphan 이 생긴다. 내용은 항상 현행 baseline 을 반영한다(현재 **Opus 5.5** — 2026-09-23). 모델 출시 신기능 권고는 `claude-code-2026h1-features.md`.

## 모델 티어 (2026-09-23 — Opus 5.5)

| 티어 | 모델 ID | Context | 용도 |
|------|---------|---------|------|
| Baseline | `claude-opus-5-5` | **1,000,000** tokens | 코딩·리뷰·아키텍처 — **Opus 고정 agent 21편 · 라우팅 기본**. Claude Code 2.1.280 의 기본 Opus |
| Previous baseline | `claude-opus-5` | 1,000,000 tokens | 2026-09-23 까지의 기본. 계속 제공된다 — 되돌림 경로 |
| Frontier (opt-in) | `claude-fable-5-1` | 1,000,000 tokens | 추론형 최상단 전용 (`model-escalation.md` rung-3). 2026-09-01 출시 · 세션이 이 모델이면 `.claude/rules/fable-5-1-behavior.md` |
| Fast | `claude-haiku-4-5-20251001` | 200,000 tokens | 검색·요약·결정적 검증 (비용 효율) |
| Fallback | `claude-sonnet-5` | 1,000,000 tokens | 429/529·과부하 시 자동 폴백 |

> ⚠ **`[1m]` 접미사는 Opus 5 에서 폐기.** Opus 5 는 *"1M tokens is both the default and the maximum; there is no smaller context variant"* (platform docs) — 접미사는 이득이 0 이고, Claude Code 는 subagent spawn 시 이를 strip 하거나(#45169) "1M context requires extra usage" 로 실패시킨다(#51060). agent frontmatter 에 붙이지 않는다. (Sonnet 5 · Opus 5.5 도 동일하게 1M 단일 — 접미사 불필요.)

**가격** (2026-09-23 pricing 페이지 fetch): Opus 5.5 **$4/$20** per MTok · cache read **$0.20 = 0.05×**(전역 0.1× 의 절반) · fast mode $8/$40. Opus 5 $5/$25(fast $10/$50) · Fable 5.1 $10/$50(cache read 0.025×) · Sonnet 5 $2/$10 · Haiku 4.5 $1/$5. 1M·long-context 프리미엄 없음. **권위 단가 SoT = `ecosystem.json` `pricing.genai`** — 본문 가격은 사람용 미러.

**Opus 5 rate limit 은 Opus 4.x 와 별도 버킷**이다 — 4.x 풀의 여유를 물려받지 않는다. Opus 5.5 는 Opus 5 와 별도 풀이거나 같은 그룹일 수 있다(공식 가이드 「출시 시 확인」 — 미확인).

## Effort 5단계

| 레벨 | 특징 | 비용/속도 | 권장 대상 (v2.5.0 · 2026-09-23) |
|------|------|----------|-----------|
| low | 빠른 응답, 얕은 reasoning | 최저 | frontmatter 에 쓰지 않는다(현재 agent 0) · 세션 단발 질의 |
| medium | 균형 · **Opus 5.5 의 기본값**(API · 아래 X0 실측 메인 medium) | 저 | read-only fan-out(haiku 2 · sonnet 1) |
| high | Opus 5 의 기본값 | 중 | **agent frontmatter 기본** — 코딩·리뷰·관측(14) |
| xhigh | 깊은 reasoning | 중-고 | 세션 `effortLevel` · expensive-if-wrong agent 7(보안·장애·아키텍처·비가역) |
| max | 제약 없는 최대 reasoning | 가변 (토큰↑, 단가는 동일) | **frontmatter 에 두지 않는다** — 세션 `/effort max` · 라우팅 escalation opt-in 전용 |

**Opus 5 는 effort 를 실제 품질로 바꾸는 변환률이 역대 Opus 중 가장 높다**(Anthropic 명시). 그래서 `max` 가 처음으로 값을 한다(⚠ Opus 5 발표에 근거한 문장이다 — 2026-09-23 Opus 5.5 로컬 실측(실사건 5 케이스)에서는 high 위 이득이 재현되지 않았고 max 는 시간 초과 4/10 · §v2.5.0) — 그리고 **단가가 오르지 않는다**(같은 모델, 토큰만 증가). 상향의 비용이 Fable 전환보다 훨씬 싸다.

> **⚠ Anthropic 권고와 의도적으로 분기 (2026-07-26 오너 결정 · 2026-09-23 v2.5.0 에서 대부분 대체 — agent 기준을 high 로 내렸다).** Anthropic 은 "`high` 에서 시작해 evals 로 내려라"를 권한다(`low`/`medium` 이 이 모델에서 유난히 강하다는 근거). 우리는 **반대로 올린다** — 근거: 코딩 실수가 유출되면 오너가 반복 수정하는 비용이 토큰 비용을 압도한다. 재작업 비용 > 토큰 비용. 이 분기는 의식적이며, 2주 후 `bun run model-usage` + `memory/pattern-history.jsonl` 위반 건수로 재평가한다.

### Opus 5.5 — 라벨은 옮겼고, 양은 다시 잰다 (2026-09-23)

- **라벨이 같아도 양이 다르다.** Opus 5.5 의 API 기본 effort 는 `medium`(Opus 5 는 `high`). Anthropic 평가에서 5.5 의 `medium` 이 코딩·지식업무에서 5 의 `high` 를 넘었고, 같은 라벨이면 5.5 가 **더 오래** 생각한다(특히 `xhigh`·`max` — `max` 는 상한 없음). 덜 생각하게 하려면 프롬프트가 아니라 effort 를 낮춘다. 출처: claude-api 번들(2.1.280) model-migration §Choosing an effort level.
- **오너 결정 (2026-09-23)**: 모델 「전부 전환 (Recommended)」 · effort 「현 라벨 유지 (Recommended)」. 라우팅(`config/ai-routing.json` rev 2026-09-23.1)과 agent 21편의 라벨을 그대로 옮겼다 — 분포 max 7 · xhigh 12 · high 2 · medium 3 불변. 긴 턴·출력 토큰 증가는 **예상된 비용**이다. 같은 날 pay 세션의 오너 요구(원문 비공개 — _quotes.md#CN-10): MODFOLIO.md 설정을 따르되 5.5 가이드를 충족하면서 이전보다 성능을 높인다 — 라벨 유지는 «성능 향상» 을 충족하지만 가이드의 「Opus 5 설정을 옮기지 말고 다시 재라」 는 **측정이 붙어야** 충족된다. 즉 이 라벨은 **잠정**이고, 하향 여부는 우리 환경 실측 뒤 따로 정한다. → **2026-09-23 실측 뒤 한 칸 내림으로 대체**(§v2.5.0 — 이 줄의 «잠정» 이 닫혔다).
- **실측 (2026-09-23 · Claude Code 2.1.280)** — 세 경로가 서로 다르다:

  | 세션 | effort 가 오는 곳 | 전사록 |
  |---|---|---|
  | CLI·headless (env 없음) | 프로젝트 settings `effortLevel: "xhigh"` | `claude -p --model claude-opus-5-5` → `"effort":"xhigh"` — settings 는 Opus 5.5 에 적용된다 |
  | **Desktop** | 실행 인자 `--effort <선택값>` **+ env `CLAUDE_CODE_EFFORT_LEVEL`** (`CLAUDE_CODE_ENTRYPOINT=claude-desktop`) — 부모 원격 서버 env 에는 없다 = 스폰 시 주입 | 메인 `"effort":"max"` · frontmatter `effort: high` 인 agent 도 `"effort":"max"` |
  | subagent | frontmatter — **단 env 가 있으면 env** | 위 Desktop 행 |

  → **Desktop 세션에서는 agent effort 라벨이 전부 Desktop 의 선택값으로 덮인다.** pdgd·pay 가 같은 주입을 독립 관측했다(세 repo 일치). Desktop 이 env 를 넣지 않게 하는 설정은 확인되지 않았다 — **대신 넣은 것을 저장소가 지운다**(아래 §우선순위 실측, v2.4.0): `.claude/settings.json` env 에 `"CLAUDE_CODE_EFFORT_LEVEL": ""`.
  ⚠ **v2.6.0 정정(같은 날 저녁)**: 빈 값은 효과가 없다(재현 안 됨). 주입원은 **Windows 사용자 환경변수**였다 — §환경변수 정책 · `bun run modfolio:effort`.

### settings 가 `max` 를 거부한다 (Known issues 재해석)

- **#30726 / #40093 은 "버그"가 아닐 가능성이 높다.** Claude Code 문서: settings 파일의 `effortLevel` 은 **`low|medium|high|xhigh` 만** 받는다. `max` 와 `ultracode` 는 **세션 전용**이다. `~/.claude/settings.json` 에 `"effortLevel": "max"` 를 적으면 무효값이라 무시되고, 그게 "max 로 설정했는데 medium 으로 돈다"로 관측된다.
- 올바른 처방: settings 는 **`xhigh`**, `max` 는 `/effort max` 또는 `--effort max` 세션 토글, env 는 **미설정**.
- Opus 5 는 **model-default hold 가 없다** — Fable 5·Opus 4.8·4.7 은 첫 실행 시 모델 기본값을 강제로 잡고 명시 선택 전까지 유지하지만, Opus 5 는 이전에 설정한 레벨이 그대로 이어진다. 즉 settings 의 `xhigh` 가 깔끔하게 적용된다.
- ✅ **실측 정정 (2026-09-02, Claude Code 2.1.258)**: settings `"effortLevel":"max"` 는 **수용된다.** 허브가 settings 를 `max` 로 두고 `claude -p` 세션(model `claude-opus-5`)을 띄우자 전사록에 `"effort":"max"` 가 실렸고, pdgd 는 같은 날 대화형 세션에서 같은 값을 관측했다 — **2건·두 모드**. 즉 위 «settings 는 max 를 거부한다(#30726/#40093 재해석)» 는 **낡았다**(그 재해석이 옳았던 버전이 있었는지는 재지 못했다 — 당시 버전으로 재실측하지 않음). **처방은 그대로 `xhigh`** — 이유가 바뀐다: 거부돼서가 아니라 ① `max` 는 ultracode 와 양립하지 않고 ② 전 세션 상시 max 는 rung-2 «근거 있는 상향»(`model-escalation.md` rule (b))과 어긋난다. `max` 는 여전히 세션 토글로 올린다.
- **`max` 와 `ultracode` 는 한 세션에 같이 켜지지 않는다** (pdgd 2026-09-02 실측 — CLI 문자열 *"ultracode needs xhigh"* · ultracode 가동 알림 0건). ultracode 를 쓰려면 세션은 `xhigh`.
  ✅ **실사건 정정 (2026-09-06)**: 허브의 pod 런처(`scripts/ops/pod.ts`)가 `--effort max` 와 `ultracode` 를 **같이** 주입하고 있었다 — 위 문장이 canon 에 적힌 지 나흘 뒤까지 코드는 반대였고, 테스트(`pods.test.ts`)가 그 모순을 **정답으로 잠그고** 있었다. 테스트를 «max ⊥ ultracode» 로 먼저 뒤집어 1 fail 을 인용한 뒤 런처를 `--effort xhigh` 로 고쳤다. 산문이 코드를 못 고친 또 하나의 사례 — 게이트가 잠근다.

### `modelSettings` (모델별 effort · 2.1.257) — 손으로 쓰지 않는다 (2026-09-06)

`/effort` 가 **모델별로** 레벨을 저장하는 키다(2.1.257 릴리즈 노트 «effort saved per-model»). 허브가 «Fable xhigh · Opus xhigh · Sonnet high · Haiku medium» 을 여기 미리 적으려 했으나 **보류**했다: 실제 저장 형식이 **숫자 인코딩**이고 문서화돼 있지 않다 — 추측으로 적으면 `/effort` 가 덮어쓰거나 무시하거나 깨진다. 세션 기본은 `effortLevel` = 정책값(`sessionEffort` · 2026-09-23 저녁부터 `"high"` · 문자열 · 저장된 레벨이 없는 모든 모델에 적용) — 단 주입 env(`CLAUDE_CODE_EFFORT_LEVEL`)가 있으면 env 가 이긴다(아래 §환경변수 정책). 모델별 분리는 Claude Code 가 그 키를 문서화하면 재검토. **주간 사용량 여유에 따른 모델 하향 권고**는 `model-escalation.md` §사용량 거버너(`bun run currency:budget`).

## 환경변수 정책 (v2.6.0 · 2026-09-23 저녁 정정 — ADR-029)

**대화형 세션 effort 는 정책값 `config/ai-routing.json` `sessionEffort`(오너 결정 high · voice WF-28) 이다.** 강제 수단은
세션에 **주입되는** `CLAUDE_CODE_EFFORT_LEVEL` 하나뿐이다. Claude Desktop 은 그 값을 **Windows 사용자 환경변수**에서 물려받아
모든 WSL 세션에 넘긴다(피커 값은 `--effort` 로만 간다) — 점검·변경은 `bun run modfolio:effort`(`--apply` 정책값 · `--set <값>`
오너 예외 · 적용은 Desktop 재시작 뒤 새 세션부터). 저장소 settings 에는 env 를 **두지 않는다**(빈 값도) — 효과가 없다.

**저녁 재측 (Claude Code 2.1.280 · Desktop 의 ccd-cli 와 일반 CLI · 신뢰/비신뢰 폴더 · 전사록 메시지별 `effort`)**:

| OS env | `--effort` | settings `env` | 메인 | subagent(frontmatter medium) |
|---|---|---|---|---|
| – | high | – | high | — |
| max | high | – · `""` · `"high"` | **max** | **max** |
| max | high | `--settings` 플래그 `"high"` | **max** | — |
| high | – | – (`ultrathink` 턴) | high(레벨 그대로 — 아래 §ultrathink) | — |

→ **어떤 settings 층도 주입된 OS env 를 못 이긴다.** 아래 오전 표(X3·X4·X6 — «빈 값이 env 를 지운다 · settings env 가 이긴다»)는
같은 버전에서 **재현되지 않았다** — 이력으로만 남긴다. env 가 고정되면 서브에이전트 frontmatter 도 그 값이 되므로, xhigh 가 필요한
치명 역할은 env 를 뗀 워커(`claude -p --effort …` · `scripts/lib/worker-env.ts`)로 돈다. 주입이 없는 CLI 세션만 settings
`effortLevel`(= 정책값, harness-pull 이 맞춘다)과 frontmatter 를 따른다.

**(이력) 오전 우선순위 표 — 2026-09-23 · 저녁 재측에서 재현 안 됨**:

| # | OS env | `--effort` | settings `env` | settings `effortLevel` | 메인 | subagent |
|---|---|---|---|---|---|---|
| X0 | – | – | – | – | medium(모델 기본) | **low** |
| X2 | – | max | – | – | max | **low** |
| X1 | max | max | – | – | max | **max** ← Desktop |
| X5 | max | medium | – | – | **max** | max |
| X3 | max | max | `""` | – | max | **low** |
| X6 | max | medium | `""` | – | **medium** | low |
| X7 | max | max | `""` | low | max | low |
| X4 | max | max | `"medium"` | – | medium | medium |

- **메인**: settings `env`(값 있음) > OS env > `--effort` > settings `effortLevel` > 모델 기본. **subagent**: 유효 env > frontmatter > 세션 값.
- ⚠ **옛 문장 «env 계층 안에서는 OS env > settings.json env» 는 틀렸다**(X4 — settings env 가 OS env 를 이겼다). 문서 인용으로 적혀 있었고 잰 적이 없었다.
- **빈 값 `""` 은 env 계층을 지운다**(X3·X6) — 메인은 세션 선택(`--effort`)을, subagent 는 frontmatter 를 따른다. env 가 주입되지 않는 표면에서는 무해하다(X0 과 같다).
- 메인 effort 를 저장소가 강제할 수 있는 수단은 env 뿐이고(X7 — `effortLevel` 은 `--effort` 를 못 이긴다), env 로 강제하면 subagent 까지 그 값으로 눌린다(X4). 즉 **메인 = 세션 선택 · subagent/워커 = 라우팅·frontmatter** 가 동시에 성립하는 유일한 배치가 «빈 값 + 세션 선택» 이다.
- 워커(`claude -p`)는 부모의 env 를 물려받는다 — 저장소 **밖** cwd 에서 도는 자식은 settings 를 못 읽으므로 런처가 env 를 지운다(`scripts/lib/worker-env.ts` · `scripts/ops/pod.sh`).

> **실사건 (2026-07-12 ~ 07-26, 2주간)**: 2026-07-09 에 `.claude/settings.json` 의 env-max 를 제거했지만 **`.mise.toml:11` 을 놓쳤다**. mise 는 OS env 로 주입하므로 우선순위가 더 높다 — 24개 agent 의 `max=3·xhigh=13·high=5·medium=3` 보정이 **전부 `max` 로 덮여** 있었고, `templates/.mise.toml` 이 같은 값을 28개 sibling 에 배포했으며, `harness-pull` 은 pull 마다 멤버 `settings.json` 에 env-max 를 **능동 주입**했고, `diagnostic` 은 env-max 가 *없으면* 경고하며 추가를 autofix 로 제안했다. 부수 피해: `ultracode` 는 env 가 xhigh 아닌 값이면 비활성이라 계속 죽어 있었다. → v2.0.0 에서 4개 지점 전부 역전 + harness-pull 이 멤버의 잔재를 **제거**하도록 변경(자가치유).
>
> ⚠ **2026-08-04 정정 — 그 「자가치유」는 `.claude/settings.json` 에만 해당한다.** 이 절이
> 서술하는 사건의 **주범은 `.mise.toml:11`** 인데, `resolveEffortSettingsMigration` 은
> `settings.json` 의 `env` 만 다루고 `.mise.toml` 은 **observe-only** 다
> (`toolkit-config-sync.ts` — 멤버 자율 + v2.4 write-heavy 가 cross-member 오염을 낸 이력.
> **그 경계는 옳고 유지한다**). 실측 2026-08-04(modfolio-notify 제보, 허브 독립 확인):
>
> ```
> modfolio-connect/.mise.toml:17   CLAUDE_CODE_EFFORT_LEVEL = "max"   ← 살아 있음
> modfolio-sign/.mise.toml:17      CLAUDE_CODE_EFFORT_LEVEL = "max"   ← 살아 있음
> modfolio-ecosystem/.mise.toml:10 # NOTE: … 의도적으로 설정하지 않는다  ← 주석뿐(정답)
> ```
>
> connect·sign 의 그 줄 주석이 *"# Claude Code effort baseline — consistent across 22 repos"*
> — **허브가 쓴 문구다.** 템플릿은 2026-07-26 에 정리했지만 **이미 심긴 사본은 안 지워졌다.**
>
> **이 문장이 실제로 한 일**: 「그 사건은 닫혔다」로 읽혀서 **아무도 다시 확인하지 않았다.**
> 「선언은 실물과 대조되기 전까지 주장」이 canon 자신에게 걸린 자리다.
>
> **진짜 결함은 자가치유의 부재가 아니라 침묵이었다.** 관측은 v2.5 부터 계산돼
> `pull-manifest.json` 에 들어가고 있었는데 **리포트에 한 줄도 안 나왔다** — 관측기가
> 아무도 안 읽는 파일에 쓰고 있었고, 상태값도 `diff` 하나라 「멤버 취향」과 「허브가 심어
> 놓고 안 걷어간 값」이 구분되지 않았다.
>
> → 3.50.0: `harness-pull` 이 그 잔재를 **이름과 결과를 대서 리포트에 출력**한다
> (`detectHarmfulMiseEnv`). **쓰지는 않는다** — observe-only 는 «쓰지 않는다» 는 뜻이지
> «말하지 않는다» 가 아니다. 지우는 것은 그 repo 몫이다.

> ⚠ **2026-09-23 — 저장소 밖 세 번째 주입원: Claude Desktop.** Desktop 은 세션을 띄울 때
> 자기 effort 선택값을 `--effort` 인자와 **`CLAUDE_CODE_EFFORT_LEVEL` env 둘 다로** 넘긴다
> (위 §Opus 5.5 실측 표). 이것은 잔재가 아니라 **오너의 UI 선택**이라 라이브 env 는 판정에 쓰지 않는다.
> 결과는 `.mise.toml` 사건과 같았다 — 그 세션의 모든 subagent 가 그 값으로 돌았다.
> **처방(v2.4.0)**: `.claude/settings.json` env 의 빈 값 `""` 이 그 주입을 지운다(위 X3·X6). 오너 2026-09-23 —
> effort 는 세션 설정과 관계없이 MODFOLIO(라우팅)대로. **허브**에서는 `verify:effort-env` 가 이 빈 값을 **요구**한다
> (없으면 위반 · 대조쌍 without→1 / with→0). **멤버에는 그 게이트가 배선돼 있지 않다**(실측 2026-09-23 · pay 관측) —
> 대신 `harness-pull` 이 **pull 마다** 빈 값을 다시 쓴다(지워져도 다음 pull 이 되살린다 · 잠긴 settings 는 경고만).
> 즉 멤버의 보호는 게이트가 아니라 **pull 시점 자가치유**다.

**권고**:
- 값 있는 env 를 두지 않고, `.claude/settings.json` env 에는 **빈 값 `"CLAUDE_CODE_EFFORT_LEVEL": ""`** 을 둔다 → 각 subagent 는 자기 frontmatter effort 로 돈다(Desktop 이 넣은 env 도 지워진다 — 위 ⚠).
- 세션 기본값은 `.claude/settings.json` 의 **`effortLevel: "xhigh"`** 로 준다(env 아님).
- 더 깊은 reasoning 이 필요하면 `/effort max` 를 **세션 단위**로 토글.
- non-effort env(`CLAUDE_CODE_MAX_OUTPUT_TOKENS` 등)는 이 정책과 무관 — 필요 시 설정 가능.

## `ultracode` (신규 — env-max 제거로 비로소 사용 가능)

`/effort ultracode` 는 effort 레벨이 아니라 **Claude Code 설정**이다: `xhigh` 를 모델에 보내면서 **추가로 dynamic workflow 오케스트레이션**을 켠다. 세션 전용, v2.1.203+.

- 진입: `/effort ultracode`, `claude --effort ultracode`, 또는 `--settings {"ultracode": true}`
- **`CLAUDE_CODE_EFFORT_LEVEL` 이 `xhigh` 이외 값으로 설정돼 있으면 워크플로 오케스트레이션이 비활성**된다 — env-max 가 이걸 계속 죽이고 있었다
- settings 파일의 `effortLevel` 은 `ultracode` 를 받지 않는다(세션 전용)

## `ultrathink` (per-turn 심화)

프롬프트 아무 곳에나 `ultrathink` 를 포함하면 그 턴만 더 깊이 추론한다. 세션 effort 설정은 **바뀌지 않고**, API 로 보내는 effort 레벨도 그대로다 — Claude Code 가 in-context 지시를 덧붙이는 방식. (2026-09-23 실측: env `high` 고정 세션에서 `ultrathink` 턴도 전사록 effort `high` — 레벨 예외 수단이 아니다. 레벨을 바꾸는 예외는 세션 단위 `modfolio:effort -- --set` 이나 작업 단위 워커.) `think`/`think hard`/`think more` 같은 다른 표현은 **키워드로 인식되지 않고** 평범한 프롬프트 텍스트로 처리된다.

## 런타임 토글

```
/effort max     # 현재 세션만 최대 effort
/effort xhigh   # 깊은 reasoning (비용 중간)
/effort high    # 기본 reasoning
```

## Modfolio Universe Agent 분류 (2026-05-13 recalibration · 2026-09-23 v2.5.0 한 칸 내림)

### v2.5.0 — 2026-09-23 재측정 뒤 한 칸 내림 (현행)

Opus 5.5 로 실사건 5 케이스(`evals/` — pipe-exit · empty-scan · effort-precedence · eval-e2big · wrapper-marker)를
effort 별로 2회씩 돌렸다(`claude plugin eval` · 구독 OAuth · 자식 전사록의 메시지별 `effort` 로 전제 확인 · 케이스 한도 300초).

| effort | 통과 | 시간 초과 | 벽시계 |
|---|---|---|---|
| medium | 9/10 | 0 | 269s |
| high | 10/10 | 0 | 306s |
| xhigh | 10/10 | 0 | 527s |
| max | 끝난 6/6 | **4/10** | 2149s |

**high 위에서 정확도 이득이 측정되지 않았고** 시간은 1.7배(xhigh)·7배(max)다. Anthropic 이관 가이드
(`shared/model-migration.md` §Opus 5.5 체크리스트)도 「xhigh/max 는 측정된 이득에만」 이라고 적는다.
→ 오너 결정(2026-09-23): **frontmatter 를 한 칸씩 내린다** — max 7 → xhigh · xhigh 12 → high.
라우팅은 `implementation` xhigh → high · `critical-review` max → xhigh. **바꾸지 않은 것**: 세션 `effortLevel: xhigh` ·
라우팅 `escalation.claudeOptIn` max(실패 증거 뒤에만 쓰는 칸) · 스킬 frontmatter(xhigh 6종 — generate-review · modfolio-nonstop · multi-review · orbit · ralph-loop · security-scan) · pod 의 xhigh(ultracode 전제).

⚠ 표본은 5 케이스 · 증거 규율 계열이다 — 구현·설계 과제에서 xhigh 가 이득을 내는지는 **미측정**이다. 그 축에서 실패가
관측되면 되돌리는 근거는 그 실패의 기록이다(`model-escalation.md` rule (b)) — 되돌려도 frontmatter 의 상한은 xhigh 다.
아래 v1.1 · v2.0.0 서술은 이력으로 남긴다.

### v1.1 정책 변경 (Anthropic 공식 권고 흡수)

Anthropic effort docs (2026-05): "Opus 4.7 의 `max` 는 자주 overthinking + 비용 대비 quality 작음. `xhigh` 가 long-horizon coding 의 sweet spot. `max` 는 eval 후 명백히 도움될 때만 상향."

**default = xhigh** (구조화된 코딩 + 리뷰). `max` 는 **명시 정당화** 가능한 영역만:
- 디자인 의사결정 + 대용량 Figma metadata (1M context 필수)
- 보안 코드 (오답 비용 = secret leak)
- P0 장애 triage (오답 비용 = production downtime)

기타 코딩 (component / API endpoint / Drizzle schema / contract / mechanical fix) 은 모두 xhigh — 구조화된 작업이라 max 의 overthinking 위험.

### 표 (2026-09-23 v2.5.0)

값은 전부 v2.5.0(한 칸 내림) 기준이다 — ⬆ 는 07-26 상향의 이력, ⬇ 는 09-23 하향이다.

`xhigh` 카테고리 = **틀리면 비싸거나 비가역**인 7개(v2.0.0 에서는 max). 나머지 코딩·리뷰 12개는 high(v2.0.0 에서는 xhigh). 모델은 medium 3종(haiku 2 · sonnet 1)을 뺀 21개 전부 `claude-opus-5-5` (접미사 없음 · 2026-09-23 전환 — 그 전은 `claude-opus-5`).

| # | Agent | 모델 | effort | 근거 |
|---|-------|------|--------|------|
| 1 | design-engineer | claude-opus-5-5 | **xhigh** | ⬇ 2026-09-23 (max→) · 디자인 의사결정 + Figma metadata 대용량 |
| 2 | security-hardener | claude-opus-5-5 | **xhigh** | ⬇ 2026-09-23 (max→) · 보안 코드 (OWASP — 오답 비용 = secret leak) |
| 3 | incident-handler | claude-opus-5-5 | **xhigh** | ⬇ 2026-09-23 (max→) · P0 장애 triage + 포스트모템 |
| 4 | code-reviewer | claude-opus-5-5 | **xhigh** | ⬆ 2026-07-26 · ⬇ 2026-09-23 — 코딩 실수 유출이 오너가 지목한 통점. 리뷰에서 놓치면 재작업 비용이 가장 크다 |
| 5 | architecture-sentinel | claude-opus-5-5 | **xhigh** | ⬆ 2026-07-26 · ⬇ 2026-09-23 — 불변 원칙 판정, 틀리면 되돌리기 비쌈 |
| 6 | lead-planner | claude-opus-5-5 | **xhigh** | ⬆ 2026-07-26 · ⬇ 2026-09-23 — orchestration 오판이 하위 전체로 전파. trusted-input-only (lethal-trifecta 회피) |
| 7 | migrations-auditor | claude-opus-5-5 | **xhigh** | ⬆ 2026-07-26 · ⬇ 2026-09-23 — 마이그레이션은 **비가역** |
| 8 | page-builder | claude-opus-5-5 | high | ⬇ 2026-09-23 (xhigh→) · 레이아웃 (정형) |
| 9 | component-builder | claude-opus-5-5 | high | ⬇ 2026-09-23 (xhigh→) · UI 컴포넌트 (정형) |
| 10 | api-builder | claude-opus-5-5 | high | ⬇ 2026-09-23 (xhigh→) · 엔드포인트 + Zod (정형) |
| 11 | schema-builder | claude-opus-5-5 | high | ⬇ 2026-09-23 (xhigh→) · Drizzle (정형) |
| 12 | contract-builder | claude-opus-5-5 | high | ⬇ 2026-09-23 (xhigh→) · Zod contracts (정형) |
| 13 | quality-fixer | claude-opus-5-5 | high | ⬇ 2026-09-23 (xhigh→) · 기계 수정 (정공법, 정형) |
| 14 | design-critic | claude-opus-5-5 | high | ⬇ 2026-09-23 (xhigh→) · 리뷰: Anti-Slop |
| 15 | accessibility-auditor | claude-opus-5-5 | high | ⬇ 2026-09-23 (xhigh→) · 리뷰: WCAG AA |
| 16 | evaluator | claude-opus-5-5 | high | ⬇ 2026-09-23 (xhigh→) · Multi-Agent Research Tier 3 — 통합 verdict. file modify 금지 |
| 17 | test-builder | claude-opus-5-5 | high | ⬆ 2026-07-26 (high→xhigh) · ⬇ 2026-09-23 (→high) — 테스트가 곧 정확성 표면 |
| 18 | perf-profiler | claude-opus-5-5 | high | ⬆ 2026-07-26 (high→xhigh) · ⬇ 2026-09-23 (→high) — CF Workers cost/latency 판단 |
| 19 | process-reward-evaluator | claude-opus-5-5 | high | ⬆ 2026-07-26 (high→xhigh) · ⬇ 2026-09-23 (→high) — PRM step-wise verifier, 채점 품질이 학습 신호 |
| 20 | ecosystem-auditor | claude-opus-5-5 | high | ecosystem.json 검증 (관측·리포트) |
| 21 | visual-qa | claude-opus-5-5 | high | Playwright + axe 5-gate (도구 주도) |
| 22 | knowledge-searcher | claude-haiku-4-5-20251001 | medium | 검색/요약 read-only fan-out |
| 23 | innovation-scout | claude-sonnet-5 | medium | context7 조회·비교 |
| 24 | initializer | claude-haiku-4-5-20251001 | medium | 세션 cold-start 3-line summary, read-only |

**분포 합계 (24 agent, 2026-09-23 v2.5.0)**: **xhigh=7, high=14, medium=3** (max=0 · 종전 v2.0.0 = max 7 · xhigh 12 · high 2 · medium 3)

> diagnostic 의 `effort-policy/agent-distribution-drift` 트랙은 위 값을 expected 로 사용. 새 agent 추가 시 이 표 + `scripts/modfolio/diagnostic.ts` 의 `expected` 객체 (`{ max: 0, xhigh: 7, high: 14, medium: 3 }`) 를 함께 갱신해야 drift 알림이 정확하다.
>
> **medium 3종(haiku 2 · sonnet 1)은 상향하지 않았다** — read-only fan-out 이고, Haiku 4.5 는 애초에 `xhigh`/`max` 를 지원하지 않는다.
>
> ✅ **실측 확정 (2026-07-26, Claude Code 2.1.220)**: subagent frontmatter 의 **`max` 는 유효하고, 세션 effort 를 덮는다.** 카나리아 = `--effort low` 로 띄운 헤드리스 세션에서 `incident-handler`(frontmatter `effort: max`)를 소환해 각자의 `CLAUDE_EFFORT` 를 출력 → 메인 `[]`, 서브 `[max]`. `CLAUDE_EFFORT` 는 **모델별 silent downgrade 를 반영한 뒤의** 값이므로(런타임 docstring) Opus 5 에서 `max` 가 강등되지 않음도 같이 증명된다. 위 7개를 내릴 이유가 없다(07-26 판단 — **v2.5.0 에서 대체**: 재측정 뒤 max → xhigh).
>
> 근거 2 (스키마): 바이너리의 agent frontmatter 스키마는 `effort: v.union([v.enum(EL), v.number().int()])` 이고 `EL = ["low","medium","high","xhigh","max"]`. settings 파일의 `effortLevel` 만 제한 enum(`["low","medium","high","xhigh"]`)을 써서 `max` 를 거부한다 — **두 경로가 서로 다른 enum 을 쓴다**는 것이 "settings 는 거부, frontmatter 는 수용"의 정확한 기전이다.
>
> **`thinking_budget` 필드는 폐기됨**(2026-07-09) — Claude Code no-op. v3.0 P2.4 의무화는 거짓 전제였고 21개 agent 에서 제거 완료.

### 등록 불변식 — `name:` 없는 agent 는 존재하지 않는다 (2026-07-26 실측)

**Claude Code 는 subagent 타입을 파일명에서 유도하지 않는다.** `.claude/agents/*.md` frontmatter 에 `name:` 이 없으면 그 파일은 **조용히 레지스트리에서 누락**된다 — 파싱 에러도, 경고도, 게이트 실패도 없다. Agent 도구의 subagent_type 목록에 아예 나타나지 않고, 호출은 런타임에 `Agent type '<x>' not found` 로 실패한다.

- **실측 (2026-07-26)**: 허브 24 agent 중 **23개에 `name:` 이 없어 소환 불가**였다. `initializer` 만 우연히 그 키를 갖고 있어 유일하게 살아 있었다. 24개 전부가 `SHARED_AGENTS` 라 **28개 멤버도 동일 상태**였다.
- **회귀가 아니다**: 이전 바이너리(2.1.207)로 프로브해도 동일 재현이고, `git log` 상 `code-reviewer.md` 는 **최초 커밋부터** `name:` 이 없었다. 828 테스트 + 169 릴리즈게이트를 통과하며 잠복했다.
- **조용히 죽어 있던 것**: `constants.ts` 가 스스로 경고하던 하드 의존 — *"lead-planner = Tier 1, evaluator / process-reward-evaluator = Tier 3. Without these the shared skill breaks on siblings with agent-not-found."* 그 프로즈는 옳았고, 그 조건은 **이미 참이었다**. `multi-review` · `generate-review` 가 그 위에 서 있었다.
- **잠금**: `scripts/harness-pull/tests/agent-registration.test.ts` 가 `name === 파일명 slug` 를 강제한다(음성 대조 확인 — `name` 을 지우면 실제로 실패). 프로즈 불변식은 조용히 썩는다 — `shared-import-closure.test.ts` 와 같은 교훈.

새 agent 를 추가할 때 `name:` 은 선택이 아니라 **존재 조건**이다.

### A/B 검증 정책 (recalibration 결과 모니터링)

각 max → xhigh 전환 후 30일간:
- turn 수 (동일 task)
- output token 누적
- redirect 빈도 (사용자가 "다시 해" 요청)
- pattern-history 의 quality 위반 빈도

이상 신호 발견 시 해당 agent 만 한 칸 복귀하되 **상한은 xhigh**(v2.5.0 — frontmatter 에 max 를 두지 않는다 · max 는 세션 `/effort max` · escalation opt-in 전용) — agent frontmatter 의 `_effort_change_note:` 주석에 결정 근거 cement.

### `_effort_change_note` 주석 컨벤션

frontmatter 안:
```yaml
effort: xhigh   # 2026-05-13 max → xhigh recalibration (Anthropic sweet spot policy, v2.0 dogfood Adopt P0 #7)
```

또는 별도 필드:
```yaml
_effort_change_note: "2026-05-13 max→xhigh per Anthropic policy. Revert if quality regression."
```

## Thinking Budget 정책 (v1.2, 2026-05-13 신설)

> **⚠ 정정 + 제거 완료 (2026-07-09)**: `thinking_budget` 는 **Claude Code agent-frontmatter 지원 필드가 아니다** — Claude Code 는 무시한다(v2.1.198+ subagent 는 메인 대화 thinking 설정 상속, per-subagent thinking 설정 없음). Opus 4.8 thinking 깊이 = **effort 가 제어**(adaptive; 수동 `budget_tokens` 는 400). **이 세션(2026-07-09)에서 no-op 필드 제거 완료**: 21 agent frontmatter 에서 삭제 + `sync-thinking-budget.ts` 폐기 + diagnostic `thinking-budget-drift` 트랙 제거. **아래 하위 섹션(v3.0 의무화·4-level 표·'Claude Code 추상화'·측정 트랙)은 이 정정으로 SUPERSEDED — 역사 보존**이며, 그 매핑/budget 값은 **Anthropic SDK 를 직접 호출하는 sibling 앱**에만 참고용(Claude Code agent 에는 무효).

Anthropic 2026 Q2 신기능:
- **Opus 4.7 Adaptive thinking** (2026-04-16 출시) — 자동 thinking budget 조절, extended thinking 미지원
- **Sonnet 4.6 Extended thinking** (2026-02-17 출시) — 명시 thinking_budget 지정, visible thinking
- **Haiku 4.5** — Adaptive thinking 미지원 (필드 무시)

effort 와 **직교 dimension**: effort = 조절 강도 / thinking_budget = reasoning 깊이. 둘 다 명시 가능.

### Thinking budget 4-level 표

| Level | Token budget | 권장 대상 | effort 매핑 |
|---|---|---|---|
| **adaptive** (Opus 4.7 only) | 자동 (~8k-32k 범위) | 일반 — 모델이 task 복잡도 판단 | max / xhigh / high |
| **deep** | 32,768 | 복잡 reasoning (보안 코드, P0 장애 triage, 디자인 의사결정) | max |
| **standard** | 8,192 | 구조화된 코딩 (component / API / schema / contract / 리뷰) | xhigh (기본) |
| **light** | 4,096 | 검증 / 테스트 / 단순 리뷰 | high |
| **minimal** | 2,048 | 검색 / 요약 / 결정적 검증 | medium |

### agent frontmatter (v2.34 옵션 → v3.0 의무화)

v2.34 에서는 **옵션** (미설정 시 effort 기반 inference):

```yaml
---
name: design-engineer
model: claude-opus-4-8[1m]
effort: max
thinking_budget: deep      # v2.34 옵션 (max 와 매핑 자동 inference 가능)
# 또는
thinking_budget: adaptive  # Opus 4.7 Adaptive 자동 조절
---
```

v3.0 부터 **의무** — 모든 agent frontmatter 에 `thinking_budget` 명시. v3.0 마이그레이션 시 자동 일괄 추가 (effort → thinking_budget 매핑 표 기준).

### Sonnet 4.6 Extended thinking

Sonnet 4.6 은 **명시** thinking budget 지정. Anthropic SDK 직접 호출 sibling 의 경우:

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  thinking: { type: "enabled", budget_tokens: 8192 },  // standard 매핑
  messages: [...],
});
```

**[정정 2026-07-09]** — Claude Code 는 `thinking_budget` frontmatter 를 지원/추상화하지 **않는다**(위 박스). 이 SDK 코드 예시는 **Anthropic SDK 직접 호출 sibling** 전용이며 Claude Code agent 와 무관하다(Claude Code agent 는 effort 로 thinking 제어).

### Haiku 4.5 미지원

Haiku 4.5 는 Adaptive / Extended thinking 둘 다 미지원. frontmatter `thinking_budget` 필드는 **무시** (warning 없음). Haiku agent 2(knowledge-searcher · initializer)는 `thinking_budget` 명시 불필요(innovation-scout 는 Sonnet 5 다).

### 비용 영향

thinking token 은 **output token 으로 청구**. budget 32,768 = output $25/MTok × 32k ≈ $0.8 per request (Opus 4.7).

- adaptive (자동) — 평균 ~$0.2 per request (보통 task)
- deep (32k 고정) — $0.8 per request (high-stake task)
- standard (8k) — $0.2 per request
- light (4k) — $0.1 per request
- minimal (2k) — $0.05 per request

권고: **adaptive 가 기본**. deep 은 명시 정당화 가능 영역만 (보안 / 장애 / 디자인 의사결정).

### 측정 — `effort-policy/thinking-budget-drift` 트랙 (diagnostic.ts)

`scripts/modfolio/diagnostic.ts` 의 `effort-policy` 트랙 내부 신설 finding (v2.34):

- 21 agent 의 `thinking_budget` 분포 측정
- expected (v2.34 baseline): `{ adaptive: 0, deep: 0, standard: 0, light: 0, minimal: 0, absent: 21 }` (모든 agent 미설정 — v2.34 옵션 단계)
- v3.0 expected (의무화 후): `{ deep: 3, standard: 11, light: 4, minimal: 3, adaptive: 0, absent: 0 }` (effort 분포와 1:1 매핑)
- drift 감지 시 info finding — `knowledge/canon/opus-4-7-effort-policy.md` v1.2 표 참조 권고

### Anti-patterns

- `effort: xhigh` + `thinking_budget: deep` — overthinking. xhigh = standard (8k) 가 sweet spot
- `effort: medium` + `thinking_budget: deep` — Haiku 4.5 인데 thinking_budget 명시 = 의미 없음, frontmatter noise
- adaptive 와 명시 budget 동시 — 충돌. adaptive 선택 시 다른 필드 없음
- 모든 agent 를 deep 으로 설정 — 비용 폭증, R1 위험

## Prompt caching 연계

**Opus 5 는 캐시 최소 길이가 512 토큰**이다 — Opus 4.8 의 1,024 에서 절반. 이전에 "너무 짧아 캐시 안 됨"으로 포기했던 prompt 가 **코드 변경 없이** 캐시 엔트리를 만든다. 짧은 system prompt 를 쓰는 agent 는 재확인할 가치가 있다. (최소값은 세대별로 단조롭지 않다 — Opus 4.6·Haiku 4.5 는 4,096.)

1. **1M 컨텍스트가 기본**: Opus 5 는 전 세션이 1M 이라 큰 prefix 를 담기 쉽지만, 그 prefix 를 매 호출 재처리하면 비용이 선형 증가한다. `cache_control` breakpoint 를 frozen 부분 끝에 명시해야 효율이 나온다.
2. **tokenizer**: Opus 5 는 Opus 4.7/4.8 과 동일 tokenizer — 4.8 에서 올라올 때 토큰 수는 대체로 그대로다. (4.6 이하에서 올라오면 최대 1.35배.)

실무:
- **모델 전환 시 cache 는 model-scoped 라 전부 rebuild** 된다. Opus 4.8 → Opus 5 첫 호출은 write premium 을 예상할 것 — 전환 직후 `bun run cache-hit` 수치가 일시적으로 떨어지는 건 정상이다.
- 큰 컨텍스트를 싣는 agent(`design-engineer` / `page-builder` / `code-reviewer` / `migrations-auditor`)는 caching breakpoint 명시 효과가 가장 크다.
- Claude Code 는 harness 레벨에서 자동 caching 하지만 (`.claude/settings.json` 의 `ENABLE_PROMPT_CACHING_1H=1` 확인), **member repo 가 Anthropic SDK 를 직접 호출할 때는** 수동 설정 필수.

자세한 배치 원칙/비용 모델/측정 지표는 [prompt-caching.md](prompt-caching.md) canon 참조. harness 레벨 1h vs 5m TTL 운영 정책은 [prompt-caching-strategy.md](prompt-caching-strategy.md).

## 비용 guard

- `max` 남용 시 token 소비 급증. `/effort high`로 런타임 하향 가능
- `verify:effort-env` 가 저장소 안의 **값 있는** `CLAUDE_CODE_EFFORT_LEVEL` 대입을 위반으로, `.claude/settings.json` 의 빈 값 **부재**를 위반으로 센다(위 「환경변수 정책」 · v2.4.0 — `preflight` 은퇴). ⚠ **허브에만 배선된 게이트다** — 멤버에는 로컬 게이트가 없고, `harness-pull` 이 pull 마다 빈 값을 되살리는 자가치유로 지킨다(v2.4.1)
- 월별 `knowledge/journal/` 비용 관찰 권고
- **Caching hit rate 관찰**: `response.usage.cache_read_input_tokens / total ≥ 70%` 목표. 50% 미만이면 silent invalidator 조사 (자세한 기준 → [prompt-caching.md](prompt-caching.md))

## 참조

- [Claude Opus 4.7 공식](https://www.anthropic.com/claude/opus)
- [Claude Code Model Config](https://code.claude.com/docs/en/model-config)
- [Extended Thinking (Adaptive)](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
