---
title: Concurrency Safety — race·partial write·멱등의 어휘와 게이트
version: 1.0.0
last_updated: 2026-07-04
source: [2026-07-04 오너 요청 "이런 거 하네스에 주의하라고 세팅 뭘 할 수 있나" (vibecoded 2대 버그 영상 분석), 같은 날 실측 사건 2건 — feedback 인박스 lost update(scripts/feedback-send.ts 날짜 파일명 덮어쓰기) + connect findings 세션 교차 재작성, modfolio-infra 20260703 저널 "동시성 사고", knowledge/canon/billing-architecture.md §4 결정적 멱등키 선례]
sync_to_siblings: true
applicability: always
consumers: [api, schema, multi-review, security-scan]
---

# Concurrency Safety — race·partial write·멱등의 어휘와 게이트

> **이름 없는 버그는 리뷰에서 보이지 않는다.** 동시성 버그는 의미론적이라 결정적 훅(grep)으로 못 잡는다 —
> 그래서 이 어휘를 **사람 기억이 아니라 게이트**(이 canon → 멤버 CLAUDE.md 상주 + code-reviewer 렌즈 + api/schema 생성 체크리스트)에 박는다.
> 로컬(1인·1탭)에서는 구조적으로 재현되지 않는다 — "노트북에서 잘 됨"은 증거가 아니다.

## 언제 이 렌즈를 켜는가 (트리거)

**돈·크레딧·재고·좌석·카운터·상태머신을 "읽고 → 판단하고 → 쓰는" 코드**가 보이면 무조건. 특히: 결제/차감, 수량 감소, 슬롯 예약, 상태 전이(pending→paid), 웹훅 소비, 다중 테이블 write, 외부 API 호출이 낀 write.

## 어휘 5개 (결정 트리 순서)

| # | 어휘 | 언제 | 핵심 |
|---|---|---|---|
| 1 | **atomic conditional update** | 한 문장으로 끝낼 수 있으면 항상 이것부터 | `UPDATE … SET stock = stock-1 WHERE id=? AND stock > 0` — 읽기·검사·쓰기를 DB 한 문장으로. 앱에서 read-check-write 3단계로 쪼개는 순간 갭(TOCTOU)이 생긴다. 영향 행 수(0이면 실패)로 성공 판정 |
| 2 | **transaction** | write 가 2개 이상이면 | all-or-nothing — partial write(차감은 됐는데 주문이 없음) 방지. atomic update 는 race 만 막지 partial write 는 못 막는다 — 둘은 별개 버그 |
| 3 | **row lock (`SELECT … FOR UPDATE`)** | 다단계 read-modify-write 를 한 문장으로 못 접을 때 (tx 안에서) | 읽는 순간부터 행을 잠가 남이 대기. **Neon(Postgres) 전용** — D1 에는 없다 (아래 번역표) |
| 4 | **unique constraint** | 중복이 비즈니스 오류인 모든 곳 | **최후 방어선** — 앱 로직이 전부 뚫려도 DB 가 두 번째 insert 를 거부. 멱등키·주문번호·(userId, resourceId) 조합에 필수. 사실상 첫 번째 선택지 |
| 5 | **outbox** | write 와 외부 호출(결제 API·웹훅 발송·이메일)이 한 흐름일 때 | 외부 호출은 트랜잭션에 못 넣는다(롤백 불가) — DB 에 의도(outbox row)를 커밋하고 별도 워커가 발송+재시도. partial write 의 분산 버전 해법. modfolio-pay 가 실사용 |

## 멱등키 2원칙 (통설의 함정 2개)

재시도는 클라이언트만 하지 않는다 — 브라우저 더블클릭, 앱 재시도, **웹훅 재전송**(소비자측 멱등 필수), 큐 재배달. 멱등키는 필수인데, 흔한 통설 구현엔 함정이 둘 있다:

1. **결정적 생성 — "프론트 랜덤 문자열" 금지.** 키는 작업/주문 ID 기반으로 결정적으로(`umbracast:convert:${jobId}` — `billing-architecture.md` §4, 랜덤·타임스탬프 금지). 랜덤 키는 키를 잃어버리는 재시도(서버측 재시도·재부팅 후 재요청)에 무력하다.
2. **키 예약 자체가 원자적이어야.** "키 조회 → 없으면 실행 → 결과 저장"(check-then-act)은 **그 자체가 TOCTOU race** — 동시 도착한 두 요청이 둘 다 "없음"을 읽고 둘 다 실행한다. 올바른 구현 = 멱등키 컬럼에 **unique constraint** + `INSERT … ON CONFLICT DO NOTHING` 으로 선점(첫 write 승리), 진 쪽은 저장된/진행중(pending) 결과를 따른다.

