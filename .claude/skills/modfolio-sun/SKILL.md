---
name: modfolio-sun
description: 세션을 연다 — 원격을 받고(안전할 때만 pull), 최신 인계·이어지는 일·형제 편지·도입할 것(하네스·스택·트렌드)·준비 불일치를 한 번에 모아 브리프로 남긴 뒤, 결정 질문을 오너에게 묻고 계획 모드에서 계획을 세워 승인받고 개발로 들어간다. 마무리는 /modfolio-moon, 언제든 정체성 점검은 /modfolio.
user-invocable: true
---

# /modfolio-sun — 세션 시작 → 계획

오너 2026-09-23 저녁(원문 비공개 — _quotes.md#WF-27 · ADR-029): 핸드오프를 확인해 이전 세션에서 이어지는 일, 형제에게서 온
메시지, 도입해야 할 것을 확인하고 **계획 모드에서 계획을 세워** 개발을 이어간다.

```bash
bun run modfolio:sun                                              # 허브·배선된 멤버
bun node_modules/@modfolio/harness/scripts/modfolio/sun.ts        # 스크립트가 없는 멤버
```

스크립트가 전부 모은다 — fetch(깨끗한 트리 + fast-forward 일 때만 pull) · 준비·불일치(effort 실효값 포함) · 자율 루프 ·
최신 인계(`knowledge/handoff/` 의 가장 늦은 항목) · 형제 편지 · 도입할 것 · **결정 질문**. 같은 내용을
저장소 **밖** `~/.modfolio/sessions/<repo>-<경로해시>/sun-brief.md` 에 남긴다(트리를 더럽히지 않는다 — 경로는 출력에 찍힌다). exit 0 = 브리프를 냈다 · 2 = 판정 불능(git 저장소가 아님 등).

## 당신이 할 일 (MUST — 스크립트 끝의 «다음 단계» 와 같다)

1. **`결정 질문` 을 오너에게 그대로 묻는다**(AskUserQuestion). 스크립트는 묻지 못한다. «지금 아님» 도 답이다 —
   보류로 기록한다. 묻지 않고 넘어가는 것이 이 명령이 없애려는 결함이다.
   답마다 **원문 그대로** 기록한다: `bun run modfolio:sun -- --answer <키> "<원문>"`(키 = 질문 앞 `[괄호]`).
   같은 사실에 대한 답이 있으면 다음 sun 은 묻지 않고 «이미 답함» 으로 보인다 — 같은 날 같은 질문을 또 묻는 것도 결함이다.
2. **계획 모드에 들어가기 전에** 계획에 필요한 명령을 전부 돌린다 — 이어지는 일마다 `bun run ai:suggest -- "<일>"`,
   기능이면 주인(`bun run modfolio:compass -- --intent "<일>"`). 다른 AI 를 제안하면 **이유·명령을 붙여 AskUserQuestion 으로
   yes/no** 를 묻는다(자동 분배 없음 · 오너 2026-09-24). ⚠ 계획 모드는 권한 모드를 바꾼다 — Desktop·SDK 표면은 bypass 여도
   계획 모드 안의 비읽기 명령(`bun run …` 포함)마다 승인을 묻는다(code.claude.com permission-modes · 2026-09-25 실측 «계획이
   무서워서 못 하겠다»). 그래서 명령은 **밖에서**, 안에서는 읽기만.
3. **계획 모드로 들어간다**(EnterPlanMode). 안에서는 **명령을 돌리지 않고** 브리프와 필요한 파일의 필요한 부분만
   Read·검색으로 읽는다(압축 창 400K · `context-residency.md` · _quotes.md#WF-32). 계획에 적는다: 목표 · 주인 ·
   받아들임 검사(반복 중 `gate:quick`, push 직전 `gate:full` 1회) · 리뷰(`bun run review:run` 이 L0~L3 로 가른다 ·
   전면 1회 + 수정분 확인 1회) · 위 2의 제안과 오너 답.
4. **ExitPlanMode 로 오너 승인**을 받고 개발한다. 마무리는 언제든 `/modfolio-moon`.

**무인·자율 모드**(`/modfolio-nonstop` 이 활성이거나 오너가 자리에 없다고 한 세션)에서는 묻지도 기다리지도 않는다 — 결정 질문은
원장의 «오너 대기» 에 적고, 계획은 원장 헌장 안에서 세운 뒤 이어간다(승인 대기로 루프를 멈추지 않는다).

`?` 는 «못 쟀다» 다 — 초록으로 요약하지 않는다. MCP 연결·훅 층은 스크립트가 못 본다 — 실패 서버를 보고하고
첫 Bash 로 `true # hook-probe`.

## 원격·다른 기기

인계는 git(두 원격)에 있다 — 어느 기기에서든 `/modfolio-sun` 이 같은 브리프를 다시 만든다. 트리가 더럽거나
앞선 커밋이 있으면 pull 하지 않고 알린다(같은 체크아웃의 다른 세션 WIP 를 덮지 않는다).

## 관련

- `/modfolio`(정체성·법칙 점검 · 언제든) · `/modfolio-moon`(마무리) · `/modfolio-nonstop`(자율 루프) · ADR-029
