---
title: Email Domain Aliases — CF Routing + Google Workspace Send-as
version: 1.0.0
last_updated: 2026-04-27
source: [Option A 결정 2026-04-27 (GW 유지 + M365 비-이메일 자산 활용 + CF Email Routing alias), https://developers.cloudflare.com/email-routing/]
sync_to_siblings: true
consumers: [ops, new-app]
applicability: per-app-opt-in
---

# Email Domain Aliases — CF Routing + Google Workspace Send-as

도메인 (`modfolio.io` 등) 의 functional alias (`support@`, `noreply@`, `team@` 등) 를 별도 비용 없이 운영하는 표준. **GW 메인 inbox 유지 + Cloudflare Email Routing 으로 alias forwarding + GW "Send mail as" 로 alias 발신** 하는 흐름.

## 결정 컨텍스트

`knowledge/journal/20260427-secrets-m365-onedrive-decision.md` 에서 같이 결정된 Option A:

- 메일 메인 = **Google Workspace** (검증된 흐름, dev 도구 통합 우수)
- M365 Family = **이메일 외 자산만** (OneDrive Personal Vault / Defender / Authenticator / Editor / Clipchamp / Office)
- M365 Outlook 의 "커스텀 도메인" 기능은 **포기** — DNS MX 단일성으로 GW 와 충돌
- alias forwarding = **CF Email Routing 무료** (DNS 가 CF 에 있으면 즉시 가능)

**GW → M365 마이그를 결정한 repo 는 이 canon 적용 X** — Outlook 자체 alias 사용.

## 표준 alias (modfolio.io 예시)

ecosystem main domain `modfolio.io` 운영 alias. 23 repo 중 다른 도메인 (`worthee.io`, `umbracast.com`, …) 도 동일 패턴 적용 가능.

| Alias | 용도 | 발신 권한 |
|---|---|---|
| `winterer@modfolio.io` (또는 `mod@`) | Personal admin — GitHub/CF/Neon/Resend 등 dev 계정 등록용 | ✅ GW Send-as |
| `support@modfolio.io` | 사용자 문의 통합 inbox (23 앱 전체) | ✅ GW Send-as |
| `noreply@modfolio.io` | Resend trans email 의 fallback 발신 / forwarding 흡수 | ❌ 발신만 (Resend 가 처리) |
| `team@modfolio.io` | Collaborator 영입 시 | ✅ GW Send-as |
| `legal@modfolio.io` | Incorporation, ToS, privacy notice 수신 | ✅ GW Send-as |

**확장 시**: CF Email Routing 의 alias 개수는 사실상 무제한. 추가 필요 시 `info@`, `billing@`, `dev@`, `partners@` 등 자유롭게.

## DNS 전제

- 도메인 nameserver = **Cloudflare** (modfolio.io 는 이미 CF DNS — `nslookup` 또는 CF Dashboard 확인)
- 기존 MX = Google Workspace (`smtp.google.com` 또는 `aspmx.l.google.com`)
- TXT (SPF) = `v=spf1 include:_spf.google.com ~all` (GW 이 발신 권한)

DNS 가 CF 가 아니면 CF Email Routing 사용 불가 → CF 로 nameserver 이전 또는 다른 forwarding 서비스 (Forward Email, ImprovMX) 사용.

## 셋업 단계 (사용자 영역)

### 1. CF Email Routing 활성화

CF Dashboard → 해당 도메인 → **Email** → **Email Routing** → **Enable**

자동 추가되는 DNS records (CF 가 알아서 처리):
- MX: `route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`, `route3.mx.cloudflare.net` (priority 13~98)
- TXT (SPF): `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`

⚠️ **MX 충돌 주의**: CF Email Routing 활성화 시 GW MX 가 자동 제거될 수 있음. **메인 inbox 가 GW 인 경우 활성화 X** — 아래 "GW + CF 공존 모드" 참조.

### 2. GW + CF 공존 모드 — Custom Address 만 사용

CF Email Routing 의 **Custom Addresses** 만 활성화하고 **MX 전체 takeover 는 비활성**:

GW MX 를 유지하면서 CF Routing 으로 특정 alias 만 처리하려면 — **불가능 (DNS MX 는 단일성)**.

해결: **반대 방향 — CF Routing 이 메인, GW 가 Routing 의 destination 으로 forwarding**

```
sender → modfolio.io MX (CF Email Routing)
           ↓ rule
       support@ → forward → winterermod@gmail.com  (또는 GW main inbox)
       noreply@ → drop / Resend webhook
       legal@   → forward → winterer@modfolio.io
       (catch-all) → forward → winterer@modfolio.io
```

이 모드에서는 **GW 의 modfolio.io inbox 가 비활성** — GW 는 단순 destination Gmail 로 동작. modfolio.io 도메인이 GW Workspace 에 등록돼있을 필요 없음.

**대안 — GW 메인 유지 (MX 안 바꿈) + 별도 도메인으로 alias 운영**:
- modfolio.io = GW MX 그대로
- modfolio.email (또는 mod.io 같은 짧은 도메인) = CF Routing
- 사용자 결정 사안. 도메인 1개 일관성 vs 별 도메인 운영 부담

**현실적 권고**: modfolio.io 메인 inbox 를 GW 가 아닌 일반 Gmail (winterermod@gmail.com) 으로 두면 CF Routing 이 메인 처리 가능. GW 비용 ($72/yr) 절감 가능. 사용자 결정 사안.

### 3. GW "Send mail as" 설정 (각 alias 별)

CF Routing 으로 받은 메일을 GW 에서 답장 시 alias 로 발신하려면:

GW Settings → Accounts and Import → Send mail as → "Add another email address"

각 alias 별:
- Email: `support@modfolio.io`
- Treat as alias: ✅
- SMTP server: `smtp.gmail.com:587` (GW main account)
- 인증: GW App Password (2FA 사용 시 App Password 생성)

verification email 이 alias 로 발송되어 CF Routing → main inbox 도착 → click verify.

### 4. SPF/DKIM/DMARC 정합

**SPF**: GW 가 발신 권한 (CF Routing 은 forwarding only, 발신 X) — `include:_spf.google.com ~all` 만 있으면 OK. CF Routing 활성화 시 자동 `_spf.mx.cloudflare.net` 추가됨 (forwarding rewrite 용).

**DKIM**: GW 의 DKIM 만 사용. GW Admin Console → Apps → Google Workspace → Gmail → Authenticate email → DKIM key 생성 후 `google._domainkey.modfolio.io` TXT 추가.

**DMARC**: `_dmarc.modfolio.io` TXT — `v=DMARC1; p=quarantine; rua=mailto:legal@modfolio.io;` (검증 단계는 `p=none` 으로 시작).

## 검증

```bash
# 외부 → support@modfolio.io 보내기 (다른 메일 계정에서)
echo "test from external" | mail -s "Test alias" support@modfolio.io

# GW main inbox 도착 확인 (winterermod@gmail.com 또는 winterer@modfolio.io)
# 답장 — From 을 support@modfolio.io 로 변경 (Send mail as)

# 외부에서 답장 받기 — From 이 support@modfolio.io 인지 확인
```

DNS 검증:
- https://www.mail-tester.com/ — SPF/DKIM/DMARC 점수 10/10 목표
- https://mxtoolbox.com/ — MX/SPF/DKIM/DMARC lookup

## 반-패턴

1. **MX 가 GW + CF 둘 다 등록** — DNS 단일성 위반. 둘 중 하나만 처리. priority 가 낮은 쪽이 silently 무시됨
2. **CF Routing 의 destination 을 1개로만 설정** — main inbox 장애 시 모든 alias 끊김. catch-all 추가 + 2-3 destination 으로 redundancy
3. **alias 별 별도 GW 계정 추가 결제** — GW Business Starter $6/user/mo 추가 결제 = $360/yr (5 alias). CF Routing 무료로 동일 효과
4. **SPF 에 CF Routing 도 발신자로 추가** — CF Routing 은 forwarding only, sender 가 아님. SPF 에 추가 시 다른 sender 와 충돌 가능
5. **noreply@ 로 받은 메일 무시** — 종종 사용자 답장이 옴 (반사적). drop 보다 forwarding 후 자동 응답이 더 나음

## 23 repo 적용 시 — 도메인별 alias

각 도메인 운영 repo 가 자기 alias 표준을 결정. ecosystem 권고 minimum:

- `support@<domain>` — 사용자 문의 (CF Routing → main inbox)
- `noreply@<domain>` — Resend trans email 발신 (Resend 가 처리, CF Routing 은 받기만)
- catch-all → main inbox (typo / 알려지지 않은 alias)

domain 별 alias 운영은 자율 — 작은 앱은 main inbox 1개로 충분, 큰 앱은 `billing@`, `partners@`, `dev@` 추가.

## 관련 canon / 도구

- `secret-store` v1.13+ — athsra master phrase 백업처 (M365 OneDrive Personal Vault 1순위)
- `gh-actions-policy` — GitHub 알림 이메일 라우팅
- `incident-response` — `legal@`, `support@` 의 인시던트 시 활용
- Cloudflare Email Routing docs: https://developers.cloudflare.com/email-routing/
- Google Workspace Send mail as: https://support.google.com/mail/answer/22370
