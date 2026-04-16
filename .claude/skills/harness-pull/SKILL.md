---
name: harness-pull
description: 스크립트 실행으로 최신 하네스 동기화 + 검증 + SDK/토큰 점검. 반드시 bun run harness-pull 실행
user-invocable: true
---

# /harness-pull

**이 스킬은 스크립트를 실행하는 것이 전부다. 에이전트가 직접 파일을 복사하거나 동기화하면 안 된다.**

## 지금 실행

```bash
bun run harness-pull
```

package.json에 스크립트가 없으면:

```bash
bun ../modfolio-universe/scripts/harness-pull.ts
```

미리보기만 하려면 `--dry-run` 추가.

## 스크립트가 하는 일 (에이전트가 직접 하면 안 됨)

1. universe에서 skills/agents/rules/canon/knowledge 동기화
2. settings.json 적응형 생성 (프로젝트 고유 hooks 보존)
3. .mcp.json 딥 머지
4. CLAUDE.md 생태계 섹션 교체
5. 6가지 검증 + 고신뢰도 자동수정
6. Connect SDK 버전 추적 + 디자인 토큰 준수율 스캔
7. manifest v2.0 피드백 생성

## 프로젝트 보호 (universe는 hub, enforcement plane 아님)

- `.claude/harness-lock.json`으로 경로 잠금 (exact, `dir/`, `dir/*`, `dir/**`)
- `settings.local.json`은 절대 안 건드림
- `settings.json`은 structural merge — child의 permissions.ask/deny/defaultMode,
  env, model, statusLine 등 top-level 키 보존. `hooks`만 matcher-aware로 re-compose
- 프로젝트 고유 rules, hooks, MCP 서버는 보존

## Identity files — universe는 관찰만, 수정 안 함

다음 파일들은 child-owned identity로 분류. universe는 읽지도 쓰지도 않는다:

| 파일 | 이유 |
|-----|------|
| `wrangler.jsonc` / `wrangler.toml` | child의 CF 배포 설정, DO 바인딩, observability 등 |
| `biome.json` | child의 lint/format 결정 (버전 포함) |
| `drizzle.config.{ts,mjs,js}` | child의 DB 마이그레이션 설정 |
| `tsconfig.json` | child의 TS 엄격도/모듈 해석 선택 |
| `astro.config.{ts,mjs}` / `nuxt.config.ts` / `svelte.config.js` / `vite.config.ts` | 프레임워크 설정 전체 |
| `src/lib/auth.ts` 등 어플리케이션 코드 | 당연히 |
| `package.json` dependencies | child가 각자 관리 (universe는 `scripts.harness-pull`만 추가) |

`bun run harness-pull` 실행 시 이들 파일은 diff에 나타나지 않아야 정상.
혹시라도 위 파일들에서 변경이 감지된다면 그 자체가 bug이므로 github issue로 보고.

## Deprecated 자산

universe가 폐기(`DEPRECATED_SKILLS/FILES/RULES`)로 분류한 자산은 기본적으로
**report-only** — child는 `--prune-deprecated` 플래그를 명시적으로 줬을 때만
그 파일들이 삭제된다. universe 의견은 참고, child 결정이 최종.

## scope

- 일반 패키지 버전(TypeScript, Vite, Biome) 점검은 `/preflight` 담당
- Connect SDK 버전은 `canon/evergreen-principle.md` 권고 — 강제 아님
