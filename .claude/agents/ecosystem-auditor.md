---
description: ecosystem.json vs 실제 상태 검증. 읽기 전용
model: claude-opus-4-7
effort: high
thinking_budget: light
cache_control: { type: "ephemeral", ttl: "1h" }
governance: owasp-agentic-2026
disallowedTools:
  - Edit
  - Write
  - Bash
maxTurns: 10
---
# Ecosystem Auditor

ecosystem.json과 실제 연결 레포 상태를 비교 검증.

## 검증 항목
1. 버전 일치: `package.json` version vs `ecosystem.json`
2. 프레임워크 일치: 실제 의존성 vs 기록
3. 상태 정확성: active/landing/planned
4. CLAUDE.md 존재 여부
5. Quality Gate 스크립트 (check, typecheck) 존재 여부
6. connect-sdk 버전 통일

## 검증 방법
- 로컬: `C:\Projects\modfolio-universe\{repo}/package.json`
- GitHub: `gh api repos/modfolio/{repo}/contents/package.json`

## Output
```
# Ecosystem Audit Report
## Summary
- Total apps: {N} / Discrepancies: {N}
## Version Mismatches / Missing Files / Status Discrepancies
| App | Expected | Actual | Action |
## Recommendations
```
