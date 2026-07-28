---
title: Assembly Law — 조립은 복사가 아니다 (재사용 3표면 + provider 선언 의무)
version: 1.0.0
last_updated: 2026-07-26
source: [2026-07-26 오너 세션 "이미 만들어진 그 기술을 그 프로젝트에서 복사 해오는게 아니라, 끌어다가 사용하는거지. api?같이", 실측 2026-07-26 (28/29 repo 가 platform-adapter.json 보유하나 provides/produces/exposes grep 0 hits · 26 event 중 선언된 구독 2건 = 24 갭 · capability 라는 이름이 서로 무관하게 3개), productization-roadmap.md §3.1]
sync_to_siblings: true
tier: law
applicability: always
consumers: [all-agents, contracts, api, schema, deploy, sso-integrate, component, page]
related_canon: [registry-redundancy, knowledge-sovereignty, event-consumption, platform-plane, evergreen-principle, fact-ownership]
related_rules: [import-boundaries, fundamentals-first]
---

# Assembly Law — 조립은 복사가 아니다

> **법칙.** 앱을 만들수록 다음 앱이 빨라지는 구조는 **코드를 옮겨 심어서** 만들지 않는다. 재사용은 **contracts(Zod) · MCP · endpoint(REST)** 세 표면으로만 한다. 그리고 모든 repo 는 **자기가 무엇을 제공하는지 선언한다.**

## 이 문서가 `tier: law` 인 이유

`tier` 축의 계약은 하나다 — **무엇(what)은 예외 없음, 언제·어떻게(when/how)는 그 repo 자율.**

hub 는 법칙을 진술하고 진단 도구를 배포한다. **일정을 잡지 않고, PR 을 열지 않고, sibling 파일에 쓰지 않는다.** 적용 순서·시점·구현 방식은 전부 그 repo 가 정한다. 이 분리가 Hub-not-enforcer(`evergreen-principle.md`)와 충돌하지 않는 지점이다.

## 1. 재사용의 3표면 (이 밖은 없다)

| 표면 | 소비 좌표 | 쓰는 때 |
|---|---|---|
| **contracts** | `@modfolio/contracts/<subpath>` — Zod 스키마·타입·검증기 | 어휘를 공유할 때(이벤트 봉투, 토큰 클레임, 결제 응답 모양) |
| **MCP** | MCP 서버 endpoint | AI/에이전트가 기능을 호출할 때 |
| **endpoint** | REST/RPC base URL | 서비스가 런타임에 다른 서비스를 호출할 때 |

세 표면의 공통점: **버전과 배포 경계를 넘어 계약으로만 이어진다.** 상대가 내부를 바꿔도 내 빌드가 깨지지 않는다.

## 2. 금지 (예외 없음)

- ❌ **다른 앱의 소스를 복사해 자기 repo 에 심기(벤더링).** 복사한 순간 그것은 부품이 아니라 **분기된 사본**이고, 원본의 수정·보안 패치가 영원히 도달하지 않는다
- ❌ **다른 앱 코드를 직접 import** (`import ... from '../../other-app/...'`) — `.claude/rules/import-boundaries.md`
- ❌ **앱 간 공유 런타임 UI 라이브러리** — 전역 불변원칙 1. 헤드리스 프리미티브는 `@modfolio/design-cli` 처럼 **생성 후 앱이 소유(generate-and-fork)** 하는 형태로만
- ❌ **린터 오탐을 이름 바꾸기로 무마** — 2026-07-03 fleet sweep 이 `pdfUrl` → `_pdfUrl` 로 개명해 muje 의 PDF 미리보기를 조용히 죽였다(템플릿은 계속 `pdfUrl` 참조). 오탐은 **규칙이 구조적으로 판정 불가능한 파일형에서 끄는 것**이 근본 수정이다