## 플랫폼 번역표 (universe 필수 — 어휘를 그대로 이식하면 오답)

| 플랫폼 | 가용 도구 | 주의 |
|---|---|---|
| **Neon (Postgres)** — pay·pdgd 등 | 5개 어휘 전부. `FOR UPDATE`, `ON CONFLICT`, serializable tx | 표준 교과서 그대로 적용 |
| **D1 (SQLite)** — connect·athsra 등 | 조건부 UPDATE(원자) · `batch()`(원자 묶음) · `INSERT OR IGNORE`/`ON CONFLICT` · unique constraint | **`FOR UPDATE` 없음**, 인터랙티브 tx 제약. 다단계 직렬화가 정말 필요하면 **Durable Object** 가 그 행의 단일 작성자. "D1 에 row lock 쓰세요"는 hallucination |
| **Workers 런타임** | — | isolate 수백 개 병렬 + 전역 메모리 공유 없음 → in-memory 뮤텍스/캐시로 race 를 "해결"했다는 코드는 전부 오답. 조정은 DB/DO 에서만 |
| **웹훅/이벤트 소비자** | event_id 기반 dedupe (unique constraint) | 발송측이 재시도하므로 **소비자가** 멱등이어야 — `contracts/` 이벤트의 소비 핸들러 공통 요건 |

## 멀티세션 개발 수칙 (Claude Code 창 여러 개 = 그 자체가 동시 시스템)

여러 repo 를 여러 세션으로 병렬 개발하는 것은 안전하다 — **Hub-not-enforcer 가 곧 동시성 설계**라서다: 세션은 남의 repo 에 쓰지 못하므로 공유 쓰기 표면이 3개뿐이고 각각 잠금이 있다.

| 공유 쓰기 표면 | 잠금 | 규율 |
|---|---|---|
| git remote | git 자체 (non-fast-forward 거부 = 낙관적 잠금) | push 실패 시 pull→merge, force 금지 (기존 불변) |
| athsra worker | D1 strong consistency + CAS | — (설계됨) |
| ecosystem `feedback/` 인박스 | **없음 — 유일한 raw 공유-쓰기 표면** | **append-only**: 기존 파일 덮어쓰기 금지. 같은 날 재전송은 새 파일명(harness 3.17.1+ feedback-send 가 자동 처리). 수동으로 인박스 파일을 고쳐 쓸 땐 새 파일 추가 |

- **같은 repo 를 Claude Code 창 2개로 열지 않는다** — 특히 ecosystem(SESSION-LEDGER 는 단일 작성자여야). 서로 다른 repo 는 창 몇 개든 무방.
- hub 세션은 커밋 직전 `git status` 로 인박스 신규/변경 유입을 확인한다(작업 중 sibling 세션이 인박스에 쓸 수 있음 — 정상 동작이며, 쓸어담지 말고 별도 인지 후 처리).

## 반-패턴

- ❌ 앱 코드에서 read → if → write 3단계 (한 문장 조건부 UPDATE 로 접을 수 있는데도)
- ❌ atomic update 만 하고 두 번째 write(주문 생성)를 tx 밖에 — partial write 잔존
- ❌ 멱등키를 "조회 후 실행"으로 검사 — 예약이 원자적이지 않으면 멱등이 아니다
- ❌ 랜덤/타임스탬프 멱등키 — 재시도가 같은 키를 못 낸다
- ❌ Workers 에서 in-memory lock/캐시로 동시성 "해결" — isolate 간 공유 안 됨
- ❌ D1 에 `FOR UPDATE` 제안 — 존재하지 않음, DO 직렬화 또는 조건부 UPDATE 로
- ❌ "로컬에서 재현 안 되니 수정 완료" — 동시성 버그는 로컬 1-유저에서 구조적으로 안 보임. 검증은 동시 요청 시뮬(Promise.all 2발) 또는 제약(unique) 존재 증명으로

## 관련

- `billing-architecture.md` §4 — pay debit 의 atomic+멱등 계약(결정적 키 선례)
- `.claude/agents/code-reviewer.md` 동시성 렌즈 · `/api`·`/schema` 생성 체크리스트 · `/multi-review`·`/security-scan` 리뷰 차원
- `fact-ownership.md` — 같은 철학(사람 기억 → 시스템), 도입 이력은 journal `20260704-fact-ownership-session.md`
