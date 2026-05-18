# Lethal Trifecta — Prompt Injection Exfiltration Defense

Simon Willison (2025-06) 명명, OWASP Top 10 for Agentic Apps 2026 highlight. agent 가 다음 3 조건 **동시에** 충족되면 prompt injection 으로 sensitive data 가 외부 유출 위험:

1. **Private data access** (taint=private) — agent 가 사용자 secret / DB / 내부 API 접근
2. **Untrusted input exposure** (taint=untrusted) — agent 가 외부 input (web, MCP tool, user message) processing
3. **Outward communication** (taint=outward) — agent 가 외부로 데이터 전송 가능

95% LLM-based guardrail 은 불충분 — adversarial 5% 가 트리거. **정공법 1원칙 (근본 수정)**: guardrail 우회 안 함, 명시 게이트로 trifecta 동시 충족 자체 차단.

## 3 조건 (검출 패턴)

### 1. Private data access (taint=private)

- `athsra.{get,run,exec}` (Bearer token, secret)
- `SSO_SESSION` / `BETTER_AUTH_SECRET` env 변수
- `.env.*_SECRET` / `*_TOKEN` / `*_API_KEY` 류 read
- D1 user row read (`SELECT ... FROM users` 패턴)
- R2 envelope decrypt
- `process.env.*` 의 secret 키 read

### 2. Untrusted input exposure (taint=untrusted)

- MCP tool 결과 (`mcp__*__*`) — Figma metadata / Slack message / Gmail body / Notion page / Google Drive file
- `WebFetch` / `fetch()` 외부 도메인 결과
- user message 직접 inject (LLM 호출의 user role content)
- file read 후 LLM 에 전달 (예: README / docs / 사용자 업로드)

### 3. Outward communication (taint=outward)

- `resend.{emails,batch}` (이메일 발송)
- `toss-payments` / `stripe.*` / 결제 API
- `slack.*postMessage` / `notion.*update` / `gmail.*send` (외부 write tool)
- `fetch(... POST|PUT)` 외부 도메인
- ecosystem webhook 호출

## Multi-Agent Research Lead Planner 분리 원칙 (v2.34 P0.5, 2026-05-13)

Anthropic April 2026 블로그의 Multi-Agent Research pattern (Lead Planner → Generator → Evaluator 3-tier) 도입 시 trifecta 위험 신호:

**원칙**: Lead Planner 는 **untrusted input 을 직접 처리 금지**. 모든 untrusted 처리는 Generator subagent 에 delegate.

### 이유

Lead Planner = orchestration role. private data access (modfolio internal canon / D1 / athsra) 가 일반적. 거기에 untrusted input (Figma metadata / WebFetch / MCP tool result) 까지 직접 처리하면 trifecta 의 2/3 조건 자동 충족. Generator 가 outward (e.g. Resend / Slack) 까지 호출하면 3/3 — 위험.

### 검출 패턴 (taint propagation)

- ✅ **OK** — Lead Planner 가 untrusted source 를 Generator 에 **명시 task 로 위임** (structured artifact handoff, shared context X)
- ❌ **위반** — Lead Planner 가 자기 prompt 안에서 직접 WebFetch / mcp__* 결과 inject + private data 접근 + 외부 호출

### 정공법 적용

`.claude/agents/lead-planner.md` (v2.35 P1.5 신설 예정) frontmatter:

```yaml
---
name: lead-planner
model: claude-opus-4-7
effort: xhigh
thinking_budget: standard
# trifecta 회피 — untrusted input 직접 처리 금지
trust_class: trusted-input-only
allowedTools:
  - Task   # subagent fork
  - Read   # internal canon/plan
  # untrusted source MCP/WebFetch 명시 제외
---
```

Generator subagent (e.g. `code-reviewer`, `design-engineer`) 은 untrusted input 처리 가능 — 단, private data 접근 시 outward 차단 (또는 sandbox 명시).

### universe-internal trusted-input 분류

`mcp__github__*` / `mcp__neon__*` / 자체 hook 출력 등 **universe-internal** 도구는 trusted-input 으로 분류 (Hub-not-enforcer 정합 — 우리가 통제). `mcp__claude_ai_Figma__*` / `mcp__claude_ai_Slack__*` 같은 외부 SaaS 도구는 **untrusted**.

`scripts/modfolio/governance.ts` 의 `TRIFECTA_UNTRUSTED_PATTERNS` 는 보수적으로 모든 `mcp__*__*` 를 untrusted 로 매칭 — universe-internal MCP 도구의 allowlist 추가 (`.claude/rules/lethal-trifecta-allowlist.json`) 또는 `_trifecta_class: trusted-input` frontmatter 명시 가능 (v3.0 의무).

