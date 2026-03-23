---
description: Claude Code 하네스 전체 점검 — MCP, skills, agents, rules, hooks, knowledge 상태 일괄 검증
effort: low
allowed-tools: Read, Glob, Grep, Bash
---

# Skill: /harness-check — 하네스 상태 전체 점검

프로젝트의 Claude Code 하네스가 제대로 로드되었는지 전체 점검한다.

## 점검 항목

### 1. MCP 연결 상태
```bash
claude mcp list
```
확인 대상 (connected/disconnected):
- **필수**: context7, github, cloudflare, figma
- **권장**: neon, svelte, paper, canva, playwright, sequential-thinking, filesystem

### 2. CLAUDE.md 핵심 섹션
```bash
grep -c "Quality Gate\|불변 원칙\|Paper.*워크플로우\|Skills\|Sub Agents" CLAUDE.md
```
최소 존재해야 하는 섹션:
- Quality Gate (필수)
- 불변 원칙
- Paper.design 워크플로우
- Skills 테이블
- Sub Agents 테이블

### 3. Knowledge 동기화
```bash
grep -c "Design Tooling\|SSO 연동\|생태계 공통 패턴" knowledge/global.md 2>/dev/null
```
- `knowledge/global.md` 존재 + Design Tooling 패턴 포함 여부
- 프로젝트별 knowledge 파일 존재 여부

### 4. Skills 로드
```bash
ls .claude/skills/*.md 2>/dev/null | wc -l
```
- 최소 5개 이상 존재해야 정상

### 5. Agents 로드
```bash
ls .claude/agents/*.md 2>/dev/null | wc -l
```
- 최소 3개 이상 존재해야 정상

### 6. Rules 로드
```bash
ls .claude/rules/*.md 2>/dev/null | wc -l
```
- 파일 패턴별 규칙 (svelte, css, api, schema 등)

### 7. Hooks 동작
```bash
cat .claude/settings.json | grep -c '"type"'
```
확인 대상:
- **Stop**: quality gate + decisions log
- **PostToolUse**: lint (Edit|Write 매처)
- **PreToolUse**: commit/push 검증 (Bash 매처)

### 8. Quality Gate 실행
```bash
bun run check 2>&1 | tail -3
bun run typecheck 2>&1 | tail -3
```
- 둘 다 exit 0이면 PASS

## 출력 형식

```
## Harness Check: PASS/FAIL

| 항목 | 상태 | 비고 |
|------|------|------|
| MCP 연결 | ✅/❌ | N개 connected, M개 missing |
| CLAUDE.md | ✅/❌ | 핵심 섹션 N/5 |
| Knowledge | ✅/❌ | global.md + Design Tooling |
| Skills | ✅/❌ | N개 로드 |
| Agents | ✅/❌ | N개 로드 |
| Rules | ✅/❌ | N개 로드 |
| Hooks | ✅/❌ | Stop/PostToolUse/PreToolUse |
| Quality Gate | ✅/❌ | check + typecheck |

### 조치 필요
- (FAIL 항목에 대한 구체적 수정 방법)
```