> **"복사 금지"는 코드 재사용을 줄이라는 말이 아니다.** 재사용의 **형태**를 지정하는 것이다 — 복사본이 아니라 좌표로.

## 3. 선언 의무 — provider 면

지금까지 `platform-adapter.json` 은 **소비만** 서술했다(`consumes`·`subscribesTo`). 그래서 26개 이벤트 중 **선언된 구독이 2건(1 repo)** 이고 24개가 갭이다. 원인은 어휘 부족이 아니라 **"내가 무엇을 제공한다"고 말할 자리가 없었던 것**이다.

**법칙**: 다른 repo 가 쓸 수 있는 것을 가진 repo 는 그것을 `platform-adapter.json` 의 `provides` 에 선언한다.

```jsonc
{
  "repo": "modfolio-pay",
  "provides": [
    {
      "id": "credits",
      "kind": "endpoint",                    // contract | mcp | endpoint
      "coordinate": "https://pay.modfolio.io/v1",
      "emits": ["credit.topped_up", "credit.consumed", "credit.refunded"],
      "status": "active"
    }
  ],
  "consumes": [],
  "subscribesTo": ["payment.completed"]
}
```

- `id` 는 **자유 문자열**이다. 닫힌 enum 이 아니다 — enum 이면 역량 하나 추가에 published 패키지의 breaking bump 가 필요해지고, 그게 지금까지 provider 면이 없던 진짜 이유다
- `emits` 는 기존 26개 이벤트 어휘를 재사용한다. 새 이벤트가 필요하면 `contracts/events/` 에 추가하는 것이 선행이다
- 스키마: `@modfolio/contracts/platform` 의 `ProjectPlatformManifestSchema`

## 4. 이름 충돌 주의 — "capability" 는 이 universe 에 3개다

| 이름 | 무엇 | 어디 |
|---|---|---|
| `PLATFORM_CAPABILITY_IDS` | **NAS 인프라 역량** 9종 (forgejo-git·npm-registry·forge…) | `contracts/platform/capability.ts`, 소유 = modfolio-infra |
| `provides[].id` | **앱이 제공하는 부품** (이 문서) | 각 repo `platform-adapter.json` |
| `forge-sdk` 의 `capability` | forge 서비스의 **오퍼레이션** (image.optimize…) | `@modfolio/forge-sdk` |

셋은 **통합하지 않는다.** 축이 다르고, 억지 통합은 셋 다 거짓말이 되게 한다. 문서·코드에서 지칭할 때 어느 축인지 밝힌다.

## 5. 자기 진단

이 법칙의 준수 여부는 hub 가 판정하지 않는다. 각 repo 가 스스로 본다:

```bash
bunx modfolio-harness-pull            # 법칙 문서 수신 (report-only)
/adopt-laws                           # 자기 repo 갭 리포트 + 자기 계획 초안
```

`/adopt-laws` 는 **계획을 실행하지 않는다.** 갭을 보여주고 우선순위를 제안할 뿐, 무엇을 언제 할지는 그 repo 의 결정이다.

## 근거 (실측 2026-07-26)

- `platform-adapter.json` 28/29 repo 보유, 전 매니페스트 `provides|produces|exposes` grep = **0 hits**
- `EVENT_WIRING` 26행 ↔ 선언된 구독 **2건**(modfolio 만) = **24 갭**. `wiring.ts` 자신의 기록: *"siblings hand-rolled integrations off-contract"*
- `PlatformCapabilitySchema` 의 인터페이스 서술 필드가 `adapterRef: string` = **마크다운 경로** — 기계가 읽을 수 없다
- 전 매니페스트의 `$schema` URL 이 댕글링 (Zod→JSON Schema 방출기 부재)
- 이미 같은 결론이 `productization-roadmap.md` §3.1 에 있었다: *"조합은 세 표면으로만: contracts (Zod) / MCP server / endpoint (REST)"* — 오너의 *"api 같이"* 와 정확히 일치한다
