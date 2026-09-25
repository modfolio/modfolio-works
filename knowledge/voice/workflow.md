# Voice — 일하는 방식

> 규약·형식·우선순위는 canon **`owner-voice.md`**. 이 파일은 **관측 본문**이다.
> 항목 형식: `observed` · `quote` · `scope` · `applies` · `status`.

---

### 속도보다 정확도 — «천천히» 가 아니라 «다시 재라»

- **observed**: 2026-08-04
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-01
- **scope**: fleet
- **applies**: 빠른 한 수보다 옳은 경로. ⚠ 이건 «느리게 하라» 가 아니라 **«되돌아가서
  다시 재라»** 다(modfolio-notify 해석, 채택). 실사건이 그 해석을 지지한다 —
  게시 검증이 성급해 정상 게시를 «실패» 로 오판정 → 수동 재게시 → **아티팩트 손상**
  (2026-08-05). 한 번 더 재는 데 80초면 됐다.
- **observed(보강)**: 2026-09-23
- **quote(보강)**: 비공개 — knowledge/voice/_quotes.md#WF-02
- **applies(보강)**: 두 축을 **같이** 지킨다 — 정확도를 속도와 맞바꾸지 않고, 속도를 잃는 검사는
  «필요한 것» 만 남긴다. 반복 확인은 좁은 검사(`gate:quick` · 바뀐 파일의 테스트), 넓은 게이트
  (`gate:full`/`gate:release`)는 **push·게시 직전 그 트리에 한 번**. 같은 트리에 같은 게이트를 두 번
  돌리지 않는다. 판단 근거 출력은 파일로 받아 상주시키지 않는다(`context-residency.md`). 정확도는 그
  한 번의 넓은 게이트와 독립 리뷰가 지킨다.
- **status**: active

---

### 정공법 — 한 단어로 5원칙이 켜진다

- **observed**: 2026-08-04 · 2026-08-05
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-03
- **scope**: fleet
- **applies**: 정본은 `.claude/rules/fundamentals-first.md`(근본 수정 · 에러/경고 0 ·
  장기 시야 · 신기술 포텐셜 · 리소스 투자 허용). 두 가지를 덧붙인다:
  ① **워닝은 에러다.** 지금 못 고치는 것은 «만료일 붙은 원장» 으로 남긴다
  (`check:audit` waiver 의 `revisitAfter` 가 그 형태).
  ② ⚠ **선택지를 제시했을 때 «정공법으로» 라는 답은 «네가 판단해라» 다** — 양자택일을
  강요받는 것 자체의 거부이고, 답은 대개 «둘 중 하나» 가 아니라 **«층으로 나눠라»** 였다.
- **status**: active

---

### 질문은 **자리에 있을 때만** — 조건부다

- **observed**: 2026-08-04 · 2026-08-05
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-04
- **scope**: fleet
- **applies**: 배석 중이면 **적극적으로 묻는다.** 웹서치도 같은 축이다 — 동석 모드에서
  «찾아보고 오겠다» 는 마찰이 아니라 요청받은 것이다. 무인이면 **묻지 않고** 정공법으로
  판단하고 **근거를 기록에 남긴다**(부재 중에도 웹서치는 하되 결과를 문서에 남겨 판단을
  재구성할 수 있게).
  ⚠ **조건부라 한쪽만 기억하면 매번 틀린다.** 모드를 모르면 **먼저 확인한다.**
  전환 신호는 오너가 준다.
- **status**: active

---

### 멈추지 않는다 — 스스로 다음 일을 찾는다

- **observed**: 2026-08-04
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-05
- **scope**: fleet
- **applies**: 한 축이 끝나면 보고하고 멈추는 것이 아니라 **다음 축을 스스로 찾아** 이어간다.
  형제 인바운드 감지·응답도 그 «일» 에 포함된다. 무인 모드에서 특히, 배석 중에도 기본은 «계속».
- **status**: active

---

### 완료는 «커밋됨» 이 아니라 «웹에서 확인 가능»

