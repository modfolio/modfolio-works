---
title: Microsoft Graph SDK 통합 — Personal MSA + OAuth refresh token
version: 1.1.0
last_updated: 2026-04-27
source: [Option A 결정 2026-04-27, M365 Family 자산 활용 Phase 2/3, https://learn.microsoft.com/en-us/graph/, multi-device .env.local 정공법 보강 2026-04-27]
sync_to_siblings: true
consumers: [ops, new-app]
applicability: per-app-opt-in
---

# Microsoft Graph SDK 통합 — Personal MSA + OAuth refresh token

M365 Family (Personal Microsoft Account, MSA) 의 자산 (OneDrive, Excel, Outlook, Calendar, OneNote) 을 코드로 자동화. CF Worker scheduled job / WSL2 cron / GitHub Actions 어디서든 동일 패턴.

## Personal MSA vs Enterprise tenant 제약

| 자산 / endpoint | Personal MSA (M365 Family) | Enterprise tenant (Business/Edu) |
|---|---|---|
| OneDrive `/me/drive` | ✅ | ✅ |
| Excel `/me/drive/items/{id}/workbook` | ✅ | ✅ |
| Outlook Mail `/me/messages` | ✅ | ✅ |
| Calendar `/me/calendar/events` | ✅ | ✅ |
| OneNote `/me/onenote/notebooks` | ✅ | ✅ |
| Contacts `/me/contacts` | ✅ | ✅ |
| **Forms `/me/forms`** | ❌ | ✅ |
| **SharePoint `/sites`** | ❌ | ✅ |
| **Teams `/me/joinedTeams`** | ❌ | ✅ |
| **Planner `/me/planner`** | ❌ | ✅ |
| **App-only (client credentials)** | ⚠️ 매우 제한적 | ✅ |

**핵심**: M365 Family 는 user-delegation OAuth 만 안정적. CF Worker scheduled job 도 사용자가 1회 OAuth consent → refresh_token 보관 → 자동 갱신 흐름.

**Forms 우회**: Forms API 미지원 → Forms 가 응답을 Excel 워크북으로 자동 sync 하는 기능 활성 → Graph Excel API 로 워크북 read.

## Microsoft Entra App Registration (사용자 영역, 1회 15분)

### 1. App 등록

1. https://entra.microsoft.com/ 접속 (Personal Microsoft 계정으로 sign in — M365 Family 결제 계정)
2. **좌측 메뉴 → Identity → Applications → App registrations → New registration**
3. **Name**: `modfolio-graph-integration` (또는 자기 도메인 명)
4. **Supported account types**: 가장 안전한 옵션 → **"Accounts in any organizational directory and personal Microsoft accounts (Multitenant) - for applications and Microsoft account users"**
   - Personal MSA 만 쓰는 경우 "Personal Microsoft accounts only" 도 OK
5. **Redirect URI**: 
   - Platform: **Web**
   - URI: `http://localhost:18181/auth/callback` (개발/CLI 용)
   - 추가 가능: `https://<your-worker>.workers.dev/auth/callback` (CF Worker 배포 시)
6. **Register** 클릭

### 2. 받을 정보 (사용자가 메모)

App overview 페이지에서:

| 필드 | 위치 | 예시 |
|---|---|---|
| **Application (client) ID** | Overview 상단 | `12345678-aaaa-bbbb-cccc-1234567890ab` |
| **Directory (tenant) ID** | Overview 상단 (Personal MSA = `9188040d-6c67-4c5b-b112-36a304b66dad`) | 자동 |

### 3. Client secret 생성

1. **Certificates & secrets → Client secrets → New client secret**
2. **Description**: `modfolio-ecosystem-2026`
3. **Expires**: `12 months` 또는 `24 months` (최대 24)
4. **Add** 클릭
5. **⚠️ "Value" 컬럼 즉시 복사 — 페이지 떠나면 다시 못 봄**
   - 형식: 길이 ~40 random 문자열, `~` 포함

이 값이 `MS_CLIENT_SECRET` 입니다.

### 4. API permissions 추가

1. **API permissions → Add a permission → Microsoft Graph → Delegated permissions**
2. 추가할 scope (modfolio 운영 기준):
   - `User.Read` (필수, 자동)
   - `offline_access` (필수, refresh token 발급)
   - `Files.ReadWrite.All` (OneDrive 파일 read/write)
   - `Mail.Send` (선택, alias 발신 시)
   - `Calendars.ReadWrite` (선택)
3. **Grant admin consent** — Personal MSA 는 admin consent 불필요, OAuth flow 시 사용자가 consent

## 환경변수 (athsra 보관, canon `secret-store.md` v1.13+)

각 repo 의 athsra project 에 등록:

```bash
# Microsoft Entra App Registration (https://entra.microsoft.com)
athsra set <repo> MS_CLIENT_ID="<step 2 의 Application ID>"
athsra set <repo> MS_CLIENT_SECRET="<step 3 의 secret value>"

# Personal MSA = consumers, multi-tenant = common
athsra set <repo> MS_TENANT="consumers"

# OAuth init 후 발급 (아래 § OAuth flow 참조)
athsra set <repo> MS_REFRESH_TOKEN="<m365-auth-init.ts 실행 후 발급>"
```

athsra 가 즉시 ciphertext 로 저장 — 별도 `dotenvx encrypt` 단계 불필요. `athsra run <repo> -- <cmd>` 형태로 주입.

## OAuth flow — refresh token 발급 (사용자 1회)

### scripts/ops/m365-auth-init.ts 실행

```bash
# 1. athsra 환경변수 주입 + 실행
athsra run <repo> -- bun run scripts/ops/m365-auth-init.ts

# 2. 콘솔에 표시되는 URL 을 브라우저에서 열기
#    https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?...

# 3. Microsoft 계정 login + consent (Files.ReadWrite.All 등 권한 승인)

# 4. 자동 redirect → http://localhost:18181/auth/callback
#    스크립트가 access_token + refresh_token 받음

# 5. refresh_token 을 콘솔에 출력 → athsra 에 등록
athsra set <repo> MS_REFRESH_TOKEN="<5 의 출력값>"
```

### refresh_token 의 수명

- **유효 기간**: 90 일 (active 사용 시 자동 갱신)
- **revocation**: 사용자가 https://account.live.com/consent/Manage 에서 수동 revoke 가능
- **로테이션**: 90 일 idle 또는 password 변경 시 무효화 → m365-auth-init 재실행

## 코드 패턴 — `scripts/ops/lib/m365-graph.ts`

ecosystem 의 공통 lib 가 다음을 제공:

```ts
import { createGraphClient } from "./lib/m365-graph";

const graph = await createGraphClient({
  clientId: process.env.MS_CLIENT_ID!,
  clientSecret: process.env.MS_CLIENT_SECRET!,
  refreshToken: process.env.MS_REFRESH_TOKEN!,
});

// OneDrive: 파일 upload (small, < 4 MB)
await graph.api("/me/drive/root:/Apps/modfolio/test.txt:/content")
  .put("Hello from modfolio");

// OneDrive: 파일 list
const items = await graph.api("/me/drive/root:/Apps/modfolio:/children").get();

// Excel: 시트 cell update
await graph.api("/me/drive/root:/Apps/modfolio/cost.xlsx:/workbook/worksheets/Sheet1/range(address='A1')")
  .patch({ values: [["Updated"]] });
```

## CF Worker 통합 (선택)

### Worker secret 보관

```bash
cd <worker-repo>
bunx --bun wrangler secret put MS_CLIENT_ID
bunx --bun wrangler secret put MS_CLIENT_SECRET
bunx --bun wrangler secret put MS_REFRESH_TOKEN
```

### scheduled trigger

`wrangler.jsonc`:
```jsonc
{
  "triggers": {
    "crons": [
      "0 4 * * 0",  // 주 1회 일요일 04:00 UTC
      "0 3 1 * *"   // 월 1회 1일 03:00 UTC
    ]
  }
}
```

Worker `index.ts`:
```ts
export default {
  async scheduled(event, env) {
    const graph = await createGraphClient({
      clientId: env.MS_CLIENT_ID,
      clientSecret: env.MS_CLIENT_SECRET,
      refreshToken: env.MS_REFRESH_TOKEN,
    });
    // ... DB backup / Excel update / etc
  }
};
```

## 보안 경계

1. **MS_CLIENT_SECRET 은 secret** — athsra (canon `secret-store.md` v1.13+) 또는 CF Worker secret 만. 절대 git commit X
2. **MS_REFRESH_TOKEN 도 secret** — 동일 보호. 침해 시 즉시 https://account.live.com/consent/Manage 에서 revoke + m365-auth-init 재실행
3. **OAuth consent scope 최소화** — 필요한 것만 선택. `Files.ReadWrite.All` 보다 `Files.ReadWrite` (자기 파일만) 가 더 안전 (modfolio 데이터만 사용 시)
4. **Personal MSA 의 admin consent 부재** — 모든 권한이 user 본인 책임. 침해 시 blast radius = 사용자 OneDrive/Mail 전체

## 반-패턴

1. **client_credentials grant 시도** — Personal MSA 미지원. authorization_code + refresh_token 만 사용
2. **access_token 보관** — 1시간 만료. refresh_token 만 보관 + 매 요청 시 갱신 (lib 가 처리)
3. **scope 변경 시 기존 refresh_token 재사용** — 새 scope consent 안 받았으니 invalid_grant. m365-auth-init 재실행 필요
4. **multiple device 동시 사용 시 같은 refresh_token 공유** — 한쪽 revoke / silent rotation 시 다른쪽도 끊김. **정공법 = device 별 별도 refresh_token + athsra `<repo>-local` project 분리** (canon `secret-store.md` v1.13+ § device 별 namespace 패턴):
   - athsra `<repo>` (공유): `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT` — Azure App level, device 무관
   - athsra `<repo>-local` (device 별): `MS_REFRESH_TOKEN` — device 단위 독립 발급
   - 새 device 추가 시 `m365-auth-init.ts` 재실행 → `athsra set <repo>-local MS_REFRESH_TOKEN=…` 등록
   - 자동화 용 (CF Worker scheduled) 은 별도 refresh_token + Worker secret (`wrangler secret put`) 으로 분리
5. **CF Worker free tier 의 cron 제한 신경 안 씀** — Workers Paid plan 은 cron triggers 제공 (사용자 이미 결제 중이라 OK). free tier 는 30 cron 트리거/계정 제한

## 활용 영역 (이 canon 의 consumer)

- **B-1 DB backup**: 각 repo 의 production DB dump → OneDrive (helper 가 graph lib 사용)
- **B-5 Excel cost dashboard**: CF/Neon/Resend 비용 → Excel 워크북 update (graph Excel API)
- **B-4 Forms 응답 sync**: Forms 자동 Excel sync → Graph Excel API read → ecosystem `data/feedback/`
- 향후: modfolio 앱이 사용자 OneDrive 와 통합 (별개 product feature, OAuth flow 재사용)

## 관련 자료

- [Microsoft Graph REST API v1.0](https://learn.microsoft.com/en-us/graph/api/overview)
- [Microsoft Graph TypeScript SDK](https://github.com/microsoftgraph/msgraph-sdk-javascript)
- [OAuth 2.0 authorization code flow on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Personal MSA endpoints](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc#fetch-the-openid-connect-metadata-document)
