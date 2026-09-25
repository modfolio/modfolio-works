---
name: preflight
description: 은퇴했다 — 이 역할은 `/modfolio` 가 이어받았다(오너 2026-09-22). 세션 시작 점검은 `bun run modfolio:compass` 하나로 한다. 이 파일은 무엇이 어디로 갔는지를 남기기 위해 보존한다.
user-invocable: true
---

# /preflight — 은퇴 (2026-09-22)

> 오너(원문 비공개 — _quotes.md#SK-04): preflight 는 은퇴하고, 가장 자주 쓰는 modfolio 스킬이 시작마다
> 생길 수 있는 불일치를 잡아 주며 개발을 이끈다.

**대신 이것을 쓴다:**

```bash
bun run modfolio:compass
```

## 왜 은퇴했나

둘로 갈라져 있던 것이 문제였다 — 규약 점검은 `/modfolio`, 환경 점검은 `/preflight`.
세션 시작에 **둘 다** 쳐야 했고 실제로는 자주 하나만 쳤다. 그리고 preflight 는
`check`·`typecheck`·`test` 를 **직접 돌려서** 느렸다(그 셋은 이미 `gate:quick` 의 일이다).

새 `/modfolio` 는 **돌리지 않고 증거를 읽는다** — 게이트 영수증·git 상태·currency 캐시.
그래서 시작점이 하나가 되고도 빨라졌다.

## 9항목이 어디로 갔나 (아무것도 조용히 버리지 않았다)

| preflight 항목 | 지금 |
|---|---|
| 1. MCP 연결 | `/modfolio` 준비 절에 **«미검사»로 명시** — 스크립트가 원리적으로 못 본다. 에이전트가 실패 서버를 보고한다 |
| 2. 의존성·lockfile | `verify:frozen-lockfile`(gate) + 카드의 lock·packageManager 줄 |
| 3. Lint/Format | `bun run gate:quick` — 브리핑은 **돌려야 할 때를 말한다**(영수증이 트리와 어긋나면) |
| 4. TypeScript | `bun run gate:quick` (위와 같음) |
| 5. Git 상태 | 카드의 branch/dirty + 브리핑의 원격 ahead/behind |
| 6. 환경변수·athsra | 브리핑의 시크릿 줄 — **«빈 `.env` 는 정상»** 오독 방지를 그대로 옮겼다. `athsra doctor` 는 의심될 때만 |
| 7. 테스트 | `bun run gate:quick` / `gate:full` |
| 8. Claude Code 버전 | 브리핑의 스택·트렌드 절(`currency.json` 의 local vs latest) |
| 9. `effortLevel` 유효성 | 브리핑의 준비 절 — **전역 설정 파일까지** 본다(재발 클래스라 유지했다) |

## 이 파일을 지우지 않는 이유

무엇이 어디로 갔는지가 여기 없으면, 다음 사람이 9항목 중 하나가 빠진 것을 발견했을 때
«원래 없었다»와 «이관에서 누락됐다»를 구분할 수 없다.
