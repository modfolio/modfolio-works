---
title: Tech Trends 2026-08 — Adopt/Trial/Watch/Hold
version: 1.0.0
last_updated: 2026-08-17
source: [2026-08-16~17 무인 12h 런 — 1차 출처 직접 대조(Anthropic engineering HTML 173KB · arXiv Atom API · npm/GitHub/CF REST) + 오너 제공 종합 보고서 3편(knowledge/references/260816-*.md, 보조), knowledge/journal/20260817-autonomous-12h.md]
sync_to_siblings: true
applicability: always
consumers: [harness-evolve, preflight, modfolio, plan]
---

# Tech Trends 2026-08

> 월별 trend SSoT. 권고 — 채택·시기 각 repo 자율 (Hub-not-enforcer).
>
> **이번 달의 핵심은 신기술이 아니라 «우리가 믿고 있던 것의 검증»이다.** 조사를 시작하니
> 우리 canon 이 fleet 에 배포하던 근거 중 하나가 **원문에 없는 문장**이었고, 방향이 정반대였다.
> 그래서 이 달의 1순위 Adopt 는 새 도구가 아니라 **인용 위생 게이트**다.

| 트렌드 | 분류 | 한 줄 | 이번 release 반영 |
|---|---|---|---|
| **날조 인용 정정 + `citation:hygiene`** | **Adopt(즉시)** | 「80% 절감」이 원문에선 **「15× more tokens」** 였다. 3개월 배포됨 | ✅ 3.66.0 |
| **되돌림 가드 2층** | **Adopt** | `--apply` 가 레포를 뒤로 되돌리는 것을 막는다 | ✅ 3.66.0 |
| **은퇴 stub** | **Adopt** | 배포 멈춘 canon 의 사본이 «현행인 척» 남는 것을 끊는다 | ✅ 3.66.0 |
| **Muse 재프레이밍** (ACE → 메모리 축) | **Trial** | 창립 논문이 2026년 두 그룹에 정면 대조에서 졌다 | ⬜ 다음 |
| **컨텍스트 파일 무효 증거** | **Watch(중대)** | 외부 연구가 우리 A/B 를 독립 재현했다 — 둘 다 null | ⬜ 측정 |
| **GEPA** (ICLR 2026 Oral) | **Trial** | 프롬프트가 아니라 **코드·설정**을 최적화. ⚠ Python 전용 | ⬜ 오프라인 컴파일러로 격리 |
| **PRM (process reward)** | **Hold/축소** | 도메인 밖에서 **동전 던지기**(49.2~52.8%) | ⬜ 스펙 축소 |
| **GraphRAG** | **Hold** | MS 가 **2026-08-14 유지보수 모드**로 돌렸다 | ❌ 도입 안 함 |
| **Astro 7.2 / TS 7 병행 / Playwright Test Agents** | **Trial** | 어댑터가 peer 로 게이트한다 · TS7 은 이중 설치가 공식 | ⬜ repo 자율 |
| **Bun 1.4 / Vitest 5 / SvelteKit 3** | **Hold** | 각각 stable 부재 · peer 하드블록 · 코드모드 prerelease 전용 | 핀 유지 |

---

## 🔴 1. 우리 canon 이 fleet 에 정반대를 배포하고 있었다

`multi-agent-research-pattern.md` v1.0.0 (2026-05-13) 의 「핵심 인용」이 **원문에 존재하지
않는 문장**이었다. 1차 출처를 직접 받아(HTML 173KB, 요약기 미개입) 전건 대조:

