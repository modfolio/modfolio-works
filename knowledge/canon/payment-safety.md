---
title: Payment Safety — 자율 agent 무단 지출 차단 (다중 human approval + audit)
version: 1.1.0
last_updated: 2026-06-18
source: [2026-06-14 사용자 요청 — AI 자율 결제로 회사 파산 사례; 산업 표준 Rain Agent Control Layer / Coinbase Agentic Wallets / Privacy cards = spend cap + operation allowlist + multi-party approval + audit, txn 전 차단]
sync_to_siblings: true
applicability: always
consumers: [ops, deploy, release, preflight]
---

# Payment Safety

> **자율 agent 는 사람의 반복(다중) 승인 없이 돈을 쓰거나 유료 서비스를 개시하지 못한다. 결정적 hook 으로 txn 전에 차단한다 (LLM 필터 아님 — 5% 우회). 자율/무인 모드는 승인 경로 자체가 없다 (하드 차단).**

## 1. 위협 모델 + 정직한 범위 경계

`pre-payment-guard.ts` 는 PreToolUse(Bash + outward MCP) hook 이다.

- **IN SCOPE (hook 이 보는 것)**: agent 가 `Bash`/outward-MCP 로 *세션·headless 실행 중* 트리거하는 지출 — live 결제 CLI/curl, 유료 자원 provisioning, 도메인 구매, 미터링 외부 유료 호출.
- **OUT OF SCOPE (hook 이 못 보는 것)**: 배포된 앱 코드의 **런타임** 결제(Worker 가 prod 에서 Stripe 호출), 명령 없이 청구주기에만 발생하는 비용, MCP/브라우저로 목적지가 안 드러나는 경로. 이건 `cost-attribution.md`(사후 관측)만이 그물 — **dev-time hook 은 billing firewall 이 아니다.**

deploy(`wrangler deploy`) 자체는 게이트하지 않는다 — 표준 배포는 CF Workers Builds(git push)이고, 신규 **billable 자원 생성**(`wrangler … create`)·**결제**·**미터링 호출**만이 파산 벡터다.

## 2. 정공법 — 결정적 게이트

기본 권한모드가 `bypassPermissions`(zero approve-prompt)라 **결정적 hook 이 유일한 안전망**이다. 5% adversarial 이 우회하는 LLM guardrail 에 의존하지 않는다. `governance.ts checkPaymentSafety()` 가 소스의 unguarded live-payment 패턴을 정적 보강.

## 3. 심각도 등급 → 승인 횟수 (대화형)

| 등급 | 예 | 승인 |
|---|---|---|
| **critical** | live 결제 API(`stripe`/`toss`/`paddle`/`square`/`adyen`/`razorpay`/`paypal`/`mollie` …, `sk_live_`, `curl …api.stripe.com -d`), 도메인 구매, crypto 송금 | **3회** |
| **high** | 유료 CF 자원 생성(`wrangler r2/d1/kv/queues/hyperdrive/pages create`), IaC apply(terraform/pulumi/sst/cdk), 클라우드 provisioning(`aws`/`gcloud`/`az … create`/`run-instances`), 비-CF 배포(`vercel`/`netlify`/`railway`/`fly`/`render`), `gh codespace create`/`billing`, payment-capable MCP | **2회** |
| **medium** | 미터링 외부 유료(`resend`/`twilio`/`huggingface`/`replicate`/`openai`), `gh workflow run`(Actions 분) | **1회** |

