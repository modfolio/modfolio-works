/**
 * scripts/hooks/secret-patterns.ts
 *
 * Secret prefix 패턴 SoT — side-effect-free 모듈 (import 안전).
 * post-secret-redact.ts(PostToolUse hook, top-level await 라 직접 import 불가)에서
 * 패턴을 추출해 공유한다: hook(runtime 출력 redact) + debrief CLI(영속 카드
 * append 게이트) + 향후 스캐너가 같은 패턴 하나를 쓴다 (drift 방지).
 *
 * ASI03 (OWASP Agentic 2026) — secret literal 노출 차단.
 */

export interface SecretPattern {
	id: string;
	re: RegExp;
	tag: string;
	/**
	 * 매치 단위 2차 판정. `false` 면 그 매치는 시크릿이 **아니다**.
	 *
	 * 접두사 패턴(`sk-ant-` 등)은 접두사 자체가 특이해서 이게 필요 없다. 그러나
	 * **구조** 패턴(`db-uri-credentials`)은 자리 모양만 보므로 placeholder·셸 보간과
	 * 실 자격증명을 정규식만으로 못 가른다 — 그 판정을 여기서 한다.
	 */
	accept?: (match: string) => boolean;
}

/**
 * 자격증명 자리가 **실값이 아닌** 것으로 보이는가.
 *
 * ## 왜 필요했나 (2026-07-31 fleet 실측)
 *
 * `db-uri-credentials` 를 등재한 직후 orbit 서베이가 sibling 5곳에 **P0 5건**을 올렸다.
 * 전수 판독 결과 **10건 전부 오탐**이었다:
 *
 * | 모양 | 예 | 왜 오탐인가 |
 * |---|---|---|
 * | `.env.example` placeholder | `postgres://USER:PASSWORD@HOST` | 정책이 placeholder 를 **요구**한다 |
 * | 셸/템플릿 보간 | `postgresql://${PG_USER:-x}:${PG_PASSWORD}@db` | 값이 여기 없다 |
 * | 로컬 개발 관례 | `postgres://postgres:postgres@127.0.0.1` | user==pw, 로컬 |
 * | 문서 예시 | `postgresql://user:password@host:port/db` | 문서가 하는 일 |
 *
 * 진짜 하나 없이 P0 5건이면 그 신호는 **읽히지 않는다** — 그리고 그때 진짜 하나가 섞이면
 * 같이 안 읽힌다. 오탐은 검출력의 반대편이 아니라 **검출력을 깎는 쪽**이다.
 */
