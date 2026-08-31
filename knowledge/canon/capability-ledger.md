---
tier: reference
version: 1.0.0
status: active
applicability: always
consumers: [new-app, plan, atlas, ops]
sync_to_siblings: true
owner: modfolio-ecosystem
adr: ADR-017
created: 2026-08-22
---

# 역량 원장 — 앱을 조립하려면 무엇이 필요한가

> **파운더 지시 (2026-08-21)**: *"개발 역사상 수많은 앱·웹앱이 **기본 소양으로 갖춰야 하는
> 기능들**을 우리도 자체개발 코드로 구축해놔야 한다. 최소 한 개는 모든 프로젝트가 **그 목적에
> 맞는 고유 기술**을 갖춰야 한다. 지금 쓸 곳이 있는 것만 만드는 게 아니라 **모든 가능성에
> 대비해** 다 준비해두자. 나중에 조립하며 앱을 찍어내기 위해. 그게 **visualize the untold**
> 정신이다."*

이 문서는 그 지시를 **셀 수 있는 형태**로 만든 것이다. `atlas.md`(소유의 법) 와
`assembly-law.md`(형태의 법) 의 **대상 목록**에 해당한다 — 두 법은 *어떻게* 를 정하고,
이 원장은 *무엇을* 정한다.

---

## §1 왜 원장이 필요한가 — 이 문서 자신이 증거다

초안 계획에서 나는 *"역량 32개 · 주인 있음 12 · 주인 없음 20"* 이라고 적었다.
**세 숫자 전부 틀렸다.** 같은 초안의 목록을 프로그램으로 세니 **45행**이었고(내가 «32» 라고
쓴 그 목록이다), 배정 표의 항목까지 합치면 **50**이다. 그리고 주인 표시된 15개 중
**6개는 부품이 0개**였다.

⚠ 그리고 이건 사소한 오차가 아니다. *"주인 있음 12"* 는 **«그만큼은 됐다»** 로 읽힌다.
그 숫자를 근거로 물결 2~3의 규모를 정하면 **실제보다 작게 잡는다.**
⚠ 총계는 **손으로 세지 않는다** — 위 문단의 «45» 도 손으로 세다 처음엔 틀렸고,
프로그램으로 센 뒤에야 맞았다. §3 의 총계는 게이트가 표에서 계산해 대조한다.

`agent-evidence.md` 의 문장 그대로다 — **선언은 실물과 대조되기 전까지 주장이다.**
그래서 이 원장은 산문이 아니라 **게이트가 읽는 표**로 존재한다(`bun run capability:ledger`).

---

## §2 두 개의 다른 질문을 구분한다

| 질문 | 어디서 답하나 | 이 원장에서 |
|---|---|---|
| 이 역량의 **주인이 누구인가** | 그 repo 의 판정 (atlas 법칙 2) | `주인` 칸 |
| 그 주인이 **당길 것을 갖고 있나** | `platform-adapter.json` 의 `provides[]` | `상태` 칸 |

⚠ **둘은 다르다.** 위치를 선언하는 것과 부품을 내놓는 것은 별개의 사건이고,
**전자만 있는 상태가 실제로 6곳이다**(실측 2026-08-22). atlas 는 그것을 `harbor` 로
정당화하지만 — *"나쁜 게 아니라 다음 단계가 부품화라는 뜻"* — **원장은 그것을 센다.**

상태값 셋:

```
parts     주인이 있고 소비자가 **당길 수 있다** (observedProvides 중 status=active ≥ 1)
claimed   주인은 정해졌는데 당길 것이 아직 없다     ← harbor. 빚이 아니라 다음 단계
open      주인 없음                                 ← 물결 2~3 의 대상
```

⚠ **`planned` 부품은 `parts` 가 아니다.** 선언은 있고 코드도 완성일 수 있지만 게시 전이면
소비자가 `bun add` 를 못 한다. 이 구분이 실제로 일했다(2026-08-22): 초판 원장은
`폰트 → modfolio-fonts → parts` 라고 적었는데, 게이트를 status-aware 로 만들자
**fonts 의 부품 4개가 전부 `planned`** 인 것이 드러났다. 레지스트리 실측이 확정했다 —
`@modfolio/fonts` **404** · 양성 대조 `@modfolio/contracts` **200 · 21버전**.
**손으로 쓴 원장이 준비도를 과장했고 게이트가 잡았다.**

