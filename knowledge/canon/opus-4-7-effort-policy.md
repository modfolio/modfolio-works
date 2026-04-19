---
title: Opus 4.7 & Effort Policy
version: 1.0.0
last_updated: 2026-04-17
source: [knowledge/canon/opus-4-7-effort-policy.md]
sync_to_children: true
consumers: [preflight, plan, generate-review]
---

# Opus 4.7 & Effort Policy — 권고

> 이 문서는 **권고**이며 강제가 아니다. 각 앱은 자체 `.claude/settings.json`에서 override 가능.

## 모델 티어

| 티어 | 모델 ID | Context | 용도 |
|------|---------|---------|------|
| Premium (1M) | `claude-opus-4-7[1m]` | 1,000,000 tokens | Figma metadata / 대형 diff / 대용량 컨텍스트 agent |
| Standard | `claude-opus-4-7` | 200,000 tokens | 대부분의 reasoning / 코딩 / 리뷰 |
| Fast | `claude-haiku-4-5-20251001` | 200,000 tokens | 검색·요약·결정적 검증 (비용 효율) |

**가격** (2026-04-17): Opus 4.7 $5/$25 per MTok (input/output). Opus 4.6과 동일. 1M variant 프리미엄 없음. 단, 새 토크나이저가 최대 +35% 토큰 소비 가능 → 실효 비용은 소폭 증가 가능.

## Effort 5단계

| 레벨 | 특징 | 비용/속도 | 권장 대상 |
|------|------|----------|-----------|
| low | 빠른 응답, 얕은 reasoning | 최저 | 단순 검색/요약 |
| medium | 균형 | 저 | 보통 검증 |
| high | 일반 기본값 | 중 | 표준 리뷰·테스트·QA |
| xhigh | 깊은 reasoning (4.7 신규) | 중-고 | 코드 리뷰·아키텍처 판정 |
| max | 제약 없는 최대 reasoning | 가변 (비용 ↑) | design·코딩·복잡 태스크 |

**중요**: `max`는 세션 전용. 영구 persist하려면 `CLAUDE_CODE_EFFORT_LEVEL=max` 환경변수 필요.

### Known issues (2026-04-17 시점)

- #30726: settings `effortLevel: "max"`가 UI 인터랙션 시 silently downgrade
- #40093: banner는 max 표시되지만 runtime은 medium으로 실행
- 완화책: agent frontmatter `effort:` 필드 + 환경변수 **이중 설정** + Claude Code v2.1.111+ 확인

## 환경변수 권장 설정

### Windows (PowerShell/CMD)

```powershell
setx CLAUDE_CODE_EFFORT_LEVEL max
# 세션 재시작 필요
```

### macOS / Linux

```bash
# ~/.bashrc 또는 ~/.zshrc
export CLAUDE_CODE_EFFORT_LEVEL=max
```

### 프로젝트 단위 (`.claude/settings.json`)

```jsonc
{
  "env": {
    "CLAUDE_CODE_EFFORT_LEVEL": "max",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "32768"
  }
}
```

**우선순위**: OS env > settings.json env > settings.local.json env > agent frontmatter. 가장 가까운 값이 이긴다.

## 런타임 토글

```
/effort max     # 현재 세션만 최대 effort
/effort xhigh   # 깊은 reasoning (비용 중간)
/effort high    # 기본 reasoning
```

## Modfolio Universe Agent 분류 (2026-04-17 기준)

| # | Agent | 모델 | effort | 근거 |
|---|-------|------|--------|------|
| 1 | design-engineer | claude-opus-4-7[1m] | max | 디자인 의사결정 + Figma metadata |
| 2 | page-builder | claude-opus-4-7[1m] | max | 레이아웃 전체 생성 |
| 3 | component-builder | claude-opus-4-7 | max | 코딩: UI 컴포넌트 |
| 4 | api-builder | claude-opus-4-7 | max | 코딩: 엔드포인트 + Zod + JWT |
| 5 | schema-builder | claude-opus-4-7 | max | 코딩: Drizzle 스키마/마이그레이션 |
| 6 | contract-builder | claude-opus-4-7 | max | 코딩: contracts breaking 영향 |
| 7 | quality-fixer | claude-opus-4-7 | max | 코딩: 기계 수정, 정공법 |
| 8 | security-hardener | claude-opus-4-7 | max | 코딩: OWASP 취약점 |
| 9 | code-reviewer | claude-opus-4-7[1m] | xhigh | 리뷰: 대규모 diff 1M 필요 |
| 10 | design-critic | claude-opus-4-7 | xhigh | 리뷰: Anti-Slop 판정 |
| 11 | architecture-sentinel | claude-opus-4-7 | xhigh | 리뷰: 불변 원칙 교차확인 |
| 12 | accessibility-auditor | claude-opus-4-7 | xhigh | 리뷰: WCAG AA |
| 13 | test-builder | claude-opus-4-7 | high | 테스트 생성 |
| 14 | visual-qa | claude-opus-4-7 | high | Playwright + axe 5-gate |
| 15 | ecosystem-auditor | claude-opus-4-7 | high | ecosystem.json 검증 |
| 16 | knowledge-searcher | claude-haiku-4-5-20251001 | medium | 검색/요약 |
| 17 | innovation-scout | claude-haiku-4-5-20251001 | medium | context7 조회·비교 |

## 비용 guard

- `max` 남용 시 token 소비 급증. `/effort high`로 런타임 하향 가능
- `preflight` skill이 Claude Code 버전 + `CLAUDE_CODE_EFFORT_LEVEL` 환경변수 존재 여부 확인
- 월별 `knowledge/journal/` 비용 관찰 권고

## 참조

- [Claude Opus 4.7 공식](https://www.anthropic.com/claude/opus)
- [Claude Code Model Config](https://code.claude.com/docs/en/model-config)
- [Extended Thinking (Adaptive)](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
