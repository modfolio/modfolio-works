# Harness Feedback — modfolio-works

> universe 측 하네스 템플릿 개선에 반영할 피드백.
> 이 프로젝트에서 발견하고 로컬 수정한 항목들.

## 발견일: 2026-03-24

### 1. Stop Hook 자기학습 루프 끊김 (P0 — 버그)

**증상**: Stop hook quality gate agent가 `memory/pattern-history.md`를 읽기만 하고 쓰지 않음. 위반을 발견해도 기록하지 않아 자기학습 루프가 작동하지 않음.

**원인**: universe 템플릿의 Stop hook prompt STEP 3이 `Check memory/pattern-history.md for repeated violations.`로만 되어 있음.

**수정**: STEP 3을 `Check AND UPDATE`로 변경. 위반 발견 시 테이블에 row 추가/갱신, 3회 도달 시 ESCALATE.

**영향 범위**: settings.json을 sync-knowledge가 건드리지 않으므로 다른 프로젝트에도 동일 버그 잔존 예상.

**제안**: universe의 settings.json 템플릿 Stop hook prompt를 수정하고, sync-knowledge 또는 /harness-check에서 이 패턴을 검증하는 항목 추가.

---

### 2. memory/ 디렉토리 미생성 (P0 — 누락)

**증상**: Stop hook이 `memory/pattern-history.md`와 `memory/decisions-log.md`를 참조하지만, universe sync가 이 디렉토리를 생성하지 않음.

**수정**: `memory/pattern-history.md` (테이블 형식)과 `memory/decisions-log.md` (scaffold) 수동 생성.

**제안**: sync-knowledge에서 memory/ scaffold를 생성하거나, /harness-check 점검 항목에 추가.

---

### 3. 불필요한 Rules의 일괄 배포 (P1 — 설계 한계)

**증상**: Astro 전용 프로젝트에 `contracts.md`, `ecosystem.md`, `schema-files.md`, `svelte-files.md` 규칙이 배포됨. 모두 존재하지 않는 경로/명령을 참조.

**수정**: 4개 삭제, 5개 유지 (astro-files, css-files, api-routes, test-files, knowledge).

**제안**: sync-knowledge에 per-project rule exclude 메커니즘 필요. 예: 각 프로젝트 루트에 `.claude/sync-exclude` 파일로 제외할 rules 목록 지정, 또는 ecosystem.json의 framework 필드 기반 자동 필터링.

---

### 4. harness-check 기대값 불일치 (P1 — 버그)

**증상**: harness-check SKILL.md가 "기대값: 38개"이지만 실제 skills 수는 39개 (/preflight 추가 후 미갱신).

**수정**: 로컬에서는 수정하지 않음 (universe 소스가 정본이므로).

**제안**: universe 측에서 harness-check SKILL.md의 기대값을 39로 갱신.

---

### 5. CLAUDE.md 스킬 테이블 비동기 (P2 — 설계 한계)

**증상**: sync-knowledge가 ECOSYSTEM 섹션만 교체하므로, 프로젝트별 Skills 테이블에 /preflight가 누락되고 /harness-check 설명이 구 버전.

**수정**: 수동으로 /preflight 추가, harness-check 설명 갱신, 무관한 스킬 제거.

**제안**: sync-knowledge가 ECOSYSTEM 섹션 외에 Skills 테이블도 갱신하는 옵션 추가. 또는 /harness-check에서 CLAUDE.md 스킬 테이블 최신성 검증 항목 추가.

---

### 6. knowledge.md Rule의 존재하지 않는 명령 참조 (P2 — 미세 버그)

**증상**: `knowledge.md` 규칙이 `bun run sync-knowledge`를 참조하지만 이 명령은 universe에만 존재.

**수정**: "modfolio-universe 레포의 sync-knowledge로 관리"로 문구 교체.

**제안**: knowledge.md 규칙에서 sync-knowledge 참조를 조건부로 하거나, universe 전용 내용은 자식 프로젝트 배포 시 자동 치환.