- **observed**: 2026-08-04
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-06
- **scope**: fleet
- **applies**: 「고쳤다」의 종점은 로컬 초록이 아니라 **배포 반영 + 라이브 재측정**이고,
  거기서 끝이 아니라 **다시 루프**를 돌아 남은 문제를 찾는다.
  ⚠ **라이브 200 은 배포 확인이 아니다** — 배포 실패는 사이트를 죽이지 않고 안 바꾼다
  (구버전이 계속 200 을 서빙). CF **Version ID 변화**를 본다(canon `cf-deploy.md`).
  실증: notify 는 이 한 문장 때문에 `verify:deploy` 의 마지막 검사를 «CF 가 무엇을
  빌드했나» 에서 **«라이브 워커가 자기 커밋을 무엇이라고 말하나»** 로 바꾸고 `/healthz` 에
  `commit` 필드를 넣었다.
- **status**: active

---

### 인프라는 evergreen — 최신을 «적용» 까지

- **observed**: 2026-08-04 · 2026-08-05
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-07
- **scope**: fleet
- **applies**: 세션 시작 시 인프라 최신화가 기본 작업이다.
  ⚠ **«설치» 와 «적용» 은 다른 문장이다** — `bun add` 만으로는 하네스 산출물이 들어오지
  않는다(`harness-pull -- --apply` 필요, 2026-08-04 실측).
- **status**: active

---

### 형제 repo — 선발신 → 회신 대기, 직접 수정 금지

- **observed**: 2026-08-04
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-08
- **scope**: fleet
- **applies**: 형제 저장소는 **읽기만** 한다. 의견은 `feedback/<repo>/inbox/` 에 파일로.
  채택·적용·되돌림 판단은 그 repo 자율(Hub-not-enforcer, canon `evergreen-principle`).
  ⚠ «순서를 기다린다» 는 **놀고 있으라는 뜻이 아니다** — 답을 기다리되 **그 답에 막히지
  않는 일은 계속** 진행한다(notify 해석, 채택).
  ⚠ 배치는 **`inbox/`** 로. 루트는 일부 repo 의 픽업이 원리적으로 못 본다(infra·pay 실측).
- **status**: superseded-by 승인된 목표에서는 기능 소유자의 작업까지 연결한다

---

### 담당 경계 — 자기 것만 하고, 남의 것은 물어서 나눈다

- **observed**: 2026-08-05
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-09
- **scope**: fleet
- **applies**: 위 「선발신 → 회신 대기」의 **한 겹 위**다. 그쪽은 «어떻게 소통하나» 이고
  이건 **«무엇이 내 일인가»** 다. 남의 담당으로 판단되면 소통 순서를 지키는 것으로 끝나지
  않고 **그 일 자체를 하지 않는다** — 물어서 분담을 정한 뒤에 움직인다.
  ⚠ 판정 질문: 「이 사실의 SoT 가 누구인가」(canon `fact-ownership.md`). 남이면 내가
  정하지 않는다. **겹치는 것도 위반이다** — 둘이 같은 것을 만들면 나중에 둘이 갈린다.
  실사례: 오너의 호버·색상 취향은 원문이 실재하지만 `atelier-and-folio` 의 디자인
  시스템에 속하는 층이 섞여 있어(House of Brands), 허브가 fleet 로 올리지 않고 그쪽에
  물었다.
- **status**: superseded-by 승인된 목표에서는 기능 소유자의 작업까지 연결한다

---

### 큰 작업은 새 세션에서 시작한다

- **observed**: 2026-08-05
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-10
- **scope**: fleet
- **applies**: 큰 축을 새로 시작할 때는 컨텍스트를 갈아끼우고 **핸드오프로 잇는다.**
  그래서 핸드오프 품질이 곧 다음 세션의 착수 속도다(→ `communication.md` 「핸드오프의
  합격 기준」과 짝).
  ⚠ **이 항목은 자발 발화가 아니라 확인 응답에서 나왔다.** canon `owner-voice.md` 의
  quote 규율상 그 사실을 명시한다 — 나중에 «정말 그렇게 말했나» 를 되짚을 수 있어야 한다.
- **status**: active

---

### 이미 아는 것은 가볍게 넘긴다 — 중복은 축적이 아니라 희석

