---
description: Cloudflare Pages 네이티브 GitHub 연동 배포. wrangler.jsonc 환경변수 빌드 설정 가이드
effort: medium
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(bun run check:*), Bash(bun run typecheck:*)
user-invocable: true
---


## Auto Context
@wrangler.jsonc
@package.json
!git branch --show-current

# Skill: 배포

CF Pages 네이티브 GitHub 연동 기반 배포 전략.

## 원칙

**GitHub Actions 배포 워크플로우 금지. CF Pages 네이티브 GitHub 연동만 사용.**

### 이유

- GitHub Actions는 월별 실행 횟수 제한 있음 (소규모 팀에 낭비)
- CF Pages가 GitHub repo를 직접 감지해 자동 빌드/배포 — 별도 CI 파이프라인 불필요
- Wrangler CLI + Actions 조합보다 설정이 단순하고 유지보수 부담 적음

## CF Pages 설정 방식

```
CF Pages 대시보드 또는 API:
  source.type = "github"
  source.config.owner = "modfolio"
  source.config.repo_name = "{레포명}"
  source.config.production_branch = "main"
  build_config.build_command = "bun install --frozen-lockfile && bun run build -- --filter={app}"
  build_config.destination_dir = "apps/{app}/{output_dir}"
  build_config.root_dir = ""  # monorepo는 루트에서 빌드
```

## Turbo monorepo 앱별 빌드 설정

| 앱 | build_command | destination_dir |
|----|---------------|-----------------|
| Nuxt 3 (SSR) | `bun install && bun run build -- --filter=app` | `apps/app/dist` |
| Astro (landing) | `bun install && bun run build -- --filter=landing` | `apps/landing/dist` |
| SvelteKit 5 | `bun install && bun run build -- --filter=app` | `apps/app/.svelte-kit/cloudflare` |
| SolidStart | `bun install && bun run build -- --filter=app` | `apps/app/.output` |

## CF Pages Critical Rule

**Direct Upload -> GitHub 연동 불가능.**

- CF Pages 프로젝트는 **반드시 생성 시점에 GitHub 연동** 설정
- 이미 Direct Upload로 만든 프로젝트는 삭제 후 재생성 필요
- 이 규칙은 2026-02-22에 실제 실패로 확인됨 (journal 참조)

## GitHub Actions 허용 범위

**배포 목적 Actions는 금지. 다음 용도만 허용:**

- Biome lint + typecheck (빌드 없는 품질 검사만)
- `@modfolio/contracts` 패키지 publish (GitHub Packages)

## CF API 정보

| 항목 | 조회 방법 |
|------|-----------|
| Account ID | `doppler secrets get CF_ACCOUNT_ID --plain` |
| All-API Token | `doppler secrets get CF_API_TOKEN --plain` |
| Pages API Token | `doppler secrets get CF_PAGES_API_TOKEN --plain` |

> ⚠ 시크릿은 Doppler에서만 관리. 코드/설정 파일에 평문 기록 금지.

## 새 앱 배포 체크리스트

1. CF Pages 프로젝트 생성 (GitHub 연동 필수)
2. 빌드 명령어 + 출력 디렉토리 설정
3. 커스텀 도메인 연결 (DNS CNAME)
4. 환경변수 설정 (Doppler에서 복사)
5. GitHub push -> 자동 빌드/배포 확인
6. `ecosystem.json` cfProject 필드 갱신