function looksLikeCredentialPlaceholder(user: string, pw: string): boolean {
	// 셸·템플릿 보간 — 값이 저장소에 없다.
	if (/^\$\{|^\$[A-Za-z_]|^\{\{|^%[A-Za-z_]/.test(pw)) return true;
	if (/^\$\{|^\$[A-Za-z_]|^\{\{|^%[A-Za-z_]/.test(user)) return true;
	// `<your-password>` 류.
	if (/^<.*>$/.test(pw)) return true;
	// 전부 대문자·언더스코어 = 템플릿 변수 이름(`PASSWORD`, `DB_PASS`).
	if (/^[A-Z][A-Z0-9_]*$/.test(pw)) return true;
	// 흔한 자리표시 단어.
	const PLACEHOLDER =
		/^(password|passwd|pass|pwd|secret|changeme|change_me|user|username|postgres|mysql|mongo|redis|root|admin|example|test|dummy|placeholder|todo|xxx+)$/i;
	if (PLACEHOLDER.test(pw)) return true;
	// 로컬 개발 관례 — 사용자명과 비밀번호가 같다(`modfolio:modfolio`).
	if (user.length > 0 && user.toLowerCase() === pw.toLowerCase()) return true;
	return false;
}

/** `db-uri-credentials` 매치가 실 자격증명으로 보이는가. */
export function acceptDbUriMatch(match: string): boolean {
	// match 는 `scheme://user:pw@` 로 끝난다.
	const m = /:\/\/([^:@\s/]+):([^@\s/]+)@$/.exec(match);
	if (m === null) return true; // 형태를 못 읽으면 보수적으로 시크릿 취급
	return !looksLikeCredentialPlaceholder(m[1] ?? "", m[2] ?? "");
}

/**
 * ## 2026-07-27 — 두 훅이 "시크릿" 을 서로 다르게 정의하고 있었다
 *
 * `pre-payment-guard` 는 Stripe **live key** 를 자기 최고 심각도 벡터
 * (`stripe-live-key`)로 다루며 3인 out-of-band 승인 없이는 통과시키지 않는다.
 * 그런데 이 목록 — ASI03 redaction 의 SoT — 에는 `sk_live_` 가 **없었다.**
 * 같은 하네스 안의 두 훅이 무엇이 시크릿인지에 대해 의견이 갈려 있었고, 그 결과
 * universe 가 가장 위험하다고 선언한 문자열이 **출력에서 redact 되지 않았다.**
 *
 * 실측으로 확인(2026-07-27): `SECRET_REDACT_MODE=block` 에 Stripe live key 모양
 * 문자열을 흘려도 exit 0.
 *
 * 목록을 넓힐 때의 기준 두 가지:
 *   1. **이 universe 가 실제로 쓰는 것**(secrets-policy · payment-safety ·
 *      secret-store 가 이름을 대는 것) 우선 — 상상 속 provider 를 채우지 않는다.
 *   2. **접두사가 충분히 특이할 것.** 짧고 흔한 접두사는 오탐으로 신뢰를 깎는다
 *      (이 저장소가 가드 오탐으로 반복해 배운 것).
 */
export const SECRET_PATTERNS: ReadonlyArray<SecretPattern> = [
	{ id: "anthropic-key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g, tag: "sk-ant-" },
	{ id: "athsra-token", re: /\batk_[A-Za-z0-9_-]{20,}\b/g, tag: "atk_" },
	// athsra **service** token. `atk_`(device) 만 있고 이게 없었다 — 그런데 이 머신이
	// 실제로 쓰는 건 전부 이쪽이다: modfolio-infra 실측(2026-07-31)
	// `~/.athsra/remote-tokens/` **34개 전부 `ats_` · `atk_` 0개**.
	// 즉 목록이 **안 쓰는 계열만 덮고 유일하게 쓰는 계열은 못 보고** 있었다.
	//
	// 그 공백의 대가가 이 저장소 안에 있었다: `memory/evalsets/muse-live-prompts.json`
	// 에 실 토큰 1건(47자)이 **커밋된 채로** 있었다. 어젯밤 PAT 사고 뒤 수확기에
	// `scanSecrets` 게이트를 붙였는데, 그 게이트가 이 계열을 몰라서 그대로 통과시켰다.
	// 커버리지 공백은 "위반 0" 과 구분되지 않는다 — `napi_`·`db-uri` 에 이어 세 번째다.
	{
		id: "athsra-service-token",
		re: /\bats_[A-Za-z0-9_-]{20,}\b/g,
		tag: "ats_",
	},
	// modfolio-connect Personal Access Token — `mfp_<prefix>_<secret>`
	// (`packages/core/src/services/domain/personal-access-token.ts:8`, 실측 형태
	// `/^mfp_[0-9a-f]+_[0-9a-f]+$/`). atelier-and-folio 2026-08-04 제보.
	//
	// ⚠ 이 계열이 다른 것들보다 나쁜 이유: connect 문서가 이 토큰을 **에이전트에게 주라고
	// 명시적으로 지시**한다 — `docs/api/personal-access-tokens.md:11` *"Give it to your
	// tool (e.g. Claude Code) as `MODFOLIO_PAT`"* + §4 *"For an AI agent (e.g. Claude
	// Code)"*. 즉 **설계상 에이전트 세션에 들어오게 돼 있는데** 그 경로의 리댁터가
	// 계열을 몰랐다. `ats_`(infra 2026-07-31)에 이어 같은 클래스의 두 번째다.
	//
	// 「목록은 원리적으로 «이미 아는 것»만 덮는다」 — 이번에 빠진 것이 하필 fleet 이
	// 앞으로 가장 많이 쓰게 될 계열이었다.
	{
		id: "modfolio-pat",
		re: /\bmfp_[A-Za-z0-9]+_[A-Za-z0-9]{16,}\b/g,
		tag: "mfp_",
	},
	{ id: "github-pat", re: /\bghp_[A-Za-z0-9]{30,}\b/g, tag: "ghp_" },
	// GitHub's fine-grained PAT — the CURRENT default format. `ghp_` above is the
	// legacy classic token, so a token issued today was not covered at all.
	{
		id: "github-pat-fine",
		re: /\bgithub_pat_[A-Za-z0-9_]{30,}\b/g,
		tag: "github_pat_",
	},
	{ id: "hf-token", re: /\bhf_[A-Za-z0-9]{30,}\b/g, tag: "hf_" },
	{ id: "resend-key", re: /\bre_[A-Za-z0-9_]{30,}\b/g, tag: "re_" },
	// Stripe — payment-safety 의 최고 심각도 벡터. secret·restricted 둘 다.
	{ id: "stripe-secret", re: /\bsk_live_[A-Za-z0-9]{16,}\b/g, tag: "sk_live_" },
	{
		id: "stripe-restricted",
		re: /\brk_live_[A-Za-z0-9]{16,}\b/g,
		tag: "rk_live_",
	},
	// OpenAI project key (`sk-proj-`). 별도 등재 — 위 `sk-ant-` 와 접두사가 다르다.
	{ id: "openai-key", re: /\bsk-proj-[A-Za-z0-9_-]{20,}\b/g, tag: "sk-proj-" },
	// Cloudflare API token — 이 universe 의 배포 자격증명(mega-token). 길이 40 고정.
	{ id: "cloudflare-token", re: /\bcf_[A-Za-z0-9_-]{32,}\b/g, tag: "cf_" },
	// Neon API key. universe 표준 DB 가 Neon(DB-per-service, canon
	// project-infrastructure-registry.md)인데 **접두사가 등재돼 있지 않았다** —
	// 2026-07-29 에 세션 트랜스크립트 수확물에서 4건이 이 스캐너를 그대로 통과했다.
	// 커버리지 공백은 "위반 0"과 구분되지 않는다(agent-evidence: 도구가 못 보는 것을
	// 통과로 세지 않는다).
	{ id: "neon-api-key", re: /\bnapi_[A-Za-z0-9]{24,}\b/g, tag: "napi_" },
	// Moonshot(Kimi) API key. 2026-07-29 도입. `sk-` 뒤가 base62 40+ 로 위 `sk-ant-`·
	// `sk-proj-` 어느 쪽에도 안 걸린다.
	{ id: "moonshot-key", re: /\bsk-[A-Za-z0-9]{40,}\b/g, tag: "sk-(moonshot)" },
	// Slack bot/user token — MCP 커넥터 경로로 세션에 등장할 수 있다.
	{ id: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g, tag: "xox" },
	// AWS access key id — universe 표준은 아니지만 붙여넣기로 유입되면 치명적이다.
	{ id: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/g, tag: "AKIA" },
	// 자격증명이 박힌 DB/브로커 커넥션 URI. 접두사 토큰이 아니라 **구조**라서 위 패턴들이
	// 하나도 못 잡는다 — 2026-07-30 실측: 커밋된 실사용 평가셋에 `postgresql://user:pw@host`
	// 형태 6건이 scanSecrets 0건을 통과한 채 들어 있었다(같은 주에 `napi_` 미등재로 4건이
	// 통과한 것과 같은 클래스: 커버리지 공백은 "위반 0" 과 구분되지 않는다).
	//
	// 비밀번호를 `[^@\s/]{6,}` 로 잡아 `postgres://localhost/db` 같은 무자격증명 URI 와
	// `redis://:@h` 같은 빈 자격증명은 통과시킨다. Neon/Supabase/Upstash 가 전부 이 형태다.
	//
	// ⚠ 이 패턴만 `accept` 를 갖는다 — 접두사가 아니라 **구조**라서 정규식만으로는
	// placeholder·셸 보간과 실 자격증명이 구분되지 않는다 (위 함수 주석의 실측표).
	{
		id: "db-uri-credentials",
		re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqps?):\/\/[^:@\s/]+:[^@\s/]{6,}@/g,
		tag: "uri://user:pw@",
		accept: acceptDbUriMatch,
	},
];

/**
 * 텍스트 1개에서 매칭된 패턴 목록 (id 당 1회). /g/ lastIndex 상태 안전.
 *
 * `accept` 가 있는 패턴은 **매치를 하나씩 검사**해 하나라도 통과해야 히트로 센다 —
 * `re.test()` 만 쓰면 같은 줄의 placeholder 하나가 실 자격증명을 가리거나(반대로) 만든다.
 */
export function scanSecrets(text: string): Array<{ id: string; tag: string }> {
	const hits: Array<{ id: string; tag: string }> = [];
	for (const { id, re, tag, accept } of SECRET_PATTERNS) {
		re.lastIndex = 0;
		if (accept === undefined) {
			if (re.test(text)) hits.push({ id, tag });
			re.lastIndex = 0;
			continue;
		}
		let m: RegExpExecArray | null = re.exec(text);
		while (m !== null) {
			if (accept(m[0])) {
				hits.push({ id, tag });
				break;
			}
			m = re.exec(text);
		}
		re.lastIndex = 0;
	}
	return hits;
}

/**
 * JSON-호환 값을 재귀 순회하며 string leaf 마다 스캔 — 히트한 필드 경로를
 * 지목한다 (debrief 카드처럼 구조화된 산출물의 거부 사유 표시용).
 */
export function scanSecretsDeep(
	value: unknown,
	path = "$",
): Array<{ path: string; id: string }> {
	if (typeof value === "string") {
		return scanSecrets(value).map(({ id }) => ({ path, id }));
	}
	if (Array.isArray(value)) {
		return value.flatMap((v, i) => scanSecretsDeep(v, `${path}[${i}]`));
	}
	if (typeof value === "object" && value !== null) {
		return Object.entries(value).flatMap(([k, v]) =>
			scanSecretsDeep(v, `${path}.${k}`),
		);
	}
	return [];
}

/**
 * 접두사를 **모르는** 자격증명을 모양으로 잡는다.
 *
 * ## 왜 필요한가 (2026-07-31 오너 지시)
 *
 * `SECRET_PATTERNS` 는 **접두사 목록**이라 새 계열은 **원리적으로** 통과한다. 실제로 세 번
 * 통과했다: `napi_`(Neon, 4건) → `db-uri`(구조, 6건) → `ats_`(athsra service, 1건).
 * 마지막 것은 **전날 PAT 사고 직후 붙인 게이트가** 그대로 지나쳤다 — 목록에 없었으니까.
 *
 * 오너: *"뭔가 유출이 우려될만한 일이 생기면, **애초에 이런 일이 안 생기도록** 더 철저하게
 * 해줘야 하는 거 아니야?"* → 벤더를 하나씩 쫓는 것으로는 안 된다. **자격증명 대입의 모양**을
 * 잡는다: `이름처럼 생긴 키 = 엔트로피 높은 값`.
 *
 * ## ⚠ 어디에 쓰고 어디에 안 쓰나 — 이게 이 함수의 절반이다
 *
 * 같은 밤에 배운 것: **같은 패턴 목록이 오차 선호가 반대인 두 소비자를 섬기면 안 된다.**
 * 이건 **과매칭이 안전한 쪽에만** 붙인다:
 *
 * - ✅ **수확기**(`harvest-prompts.ts`) — 걸리면 그 프롬프트를 **드롭**한다. 평가셋에서
 *   하나 빠지는 비용은 0 에 가깝고, 커밋된 시크릿의 비용은 크다.
 * - ✅ **리댁션**(`post-secret-redact`) — 가려서 나쁠 게 없다.
 * - ❌ **T5 커밋 스캔** — 여기 붙이면 오탐 P0 가 진짜를 묻는다(오늘 밤 두 번 겪었다).
 *
 * ## 판정
 *
 * `KEY=<값>` · `KEY: <값>` · `export KEY=<값>` · `Authorization: Bearer <값>` 에서
 * 키 이름이 자격증명처럼 생기고(`*_TOKEN`·`*_KEY`·`*_SECRET`·`PASSWORD`·`AUTH*`)
 * 값이 **20자 이상 · 문자군 2종 이상 · 섀넌 엔트로피 ≥3.0 bit/char** 이면 참.
 *
 * 엔트로피 문턱이 하는 일: `API_KEY=your_api_key_here` 나 `TOKEN=changeme` 같은
 * placeholder 를 걸러낸다(반복·사전어는 엔트로피가 낮다).
 */
export function looksLikeCredentialAssignment(text: string): boolean {
	const KEYISH =
		/(?:^|[\s{,;"'`])(?:export\s+)?([A-Za-z_][A-Za-z0-9_]{2,40}(?:TOKEN|KEY|SECRET|PASSWORD|PASSWD|CREDENTIAL|APIKEY)|AUTH[A-Z0-9_]*)["'`]?\s*[:=]\s*["'`]?([A-Za-z0-9_\-./+=]{20,})/gi;
	const BEARER = /\bBearer\s+([A-Za-z0-9_\-./+=]{20,})/g;
	for (const re of [KEYISH, BEARER]) {
		re.lastIndex = 0;
		let m: RegExpExecArray | null = re.exec(text);
		while (m !== null) {
			const value = (m[2] ?? m[1]) as string;
			if (hasCredentialEntropy(value)) return true;
			m = re.exec(text);
		}
		re.lastIndex = 0;
	}
	return false;
}

/** 값이 무작위처럼 보이는가 — 문자군 다양성 + 섀넌 엔트로피. */
export function hasCredentialEntropy(value: string): boolean {
	if (value.length < 20) return false;
	// ⚠ **엔트로피만으로는 placeholder 를 못 가른다.** 실측 2026-07-31:
	// `your_api_key_here_please` 의 섀넌 엔트로피는 3.5 로 실 토큰과 구분되지 않는다
	// (서로 다른 글자가 많으면 엔트로피는 올라간다 — 무작위성과 다른 성질이다).
	// 대조쌍이 이걸 잡았다. 그래서 두 축을 더한다: **자리표시 어휘**와 **문자군**.
	if (
		/(?<![a-z])(your|here|placeholder|example|dummy|changeme|change_me|replace|redacted|todo|sample|mock|fake)(?![a-z])/i.test(
			value,
		)
	) {
		return false;
	}
	// 소문자+언더스코어만으로 이뤄진 값은 사람이 쓴 이름이지 무작위 토큰이 아니다.
	// 실 토큰은 대문자나 숫자가 거의 항상 섞인다(hex 도 숫자를 갖는다).
	if (/^[a-z_]+$/.test(value)) return false;
	let classes = 0;
	if (/[a-z]/.test(value)) classes += 1;
	if (/[A-Z]/.test(value)) classes += 1;
	if (/[0-9]/.test(value)) classes += 1;
	if (/[_\-./+=]/.test(value)) classes += 1;
	if (classes < 2) return false;
	const freq = new Map<string, number>();
	for (const ch of value) freq.set(ch, (freq.get(ch) ?? 0) + 1);
	let h = 0;
	for (const n of freq.values()) {
		const p = n / value.length;
		h -= p * Math.log2(p);
	}
	return h >= 3.0;
}
