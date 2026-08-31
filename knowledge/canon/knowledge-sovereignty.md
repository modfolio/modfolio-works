---
title: Knowledge Sovereignty — 지식은 사용자 소유, consent 는 게이트다
version: 1.1.0
last_updated: 2026-08-30
source: [2026-07-26 오너 세션 "통합된 지식, 커스터마이징된 개인의 말뭉치, 영역에 따른 지식을 쌓아나가는 기반", Modfolio_Universe_Architecture_Reference_v1.1 §5.2·§9 (의도 SoT), visualize-architecture.md P0 5원칙, contracts/events/user-knowledge.ts, 실측 2026-07-26 (RAG 인덱스 허브 단독·sibling knowledge 미색인·Connect 에 corpus consent scope 부재)]
sync_to_siblings: true
tier: law
applicability: always
consumers: [all-agents, knowledge-rag-query, debrief, playbooks, contracts, api, schema, security-scan]
related_canon: [assembly-law, knowledge-flywheel, visualize-architecture, reasoning-playbooks, observability, fact-ownership]
related_rules: [lethal-trifecta, secrets-policy]
---

# Knowledge Sovereignty — 지식은 사용자 소유

> **법칙.** 사용자의 데이터는 앱이 쓰라고 맡긴 것이지 우리가 가진 것이 아니다. **consent 는 메타데이터가 아니라 게이트다** — 스코프 없이 들어온 것은 저장하지 않고 **거부**한다. 그리고 **자동 승격은 없다.**

## 이 문서가 `tier: law` 인 이유

지식 자산은 universe 의 장기 목표지만, **신뢰 경계를 한 번 넘으면 되돌릴 수 없다.** 삭제 요청이 임베딩·그래프·집계·배포된 데이터셋까지 닿지 못하는 상태가 되면 그때는 사과로 해결되지 않는다. 그래서 이 축은 속도보다 우선한다(참조문서 §0.4 판단 우선순위 1).

`tier` 계약은 동일하다 — **무엇(what)은 예외 없음, 언제·어떻게(when/how)는 repo 자율.**

### ⚠ 단 하나의 예외 — consent 축은 **when 도 고정된다** (오너 결정 2026-08-30)

> *"consent 만 예외로 기한 고정"*

**왜 이 축만인가.** 다른 법칙은 늦게 지켜도 늦게 좋아진다 — 부품을 나중에 옮겨도
그 사이에 잃는 것은 시간뿐이다. **consent 는 반대다.** 스코프 없이 들어온 데이터는
「나중에 동의를 받아」 소급 정당화되지 않는다. 늦은 만큼 **되돌릴 수 없는 것이
쌓이고**, 그 상태에서 정보주체가 열람을 요구하면 사과로 해결되지 않는다.

즉 여기서 `when` 을 repo 자율로 두면 **what 도 지켜지지 않는다** — 「언젠가 붙인다」는
「안 붙인다」와 관측상 구분되지 않기 때문이다.

**고정되는 선은 날짜가 아니라 사건이다:**

> **수집을 시작하기 전에 그 화면에 동의·방침이 서 있어야 한다.**

날짜가 아닌 이유: 달력은 **조용히 지나간다.** 아무것도 실패하지 않고 아무도 못
알아챈다. 「수집 전」은 지나갈 수가 없다 — 수집이 시작되는 순간이 그 선이고,
그 순간은 배포·코드·로그에 남는다.

⚠ **이미 받고 있는 곳에는 이 선이 이미 지나갔다.** 그쪽은 별도의 기한이 필요하고,
그것은 오너가 정한다(`knowledge/DECISIONS.md` D18).

⚠ 이 예외는 **consent 축에만** 적용된다. 다른 법칙의 `when` 을 고정하는 근거로
인용하지 않는다 — 이 문단이 드는 이유(소급 정당화 불가)가 그쪽에는 없다.

## 1. 데이터 5분류 — 섞지 않는다

