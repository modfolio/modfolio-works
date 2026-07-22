---
title: Fact Ownership — 사실의 소유권과 동기화 방향
version: 1.0.0
last_updated: 2026-07-04
source: [2026-07-04 오너 결정 "ecosystem 은 참고서, 대장 아님 — sibling 이 hub 가 정한 것 때문에 불이익 보면 안 된다", feedback/athsra/2026-07-04_registry-currency-ask.md (소유권 역전 사건), docs/adr/ADR-014-fact-ownership.md, knowledge/journal/20260704-fact-ownership-session.md]
sync_to_siblings: true
applicability: always
consumers: [feedback-send, feedback-collect, harness-pull, preflight, ecosystem]
---

# Fact Ownership — 사실의 소유권과 동기화 방향

> **모든 사실(fact)에는 소유자(SoT)가 있고, 동기화는 소유자 → 미러 방향으로만 흐른다.**
> 미러가 소유자를 이기는 순간 소유권 역전이며, 그것은 설계 버그다.

## 도입 계기 (2026-07-04)

athsra 가 자기 패키지 버전(`@athsra/cli` 1.2.5)을 스스로 기록하지 못하고 hub 에 "등록부를 고쳐달라"는 피드백을 보내야 했다. 그 시점 hub 기록은 **세 곳이 서로도 불일치**했다 — `ecosystem.json` note = 1.1.7, `knowledge/projects/athsra.md` = 1.2.2, 실제 npm = 1.2.5. 자기 이슈(OIDC)는 ask 가 제기되기 **9일 전에 이미 수정**됐는데 hub 미러에 ⏳ open 으로 남아 멤버 CLAUDE.md 에 계속 주입됐다. 손으로 관리하는 미러는 반드시 썩고, 썩은 미러가 "do not edit" 마커를 달고 소유자의 컨텍스트에 주입되는 것이 근본 결함이었다.

## 사실의 3분류

| 분류 | 예 | SoT | 동기화 방향 | 불일치 시 |
|---|---|---|---|---|
| **member-owned** | 자기 패키지/앱 버전, 자기 배포 상태, 자기 이슈의 resolved 여부, 자기 capabilities, 자기 CHANGELOG | **그 repo 자신** (코드·package.json·npm published·git) | repo → hub (상향 미러) | **repo 실측이 옳다.** hub 기록 stale = hub 버그 |
| **hub-owned** | `@modfolio/contracts` 스키마, 공유 canon 표준, cross-app 토폴로지, `harnessLatest`, universe 불변 원칙 | **modfolio-ecosystem** | hub → repo (sync-down, pull-based) | hub 기록이 옳다 (단 강제 없음 — Hub-not-enforcer) |
| **shared (계약)** | 앱 간 이벤트 스키마, SSO 클레임 형태 | **계약 절차** (`contracts/` + `schema-impact` + `event_version`) | 계약 변경 절차로만 | 계약 프로세스가 결정 |

## 원칙

1. **미러 ≠ SoT.** hub 의 `knowledge/projects/<repo>.md`·`ecosystem.json` 앱 엔트리는 member-owned 사실의 **관측 기록(미러)**이다. 멤버 CLAUDE.md 동기화 구간에 주입되는 것도 미러다 — 그 repo 실측과 다르면 **실측이 항상 우선**한다.
2. **미러 staleness = hub 쪽 버그.** "멤버가 참아야 할 제약"이 아니다. 발견 즉시 hub 가 정정하고, 구조적으로는 자동 미러(아래 §자동화)로 손 편집 자체를 줄인다.
3. **소유자는 hub 승인 없이 전진한다.** 멤버는 자기 사실에 대해 hub 갱신을 **기다릴 필요가 없다** — 실측이 이미 SoT 다. hub 미러 정정은 사후 통보(`feedback-send`)로 충분하다.
4. **역사 기록 vs 현행 주장 구분.** dated 이력(예: canon 의 "v1.16.0 변경" 블록, "2026-05-03 dogfood 실측")은 역사라서 **불변**. "현행 X" 형태의 주장만 정정 대상이다. 역사를 소급 수정하지 않는다.
5. **hub 미러에는 관측 시점을 남긴다.** 버전·상태 같은 stale 가능 사실을 prose 에 쓸 때는 실측 일자를 병기한다 ("1.2.5 (2026-07-04 npm 실측)").

## 미러 신선도 경로 (실측, harness-pull 기준)

멤버가 받는 hub 미러의 신선도는 **경로에 따라 다르다**:

