# Modfolio Claude Code Bible

> 2026-03-22 기준. 모든 Modfolio 프로젝트에서 Claude Code를 사용할 때 참조하는 단일 레퍼런스.
> 이 문서는 git에 커밋되며, 글로벌 설정(`~/.claude/`)이 없는 환경에서도 참조 가능.

---

## 1. 설정 계층 구조

```
~/.claude/                    ← 글로벌 (모든 프로젝트 자동 적용)
├── CLAUDE.md                 ← 생태계 공통 원칙 (불변 원칙, 디자인, 작업)
├── settings.json             ← 공통 hooks + permissions
│   ├── Stop hook (agent)     ← 매 턴 종료 시 품질 자동 검증
│   └── PostCompact hook      ← 컴팩션 후 컨텍스트 복원
└── rules/                    ← 파일 패턴별 자동 적용 규칙
    ├── ui-components.md      ← *.svelte, *.tsx, *.astro, *.css
    └── accessibility.md      ← *.svelte, *.tsx, *.astro

각 프로젝트/.claude/           ← 프로젝트 레벨 (해당 프로젝트만)
├── settings.json             ← 프로젝트 전용 hooks (bun run check 등)
├── skills/                   ← 스킬 (sync-knowledge로 전파)
├── agents/                   ← 에이전트 (sync-knowledge로 전파)
└── rules/                    ← 프로젝트 전용 rules

~/.claude/projects/<project>/memory/  ← Auto Memory (세션 간 지속)
└── MEMORY.md + 토픽 파일들
```

**병합**: 글로벌 hooks + 프로젝트 hooks = 모두 실행. 글로벌 rules + 프로젝트 rules = 모두 적용.

---

## 2. 불변 원칙 (예외 없음)

1. **House of Brands**: 앱 간 공유 UI 라이브러리 금지
2. **Zero Physical Sharing**: 코드 공유는 SSO 토큰, 데이터 스키마, Webhook API로만
3. **100% Cloudflare Edge Native**: Vercel 등 타 플랫폼 배제
4. **오류 정공법**: `@ts-ignore`, `biome-ignore` 우회 금지. 원인을 찾아 수정
5. **Git 안전**: `--force`, `--no-verify` 금지. 민감 정보 커밋 금지
6. **Evergreen 법칙**: 안 되는 것을 다른 것으로 시도하지 말고 원인을 정확히 진단하여 해결. 우회/편법/덮어쓰기 금지

---

## 3. 디자인 규칙

### 토큰 시스템

- **3계층 구조**: Primitives → Semantic → Accent
- **명명 규칙**: `--{속성}-{역할}-{변형}` (예: `--color-interactive-primary`)
- **하드코딩 금지**: `#fff`, `16px`, `rgb()` → CSS 변수 필수
- **8pt Spacing Grid**: `--space-1` (4px) ~ `--space-12` (48px)
- **Elevation**: `--shadow-sm/md/lg/xl` 만 허용 (임의 그림자 금지)

### 새 디자인 탐색 프로토콜

1. 영감 수집 (Are.na, Mobbin 등 — 알고리즘 큐레이션 밖에서)
2. 토큰 팔레트 초안 정의 (CSS 변수 세트)
3. 범위 내 자유 구현
4. **정규화 관문**: 컴포넌트 10개 샘플링 → 토큰 매핑률 80% 이상
5. 미달 시: 토큰 체계 자체를 수정 (구현을 억지로 맞추지 않음)

### 타이포그래피

- **유동 타이포**: `clamp(2rem, 1.5rem + 2vw, 3.5rem)` (브레이크포인트 대신 연속 보간)
- **줄 길이**: `max-width: 65ch` (50-75자)
- **`text-align: justify` 금지** (한국어/영어 모두)
- **위계적 가중치**: h1-h6 간 최소 2단계 weight 차이
- **Adobe Fonts**: Kit `fmh4fod` + Pretendard 한국어 fallback

### 모션

- **스프링 물리** 우선 (CSS ease-in-out 지양): `stiffness`, `damping`, `mass`
- **SvelteKit**: `svelte/motion`의 `spring()` — 95% 케이스에서 충분
- **순차 등장**: `animation-delay` 60-120ms 간격
- **성능**: `transform`/`opacity`만 애니메이션
- **접근성**: `@media (prefers-reduced-motion: reduce)` 폴백 필수

### 디자인 오버홀의 정의

- CSS 토큰 변경만은 오버홀이 **아님**
- **진짜 오버홀** = HTML 구조 + 레이아웃 완전 재설계 (card grid vs timeline vs pipeline 등)

---

## 4. 작업 플로우

### 기획

- **Plan Mode** (Shift+Tab x2) 사용 — 빌트인 기능
- 제품 설계 수준 상세도 (TODO 목록 아님)
- 필수: Intent, User Journey, 디자인 방향, 기술적 위험, AC, Task Breakdown

