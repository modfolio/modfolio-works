---
description: 개발 세션 시작 전 종합 점검. MCP 연결, 의존성 최신성, lint/typecheck, git 상태, 환경 설정을 한 번에 확인하고 문제를 보고.
effort: medium
allowed-tools: Read, Glob, Grep, Bash
user-invocable: true
---

# /preflight — 개발 세션 시작 전 종합 점검

개발 세션을 시작하기 전에 실행. MCP 연결, 의존성, 코드 품질, 환경 상태를 한 번에 점검한다.

## 점검 항목 (7개)

### 1. MCP 연결 상태

```bash
claude mcp list 2>/dev/null
```

각 서버의 connected/disconnected 상태를 확인한다.

**HTTP 서버 접근 가능 여부도 직접 체크:**
```bash
# 로컬 MCP 서버 (paper 등)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:29979/mcp 2>/dev/null
```

disconnected인 서버가 있으면:
- HTTP 서버: 엔드포인트 도달 가능 여부 체크 → 서버 미실행 vs 네트워크 문제 구분
- stdio 서버: 해당 패키지 설치 여부 체크 (`which npx`, `which bunx`)
- **수동 조치 안내**: `/mcp → 해당 서버 → Reconnect` 또는 앱 재시작 안내

### 2. 의존성 최신성 (Evergreen)

```bash
# package.json이 있는 경우
bun outdated 2>/dev/null || npm outdated 2>/dev/null
```

체크 항목:
- **프레임워크 메이저 버전**: Astro, SvelteKit, Nuxt, SolidStart, Qwik, Hono
- **핵심 의존성**: TypeScript, Biome, Drizzle ORM, Zod
- **SDK**: @modfolio/connect-sdk (v5.1.0+)
- **런타임**: `bun --version` (최신 안정판 여부)

판정:
- 메이저 버전 뒤처짐 → ❌ FAIL + 업그레이드 명령어 제공
- 마이너/패치 뒤처짐 → ⚠ WARN (정보 제공)
- 최신 → ✅ PASS

### 3. 코드 품질

```bash
bun run check 2>&1 | tail -5      # Biome lint + format
bun run typecheck 2>&1 | tail -5   # TypeScript strict
```

- 둘 다 exit 0 → ✅ PASS
- 실패 → ❌ FAIL + 에러 요약

### 4. Git 상태

```bash
git status --short
git branch --show-current
git log --oneline -1
```

체크 항목:
- 현재 브랜치 (main? feature branch?)
- 커밋되지 않은 변경사항
- 최근 커밋 메시지
- upstream 동기화 여부: `git fetch --dry-run 2>&1`

판정:
- dirty working tree → ⚠ WARN (미커밋 변경 있음)
- main 브랜치에서 직접 작업 중 → 정보 제공
- upstream과 차이 → ⚠ WARN (pull 필요)

### 5. 환경 설정

```bash
# Node/Bun 확인
bun --version 2>/dev/null || node --version 2>/dev/null
# wrangler (CF 배포용)
npx wrangler --version 2>/dev/null | head -1
```

체크 항목:
- Bun 설치 여부 + 버전
- `.env` 또는 `.dev.vars` 존재 여부 (필요 시)
- `wrangler.jsonc` 또는 `wrangler.toml` 존재 여부 (CF 프로젝트)
- `node_modules/` 존재 여부 (설치 필요한지)

판정:
- node_modules 없음 → ❌ FAIL + `bun install` 안내
- .env 없는데 .env.example 있음 → ⚠ WARN

### 6. 보안 점검

```bash
# 시크릿 노출 체크 (staged files)
git diff --cached --name-only | xargs grep -l "sk-\|PRIVATE_KEY\|password.*=" 2>/dev/null
# .env가 gitignore에 있는지
grep -q "\.env" .gitignore 2>/dev/null
```

체크 항목:
- staged 파일에 시크릿 패턴 없는지
- `.env`, `credentials`, `*.key` 등이 `.gitignore`에 있는지

### 7. 하네스 무결성 (간소화)

harness-check의 핵심만 빠르게 체크:

```bash
UNIVERSE="/mnt/c/Projects/modfolio-universe/modfolio-universe"
sk=$(ls .claude/skills/*/SKILL.md 2>/dev/null | wc -l)
ag=$(ls .claude/agents/*.md 2>/dev/null | wc -l)
ru=$(ls .claude/rules/*.md 2>/dev/null | wc -l)
gl=$([ -f knowledge/global.md ] && echo "Y" || echo "N")
```

- skills < 38, agents < 17, rules < 9 → ⚠ WARN + `/harness-check` 실행 안내
- 전체 일치 → ✅ PASS

## 출력 형식

```
## Preflight: READY / NOT READY

| # | 항목 | 상태 | 요약 |
|---|------|------|------|
| 1 | MCP 연결 | ✅/⚠/❌ | N/M connected |
| 2 | 의존성 | ✅/⚠/❌ | N outdated |
| 3 | 코드 품질 | ✅/❌ | lint + typecheck |
| 4 | Git 상태 | ✅/⚠ | branch, clean/dirty |
| 5 | 환경 설정 | ✅/⚠/❌ | bun, wrangler, node_modules |
| 6 | 보안 | ✅/⚠ | secrets, .gitignore |
| 7 | 하네스 | ✅/⚠ | skills/agents/rules |

### 조치 필요 (있는 경우만)
- ❌ 항목: 구체적 수정 명령어
- ⚠ 항목: 권장 조치

### 세션 준비 완료
(READY인 경우) 개발 시작 가능합니다.
(NOT READY인 경우) 위 조치 사항을 해결한 후 `/preflight` 재실행.
```

## 참고

- 전체 하네스 검증이 필요하면: `/harness-check` (소스 대조 + 자동 수정)
- `/preflight`는 빠른 점검용, `/harness-check`는 완전 검증용