| 분류 | 예 | 핵심 정책 |
|---|---|---|
| **Operational** | 계정, 거래, 로그 | 서비스 운영용. **자동으로 학습·코퍼스 데이터가 되지 않는다** |
| **Personal Knowledge** | 메모, 선호, 학습 기록 | 사용자 소유. 기본 **Private** |
| **Collective** | 명시적 기여를 거친 집단 지식 | 기여 동의 + provenance 필수 |
| **Training** | 실제 모델 학습 투입분 | **Collective 포함 ≠ 학습 가능.** 별도 동의 |
| **Evaluation** | 품질 측정용 | 원시 대화보다 가치가 높다. 별도 관리 |

**Class 0 (secret)** 은 이 축 밖이다 — API key·private key·인증 코드는 **코퍼스·AI 입력·벡터DB·로그 전부 금지**이고 athsra 가 별도 보안 경계에서 다룬다(`secrets-policy.md`).

## 2. 승격 사다리 — 자동 승격 없음

```
Operational → Personal → (명시적 기여) → Domain → Collective → Data Product
```

**앱을 썼다는 사실만으로 데이터가 윗칸에 올라가지 않는다.** 각 승격에는 목적별 consent, provenance 기록, 정제·가명화, 품질 검증이 붙는다.

- ❌ 일괄 약관 한 줄로 모든 2차 이용 동의
- ❌ 검증되지 않은 기여를 Collective 에 즉시 반영
- ❌ 가명화했으니 자유롭게 상업 이용 — **가명정보 ≠ 자유 이용 정보**

## 3. Consent 는 게이트다 (구현 규칙)

- `user_knowledge.collected` 는 **해당 consent 스코프를 보유한 경우에만** ingest 된다. 미보유 = **거부**(경고 로그가 아니라 거부)
- 스코프 어휘는 `@modfolio/contracts` 의 `VisualizeConsentScope`: `corpus.personal` · `corpus.behavioral` · `corpus.voice` · `corpus.sensitive` · `corpus.commerce`
- consent 는 **설정값이 아니라 이력(ledger)** 으로 남긴다 — 누가·언제·무엇을·어떤 목적으로 허용/철회했는가
- `user_knowledge.consent_changed` 는 **delete-by-(user, scope) 스윕을 트리거**한다. 철회가 인덱스·임베딩까지 닿지 않으면 그것은 철회가 아니다
- payload 규율: 원시 비밀·복호 PII·음성/사진 **바이트를 인라인하지 않는다.** 내용주소 참조(R2 키)를 넘기고, 격리된 집계기가 consent 하에 역참조한다. `summary` 는 **요약**이지 전문 덤프가 아니다

## 4. 격리는 구조로 한다 (필터로 하지 않는다)

- 사용자별 데이터는 **per-user 네임스페이스/컬렉션**으로 나눈다. 잊힐 수 있는 `WHERE user_id = ?` 필터를 유일한 방어선으로 삼지 않는다 — 교차 유출이 **구성상 불가능**해야 한다
- 서버측 `user_id` 필터는 그 위의 **다중 방어**로 유지한다 (둘 중 하나가 아니라 둘 다)

## 5. 🔒 ingest 를 AI 도구로 노출하지 않는다

`knowledge_query` MCP 는 **read-only** 다. ingest 를 MCP 표면에 올리는 순간 **private + untrusted + outward 3조건이 동시 충족**되어 lethal trifecta 가 성립한다(`.claude/rules/lethal-trifecta.md`).

- 조회 도구에 `readOnlyHint: true` 를 붙이는 것으로 끝내지 않는다 — **쓰기 도구를 아예 만들지 않는다**
- 외부에서 온 신뢰되지 않은 콘텐츠를 이 경로로 ingest 하지 않는다

## 6. 영역별 지식의 단위 = repo

*"영역에 따른 지식"* 은 새 저장소를 뜻하지 않는다.

- **각 앱은 자기 도메인 지식을 자기 repo `knowledge/` 에 쌓는다.** 그 repo 가 그 영역의 SoT 다(`fact-ownership.md` 와 같은 축)
- 허브는 그것을 **읽어서 색인**할 뿐 소유하지 않는다. 색인은 출처(repo)를 보존하고, 질의는 스코프로 좁힐 수 있어야 한다
- 이건 sibling 수정이 아니다 — **읽기 전용 색인**이다

