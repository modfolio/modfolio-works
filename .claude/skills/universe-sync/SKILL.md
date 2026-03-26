---
description: 생태계 양방향 동기화 — 현재 프로젝트의 실제 상태를 ecosystem.json과 교차 검증하고, 지식을 최신화하고, 기술 스택 업데이트 후보를 도출한다. 어떤 프로젝트에서든 실행 가능.
argument-hint: "[--collect | --verify | --dry-run]"
disable-model-invocation: true
---

# /universe-sync — 생태계 양방향 동기화

## 동적 컨텍스트

**현재 프로젝트 정보**:
!`pwd`

!`cat package.json 2>/dev/null || echo "package.json 없음"`

**Universe 레포 존재 확인**:
!`ls C:/Projects/modfolio-universe/modfolio-universe/ecosystem.json 2>/dev/null || echo "UNIVERSE=NOT_FOUND"`

**모드 판별**:
!`ls ecosystem.json 2>/dev/null && echo "MODE=universe" || echo "MODE=child"`

## 실행 모드 판별

현재 디렉토리를 확인해서 실행 모드를 결정한다:

1. **Universe 모드**: `ecosystem.json`이 현재 디렉토리에 존재 → 전체 생태계 대상
2. **Child 모드**: `ecosystem.json`이 없음 → 현재 프로젝트만 대상, Universe 레포 참조

```bash
# 모드 판별
test -f ecosystem.json && echo "MODE=universe" || echo "MODE=child"
```

## 인자 파싱

`$ARGUMENTS`를 파싱한다:
- 인자 없음 → 전체 5-Phase 실행
- `--collect` → Phase 1만
- `--verify` → Phase 1+2만 (리포트만, 변경 없음)
- `--dry-run` → 전체 Phase 실행하되 쓰기 작업 건너뜀

---

## Child 모드 (개별 프로젝트에서 실행)

### Phase 1: 자기 상태 수집

현재 프로젝트의 실제 상태를 수집한다:

```
수집 항목:
1. package.json → name, version, dependencies (프레임워크 + SDK 버전)
2. wrangler.toml 또는 wrangler.jsonc → CF 프로젝트명, 바인딩
3. CLAUDE.md → ECOSYSTEM_START 섹션 존재 여부 + 내용
4. .claude/ → skills 수, agents 수, rules 수
5. git log -5 --oneline → 최근 활동
6. docs/updates/ → 미수집 업데이트 파일
```

### Phase 2: ecosystem.json과 교차 검증

Universe 레포의 `ecosystem.json`을 Read로 읽고, 현재 프로젝트의 엔트리를 찾아서 비교한다.

**검증 항목 (7개)**:

| # | 항목 | 비교 | 심각도 |
|---|------|------|--------|
| 1 | 버전 일치 | ecosystem.version vs package.json.version | P0 |
| 2 | 프레임워크 일치 | ecosystem.framework vs 실제 dependencies | P0 |
| 3 | 상태 정확 | ecosystem.status vs 실제 기능/배포 수준 | P1 |
| 4 | 도메인 모델 | landingDomain + entryMode 필드 존재 여부 | P2 |
| 5 | CLAUDE.md 동기화 | ECOSYSTEM_START 섹션 존재 + 최신 여부 | P1 |
| 6 | 하네스 완전성 | skills ≥ 39, agents ≥ 17, rules ≥ 5 | P1 |
| 7 | SDK 버전 | connect-sdk 버전이 생태계 표준과 일치 | P1 |

불일치를 **심각도별로 분류**해서 리포트 출력.

`--verify` 시 여기서 중단.

### Phase 3: 기술 스택 최신성

현재 프로젝트의 주요 의존성 최신 버전 확인:

```bash
# 각 패키지의 latest 버전 확인
bun pm info {package} --json 2>/dev/null
```

**Stability Filter**: `latest` 태그만. RC/beta/alpha/next 제외.
**major bump**: breaking change 가능 표시.

### Phase 3.5: 로컬 발견 탐지 (Upstream Discovery)

현재 프로젝트에서 **universe에 반영할 만한 발견**이 있는지 탐지한다.

#### 탐지 대상

1. **하네스 로컬 수정**: `.claude/skills/`, `.claude/agents/`, `.claude/rules/` 파일이 Universe 소스와 다른 경우 → 개선일 수 있음
```bash
# Universe 소스와 diff
diff "{UNIVERSE_PATH}/.claude/skills/{name}/SKILL.md" ".claude/skills/{name}/SKILL.md" 2>/dev/null
```

2. **docs/updates/ 미수집 파일**: 이전 세션에서 남긴 제안/발견/버그 리포트
```
docs/updates/*.md 파일 존재 여부 확인
```

3. **memory/pattern-history.md 변경**: 반복 위반 패턴 → 새 Rule 후보
4. **memory/decisions-log.md 변경**: 이 프로젝트 고유 의사결정 → knowledge 반영 후보

#### 발견 분류

| 유형 | 예시 | Universe 반영 방식 |
|------|------|-------------------|
| **skill-bug** | 공유 skill 실행 시 오류 발견 | Universe skill 수정 |
| **skill-improvement** | 공유 skill에 더 나은 프롬프트/단계 발견 | Universe skill 업데이트 제안 |
| **new-pattern** | 이 프로젝트에서 검증된 새 패턴 | knowledge/global.md 또는 새 skill 후보 |
| **rule-candidate** | 반복 위반 → 자동 Rule화 필요 | Universe rules/ 추가 |
| **ecosystem-drift** | 실제 상태가 ecosystem.json과 다름 | ecosystem.json 수정 |

