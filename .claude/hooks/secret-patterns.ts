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

export const SECRET_PATTERNS: ReadonlyArray<SecretPattern> = [
	{ id: "anthropic-key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g, tag: "sk-ant-" },
	{ id: "athsra-token", re: /\batk_[A-Za-z0-9_-]{20,}\b/g, tag: "atk_" },
	{ id: "github-pat", re: /\bghp_[A-Za-z0-9]{30,}\b/g, tag: "ghp_" },
	{ id: "hf-token", re: /\bhf_[A-Za-z0-9]{30,}\b/g, tag: "hf_" },
	{ id: "resend-key", re: /\bre_[A-Za-z0-9_]{30,}\b/g, tag: "re_" },
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