> 사용자 결정(2026-06-14): medium 도 대화형에서 차단(경고만 아님). `claude -p` 는 **제외** — loop/ralph 엔진이 정당하게 spawn(대량 LLM 비용은 그 엔진들의 max-iteration cap 으로 통제).
> **분류는 per-segment (quote-aware, v1.1)** — 명령을 shell separator(`;`·`&&`·`|`·newline)·comment(`#`)로 쪼개 각 세그먼트 독립 분류하되, **따옴표(`'`/`"`) 안의 separator·`#`·명령 텍스트는 데이터**로 취급(셸 파싱 정합). 그래서 `git commit -m 'wrangler r2 bucket create'`(메시지=데이터)는 한 git 세그먼트→inert→통과, `bash -c 'stripe charges create'`(셸이 따옴표 안을 실행)는 차단. inert-leading(`echo`/`grep`/`cat`/`git` 등 — `git`=돈 0, `-m` 메시지는 데이터; **`gh` 는 비-inert**) 세그먼트는 skip. → 디코이 우회(`stripe charges create # sk_test_`) 불가 + `echo 'terraform apply'`·커밋메시지 리터럴 오탐 없음. curl 은 순서 무관(curl+write-verb+host 독립 매칭).
>
> **MCP 분류 (v1.1)** — `mcp__athsra__*`(universe 시크릿 스토어)는 결제 surface 아님 → MCP_PAYMENT 매칭 skip(프로젝트명 `modfolio-pay` 의 `pay` 읽기전용 키조회 오탐 제거). 예외 `mcp__athsra__athsra_run` 은 secret 주입 후 임의 명령 실행 → 프로젝트명이 아니라 **주입 command+args 를 Bash 규칙으로 검사**(`wrangler r2 bucket create` 등 args 누락 보안갭 차단). 그 외 결제-capable MCP(`mcp__stripe__*` 등)는 이름/페이로드 키워드로 차단. (athsra 흡수 2026-06-18, b6935a0·552c8aa)

## 4. 승인 핸드셰이크 — bar-raising + detection (정직: 완전 prevention 아님)

차단 시 hook 이 사람이 읽을 지시 + 명령 해시 출력. **유효 승인 = 사람이 별도 터미널에서** `<repoRoot>/.claude/payment-approval.json` 생성:

```json
{ "command_sha256": "<hook 이 출력한 해시>",
  "expires_at": "<미래 ISO, 10분 이내>",
  "approvals": [ {"by":"alice","at":"ISO"}, {"by":"bob",…}, … N개 distinct ] }
```

검증(강화): `command_sha256` 일치(scope) + `expires_at` 미래 **AND 현재+10분 이내**(standing grant 금지) + **N개 DISTINCT named** `{by,at}`(bare `[1,2,3]`·중복 이름 불인정). **single-use** — 성공 소비 시 토큰 삭제(replay 불가, 다음은 새 승인).

**결정적 방어 레버 = `permissions.deny`**: `bypassPermissions` 에서도 `deny` 살아있음(deny > bypass). 모든 sibling settings 에 `Write`·`Edit`·**`Bash(*payment-approval.json*)`** deny → agent 의 Write/Edit + 순진한 Bash 리다이렉트(`echo >`/`tee`/`cp`) 차단.

### 정직한 한계 — 이건 bar-raising, full prevention 아님

- **Bash 가능 agent 는 끝내 위조 가능**: hook source 를 읽어 형식을 알고, quoting 으로 deny 를 우회(`payment-app''roval.json`)해 distinct-named 토큰을 forge 할 수 있다. 강화(distinct·10분·single-use·Bash-deny)는 **bar 를 크게 높이고 모든 시도를 audit** 하지만, 파일 기반 토큰을 Bash-capable agent 에 대해 **완전 agent-proof 로 만들 수는 없다**.
- **실제 prevention 은 세 레그**: ① 자율/무인 모드 **하드 차단**(§5 — 토큰 무시, 경로 없음) ② human-in-the-loop(사람이 block 을 보고 비-agent 터미널에서 승인) ③ 전수 audit(`memory/payment-approvals.jsonl`, tracked + 디바이스 간 전송). full closure 의 유일 레그 = **사람이 비-agent 터미널에서 생성**.
- 사람이 settings 에서 deny 제거 / `PAYMENT_GUARD_MODE=off` = "자기 화재경보 끄기" — 허용된 경계.

