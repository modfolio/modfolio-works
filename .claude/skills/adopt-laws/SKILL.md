---
name: adopt-laws
description: 이 repo 가 modfolio universe 불변 법칙(tier: law canon)에 대해 어디쯤 있는지 스스로 진단하고, 자기 상황에 맞는 채택 계획 초안을 만든다. hub 는 계획을 주지 않는다 — 법칙과 진단만 준다. harness pull 직후 권장.
user-invocable: true
---

# /adopt-laws — 법칙 자가 진단 · 자가 계획

> **이 스킬은 당신의 repo 를 위한 것이다.** hub(modfolio-ecosystem)가 당신 계획을 대신 세우지 않는다. 여기서 나오는 것은 **갭 리포트와 초안**이고, 무엇을 언제 어떤 순서로 할지는 **이 repo 의 결정**이다.

## 왜 이게 있나

하네스는 대체로 **참고용**이고 각 프로젝트는 독자적으로 발전한다. 그러나 일부 canon 은 `tier: law` 로 표시되어 있다 — universe 정합성의 전제라서다.

`tier: law` 의 계약은 한 줄이다:

> **무엇(what)은 예외 없음. 언제·어떻게(when/how)는 이 repo 자율.**

hub 는 법칙을 진술하고 진단 도구를 배포한다. 일정을 잡지 않고, PR 을 열지 않고, 당신 파일에 쓰지 않는다(Hub-not-enforcer). 그래서 **당신이 스스로 봐야 한다** — 이 스킬이 그 도구다.

## 절차

### 1. 법칙 목록 확인

```bash
ls knowledge/canon/*.md | head -1 >/dev/null   # 동기화 확인용
grep -l '^tier: law' knowledge/canon/*.md
```

동기화된 법칙 canon 을 읽는다. 각 문서의 **§법칙 절만** 먼저 읽어도 된다 — 나머지는 근거와 이력이다.

### 2. 결정적 진단 실행

하네스가 배포한 검증기를 **이 repo 에** 돌린다. 전부 read-only 이고 아무것도 고치지 않는다.

```bash
# 법칙 전체 — 기계가 판정할 수 있는 항목만 (registry-redundancy 제1·2·3조 ·
# assembly-law §2·§3 · knowledge-sovereignty §5·§6)
bun run node_modules/@modfolio/harness/scripts/harness-pull/validate-law-compliance.ts

# 어떤 부품을 제공/소비한다고 선언했나 (assembly-law §3 전체 스키마)
bun run node_modules/@modfolio/harness/scripts/harness-pull/validate-platform-adapter.ts

# agent 가 실제로 등록되나 (name 누락 = 소환 불가)
bun run node_modules/@modfolio/harness/scripts/harness-pull/validate-agent-frontmatter.ts .claude/agents
```

세 검증기 모두 **아무것도 고치지 않는다.** 기본은 advisory(exit 0) — CI 에서 게이트로 쓰고 싶으면 `VALIDATE_LAW_STRICT=1` / `VALIDATE_ADAPTER_STRICT=1` 을 붙이는 건 **이 repo 의 선택**이다.

> 손으로 `grep -c 'npm.pkg.github.com' bun.lock` 을 세지 말 것. 그 숫자는 **`.npmrc` 좌표와 짝지어야만** 의미가 있다(제3조는 "scope 는 pkg 인데 lock 은 GH" 라는 **반쪽 이관**을 가리키지, GH 해상 자체를 가리키지 않는다). 검증기가 그 짝을 본다.

### 3. 법칙별로 자기 상태를 적는다

| 법칙 | 자문 |
|---|---|
| **assembly-law** | 다른 repo 가 쓸 수 있는 걸 갖고 있나? → `platform-adapter.json` 의 `provides` 에 선언돼 있나. 다른 앱 코드를 **복사**해 온 게 있나(있다면 3표면 중 하나로 바꿀 경로는?) |
| **registry-redundancy** | `.npmrc` 의 `@modfolio:registry` 가 pkg.modfolio.io 인가. **`bun.lock` 도 거기서 해상하나**(제3조 — `.npmrc` 만 바꾸고 lock 을 두면 CI 가 조용히 죽는다). 이 repo 가 `@modfolio/*` 를 **게시**한다면 제2조 예외 대상인가 — 하위 워크스페이스에 게시 패키지가 있는 경우(`sdk/` 등)도 포함 |
| **knowledge-sovereignty** | 사용자 데이터를 다루나? → consent 스코프 **미보유 시 ingest 거부** 경로가 코드에 있나(문서 말고). 자기 도메인 지식을 `knowledge/` 에 쌓고 있나 |

### 4. 계획 초안을 남긴다

이 repo 의 관례대로 남긴다 — `knowledge/journal/` 또는 plan 파일. 담을 것:

- 법칙별 **현재 상태**(증거 명령 + 출력 인용. `agent-evidence.md`)
- **하지 않기로 한 것과 그 이유** — 법칙은 what 이 고정이지 모든 걸 지금 하라는 뜻이 아니다
- 다음에 열 때 이어갈 **한 스텝**

## 이 스킬이 하지 않는 것

- ❌ 자동 수정 — 진단만 한다
- ❌ 기한 제시 — 시점은 이 repo 가 정한다
- ❌ hub 에 보고 — 필요하면 `/feedback-send` 로 **당신이** 보낸다
- ❌ 다른 repo 관찰 — 이 repo 만 본다

## 법칙이 틀렸다고 생각되면

법칙도 반증 가능하다. 실측과 다르면 **당신 repo 의 실측이 SoT** 다(`fact-ownership.md`, ADR-014). `/feedback-send` 로 근거(명령 + 출력)와 함께 보내면 hub 가 canon 을 정정한다. 조용히 무시하지 말고, 조용히 따르지도 말 것.

## 관련

- `knowledge/canon/assembly-law.md` · `registry-redundancy.md` · `knowledge-sovereignty.md`
- `knowledge/canon/evergreen-principle.md` — Hub-not-enforcer 의 근거
- `knowledge/canon/fact-ownership.md` — 멤버 실측이 SoT
