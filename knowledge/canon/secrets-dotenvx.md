---
title: Secrets — dotenvx 기반 파일 암호화 워크플로
version: 2.0.0
last_updated: 2026-04-25
source: [modfolio-ecosystem dotenvx PoC 2026-04-24, atelier-and-folio production adoption 2026-04-25, https://dotenvx.com]
sync_to_siblings: true
consumers: [ops, new-app, preflight]
applicability: always
---

<!--
v2.0.0 (2026-04-25): universe 전체 방향 확정 — Doppler 를 완전히 폐기하고
모든 repo 가 repo-독립 dotenvx 로 전환한다. ecosystem 자신도 동등 sibling
으로 동일 경로를 향한다 (사용자 재확인 2026-04-25).

- Applicability 는 `always`: universe 의 모든 repo 가 결과적으로 이 canon 을 따른다.
- 각 repo 의 전환 시점은 자율 (evergreen-principle / Hub-not-enforcer 유지).
- 전환 완료 repo 는 `ecosystem.json` 에 `secrets: "dotenvx"` 필드로 기록.
- 1 호 실 채택: atelier-and-folio (2026-04-25 rename 과 함께 migration).

Doppler 가 처음 도입된 이유 (2026-02) = 중앙 secret 관리. 이제 문제:
- Free tier 10-project 한계 (23 repo 수용 불가)
- 중앙화 자체가 universe sibling 원칙과 충돌 (각 repo 가 독립 secret 소유)
- dev 경로에서만 사용 (prod 는 이미 CF Workers Secrets native) — 중앙화 가치 약함
-->

# Secrets — dotenvx 기반 파일 암호화 워크플로

**기본 원칙**: 암호화된 `.env` 는 **git commit 가능**, `.env.keys` (private key) 는 절대 commit 금지. 백업은 사용자 자율 (OneDrive/iCloud/USB/별도 private repo 등 — helper script `scripts/ops/backup-env-keys.sh` / `restore-env-keys.sh` 참조).

**Doppler 관계 (v2.0)**: **Doppler 는 universe 에서 폐기된다**. dev 경로는 dotenvx 로 완전 대체. 프로덕션 런타임 시크릿은 여전히 CF Workers Secrets (wrangler secret put) 네이티브 — 이건 계속 유지. Doppler 10-project 한계 + 중앙화가 sibling 자율 원칙과 충돌한다는 것이 폐기 결정의 배경.

## 전환 로드맵 (universe-wide, 2026-04-25 확정)

**단계적 전환 — 각 repo 가 자기 시점에 실행**:

| 단계 | 작업 | 지점 |
|---|---|---|
| 1 | Doppler 에서 secrets export (`doppler secrets download --no-file --format env`) | repo 소유자 |
| 2 | 평문 `.env` 작성 + `chmod 600` | repo 소유자 |
| 3 | `bunx --bun dotenvx encrypt -f .env --no-ops` → `.env` + `.env.keys` 생성 | 자동 |
| 4 | `.env.keys` 백업 (1Password 권장) + `.gitignore` 에 추가 | repo 소유자 |
| 5 | `package.json` scripts 교체 (`doppler run …` → `dotenvx run …`) | 자동 or 수동 |
| 6 | `ecosystem.json` 해당 repo 엔트리에 `secrets: "dotenvx"` 기록 | ecosystem PR |
| 7 | Doppler project 30 일 보관 후 삭제 | repo 소유자 |

**helper**: `scripts/ops/dotenvx-migrate-from-doppler.sh <project> <config>` 가 1-4 자동화.

## 전환 진행 상태 (universe 레지스트리)

각 repo 의 전환 상태는 `ecosystem.json` 의 해당 엔트리 `secrets` 필드로 추적:

- `"secrets": "dotenvx"` — 전환 완료 (atelier-and-folio, 2026-04-25 시점 1/23)
- `"secrets": "doppler"` — 미전환 (기본값 — 필드 미지정 시 동일 취급)
- `"secrets": "transitioning"` — 진행 중 (export + encrypt 완료, Doppler 보관 기간)

ecosystem 도 이 레지스트리의 일원으로 포함된다 — 동등 sibling 원칙.

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

# 4. .env.keys chmod 600 + 백업 (선택)
chmod 600 .env.keys
bash ../modfolio-ecosystem/scripts/ops/backup-env-keys.sh   # 아래 § 백업/복원 참조
```

## 백업 / 복원 (선택)

`.env.keys` 는 gitignore 이므로 여러 머신 간 동기화하려면 **외부 백업** 필요. 방식은 자율:

- **OneDrive / iCloud / Dropbox 동기화 폴더**: `KEYS_BACKUP_DIR` 을 해당 경로로
- **USB 드라이브**: 물리 매체 수동 이동
- **별도 private git repo**: `modfolio-secrets-backup` 같은 이름으로 따로
- **암호화 파일** (age, gpg) → 어디든 저장
- **백업 안 함**: 유실 시 `dotenvx encrypt` 재실행으로 새 keypair 생성 + `.env` 재암호화

### Helper script (로컬 디렉토리 기반, 자동 sync 는 사용자 선택)

```bash
# 모든 repo 의 .env.keys → backup dir
bash scripts/ops/backup-env-keys.sh
# 기본: $HOME/modfolio-secrets-backup/
# 커스텀: KEYS_BACKUP_DIR="/mnt/c/Users/$USER/OneDrive/modfolio-keys" bash ...

# 새 머신에서: backup dir → 모든 repo
bash scripts/ops/restore-env-keys.sh
```

`KEYS_BACKUP_DIR` 을 OneDrive/iCloud 경로로 두면 OS 가 알아서 클라우드 동기화.

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
6. `.env.keys` 백업 안내 (helper script 참조)

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
4. 백업 사용 중이면 새 `.env.keys` 를 백업 디렉토리에 덮어쓰기 (`backup-env-keys.sh`)
5. CI secret (`DOTENVX_PRIVATE_KEY_*`) 갱신

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
