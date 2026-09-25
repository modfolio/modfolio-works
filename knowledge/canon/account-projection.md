---
title: Account Projection — 계정의 주인은 하나, 쓰는 방식은 하나가 아니다
version: 1.0.0
last_updated: 2026-09-19
tier: law
applicability: always
sync_to_siblings: true
consumers: [all-agents, adopt-laws, contracts, schema, api, new-app, sso-integrate]
related_canon: [atlas, assembly-law, knowledge-sovereignty, modfolio-db, event-consumption, fact-ownership, universe-login-surface]
related_rules: [agent-evidence, fundamentals-first, import-boundaries]
source:
  [
    2026-09-19 오너 결정 «다섯 번째 법» — 질문(원문 비공개 — _quotes.md#CN-07): 계정 정보가 connect 에 있다면 그 DB 원장은 connect 가 갖고 모든 house of brands 가 같은 것을 써야 하지 않는가,
    2026-09-18 허브 신원 스윕(33 repo · 읽기 전용 · 핵심 4건 메인 재확인),
    OpenID Connect Core 1.0 §5.7,
    ADR-025,
    ADR-023,
  ]
related_adr: [ADR-014, ADR-023, ADR-025]
---

# Account Projection — 계정의 주인은 하나, 쓰는 방식은 하나가 아니다

> **법칙.** 계정의 기록 원장(System of Record)은 **connect 하나**다. 브랜드는 계정을 **참조**하거나 **투영**할 수 있지만, 그 투영에는
> **갱신과 삭제가 닿아야** 하고, 계정을 가리키는 열쇠는 **connect 가 발급한 `sub`** 다 — email 이 아니다.
> 그리고 이 법은 **소비 방식을 하나로 강제하지 않는다.**

## 이 문서가 `tier: law` 인 이유

`tier` 의 계약은 다른 법과 같다 — **무엇(what)은 예외 없음, 언제·어떻게(when/how)는 그 repo 자율.**

이 축이 법인 이유는 **되돌릴 수 없기** 때문이다. 다른 부품은 늦게 옮겨도 잃는 것이 시간뿐이다. 계정은 다르다:

- connect 에서 지운 계정의 복사본이 앱에 남으면, 그것은 **지워 달라는 요청이 닿지 않은 개인정보**다. 나중에 고쳐도 그동안은 소급되지 않는다
- email 로 이어 붙인 계정은 email 이 바뀌는 순간 **남의 행에 붙거나 아무 행에도 안 붙는다.** 앞쪽은 계정 탈취의 면이고 뒤쪽은 데이터 고아다
- 그리고 이 둘은 **아무것도 실패시키지 않는다** — 타입·린트·테스트·빌드·e2e 가 전부 초록인 채로 일어난다(`agent-evidence.md` §E «쓰기는 있는데 읽기가 없다»)

hub 는 법칙을 진술하고 진단 도구를 배포한다. 일정을 잡지 않고, PR 을 열지 않고, sibling 파일에 쓰지 않는다(`evergreen-principle.md`).

## §1 — 네 불변식

각 불변식은 네 조각으로 끝난다: **문장 · 우리 실측 · 선례 · 위반 형태.**

### 1. 열쇠는 `sub` 다

> **계정을 가리키는 열쇠는 connect 가 발급한 `sub`(OIDC 의 `(iss, sub)`) 하나다. email·이름·전화번호로 계정을 잇지 않는다.**

- **우리 실측 (허브 관측 2026-09-18 · SoT 는 각 repo)** — 로그인한 사용자를 로컬 행에 붙일 때 email 을 쓰는 곳이 있다:
  `pdgd` `apps/web/src/lib/server/auth.ts:87`(`eq(schema.user.email, email)`) · `naviaca` `apps/app/server/lib/connect.ts:48`(`eq(staff.email, user.email)`).
- **선례** — OpenID Connect Core 1.0 §5.7: *"the only guaranteed unique identifier for a given End-User is the combination of the iss Claim and
  the sub Claim … other Claims such as email, phone_number, preferred_username, and name **MUST NOT** be used as unique identifiers for the End-User."*
  발급자는 email 을 다른 사용자에게 재사용할 수 있고, 한 사용자의 email 은 바뀔 수 있다.
- **위반 형태** — 인증 경로에서 `WHERE email = ?` 로 로컬 계정을 찾는다. ⚠ email 을 **초대의 증표로 한 번** 쓰는 것은 위반이 아니다
  (첫 로그인 때 맞춰 보고, 그 뒤로는 `sub` 로 잇는다) — 위반은 email 이 **계속되는 조인 키**인 것이다.

### 2. 계정 속성을 쓰는 곳은 connect 뿐이다

> **email·이름·아바타·자격증명 같은 계정 속성의 쓰기 경로는 connect 에만 있다. 브랜드는 그것을 고치지 않고, connect 의 DB 에 닿지 않는다.**

- **우리 실측** — `atlas` 법칙 2(소유는 소비에서)의 계정 축 판이다. mfdb 는 이미 DB-per-service 다(`modfolio-db.md`: `CREATE DATABASE <repo>
  OWNER app_<repo>` + `REVOKE CONNECT … FROM PUBLIC` · *"PostgreSQL 은 DB 를 건너뛰는 질의를 못 한다"*) — 같은 인스턴스를 써도 남의 원장에 닿는 길은
  구조적으로 없다. 이 불변식은 그 구조를 **만들지 않겠다는 약속**으로 다시 말한다: cross-DB 우회(dblink · FDW · 공유 role)를 계정 축에 열지 않는다.
- **선례** — Helland, *Data on the Outside versus Data on the Inside*(CIDR 2005): 공유 컬렉션에는 *"one special service that actually owns the
  authoritative perspective"* 가 있고 나머지는 그것이 게시한 판을 읽는다. Richardson(Database per Service): 경계는 서버 수가 아니라 **GRANT** 다.
- **위반 형태** — 브랜드가 자기 화면에서 사용자의 email 을 «수정» 하고 자기 표에만 저장한다 · 브랜드가 자체 비밀번호/자격증명 저장을 새로 만든다 ·
  앱의 DB role 이 connect 의 DB 에 CONNECT 권한을 갖는다.
  ⚠ **별도의 신뢰 도메인은 위반이 아니다** — `athsra`(시크릿 관리자)의 master-password 신원, `modfolio-sign` 의 외부 서명자 접근 코드는
  «브랜드의 계정» 이 아니라 그 제품의 도메인 객체다. 판별: *그 신원이 connect 계정을 대신하는가, 아니면 다른 것을 가리키는가.*

### 3. 투영에는 갱신과 삭제가 닿는다

> **계정 속성을 로컬에 복사해 두는 것(투영)은 허용된다 — 단, connect 의 `user.updated` 와 `user.deleted` 가 그 복사본에 닿을 때만.
> 닿지 않는 복사본은 투영이 아니라 방치된 사본이다.**

- **우리 실측** — email·이름·아바타를 로컬 표에 복사하는 repo 가 다수인데(허브 관측 2026-09-19 · `validate-law-compliance` fleet 실주행:
  modfolio · modfolio-press · gistcore · sincheong · umbracast · worthee · atelier-and-folio · pdgd 가 §3 경고), 갱신은 **다음 로그인 때만** 일어난다.
  **양성 사례가 하나 있다** — `modfolio-pay` 는 2026-09-16 에 수신 경로를 지었다(`apps/app/src/routes/api/webhooks/ecosystem/+server.ts` ·
  `a0bcac41`): `user.updated` 적용 · `user.deleted` 는 *"identity cleared, ledger retained"*(아래의 익명화 tombstone 그대로).
  ⚠ 이 절의 첫 판은 pay 를 «무동기» 로 적었다 — 조사 에이전트가 connect 전용 경로만 찾아 `/api/webhooks/ecosystem` 을 놓쳤고, 그 주장을
  재확인 없이 옮겼다. 검사기의 첫 실주행이 반증했다. `contracts/events/wiring.ts` 의 *"소비 코드 0"*(2026-08-17)도 같은 이유로 낡았다.
  발신 쪽은 지금도 어긋나 있다:
  connect 가 실제로 쏘는 `user.updated` 의 payload 는 `{fields, ip}`(`modfolio-connect/apps/auth/src/routes/api/me/profile/+server.ts:135`)이고
  계약(`contracts/events/identity.ts`)은 `{changed, name?, email?, avatar?}` 를 요구한다 — 계약대로 검증하는 소비자는 **실제 이벤트를 전부 거부**한다.
  실제로 그렇다: pay 의 수신기는 `UserUpdatedEvent.safeParse` 로 검증하고 실패하면 `400 invalid_payload` 를 낸다(`+server.ts:108`).
  즉 **유일한 소비자가 유일한 생산자의 실제 이벤트를 받을 수 없는 상태**다 — 양쪽 다 자기 테스트는 초록이다(이음매의 결함은 어느 한쪽 게이트에도 안 보인다).
- **선례** — Fowler, *Event-Carried State Transfer*: 사본은 가용성을 사지만(원장이 죽어도 읽힌다) 그 값은 **이벤트가 도착한다는 전제** 위에 선다.
  Helland, *Immutability Changes Everything*: 안전하게 널리 복사할 수 있는 것은 **불변**인 것이다 — 서명된 토큰은 그렇고, 바뀌는 `accounts` 행은 아니다.
- **위반 형태** — 계정 속성을 저장하는 표가 있는데 `user.updated`·`user.deleted` 수신 경로가 없다. 수신기는 있는데 핸들러가 비어 있다
  (`console.info` 뿐인 SSF 수신기는 수신기가 아니다). 삭제가 hard delete 라서 **법적으로 보존해야 하는 기록**(결제 원장 등)까지 cascade 로 지운다 —
  삭제의 기본형은 **익명화 tombstone** 이다(계정 속성은 지우고, 보존 의무가 있는 거래 기록은 계정 없이 읽히게 남긴다).
- **필요조건(구현 규칙)**: 수신은 **멱등**(event_id 기준) · 순서를 약속받지 않는다(`occurred_at` 의 last-write-wins) · 늦게 온 옛 이벤트가 tombstone 을
  되살리지 않는다 · 처음 붙는 소비자는 재전송이 아니라 **스냅숏**으로 맞춘다.

### 4. 같은 땅을 써도 원장은 섞지 않는다

> **mfdb 를 모든 앱이 쓰는 것과 계정 원장이 하나인 것은 다른 문장이다. DB·role 은 앱마다 따로이고, 계정 축에서 앱 사이를 잇는 것은
> `sub` 값과 이벤트뿐이다 — 외래 키가 아니다.**

- **우리 실측** — 오너 결정 2026-09-16(mfdb 가 모든 앱의 메인·프로덕션 DB · 원문 비공개 — _quotes.md#CN-25) + ADR-023 «DB-per-service 는 성장을 위한 선택이다». 둘은 충돌하지 않는다:
  공유되는 것은 **플랫폼**(substrate)이고 **표**가 아니다.
- **선례** — Self-Contained Systems: *"a shared database with separate schemas or data models per SCS can be a valid alternative"* —
  단 *"the sovereignty of data by its owning system"* 이 지켜질 때.
- **위반 형태** — 앱의 표가 다른 앱(또는 connect)의 표를 `REFERENCES` 한다 · 여러 앱이 하나의 DB role 을 공유한다 · «어차피 같은 Postgres 니까»
  로 시작하는 조인.

## §2 — 이 법이 **강제하지 않는 것**

**소비 방식은 셋 다 적법하다.** 하나로 통일하라는 법이 아니다.

| 방식 | 무엇 | 언제 맞나 |
|---|---|---|
| **참조만** | `sub` 만 들고, 속성은 요청 때 토큰 클레임에서 읽는다 | 계정이 그 제품의 핵심이 아닐 때 — 대부분의 브랜드. 동기화할 것이 없으므로 불변식 3 이 저절로 성립한다 |
| **투영** | 속성을 로컬에 복사하고 이벤트로 맞춘다 | 세션 없는 경로에서 속성이 필요할 때(영수증 메일 · 배치 · 검색) |
| **번역층(ACL)** | connect 의 모델을 자기 도메인 모델로 옮겨 받는다 | 계정·멤버십이 그 제품의 **핵심 도메인**일 때 |

근거: Evans 의 Open Host Service 원문이 하류의 혼합을 전제한다 — *"Each client is downstream, and typically some of them will be conformist
and some will build anticorruption layers."* 모든 브랜드에 한 가지 방식을 강제하면 그것은 Open Host 가 아니라 **Shared Kernel** 이고,
connect 를 고칠 때마다 전 브랜드가 함께 움직여야 한다. 이 universe 가 House of Brands 인 이유와 반대 방향이다.

또한 강제하지 않는 것: connect SDK 의 **버전 시점**(그 축은 `census:fleet` 의 sdk 열이 재고 connect 가 집행한다) · 투영 표의 모양 · 수신 경로의 프레임워크.

## §3 — 자가 진단

```bash
/adopt-laws     # 자기 repo 의 갭 리포트 (hub 가 판정하지 않는다)
```

각 repo 가 스스로 물을 것:

1. 인증 경로에 `email` 로 계정을 찾는 질의가 있는가 → 불변식 1
2. 계정 속성(email·name·avatar)을 저장하는 표가 있는가 → 있다면 `user.updated` **와** `user.deleted` 의 수신 경로와 **비어 있지 않은** 핸들러가 있는가 → 불변식 3
3. 계정 삭제가 닿았을 때 무엇이 지워지고 무엇이 남아야 하는가를 **적어 두었는가**(보존 의무가 있는 기록) → 불변식 3
4. 자기 DB role 이 자기 DB 밖에 권한을 갖는가 → 불변식 2·4

허브의 계측은 `census:fleet` 의 `identity` 열이다 — `ref-only` · `proj-synced` · `proj-unsynced` · `email-join` · `no-sdk` · **`?`**.
⚠ **`?` 는 깨끗하다는 뜻이 아니다** — 매처가 판정하지 못했다는 뜻이고 그렇게 출력한다. 그리고 이 열은 **보고**이지 게이트가 아니다.

## §4 — 실측 근거와 재확인 방법

이 법의 «우리 실측» 은 **2026-09-18 허브의 읽기 전용 스윕**이다. 멤버에 대한 사실의 SoT 는 그 repo 이고(`fact-ownership.md`), 아래로 다시 잰다:

```bash
# 불변식 3 — 삭제·갱신 소비자가 있는가 (허브)
rg -n "user\.deleted|user\.updated|createSSFReceiver" ~/code/<repo>/apps ~/code/<repo>/src
# 불변식 1 — email 조인 (그 repo 에서)
rg -n "eq\([^)]*\.email" apps/*/src apps/*/server
# 계약과 발신의 일치 (허브 ↔ connect)
sed -n 140,156p contracts/events/identity.ts
rg -n "user.updated" -A8 ~/code/modfolio-connect/apps/auth/src/routes/api/me/profile/+server.ts
```

낡은 실측은 조용히 틀리지 않는다 — 그것을 근거로 판단할 때 틀린다. 이 절의 repo 이름들은 **법의 일부가 아니라 법을 쓰게 한 관측**이다.
상태가 바뀌면 관측을 고치고 법칙은 그대로 둔다.

## 관련

- `atlas.md` 법칙 2 — 소유는 소비에서(이 법은 그 계정 축 판) · `assembly-law.md` — 재사용의 3표면(이 법의 이벤트·SDK 가 그 위를 지난다)
- `knowledge-sovereignty.md` §3 — 철회가 인덱스까지 닿아야 한다(같은 구조: 지우라는 요청은 **사본까지** 닿아야 한다)
- `modfolio-db.md` · ADR-023 — DB-per-service · `universe-login-surface.md` — 모든 로그인은 connect 를 가시적으로 경유한다
- `contracts/events/identity.ts` · `contracts/events/wiring.ts` — 계약과 배선 기록 · ADR-025 — 이 이음매를 고치는 캠페인의 세션 방식
