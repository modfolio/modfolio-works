---
title: TOTP — Microsoft Authenticator 통합
version: 1.0.0
last_updated: 2026-04-27
source: [Option A 결정 2026-04-27, M365 Family 자산 활용 분석]
sync_to_siblings: true
consumers: [ops, new-app]
applicability: per-app-opt-in
---

# TOTP — Microsoft Authenticator 통합

modfolio 23 repo 운영에 사용하는 모든 dev 서비스 (GitHub, Cloudflare, Neon, Resend, Vercel, Supabase, Doppler, …) 의 2FA TOTP 를 **Microsoft Authenticator 1개 앱** 으로 통합. M365 Family 가입자는 추가 비용 0 + Microsoft 계정 cloud backup → 새 폰 sync 가 Google Authenticator 보다 우수.

## 왜 Microsoft Authenticator

| 항목 | Microsoft Authenticator | Google Authenticator | 1Password TOTP | Authy |
|---|---|---|---|---|
| 비용 | 무료 (Microsoft 계정 있으면) | 무료 | $2.99/mo (1Password 가입 시) | 무료 |
| **Cloud backup** | ✅ Microsoft 계정 자동 sync | ⚠️ 2024+ 부터 sync 옵션 (제한적) | ✅ vault sync | ✅ |
| **새 폰 마이그** | Microsoft 계정 login → 자동 복원 | QR 재발급 필요 (서비스별) | vault sync | 자동 |
| **iOS/Android** | ✅ ✅ | ✅ ✅ | ✅ ✅ | ✅ ✅ |
| **데스크탑** | ❌ (모바일 only) | ❌ | ✅ (1Password app) | ⚠️ deprecated |
| **위치** | Microsoft 클라우드 | Google 클라우드 | 1Password 클라우드 | Twilio (변동성) |

**Microsoft 계정 backup 의 핵심 가치**: Google Authenticator 의 마이그 흐름 (QR 재스캔 23번) 회피. 새 폰에서 Microsoft 계정 login 한번에 23 dev 서비스 TOTP 자동 복원.

## 마이그 절차 (Google Authenticator 등 → Microsoft Authenticator)

### 사전: Microsoft Authenticator 앱 + Microsoft 계정 backup 활성화

1. iOS/Android 에서 "Microsoft Authenticator" 설치
2. Microsoft 계정 (M365 Family 결제 계정) 으로 sign in
3. Settings → **Cloud backup** ✅ 활성화 (iOS 는 iCloud 추가 옵션, Android 는 Microsoft 계정만)

### 23 dev 서비스 TOTP 마이그 — 일괄 흐름

각 dev 서비스 별 동일 패턴:

```
1. 서비스 dashboard → Account / Security → 2FA
2. "Disable 2FA" (기존 앱 제거 — recovery code 백업 필수)
3. "Enable 2FA" → QR code 표시
4. Microsoft Authenticator 앱 → "+" → "Other (Google, Facebook, etc.)" → QR scan
5. 6-digit code 확인 + 완료
6. (각 서비스별) recovery code 새로 발급 → 안전한 곳 보관 (Personal Vault 또는 Bitwarden)
```

**marathon 효율**: 한 번에 23 서비스 마이그 시 60-90분 소요. 일정 잡고 한 시간 통째로 진행 권장.

### Recovery code 보관

각 서비스의 recovery code (TOTP 분실 시 사용) — **반드시 별도 보관**:
- 1순위: M365 OneDrive Personal Vault `modfolio-secrets/recovery-codes/<service>.txt`
- 2순위: Bitwarden secure note 별도 vault item
- 절대 금지: TOTP 와 동일 위치 (앱) 에 보관 — 분실 시 동시에 모두 잃음

## 23 dev 서비스 TOTP 우선순위 (modfolio 운영)

| 우선순위 | 서비스 | 영향 |
|---|---|---|
| **1** | GitHub (조직 소유 권한) | repo write 권한 + Actions secrets |
| **1** | Cloudflare (CF root) | DNS / Workers / Pages / R2 / D1 모두 |
| **1** | Neon Postgres | production DB |
| **1** | Doppler (전환 중) | 잔존 repo 의 secret |
| **2** | Resend | trans email |
| **2** | Vercel (사용 시) | deploy |
| **2** | Supabase (사용 시) | auth/db |
| **2** | OpenAI / Anthropic / Cohere | LLM API key (사용 중인 것만) |
| **3** | Figma | design |
| **3** | NPM (publish 권한) | `@modfolio/harness` publish |
| **3** | Sentry / PostHog (사용 시) | observability |

### root account / sub-account 분리

CF / GitHub 등 root 권한이 큰 계정은 root TOTP + sub-account (organization member) 별도 TOTP. 침해 시 blast radius 격리.

## Microsoft Authenticator 의 추가 기능

modfolio 운영에 직접 가치는 적지만 알아두면 좋음:

- **Passwordless login** (Microsoft 365 / Microsoft 계정) — TOTP 대신 push 알림 승인
- **Password autofill** — Edge 와 통합 (Edge Password Manager)
- **App lock** (Face ID / Touch ID) — 앱 자체 잠금

## 반-패턴

1. **TOTP 와 recovery code 같은 vault 저장** — 하나 침해 시 둘 다 노출
2. **2FA 비활성화 후 마이그** — 침해 가능성 (수 분~수 시간 동안 1FA 상태). dev 서비스가 "switch authenticator app" 옵션 제공 시 그것 사용 권장
3. **여러 앱에 같은 TOTP 동시 등록** — sync 안 됨, 한쪽 갱신 시 다른쪽 stale. 1 서비스 = 1 앱
4. **Microsoft Authenticator backup 비활성** — 새 폰 시 23 서비스 QR 재스캔 마라톤. 반드시 활성

## 검증

- 마이그 후 1주일 정상 동작 확인 (각 서비스 login 시 정상 6-digit code)
- Microsoft 계정 다른 폰 / iPad 에서 Authenticator 설치 → backup 복원 정상 확인
- recovery code 1개 시범 사용 → 새 recovery code 발급

## 관련 canon / 도구

- `secret-store` v1.13+ — recovery code 보관 위치 (M365 OneDrive Personal Vault)
- `incident-response` — 폰 분실 시 절차
- `secrets-policy` — 시크릿 로테이션 주기 (TOTP 자체는 로테이션 X, recovery code 만)
