---
name: security-scan
description: OWASP Top 10 보안 감사. XSS/CSRF/injection 탐지 + CSP 헤더 + 시크릿 검출 + 자동 수정
user-invocable: true
---


# /security-scan — 보안 감사

security-hardener agent → OWASP Top 10 + 생태계 규칙 검증 → 자동수정

## 프로세스

1. **대상 레포/파일 지정**
2. **security-hardener agent 실행**: OWASP Top 10 스캔
3. **자동 수정**: 탐지된 취약점 근본 수정
4. **검증**: `bun run typecheck && bun run check`

## 검사 범위

- 하드코딩 시크릿
- XSS (unescaped 렌더링)
- SQL/Command injection
- CSRF 토큰 누락
- JWT 검증 누락
- HMAC 서명 미검증
- CSP 헤더 불완전
- 에러 정보 노출

## 사용 예시

```
/security-scan — modfolio-pay 결제 API 보안 검사
/security-scan — gistcore 전체 보안 감사
```
