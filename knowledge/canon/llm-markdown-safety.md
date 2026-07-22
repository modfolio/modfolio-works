---
title: LLM 마크다운 렌더 안전 — 구성상 안전(escape + URL 허용목록) · DOMPurify 계열 workerd 금지 · 단일 모듈
version: 1.0.0
last_updated: 2026-07-12
source: [modfolio P0 실측 2026-07-12 (feedback/modfolio/2026-07-12_ts7-workers-ssr-xss-findings.md §2·§3, 커밋 02470e7), .claude/rules/lethal-trifecta.md, pdgd blocks.test.ts 선례]
sync_to_siblings: true
applicability: always
consumers: [security-scan, code-reviewer, ui, ai-patterns]
---

# LLM/사용자 마크다운 렌더 = 구성상 안전 (XSS 클래스 차단)

> **해당**: LLM 출력·사용자 마크다운을 `{@html}` / `dangerouslySetInnerHTML` 로 렌더하는 모든 앱 (채팅·에이전트 UI·프리뷰·이메일 템플릿). lethal-trifecta 의 untrusted→outward 경로와 직결.

## 사실 (modfolio 프로덕션 실측)

1. **`marked` 기본값은 raw HTML 을 그대로 통과시킨다.** `<script>`·`<img onerror>`·`[x](javascript:...)` 전부 라이브. 헤딩/테이블셀/리스트/blockquote **내부** raw HTML, autolink `<javascript:...>`, 참조링크 `[r]: javascript:` 까지 전부 뚫린다. "no raw HTML" 이라는 주석·통념은 사실이 아니다.
2. **`isomorphic-dompurify` 는 CF Workers(workerd)에서 모듈 init 시 throw** → 인증 사용자에게 SSR 500. DOM 의존 새니타이저는 workerd 금지 (검증 규칙은 `cf-deploy.md` §workerd 런타임 검증).

## 표준 — 스크럽이 아니라 구성상 안전 (새 의존성 0 · DOM 0)

DOMPurify 로 "만든 뒤 지우는" 대신 **애초에 만들지 않는다**:

1. **raw HTML(블록·인라인) → 이스케이프해 텍스트로.**
2. **링크 URL → `http/https/mailto` 허용목록.** 인라인·autolink·참조링크가 전부 link 토큰으로 수렴하므로 **marked 렌더러 오버라이드 1개**로 전부 커버된다.
3. **이미지 → alt 텍스트로** (원격 이미지 = 트래킹/유출 벡터).
4. → 출력에 도달하는 태그는 marked 가 **마크다운 문법에서 생성한 것뿐**. DOM 부재 = workerd 안전이 구조적으로 보장.

**단일 모듈 원칙**: 안전/비안전 렌더 모듈이 공존하면 안 안전한 쪽이 선택된다 (modfolio: `safe-markdown.ts` + `markdown.ts` 이중문 → 사고). **불안전한 문 자체를 제거**하고 렌더 진입점을 하나로.

## 테스트 판정 기준 (약한 프록시 금지)

- ❌ `expect(out).not.toContain("onerror")` — 이스케이프된 **텍스트**에도 반응하는 약한 프록시 (`title="t&quot; onmouseover=..."` 는 안전한데 위험 오판 → 없는 버그를 "고치는" 사고).
- ✅ 출력의 **실제 태그 전수 열거 → 허용목록 대조 + 속성 경계 파싱**(따옴표 경계 존중). 공격 벡터 fixture 는 엔티티 인코딩(`&#106;`)·16진·탭 삽입 난독화 포함 (modfolio 23종 선례).
- ✅ **탐지기가 무력하지 않음을 증명하는 메타 테스트** 동봉 (탐지기 자체가 죽으면 그린이 무의미).
- ✅ 소스 레벨 불변 고정 선례: pdgd `blocks.test.ts` — 렌더 컴포넌트 소스에 `{@html}` 출현 자체를 테스트로 금지 (예외는 자체 정적 SVG 처럼 신뢰 소스만 주석 명시).

## 즉시 점검 대상 (2026-07-12 스캔 실측)

`marked` 소비 = modfolio(수정 완료)·**modfolio-press**(app 3 라우트 `{@html}` + email)·**pdgd**(구성상 안전 확인). `isomorphic-dompurify` 사용 sibling = 0. press 에는 opinion 발신 — 적용은 press 자율 (Hub-not-enforcer).