- **observed**: 2026-08-05
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-11
- **scope**: fleet
- **applies**: 중복 확인·재설명에 시간을 쓰지 않는다. 말뭉치에도 새 것만 넣는다 —
  겹치면 새 항목을 만들지 말고 **기존 항목을 보강**한다. 잡음이 신호를 덮는다.
- **status**: active

---

### 정공법의 **경계** — 제품 의도는 묻고, 공학 방법은 판단한다

- **observed**: 2026-08-05
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-12
- **scope**: fleet
- **applies**: 「정공법」 항목의 ⚠ 가 「«정공법으로» 는 «네가 판단해라»」 까지만 가 있어서,
  **그 항목만 읽으면 «묻지 마라» 로 읽힌다.** 가르는 선: **«무엇을 만들까»·«이 기능을 할
  것인가» 는 묻고, «어떻게 제대로 만들까» 는 원칙으로 답한다.**
  ⚠ 이 축은 **배석 여부와 직교**한다 — 배석 중에도 공학 방법은 판단하고, 무인 중에도
  제품 결정은 미뤄서 보고한다.
  **왜**: 구분하지 않으면 한쪽으로 무너진다. 다 물으면 «정공법으로» 라는 답이 돌아오고,
  안 물으면 **오너만 아는 제품 결정을 에이전트가 대신 내린다.**
- **출처**: modfolio-connect 제보 (2026-08-05) · 2차 배치 B2-1
- **status**: active

---

### 공급자와 세션을 넘어 같은 지식과 최신 판단을 사용한다

- **observed**: 2026-09-21
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-13
- **scope**: fleet
- **applies**: 공급자별 기억만 믿지 않고 공통 진입점에서 Atlas·canon·voice·소유 repo의 현행 근거를 조회한다. 판단이 바뀌면 이전 항목을 승계 표시하고 출처와 적용 범위를 남긴다. 설치본의 발행 시점과 현행 정본의 차이를 보고하고, 수집·승인·배포가 연결되지 않은 곳을 최신 동기화 완료라고 말하지 않는다.
- **status**: active

---

### 승인된 목표에서는 기능 소유자의 작업까지 연결한다

- **observed**: 2026-09-21
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-14
- **scope**: fleet
- **applies**: 사용자가 승인한 목표·캠페인의 저장소와 변경 범위 안에서는 소유 프로젝트의 하위 작업과 규칙·검증을 따라 호환 확장을 이어간다. 대화가 A에서 시작됐다고 B 작업을 금지하거나 매 파일마다 재승인을 요구하지 않는다. 기능 소유권과 기존 세션의 WIP는 유지한다. 승인 범위 밖의 변경·새 소유권·호환성 파괴·새 지출은 별도 결정 대상이다. ADR-027의 작성자·리뷰·통합 경계를 따르며, 관리 실행기가 아직 연결되지 않았다는 이유로 통합 검사를 생략하지 않는다.
- **observed(보강)**: 2026-09-23
- **quote(보강)**: 비공개 — knowledge/voice/_quotes.md#WF-15
- **applies(보강)**: 여러 세션이 동시에 도는 동안에도 **기능은 소유 repo 한 곳에서만** 만든다. 기능을
  만들기 전에 주인을 잰다(`/modfolio --intent "<기능>"` = `plan:build`). 주인이 다른 repo 면 여기서
  만들지 않는다 — 그 repo 의 **살아 있는 세션에 알리고**(SendMessage) **내구 기록으로 편지**
  (`feedback/<repo>/`)를 남긴다. Loom 이 연결되면 같은 목표 아래 그 repo 태스크로 건다. 소비 쪽은
  게시된 부품·엔드포인트·이벤트로만 조합한다(Assembly Law).
- **status**: active

---

### 위임 모델은 분석하고, 상위 모델에는 결과만 돌려준다

