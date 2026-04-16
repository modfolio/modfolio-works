---
title: Evergreen Principle — 권고 + 정보 공유
version: 2.0.0
last_updated: 2026-04-14
source: [knowledge/canon/evergreen-principle.md]
sync_to_children: true
consumers: [preflight, harness-pull, sso-integrate, ecosystem]
---

# Evergreen Principle — 권고 + 정보 공유

> **이 캐논은 권고 (recommendation)이지 강제(enforcement)가 아니다.**
> universe는 modfolio-connect의 최신 버전을 **기록·공유**하며,
> 어떤 연결 프로젝트이 언제 업그레이드할지는 **각 앱이 자체 결정**한다.

## universe의 역할 (강제 X)

- modfolio-connect의 latest published 버전을 `ecosystem.json` 루트 `connectSdkLatest` 필드에 기록
- 연결 프로젝트들이 현재 어느 버전을 쓰고 있는지 feedback에서 수집해 다른 앱들이 참고할 수 있게 공유
- mismatch를 발견하면 **정보로 제공** (FAIL 아님, WARN 아님 — INFO)

## 권고 (연결 프로젝트이 자율 채택)

연결 프로젝트 owner에게 권하는 패턴:

1. modfolio-connect의 새 버전이 release되면 가급적 빠르게 따라간다 (보안 패치 적시 적용 + contract 정합)
2. major release(예: v6 → v7)에 호환성 작업이 필요하면 연결 프로젝트 시점에 맞춰 진행
3. universe가 제시하는 timeline은 없다 — owner 판단

## 왜 권하는가

- Connect SDK는 OIDC PKCE + DPoP + SCIM + SAML + MCP delegation 같은 contract surface
- fragmentation은 보안·UX 디버깅 비용을 곱한다
- 그러나 fragmentation 회피보다 **각 앱의 자율과 자체 검증**이 더 중요한 정공법

## universe가 하지 않는 것

- ❌ 연결 프로젝트별 SDK 버전 결정 / 강제
- ❌ 마이그레이션 timeline / batch / roadmap 발행
- ❌ "MUST upgrade" / "FAIL on mismatch" 같은 enforcement
- ❌ 자동 업그레이드 PR 생성

## universe가 하는 것

- ✅ `ecosystem.json connectSdkLatest`에 modfolio-connect 최신 버전 기록 (참조용)
- ✅ harness-pull 보고서에 child SDK vs ecosystem.connectSdkLatest mismatch를 INFO로 표시
- ✅ feedback에서 각 앱의 SDK 버전 수집해 ecosystem 상태 mirror
- ✅ Connect SDK breaking change가 발생하면 `knowledge/journal/`에 변경 사실 기록 (각 앱이 참조)

## 적용 범위

이 원칙은 우선 `@modfolio/connect-sdk`에 적용한다. 향후 다른 공식 universe-published 패키지(예:
`@modfolio/contracts`)도 같은 패턴으로 정보 공유 가능. 그러나 어떤 패키지든 **강제는 universe의 역할이 아니다**.
