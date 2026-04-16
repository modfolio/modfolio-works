---
name: ecosystem
description: 생태계 도메인 맵 + 현황 조회 — ecosystem.json 기반 앱 레지스트리
user-invocable: true
---


# Skill: 생태계 현황

## Auto Context
@ecosystem.json

생태계 전체 도메인 맵, 앱 상태, CF 프로젝트 정보.

## 도메인 맵 — Landing + App 분리

### 독립 도메인 앱

| 앱 | Landing | App |
|---|---|---|
| Naviaca | naviaca.com | app.naviaca.com |
| GistCore | gistcore.com | app.gistcore.com |
| Sincheong | sincheong.app | app.sincheong.app |
| Fortiscribe | fortiscribe.com | app.fortiscribe.com |
| KeepNBuild | keepnbuild.com | app.keepnbuild.com |
| Worthee | worthee.io | app.worthee.io |
| Amberstella | amberstella.com | app.amberstella.com |
| Umbracast | umbracast.com | app.umbracast.com |
| Munseo | munseo.app | app.munseo.app |

### modfolio.io 서브도메인 앱

| 앱 | Landing | App |
|---|---|---|
| Modfolio | modfolio.io | app.modfolio.io |
| Connect | connect.modfolio.io | login.modfolio.io, account.modfolio.io |
| Admin | admin.modfolio.io | console.modfolio.io |
| Dev | dev.modfolio.io | terminal.modfolio.io |
| Pay | pay.modfolio.io | my.modfolio.io |
| Press | press.modfolio.io | imprint.modfolio.io |
| On | on.modfolio.io | live.modfolio.io |
| Docs | docs.modfolio.io | (통합) |
| Universe | universe.modfolio.io | (통합) |

### 자회사 그룹 랜딩

| 자회사 | 도메인 | 프레임워크 |
|---|---|---|
| Studio | studio.modfolio.io | Astro |
| LS | ls.modfolio.io | Astro |
| Works | works.modfolio.io | Astro |
| Axiom | axiom.modfolio.io | Qwik |

## 앱 상태 레전드

| 상태 | 의미 |
|------|------|
| `active` | 핵심 기능 구현 완료, 프로덕션 운영 중 |
| `landing` | 랜딩/스캐폴드만 배포됨, 핵심 기능 미구현 |
| `planned` | 생태계 등록만, 아직 개발 시작 전 |

## 상태 확인 도구

```bash
# ecosystem.json 확인 (단일 진실 소스)
cat ecosystem.json | jq '.subsidiaries.works.apps[].status'

# 전체 레포 목록
gh repo list modfolio --json name,visibility,updatedAt

# 특정 레포 최근 커밋
gh api repos/modfolio/{repo}/commits --jq '.[0:5]'

# 특정 레포의 CLAUDE.md 읽기
gh api repos/modfolio/{repo}/contents/CLAUDE.md --jq '.content' | base64 -d

# 생태계 헬스체크
bun run health-check

# 전체 앱 버전 수집
bun run version-sync
```

## CF Pages 프로젝트명 매핑

상세한 CF 프로젝트명은 `ecosystem.json`의 `cfProject`, `cfAppProject` 필드 참조.