- **observed**: 2026-09-21
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-16
- **scope**: fleet
- **applies**: Gemini·Claude·Codex 등 다른 실행에 분석을 위임하면 원문·전체 저장소 문맥·
  도구 로그는 그 실행 안에 둔다. 상위 조율자는 제한된 결과 receipt, finding 위치, 증거
  digest와 사용량만 받는다. 추가 근거는 finding 단위로 선택 조회한다. 입력 파일 수·바이트와
  결과 바이트·finding 수를 실행 전에 제한하며, 한 공급자의 구독을 사용해도 상위 조율자의
  요청 구성·결과 처리는 별도 사용량임을 보고한다.
- **status**: active

---

### 사용량이 부족하면 역할에 맞는 대체 모델로 이어간다

- **observed**: 2026-09-21
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-17
- **scope**: fleet
- **applies**: 현재 역할에 적격하고 사용량·어댑터가 확인된 대체 모델을 자동 선택한다. 이전 실행의 종료와 변경물 보존을 확인하고 같은 Loom 작업에서 이어간다. 고위험 품질 기준·독립 리뷰·예약 용량은 유지하며, 적격 후보가 없으면 작업을 보존해 대기한다. 이 판단은 추가 API 결제나 미확인 사용량을 가용으로 간주하는 승인이 아니다.
- **status**: active

---

### Codex는 사용 허용 응답과 주간 예약 용량으로 배정한다

- **observed**: 2026-09-21
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-18
- **note**: 원문 미보존 — 2026-09-21 Codex 세션이 남긴 요약 인용(축자 아님). 2026-09-22 판단으로 승계됨.
- **scope**: fleet
- **applies**: Codex의 공식 계정 API가 ordinaryUsageAllowed=true로 응답하고 신선한 주간 사용량이 30% 예약 용량 밖에 있으면 관리형 실행을 허용한다. 제공되지 않은 5시간 사용량은 미확인으로 보존하며 0%로 채우지 않는다. 추가 시간창이 실제로 제공되면 그 예약 용량도 검사한다. 사용 허용 응답의 누락·거절·만료는 대기이며 추가 API 결제나 reset 소비를 허용하지 않는다. Claude·Google의 시간창 정책은 변경하지 않는다.
- **status**: superseded-by 사용량은 오너가 본다 — 하네스는 보고만 하고 작업을 막지 않는다

---

### Claude가 보고한 실제 0%와 누락된 사용률을 구분한다

- **observed**: 2026-09-21
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-19
- **note**: 원문 미보존 — 2026-09-21 Codex 세션이 남긴 요약 인용(축자 아님). 2026-09-22 판단으로 승계됨.
- **scope**: fleet
- **applies**: Claude 공식 API가 사용률 0%를 명시하고 초기화 시각만 null인 경우, 신선한 관측에 한해 사용률을 인정한다. 초기화 시각은 null로 보존하며 만들지 않는다. 사용률 누락, 0%가 아닌 사용률의 초기화 시각 누락, 명시적 제한 응답, 오래된 관측은 차단한다. 단기·주간 창 요구와 30% 예약 용량은 유지한다. 다른 공급자의 규칙이나 추가 과금 승인을 변경하지 않는다.
- **status**: superseded-by 사용량은 오너가 본다 — 하네스는 보고만 하고 작업을 막지 않는다

---

### 진입 표면은 동등하고, 열린 도구의 대화 모델이 그 순간의 orchestrator 다 — 기본 effort 는 low

