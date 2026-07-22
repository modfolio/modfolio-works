---
title: Tool Inventory — universe MCP · CLI · SDK · registry · service SoT + 연결 검증
version: 1.0.0
last_updated: 2026-06-28
source: [2026-06-28 platform-plane 준비 — 중앙 도구 레지스트리 부재 해소. /preflight 는 세션 관찰만 했고 SoT 가 없었다]
sync_to_siblings: true
applicability: always
consumers: [preflight, ops, new-app, deploy, modfolio]
supersedes: []
---

# Tool Inventory — universe 도구 단일 조회처

> **목적**: universe 가 쓰는 도구(MCP 서버 · CLI · SDK · 레지스트리 · 코어 서비스)를 한 곳에 등록하고,
> 한 명령으로 연결 상태를 확인한다. 이전엔 `/preflight` 가 *세션 단위 관찰* 만 했고 SoT 가 없었다.
> **데이터 SoT = `scripts/registry/tool-inventory.ts`** (Zod 검증). 이 문서는 그 동반 설명이다.

## 검증

```bash
bun run verify:tools          # PASS/FAIL/SKIP 매트릭스 (advisory, exit 0)
bun run verify:tools:strict   # FAIL 있으면 exit 1
```

read-only. **CLI 체크는 stdout 을 폐기**(exit code 만 읽음) → 토큰 echo 우려 도구도 비밀 미노출
(`secrets-policy.md` · `lethal-trifecta.md`). 부재 CLI/세션 커넥터 = **SKIP**(FAIL 아님) — NAS 전용
도구(restic·runner)가 없는 dev box 에서도 매트릭스가 정직하게 유지된다. `quality:all` 에 **넣지 않음**
(auth/network 결과는 머신 의존적이라 결정적 게이트 부적합) — `/preflight` 를 보완.

## 5 범주 (22 도구)

| 범주 | 항목 | auth | 검증 종류 |
|---|---|---|---|
| **MCP** | github · athsra (repo `.mcp.json`) | GITHUB_TOKEN(athsra) · device-login | `.mcp.json` 등록 확인 |
| | claude.ai: Cloudflare · Figma · Slack · Context7 (세션 커넥터) | claude.ai OAuth | SKIP (agent-runtime 검증) |
| **CLI** | athsra · wrangler · gh · bun | login/OAuth/device | 실행 exit 0 (auth 상태) |
| | tailscale · restic · forgejo-runner (NAS 전용) | OAuth/RESTIC_PASSWORD/Forgejo token | 부재 시 SKIP |
| **SDK** | @modfolio/connect-sdk (npmjs) · @modfolio/contracts (GH Packages) · @athsra/cli (npmjs) | 위 레지스트리별 | 버전 resolve / 레지스트리 alive |
| **Registry** | github-packages(1차) · npmjs · pkg.modfolio.io(NAS 부차) | GITHUB_TOKEN / none / FORGEJO_NPM_TOKEN | HTTP alive/status |
| **Service** | connect-oidc · athsra-worker · pay | discovery/Bearer/SSO+`mpsk_` | HTTP alive/status |

## 알려진 함정 (검증으로 드러남)

- **connect OIDC discovery = `login.modfolio.io`** (2026-06-28 실측 200). `connect.modfolio.io/.well-known/*`
  + `/sso/authorize` = 404. registry 의 derived `AuthEndpoints` 와 drift — connect 자율 검토
  (`feedback/modfolio-connect`). verify:tools 의 connect 체크는 login.modfolio.io 로 고정.
- **@modfolio scope dual-registry**: `.npmrc` 의 `@modfolio:registry` 가 scope 전체를 한 곳으로 보낸다
  (per-package override 불가). connect-sdk = public npm, contracts/harness = GH Packages(private).
  ✅ 2026-06-27 parity 달성 — GH Packages connect-sdk latest = 8.2.1 = npmjs latest → 기존
  `@modfolio:registry=GH` .npmrc 로도 `bun update @modfolio/connect-sdk` 가 8.2.1 수신(블로커 해소).
  구조적 caveat(per-scope 라우팅)은 유지 — 상세 `project-infrastructure-registry.md` §dual-registry.
- **pkg.modfolio.io** 는 alive 면 200/401 모두 정상(부차 채널). 1차 consume 은 GitHub Packages 단일.
- **pkg.modfolio.io 프로브는 반드시 prefixed base** `/api/packages/modfolio/npm/` 로 한다(예: `.../@modfolio%2Fharness`). **bare root 경로**(`/@modfolio/harness`)는 Worker open-proxy guard 가 by-design **404(text/plain)** 로 reject → 이걸로 "회귀"를 판정하면 오진(2026-07-09 사건, `feedback/modfolio-registry-proxy/...-retraction.md`). origin 토큰 만료는 404 아닌 **401/403 passthrough** 로 드러난다.

## 도구 추가 시

1. `scripts/registry/tool-inventory.ts` 의 `RAW` 에 entry 추가(Zod 검증 — id/category/purpose/usedBy/
   authMethod/check). check 종류: `cli` · `http-alive` · `http-status` · `mcp-config` · `package-latest` ·
   `session-connector`.
2. `bun run verify:tools` 로 PASS 확인.
3. 본 표 갱신.

## 관련

- `scripts/registry/tool-inventory.ts` — 데이터 SoT (Zod)
- `scripts/verify-tools.ts` — 검증 러너
- `platform-plane.md` — 3-plane 토폴로지 + 역량/어댑터
- `secret-store.md` — athsra(도구 auth 백본)
- `.claude/skills/preflight/SKILL.md` — 세션 관찰 (본 SoT 를 보완)
