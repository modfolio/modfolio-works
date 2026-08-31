---
title: Consent 게이트 — 갭 등록부. ⚠ 법률 자문이 아니다
version: 1.1.0
last_updated: 2026-08-30
source:
  [
    "허브 read-only fleet 실측 2026-08-29~30 (코드 census + 라이브 HTTP)",
    "knowledge-sovereignty.md §103 (법 자신이 기록한 갭)",
    "@modfolio/contracts/events/user-knowledge.ts (계약 원문)",
  ]
sync_to_siblings: true
applicability: always
consumers: [all-repos, plan, preflight, new-app]
related_canon: [knowledge-sovereignty, minor-data-kr, ai-compliance-kr, capability-ledger]
related_rules: [agent-evidence]
---

# Consent 게이트 — 갭 등록부

> ## ⚠ 법률 자문이 아니다 — **측정 셋과 미확인 셋의 기록**이다
>
> 측정된 것: **법이 「게이트」라고 부르는 것이 세 층에서 각각 비어 있다.**
> 미확인: 그 공백이 법적 위험인지, 어느 관할에서, 어느 정도로.
>
> 이 문서는 **판정하지 않는다.** 재본 것을 적고, 못 본 축을 명시한다.

## §1 법이 요구하는 것 (`knowledge-sovereignty`, `tier: law`)

원문 인용:

- *"consent 는 **메타데이터가 아니라 게이트**다"*
- *"❌ **일괄 약관 한 줄**로 모든 2차 이용 동의"*
- *"consent 는 **설정값이 아니라 이력(ledger)** 으로 남긴다 — 누가·언제·무엇을·어떤 목적으로"*
- *"`user_knowledge.collected` 는 해당 consent 스코프를 보유한 경우에만 ingest 된다.
  미보유 = **거부**(경고 로그가 아니라 거부)"*
- *"`consent_changed` 는 **delete-by-(user, scope) 스윕을 트리거**한다.
  철회가 인덱스·임베딩까지 닿지 않으면 그것은 철회가 아니다"*
- 자가진단 문항: *"consent 게이트가 **코드에** 있는가(문서가 아니라)"*

## §2 측정 — 공백이 세 층이다

### 층 1 · 신원 (connect) — 스코프가 없다

계약 `@modfolio/contracts/events/user-knowledge.ts` 는 세 스코프를 정의하고
**스스로 *"it is the gate"* 라고 적는다**:

```
corpus.personal     personal-life signals (goals, reflections, mood…)  Default-OFF
corpus.behavioral   habit/streak/discipline + verified-record metadata
corpus.sensitive    EXIF geo 등
```

**그런데 `modfolio-connect` 실측 (2026-08-30, read-only)**:

```
user_knowledge 언급           0 건
발급 스코프                    openid · profile · email · read · write · admin
corpus.* 스코프                없음
```

⚠ **법이 이 갭을 스스로 적어 뒀다** — `knowledge-sovereignty` §103:
*"Connect 의 `corpus.*` consent scope — 계약(`user_knowledge.*`)은 이미 있으나
**Connect 에 데이터수집 스코프/클레임이 없다**"*.
이 등록부는 그 기록을 **독립 실측으로 확인**한 것이다.

### 층 2 · 소비 (앱) — 개인정보·약관을 노출하지 않는 앱이 9곳

라이브 HTTP 실측 2026-08-29 (랜딩 첫 화면의 `href` 와 본문 텍스트):

| 노출 | 앱 |
|---|---|
| **있음 5** | `gistcore` · `atelier-and-folio` · `pdgd` · `my.modfolio.io`(pay) · `sign.modfolio.io` |
| **없음 9** | `naviaca` · `fortiscribe` · `dledesk` · `keepnbuild` · `worthee` · `amberstella` · `munseo` · `umbracast` · `sincheong` |

그중 **`status: active` 이고 사용자 데이터를 다룰 것으로 보이는 것 6개**:
`naviaca`(예약) · `dledesk` · `worthee` · `munseo`(파일 변환) · `umbracast`(오디오) · `sincheong`

코드 스캔(`consent`·`동의`·`약관`·`privacy` 4축) 결과 **네 축이 전부 0인 repo 10개**:
`amberstella` · `keepnbuild` · `modfolio-dev` · `modfolio-docs` · `modfolio-fonts` ·
`modfolio-on` · `modfolio-works` · `muje` · `munseo` · `naviaca`

### ✅ 2026-08-30 갱신 — 세 층 중 **하나가 닫혔고 하나가 재측정됐다**

오너 결정 *"전부 다 제대로 되도록 정공법으로"* 로 진행한 결과:

| 층 | 전 | 후 |
|---|---|---|
| 1 · 게이트가 **코드에** 있는가 | ❌ 없음 | ✅ `@modfolio/consent-gate` (modfolio · 대조쌍 23 · 커버리지 100%) |
| 1 · 스코프 **발급** | ❌ 없음 | ❌ **그대로** — connect 의 OIDC·DB·UI 작업. 의견만 보냄 |
| 2 · 앱 방침 노출 | 9곳 미노출(14 대상) | ⚠ **재측정: 23곳 미노출(35 대상)** — 아래 |
| 3 · 원장 칸 | 신설(`open`) | ✅ 축을 **갈랐다** — 「발급」(connect, open) · 「수집 게이트」(modfolio, **parts**) |

