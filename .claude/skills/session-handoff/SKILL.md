---
name: session-handoff
description: 은퇴했다 — 세션 종료 인계는 `/modfolio-moon` 이 이어받았다(오너 2026-09-23 저녁 · ADR-029). 인계는 세션별 파일 `knowledge/handoff/<시각>-<slug>.md` 이고 다음 세션은 `/modfolio-sun` 으로 연다. 이 파일은 무엇이 어디로 갔는지를 남기기 위해 보존한다(단축어 /handoff 도 같다).
user-invocable: true
---

# /session-handoff — 은퇴 (2026-09-23)

> 오너(원문 비공개 — _quotes.md#WF-27): 어떤 시점에서든 하던 일을 바로 정리하고 상세 인계를 써서 즉시 다음 세션으로
> 넘어가는 마무리 명령을 따로 둔다 — 그것이 `/modfolio-moon` 이다.

**대신 이것을 쓴다:**

```bash
bun run modfolio:moon -- --slug <짧은-이름>     # 뼈대 → 서술 4칸 채우기 → --finish → gate:full → push
```

## 왜 은퇴했나

이 스킬은 절차 5단계를 **산문으로** 들고 있었다 — 효과가 스크립트에 없으니 세 도구(Claude·Antigravity·Codex)가 같은
일을 한다는 보장이 없었다(헌장 §Commands: 효과는 스크립트에 둔다). 그리고 인계를 한 파일(`knowledge/HANDOFF.md`)에
쌓아 136KB 까지 자랐고, 동시 세션이 서로의 판을 덮을 수 있었다.

## 단계가 어디로 갔나 (아무것도 조용히 버리지 않았다)

| session-handoff | 지금 |
|---|---|
| Phase 0–1 상태·컨텍스트 수집 | `modfolio:moon` 이 잰다 — 브랜치·미커밋·미푸시·영수증·하네스·effort·자율 루프·계획 파일·12시간 커밋·같은 체크아웃의 다른 세션 |
| Phase 2 사용자 질문 | 인계의 **결정 대기** 칸 + 다른 세션이 있을 때 «이 변경이 이 세션 것인가» 확인 |
| Phase 3 journal + 인계 prompt(dual-write) | 세션별 인계 파일의 서술 4칸. **붙여 넣을 prompt 가 필요 없다** — `/modfolio-sun` 이 최신 인계를 읽는다. `/journal` 은 작업 중 단일 기록으로 남는다 |
| Phase 4 stage·commit·push | `--finish`(인계 파일·색인만 커밋) → `gate:full` 단독 → push. 게이트 준비가 안 된 변경은 `wip/*` 브랜치 |
| claude-progress.txt 덧붙이기 | moon 스킬 8번 — 그대로 |
| 다중 repo 기기 이동 | `bun run handoff:prepare:apply` — 그대로 |

## 이 파일을 지우지 않는 이유

`initializer` 역할 문서·옛 저널·형제 문서가 이 경로를 가리킨다. 지우면 그 참조가 조용히 깨지고, 다음 사람이
«원래 없었다» 와 «이관에서 누락됐다» 를 구분할 수 없다.
