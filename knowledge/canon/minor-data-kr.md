---
title: 미성년 이용자 데이터 (대한민국) — 갭 등록부. ⚠ 법률 자문이 아니다
version: 1.0.0
last_updated: 2026-08-17
source:
  [
    "허브 read-only fleet 실측 2026-08-17 (코드 census — 값이 아니라 필드)",
    "ecosystem.json 레지스트리 (교육 대면 앱 판정)",
    "⚠ 조문 미확보 — 아래 §확인하지 못한 것",
  ]
sync_to_siblings: true
applicability: always
consumers: [all-repos, plan, preflight]
related_canon: [ai-compliance-kr, knowledge-sovereignty]
related_rules: [agent-evidence]
---

# 미성년 이용자 데이터 — 갭 등록부

> ## ⚠ 법률 자문이 아니다 — **측정 하나와 미확인 하나의 기록**이다
>
> 측정된 것: **미성년 여부를 정하는 필드(생년)를 수집하면서 그것을 읽는 동의·연령 게이트가
> 없는 앱이 둘 있다.** 확인 못 한 것: **그 요건의 조문.** 둘을 섞지 않는다.
>
> 이 문서를 **준수 근거로 쓰지 말 것.** 실제 판단은 법률 검토를 거친다.

## 측정 — fleet 코드 census (read-only, 값 미열람)

⚠ **필드의 존재**를 셌고 **값을 읽지 않았다.** 프로덕션 학생 생년은 열지 않는다
(`knowledge-sovereignty` — 필요 최소). 그래서 «실제로 미성년 이용자가 있는가» 는
**여기서 답하지 않는다.**

| repo | 동의·연령 게이트 | 생년 필드 | 「만 14세」 언급 | 교육 대면 |
|---|---|---|---|---|
| **pdgd** | **9 파일** | 21 | 1 | ✅ |
| **dle-desk** | **0** | **10** | **0** | ✅ |
| **naviaca** | **0** | **3** | **0** | ✅ |
| muje | 0 | 4 | 0 | |
| gistcore | 1 | 0 | 2 | |
| modfolio-pay | 2 | 0 | 5 | |
| modfolio-design | 1 | 0 | 0 | |
| visualize | 0 | 0 | 0 | ✅ |

매처: 게이트 = `parentalConsent|parental_consent|보호자 동의|법정대리인|minorConsent|ageVerif` ·
생년 = `birthDate|birth_date|dateOfBirth` · 연령 = `만 14세|under14|under_14|age *< *14|14세 미만`.
대상 `*.ts|*.svelte|*.astro`, `node_modules` 제외.

⚠ **첫 계측은 이 셋을 한 정규식으로 합쳐서 「7 repo 가 연령 처리를 한다」로 읽혔다.**
`birthDate` 는 **데이터 필드**이고 동의 기제가 아니다 — 「매처가 이름보다 넓으면 남의
결함을 우리 것으로 만든다」. 갈라서 재고서야 위 표가 나왔다.

### 그 생년이 **학생 것**임을 확인했다

```
naviaca   apps/app/server/api/students/index.post.ts:15   dateOfBirth?: string
          apps/app/server/api/students/[id].patch.ts       (수정 경로에도 있다)
dle-desk  apps/app/src/api/routes/import.ts:54             dateOfBirth: data.dateOfBirth || null
          apps/app/src/lib/{validation,types,export}.ts    (검증·타입·내보내기)
```

즉 **이용자(학생) 개인정보**이고, 내보내기 경로에도 실린다.

## 이것이 어느 부류의 결함인가

**「쓰기는 있는데 읽기가 없다」의 규제 축이다**(atelier 2026-08-05 의 `anf_leads` 와 같은 형태).
미성년 여부를 **결정하는 값**을 수집하고, 그 값을 **그 목적으로 읽는 코드가 0** 이다.