## 5. 자율/무인 모드 = 하드 차단 (승인 경로 없음)

cron(`/schedule`)·`/ralph-loop`·`/loop` self-driving = 사람 부재 → **모든 등급 하드 차단, 승인 토큰 무시**. `lethal-trifecta.md` ("cron/autonomous 시 자동 승인 X") 정합.
- 검출: `MODFOLIO_AUTONOMOUS=1`(loop/ralph/schedule 엔진이 export) 또는 `CI=true`.
- **Fail-safe**: 마커가 없어도, 무인 실행엔 토큰 생성할 사람이 없으므로 승인 파일 부재 → 그냥 차단. 마커는 *명확한 메시지*를 위한 것이지 보안 경계가 아니다 (경계 = "유효 토큰 없으면 차단").

## 6. 유료 서비스 caution 리스트

live 결제(Stripe/Toss/PayPal), 유료 CF 자원(`wrangler r2/d1/kv/queues/hyperdrive/vectorize create`), IaC(terraform/pulumi/sst/cdk apply), 도메인 등록, crypto/wallet 송금, 미터링(Resend/Twilio/HuggingFace/Replicate). 안전 등가물(allowlist): `--dry-run`, test key(`sk_test_`), 로컬 emulator(`wrangler dev`·miniflare), `stripe (listen|trigger|get|list)`, read-only `wrangler … (list|get|info)`.

## 7. Audit (디바이스 간 전송 + 무충돌 병합)

`memory/payment-approvals.jsonl` — 1줄/이벤트: `ts,event(blocked|denied-autonomous|consumed|approved|warned),vector,severity,command_sha256,command_preview,mode,autonomous,approvals_count`. audit 실패는 절대 차단 안 함.

- **TRACKED (git)** — 감사 추적은 forensic 자산이라 디바이스 간 전송돼야 함. `.gitattributes` 의 `memory/*.jsonl merge=union` 으로 append-only 줄이 머지 시 **충돌 없이 concatenate**(각 줄이 timestamp 포함 self-contained event). dedup 필요 시 `/dream` consolidation 이 처리.
- **테스트 격리** — hook 의 audit 경로는 `PAYMENT_AUDIT_PATH` env 로 override(기본 `<repo>/memory/payment-approvals.jsonl`). 테스트는 temp 로 redirect → tracked 로그 무오염.
- **토큰은 반대** — `.claude/payment-approval.json`(승인 토큰)은 절대 commit/transfer 금지(gitignored): 전송되면 다른 디바이스에서 만료 전까지 자동 승인.

## 8. Allowlist

`.claude/rules/payment-allowlist.json` (lethal-trifecta-allowlist 동형: `{file/pattern, reason, approved_by, approved_at, revisit_after}`). 분기 review, justification 필수.

## 9. GHA-free 보강

`.github/workflows/*` 생성은 `pre-gha-workflow-notice.ts` 가 write-time 경고(차단 아님) + CF Workers Builds/Forgejo 안내(`gh-actions-policy.md`). 유료 분 소비는 push 후 GitHub 측이라 dev hook 이 직접 못 막음 — `delta-audit` 백스톱 + `/release` 하드게이트.

## 관련

- `.claude/rules/lethal-trifecta.md` — outward 통신(결제 포함) 의 자매 룰. trifecta="secret 유출"(3조건 동시), payment-safety="돈 이동"(spend 단독 무조건) — 상호보완.
- `knowledge/canon/cost-attribution.md` — 사후 비용 관측 (런타임 지출의 유일 그물).
- `knowledge/canon/gh-actions-policy.md` — GHA 유료 분 0.
- `.claude/rules/secrets-policy.md` — leak 된 live key = 지출 위험, 즉시 로테이션.
- `scripts/hooks/pre-payment-guard.ts` · `scripts/modfolio/governance.ts checkPaymentSafety`.
