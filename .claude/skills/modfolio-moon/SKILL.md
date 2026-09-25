---
name: modfolio-moon
description: 언제든 세션을 바로 정리한다 — 상태를 재고(브랜치·미커밋·미푸시·영수증·하네스·effort·자율 루프·같은 체크아웃의 다른 세션), 세션별 인계 파일(knowledge/handoff/<시각>-<slug>.md)의 사실 칸을 채운 뼈대를 만들고, 서술 4칸(한 일·다음 할 일·결정 대기·지뢰)을 채워 커밋 → 게이트 → push 한다. 정비(하네스·설치·버전업)는 보고하고 오너가 고른 것만 적용한다.
user-invocable: true
---

# /modfolio-moon — 언제든 마무리 → 다음 세션

오너 2026-09-23 저녁(원문 비공개 — _quotes.md#WF-27 · ADR-029): 어떤 시점에서든 하던 일을 바로 정리하고, 상세 인계를
쓰고, 넘어가기 전에 업데이트·설치·버전업할 것을 처리해 즉시 다음 세션으로 넘어간다.

```bash
bun run modfolio:moon -- --slug <짧은-이름>                       # 뼈대 (허브·배선된 멤버)
bun node_modules/@modfolio/harness/scripts/modfolio/moon.ts --slug <이름>   # 스크립트가 없는 멤버
```

## 당신이 할 일 (MUST)

1. **새 작업을 시작하지 않는다.** 이 명령의 목적은 경계를 긋는 것이다.
2. 스크립트가 만든 인계 파일의 **서술 4칸만** 채운다(사실 칸은 이미 찼다 · 전체 ≤80줄 · 로그를 붙이지 않는다):
   **한 일**(증거와 함께 · 안 끝난 것도 숨기지 않는다) · **다음 할 일**(우선순위 · 첫 명령을 바로 칠 수 있게) ·
   **결정 대기**(없으면 «없음») · **지뢰**(없으면 «없음»). 진행 중인 계획 파일이 있으면 그 요지를 옮긴다.
3. 같은 체크아웃에 **다른 세션**이 있다고 나오면, 인계 밖 변경을 커밋하기 전에 «이 변경이 이 세션 것인가» 를 오너에게 묻는다.
4. **moon 은 코드를 통합하지 않는다.** 인계 밖 미커밋 변경은 `bun run modfolio:moon -- --wip` 로 `wip/<시각>-<slug>` 에
   남긴다 — 브랜치는 옮기지 않고, push 전에 보내는 커밋의 비밀 스윕을 돌리고, 원격 도달을 확인한 뒤 그 변경을 작업 트리에서
   걷어 HEAD 로 되돌린다(게이트가 push 할 내용만 재게 · 스냅숏 뒤에 바뀐·부분 스테이징된 파일과, 다른 세션이 있거나 세션을 잴 수 없는(`/proc` 없는 호스트) 체크아웃은 건드리지 않는다 —
   그때 걷으려면 `--park`).
   출력되는 되살리기 명령(`git fetch origin <브랜치> && git cherry-pick --no-commit FETCH_HEAD`)을 인계 «다음 할 일» 에 적는다. 통합은 다음 세션에서 `review:run` → `gate:full` → push 다. **로컬에만 남기지 않는다.**
5. **정비는 보고 → 오너가 고른 것만 적용**(하네스 새 버전·lock 변화 뒤 설치·도구 버전). 무인·자율 모드에서는 기록만.
   effort 예외가 켜져 있으면 되돌리는 명령이 나온다(`bun run modfolio:effort -- --apply`).
6. `bun run modfolio:moon -- --finish` — 4칸이 비었으면 거부하고, 찼으면 인계 파일·색인**만** 커밋한다.
7. `bun run gate:full` **단독 실행 → exit 로 분기** → 0 이면 `git push`(두 원격 도달을 `git ls-remote` 로 확인) · 강제 push 금지.
   실패하면 고쳐서 다시 돈다 — 못 고치면 그 사실을 인계 «지뢰» 에 적고 코드 변경은 `--wip` 로 남긴다. 인계 밖 **미푸시 커밋**이
   있다고 나오면 그 후보가 `review:run` 승인을 받았을 때만 push 한다(아니면 push 하지 않고 다음 세션에서 리뷰한다).
8. 자율 루프가 활성이면 `bun run modfolio:nonstop -- close "<사유>"`. 배운 판단 원리가 있으면 `/debrief` 1장.
   task 루트에 `claude-progress.txt` 가 있으면 이번 세션 항목을 덧붙인다(canon `long-running-harness.md`).
9. 오너에게 전한다: 다음은 **새 세션에서 `/modfolio-sun`** — 원격에서 새 세션이 불편하면 `/compact` 로 같은 세션을
   이어간다(압축 뒤 재개 카드가 이 인계를 가리킨다). ⚠ **자율 루프 중에 컨텍스트가 길어진 것은 moon 의 이유가 아니다** —
   그때는 `/compact` 로 같은 루프를 잇는다(moon 8단계의 close 가 루프를 끝낸다).

여러 repo 를 들고 기기를 옮길 때는 `bun run handoff:prepare:apply`(다중 repo WIP 검증)를 따로 쓴다.

## 왜 세션별 파일인가

한 파일에 쌓던 인계(`knowledge/HANDOFF.md`)는 136KB 까지 자랐고, 동시 세션이 서로의 판을 덮을 수 있었다.
세션마다 파일을 나누면 충돌이 없고 크기가 쌓이지 않는다. `knowledge/HANDOFF.md` 는 moon 이 만드는 **작은 색인**이다
(옛 누적 파일이면 건드리지 않고 알린다). 순서는 파일명 시각이다(mtime 아님).

## 관련

- `/modfolio-sun`(시작 → 계획) · `/modfolio`(정체성·법칙 점검) · `/journal`(작업 중 단일 기록) · `/debrief` · ADR-029