발견이 있으면 사용자에게 목록을 보여주고, 각 항목에 대해 **upstream 제안 여부**를 묻는다.

### Phase 4: 양방향 동기화 (사용자 승인 후)

**반드시 사용자에게 변경 내역을 보여주고 승인을 받은 후 실행한다.**

#### 4a. Upstream: 이 프로젝트 → Universe

ecosystem.json P0 불일치 + Phase 3.5 발견을 Universe에 반영한다:

1. **ecosystem.json 수정** — 버전, 상태, 프레임워크, 노트 업데이트
2. **knowledge/projects/{repo}.md 업데이트** — 프로젝트 지식 최신화
3. **Skill/Rule 제안** — 로컬 수정이 개선이면 Universe 소스에 반영
   - Universe 레포의 해당 파일을 직접 Edit
   - 또는 `docs/updates/{date}-{repo}-upstream.md`에 제안 기록
4. **memory 반영** — 새 패턴/의사결정을 Universe knowledge에 기록

#### 4b. Downstream: Universe → 이 프로젝트

Universe 레포에서 최신 지식을 가져온다:
```bash
cd {UNIVERSE_PATH} && bun run sync-knowledge -- {현재_레포명}
```

#### 4c. 하네스 검증

sync 후 하네스 무결성 확인:
- skills/agents/rules 파일 수 점검
- CLAUDE.md ECOSYSTEM_START 섹션 최신 여부

### Phase 5: 결과 리포트

```markdown
## Universe Sync 결과 — {날짜} — {프로젝트명}

### 검증 결과
| 항목 | ecosystem.json | 실제 | 판정 |
|------|--------------|------|------|

### 해결된 불일치
| 항목 | Before | After |

### 미해결 (사용자 판단 필요)
| 항목 | 심각도 | 설명 |

### 업그레이드 후보
| 패키지 | 현재 | 최신 | Breaking |
```

---

## Universe 모드 (modfolio-universe에서 실행)

전체 생태계를 대상으로 실행한다.

### Phase 1: 전체 수집

ecosystem.json에서 **모든 레포 목록**을 추출.
워크스페이스에 존재하는 레포만 대상.

**Agent(haiku)를 병렬로** 띄워 각 프로젝트 상태를 수집한다 (최대 5개 동시):

각 Agent 지시:
```
C:/Projects/modfolio-universe/{repo}/ 프로젝트를 탐색해서 다음 JSON을 반환해라:
{
  "repo": "{repo}",
  "packageVersion": (package.json version),
  "frameworks": (프레임워크 패키지명+버전 목록),
  "connectSdkVersion": (@modfolio/connect-sdk 버전 또는 null),
  "claudeMdSynced": (ECOSYSTEM_START 태그 존재 여부),
  "skillCount": (.claude/skills/*/SKILL.md 수),
  "agentCount": (.claude/agents/*.md 수),
  "ruleCount": (.claude/rules/*.md 수),
  "lastCommitDate": (git log -1 --format=%ci),
  "pendingUpdates": (docs/updates/*.md 파일명 목록)
}
```

### Phase 2: 전체 검증

수집 결과를 ecosystem.json 전체 엔트리와 교차 검증.
Child 모드와 동일한 7개 항목을 **모든 앱**에 적용.

### Phase 3: 전체 기술 스택

프레임워크별 최신 버전을 한 번만 조회하고 모든 앱에 적용.

### Phase 4: 전체 동기화 (사용자 승인 후)

1. ecosystem.json 일괄 업데이트 (P0 불일치 수정)
2. knowledge/projects/*.md 업데이트 (변경된 프로젝트만)
3. knowledge/global.md 업데이트 (프레임워크 분포 등)
4. `bun run sync-knowledge` 실행 (전체 레포 지식 전파)
5. `bun run check && bun run typecheck` (quality gate)

### Phase 5: 전체 리포트

```markdown
## Universe Sync 결과 — {날짜} — 전체 생태계

### 통계
- 대상: {N}개 프로젝트
- ecosystem.json 수정: {M}건
- 지식 전파: {K}개 레포

### 프로젝트별 판정
| 앱 | 버전 | FW | 상태 | CLAUDE.md | 하네스 | SDK |
|---|---|---|---|---|---|---|

### 미해결
| 앱 | 항목 | 심각도 | 설명 |

### 업그레이드 후보
| 패키지 | 현재 최저 | 최신 | Breaking | 영향 앱 수 |
```

---

## 에이전트 활용

| 모드 | Phase | Agent | 모델 |
|------|-------|-------|------|
| Universe | 1 (수집) | Explore × N | haiku |
| Child | 1-3 | 메인 세션 직접 | — |
| 양쪽 | 4 (동기화) | 메인 세션 직접 | — |

## 안전 장치

1. **Phase 4는 항상 사용자 승인 후** — 자동 실행 안 함
2. **`--dry-run`** — 전체 Phase 실행하되 쓰기 없이 리포트만
3. **quality gate 통과 필수** — Universe 모드에서 동기화 후 check + typecheck 실행
4. **Universe 레포 못 찾으면** Phase 2 교차 검증은 CLAUDE.md 내 ECOSYSTEM_START 섹션 기반으로 수행 (제한적)

## 기존 도구와의 관계

이 skill은 기존 도구들의 **오케스트레이터**:
- `bun run sync-knowledge` → Phase 4에서 호출
- `/audit` → Phase 2에 통합
- `/harness-check` → Phase 1 수집 + Phase 4c 검증에 통합
- `/collect-updates` → Phase 1에 통합
- `/innovation-check` → Phase 3에 통합
- `/preflight` → 세션 시작용으로 별도 유지 (universe-sync보다 가볍고 빠름)
