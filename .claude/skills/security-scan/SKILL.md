---
name: security-scan
description: OWASP Top 10 (web) + Agentic Top 10 2026 (ASI01-10) 보안 감사. XSS/CSRF/injection 탐지 + CSP 헤더 + 시크릿 검출 + agent governance 검증 (10 ASI 함수 + 4 hooks 자동화 v1.1) + 자동 수정
effort: xhigh
user-invocable: true
---


# /security-scan — 보안 감사 (web + agentic dual-axis)

security-hardener agent → 두 축 검사 → 자동수정:
- **Web Top 10** (전통적): XSS/CSRF/injection/CSP/시크릿 등
- **Agentic Top 10 2026** (canon `agent-governance.md` v1.0+, ASI01-10): goal hijack / tool misuse / identity abuse / supply chain / RCE / memory poisoning / inter-agent comms / cascading failures / human trust / rogue agents

## v1.1 자동화 (2026-05-06)

ASI01-10 mitigation 매핑 (canon agent-governance.md v1.1) 이 실 코드 자동화로 cement.

**정적 검사** (`scripts/modfolio/governance.ts` 의 10 함수):
- agentic-governance 트랙은 `bun run scripts/modfolio/check.ts` 의 BASIC_TRACKS 에 포함 → 매 진단마다 자동 실행
- 또는 `bun -e "import { runAgenticGovernance } from './scripts/modfolio/governance.ts'; ..."` 직접 호출

**런타임 차단** (`scripts/hooks/`):
- ASI01: `pre-injection-detect.ts` — Bash/Read/WebFetch/WebSearch input 의 prompt injection 검출 (warn/block mode)
- ASI02: `pre-destructive-guard.ts` (destructive Bash 차단) + `pre-commit-guard.ts` (--no-verify + ts_ignore_or_any 차단)
- ASI03: `post-secret-redact.ts` — Bash/Read output 의 secret prefix redaction (warn/redact/block mode)
- ASI06: `pre-compact-guard.ts` (PreCompact unstaged plan/journal 차단)

**Mode 환경변수** (settings.json env):
- `INJECTION_DETECT_MODE`: off / warn (default) / block
- `SECRET_REDACT_MODE`: off / warn (default) / redact / block
- `PATTERN_HISTORY_MODE`: off / warn (default) / block

## 프로세스

1. **대상 지정** — repo / 파일 / agent / canon
2. **security-hardener agent 실행** — Tier 분류 (1/2/3) + ASI matrix
3. **자동 수정** — 탐지된 취약점 근본 수정 (정공법, 우회 X)
4. **검증** — `bun run typecheck && bun run check`

## 검사 범위

### Web (전통적)
- 하드코딩 시크릿
- XSS (unescaped 렌더링)
- SQL/Command injection
- CSRF 토큰 누락
- JWT 검증 누락
- HMAC 서명 미검증
- CSP 헤더 불완전
- 에러 정보 노출

### Agentic 2026 (ASI01-10, canon `agent-governance.md` 매핑)

| ID | 검사 항목 | modfolio 매핑 |
|---|---|---|
| ASI01 | Agent Goal Hijack | prompt injection, "ignore previous" 패턴, tool 결과의 instruction 검출 |
| ASI02 | Tool Misuse | disallowedTools frontmatter 누락, broad Bash allowlist, MCP 권한 남용 |
| ASI03 | Identity & Privilege | 하드코딩 secret, athsra/CF token 노출, GitHub PAT/NPM_TOKEN 누출 |
| ASI04 | Supply Chain | bun.lock 부재, exact version 미사용, MCP server 신뢰성 |
| ASI05 | RCE | `eval`, dynamic shell escape, parameterized query 미사용 |
| ASI06 | Memory Poisoning | knowledge/journal/canon 의 변동 token, MEMORY.md 변경 검증 |
| ASI07 | Inter-Agent Comms | Task fork prompt 의 untrusted data, 결과 size 제한 부재 |
| ASI08 | Cascading Failures | multi-review fork 의 prefix 변동, harness-pull dry-run skip |
| ASI09 | Human-Agent Trust | broad Bash wildcard, AskUserQuestion 옵션 모호, handoff prompt 의 destructive 명령 |
| ASI10 | Rogue Agents | MCP server allowlist 부재, 신규 agent 의 disallowedTools 누락 |

## 사용 예시

```
/security-scan — modfolio-pay 결제 API 보안 검사 (web + agentic)
/security-scan — gistcore 전체 보안 감사
/security-scan — .claude/agents/ 의 governance 검사 (ASI 위주)
```

## Lethal Trifecta (2026-05-13, v2.0 dogfood Adopt P0 #8)

OWASP Agentic 2026 의 highlight risk. `.claude/rules/lethal-trifecta.md` rule 정합 — agent / skill 가 (private data + untrusted input + outward communication) 3 조건 **동시** 충족 시 prompt injection 으로 secret 유출 위험.

`scripts/modfolio/governance.ts:checkLethalTrifecta` 가 자동 검출:
- `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `scripts/**/*.ts` 본문 패턴 매칭
- 3 조건 동시 발견 + `human_approval_required: true` frontmatter 없음 + allowlist 미등록 → warning

위반 해결:
1. frontmatter `human_approval_required: true` 추가 (명시 사용자 확인 게이트)
2. 또는 3 조건 중 하나 제거 (sandbox 모드)
3. 정당 사유 시 `.claude/rules/lethal-trifecta-allowlist.json` 에 entry 추가 (justification + revisit_after 강제)

`/security-scan` 호출 시 `checkLethalTrifecta` 가 자동 포함 — agentic-governance 트랙 의 1 검사로 노출.

## 관련

- canon `agent-governance.md` v1.0+ (OWASP Agentic 2026 baseline + 10 risk matrix)
- canon `secrets-policy.md` (ASI03 baseline)
- canon `agent-evidence.md` (ASI01/06 baseline)
- rule `lethal-trifecta.md` (2026-05-13 신규)
- agent `security-hardener.md` (실제 검사 실행자)
- agent `initializer.md` (read-only, cold-start summary)
