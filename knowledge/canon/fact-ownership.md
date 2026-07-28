---
title: Fact Ownership — 사실의 소유권과 동기화 방향
version: 1.1.0
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

## 늙는 사실 / 안 늙는 사실 — **세는 것은 미러가 적지 않는다** (v1.1.0, 2026-07-27)

§원칙 5 는 "실측 일자를 병기하라" 였다. 그것으로 부족한 부류가 있다. modfolio-design 이
구조로 짚었고(그들 제안 그대로 채택), 허브가 흡수하는 도중에 스스로 증명됐다.

**같은 pull 이 만든 두 표의 운명이 갈렸다.** design 의 CLAUDE.md 에서

- `## 이 repo 실측 (pull 시점 로컬 판독 — hub 미경유)` 의 패키지 버전은 **정확했다**
  (`0.6.0 → 0.9.1` 로 그 자리에서 갱신) — pull 이 **그 순간 재기 때문에** 늙지 않는다.
- hub prose 미러의 `프리미티브 24종` 은 **틀렸다**(실제 27) — 허브가 관측한 시점에
  **얼어붙기 때문에** 반드시 늙는다.

차이는 성실함이 아니라 **구조**다. 그러므로:

> **숫자로 된 member-owned 사실은 prose 미러의 관할이 아니다.**
> prose 미러는 *무엇을 왜 하는 repo 인가*(안 늙는 것)를 맡고,
> *몇 개인가*(늙는 것)는 **pull 시점 로컬 판독 표**가 맡는다.

**⚠ 이 문단을 쓰는 동안 다시 일어났다.** design 이 "27 파일" 이라고 정정 요청한
`engine/*.test.ts` 를 확인하러 갔더니 이미 **28** 이었다(그들 보고 `9c68bbf` → 확인 시점
`922f527`). **정정하려고 잰 숫자가 정정 도중에 늙었다.** 손으로 옮겨 적는 한 이 경주는
못 이긴다 — 그래서 "더 자주 갱신한다" 가 아니라 **"적지 않는다"** 가 답이다.

### 적용 범위 (측정하고 정했다 — 게이트를 만들지 않은 이유)

허브 `knowledge/projects/*.md` **29개 전수**를 훑어 "구성 표 안의 세는 주장"을 셌다:
**해당 1개 파일 · 3행**(전부 design). 나머지 파일의 숫자는 `2026-07-04 수신 (69 commits)`
같은 **dated 관측**이고, 그건 §원칙 4 대로 역사라서 늙는 게 정상이다.

N=1 에 정규식 게이트를 붙이면 오탐이 본체보다 커진다. 대신 **그 3행에서 숫자를 없앴다** —
검출할 인스턴스를 만들지 않는 쪽이 검출기보다 싸고 확실하다. 새 미러에 세는 표를 쓸 일이
생기면 이 절을 근거로 로컬 판독으로 보낸다.

### 멤버가 쓸 수 있는 형태 (design 구현 참고)

design 은 이 표류를 자기 쪽 **게이트**로 만들었다(`engine/mirror-drift.test.ts`).
손 목록이 없다 — 미러 표의 각 행이 **자기가 셀 대상을 스스로 적고 있어서**
(`` `engine/*.test.ts` **18 파일** ``) glob 이면 세고 JSON 경로면 그 키를 센다.
그리고 **미러를 고치라고 요구하지 않는다**(그들 권한 밖) — *정정을 보고했는지*를 요구하고,
ack 가 **지금** 실측과 어긋나면 다시 붉어진다(ack = 면죄부가 아니라 "보고했다"의 증거).
허브가 흡수해 미러가 맞아지면 게이트가 **ack 삭제를 강제**한다 — 장치 자신이 다음번의
stale 목록으로 썩지 않도록. 이 형태는 다른 멤버에게도 그대로 값이 있다.

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
- ❌ **세는 사실을 prose 미러에 적기** — 개수·파일 수·종 수는 pull 시점 로컬 판독 관할이다 (§늙는 사실). 실측 일자를 병기해도 안 된다: 날짜가 붙어도 그 숫자는 매 세션 컨텍스트에 **현행처럼** 실린다
- ❌ 동기화 마커를 "권위"로 읽기 — 마커는 "여기 고쳐도 다음 pull 에서 재생성된다"는 **기계적 안내**일 뿐, hub 기록이 더 옳다는 뜻이 아니다
- ❌ 역사 블록 소급 수정 — dated 기록은 불변, 현행 주장만 정정
- ❌ 미러 불일치를 "그 앱의 선택/정상 분산"으로 기록 — evergreen §v2.3 과 동일하게, 미러 stale 은 상태이지 의도가 아니다

## 관련

- `docs/adr/ADR-014-fact-ownership.md` — 결정 기록 (사건·근거·결과)
- `knowledge/canon/evergreen-principle.md` — 자매 축 (hub-owned 표준의 최신성·Hub-not-enforcer 절대 불변)
- `.claude/rules/knowledge.md` — 지식 동기화 규칙 (실측 우선 명시)
- `scripts/harness-pull/self-facts.ts` — self-facts 로컬 판독 구현 (3.17.0+)
- `scripts/version-sync.ts` — hub 상향 미러 자동화 (`--apply`)