### 검증

- **Stop 훅**: 매 턴 종료 시 자동 실행 (하드코딩 색상, prefers-reduced-motion, @ts-ignore 검사)
- **PostToolUse 훅**: 파일 수정 후 `bun run check` 자동 실행
- **PreToolUse 훅**: `git commit` 전 `check + typecheck` 자동 실행
- **Quality Gate**: `bun run quality:all` 통과 필수

### 컨텍스트 관리

- **Auto Memory**: `~/.claude/projects/<project>/memory/` — 세션 간 자동 지속
- **PostCompact 훅**: 컴팩션 후 Auto Memory + TaskList에서 상태 자동 복원
- **`/compact`**: 15턴 이상 시 사용 권장
- **`/clear`**: 작업 도메인 완전 변경 시

---

## 5. 스킬 목록

| 스킬 | 용도 |
|------|------|
| `/plan` | 기획 품질 기준 (Plan Mode 참조) |
| `/design-tokens` | 3-tier 토큰 구조 + 탐색 프로토콜 |
| `/typography` | Adobe Fonts + clamp + CLS 방지 |
| `/motion-patterns` | 스프링 물리 + svelte/motion + 접근성 |
| `/ui-quality-gate` | UI 자가 검증 체크리스트 |
| `/sso-integrate` | Connect SDK SSO 연동 |
| `/contracts` | Zod 이벤트 스키마 |
| `/deploy` | CF Pages 배포 |
| `/journal` | 개발 저널 |
| `/ai-patterns` | AI 모델 라우터 + fallback |
| `/drizzle-patterns` | Drizzle ORM 규칙 |
| `/email-patterns` | Resend 이메일 |

---

## 6. 에이전트

| 에이전트 | 역할 |
|---------|------|
| `code-reviewer` | 코드 품질 + 디자인 일관성 리뷰 (Tier 1 위반, 하드코딩, 접근성) |
| `knowledge-searcher` | 지식베이스 검색/요약 |
| `ecosystem-auditor` | ecosystem.json vs 실제 상태 검증 (universe 전용) |

---

## 7. MCP 서버

| 서버 | 용도 |
|------|------|
| Context7 | 라이브러리 최신 문서 조회 |
| GitHub | GitHub Copilot MCP |
| Cloudflare | CF Workers, D1, KV, R2, Pages API |

---

## 8. 글로벌 Rules (자동 적용)

### ui-components (*.svelte, *.tsx, *.astro, *.css)

- 하드코딩 색상 → CSS 변수 필수
- `text-align: justify` 금지
- 애니메이션 시 `prefers-reduced-motion` 필수
- `transform`/`opacity`만 애니메이션
- 시각 효과 레이어 `pointer-events: none` 격리
- 새 디자인 시 토큰 팔레트 먼저 정의

### accessibility (*.svelte, *.tsx, *.astro)

- `aria-label` 또는 시각적 텍스트 필수
- 이미지 `alt` 필수
- WCAG AA 대비율 (텍스트 4.5:1)
- 터치 타겟 44x44px

---

## 9. 생태계 동기화

```bash
bun run sync-knowledge          # CLAUDE.md + skills + agents → 22개 프로젝트
bun run sync-knowledge:dry      # 변경 미리보기
bun run sync-knowledge -- naviaca  # 특정 프로젝트만
```

전파 대상:
- **CLAUDE.md**: 생태계 컨텍스트 섹션 (ECOSYSTEM_START/END)
- **스킬 12종**: design-tokens, typography, motion-patterns, ui-quality-gate, plan, contracts, deploy, journal, sso-integrate, ai-patterns, drizzle-patterns, email-patterns
- **에이전트 2종**: code-reviewer, knowledge-searcher

---

## 10. 새 환경 셋업 체크리스트

1. `~/.claude/CLAUDE.md` 존재 확인 (없으면 이 문서의 §2 참조하여 생성)
2. `~/.claude/settings.json`에 Stop + PostCompact 훅 확인
3. `~/.claude/rules/` 에 ui-components.md + accessibility.md 확인
4. 프로젝트의 `.npmrc`에 GitHub Packages 레지스트리 설정 확인
5. `bun run quality:all` 통과 확인
6. bun 1.3.11+ 확인 (`bun --version`)

---

## 11. 자주 하는 실수

- CSS 토큰 변경만으로 "디자인 오버홀" 했다고 하는 것 → HTML 구조 재설계 필수
- 에러가 나면 다른 도구/방법으로 시도하는 것 → 원인 진단 후 정공법
- `@ts-ignore`로 타입 에러 무시 → 타입을 고쳐야 함
- CLAUDE.md에 동적 상태(현재 작업 진행률 등)를 적는 것 → Auto Memory나 TaskList 사용
- `bun run quality:all` 안 돌리고 커밋 → PreToolUse 훅이 차단함
