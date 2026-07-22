# Agent Evidence — 주장 전 증거 확보 규칙

Agent가 사실을 주장할 때는 반드시 **명령 실행 결과**를 근거로 삼는다. 읽지 않고, grep 하지 않고 단정하지 않는다.

## 금지

- "X는 없음" / "0개 감지" / "구현 안 됨" 같은 절대 진술을 근거 없이 쓰지 않는다
- "아마 ~일 것" / "~로 추정" 같은 모호한 주장으로 결론을 대체하지 않는다
- 코드 경로·파일 존재 여부·함수 시그니처를 **기억으로** 말하지 않는다

## 요구

- **존재 여부**: `Glob` 또는 `ls` 결과를 인용
- **사용 위치**: `Grep` 명령 + 히트한 파일·라인 인용
- **행동 흔적**: `git log` / `git diff` 경로 제시
- **수치 주장**: 실행 명령 + 결과 수치 그대로 옮김 (예: `rg -n "pattern" | wc -l` → "N hits")

## 결과 부재일 때

- "확인되지 않았다 (명령 + 조건)" 톤을 기본으로 쓴다
- "없다"는 결론은 **negative 검증 시도 + 그 범위 명시** 이후에만 내린다
- 정보가 확실하지 않으면 사용자에게 질문하거나 조사 범위를 추가 노출한다

## 변경·상태 주장 (diff 읽기) — 오독 방지 (MUST)

"이 파일이 바뀌었다 / 키가 제거됐다 / 외부가 건드렸다 / 보안 이상" 같은 **변경 주장**은 특히 오독하기 쉽다(2026-07-04 `settings.json` 오경보 사건 — canon `managed-artifacts.md`). 강제:

- **구조화 파일(JSON/YAML/lockfile/재정렬된 파일)의 diff 는 line-diff 로 단정하지 않는다.** 포매터(biome `--write` 등)가 키 순서만 바꿔도 line-diff 는 대량 `-/+` 로 보인다. 반드시 **key-level 의미 비교**: `bun run json-diff <file> [ref]`. "키 제거/추가" 는 key-level 결과로만 말한다(빈 델타 = 포매팅 churn).
- **truncated diff(`| head`)로 결론 금지.** 판단 근거 diff 는 전체를 보거나 요약 도구를 쓴다.
- **에이전트-관리 파일**(`settings.json`·`settings.local.json`·`.mcp.json`·`biome.json`·lock·`memory/*`·CLAUDE.md sync 구간·`ecosystem.json packages`)의 세션 중 diff 는 **예상된 자동 churn** — 외부/침해/회귀로 단정하기 전 key-level + 이번 세션 에이전트 행위(편집·`--apply`·포맷)의 부산물인지 대조(카탈로그 = `managed-artifacts.md`).
- **사용자 경보(⚠) 전 반증 1스텝** — "제거됨/유실/외부 변경/보안 이상" 은 disconfirming 체크를 통과한 뒤에만, **근거 명령 결과를 인용해서** 발화한다. 근거 없이 "확인 필요"로 사용자를 놀라게 하지 않는다("고장 주장에도 증거" — 완료=증거의 쌍대, `knowledge/journal/20260703-fleet-completeness-session.md`).

## 이 규칙의 목적

gistcore 2026-04-16 피드백 (Issue #2): 3-agent 병렬 분석이 grep/Read 없이 "canon 미설정", "rate limiting 미구현", "optimize-skill 좀비" 같은 주장을 내보냈지만 실측과 불일치했다. 증거 없이 생성된 허위 결론은 **수정 판단을 오염**시키므로 정공법으로 차단한다.