| 우리 canon | 원문 — [Anthropic, *How we built our multi-agent research system*, **2025-06-13**](https://www.anthropic.com/engineering/multi-agent-research-system) (대조 2026-08-17) |
|---|---|
| 날짜 「2026-04」 | **Published Jun 13, 2025** (10개월 오차) |
| 인용문 전체 | **부재** |
| 「80% token **efficiency**」 | *"token usage by itself explains 80% of the **variance**"* |
| 토큰 **절감** | *"multi-agent systems use about **15× more tokens** than chats"* |
| 「**Sonnet** as Lead Planner」 | *"**Claude Opus 4 as the lead agent** and Claude Sonnet 4 subagents"* |

`sync_to_siblings: true` 이고 3-tier 에이전트 전부가 소비한다. 그리고 이것이
`opus-5-behavior.md` §2(「Opus 5 는 과하게 위임한다 — 상한을 둬라」)와 **정면 충돌했고
날조된 쪽이 이겼다.**

### 전수 감사 결과가 일반화 가능한 교훈을 준다

canon 의 `핵심 인용` 블록 4개: **1 정확 · 2 위생 결함 · 1 날조.**
**arXiv 인용 11개는 전부 실재·제목 일치.**

> **유일한 날조가 벤더 블로그였다.** arXiv ID 는 API 로 1초에 확인되니 정직하게 유지된다.
> **블로그 URL 은 영원히 200 을 주고 인용문만 표류한다** — 가장 권위 있어 보이는 인용(우리가
> 쓰는 제품 벤더의 1차 엔지니어링 포스트)이 **구조적으로 가장 약하다.**

→ `citation:hygiene` (quality:all 28단계). ⚠ **문자열이 원문에 있는지는 못 본다** —
대조 증거(1차 출처 링크 + 대조 날짜)의 존재만 강제한다. 미검사 축을 실패 메시지에 명시 출력.

## ★ 2. Muse 의 창립 논문이 2026년에 뒤집혔다

Muse 가 근거로 삼은 **ACE(arXiv 2510.04618)** 를 두 독립 그룹이 정면 대조에서 이겼다:

| 연구 | ACE | 승자 |
|---|---|---|
| Meta-Harness (Stanford IRIS, 2026-03-30) | 40.9% @ 50.8K 토큰 | **48.6% @ 11.4K** (+7.7pp, 4× 적은 토큰) |
| AHE (2026-04-28) | 68.9% | seed 하네스가 **69.7%** — ACE 가 **기준선 아래로 퇴행** |

둘 다 같은 구조적 주장을 한다: **이득은 컨텍스트에 주입하는 텍스트가 아니라 도구·미들웨어·
메모리·제어흐름에 있다.** AHE 절제: 도구 +3.3pp · 미들웨어 +2.2pp · **장기기억 +5.6pp** —
ACE 류 루프가 **한 번도 건드리지 않는** 부품들.

⚠ **저자 교집합**: ACE 저자 13명 ∩ Meta-Harness 저자 6명 = **Qizheng Zhang**.
즉 「라이벌의 약한 재구현」이 아니라 **저자 본인의 자기 초월**이다 — 통상 반박이 약해진다.

**Muse 를 뜯으라는 뜻이 아니다.** curator 의 결정성과 counter-gate 는 어느 논문도 시험하지
않은 우리 고유의 좋은 성질이다. 결론은 좁다:

| Muse 의 절반 | 2026 증거 |
|---|---|
| **메모리**(ReasoningBank 류 — 성공·실패에서 전략 증류) | ✅ 견고·개선 중 (WebArena 40.5→48.8) |
| **컨텍스트 주입**(ACE 류 — bullet 축적·주입) | ⚠ **증거가 떠났다** |

→ 다음 수는 bullet 튜닝이 아니라 **«무엇을 최적화하는지»를 넓히는 것.**

## ★★ 3. 외부 연구가 우리 A/B 를 독립 재현했다 — 그리고 짝이 되는 반대편이 있다

**「Do Context Files Help Coding Agents?」**(arXiv 2607.27250) — 실제 머지된 PR 을 숨긴 gold
테스트로 채점. AGENTS.md/CLAUDE.md 주입 3조건 × 288 런:

| 전략 | Claude | Codex |
|---|---|---|
| **none**(파일 제거) | **53.3%** | **58.8%** |
| always_on | 55.6% | 56.9% |
| selective | 55.6% | 52.9% |

**Claude p=1.00 · Codex p=0.66.** 조작 프로브가 결정적이다 — 진짜 AGENTS.md 는
*"아깝게 실패한 케이스를 통과로 바꾼 일이 한 번도 없었다"*.

> 이것이 우리 `20260726-harness-context-ab.md` 를 독립 재현한다 — 96KB vs 1KB,
> rubric 0.938 vs 0.979, Wilcoxon **p=0.109**. **두 연구실 · 다른 도메인 · 다른 통계 · 같은 null.**

**그런데 반대편이 있다** — **HANDBOOK.md**(arXiv 2607.25398, WAB@COLM 2026): 20~124쪽 사규를
**824개 프로그램 판정 기준**으로 잰다(LLM judge 없음). *"최강 모델이 **36.2%** 통과."*
명명된 실패 양식에 ***"달성하지 않은 준수를 보고한다"*** 가 있다 — 우리 `agent-evidence.md`
가 3개월간 싸운 그 문제이고, 이제 숫자가 붙었다.

> **★ 둘은 충돌하지 않는다.** 상시 지시 문서는 **역량을 더하지 않지만**(Khatri)
> **행동을 부분적으로 구속한다**(HANDBOOK), 천장이 **36.2%**.
>
> **우리 canon 이 「에이전트를 더 잘하게」 하려는 것이면 증거는 안 되고 있다고 말한다.
> 「경계를 지우게」 하려는 것이면 부분적으로 되고 있고, 그러면 과제 성공률이 아니라
> «결정적 준수 기준»으로 재야 한다. 우리는 그렇게 잰 적이 없다.**

### ★ 그리고 우리 자신을 재 봤다 — 평가셋이 실사용을 **17pp 과대평가**한다

위 두 논문이 남의 이야기가 되지 않도록 Muse 를 세 축으로 실측했다(2026-08-17):

| 축 | dev(합성 71) | **holdout(33)** | **실트래픽(810 positive)** |
|---|---|---|---|
| hit (정답 ∈ 주입) | 29/71 **41%** | 14/33 **42%** | 196/810 **24.2%** |
| fire (무엇이든 주입) | 60/71 | 25/33 | 708/810 87.4% |
| rank@1 | 23/71 | 13/33 | — |
| 동반 정밀도 (gold/총주입) | 17.7% | 19.7% | **4.4%** |
| 오탐 (정답없음에 주입) | — | — | **1072/1971 = 54.4%** |

읽는 법이 셋이다:

1. ✅ **과적합은 없다.** holdout **42%** ≈ dev **41%** — 「평가셋의 실패 목록을 보고 고쳐서
   오른 점수」가 아니다. 이 축은 정직하다.
2. ⚠ **그런데 실사용은 24.2%** — 평가셋보다 **17pp 낮다.** 합성 프롬프트가 실제 프롬프트보다
   **쉽다**는 뜻이다. 「합성은 회귀를, 실트래픽은 분포를 본다」의 정량판.
3. 🔴 **정밀도가 4.4%** — 주입되는 bullet 의 **95.6%가 노이즈**이고, 정답이 없는 프롬프트의
   **절반 이상(54.4%)에 무언가를 주입**한다.

> **이것이 §3 의 두 논문과 같은 방향을 가리킨다.** 「상시 주입이 역량을 더하지 않는다」는
> 외부 null 결과 위에, 우리 자신의 **정밀도 4.4%** 가 얹힌다. Muse 의 **메모리 축**(성공·실패
> 증류)이 아니라 **주입 축**을 튜닝하는 것이 왜 수익이 안 나는지가 숫자로 보인다.
>
> ⚠ **끄라는 뜻이 아니다** — hit 24.2% 는 0 이 아니고, 주입 비용은 결정적 훅이라 0 토큰이다.
> 다음 수는 **임계 상향으로 정밀도를 사는 실험**(fire 를 낮추고 hit 유지가 가능한가)이고,
> 그건 위 3축을 **바꾸기 전에 기록하고 뒤에 다시 재는** 방식으로만 판정한다.

## 4. 그래프 엔지니어링 — 우리 규모에선 하면 안 된다

**Microsoft 가 GraphRAG 를 2026-08-14 유지보수 모드로 돌렸다.** 사유가 벤더 스스로의 항복이다
— *"the capabilities of frontier models have changed dramatically."* **LazyGraphRAG 는 끝내
출시되지 않았다** — 떠도는 비용 수치는 **아무도 돌릴 수 없는 소프트웨어의 것**이다.

| 실측 | 값 |
|---|---|
| GraphRAG 우위 | **멀티홉 +27.23** · **일반 QA +0.47** |
| 비용 | **$13.19/M 토큰** |
| 벡터→그래프 교차점 | **~77K~146K 단어** — 우리는 바닥보다 한참 아래 |
| ~1,144 문서 규모 | **파일시스템 에이전트 77.4 > BM25 74.7 > DenseRAG 58.1** |

**채택하는 것** (전부 결정적·저비용): 결정적 lexical 레그를 1급으로(LIMIT 벤치 **BM25 97.8 vs
최고 임베더 54.3**, 그것도 **46 문서**에서 — 규모 효과가 아니다) · fusion 튜닝보다 **reranker**
(+0.132 vs +0.036 nDCG@10) · 그래프 산출물 직렬화 전 canonical 정렬 · `ecosystem-graph.ts` 유지.

**지워야 할 주장** (1차 출처 부재): 「$33,000 → $33」 · GitLab 「45× 환각 감소」 ·
「엔티티 해소가 그래프를 40% 줄인다」 · **「Anthropic 이 임베딩을 버렸다」**(유일한 공개 입장은
**hybrid + BM25 + reranking 옹호**).

### ✅ 후속 결론 (2026-08-17 실측) — **canon 그래프 조인은 하지 않는다**

이 레이더가 「엣지를 늘릴 거면 `requires`/`depends-on` 이어야 의미가 있다」로 남겨 둔 항목을
실물로 쟀다. 결론은 **만들지 않는 것**이고, 근거는 세 줄이다.

| 프론트매터 필드 | 선언 canon | 읽는 **스크립트** | 성격 |
|---|---|---|---|
| `consumers` | 114 | **35 파일** | 실제 소비 중 |
| `related_canon` | 8 | 0 | 정형 슬러그 배열 (**49 링크 전부 실재**) |
| `related_rules` | 7 | 0 | 정형 슬러그 배열 |
| `supersedes` | 10 | 0 | **9개가 `[]` · 1개는 산문** — 기계 계약이 아니다 |

- **`related_*` 는 write-only 가 아니다.** 스크립트는 안 읽지만 **파일을 읽는 에이전트가
  프론트매터를 함께 읽는다.** 「선언했는데 아무도 안 읽는다」로 분류하면 오탐이다 —
  atelier 가 `--pill-bd` 로 정정한 바로 그 축(*"폴백이 무엇을 낳는가로 갈린다"*).
- **은퇴가 만든 dangling 링크는 0건이다.** 3.66.0 이 은퇴시킨 canon 5종의 프론트매터
  참조는 **0**, 본문 언급은 15파일인데 **stub 이 자기 은퇴를 스스로 알린다** — 설계대로다.
- 즉 traversal 로 답할 질문이 남아 있지 않다. `ecosystem-graph.ts`(도달성·순환·SPOF)가
  그래프에서만 나오는 질문을 이미 덮는다.

> ⚠ **이 절을 쓰는 동안 프로브가 거짓 발견을 만들 뻔했다.** `supersedes` 값에서 `.md`
> 토큰을 정규식으로 뽑아 *"`cf-workers-builds-api` 가 `cf-deploy` 를 대체한다고 선언한다 —
> 그런데 CLAUDE.md 는 둘 다 현행으로 인용한다"* 는 모순 보고를 쓸 뻔했다. 실값은
> **문서 대체가 아니라 그 문서의 특정 주장 한 줄**을 대체한다는 산문이었다:
> `supersedes: [cf-deploy.md 의 "AI 는 연결 자체 못 한다" 주장(line 42-43, …)]`.
> 산문에서 식별자를 뽑아 구조적 참조로 읽은 것이고, 같은 형태를 이 레이더가 §7 에서
> 이미 두 번 기록했다(`rg -r` · 「비슷한 이름은 근거가 아니다」). **세 번째다.**

## 5. 스택 — 우리는 뒤처져 있지 않다

Vite **8** · Vitest **4.1.10** · Playwright **1.62.1** · Zod **4.4.3** · UnoCSS **66.7.5** ·
SvelteKit **2.70.2** · Neon **1.1.0** · Drizzle **0.45.2** — 전부 현행 stable.
그리고 **우리는 이미 Rolldown 을 쓰고 있다**(Vite 8.2.1 이 `rolldown ~1.2.1` 에 의존하고
`rollup` 의존이 **아예 없다** — 매니페스트 증명, 블로그 아님).

**→ 남은 결정은 전부 「따라잡기」가 아니라 「의도적 선택」이다.**

### 채택 상위 5

1. **TS 7 병행 설치** — ✅ **허브에서 이미 완료**이고 **우리 코드로 재측정했다**(2026-08-17).
   ⚠ Astro/Svelte 체커는 TS 6 필요 → MS 가 **이중 설치**를 명시 제공.

   허브 실물(선언이 아니라 설치본): 루트 `tsc` **7.0.2** · `apps/dashboard` **6.0.3** ·
   `apps/loom` **6.0.3**(로컬, 호이스트 아님). `astro check` 와 앱 `tsc` 는 6 을 쓴다.
   즉 이 항목은 «파일럿 대기» 가 아니라 **가동 중**이다.

   **속도 — 같은 tsconfig · 양쪽 `exit=0` 확인 후:**

   ```
   TS 7.0.2 (Go)   1.91 · 2.01 · 2.30 s
   TS 6.0.3 (JS)  11.50 · 11.87 · 16.37 s   (bun)
                  11.50 · 14.14 s           (node — 런타임 교란 아님을 확인)
   → 약 5.0 ~ 8.6× (loadavg 5.18 하)
   ```

   ⚠ **인용된 「8.7~11.9×」보다 낮다.** 방향은 확정, **크기는 우리 코드에서 더 작다.**
   남의 벤치 숫자를 우리 숫자로 쓰지 않는다.

   ⚠ **그리고 이 측정은 두 번 틀렸다가 잡혔다.** 처음엔 `bunx --bun typescript@6.0.3 tsc
   --noEmit` 로 재서 **TS6 이 0.40s** 라는, TS7 이 4× 느리다는 결과를 얻었다. exit code 를
   보니 **1** 이고 `error TS5112`(tsconfig 무시) — **컴파일한 적이 없었다.** `-p` 를 주니
   이번엔 `TS5042`(project 와 소스파일 혼용) — **`bunx <pkg> tsc <args>` 가 argv 에 소스
   파일을 주입한다.** 앱 로컬 바이너리를 직접 부르고서야 `exit=0` 이 났다.
   확인 안 했으면 *"TS7 이 더 느리다"* 를 33 repo 에 배포했을 것이다 —
   「비현실적 결과가 나오면 대상보다 계측을 먼저 의심한다」의 실사례.
2. **Astro 7.2** — cosmetic 아님. **순서가 있고, 그 순서를 틀리면 26곳이 막힌다.**

   레지스트리 실측 2026-08-17 (`registry.npmjs.org`, 어댑터 peer 직접 조회):

   ```
   @astrojs/cloudflare@14.0.1 · 14.0.2   peer astro ^7.0.0-alpha.2
   @astrojs/cloudflare@14.1.2 · 14.1.7 · 14.2.0   peer astro ^7.0.0
   @astrojs/cloudflare@14.2.1  ← 현 latest      peer astro ^7.2.0     ★ 게이트
   ```

   fleet 실측(Astro 를 의존하는 앱 **33개** 전수):

   ```
   astro 7.2+      5     ← 어댑터 latest 로 바로 갈 수 있다
   astro 7.x<7.2  24     ← `bun add @astrojs/cloudflare@latest` 하면 peer 충돌
   astro 5.x       4     ← 어댑터 12.x. 메이저 둘 뒤 (별건)
   ```

   ⚠ **`latest` 가 이미 7.2 를 요구한다.** 즉 «어댑터만 최신으로» 라는 평소 동작이
   **24곳에서 깨진다.** 순서는 **astro → 어댑터**다. 반대로 하면 peer 충돌이거나,
   더 나쁘게는 `--force` 로 넘겨 런타임에서 터진다.

   ⚠ 현재 짝은 전부 정합이다 — `^7.0.7 | ^14.1.2` 가 어긋난 것처럼 보였지만 14.1.2 의
   peer 가 `^7.0.0` 이라 **유효하다.** 「비슷한 이름/숫자는 근거가 아니다」.

   ⚠ **5.x 4곳은 별개 과제다.** 어댑터 v13 이 조용히 깨는 것들(`Astro.locals.runtime`
   제거 · `imageService` 기본값 `compile`→`cloudflare-binding` · **Pages 빌드 타깃 지원
   중단** · dev 서버 Node→workerd)을 통과해야 한다. 12.x → 14.x 를 한 번에 뛰지 않는다.

   > 강제 아님(Hub-not-enforcer) — 위는 **좌표와 순서**이고 시점은 각 repo 판단이다.
3. **Playwright Test Agents** — 1.62.0 에 `npx playwright mcp` 번들. **버전이 이미 있어 비용 0**
4. **`compatibility_date`** — ⚠ **채택 목록에서 내린다. 스윕하지 않는다** (2026-08-17 판정).

   실측(fleet 전수): **65 설정 · 2025 날짜 6건** — `modfolio-axiom/apps/app` ·
   `umbracast` ×3 (전부 **`2025-01-01`** = 스캐폴드 기본값 냄새) · `modfolio-admin` ×2 (2025-05-21).
   나머지 59는 2026 이고 대부분 2026-02~08 이다.

   > ⚠ **이 항목이 처음에 「subrequest 상한 1,000 → 10,000」을 근거로 들고 있었다. 그건 인과가
   > 아니다.** 1차 출처([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)):
   > 상한은 **플랜**(Free 50 · Paid 10,000, up to 10M)과 **`limits` 설정**으로 정해지고
   > *"compatibility_date 가 그것을 제어한다는 언급이 없다"*. 두 사실을 인접해 적었더니
   > **원인처럼 읽혔다** — 이 레이더가 §1 에서 정정한 「인접 배치가 인과로 읽힌다」의 재발이다.

   그래서 판정은 **하지 않는 것**이다:
   - `compatibility_date` 는 결함이 아니라 **의도된 핀**이다. 「기준보다 과거」 자체는 증상이 아니다
   - 2025 날짜 6건도 **이미 2024-09-23 을 지났으므로 `nodejs_compat` v2 semantics 를 갖는다**
   - 즉 **올려서 얻는 것을 이름 댈 수 없다.** 이름 댈 수 없는 이득을 위해 **배포된 워커 6개**를
     3개 sibling repo 에서 건드리는 것은 「업그레이드의 완료 정의는 그 repo 게이트가 초록」
     기준으로 비용만 확정이다
   - 바꿀 때가 오면 그것은 **그 앱이 특정 런타임 동작을 원할 때**이고, 그 판단은 그 repo 것이다

   ⓘ 남는 관측은 하나다: **`2025-01-01` 4건은 「선택한 값」이 아니라 「안 고른 값」처럼 보인다.**
   그 repo 가 열릴 때 «이 날짜를 의도했는가» 를 한 번 묻는 것으로 충분하다(스윕 아님).

5. **Drizzle 스트래들** — 실측 2026-08-17 (fleet 전수, workspace 패키지 단위):
5. **Drizzle 스트래들** — 실측 2026-08-17 (fleet 전수, workspace 패키지 단위):

   ```
   drizzle-orm  ^0.45.2      ×14   ← 사실상 fleet 표준
   drizzle-orm  ^0.45.1      ×6
   drizzle-orm  1.0.0-rc.4   ×5    ← pdgd 단독 (kit 도 rc.4)
   drizzle-orm  catalog:     ×2    modfolio-connect (bun catalog 참조)
   drizzle-orm  ^0.45.0      ×1    naviaca
   drizzle-orm  ^0.39.0      ×1    muje
   drizzle-orm  ^0.38.0      ×1    modfolio-admin   ← 7 minor 뒤처짐
   ```

   ⚠ **「21 패키지가 갈려 있다」보다 정확한 기술은 이것이다** — 다수는 0.45.x 로 모여 있고,
   갈리는 것은 **양 끝** 둘이다:
   - **pdgd 가 혼자 1.0 RC 에 있다.** 1.0 은 아직 RC 이고 코드모드가 없으며 drizzle-kit v3 가
     마이그레이션 원장 폴더를 건드린다. 그 repo 의 선택이고 **강제 대상이 아니다** —
     다만 0.45.x repo 와 스키마 헬퍼를 공유할 수 없다는 뜻이다
   - **modfolio-admin 0.38.0 · muje 0.39.0** 이 뒤에 남아 있다. 0.38→0.45 는 7 minor 이고
     그 구간에 스키마 API 변경이 있다. **아무것도 실패하지 않으므로** 조용히 오래 산다

   허브는 어느 쪽도 강제하지 않는다(Hub-not-enforcer). 기록하는 이유는 **「fleet 이 0.45.2 에
   정렬돼 있다」가 사실이 아니기** 때문이다.

### 하지 말 것 상위 3

1. **Bun 1.4 / canary** — `main` 이 마지막 릴리즈보다 **1,897 커밋** 앞서고 **1,009,257줄
   Zig→Rust 재작성**을 담았는데 **3개월째 stable 없음**. **1.3.14 핀 유지**

   ⚠ **그런데 「핀 유지」가 선언으로만 있었다** (실측 2026-08-17). 허브 `package.json` 이
   `packageManager: bun@1.3.14` 를 선언하면서 **`engines.bun: ">=1.2.0"`** 을 함께 달고
   있었다 — **같은 파일의 두 줄이 반대 방향**을 가리켰고, 그중 하나는 1.4 를 허용했다.
   → `>=1.3.0 <1.4.0` 으로 정렬(설치 무영향: `--frozen-lockfile` exit 0).

   fleet 실측 — **선언 자체가 없는 쪽이 더 많다**:
   ```
   bun@1.3.14 ×6 · bun@1.3.13 ×4 · bun@1.2.4 ×4 · bun@1.3.11 ×3 · bun@1.3.9 ×1 · bun@1.2.0 ×1
   <선언 없음> ×14   ← amberstella · fortiscribe · keepnbuild · modfolio-dev · modfolio-docs
                       · modfolio-fonts · modfolio-infra · modfolio-on …
   ```
   ⚠ **이건 강제 대상이 아니다**(Hub-not-enforcer) — 각 repo 가 자기 런타임을 정한다.
   다만 「fleet 이 1.3.14 에 핀돼 있다」는 **사실이 아니다**. 그렇게 읽히지 않게 적어 둔다.
2. **Vitest 5** — `@cloudflare/vitest-pool-workers@0.21.3` 이 `vitest ^4.1.0` 만 peer (하드블록)
3. **SvelteKit 3 지금** — 코드모드가 **prerelease 전용**

### ⚠ Oxlint/Oxfmt 는 하드 블로커가 있다

**Oxfmt 는 `.astro` 를 포맷할 수 없다**(상류 미지원) · **Oxlint 는 Astro/Vue/Svelte 템플릿
린팅이 없다**. 우리 주력 파일형이다 → **전환 없음.** 단 **타입 인식 린팅만 가산**은 성립
(typescript-eslint 61규칙 중 **59개**, 실측 **12~18×**, tsgo 기반. Biome 2.5.8 엔 그 능력이 없다).
⚠ 전제 정정: **Biome 은 oxc 의 포크가 아니다** — Rome Tools 계보이고 oxc 저장소에 "biome" 문자열 0건.

#### ✅ 가산 파일럿 실행 결과 (허브, 2026-08-17) — **채택**

판정 기준을 **먼저** 적고 돌렸다: *«타입 인식이 biome+tsc 가 못 보는 정확성 부류를 1건
이상 찾으면 채택, 스타일만이면 미채택»*. 결과는 기준을 넘었다.

```
oxlint 1.78.0, 대상 scripts + contracts

평문        28건  — 전부 warning · 전부 unicorn(스타일) + oxc(only-used-in-recursion) 1
--type-aware 79건  — +51 이고 그중 정확성 부류:
   no-floating-promises        13    비동기 실패가 조용히 유실된다
   restrict-template-expressions 11
   no-base-to-string           10    ⚠ athsra 가 기록한 `[object Object]` 그 부류
   require-array-sort-compare   6    숫자 .sort() 가 사전순
   await-thenable               6
   no-redundant-type-constituents 4
   no-implied-eval              1    보안(ASI05 축)
```

**실제로 결함 하나를 찾았고 고쳤다.** `settings-adapt.ts` 가
`` `extraHooks: entry without a 'file' — skipped (${String(raw)})` `` 였는데, **그 분기가
발동하는 경우가 `raw` 가 `.file` 없는 객체일 때**라 메시지는 항상
`skipped ([object Object])` 였다 — 어느 항목이 잘못됐는지 알려주려고 존재하는 진단이
아무것도 알려주지 않았고, **그 note 는 멤버의 `harness-pull` 리포트에 실린다.**

⚠ **그러나 10건을 «10개 버그» 로 읽지 말 것.** `no-base-to-string` 다수는
`unknown ?? fallback` 형태다 — TS 가 `unknown` 을 `??` 뒤에서 `{}` 로 좁히기 때문에
린터가 «will» 이라고 말하지만 **런타임 값은 문자열이다.** 즉 대부분은 **타입 위생**이고
실동작 버그는 위 한 건이었다. 린터의 **«may» / «will» 은 타입 이야기이고 값 이야기가 아니다.**

**배선: `bun run lint:types` (비차단).** `quality:all` 에 **넣지 않았다** — 79건 warning 을
그대로 넣으면 상시 노이즈가 되고, 그게 「사람을 게이트 무시하도록 훈련」시킨다.
트리아지가 끝난 규칙부터 개별로 승격하는 것이 순서다.

> 여전히 **전환은 아니다** — Oxfmt 가 `.astro` 를 못 만지고 템플릿 린팅이 없다는 사실은 그대로다.

## 6. 인수 — 둘 다 일어났다 (배타 아님)

| 딜 | 날짜 | 1차 출처 |
|---|---|---|
| **Cloudflare ← Astro Technology Company** | **2026-01-16** | [CF 프레스](https://www.cloudflare.com/press/press-releases/2026/cloudflare-acquires-astro-to-accelerate-the-future-of-high-performance-web-development/) · [astro.build](https://astro.build/blog/joining-cloudflare/) |
| **Cloudflare ← VoidZero** (Vite·Vitest·Rolldown·Oxc) | **2026-06-04** | [voidzero.dev](https://voidzero.dev/posts/voidzero-cloudflare) |

중립성 명시: *"Astro stays open-source and MIT-licensed"*, Astro 7.0 은
`cacheNetlify()`·`cacheVercel()`·`cacheCloudflare()` **셋을 동시에** 출하했다.

> ⚠ **이 항목에서 허브가 한 번 틀렸다.** 리서치 에이전트 하나가 「인수 증거 없음」이라
> 보고했고(피인수사 블로그만 뒤졌다), 허브가 그 **완충된 부정을 단정으로 굳혀** 독립 출처
> 셋의 합의를 뒤집었다. **부정 결과는 긍정보다 입증 책임이 크다** — ① 독립 출처 다수와 충돌
> ② 탐색 범위가 한 도메인 ③ 도구가 예산 소진을 신고, 셋 중 하나라도 걸리면 부정 결론을
> 채택하지 않는다.

## 7. 도구 신뢰도 (실측 — 이 조사 자체의 계측)

| 도구 | 무엇에 쓰나 |
|---|---|
| **WebSearch** | 발견. ⚠ 예산 소진 신고를 **판정 입력**으로 읽는다 |
| **WebFetch** | 산문 이해 **전용**. ⚠ **날짜·수치·표 금지**(작은 모델 요약 — 이번에 날짜 2년 조작·표 3회 손상) |
| **arXiv Atom API** (`curl`) | **논문 사실 판정** — 요약기 미개입 |
| **GitHub REST / npm registry** | 저장소·버전 판정 |

⚠ **`pushed_at` 은 「살아 있다」가 아니다** — GraphRAG 는 `pushed_at 2026-08-14` 인데 그 push 가
**기능 동결 커밋**이었다.

⚠ **`rg -r` 은 `--replace` 다 — 조사에 쓰지 않는다.** 이 런에서 **세 번** 밟았고 그중 하나는
형제에게 보낼 **거짓 피드백 초안**까지 갔다(발신 전 회수). `agent-evidence.md` 에 전면 금지로 등재.

## 미완 (정직하게)

- **PRM 스펙 축소** — 결정만 났고 문서는 아직 v1.0.0
- **웨이브4 측정 4종** — 노이즈 플라시보 · hypothesis-only 절제 · judge 스타일 편향 · ICC
- **계측 불가로 남긴 것**: Anthropic 의 29%/39%/84% context-editing 수치는 **제품 공지에만
  있고 문서엔 없다**(2차) · Agent Skills 「50 skill ≈ 5,000 토큰」은 **벤더 미공개** ·
  MRCR v2 의 Anthropic 1M 수치는 **출처 간 모순**. **canon 에 넣지 않는다.**

⚠ **벤더 편향 3건 명시**: Google 의 long-context 문서는 *"전부 넣으라"* 는데 **입력 토큰이
매출**이고 자사 ADK 는 compaction 을 출하한다 · Chroma(벡터DB)가 「롱컨텍스트 열화」를,
메모리 제품사가 「그 계측 무효」를 냈다 — **둘 다 각자 파는 방향을 가리킨다** ·
Anthropic 의 컨텍스트 기능 수치는 **전부 자체 내부 eval, 외부 재현 없음**.

⚠ **외부 주장에도 우리 기준을 댔다**: AHE 의 69.7→77.0 은 **p≈0.24 로 우리 게이트를 못
통과**하고, PRM 취약성 논문 2편은 **1저자가 같아 독립 재현이 아니며**, A2A 의 「프로덕션
채택」은 **이름 붙은 사용자가 사실상 0**이다. 남의 논문이라고 기준을 낮추지 않는다.
