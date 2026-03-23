---
description: Claude Code 하네스 전체 점검 + 자동 수정. MCP, skills, agents, rules, hooks, knowledge를 modfolio-universe 소스와 대조 검증.
effort: medium
allowed-tools: Read, Glob, Grep, Bash
user-invocable: true
---

# /harness-check — 하네스 전체 점검 + 자동 수정

modfolio-universe 소스를 기준으로 현재 프로젝트의 Claude Code 하네스를 검증하고, 누락/불일치를 자동 수정한다.

## 소스 경로

```
UNIVERSE=/mnt/c/Projects/modfolio-universe/modfolio-universe
```

이 경로가 존재하지 않으면 검증만 수행하고 자동 수정은 건너뛴다.

## 점검 항목 (8개)

### 1. MCP 연결

```bash
claude mcp list 2>/dev/null
```

**필수 (없으면 FAIL)**:
- context7, github, cloudflare, figma

**권장 (없으면 WARN)**:
- neon, svelte, paper, playwright, filesystem

**있으면 안 되는 것**:
- sequential-thinking (Opus extended thinking으로 대체됨)

### 2. Skills — SKILL.md 디렉토리 구조

```bash
ls .claude/skills/*/SKILL.md 2>/dev/null | wc -l
```

**기대값: 38개** (modfolio-universe 소스 기준)

검증:
- `.claude/skills/<name>/SKILL.md` 구조인지 (flat `.md` 파일은 오류)
- `user-invocable: true` frontmatter 포함 여부
- 소스와 내용 일치 여부 (diff)

```bash
# old flat 파일 잔존 확인
find .claude/skills/ -maxdepth 1 -name "*.md" 2>/dev/null
# 있으면 삭제 필요
```

**필수 스킬 목록** (없으면 FAIL):
```
harness-check, plan, deploy, sso-integrate, contracts, design-tokens,
typography, drizzle-patterns, ai-patterns, email-patterns, observability,
layout-patterns, audit, ecosystem, ops, design, component, page, api,
test, schema, migration, fix, security-scan, harness-check
```

### 3. Agents

```bash
ls .claude/agents/*.md 2>/dev/null | wc -l
```

**기대값: 17개**

**필수 에이전트**:
```
code-reviewer, design-critic, accessibility-auditor, architecture-sentinel,
component-builder, page-builder, api-builder, schema-builder, test-builder,
quality-fixer, design-engineer
```

### 4. Rules

```bash
ls .claude/rules/*.md 2>/dev/null | wc -l
```

**기대값: 9개**

```
api-routes, astro-files, css-files, schema-files, svelte-files,
test-files, contracts, ecosystem, knowledge
```

### 5. CLAUDE.md 핵심 섹션

CLAUDE.md에서 다음 마커를 검색:
```bash
grep -c "ECOSYSTEM_START" CLAUDE.md           # 생태계 컨텍스트 동기화 섹션
grep -c "Quality Gate" CLAUDE.md               # 품질 게이트
grep -c "Paper.*워크플로우\|Paper.design" CLAUDE.md  # Paper 디자인 워크플로우
```

**필수**: ECOSYSTEM_START 섹션 존재
**필수**: Quality Gate 섹션 존재

### 6. Knowledge

```bash
[ -f knowledge/global.md ] && echo "EXISTS" || echo "MISSING"
grep -q "Design Tooling" knowledge/global.md 2>/dev/null && echo "DT:OK" || echo "DT:MISSING"
grep -q "SSO 연동" knowledge/global.md 2>/dev/null && echo "SSO:OK" || echo "SSO:MISSING"
```

**필수**: knowledge/global.md 존재 + Design Tooling + SSO 가이드 포함

### 7. .mcp.json

```bash
[ -f .mcp.json ] && echo "EXISTS" || echo "MISSING"
```

검증 항목:
- context7, github, cloudflare, neon, svelte, playwright, filesystem 포함
- sequential-thinking 미포함 (제거됨)
- 소스와 내용 일치

### 8. Hooks (.claude/settings.json)

```bash
cat .claude/settings.json 2>/dev/null | grep -c '"type"'
```

**필수 hooks**:
- `PostToolUse` → `Edit|Write` 매처 (lint)
- `PreToolUse` → `Bash` 매처 (commit/push 검증 + gh api 경고)
- `Stop` → quality gate + decisions log (agent type, JSON 출력)

## 자동 수정

UNIVERSE 경로가 존재하면, FAIL 항목을 자동 수정:

```bash
UNIVERSE="/mnt/c/Projects/modfolio-universe/modfolio-universe"

# Skills 누락 → 소스에서 복사
for skill_dir in $UNIVERSE/.claude/skills/*/; do
  name=$(basename "$skill_dir")
  mkdir -p ".claude/skills/$name"
  cp "$skill_dir/SKILL.md" ".claude/skills/$name/SKILL.md"
done

# Old flat .md 삭제
find .claude/skills/ -maxdepth 1 -name "*.md" -delete

# Agents 누락 → 소스에서 복사
cp $UNIVERSE/.claude/agents/*.md .claude/agents/

# Rules 누락 → 소스에서 복사
cp $UNIVERSE/.claude/rules/*.md .claude/rules/

# .mcp.json 불일치 → 소스에서 복사
cp $UNIVERSE/.mcp.json .mcp.json

# knowledge/global.md 불일치 → 소스에서 복사
mkdir -p knowledge
cp $UNIVERSE/knowledge/global.md knowledge/global.md
```

**자동 수정하지 않는 것**:
- CLAUDE.md (프로젝트별 고유 내용이 있으므로 sync-knowledge로 처리)
- .claude/settings.json (프로젝트별 hooks 커스텀 가능)
- MCP 연결 상태 (서버 실행 여부는 외부 의존)

## 출력 형식

```
## Harness Check: PASS/FAIL

| # | 항목 | 상태 | 기대 | 실제 | 비고 |
|---|------|------|------|------|------|
| 1 | MCP 연결 | ✅/❌ | 4 필수 | N connected | missing: ... |
| 2 | Skills | ✅/❌ | 38 | N | 누락: ... |
| 3 | Agents | ✅/❌ | 17 | N | 누락: ... |
| 4 | Rules | ✅/❌ | 9 | N | 누락: ... |
| 5 | CLAUDE.md | ✅/❌ | 3 섹션 | N | missing: ... |
| 6 | Knowledge | ✅/❌ | global.md | Y/N | DT/SSO: ... |
| 7 | .mcp.json | ✅/❌ | 소스 일치 | Y/N | diff: ... |
| 8 | Hooks | ✅/❌ | 3 hook | N | missing: ... |

### 자동 수정됨
- (수정된 항목 목록)

### 수동 조치 필요
- (자동 수정 불가 항목 + 구체적 명령어)
```

## 자동 수정 후 재검증

자동 수정을 수행했으면 반드시 다시 전체 점검을 실행하여 PASS를 확인한다.