| 경로 | ecosystemRoot 해석 | 신선도 |
|---|---|---|
| `bunx modfolio-harness-pull` (멤버 자체 실행) | **npm 번들 내부** (publish 시점 스냅샷) | **publish-lag** — hub 가 원본을 고쳐도 다음 harness publish 전까지 반영 불가 |
| `harness-lock.json {autoPull:true}` 세션 자동 pull | 위와 동일 (bunx 경로) | publish-lag |
| hub 의 `bun run sync-knowledge` (host sibling 안내) | hub live checkout | 최신 (단 advisory — 각 repo 가 `--apply` 자율) |

→ 이 publish-lag 가 **구조적**이기 때문에, member-owned 사실은 hub 미러가 아니라 **pull 시점 로컬 실측**으로 표기한다 (아래).

## 자동화 (소유권 역전의 기계적 제거)

- **self-facts 블록 (harness 3.17.0+)**: `harness-pull` 이 멤버 CLAUDE.md 동기화 구간을 생성할 때, 그 repo 의 `package.json`(+ workspaces 하위 패키지)을 **pull 시점에 로컬로 판독**해 "이 repo 실측" 표를 주입한다. hub 를 경유하지 않으므로 자기 버전은 구조적으로 stale 불가.
- **version-sync `--apply` (hub 상향 미러)**: hub 가 host sibling 로컬(비 clone 시 GitHub API)을 판독해 `ecosystem.json` 각 앱의 `packages`(monorepo 하위 패키지 — 실제 유지·publish 되는 사실) 필드를 **자동 갱신**한다. root version drift 는 INFO 리포트 + `--versions` 옵트인 — fleet 관행상 monorepo root version 은 유지되지 않는 scaffold 값이고, `version` 라벨은 멤버가 피드백으로 assert 하는 마일스톤이라 자동 덮어쓰기가 오히려 진실성을 낮춘다. prose note 는 버전 SoT 에서 은퇴 — 서사·맥락 전용.
- **feedback-send/collect**: 멤버 → hub 사후 통보 채널 (자동 델타 + 명시 노트). hub 는 수신 즉시 미러 정정.

## 멤버 관점 프로토콜 (권리)

1. **자기 사실은 그냥 전진** — hub 기록과 달라도 멈추지 않는다. 실측이 SoT.
2. **hub 미러 정정 요청** — `feedback-send` 또는 `feedback/<repo>/` 명시 노트. hub 는 이것을 "요청 승인"이 아니라 **버그 리포트**로 취급한다.
3. **동기화 구간 방어 (전부 멤버 자율)** — `.claude/harness-lock.json` `lockedPaths` 에 등록하면 pull 이 그 파일을 건드리지 않음 · CLAUDE.md **마커 바깥**은 항상 보존 · `autoPull` 은 opt-in (기본 off).
4. **hub-owned 표준과의 관계** — 최신 harness/canon 을 참고하는 것은 권장(evergreen)이지만, 그것 때문에 자기 사실·자기 판단이 뒤로 밀리면 안 된다. 충돌 시 이 canon 이 evergreen 의 자매 축이다: evergreen = hub-owned 표준의 최신성, fact-ownership = member-owned 사실의 주권.

## 반-패턴

- ❌ 멤버가 자기 버전 갱신을 hub 에 "요청"하고 대기 — 실측이 이미 SoT, 대기 불필요
- ❌ hub 가 member-owned 사실을 손 prose 로만 관리 — 자동 미러 또는 실측 일자 병기 없이 쓰지 않는다
- ❌ 동기화 마커를 "권위"로 읽기 — 마커는 "여기 고쳐도 다음 pull 에서 재생성된다"는 **기계적 안내**일 뿐, hub 기록이 더 옳다는 뜻이 아니다
- ❌ 역사 블록 소급 수정 — dated 기록은 불변, 현행 주장만 정정
- ❌ 미러 불일치를 "그 앱의 선택/정상 분산"으로 기록 — evergreen §v2.3 과 동일하게, 미러 stale 은 상태이지 의도가 아니다

## 관련

- `docs/adr/ADR-014-fact-ownership.md` — 결정 기록 (사건·근거·결과)
- `knowledge/canon/evergreen-principle.md` — 자매 축 (hub-owned 표준의 최신성·Hub-not-enforcer 절대 불변)
- `.claude/rules/knowledge.md` — 지식 동기화 규칙 (실측 우선 명시)
- `scripts/harness-pull/self-facts.ts` — self-facts 로컬 판독 구현 (3.17.0+)
- `scripts/version-sync.ts` — hub 상향 미러 자동화 (`--apply`)