⚠ 게이트는 **양방향**으로 본다 — 다만 **granularity 가 다르다**:

```
정방향  역량 단위   status=parts 인데 그 repo 의 부품이 0개면 실패
역방향  repo 단위   부품을 낸 repo 인데 자기 행이 전부 claimed 면 실패 (원장이 낡았다)
```

⚠ **역방향을 역량 단위로 쓰면 건전하지 않다.** 초판이 그랬고 정상 입력에서 **14건**이 떴다 —
`modfolio-connect` 의 부품 3개는 「인증·SSO」의 것이지 「RBAC」의 것이 아닌데, 게이트는
그 둘을 구분할 데이터가 **없다**(§6). 대조쌍이 아니었으면 원장 쪽을 «틀렸다» 고 고쳤을 자리다.
한 방향만 보면 **부품이 생겨도 원장이 조용히 낡으므로**, 역방향은 데이터가 감당하는
granularity 로 **내려서** 유지한다.

---

## §3 원장

<!-- ledger:begin -->
| 역량 | 주인 | 상태 |
|---|---|---|
| 인증·SSO | modfolio-connect | parts |
| 권한·정책(RBAC) | modfolio-connect | parts |
| 멀티테넌시·조직 | modfolio-connect | parts |
| 시크릿·자격증명 | athsra | parts |
| 레이트리밋·남용방지 | athsra | parts |
| 감사로그 | athsra | parts |
| 결제·구독 | modfolio-pay | parts |
| 인보이스·정산 | modfolio-pay | parts |
| 세금·규제 표시 | modfolio-pay | parts |
| 전자서명·계약 | modfolio-sign | parts |
| 문서 생성·조판 | modfolio-sign | parts |
| 이메일·알림 | modfolio-notify | parts |
| 채팅·메시징 | modfolio-notify | parts |
| 실시간·프레즌스 | amberstella | parts |
| 댓글·반응·소셜 | | open |
| 문서 변환 | munseo | parts |
| 가져오기·ETL | munseo | parts |
| HWP·스프레드시트 | pdgd | claimed |
| 내보내기(PDF/CSV/XLSX) | pdgd | claimed |
| 네이티브 앱 자동화(RPA) | muje | parts |
| 폰트 | modfolio-fonts | parts |
| i18n·현지화 | modfolio-fonts | parts |
| OCR·문서이해(VLM) | | open |
| 퍼블리싱·CMS | modfolio-press | parts |
| 이미지 최적화 | modfolio-infra | parts |
| 호스팅·인프라 | modfolio-infra | parts |
| 이미지·영상 생성 | modfolio-infra | parts |
| 관측·트레이싱 | modfolio-infra | parts |
| 오디오 변환·편집 | umbracast | parts |
| 음성 평가·합성 | gistcore | parts |
| 실시간 음성 대화 | gistcore | claimed |
| AI 추론 전략 | visualize | parts |
| 임베딩·검색·RAG | visualize | parts |
| 구조화 추출 | visualize | parts |
| 추천·개인화 | modfolio | parts |
| 예측·시계열 | worthee | parts |
| 디자인 토큰 | modfolio-design | parts |
| 폼·검증 | modfolio-design | parts |
| 데이터 시각화 | modfolio-design | parts |
| 계약·레지스트리 | modfolio-ecosystem | parts |
| 피처플래그·설정 | modfolio-ecosystem | parts |
| 워크플로·상태기계 | sincheong | parts |
| 작업·큐·스케줄 | | open |
| 실험·A/B | modfolio-admin | parts |
| 지도·위치 | keepnbuild | parts |
| 예약·캘린더 | naviaca | parts |
| 배치·레벨 판정 | dle-desk | parts |
| 데이터→서술형 리포트 | dle-desk | claimed |
| 구조화 피드백·평가 | fortiscribe | parts |
| 마감·일정 알림 | atelier-and-folio | parts |
| 학습 기록·포트폴리오 | atelier-and-folio | claimed |
| 검색(전문) | modfolio-docs | parts |
| 온보딩·첫 실행 | modfolio-ecosystem | parts |
| 파일 업로드·저장 | | open |
| 빈 상태·에러 표면 | | open |
| 제품 분석(퍼널·리텐션) | | open |
| 고객 지원·문의 | modfolio-ecosystem | parts |
| 동의 스코프 발급 | | open |
| 수집 동의 게이트 | modfolio | parts |
| 약관·법적 고지 | modfolio-ecosystem | parts |
| 환불·취소 | | open |
| 구독 관리 | | open |
| 알림 설정·선호 | | open |
<!-- ledger:end -->