- **observed**: 2026-09-22
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-20
- **scope**: fleet
- **applies**: 정본은 `MODFOLIO.md` 하나이고 Claude Desktop/Code · Antigravity · ChatGPT Desktop/Codex 는 동등한 진입 표면이다 — 어느 공급자도 «메인» 이 아니다. 오너가 연 도구의 대화 모델이 그 순간의 orchestrator 이며, 역할 워커는 `config/ai-routing.json` 프리셋으로 배정한다. orchestration 은 기본 low effort 로 돌리고 그 사용량은 감수한다. 다만 두 지점은 단순 orchestration 이 아니므로 low 로 판정하지 않는다: ⓐ 기능 소유자 판정·소유자 간 A/B 분해(Atlas 가 모호할 때) ⓑ 리뷰 findings 가 0 이 아닐 때의 처분 — `triage` 프리셋으로 넘기거나 그 턴만 effort 를 올린다. 통합 승인은 계약·게이트가 판정하므로 orchestrator effort 와 무관하다. 인수 기준은 오너 문장 그대로다 — 어떤 도구를 켜서 개발 요청 한마디만 해도(원문 비공개 — _quotes.md#WF-25) 시작 주문·모델 플래그 없이 하네스 흐름(소유자 판정 → 역할 배정 → 격리 구현 → 독립 리뷰 → 검증 → 통합 → 회신)이 이어져야 한다; 문서 배포만으로 이것을 완료로 보고하지 않는다. 「ChatGPT Desktop 을 기본 control plane 으로」(2026-09-21 구현 문서 `20260921-model-routing.md`)는 이 판단으로 정정한다. 같은 날 오너가 pdgd 도 이번 등록 물결에 포함하라고 했으므로 2026-09-21 의 «PDGD 제외» 는 rollout 범위에서 해제된다(pdgd 세션의 자율은 그대로).
- **observed(보강)**: 2026-09-23
- **quote(보강)**: 비공개 — knowledge/voice/_quotes.md#WF-23
- **applies(보강)**: subagent·워커의 effort 는 세션(Desktop) 설정과 관계없이 frontmatter·`config/ai-routing.json` 프리셋이 정한다.
  Desktop 이 넣는 세션 env 는 `.claude/settings.json` env 의 빈 값 `"CLAUDE_CODE_EFFORT_LEVEL": ""` 이 지운다(2026-09-23 실측 —
  canon `opus-4-7-effort-policy` v2.4.0 §우선순위). 메인 대화의 effort 는 세션 선택이 정한다 — 저장소가 강제하면 subagent 까지
  눌리므로(실측) 그 한 칸은 오너의 선택으로 남긴다.
- **applies(대체 2026-09-23 저녁)**: 이 항목의 effort 두 칸 — 대화형 세션의 기본 low 와, 보강의 메인은 세션 선택을 따른다는
  칸 — 은 「effort 는 Desktop 선택과 무관하게 정책값(high)으로 — 예외는 오너 요청 때만」 이 대체한다. 빈 값 무력화는 반증됐다
  (Desktop 이 Windows 사용자 env 로 모든 세션에 max 를 넣었고, 어떤 settings 층도 그 env 를 못 이긴다 — 실측). 진입 표면이
  동등하고 열린 도구의 대화 모델이 orchestrator 라는 판단은 그대로 유효하며, `orchestration.effort: low` 는 관리형(비대화형)
  오케스트레이터에만 남는다.
- **status**: active

---

### 사용량은 오너가 본다 — 하네스는 보고만 하고 작업을 막지 않는다

- **observed**: 2026-09-22
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-21
- **scope**: fleet
- **applies**: 사용량은 오너가 보면서 가이드한다. 하네스는 공급자 사용량을 최신으로 **보고**(statusline·usage API)하되, 예약 용량(30%)·미측정·오래된 스냅샷·창 부족을 이유로 작업을 막거나 모델을 낮추지 않는다(`config/ai-routing.json` `usagePolicy.gate: advisory` — 판정은 경고로 남는다). 유지되는 것: 유료 API 전환·reset credit·업그레이드 금지, 동시 실행 상한(박스 보호), 고위험 역할의 품질 바닥, 독립 실행 리뷰, 사용량이 실제로 소진돼 공급자가 거절하면 역할에 맞는 대체 모델로 이어가는 것. 개발이 한 주 내내 멈춰서는 안 된다는 것(원문 비공개 — _quotes.md#WF-26) 는 하네스의 차단이 아니라 오너의 페이스 판단이며, 주간 창 소진 경고를 보고에 남긴다. 이전 두 판단(Codex 주간 예약 · Claude 0%/누락 구분)은 이 판단으로 승계된다.
- **observed(보강)**: 2026-09-23
- **quote(보강)**: 비공개 — knowledge/voice/_quotes.md#WF-24
- **applies(보강)**: 구독 한도 안의 사용은 지출이 아니다 — evals·측정·워커 실행을 «지출이라 오너 대기» 로 세우지 않는다. 구독 OAuth 로만
  돌리고(API 키 과금 경로는 떼어 낸다 — `scripts/lib/worker-env.ts`) 동시 상한만 지킨다. 막는 것은 돈이 실제로 나가는 경로
  (API 키 과금 · reset credit · 플랜 업그레이드)뿐이고, 달러 상한(`--max-cost-usd`)은 구독에선 명목값이라 근거가 되지 않는다.
- **status**: active

---

### `/modfolio` 가 세션의 시작점이다 — `/preflight` 은퇴

- **observed**: 2026-09-22
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-22
- **scope**: fleet
- **applies**: `/modfolio` 기본 = 세션 브리핑(카드 + 준비·불일치 + 최신 핸드오프 +
  **오늘 날짜 기준** 스택·트렌드 + **결정 질문**). 세 표면 모두 같은 스크립트
  (`bun run modfolio:compass`)라 효과가 같다. **핵심은 질문이다** — 도입하든 보류하든
  오너에게 물어 답을 받는다. 조용한 보류가 이 변경이 없애려는 결함이고, 그 결함은 실측됐다
  (2026-09-22: currency 판단이 **16일째** 없었고 skip 재평가 4건이 트리거를 충족했는데
  아무도 안 물었다). 스크립트는 질문 목록만 내고, **묻는 것은 어댑터(스킬·§Commands)의 일**.
  하위 스킬(`modfolio-*`)을 새로 만들지 않는다 — 시작점은 하나여야 한다.
  ⚠ **2026-09-06 «기본 = 5초 카드» 를 대체한다**(그 용도는 `--card` 로 보존 — 실측 0.1초).
  `/preflight` 는 은퇴하되 **파일은 남긴다**: 9항목이 각각 어디로 갔는지를 적어 둬야
  다음 사람이 «원래 없었다»와 «이관 누락»을 구분할 수 있다.
- **status**: superseded-by 세션은 `/modfolio-sun` 으로 열고 `/modfolio-moon` 으로 닫는다 — `/modfolio` 는 언제든 정체성 점검

---

### 세션은 `/modfolio-sun` 으로 열고 `/modfolio-moon` 으로 닫는다 — `/modfolio` 는 언제든 정체성 점검

- **observed**: 2026-09-23
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-27
- **scope**: fleet
- **applies**: 세 명령이 역할을 나눈다. `/modfolio` 는 세션의 시작·마무리가 아니라 **어느 시점에서든** universe 의
  철학·정체성이 지켜지는지 보는 점검이다 — 법칙·규칙·구성·구조, 기능이 소유 repo 에서만 만들어지는지, 같은 기능이 여러
  곳에서 따로 자라지 않는지. `/modfolio-sun` 은 시작이다 — 핸드오프·이어지는 일·형제 편지·도입할 것을 모아 **계획 모드에서
  계획을 세운 뒤** 개발로 들어간다. «결정 질문을 오너에게 묻는다» 의무는 sun 이 이어받는다. `/modfolio-moon` 은 **언제든**
  하던 일을 바로 정리한다 — 상세 핸드오프, 넘어가기 전 업데이트·설치·버전업, 다음 세션이 곧바로 시작할 수 있는 상태.
  세 표면 동일성 원칙은 그대로다(효과는 스크립트, 스킬은 얇게). 「하위 스킬(`modfolio-*`)을 만들지 않는다 — 시작점은
  하나」 는 이 판단으로 대체된다.
- **status**: active

---

### effort 는 Desktop 선택과 무관하게 정책값(high)으로 — 예외는 오너 요청 때만

- **observed**: 2026-09-23
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-28
- **scope**: fleet
- **applies**: 대화형 세션의 effort 는 오너가 Desktop 에서 무엇을 고르든 `config/ai-routing.json` 의 정책값(**high**)을
  따른다. 오너가 명시적으로 요청할 때만 그 턴·그 세션·그 작업 단위로 조정한다. 품질 기준은 이전 모델(Opus 5·Fable 5.1)로
  개발할 때보다 나은 결과물이다 — effort 만이 아니라 작은 컨텍스트·계획 선행·경계 패킷 리뷰가 함께 그 기준을 받친다.
  env 로 고정하면 서브에이전트도 같은 값이 되므로, xhigh 가 필요한 치명 역할은 env 를 뗀 별도 워커로 돌린다.
- **status**: active

---

### 다른 AI 리뷰는 정말 필요할 때만 — 라운드는 전면 1회와 수정분 확인 1회

- **observed**: 2026-09-23
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-29
- **scope**: fleet
- **applies**: 기본 독립 리뷰는 새 컨텍스트 Claude 워커가 경계 패킷을 한 번 읽는 것이다(L1). 비정책 문서(핸드오프·저널·
  계획·runs)만 바뀐 후보는 게이트로 끝낸다(L0 — 테스트·lock·canon·법 문서는 제외). 다른 AI 는 트리거가 있을 때만 쓴다 —
  공개 계약·교차 repo API·큰 diff·L1 의 P0/P1·오너 요청은 second opinion, 인증·결제·데이터·비가역·보안은 critical-review
  경로. 라운드는 전면 1회 + 수정분 확인 1회까지다: P0/P1 이 없으면 닫고, P2/P3 와 문구 지적은 후속 목록으로 보낸다.
  세 번째는 사유를 기록하고 다른 모델로만 연다. 실측(2026-09-23 하룻밤 Codex 리뷰 약 55회로 주간 한도 소진)과 연구
  (반복 라운드는 거짓양성만 늘린다)가 같은 방향을 가리킨다.
- **status**: active

---

### Gemini 는 second opinion 과 Google 영역 전담

- **observed**: 2026-09-23
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-30
- **scope**: fleet
- **applies**: 오너 판단으로 Gemini 는 한도가 작고 성능은 셋 중 낮은 편이다. 그래서 기본 리뷰·치명 리뷰·대량 읽기 위임에는
  쓰지 않는다. 쓰는 곳은 둘이다: ⓐ second opinion(L2 리뷰·설계 판단이 갈릴 때의 짧은 2차 의견 — 한도가 소진되면 Codex 로)
  ⓑ Google 영역 — Google 검색 기반 웹 조사, YouTube 이해, Google 서비스(Workspace·Cloud·Android·Firebase 등) 질문.
  ⓑ 에는 저장소 파일을 싣지 않는다.
- **status**: active

---

### 전부 읽지 않는다 — 컨텍스트 상한 400K, 원격에서도 안전한 세션 전환

- **observed**: 2026-09-23
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-31
- **scope**: fleet
- **applies**: 토큰 낭비의 주범은 세션이 1M 끝까지 가며 매 턴 수십만 토큰을 다시 읽는 것이다. 자동 압축 창을 **400K** 로
  둔다 — 같은 세션 안에서 도는 회전이라 원격 작업에서도 새 세션이 필요 없다(오너는 원격에서 새 세션이 제대로 잡히는지를
  걱정한다 — 새 세션은 오너가 여는 것이고 에이전트가 강제하지 않는다). 작업 단위가 끝나면 moon → 새 세션 sun, 원격에서
  새 세션이 불편하면 `/compact`. 리뷰·조사는 경계 패킷으로만 하고 저장소 전체를 탐색시키지 않는다. 긴 명령은 턴마다
  폴링하지 않고 한 번에 기다린다. 캐시 읽기·effort·폴링은 실측 지표로 1주 뒤 다시 잰다.
- **status**: active

---

### 계획 중에도 승인 프롬프트로 멈추지 않는다

- **observed**: 2026-09-23
- **quote**: 비공개 — knowledge/voice/_quotes.md#WF-32
- **scope**: fleet
- **applies**: 표준은 bypassPermissions(무프롬프트)이고 오너는 계획 단계에서도 같은 흐름을 원한다. 계획 모드는 별도 권한
  모드라 그 안에서는 bypass 가 적용되지 않는다 — 그래서 sun 은 자료 수집을 계획 모드에 **들어가기 전에** 스크립트로 끝내고,
  계획 모드 안에서는 파일 읽기와 계획 작성만 한다. 읽기 전용 명령 allow 규칙이 계획 모드 프롬프트를 줄이는지는 실측으로
  정한다.
- **status**: active
