# .devcontainer template — modfolio-universe harness v2.6

v2.5부터 각 연결 프로젝트는 자기 Dev Container로 **독립 작동**한다. universe 접근 불필요. 외부 기여자도 해당 repo만 clone → "Reopen in Container"로 완전한 개발 환경 획득. v2.6은 여기에 `@modfolio/harness` GitHub Packages publish 경로를 추가해 universe clone 없이도 consumer 가 하네스를 당겨갈 수 있게 했다.

## 왜 독립 Dev Container인가

v2.4까지는 universe Dev Container가 호스트 부모 폴더를 `/workspaces/modfolio-members`에 bind-mount해 연결 프로젝트 전체를 한 컨테이너에서 관리했다. 그 side-effect가 v2.4.1 infra gap 5건(NPM_TOKEN fallback, mise global bun, safe.directory 대량 등록 등)이었다. v2.5는 **하나의 독립 프로젝트 = 하나의 독립 컨테이너** 로 정공법 전환.

- 외부 기여자: 해당 repo만 clone + 독립 컨테이너 → 즉시 작업 시작
- drift 격리: 한 프로젝트의 node_modules/biome 문제가 다른 프로젝트에 전파 안 됨
- universe는 hub 역할만: template 제공 + pull-manifest에 현 상태 기록 (observe-only)

## 연결 프로젝트 자율 원칙

v2.5부터 `.devcontainer/`는 **연결 프로젝트 소유자가 자율 관리**한다. universe는 이 `templates/.devcontainer/` 를 참조 스펙으로 제공할 뿐, harness-pull이 연결 프로젝트의 `.devcontainer/` 를 덮어쓰지 **않는다** (observe-only).

소유자가 해야 할 것:
1. 이 template을 참고해 자기 repo에 `.devcontainer/devcontainer.json` + `setup.sh` 복사
2. 필요시 커스텀 (forward ports, extensions, remoteEnv 등)
3. `bun run harness-pull` 실행 시 universe는 `.devcontainer/` 현재 상태를 `pull-manifest.json`의 `toolkitObservation` 필드에 기록할 뿐 덮어쓰지 않음

## 필수 요소

`.devcontainer/devcontainer.json`의 핵심 계약:

```jsonc
{
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu-24.04",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "22" },
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" },
    "ghcr.io/devcontainers-extra/features/mise:1": {}
  },
  "mounts": [
    "source=${localWorkspaceFolderBasename}-node-modules,target=${containerWorkspaceFolder}/node_modules,type=volume",
    "source=${localWorkspaceFolderBasename}-venv,target=${containerWorkspaceFolder}/.venv,type=volume",
    "source=${localEnv:HOME}${localEnv:USERPROFILE}/.claude/.credentials.json,target=/home/vscode/.claude/.credentials.json,type=bind"
  ],
  "postCreateCommand": "bash .devcontainer/setup.sh",
  "remoteEnv": {
    "GITHUB_TOKEN": "${localEnv:GITHUB_TOKEN}",
    "NPM_TOKEN": "${localEnv:NPM_TOKEN}",
    "MODFOLIO_UNIVERSE_PATH": "${localEnv:MODFOLIO_UNIVERSE_PATH}",
    "PATH": "/home/vscode/.local/share/mise/shims:${containerEnv:PATH}"
  }
}
```

**v2.5에서 의도적으로 빠진 것**:
- `source=${localWorkspaceFolder}/..,target=/workspaces/modfolio-members,...` — sibling 접근 불필요
- `NPM_TOKEN: "${localEnv:NPM_TOKEN}${localEnv:GITHUB_TOKEN}"` — concat fallback은 universe 전용이었음. 연결 프로젝트 소유자는 자기 환경에서 둘 중 하나만 유지
- `MODFOLIO_MEMBERS_ROOT` — 프로젝트간 sibling 참조 불필요

**v2.5에서 새로 들어온 것**:
- `MODFOLIO_UNIVERSE_PATH` — optional. 컨테이너 안에서 harness-pull 실행 시 universe 경로를 직접 지정하고 싶을 때. 설정 방법은 아래 "harness-pull 실행 전략" 참조.

## 시작

1. 호스트에서 `claude` CLI 로그인 한 번 (`~/.claude/.credentials.json` 존재 필요)
2. VSCode에서 해당 프로젝트 폴더 열기
3. Command Palette → "Dev Containers: Reopen in Container"
4. 빌드 완료 후 터미널: Ubuntu 24.04 + Node 22 + Python 3.12 + bun + mise + Claude CLI 준비

## harness-pull 실행 경로

harness-pull 은 어느 환경에서든 실행 가능. universe 해결은 `scripts/harness-pull.ts`의 `findUniverseRoot()`에서 아래 순서로 시도:

| # | 경로 | 상황 |
|---|---|---|
| 0 | `MODFOLIO_UNIVERSE_PATH` env | 컨테이너에서 명시적 지정 |
| 1 | Script 위치 (`import.meta.url`) | `@modfolio/harness` 설치 후 bunx / universe 스크립트 직접 실행 시 자동 |
| 2 | Sibling 탐색 (`../modfolio-universe`) | host 터미널 sibling layout |

### 1. `@modfolio/harness` GitHub Packages — 공식 배포 경로

universe 를 clone 하지 않고 `@modfolio/harness` 를 devDep 로 당겨간다. 연결 프로젝트에서:

```bash
# <latest> 는 ecosystem.json.harnessLatest 값. 항상 현행 stable 을 그대로 쓴다.
doppler run --project modfolio-universe --config dev -- \
  bun add -D @modfolio/harness@<latest>
doppler run --project modfolio-universe --config dev -- \
  bunx modfolio-harness-pull --dry-run
```

사전 조건 (프로젝트 repo 루트에 `.npmrc`):

```
@modfolio:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
always-auth=true
```

`GITHUB_TOKEN` 은 Doppler (`modfolio-universe` 프로젝트, `read:packages` scope) 에서 주입. 로컬 env 에 평문 노출 금지.

**`bun add` vs `bunx` 구분** (v2.6 PoC 에서 확정된 실증):
- ✅ `bun add @modfolio/harness` — `bun add` 는 cwd `.npmrc` / bunfig 를 읽어 scope 해석.
- ❌ `bunx @modfolio/harness modfolio-harness-pull` (설치 선행 없이) — bunx 전역 캐시가 cwd config 를 안 읽어 scope 404.
- → scoped private package 는 **반드시 `bun add` 선행 후 local `bunx` 실행** (`node_modules/.bin/modfolio-harness-pull` 해석).

### 버전 정책

harness 는 universe 가 제공하는 **기반 도구**. 현행 stable 하나만 유지하고 이전 버전은 `deprecated` 처리한다. 연결 프로젝트는 항상 `ecosystem.json.harnessLatest` 값을 그대로 쓴다. 낮은 버전 고정은 보안 패치/정합 drift 를 만들므로 허용하지 않는다. upgrade 비용이 실존하는 변경은 harness major 자체의 migration 단계에서 해소하지, 개별 프로젝트의 버전 고정으로 회피하지 않는다.

### 2. `MODFOLIO_UNIVERSE_PATH` env — 개발 보조

컨테이너 안에서 universe 스크립트를 직접 실행하고 싶을 때. 호스트에 universe 를 clone 해뒀다면 그 경로를 env 로 전달:

```bash
# 호스트 shell profile (Windows PowerShell / macOS zshrc 등)
export MODFOLIO_UNIVERSE_PATH=/path/to/modfolio-universe
```

그 다음 Dev Container Rebuild. 컨테이너 안에서 env 해결됨. 단 path 가 컨테이너 안에서 접근 가능해야 하므로 universe 를 해당 경로에 mount 하는 추가 설정 필요:

```jsonc
// devcontainer.json mounts에 추가 (optional)
"source=${localEnv:MODFOLIO_UNIVERSE_PATH},target=/workspaces/modfolio-universe,type=bind,consistency=cached"
```

### 3. host 터미널 + sibling layout — 개발 보조

개발자 머신에 `modfolio-universe` 와 연결 프로젝트 repo 가 같은 부모 폴더에 sibling 으로 있으면:

```bash
# host terminal (WSL / macOS / Linux)
cd /path/to/project-repo
bun ../modfolio-universe/scripts/harness-pull.ts --dry-run
```

Dev Container 안이 아닌 **호스트에서 직접** 실행. `findUniverseRoot()` 의 sibling 탐색이 자동 해결.

### `bunx github:` 경로는 비활성

v2.6 beta.1 에서 `bunx github:modfolio/modfolio-universe#<tag>` 를 시도했으나 bun 1.3.5 가 private repo tarball API 에 `Authorization` 헤더를 싣지 않아 404. 인프라(bin, shebang) 는 유지되지만 현재 권장 경로 아님. universe 가 public 전환되거나 bun upstream 이 private tarball auth 를 지원하면 즉시 활성화 가능. 상세: `knowledge/journal/20260419-harness-v2.6-npm-publish.md`, `knowledge/canon/adoption-debt-patterns.md` 패턴 14.

## `.devcontainer/` 커스텀 보호 (harness-lock)

universe 는 기본적으로 `.devcontainer/` 를 observe-only 로 처리하지만, 혹시 미래에 배포 모드로 전환될 때를 대비해 `.claude/harness-lock.json` 에 커스텀 보호 지정:

```jsonc
{
  "lockedPaths": [
    ".devcontainer/"
  ]
}
```

## 해결된 이슈 (유지)

### bun install `@biomejs/cli-linux-x64-musl` hang

Windows WSL2 + bun에서 musl 변종 biome 패키지 extract hang (oven-sh/bun#26156). `package.json` overrides로 차단:

```jsonc
"overrides": {
  "@biomejs/cli-linux-x64-musl": "npm:@biomejs/cli-linux-x64@2.4.8"
}
```

### `.claude/` 디렉토리 root-owned → `plans/` mkdir 실패

setup.sh가 매 create 시 `sudo chown vscode:vscode /home/vscode/.claude` 수행.

### WSL2 `${localEnv:USERPROFILE}` resolve 실패

microsoft/vscode-remote-release#6287. credentials mount를 `${localEnv:HOME}${localEnv:USERPROFILE}` concat 패턴으로 Windows/macOS/Linux 모두 커버.

## 참고

- [evergreen-principle.md](../../knowledge/canon/evergreen-principle.md) — universe는 hub, not enforcer
- [adoption-debt-patterns.md](../../knowledge/canon/adoption-debt-patterns.md) — member별 공통 debt 카탈로그
- [local-dev-infra.md](../../knowledge/canon/local-dev-infra.md) — local 개발 인프라 개요