<!-- totals:begin -->
역량 63 · parts 48 · claimed 5 · open 10 · 주인 repo 27
<!-- totals:end -->

## 제품 표면 축 10 — 2026-08-30 신설 (전부 `open`)

2026-08-29 실측: **앱을 만들 때 반드시 필요한 14개 키워드가 이 원장에 0 언급**이었다
(온보딩·업로드·빈 상태·퍼널·리텐션·지원·문의·동의·약관·환불·취소·구독관리·알림설정·제품분석).
중복을 합치면 **10축**이다.

> ### 원장이 «우리가 무엇을 할 수 있나» 로 짜였고 «앱이 무엇을 필요로 하나» 로 짜이지 않았다.
> 기존 52축은 기술 분류학(문서변환·OCR·RAG·폰트·RPA)이고, 앱의 필요는 제품 표면에서 온다.

⚠ **`consent` 는 `tier: law` 인데 이 원장에 칸조차 없었다**(`knowledge-sovereignty`:
*"consent 는 게이트다"*). 법이 있고, 부품이 없고, 자리도 없었다.
계약(`@modfolio/contracts/events/user-knowledge.ts`)에는 `corpus.personal`·`corpus.behavioral`·
`corpus.sensitive` 가 정의돼 있고 *"it is the gate"* 라고 적혀 있는데,
**connect 는 `user_knowledge` 언급 0건**이고 발급 스코프에 `corpus.*` 가 없다(2026-08-30 실측).

### 주인 — 전부 비어 있다. 그리고 그것이 정확하다

**아무 repo 도 아직 주장하지 않았다.** 허브가 `claimed` 로 적으면 그 repo 를 대신해
주장하는 것이고 fact-ownership 위반이다(ADR-014). 아래는 **허브 관측이지 배정이 아니다** —
각 repo 가 스스로 판정하고 `platform-adapter.json` 에 선언할 때 원장이 따라간다.

| 축 | 허브가 보는 후보 | atlas 법칙 2 대입 |
|---|---|---|
| ~~파일 업로드·저장~~ | ~~`modfolio-infra`~~ → **후보 철회** | ⚠ 2026-08-30 `plan:build` 실측: **이미 `@modfolio/document-convert`(munseo)가 업로드 판정을 한다.** 원장은 「R2 를 가진 repo」로 후보를 봤는데 atlas 법칙 2 는 **소비**를 본다 — 실제 소비는 munseo 다. 후보를 지운다 |
| 빈 상태·에러 표면 | `modfolio-design` | 디자인 시스템이 그 repo 의 제품 |
| 제품 분석(퍼널·리텐션) | `modfolio` | Data Hub 가 그 repo 의 제품 |
| 동의 **스코프 발급** | `modfolio-connect` | 신원이 그 repo 의 제품 · 스코프 발급은 신원의 일부 |
| **수집 동의 게이트** | `modfolio` ✅ | ⚠ 2026-08-30 에 **갈랐다**. 덩어리일 때는 후보가 connect 하나였는데, `event-wiring` 실측이 ingest 소비자를 **`modfolio`(Data Hub)** 로 짚었다 — 계약이 *"rejected **at ingest**"* 라고 적으므로 게이트는 수집이 일어나는 곳에 산다. 갈라 놓으니 **한쪽은 답이 나오고 진짜 미정은 하나**다(법칙 3 → 2 순서) |
| 환불·취소 · 구독 관리 | `modfolio-pay` | 결제가 그 repo 의 제품 |
| 알림 설정·선호 | `modfolio-notify` | 알림이 그 repo 의 제품 |
| **온보딩 · 고객 지원·문의 · 약관·법적 고지** | `modfolio-ecosystem` | **§2-bis** — 어느 제품도 아니라 관제탑이 **마지막 수단으로** 소유 (2026-08-30 채택) |