**게이트가 어디에 사는지는 실측으로 갈랐다.** `event-wiring` 이 `user_knowledge.collected`·
`consent_changed` 의 구독자를 **`modfolio`(Data Hub)** 로 짚었고, 계약이
*"rejected **at ingest**"* 라고 적으므로 게이트는 수집이 일어나는 곳에 산다.
덩어리일 때는 후보가 connect 하나였다 — **갈라 놓으니 한쪽은 답이 나왔다**(atlas 법칙 3→2).

#### ⚠ 층 2의 숫자가 커진 것은 상황이 나빠져서가 아니다 — **측정이 좁았다**

2026-08-29 의 「9곳 미노출」은 **14개 사이트**만 본 값이었다. 2026-08-30 에 검사를
`verify:consent-surface` 로 항구화하면서 대상이 **35곳**(레지스트리 전수)이 됐고,
그러자 **미노출 23 · 노출 8** 이 나왔다.

⚠ 그 항구화 과정에서도 같은 결함을 **한 번 더** 냈다. 초판이 `outbound-links.ts` 의
사이트 목록 함수를 **복사**했고, 복사본에서 `universal`·`infrastructure` 계층
순회가 빠져 **pay·sign·connect 처럼 개인정보를 가장 많이 다루는 앱이 통째로 검사
밖**이었다(23곳 중 4 노출로 «측정됨» 처럼 보였다). 원본을 import 하도록 고치자
35곳·8 노출이 됐다. — *"검사 표면이 의도한 범위를 덮는지 먼저 확인한다"*.

### 층 3 · 원장 — 칸조차 없었다

52 역량 원장에 `consent`·`동의`·`약관` **0 언급**(2026-08-29).
**법으로 못박은 축에 역량 자리가 없었다** — 그래서 부품이 만들어질 자리도 없었다.
2026-08-30 에 「동의(consent)·수집 스코프」를 `open` 으로 신설했다(`capability-ledger.md`).

## §3 확인하지 못한 것 (침묵을 «없음» 으로 읽지 말 것)

- **랜딩만 봤다.** 앱 본체가 SSO 뒤에 있으면 그 안의 동의 화면은 보이지 않는다.
  「랜딩에 링크가 없다」 ≠ 「앱에 동의 절차가 없다」
- **connect 방침이 일부를 커버할 수 있다.** 전 앱이 Connect 로그인을 거치므로 그
  처리방침이 적용될 여지가 있다. **다만 그것은 앱 자신의 방침이 아니다**
- **키워드 스캔은 다른 어휘를 놓친다.** `agreement`·`policy`·`처리방침` 등 변형과
  이미지/PDF 로 제공되는 고지는 안 잡힌다
- **각 앱이 실제로 개인정보를 수집하는지 확정하지 않았다.** 수집이 없으면 고지 의무의
  성격이 달라진다
- **관할·조문을 확보하지 않았다.** 이 문서는 «없다» 를 셌을 뿐 «위법이다» 를 말하지 않는다

## §4 ⚠ 원칙 충돌 — 미해결

| | 말하는 것 |
|---|---|
| `tier: law` | 무엇(what)은 **예외 없음** |
| Hub-not-enforcer | 언제·어떻게(when/how)는 **그 repo 자율**. 허브는 권고만 |

평소엔 이 분리가 작동한다. 그런데 **미노출이 법적 노출**이면 *"언제 할지는 각자"* 가
성립하는가? 허브가 권고하고 6개월 뒤에도 안 됐으면 누구 책임인가.

**제안 (결정 아님)**: 허브가 남의 repo 를 고치는 것이 아니라 — **법의 등급을 바꾼다.**
consent 는 `when` 까지 고정해야 하는 유일한 축일 수 있다. 그것은 canon 개정이지 집행이 아니다.
→ `knowledge/DECISIONS.md` D18

## §5 이 등록부를 닫는 조건

세 층이 각각 다음을 만족하면 이 문서는 **이력**이 된다:

```
층 1a  게이트가 코드에 있다                          ✅ 2026-08-30 (@modfolio/consent-gate)
층 1b  connect 가 corpus.* 를 발급하고 토큰에 싣는다   ❌ 미완
층 2   사용자 데이터를 다루는 앱이 방침을 노출한다      ❌ 미노출 23/35 (verify:consent-surface)
층 3   원장의 「수집 동의 게이트」가 parts 로 간다       ✅ 2026-08-30
```

⚠ **층 1a 가 닫혔다고 층 1 이 닫힌 것이 아니다.** 게이트는 있는데 **먹일 이력이
없다** — 발급이 없으면 게이트는 전부 거부로 답하고, 그건 「보호되고 있다」가 아니라
「그 기능이 아직 안 켜졌다」이다. 둘을 같은 칸으로 세지 않는다.

⚠ **그 전까지 이 문서를 지우지 않는다.** 그리고 «닫혔다» 는 판정은 재측정으로만 한다 —
문서를 고치는 것으로 닫히지 않는다.
