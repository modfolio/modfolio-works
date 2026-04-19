#!/bin/bash
# .devcontainer/setup.sh — 연결 프로젝트 Dev Container lifecycle setup (idempotent)
#
# v2.5 독립 모드: 각 연결 프로젝트는 자기 Dev Container 로 독립 작동. universe
# 접근 불필요. harness-pull 실행 경로 3가지:
#   - @modfolio/harness GitHub Packages install (v2.6+ 권장)
#   - host 터미널 + universe sibling layout
#   - MODFOLIO_UNIVERSE_PATH env + universe bind mount
# 상세: templates/.devcontainer/README.md
#
# 담당:
#   1. volume mount + .claude 디렉토리 소유권 vscode로 교정
#   2. 툴체인 설치 (mise로 bun, npm으로 Claude CLI)
#   3. mise global bun — bunx 서브프로세스가 shim으로 bun 해결 (필수)
#   4. bun install

set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "[setup 1/4] volume + .claude ownership → vscode"
sudo chown vscode:vscode node_modules .venv 2>/dev/null || true
sudo chown vscode:vscode /home/vscode/.claude 2>/dev/null || true
git config --global --add safe.directory "$REPO_ROOT" >/dev/null 2>&1 || true

echo "[setup 2/4] toolchain"
mise trust -a
mise install bun
if ! command -v claude >/dev/null 2>&1; then
  npm install -g @anthropic-ai/claude-code
fi

# Doppler CLI — harness-pull / 연결 프로젝트 secrets run-time 주입에 필요
if ! command -v doppler >/dev/null 2>&1; then
  DOPPLER_VERSION="3.75.3"
  echo "[setup]   Doppler CLI v${DOPPLER_VERSION} user-space install"
  curl -sSL "https://github.com/DopplerHQ/cli/releases/download/${DOPPLER_VERSION}/doppler_${DOPPLER_VERSION}_linux_amd64.tar.gz" -o /tmp/doppler.tgz
  tar -xzf /tmp/doppler.tgz -C /tmp doppler
  mkdir -p "$HOME/.local/bin"
  mv /tmp/doppler "$HOME/.local/bin/doppler"
  chmod +x "$HOME/.local/bin/doppler"
  rm -f /tmp/doppler.tgz
fi

echo "[setup 3/4] mise global bun"
# bunx 서브프로세스(예: biome/wrangler)가 mise shim 통해 bun 해결.
# 전역 기본 버전이 없으면 shim이 `No version is set for shim: bun`으로 fail.
BUN_LOCAL="$(mise where bun 2>/dev/null || true)"
if [ -n "$BUN_LOCAL" ]; then
  BUN_VERSION="$(basename "$BUN_LOCAL")"
  mise use -g "bun@${BUN_VERSION}" >/dev/null 2>&1 || true
  echo "[setup]   mise global bun = ${BUN_VERSION}"
fi

echo "[setup 4/4] bun install"
# GitHub Packages(@modfolio/*) 접근을 위해 GITHUB_TOKEN 또는 NPM_TOKEN 필요.
# 호스트에 둘 중 하나라도 환경변수로 설정 후 Dev Container를 rebuild하면 전달됨.
if [ -z "${GITHUB_TOKEN:-}" ] && [ -z "${NPM_TOKEN:-}" ]; then
  echo "[setup] ⚠ GITHUB_TOKEN/NPM_TOKEN 모두 미설정 — @modfolio/* 패키지 401 예상" >&2
fi
mise exec bun -- bun install
echo "[setup] done."
