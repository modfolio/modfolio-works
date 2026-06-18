---
title: Anthropic Agent Skills — 공개 표준 (agentskills.io)
version: 1.0.0
last_updated: 2026-05-24
source: [Anthropic engineering blog 2025-12-18, agentskills.io, 2026-05-24 app-stack 신기술 평가]
sync_to_siblings: true
applicability: always
consumers: [harness-pull, modfolio, harness-evolve]
---

# Anthropic Agent Skills — 공개 표준

> 2025-12-18 Anthropic 이 `.claude/skills/<name>/SKILL.md` 포맷을 공개 표준화 (agentskills.io). OpenAI / Google / GitHub Copilot / Cursor 도 채택 추세. **universe `.claude/skills/*` 는 이미 표준 호환** — skill portability 가 자산.

## TL;DR

- **현재 (이미 적용)**: universe 의 44+ skill (`.claude/skills/<name>/SKILL.md`) 이 standard 포맷 따름. 작성 시 frontmatter (`name`, `description`, `allowedTools` 등) + body (markdown) 구조.
- **포팅 가치**: 동일 SKILL.md 를 Cursor / GitHub Copilot / OpenAI Custom GPT 등에 그대로 import 가능. 향후 사용자가 universe 외 도구를 쓰는 sibling 협업자에게 skill share 시 즉시 사용 가능.
- **앞으로**: 새 skill 작성 시 표준 frontmatter 엄수 — 비표준 field (예: `thinking_budget`) 는 Claude Code 전용으로 명시. portability 깨지지 않게.

## 표준 SKILL.md frontmatter

```markdown
---
name: <kebab-case-name>
description: <one-line for routing>
allowedTools:
  - <ToolName>
  - <Another>
# optional
inputs:
  - name: <param>
    description: <what>
    required: true
outputs:
  - <what>
---

# Skill body — markdown content

[skill 의 절차 / 패턴 / 예시 / 함정]
```

universe 추가 field (Claude Code 전용, 다른 도구 무시):
- `thinking_budget: <low|medium|high|xhigh|max>` — Opus 4.7 effort hint
- `model: <claude-opus-4-8|claude-sonnet-4-6|claude-haiku-4-5>` — 모델 명시
- `effort: <level>` — 동의어 (older convention)
- `trust_class: <trusted-input-only|untrusted-input>` — lethal-trifecta governance (`.claude/rules/lethal-trifecta.md`)

## 호환성 매트릭스 (2026-05 기준)

| Tool | SKILL.md format | namespace | 호환 정도 |
|------|----------------|-----------|----------|
| Claude Code (universe) | ✅ native | `.claude/skills/<name>/SKILL.md` | 100% |
| Cursor | ✅ supported (2026-Q2) | `.cursor/skills/...` 또는 그대로 | 95% (특정 field 차이) |
| GitHub Copilot Workspace | ⚠ beta | `.github/copilot/skills/...` | 80% |
| OpenAI Custom GPT (Code Interpreter) | ⚠ partial | system prompt 변환 | 70% (manual mapping) |
| Codex / 기타 | varied | 매핑 필요 | 50-70% |

## 정공법 정합

- **이미 채택**: universe 가 표준 등장 전부터 동일 포맷 사용 — drift 0. 행운.
- **장기 시야**: 새 도구 등장 (예: 2026-Q4 Anthropic Managed Agents) 에 SKILL.md 그대로 사용 가능. vendor 별 재작성 0.
- **확장성**: skill 추가 시 표준 field 유지 + 우리 확장 field (thinking_budget 등) 분리. 다른 도구 사용자가 import 시 우리 확장 field 만 무시 (graceful degradation).
- **신기술 포텐셜**: agentskills.io 의 skill marketplace / share / discovery 기능 향후 활용 가능.

## 함정 (작성 시)

- **frontmatter 의 universe 확장 field 를 표준 field 처럼 박지 말 것** — `thinking_budget` 은 Claude Code 전용. README 또는 별도 doc 에 universe extension 명시.
- **SKILL.md body 안에 universe-specific tool 명령 (`athsra run ...`, `/journal` 등) 넣을 때 prefix 또는 condition 명시** — 다른 도구로 import 시 그 줄은 무시 가능하도록.
- **명시 dependencies 누락 X** — `allowedTools` 에 사용하는 모든 tool 명시. 표준 reader 가 의존성 검증 시 활용.

## 다음 행동 (이번 plan 외 별도)

- universe 의 44 skill 의 frontmatter audit — 비표준 field 가 있는지 점검 (예: 누가 `thinking_budget` 을 표준이라고 가정한 곳 없는지)
- README 또는 `.claude/SKILLS.md` 에 universe extension 명시 + agentskills.io standard 본문 인용
- 외부 도구 사용자 가능성 있는 sibling 협업자에게 universe SKILL.md 가 portable 임을 안내

## 관련

- `.claude/skills/<name>/SKILL.md` — 모든 universe skill (44+)
- `.claude/rules/lethal-trifecta.md` v2.34 — trust_class field 사용 사례
- `knowledge/canon/agent-runtime-layers.md` — Claude Agent SDK runtime layers (skill 이 runtime 안에서 어떻게 동작하는지)
- `knowledge/canon/harness-adoption-guide.md` v1.1 — sibling 으로의 skill propagation
- `knowledge/canon/tech-trends-2026-05.md` — Adopt 결정 배경 (이미 적용 — 표준 인지)
- Anthropic blog: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Standard: https://agentskills.io/
