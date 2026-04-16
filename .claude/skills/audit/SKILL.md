---
name: audit
description: 생태계 상태 검증 — ecosystem.json vs 실제 배포 상태 비교
user-invocable: true
---


# Skill: /audit — 생태계 헬스체크

ecosystem.json vs 실제 레포 상태를 교차 검증하는 감사 절차.

## 사용법

```
/audit              # 전체 생태계 감사
/audit naviaca      # 특정 앱만 감사
```

## 검증 항목

### 1. 버전 일치

ecosystem.json의 `version` vs 각 레포의 `package.json` version.

```bash
# 모든 앱 버전 수집
bun run version-sync

# 특정 레포 버전 확인
gh api repos/modfolio/{repo}/contents/package.json --jq '.content' | base64 -d | jq '.version'
```

### 2. 프레임워크 일치

ecosystem.json의 `framework` vs 각 레포의 실제 의존성.

```bash
# 특정 레포 의존성 확인
gh api repos/modfolio/{repo}/contents/package.json --jq '.content' | base64 -d | jq '.dependencies'
```

### 3. 상태 정확성

ecosystem.json의 `status` (active/landing/planned) 검증:

- `active`: 핵심 기능이 실제로 작동하는가?
- `landing`: 랜딩 페이지가 배포되어 있는가?
- `planned`: 레포가 존재하는가?

```bash
# 생태계 헬스체크 (배포된 앱의 HTTP 상태 확인)
bun run health-check
```

### 4. CLAUDE.md 존재

각 레포에 CLAUDE.md가 있는지, global.md 동기화가 최신인지.

### 5. Quality Gate 스크립트

각 레포의 package.json에 `check`, `typecheck` 스크립트가 있는지.

### 6. connect-sdk 버전 통일

모든 앱의 `@modfolio/connect-sdk` 버전이 동일한지.

## 리포트 형식

```markdown
# Ecosystem Audit Report — YYYY-MM-DD

## Summary
- Total apps: {N}
- Discrepancies found: {N}

## Version Mismatches
| App | ecosystem.json | Actual | Action |
|-----|---------------|--------|--------|
| ... | ... | ... | Update ecosystem.json |

## Missing Files
| App | Missing | Action |
|-----|---------|--------|
| ... | CLAUDE.md | Create from template |

## Status Discrepancies
| App | Recorded | Actual | Action |
|-----|----------|--------|--------|
| ... | active | landing | Update ecosystem.json |

## Recommendations
1. ...
2. ...
```

## 감사 주기

- **수동**: 큰 마일스톤 후 (새 앱 추가, 마이그레이션 완료 등)
- **자동**: ecosystem-auditor sub agent로 실행 가능
