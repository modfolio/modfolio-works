---
sor: modfolio-design/canon/design-tooling.md  # SoR 이관 2026-07-23; 이 파일은 mirror — 편집은 upstream(modfolio-design)
title: Design Tooling
version: 2.0.0
last_updated: 2026-07-26
source: [knowledge/references/design-tooling-harness.md, 2026-05-24 staleness audit + Figma MCP 풀 카탈로그 갱신, 2026-07-26 오너 결정 — Canva 단일 · Figma/Paper 미사용]
sync_to_siblings: true
applicability: always
consumers: [design, design-engineer]
---

# Design Tooling — Canonical Reference

> **v2.0 (2026-07-26 오너 결정): 클라우드 크리에이티브 = Canva 단일. Figma·Paper 는 미사용(보류).**
> 로컬 미디어(이미지 생성·배경제거·영상 변환·카피)는 infra `forge` — 우리가 아니라 infra 소유
> (infra `ADR-014-creative-substrate`). 아래 §Figma/§Paper 절은 **참조용 보존**이며 현행 워크플로가 아니다.

## 현행 도구 (v2.0)

| 도구 | 역할 | 입구 | 상태 |
|---|---|---|---|
| **Canva** (Pro) | 브랜드 납품물 저작 — 소셜 카드·피치덱·PDF. 브랜드킷/브랜드템플릿 기반 | MCP `https://mcp.canva.com/mcp` (OAuth) | **1급 · 현행** |
| **forge** (infra) | 이미지 생성/최적화/배경제거 · 영상 메타/포스터/변환 · 카피 초안 | MCP `https://forge.modfolio.io/mcp/` (Bearer `FORGE_API_TOKEN`) + `@modfolio/forge-sdk` | **소비 · 현행** |
| Figma | 디자인 시스템·협업 | MCP `https://mcp.figma.com/mcp` | 미사용(보류) |
| Paper | 개발 중 비주얼 이터레이션 | 로컬 `127.0.0.1:29979` | 미사용(보류) |

**왜 단일화**: 도구 3개를 병행하면 브랜드 정체성의 SoT 가 흩어진다. `brand/registry.json` +
Brand Passport 를 정본으로 두고 **Canva 브랜드킷 하나에 정렬**하는 편이 납품물 일관성에 유리하다.
Figma/Paper 를 되살릴 필요가 생기면 이 절만 되돌리면 된다(설정·문서 모두 보존).

> 미사용 도구를 문서에서 지우지 않는 이유: infra ADR-014 의 공유 어휘가 Canva/Adobe/**Figma** 를
> design 소유로 명시한다. 소유는 유지하고 **운영 상태만** 끈다(어휘 재정의 금지).

## 2026-05 갱신 — Figma MCP 풀 카탈로그

universe 의 Figma 통합은 **MCP server `claude.ai Figma`** 가 standard. 사용 가능한 함수 + skill set:

- `use_figma` — JS execution in Figma file context. **`figma:figma-use` skill (MANDATORY prerequisite)** 호출 필수
- `get_design_context`, `get_screenshot`, `get_metadata`, `get_variable_defs` — read 도구
- `generate_diagram` (FigJam) — **`figma:figma-generate-diagram` prerequisite**
- `create_new_file` — **`figma:figma-create-new-file` prerequisite**
- Code Connect: `add_code_connect_map`, `get_code_connect_map`, `get_code_connect_suggestions`, `send_code_connect_mappings`
- skill set: `figma:figma-use`, `figma:figma-generate-design`, `figma:figma-code-connect`, `figma:figma-generate-diagram`, `figma:figma-use-figjam`, `figma:figma-use-slides`, `figma:figma-create-new-file`, `figma:figma-generate-library`

Canva 통합은 `claude.ai Canva` MCP — `authenticate` + design 생성. 양방향 pipeline 은 `.claude/skills/design/SKILL.md` 가 source of truth.

## 도구 역할 분리

| 도구 | 역할 | MCP 방향 | 사용 시점 |
|------|------|----------|----------|
| **Paper** | Claude Code 양방향 이터레이션 | 읽기+쓰기 (24개 도구) | 개발 중 비주얼 탐색/수정 |
| **Figma** | 디자이너 협업, 외부 공유, 디자인 시스템 | 읽기 위주 + 캡처 | 팀 협업, 프레젠테이션, 토큰 관리 |
| **Canva** | 마케팅/브랜드 에셋 | 읽기+쓰기 | 피치덱, 소셜 미디어, PDF |

## MCP 연결

| MCP | 전송 방식 | 엔드포인트 |
|-----|----------|-----------|
| paper | HTTP (로컬) | `http://127.0.0.1:29979/mcp` |
| figma | HTTP (원격) | `https://mcp.figma.com/mcp` |
| canva | HTTP (원격) | `https://mcp.canva.com/mcp` |

### Paper 설치

```bash
# Paper Desktop 앱 설치 필수 (paper.design/downloads)
claude mcp add paper --transport http http://127.0.0.1:29979/mcp --scope user
```

WSL 환경 (⚠ 2026-07-12 정정 — 구 "mirrored 필수" 폐기): **`networkingMode=mirrored` 금지** — VS Code Remote-WSL **"freeze + 무한 reopen"의 원인**(MS 인정 버그, vscode-remote-release #9222/#10818/#11091; modfolio 실측 — 메모리 무관, mirrored 제거→NAT 복귀로 해소). Windows 쪽 Paper(`127.0.0.1:29979`) 접속은 NAT 에서 **Windows 호스트 IP** 로: `claude mcp add paper --transport http http://$(ip route list default | awk '{print $3}'):29979/mcp --scope user` (게이트웨이 IP 는 부팅마다 바뀔 수 있음 — 접속 실패 시 재확인). freeze 재발 시 메모리를 의심하지 말고 `~/.vscode-server/data/logs/*/remoteagent.log` 부터 (modfolio journal `20260712-p0-xss-stack-ts7.md` §개발 환경).

## 코드 → Paper (푸시)

- `write_html`로 컴포넌트를 Paper 캔버스에 렌더링
- **전체 페이지가 아닌 컴포넌트/섹션 단위**
- 아트보드 이름 = 컴포넌트 이름

## Paper → 코드 (풀)

1. 사용자가 Paper에서 비주얼 수정
2. `get_jsx`로 수정된 구조 확인
3. `get_computed_styles`로 변경된 스타일 값 확인
4. 코드에 반영 — **토큰 체계 우선 적용**

## Figma → 코드 (구현)

1. Figma 프레임 링크 복사 → Claude Code에 전달
2. `get_design_context`로 디자인 데이터 읽기
3. 앱 토큰 팔레트와 매핑
4. 코드 생성

## 코드 → Figma (캡처)

- 정적 빌드 + HTTP 서버 방식 권장
- SSR 앱은 프로덕션 URL + DevTools 콘솔 캡처
- WSL에서 Playwright 불가 → DevTools 방식 사용

## Paper → Figma (전달)

1. Paper에서 `get_jsx`로 HTML 추출
2. 로컬 HTML 파일로 저장 + 캡처 스크립트 삽입
3. `python3 -m http.server`로 서빙
4. `generate_figma_design` → 브라우저 캡처 → Figma 전송

## 주의사항

- Paper 캔버스는 **참조용**. 소스코드가 정본(source of truth)
- Paper `write_html`은 **리터럴 CSS만 이해** — `var(--...)`, Tailwind/UnoCSS 클래스 불가
- Figma → Paper 토큰 동기화 시 변수를 **실제 값으로 반드시 변환**
- Paper에서의 수정은 "의도 전달"이지 코드 직접 반영이 아님