> ### ⚠ 후보를 정할 때 「가진 것」이 아니라 「쓰는 것」을 본다
> 2026-08-30 에 「파일 업로드·저장」 후보를 `modfolio-infra` 로 적었다 — R2 와 호스팅을
> 가졌으니까. 그런데 `plan:build` 로 물어보니 **`@modfolio/document-convert`(munseo)가
> 이미 업로드 판정을 하고 있었다.** atlas 법칙 2 는 *"소유 = **최대 소비** AND 그것이 그
> repo 의 제품"* 이다 — 「인프라를 가졌다」는 소비가 아니다.
> **부품을 짓기 전에 `plan:build` 로 묻는 것이 이 오류를 잡았다.**

> ### ✅ Atlas §2-bis — 2026-08-30 채택 (D23)
> 법칙 2 는 *"소유 = 최대 소비 AND 그것이 그 repo 의 «제품»"* 인데 **온보딩·고객지원·
> 약관은 어느 repo 의 제품도 아니었다.** 두 항을 다 요구하면 답이 «없음» 이 되고,
> 그러면 아무도 안 만들거나 **모두가 각자 만든다.**
>
> §2-bis 는 새 규칙이 아니라 **하고 있던 것의 이름**이다 — 게이트를 배선하자
> `feature-flags`·`quota-verdict` 가 **이미 그 상태로** 허브에 있는 것이 잡혔다.
> 조건 셋(순수 판단 · 도메인 지식 0 · 제품 repo 를 고를 수 없음)을 전부 만족해야 하고,
> **기각한 후보를 `crossCutting.consideredRepos` 에 적어야** 선언이 받아들여진다 —
> 그 판정을 허브가 자기에 대해 내리기 때문이다.
>
> 상한 6종에서 `atlas:gate` 가 조건 3의 전수 재판정을 요구한다. 현재 **5종**.

⚠ 이 총계는 게이트가 표와 대조한다. 손으로 맞추지 않는다 — `release:gate` 가 자기 총계를
대조하지 않아 **174 로 stale 했던** 전례가 이 저장소에 있다(2026-08-08).

---

## §3.5 부품 하나를 끝내는 순서 — **여섯 단계, 하나라도 빠지면 안 보인다**

2026-08-22 에 두 부품(`audio-assembly` · `rubric-reliability`)을 끝까지 밀며 굳힌 순서다.

```
① 구축   원 사건에서 지표·계약을 추출한다 (지어내지 않는다)
② 대조쌍 결함 주입 → 실패 · 복구 → 통과. 원 사건을 그대로 먹인다
③ 게시   레지스트리에 올린다 (⚠ 전파 지연 ≠ 실패. 재게시는 타르볼을 깨뜨린다)
④ 확인   **저장소 밖**에서 콜드 설치 → import → 실동작
⑤ 선언   `platform-adapter.json` 의 `provides` 에 `status: "active"` 로
⑥ 패널   랩에 붙이고, 부품을 끄면 빨개지는지 본다
```

⚠ **⑤를 실제로 빠뜨렸다.** `rubric-reliability` 를 만들고 게시하고 패널까지 붙였는데
선언을 안 했다. 증상은 조용했다 — 코드도 게시본도 패널도 전부 정상이고, `atlas:collect`
가 **«델타 없음»** 을 냈을 뿐이다. 그것을 「미러가 이상하다」로 읽었으면 못 찾았을 것이다.

**선언이 없으면 게시했다는 사실을 아무도 모른다** — atlas 가 조인하지 못하고 원장은
`claimed` 로 남는다. 「인바운드 0 = 문이 없다」의 선언 판(版)이고, 이 게이트가 잡는
유일한 이유가 그것이다.

⚠ **③↔⑤의 순서는 바꿀 수 없다.** 게시 전에 `active` 로 선언하면 원장이 **당길 수 없는
것을 당길 수 있다고** 말한다. 게시 전에는 `planned` 다.

---

## §4 배정의 근거 — 「억지 배정 아님」의 판별식

파운더가 명시한 조건: *"억지 배정이 아니라"*. 판별 질문 하나:

> ***"그 repo 를 아는 사람에게 이 역량을 말했을 때 «당연하네» 가 나오는가?"***

