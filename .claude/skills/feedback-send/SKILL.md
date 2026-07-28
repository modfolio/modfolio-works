---
name: feedback-send
description: 마지막 피드백 전송 이후의 변경/결정/발견을 modfolio-ecosystem에 전달. 작업 완료 후 사용
user-invocable: true
---

# /feedback-send

**이 스킬은 스크립트를 실행하는 것이 전부다.**

## 실행

```bash
bun run feedback-send
bun run feedback-send --dry-run  # 미리보기
```

package.json에 없으면:

```bash
bun ../modfolio-ecosystem/scripts/feedback-send.ts
```

## 스크립트가 하는 일

1. 마지막 send 이후 git 커밋 수집
2. 의존성 변경 감지 (SDK, framework 등)
3. 스키마/테스트 변경 감지
4. `<ecosystem>/feedback/{repo}/` 에 구조화된 JSON 작성 (legacy host folder 이름이 `modfolio-universe` 여도 `ECOSYSTEM_FOLDER_CANDIDATES` fallback 으로 자동 탐색)
5. 타임스탬프 갱신

## 산문 보고서를 함께 보낼 때 — 파일명 규칙 (2026-07-28 신설)

스크립트가 쓰는 JSON 은 커밋 델타뿐이다. 판단·근거·실측을 담은 **산문 보고서**를 같은
디렉터리에 직접 쓸 때는 이 이름을 쓴다:

```
<ecosystem>/feedback/<내 repo>/<내 repo>-finding-YYYY-MM-DD[-HHMM]-<slug>.md
예) athsra-finding-2026-07-28-1430-ts7-adoption.md
```

그리고 **첫 줄에 화자를 적는다**:

```markdown
# <내 repo> → ecosystem · YYYY-MM-DD · <한 줄 제목>
```

### ⚠ `ecosystem-opinion-*` 는 쓰지 않는다 — 허브 회신 전용 이름이다

`feedback/<repo>/ecosystem-opinion-*.md` 는 **허브가 그 repo 에 보내는 회신**의 이름이다.
멤버가 자기 발신에 그 이름을 쓰면 파일명만으로 방향이 갈리지 않아, 다음 세션이
*"허브가 이미 회신했다"* 로 읽는다. 2026-07-28 실측에서 **12 파일**이 그 상태였고, 그 결과
허브 펄스가 인바운드를 25건이라 셌지만 실제 미회신은 10건이었다.

> 이건 멤버 잘못이 아니라 허브 문서의 공백이었다 — canon `evergreen-principle.md` 가 그 경로를
> **허브 시점 문장 그대로** 미러하는데 이 스킬엔 md 이름 규칙이 아예 없었다. 그 공백을 canon
> 문장이 메웠다.

**하위호환**: 허브 도구는 파일명이 아니라 **첫 줄 화자**로 방향을 판정하므로(구현 =
`scripts/lib/feedback-direction.ts`), 옛 이름으로 보내도 인바운드로 처리된다. 새 이름은
사람이 디렉터리를 훑을 때를 위한 것이다.

**수명**: 대시 날짜(`2026-07-28`)를 쓰면 `feedback-archive` 가 7일 뒤 `feedback-archive/`
로 옮긴다(허브 회신은 컴팩트 날짜라 남는다 — 멤버가 언제든 다시 읽을 수 있도록).

## 언제 사용

- 작업 세션 종료 시
- SDK 업그레이드 후
- 주요 의사결정 후
