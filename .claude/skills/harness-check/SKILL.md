---
name: harness-check
description: Claude Code 하네스 전체 점검 + 자동 수정. MCP, skills, agents, rules, hooks, knowledge를 modfolio-universe 소스와 대조 검증.
user-invocable: true
---

# /harness-check — 하네스 전체 점검 + 자동 수정

modfolio-universe 소스를 기준으로 현재 프로젝트의 Claude Code 하네스를 검증하고, 누락/불일치를 자동 수정한다.

## 소스 경로

```bash
# 크로스 플랫폼 경로 탐색 (Windows Git Bash / WSL / MSYS2)
UNIVERSE=""
for _p in "/c/Projects/modfolio-universe/modfolio-universe" \
          "c:/Projects/modfolio-universe/modfolio-universe" \
          "/mnt/c/Projects/modfolio-universe/modfolio-universe"; do
  [ -d "$_p" ] && UNIVERSE="$_p" && break
done
```

이 경로가 존재하지 않으면 검증만 수행하고 자동 수정은 건너뛴다.

## 점검 항목 (9개)

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

**기대값: 39개** (modfolio-universe 소스 기준, /preflight 포함)

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
test, schema, migration, fix, security-scan, preflight
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

**기대값: 프레임워크별 상이**

- **Universe**: 13개 (전체)
- **Child 프로젝트**: universal 5개 (api-routes, css-files, schema-files, test-files, knowledge) + 프레임워크별 1~2개 = **최소 6개**

프레임워크별 rule 매핑:
```
SvelteKit → svelte-files    |  Qwik → qwik-files
SolidStart → solid-files    |  Nuxt → nuxt-files
Astro → astro-files         |  Hono → hono-files
```

> 판정: package.json에서 프레임워크 감지 후, universal + 해당 프레임워크 rule이 있으면 PASS. 없으면 FAIL.

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

### 8. Memory 디렉토리

```bash
[ -d memory ] && echo "EXISTS" || echo "MISSING"
[ -f memory/pattern-history.md ] && echo "PH:OK" || echo "PH:MISSING"
[ -f memory/decisions-log.md ] && echo "DL:OK" || echo "DL:MISSING"
```

**필수**: memory/ 디렉토리 + pattern-history.md + decisions-log.md 존재
Stop hook 자가학습 루프의 전제조건. 없으면 자동 생성 (아래 자동 수정 참조).

### 9. Hooks (.claude/settings.json)

```bash
cat .claude/settings.json 2>/dev/null | grep -c '"type"'
```

**필수 hooks**:
- `PostToolUse` → `Edit|Write` 매처 (lint)
- `PreToolUse` → `Bash` 매처 (commit/push 검증 + gh api 경고)
- `Stop` → quality gate + decisions log (agent type, JSON 출력)

**기능적 검증** (hooks 내용 정합성):
- Stop hook quality gate에 `AND UPDATE` 키워드 포함 (pattern-history 쓰기 루프)
- Stop hook quality gate에 프레임워크 감지 로직 포함 (`Detect project framework`)
- `.mcp.json`에 `sequential-thinking` 미포함

## 자동 수정

UNIVERSE 경로가 존재하면, FAIL 항목을 자동 수정:

```bash
# 크로스 플랫폼 경로 탐색
UNIVERSE=""
for _p in "/c/Projects/modfolio-universe/modfolio-universe" \
          "c:/Projects/modfolio-universe/modfolio-universe" \
          "/mnt/c/Projects/modfolio-universe/modfolio-universe"; do
  [ -d "$_p" ] && UNIVERSE="$_p" && break
done

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

# Rules 누락 → universal rules만 복사 (프레임워크별 rules는 sync-knowledge가 담당)
for rule in api-routes css-files schema-files test-files knowledge; do
  cp "$UNIVERSE/.claude/rules/$rule.md" ".claude/rules/$rule.md"
done
# 프레임워크 감지 후 해당 rule 복사
FW=$(grep -oP '"(svelte|@builder.io/qwik|solid-start|solid-js|nuxt|astro|hono)"' package.json 2>/dev/null | head -1)
case "$FW" in
  *svelte*) cp "$UNIVERSE/.claude/rules/svelte-files.md" .claude/rules/ ;;
  *qwik*)   cp "$UNIVERSE/.claude/rules/qwik-files.md" .claude/rules/ ;;
  *solid*)  cp "$UNIVERSE/.claude/rules/solid-files.md" .claude/rules/ ;;
  *nuxt*)   cp "$UNIVERSE/.claude/rules/nuxt-files.md" .claude/rules/ ;;
  *astro*)  cp "$UNIVERSE/.claude/rules/astro-files.md" .claude/rules/ ;;
  *hono*)   cp "$UNIVERSE/.claude/rules/hono-files.md" .claude/rules/ ;;
esac

# .mcp.json 불일치 → 소스에서 복사
cp $UNIVERSE/.mcp.json .mcp.json

# knowledge/global.md 불일치 → 소스에서 복사
mkdir -p knowledge
cp $UNIVERSE/knowledge/global.md knowledge/global.md

# Memory 부트스트랩 (없으면 생성, 있으면 스킵)
mkdir -p memory
[ -f memory/pattern-history.md ] || cat > memory/pattern-history.md << 'HEREDOC'
# Pattern History

> Stop hook 자동 업데이트. 위반 패턴 추적 + 에스컬레이션.

| Pattern | Count | Last Seen | Status |
|---------|-------|-----------|--------|
HEREDOC

[ -f memory/decisions-log.md ] || cat > memory/decisions-log.md << 'HEREDOC'
# Decisions Log

> Stop hook 자동 업데이트. 아키텍처/디자인 의사결정 기록.
HEREDOC
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
| 2 | Skills | ✅/❌ | 39 | N | 누락: ... |
| 3 | Agents | ✅/❌ | 17 | N | 누락: ... |
| 4 | Rules | ✅/❌ | 6~13 | N | 누락: ... |
| 5 | CLAUDE.md | ✅/❌ | 3 섹션 | N | missing: ... |
| 6 | Knowledge | ✅/❌ | global.md | Y/N | DT/SSO: ... |
| 7 | .mcp.json | ✅/❌ | 소스 일치 | Y/N | diff: ... |
| 8 | Memory | ✅/❌ | 3 files | N | missing: ... |
| 9 | Hooks | ✅/❌ | 3 hook | N | missing: ... |

### 자동 수정됨
- (수정된 항목 목록)

### 수동 조치 필요
- (자동 수정 불가 항목 + 구체적 명령어)
```

## 자동 수정 후 재검증

자동 수정을 수행했으면 반드시 다시 전체 점검을 실행하여 PASS를 확인한다.
