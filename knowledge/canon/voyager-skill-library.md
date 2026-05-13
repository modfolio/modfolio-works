---
title: Voyager Skill Library — 22 Sibling 의 자율 skill 공유 manifest
version: 1.0.0
last_updated: 2026-05-13
source: [Voyager (Wang et al. 2023, https://voyager.minedojo.org/), Skill Library 패턴 (composable skill 재사용), harness v2.35 P1.6 (plan crystalline-sparking-sky)]
sync_to_siblings: true
applicability: always
consumers: [harness-pull, harness-evolve, ecosystem, modfolio]
---

# Voyager Skill Library — 22 Sibling 자율 skill 공유

> **핵심 인용** (Voyager, NeurIPS 2023): "An ever-growing skill library of executable code... composable, transferable across agents."

modfolio universe 의 22 sibling 이 각자 고유 skill 을 개발할 때, universe 가 **manifest 만 aggregate** 하여 다른 sibling 이 자율적으로 발견·채택할 수 있게 한다. 실 skill 파일은 sibling git remote 에 유지 — universe 는 metadata 만.

## Hub-not-enforcer 정합

본 패턴은 `evergreen-principle.md` 의 **pull-based + 권고만** 원칙 위에 빌드:

- 강제 X — sibling SKILL.md frontmatter 의 `share: true` 명시한 skill 만 manifest 에 collect
- silent registration 없음 — sibling owner 가 의도적 opt-in
- 다른 sibling 이 채택하려면 명시 `--from-sibling <repo>` 옵션 (v3.0 P2.6)

## share-eligible skill 의 frontmatter

sibling SKILL.md 가 share 의도면:

```yaml
---
name: writing-grade
description: 라이팅 문법 첨삭 rubric (Fortiscribe 자체 개발)
effort: xhigh
share: true                  # ← universe manifest 에 collect 동의
share_applicability: per-app-opt-in
share_description: "한국어 라이팅 문법 평가 rubric + few-shot example. modfolio-press / gistcore 후속 활용 후보."
share_examples:
  - "src/lib/grading/rubric.ts"
---
```

`share: false` (또는 미설정) 이면 manifest 에 collect 안 됨 — default opt-out.

## Manifest 형식 — `ecosystem.json.siblingSkills`

```jsonc
{
  "siblingSkills": [
    {
      "repo": "fortiscribe",
      "skillName": "writing-grade",
      "skillVersion": "1.0.0",
      "description": "한국어 라이팅 문법 평가 rubric + few-shot",
      "applicability": "per-app-opt-in",
      "examples": ["src/lib/grading/rubric.ts"],
      "lastIndexed": "2026-05-13T12:00:00.000Z",
      "sourceUrl": "https://github.com/modfolio/fortiscribe/blob/main/.claude/skills/writing-grade/SKILL.md"
    },
    {
      "repo": "gistcore",
      "skillName": "pronunciation-rubric",
      ...
    }
  ]
}
```

universe 측은 metadata 만 — 실 skill 파일 (~5KB) 은 sibling git remote 에 유지. 본 manifest 가 발견 path 만 제공.

## Collect mechanism — `scripts/harness-pull/skill-manifest.ts`

CLI:

```bash
bun run scripts/harness-pull/skill-manifest.ts collect   # 22 sibling 의 share: true skill manifest 출력 (stdout JSON)
bun run scripts/harness-pull/skill-manifest.ts show      # ecosystem.json.siblingSkills 표시
bun run scripts/harness-pull/skill-manifest.ts verify    # manifest 와 ecosystem.json 정합 검증
bun run scripts/harness-pull/skill-manifest.ts apply     # ecosystem.json.siblingSkills 갱신 (host sibling 환경 전용)
```

`collect` 는 host sibling 환경 (~/code/<repo>/) 의 SKILL.md frontmatter 만 read. host sibling 부재 시 SKIPPED — 22 sibling 자율성 침해 X.

## Pull mechanism — `skill-manifest pull <repo> <skill>` (v3.0 P2.6 cement 완료)

다른 sibling 이 채택하려면:

```bash
# 직접 script (sibling 안에서 invoke)
bun run scripts/harness-pull/skill-manifest.ts pull fortiscribe writing-grade --dry-run
bun run scripts/harness-pull/skill-manifest.ts pull fortiscribe writing-grade --apply

# 또는 named flag form
bun run scripts/harness-pull/skill-manifest.ts pull --from-sibling fortiscribe --skill writing-grade --apply
```

- `--dry-run` (default — no `--apply`) — diff + 첫 30줄 미리보기
- `--apply` 명시 시 sibling skill 을 자체 `.claude/skills/<skill-name>/` 에 복사
- 채택 후 sibling 의 자율 (수정 자유 — git diverge OK, upstream sync 없음)

### 정공법: Voyager pattern — adopt then customize

복사 후 source 와의 sync 자동화 없음. 의도적으로 sibling 마다 customize 자유:
- sibling A 가 fortiscribe writing-grade 를 가져옴
- sibling A 가 자체 rubric 에 맞게 수정
- fortiscribe 의 후속 변경은 sibling A 가 명시 `pull --apply` 재호출 시만 반영
- Hub-not-enforcer 정합 — 강제 sync X

source 검증 게이트:
- source SKILL.md 의 frontmatter 에 `share: true` 명시 필수 (opt-in)
- 없으면 pull 거부 (`source is not share-eligible`)

## modfolio universe baseline (v2.35 출시 시점)

v2.35.0 cement 직후 expected baseline:

| 항목 | 값 |
|---|---|
| `share: true` 명시 sibling skill 개수 | **0** (모든 22 sibling 자율, 강제 X) |
| ecosystem.json.siblingSkills | `[]` (빈 배열) |
| host sibling 환경 collect 가능 여부 | 부재 시 SKIPPED |

baseline 0 이 정상 — sibling owner 가 의도적 `share: true` 명시할 때만 증가. 강요 X.

## 정공법 5원칙 정합

- 1원칙 (근본 수정) — silent collect 금지. 명시 opt-in
- 2원칙 (에러 0) — manifest schema 위반 시 verify fail-fast (Zod)
- 3원칙 (장기 시야) — 22 sibling 자율 sustainability — universe 는 발견 path 만 제공
- 4원칙 (신기술 포텐셜) — Voyager pattern 의 lifelong learning + skill transfer 학술 정합. Anthropic Multi-Agent Research 의 multi-agent specialization 정합
- 5원칙 (리소스 투자) — manifest collect overhead 작음 (frontmatter parse 22회). 발견 가치 큼

## 22 sibling 자율성 보호 (R2 mitigation)

`evergreen-principle.md` v2.3 의 §"신 도구 도입 시 sibling 자율성 보호" 정합:

- ✅ default opt-out (`share: false` 또는 미설정)
- ✅ host sibling 환경 부재 시 SKIPPED (universe 측 Dev Container 침해 없음)
- ✅ pull-based (다른 sibling 이 의도적 `--from-sibling` 호출만 채택)
- ✅ sibling 의 skill 변경 시 universe manifest 는 다음 collect 호출 후 갱신 (real-time 강제 X)

## 출처

### Primary

- [Voyager — An Open-Ended Embodied Agent (Wang et al. 2023)](https://voyager.minedojo.org/) — skill library 패턴 원전
- [Voyager arXiv 2305.16291](https://arxiv.org/abs/2305.16291) — composable / transferable skill 학술 frame

### 관련 modfolio canon

- `evergreen-principle.md` — Hub-not-enforcer (pull-based 강제 X)
- `multi-agent-research-pattern.md` — Lead Planner 가 sibling skill 을 Generator delegate 시 참조
- `harness-adoption-guide.md` — harness-pull 동작 원리
- `agentic-engineering.md` — agent 의 skill 발견 / 재사용 pattern

## 갱신 이력

- **2026-05-13 v1.0.0** — 초판. plan crystalline-sparking-sky P1.6 cement. manifest schema + collect mechanism. `--from-sibling` CLI flag 는 v3.0 P2.6 으로 보류. baseline 0 (sibling 자율, 강제 X).
