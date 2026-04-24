---
title: Secrets — dotenvx 기반 파일 암호화 워크플로
version: 1.0.0
last_updated: 2026-04-24
source: [modfolio-ecosystem dotenvx PoC 2026-04-24, https://dotenvx.com]
sync_to_children: true
consumers: [ops, new-app, preflight]
---

<!--
모든 member repo 가 Doppler 대신 dotenvx 로 dev/prod 시크릿을 관리하는 공통 경로.
ecosystem 은 canon + 헬퍼 스크립트만 제공하고, 각 repo 가 필요 시점에 자율 이관한다.
-->

# Secrets — dotenvx 기반 파일 암호화 워크플로

**기본 원칙**: 암호화된 `.env` 는 **git commit 가능**, `.env.keys` (private key) 는 절대 commit 금지. 1Password 에 repo 별 document 로 저장해 여러 머신 간 동기화.

**Doppler 관계**: dotenvx 가 dev 환경 기본값. 프로덕션 런타임 시크릿 (Workers Secrets, CF secret store) 은 여전히 CF 네이티브 경로. Doppler 는 이번 전환으로 **dev 경로에서만** 제거 대상.

## 설치

```bash
bun add -D @dotenvx/dotenvx@1.61.5
```

member repo 는 `package.json` devDep 에 `@dotenvx/dotenvx` 고정 버전 pin. 자동 major 업그레이드 금지 (API 변경 위험).

## 초기화 (신규 repo)

```bash
# 1. plaintext .env 작성 (임시)
cat > .env <<'EOF'
KEY1=value1
KEY2=value2
EOF
chmod 600 .env

# 2. encrypt (자동으로 .env.keys 생성)
bunx --bun dotenvx encrypt -f .env --no-ops

# 3. .env.keys 보호
chmod 600 .env.keys
```

결과: `.env` 는 `DOTENV_PUBLIC_KEY=...` header + 각 KEY 값이 `encrypted:...` prefix 로 저장된 상태. commit OK. `.env.keys` 는 gitignore.

## 런타임 — `dotenvx run` 패턴

```bash
# 단일 명령
bunx --bun dotenvx run -f .env -- <command>

# package.json 예시
{
  "scripts": {
    "dev": "dotenvx run -f .env -- astro dev",
    "build": "dotenvx run -f .env -- astro build",
    "deploy": "dotenvx run -f .env -- wrangler deploy"
  }
}
```

multi-env:

```bash
# 파일별 개별 private key (DOTENV_PRIVATE_KEY_PRODUCTION 등)
bunx --bun dotenvx run -f .env.production -- wrangler deploy
```

## `.gitignore` 필수 항목

```gitignore
# dotenvx — private keys, NEVER commit
.env.keys

# local plaintext overrides (개인용)
.env.local
.env.*.local
```

**제거 대상**: 기존 `.env` / `.env.*` 패턴 (dotenvx 암호화 커밋 정책과 충돌). harness-pull 이 WARN 으로 표시.

## 값 갱신 — Clean rebuild 권장

**권장**: `dotenvx set` 대신 **clean rebuild** 경로. 근거: 2026-04-24 modfolio-ecosystem PoC 에서 `dotenvx set` 이 encrypted 파일에 새 값 반영 시 "no change" 를 출력하면서 실제로는 내부 representation 이상 동작 (decrypt 시 길이 54 bytes 반환 등). 1-pass encrypt 로 재작성하면 정상.

절차:

```bash
# 1. 기존 .env + .env.keys 삭제
rm -f .env .env.keys

# 2. plaintext 재작성 (기존 값 + 새 값 병합)
#    또는 scripts/ops/dotenvx-migrate-from-doppler.sh 활용

# 3. encrypt 1회
bunx --bun dotenvx encrypt -f .env --no-ops

# 4. .env.keys chmod 600 + 1Password 재업로드
chmod 600 .env.keys
op document create .env.keys --title "dotenvx-<repo>-keys" --vault "modfolio-secrets" --force
```

## 1Password 동기화

**업로드** (초기 또는 갱신):

```bash
op document create .env.keys \
  --title "dotenvx-$(basename $(pwd))-keys" \
  --vault "modfolio-secrets"
```

**다른 머신에서 복구**:

```bash
cd ~/code/<repo>
op document get "dotenvx-<repo>-keys" --out-file .env.keys
chmod 600 .env.keys
```

**확인** (plaintext 노출 없이):

```bash
bunx --bun dotenvx run -f .env -- env \
  | awk -F= '/^<KNOWN_KEY>=/{print "KEY len:", length($2)}'
```

## Doppler 마이그레이션

**helper 스크립트**: `scripts/ops/dotenvx-migrate-from-doppler.sh`

```bash
bash scripts/ops/dotenvx-migrate-from-doppler.sh <doppler_project> <doppler_config>
```

동작:
1. `doppler secrets download --project X --config Y --no-file --format env` → chmod 600 임시 파일
2. `DOPPLER_*` prefix 제거
3. 기존 `.env` 존재 시 중단 (덮어쓰기 금지)
4. `.env` 로 이동 + encrypt
5. 주입 가능한 KEY 개수 보고
6. `.env.keys` 1Password 업로드 안내

## 반-패턴

1. **동일 `.env.keys` 여러 repo 공유** — blast radius 증가. repo 당 독립 keypair 원칙.
2. **plaintext `.env` commit** — public-key 암호화 목적 무의미화. git history 영구 오염.
3. **`dotenvx set` 으로 encrypted 파일 값 update** — 이상 동작 확인 (위 "값 갱신" 참조). clean rebuild 권장.
4. **CI 에서 `.env.keys` echo** — build log 에 private key 노출. 반드시 secret env 로 주입 (GitHub Actions `secrets.DOTENVX_PRIVATE_KEY_<ENV>`).
5. **프로덕션 런타임을 `dotenvx` 에 의존** — Workers 런타임은 `env.<BINDING>` 또는 `wrangler secret put` 네이티브 경로 사용. dotenvx 는 CI/CLI (빌드 + 배포) 시점만 담당.

## 검증 (값 노출 없이)

```bash
# 길이만 측정 (transcript 안전)
bunx --bun dotenvx run -f .env -- env \
  | awk -F= '/^CLOUDFLARE_API_TOKEN=/{print "CF_TOKEN len:", length($2)}'

# API 동작 확인 (값 노출 없이)
bunx --bun dotenvx run -f .env -- bash -c '
  curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    https://api.cloudflare.com/client/v4/user/tokens/verify \
    | jq ".success"
'

# wrangler 주입 확인
bunx --bun dotenvx run -f .env -- bunx --bun wrangler whoami
```

## 키 로테이션 (primary key compromise 시)

1. `.env` decrypt → 기존 plaintext 로 복구
2. `.env.keys` 삭제
3. `dotenvx encrypt -f .env` → 새 keypair 생성
4. 새 `.env.keys` 1Password 재업로드
5. 이전 `.env.keys` 1Password 에서 제거
6. CI secret (`DOTENVX_PRIVATE_KEY_*`) 갱신

## 관련 파일 / 스킬

- `scripts/ops/dotenvx-migrate-from-doppler.sh` — Doppler → dotenvx 일괄 이관
- `.claude/skills/ops/SKILL.md` "dotenvx 시크릿 관리" 섹션
- 이 문서는 `secrets-policy.md` 와 독립적 — 시크릿 로테이션 주기는 secrets-policy 참조

## PoC 실측 (2026-04-24, modfolio-ecosystem)

| 항목 | 결과 |
|------|------|
| `bun add -D @dotenvx/dotenvx@1.61.5` | 62 packages / 1.3s |
| `.env` 암호화 (129 KEY) | 1-pass encrypt 정상 |
| `dotenvx run` 주입 | env 130 개 주입 확인 |
| CF API wrangler whoami | success, token 유효성 확인 |
| `dotenvx set` 으로 encrypted 값 update | **이상 동작 확인** — clean rebuild 권장 |
