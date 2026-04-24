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

## 언제 사용

- 작업 세션 종료 시
- SDK 업그레이드 후
- 주요 의사결정 후