- ✅ **naviaca → 예약·캘린더** — 수업·강사·학생 일정이 본업이다
- ✅ **fonts → i18n** — 글자를 아는 곳이 언어도 안다
- ❌ **fonts → 결제** — 왜 거기냐는 질문에 답이 없다

⚠ **도메인이 겹치는 두 repo 는 「정체성」으로 못 가른다 — 「고유 동사」로 가른다**
(2026-08-22 실측):

```
dle-desk   어학원 관리 — CRM · 배치고사 · 청구서 · AI 리포트
naviaca    학원/학교 통합 관리 — CRM + LMS + SIS
```

둘 다 「학원 관리」다(dle-desk 는 국제학교 전용). **그리고 이미 같은 것을 짓고 있었다** —
경고가 아니라 실측이다(2026-08-22):

```
2026-02-11  dle-desk  "Placement Engine 구현 + 47개 테스트 스위트"   ← 원본
2026-02-21  naviaca   "Phase 2-A … 플레이스먼트 엔진"                ← 10일 뒤 사본
```

같은 밴드(ELL1·ELL2·ELA7·ELA8·Geometry), 같은 export, 13줄 차이. 그리고 각자 고친 것이
상대에게 **도달하지 않았다** — naviaca 만 빈-규칙 가드를, dle-desk 만 interview 를 가졌다.

⚠ **이것이 「고유 동사」로 가르는 방법의 한계다.** 나는 배정을 정할 때 *"dle-desk 는
데이터를 문장으로 만든다"* 로 갈랐는데, **AI 리포트만 보고 정한 것**이었다. git 이력을
재고 나서야 진짜 축이 나왔다: **dle-desk 는 배치 엔진의 기원**이다.

→ **정정**: 「배치·레벨 판정」의 주인은 dle-desk(기원), naviaca 는 소비자.
`@modfolio/placement@0.1.0` 으로 합쳐 게시했고 양쪽이 당긴다.

**교훈**: 도메인이 겹치는 두 repo 는 「무엇을 하는가」로 가르기 전에 **누가 먼저 만들었는가**
를 본다. git 이력이 소유권 논쟁을 대개 끝낸다.

---

## §5 배정하지 않는 것도 결정이다

**그룹 포털 5곳**(`modfolio-studio` · `modfolio-axiom` · `modfolio-works` · `modfolio-ls` ·
`modfolio-on`)은 **`consumer` 로 남는다.** 이건 배정 실패가 아니다 —
atlas 가 *"consumer 는 정식 역할이지 강등이 아니다"* 라고 적은 자리이고,
파운더의 「카테고리」 구상과도 맞는다. **포털은 카테고리 자체이지 기술 카테고리가 아니다.**

`modfolio-dev` 도 원장에 역량이 없다. 그쪽 역할은 **랩** — 모든 부품의 첫 소비자다
(부품을 만들면 같은 PR 에 랩 패널을 붙인다. 패널 없는 부품은 미완성).

---

## §6 이 게이트가 **못 보는 것** (미검사 축 — 명시)

초록불을 「전부 확인됨」으로 읽지 않기 위해 적는다.

- ❌ **«그 부품이 그 역량의 부품인가»** — `provides[]` 는 repo 단위이고 역량 단위가 아니다.
  `modfolio-pay` 가 `billing`·`payments` 를 갖는다는 것은 세지만, 그중 무엇이
  「인보이스·정산」인지는 **원리적으로 안 보인다**
- ❌ **부품의 품질·도달성** — 그건 `atlas:gate`(3표면 존재) 와 랩 패널(실제로 당겨지는가) 의 몫
- ❌ **배정이 옳은가** — §4 의 판별식은 사람의 판단이다. 게이트는 **이름의 실재성**만 본다

즉 이 게이트가 잠그는 명제는 **딱 하나**다:
*"원장이 말하는 주인과 부품 유무가 fleet 실물과 일치한다."*

---

## §7 관련

- `atlas.md` (ADR-017) — 소유의 법. 5위치 · 7법칙 · 「승격 ≠ 정정」
- `assembly-law.md` — 형태의 법. 3표면(contracts · MCP · endpoint) · 복사 금지
- `fact-ownership.md` (ADR-014) — 멤버 사실은 그 repo 가 SoT. 이 원장은 **미러**다
- `evergreen-principle.md` — Hub-not-enforcer. 이 원장의 배정은 **제안**이고 수락은 그 repo
