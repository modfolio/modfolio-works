---
title: Codex — 지식을 «들고 다니는 것»에서 «찾아서 여는 것»으로
version: 1.0.0
last_updated: 2026-08-25
tier: standard
applicability: always
# ⚠ `applicability` 는 **닫힌 enum**(always·per-app-opt-in·conditional·doc-only)이다 —
#   자유 텍스트가 아니다. 트리거 문구는 아래 `routes:` 에 적는다. 이 구분을 몰라서
#   초판이 `applicability` 에 산문을 넣었고 기존 검증기가 정확히 잡았다(2026-08-25).
routes:
  - 지식이 늘어나는데 컨텍스트가 안 늘어날 때
  - 새 규칙·교훈을 어디에 둘지 정할 때
  - 「이거 어디에 적혀 있더라」
  - 상시 주입이 예산에 닿았을 때
  # ⚠ 아래 두 줄은 **오너가 실제로 쓴 말**이다(2026-08-25: *"claude.md가 너무 무거워
  #   지는 문제"*). 라우트는 문서의 어휘가 아니라 **찾는 사람의 어휘**로 적는다 —
  #   지어낸 트리거는 아무도 안 쓰는 말이 된다.
  - CLAUDE.md 가 너무 무거워질 때
  - 컨텍스트가 무겁다 · 주입이 많다 · 토큰이 아깝다
sync_to_siblings: true
consumers: [all-agents, harness, knowledge, new-app]
related_canon: [instruction-drift, knowledge-sovereignty, attention-budget, reasoning-playbooks, knowledge-corpus-ops]
related_rules: [agent-evidence, fundamentals-first]
---

# Codex — 컴파일된 지식 그래프

> **한 줄.** 지식은 **찾아서 여는 것**이지 매 턴 들고 다니는 것이 아니다.
> 코퍼스를 링크된 색인으로 **컴파일**하고, 상시 주입은 **라우터**로 줄이고,
> 본문은 **필요할 때** 연다.

## 왜 — 측정된 벽

2026-08-25 실측:

```
지식 코퍼스   440 문서 · 4.86 MB
상시 주입     103,692 bytes  (예산 110,000 의 94.3%)  × 30+ repo × 매 턴
문서 간 링크  ~0            (`[[…]]` 3건 / 417 문서)
```

코퍼스는 거대하고 **구조가 없었다.** 구조가 없으면 「전부 주입」 말고는 쓰는 방법이 없고,
예산이 포화되면 **새 교훈이 옛 교훈을 밀어내야만** 들어간다 — 즉 **시스템이 학습을 멈춘다.**

그날 하루에 `context:budget` 게이트가 커밋을 **세 번** 막았다. 세 번 다 옳았고, 세 번 다
처방은 「상한 올리기」가 아니라 **라우팅**이었다.

⚠ 이건 `instruction-drift.md` 가 기록한 그 사건의 **다음 장**이다. 그때 처방은
「라우터 3갈래(게이트 · Muse · 증례)」였고 실제로 207→98KB 를 만들었다. Codex 는 그
라우터에 **네 번째이자 일반형**을 준다: *어느 문서를 열어야 하는지 결정적으로 찾는 것.*

## 3단 점진 공개

| 층 | 무엇 | 비용 |
|---|---|---|
| **L0** `knowledge/codex/ROUTER.md` | 법 목록 + 영역 지도 + 질의법 | 상시 · **2.4KB** |
| **L1** `codex_search(q)` | 후보 id + 트리거 (본문 아님) | 호출 시 |
| **L2** 본문 | 그 파일을 연다 | 호출 시 |

L0 에 **전부** 넣지 않는다. 440편 × 트리거 ≈ 40KB 면 문제를 옮긴 것뿐이다.
L0 에 들어가는 것은 **놓치면 사고가 나는 것**(`tier: law`)과 **찾는 법**뿐이다.

근거: Anthropic Agent Skills 의 progressive disclosure(시동 시 name+description 만,
본문은 발동할 때) · LLM-Wiki(원자료를 **한 번** 컴파일해 링크된 위키로 만들고 이후
질의는 위키에 한다) · 2026 context-engineering 의 공통 결론(정적 파일 → 검색된 컨텍스트).

## 무엇을 컴파일하는가 — **없는 것을 만들지 않는다**

frontmatter 는 **이미 있었다**: canon 124/124 가 `title`·`applicability`·`consumers` 를
갖고 있었고, 일부는 `related_canon` 까지 선언했다. Codex 는 그것을 **읽어서 그래프로
만든다** — 새 필드를 요구하지 않는다.

라우팅 신호가 없으면 **도출**한다. 사람에게 채우게 하면 안 채운다:

| 영역 | 라우트는 어디서 오나 |
|---|---|
| canon·rule | `applicability` · `consumers` · 제목의 부제 |
| skill | **`description`** — Anthropic 규약에서 시동 시 보이는 유일한 필드 |
| project | 파일명이 곧 repo 이름 |
| adr | 첫 헤딩이 곧 결정 내용 |
| 그 외 | 제목. `applicability: always` 는 「아무 때나」가 아니라 **「범위 제한 없음」**이다 |

## Error Book — 컴파일이 발견한 구조적 결함

LLM-Wiki 의 그 개념이다. **치명만 실패로 센다**:

- `duplicate-id` — 주소가 접히면 그래프에서 **여러 문서가 한 점**이 된다(검색이 죽는다)
- `broken-link` — 선언한 참조가 실재하지 않는다
- `malformed-ref` — 참조 형식이 아니다. 컴파일이 **조용히 버리고 있었다**는 뜻이다