## Allowlist Quarterly Review (v2.34 P0.5)

`.claude/rules/lethal-trifecta-allowlist.json` 의 `entries` 가 **6개 이상** 이면 `governance.ts` 가 info finding 으로 escalation:

- 패턴 자체 재검토 필요 (false positive 누적)
- universe-internal trusted-input 분류로 흡수 가능 여부 점검
- `revisit_after` 도래 entry 우선 정리

분기 1회 (3개월) review 필수.

## 위반 시 정책

`scripts/modfolio/governance.ts` 의 `checkLethalTrifecta` 가 자동 검출. 위반 발견 시:

### 옵션 A — 명시 human-approval

agent / skill frontmatter 에:
```yaml
human_approval_required: true
```

→ 실 실행 시점에 user 확인 dialog (CLI 또는 UI). 위반 finding 사라짐.

### 옵션 B — trifecta 끊기

3 조건 중 하나 제거:
- **outward 차단** — sandbox 모드 (write tool 비활성)
- **untrusted 제거** — MCP 결과를 그대로 LLM 에 전달 X, validated schema 만 통과
- **private 격리** — secret read 가 필요한 step 과 untrusted/outward step 을 별도 agent 분리

### 옵션 C — Allowlist 등록 (justification 필수)

`.claude/rules/lethal-trifecta-allowlist.json` 에 entry 추가:

```json
{
  "file": "scripts/audit/athsra-self-loop.ts",
  "reason": "athsra-worker self-loop (token → R2 → token, outward 없음 — fetch 가 self CF Worker 만)",
  "approved_by": "username",
  "approved_at": "2026-05-13",
  "revisit_after": "2026-11-13"
}
```

분기별 review 강제. justification 없으면 entry 거부.

## 화이트리스트 정책

- `revisit_after` 도래 entry 는 governance 가 warning 발생 → 재검토 강제
- entry 추가는 PR review 필수 (보안 우회 도구화 방지)
- 화이트리스트가 6개 이상이면 lethal-trifecta 패턴 자체 재검토 필요

## modfolio universe 의 trifecta 노출 면

현재 ecosystem 의 trifecta 위험 영역 (자동 검출됨):

| 영역 | Private | Untrusted | Outward | 보호 |
|---|---|---|---|---|
| `feedback-collect` skill | journal/canon read | sibling feedback file | ecosystem 갱신 | sibling 의 자율 — 외부 X |
| `harness-pull` skill | 내부 file | npm registry | sibling local file write | 자체 sibling 만 |
| `sso-integrate` skill | Connect SSO secret | provider OIDC | redirect | OIDC PKCE state 검증 |
| `email-patterns` skill | DB user row | user input | Resend API | template + sanitization |
| MCP-integrated agents | athsra/Connect | Figma/Slack/Gmail | (없음 — 대부분 read-only) | MCP 자체 boundary |

각 영역의 governance check 가 `human_approval_required` 또는 sandbox 명시 강제.

## 정공법 정합

- **1원칙 (근본 수정)**: guardrail (LLM filter) 우회 X, 명시 게이트로 trifecta 자체 차단
- **2원칙 (에러·경고 0)**: warning 발견 시 frontmatter / allowlist 로 명시 처리, 무시 X
- **3원칙 (장기 시야)**: OWASP 2026 frame 정합, 6개월마다 패턴 추가 가능
- **5원칙 (리소스 투자)**: allowlist 분기별 review 비용 인정

## Anti-patterns

- ❌ guardrail (LLM filter) 만으로 trifecta 차단 — 5% 우회
- ❌ allowlist 에 justification 없이 entry 추가
- ❌ 모든 위반에 `human_approval_required` 만 박고 escape — 실제 sandbox 도 검토
- ❌ trifecta 형성 agent 가 cron / autonomous 모드 — 사용자 부재 시 자동 승인 X

## 출처

- Simon Willison, "The lethal trifecta" (2025-06-16): https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
- OWASP Top 10 for Agentic Applications 2026: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
- 2026-05-13 v2.0 dogfood Adopt P0 #8 plan: `~/.claude/plans/20260513-evolve-lethal-trifecta-taint.md`

## 관련

- `.claude/rules/agent-evidence.md` — agent 주장은 증거 기반 (lethal-trifecta 의 자매 룰)
- `.claude/skills/security-scan/SKILL.md` — OWASP Top 10 통합
- `scripts/modfolio/governance.ts` — checkLethalTrifecta 구현
- `knowledge/canon/agentic-engineering.md` § 1.4 Untrusted code, § 2.3 Hook chain
