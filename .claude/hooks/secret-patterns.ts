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
];

/** 텍스트 1개에서 매칭된 패턴 목록 (id 당 1회). /g/ lastIndex 상태 안전. */
export function scanSecrets(text: string): Array<{ id: string; tag: string }> {
	const hits: Array<{ id: string; tag: string }> = [];
	for (const { id, re, tag } of SECRET_PATTERNS) {
		re.lastIndex = 0;
		if (re.test(text)) hits.push({ id, tag });
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