⚠ 그리고 아무것도 실패하지 않는다. 타입·린트·테스트·빌드가 전부 정상이다 — 값은 잘
저장되고 잘 내보내진다. **어떤 코드 게이트도 원리적으로 못 본다.**

## ✅ 사내 참조 구현이 이미 있다 — `pdgd`

`pdgd` 는 동의·연령 게이트 관련 파일 **9개**를 갖는다(교육 대면 4곳 중 유일). 즉 이 갭은
「무엇을 만들어야 하는지 모른다」가 아니라 **「한 곳은 만들었고 두 곳은 안 만들었다」**다.
`dle-desk`·`naviaca` 가 먼저 볼 곳은 법전이 아니라 **pdgd 다.**

⚠ 다만 pdgd 구현이 **옳은지는 허브가 판정하지 않았다** — 파일이 있다는 것만 셌다.
그 구현의 적합성은 그 repo 의 사실이다(`fact-ownership`).

## 확인하지 **못한** 것 (그래서 여기 안 적는다)

허브가 시도하고 **실패한** 것을 그대로 남긴다 — 다음 사람이 「이미 확인됐겠지」로 넘어가지
않게. `ai-compliance-kr.md` 와 같은 벽이다.

| 알아야 하는데 모르는 것 | 왜 못 했나 |
|---|---|
| 아동 개인정보 조항의 **조문 번호와 본문** | `elaw.klri.re.kr` 본문이 로드되지 않음(JS 렌더) · `pipc.go.kr` 영문 법령 URL **404** |
| **기준 연령**과 요건 발동 조건 | 위와 동일. 검색 요약은 «만 14세 미만 · 법정대리인 동의» 를 시사하나 **원문 대조 실패** |
| 2023 개정으로 조항이 **이동했는지**(제22조 → 제22조의2 등) | 위와 동일. **조번호를 추측해 적지 않는다** |
| 교육서비스에 대한 **별도 규정·완화** 존재 여부 | 조문을 모르면 판정 불가 |
| 우리 앱의 이용자가 실제로 기준 연령 미만인가 | **값을 열지 않았다**(필요 최소 원칙) |

⚠ **2차 자료로 이 표를 채우지 않는다.** 이 세션이 정정한 사고가 정확히 그것이었다 —
벤더 블로그를 인용했다가 원문에 없는 문장을 3개월간 fleet 에 배포했다
(`multi-agent-research-pattern` v2.0.0). **법률은 그보다 대가가 크다.**

## 각 repo 가 확인할 것 (권고 — 강제 아님)

Hub-not-enforcer. 허브는 등록부만 유지한다.

1. **생년을 수집하는가** → 그렇다면 그 값이 **어떤 판정에 쓰이는지** 코드로 답할 수 있는가
2. 답이 «아무 데도» 면 → 그 필드를 **왜 수집하는지**를 먼저 적는다(수집 목적 = 규제의 출발점)
3. **기준 연령 미만 이용자가 실재하는가** — 이건 그 repo 만 알 수 있다(값 소유자)
4. 검토했으면 결과를 그 repo `knowledge/` 에 남긴다 — **repo 가 자기 사실의 SoT**
   (`fact-ownership.md` ADR-014)

## 다음 수 (허브)

- [ ] 조문 전문을 **받을 수 있는 경로** 확보 — `law.go.kr` Open API 또는 PDF 직파싱.
      `ai-compliance-kr.md` 와 **같은 막힘**이므로 한 번 뚫으면 둘이 같이 풀린다
- [ ] 그 전까지 이 문서는 **등록부로만** 유지한다. 조번호·연령을 추측으로 채우지 않는다

## 관련

- `knowledge/canon/ai-compliance-kr.md` — 같은 형태의 등록부(AI 기본법). 같은 벽에 막혔다
- `knowledge/canon/knowledge-sovereignty.md` — 필요 최소·consent 는 게이트다
- `.claude/rules/agent-evidence.md` — 「쓰기는 있는데 읽기가 없다」 · 「매처가 이름보다 넓다」
