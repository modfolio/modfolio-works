---
description: Resend 이메일 통합 패턴. fire-and-forget 전송 + 템플릿 관리 + 에러 처리
effort: low
allowed-tools: Read, Glob, Grep
user-invocable: true
---

# Email Patterns — Resend Integration

> modfolio-pay와 modfolio-press에서 검증된 이메일 통합 패턴.

## 핵심 원칙

1. **Fire-and-forget**: 이메일 실패가 비즈니스 로직을 차단하면 안 됨
2. **Safe error handling**: throw 금지, try-catch + console.error
3. **HTML builders**: TypeScript 함수 → HTML string (JSX/React Email 아님)
4. **수신 거부**: 모든 이메일에 unsubscribe 링크 포함

## Resend 통합 (fetch 기반)

```typescript
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const FROM_ADDRESS = "Modfolio Pay <noreply@pay.modfolio.io>";

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return false;  // 절대 throw 하지 않음
  }
}
```

## Resend 통합 (SDK 기반)

```typescript
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY);

async function sendWelcomeEmail(to: string): Promise<boolean> {
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Welcome!",
    html: buildWelcomeHtml(),
  });

  if (error) {
    console.error("[email] Error:", error.message);
    return false;
  }
  return true;
}
```

## HTML Template Builder 패턴

```typescript
function buildPaymentReceiptHtml(params: {
  customerName: string;
  amount: number;
  orderName: string;
  approvedAt: string;
  receiptUrl: string | null;
}): string {
  const formattedAmount = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(params.amount);

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>결제 완료</h2>
      <p>${escapeHtml(params.customerName)}님, 결제가 완료되었습니다.</p>
      <table>
        <tr><td>주문</td><td>${escapeHtml(params.orderName)}</td></tr>
        <tr><td>금액</td><td>${formattedAmount}</td></tr>
        <tr><td>일시</td><td>${params.approvedAt}</td></tr>
      </table>
      ${params.receiptUrl ? `<p><a href="${params.receiptUrl}">영수증 보기</a></p>` : ""}
      <hr />
      <p style="font-size: 12px; color: #999;">
        이 이메일은 자동 발송되었습니다.
        <a href="{{unsubscribe_url}}">수신 거부</a>
      </p>
    </body>
    </html>
  `;
}
```

## HTML Escaping (XSS 방지)

```typescript
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

동적 컨텐츠(사용자 이름, 주문명 등)는 **반드시** escape.

## 통화 포맷

```typescript
// KRW (한국 원)
new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(50000)
// → "₩50,000"

// USD
new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(49.99)
// → "$49.99"
```

## 도메인 + 계정 전략

- Resend에서 **발신 도메인 검증** 필요 (DNS TXT/MX 레코드)
- 각 도메인별 1개 Resend 계정 (free tier 제한)
- 발신 주소 예시: `noreply@pay.modfolio.io`, `hello@press.modfolio.io`
- 상세: `/ops` skill 참조

## 환경변수

| 변수 | 용도 |
|------|------|
| `RESEND_API_KEY` | Resend API 키 |