나머지(`orphan`·`no-routes`·`undeclared-mention`)는 **수치로만** 보고한다.
상시 빨강은 사람을 게이트 무시하도록 훈련시킨다. 그리고 그 수치가 **줄지 않으면**
지식이 자라기만 하고 엮이지 않는다는 신호다.

## 결정적 색인과 의미 검색은 **대체재가 아니다**

| | Codex | knowledge-rag |
|---|---|---|
| 축 | 어휘 일치 | 임베딩 유사도 |
| 어디 | 로컬 · 항상 있음 | NAS · 있을 때만 |
| 답 | 주소 + 트리거 | 본문 조각 |

한쪽이 0건이라고 다른 쪽도 0건은 아니다. `codex_search` 는 결과가 약하면
**약하다고 말하고** `knowledge_query` 를 가리킨다.

## 무엇을 하지 않는가 (미검사 축 — 명시)

- ❌ **의미 유사도** — 그건 `knowledge-rag` 의 축이다
- ❌ **본문 요약** — 요약은 손실이고, 손실된 사본이 원문의 권위를 빌린다
- ❌ **내용의 정확성·문서 간 모순** — 링크 구조만 본다
- ❌ **자동 승격** — `knowledge-sovereignty.md` 의 consent 게이트를 우회하지 않는다

## 잴 때 여덟 번 틀렸고 **전부 코퍼스가 아니라 컴파일러였다**

이 절이 이 문서에서 가장 실용적인 부분이다. 같은 것을 만드는 사람이 같은 곳에서 넘어진다.

| 무엇 | 왜 위험했나 |
|---|---|
| `SKILL.md` 50편이 한 주소로 접힘 | 링크가 전부 그리로 몰려 **50개 문서가 사라진다** |
| journal 176편에 라우팅 요구 | 과탐 176건 — Error Book 자체를 못 읽게 된다 |
| skill 의 `description` 미독 | 51편이 「신호 없음」 — **내가 안 본 자리에 있었다** |
| 괄호 안 쉼표로 목록 분리 | `주장(line 42-43, 2026-…)` 이 둘로 갈려 **없는 참조** 생성 |
| 파싱 실패를 내용 결함으로 | 「읽기 실패를 판정값으로 환원하지 않는다」 |
| ADR 파일명을 주소로 | canon 은 `ADR-011` 로 참조한다 — **영원히 안 맞는다** |
| `ADR-010` 과 `010a` 접힘 | **다른 결정 둘**이 한 점이 된다 |
| archive 미색인 | 은퇴 canon 을 저널이 참조한다 — 「없는 대상」이 된다 |

**스키마를 코퍼스에 맞췄지, 코퍼스를 스키마에 맞추지 않았다.**
특히 `supersedes` 는 「어느 문서의 **어떤 주장**을」까지 적고 있었다 — 그게 **더 정확한
기록**인데 파서가 좁아서 오류로 불렀다.

## 검색 품질은 홀드아웃으로만 말한다

튜닝셋 5/5 는 **답을 본 시험**이다. 홀드아웃 첫 채점 **1/5** 였고, 실패 4건을 열어 보니
**2건은 정답 라벨이 틀렸다**(*"하네스를 최신으로"* 의 실용적 답은 독트린이 아니라
`skill/harness-pull` 이다). 라벨을 허용 집합으로 고치고 스코어러는 **한 건**만 고쳐 4/5.

> **평가셋의 실패를 보고 고치면 오른 수치는 답을 본 시험의 점수다.**
> 그래서 튜닝셋과 홀드아웃을 파일 안에서 **이름으로 갈라 놓았다.**

## 명령

```bash
bun run codex:compile -- --apply   # 코퍼스 → 색인 + Error Book
bun run codex:router  -- --apply   # 색인 → L0 라우터
bun run codex:search "<질의>"       # L1
bun run codex:gate                  # Error Book 판정 (quality:all 에 배선됨)
bun run plan:build "<만들 것>"      # 짓기 전에 네 축을 한 번에
```

MCP: `mcp__ecosystem-state__codex_search` · `codex_links`.

## 게시본에서는 무엇이 다른가 (실측)

색인과 `knowledge/` 는 `@modfolio/harness` 에 실려 33 repo 로 가고, 멤버는
**설치본에서** `ecosystem-state` 서버를 돌린다(`node_modules/@modfolio/harness/scripts/mcp/…`).
그래서 `codex_search` 는 멤버에서도 **그냥 작동한다** — 별도 설정이 없다.

⚠ 다만 `files` 가 `knowledge/journal/**`·`playbooks/**`·`references/**` 를 **제외**하므로
그 190편은 **주소만 있고 본문이 없다.** 표시하지 않으면 멤버가 결과를 열었을 때 파일이
없고, 그건 「없는 지식」처럼 보인다 — 실제로는 **허브에만 있는 지식**이다.
→ 페이지마다 `shipped` 를 달고 검색 결과에 *「본문은 허브에만」* 을 찍는다.

색인 크기 실측: **618KB**(들여쓰기를 뺀 값 — 2칸 들여쓰기가 **278KB** 였다).
구성은 헤딩 32% · 발췌 13% · 간선 9%. 기계만 읽는 파일이므로 들여쓰지 않는다.

## 멤버는 무엇을 하나

**아무것도 안 해도 된다.** 이건 허브의 코퍼스를 허브가 컴파일하는 것이고, 멤버는
`codex_search` 로 **읽기만** 한다(Hub-not-enforcer).

자기 코퍼스에 같은 것을 하고 싶으면 판단 층(`contracts/codex/`)은 I/O 가 0이라
그대로 쓸 수 있다 — `assembly-law` 의 contracts 표면이다. 복사하지 않는다.