> 실측 2026-07-26: 27 repo 가 `knowledge-rag` MCP 를 갖고 있으나 인덱스는 허브 `knowledge/` 만 훑는다. sibling 자체 지식(connect 43 · gistcore 27 · pay 19 + 앱 고유 문서)은 **한 번도 색인된 적이 없다.** universe 최대의 미개발 자산이 질의면 바로 옆에서 놀고 있었다.
>
> ✅ **해소됨 (실측 2026-08-17).** 위 문단은 **더 이상 참이 아니다** — 지우지 않고 남기는 이유는 «언제 왜 틀리게 됐는가» 가 다음 사람의 조사 시간을 줄이기 때문이다.
>
> ```
> knowledge_query("결제 웹훅 …", scope=["modfolio-connect"])
>   → modfolio-connect/knowledge/journal/20260701-completeness-round.md  scope=modfolio-connect
> knowledge_query("Muse playbook 증류 …")
>   → knowledge/canon/reasoning-playbooks.md                              scope=modfolio-ecosystem
> ```
>
> 코퍼스는 이제 **허브 + 각 sibling 의 `knowledge/`** 를 함께 담고 출처 repo 가 보존된다(서버 자기 기술과 일치). 규모: 허브 386 md · connect 177 · pay 231 · gistcore 143 · modfolio 144 · visualize 102.
>
> ⚠ **그런데 이 문장이 stale 인 채로 3주를 살았다.** 그동안 이 법을 읽은 멤버는 «내 knowledge/ 는 색인 안 된다» 로 알았고, 실제로는 색인되고 있었다. 낡은 실측은 **조용히 틀리지 않는다 — 그것을 근거로 판단할 때 틀린다.** 실측 문단에는 날짜만이 아니라 **재확인 방법**을 같이 적는다(위 두 줄이 그것이다).

## 7. 각 repo 가 확인할 것

```bash
/adopt-laws     # 자기 repo 의 갭 리포트 (hub 가 판정하지 않는다)
```

- 사용자 데이터를 다루는 앱인가? → §3 consent 게이트가 코드에 있는가(문서가 아니라)
- 코퍼스로 흘려보내는 이벤트가 있는가? → 스코프 미보유 시 **거부** 경로가 있는가
- 자기 도메인 지식을 `knowledge/` 에 쌓고 있는가

## 미결 (오너 결정 대기)

1. ~~**Connect 의 `corpus.*` consent scope**~~ — **✅ 해소 2026-08-30.** connect 가
   다섯 스코프를 발급·열람·철회하고 `corpus_scopes` 클레임을 토큰에 싣는다.
   라이브 실측: `login.modfolio.io/.well-known/openid-configuration` 의
   `scopes_supported` 에 `corpus.personal`·`corpus.behavioral`·`corpus.voice`·
   `corpus.sensitive`·`corpus.commerce`, `claims_supported` 에 `corpus_scopes`.
   D1 V75 적용(테이블 직접 조회 확인). 동의 화면은 **항목별 체크박스**다 —
   §3 의 「일괄 동의 금지」가 화면까지 닿았다.
   ⚠ **남은 것은 소비 층이고, 그 모양이 예상보다 나쁘다** (실측 2026-08-30):
   `user_knowledge.collected` 를 **발행하는 앱은 둘**인데
   (`gistcore` → `corpus.voice`, `modfolio-press` → `corpus.commerce`)
   그 스코프를 connect 동의 화면에서 **요청하는 앱은 0** 이다.
   즉 지금은 **발행 → 집계기(ingest) 게이트**로만 막힌다 — 그 설계 자체는 §3 정합이다
   (스코프 미보유 = 거부). 그러나 **아무도 요청하지 않으므로 아무도 허용된 적이 없고**,
   그 축은 「거부되고 있다」와 「아무 일도 안 일어난다」가 관측상 같다.
   ⓘ gistcore 의 소스 주석이 아직 *"Connect has no data-collection scope yet"* 이라고
   적고 있다 — 오늘 생겼으므로 **낡은 문장**이다. 낡은 「없다」가 남의 저장소에 없는
   작업을 만든 사례가 이미 있다(2026-08-30 hangul).
2. **per-user 격리 방식** — per-user collection(권장, 구조적 불가능) vs 공유 + 서버측 필터
