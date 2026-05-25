/**
 * scripts/hooks/post-secret-redact.ts
 *
 * PostToolUse hook for Bash + Read.
 *
 * Tool output 에서 secret prefix (sk-ant-, atk_, ghp_, hf_, re_, etc.) 검출 시
 * stderr 경고 + (옵션) `hookSpecificOutput.updatedToolOutput` 으로 redaction.
 *
 * OWASP Agentic 2026 매핑:
 *   - ASI03 Identity & Privilege — chat output / log 의 secret 노출 차단
 *
 * 동작:
 *   1. tool_response.stdout / stderr / content 안에서 secret prefix regex 매칭
 *   2. SECRET_REDACT_MODE=warn (default): stderr 로 경고만 (allow)
 *   3. SECRET_REDACT_MODE=redact: stdout JSON `{ hookSpecificOutput: { updatedToolOutput: ... } }` 으로 redact
 *   4. SECRET_REDACT_MODE=block: exit 2 (전체 차단 — 디버깅/CI 권장 X, 1머신 dogfood 만)
 *
 * Test 자동화: `scripts/modfolio/governance.ts` 의 ASI03 (file-system secret scan) 과 정합.
 *   - hook = runtime 차단 / governance = static scan
 *
 * Note: PostToolUse 의 `hookSpecificOutput.updatedToolOutput` schema 는 Claude Code v2.x+
 *       지원. 사용 환경에서 schema 미지원 시 자동 fallback (warn).
 */

import { readHookInput } from "./_lib.ts";

interface HookInput {
	tool_name?: string;
	tool_response?: {
		stdout?: string;
		stderr?: string;
		content?: string;
		output?: string;
		[key: string]: unknown;
	};
}

const SECRET_PATTERNS: ReadonlyArray<{ id: string; re: RegExp; tag: string }> =
	[
		{
			id: "anthropic-key",
			re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
			tag: "sk-ant-",
		},
		{ id: "athsra-token", re: /\batk_[A-Za-z0-9_-]{20,}\b/g, tag: "atk_" },
		{ id: "github-pat", re: /\bghp_[A-Za-z0-9]{30,}\b/g, tag: "ghp_" },
		{ id: "hf-token", re: /\bhf_[A-Za-z0-9]{30,}\b/g, tag: "hf_" },
		{ id: "resend-key", re: /\bre_[A-Za-z0-9_]{30,}\b/g, tag: "re_" },
	];

type Mode = "off" | "warn" | "redact" | "block";
function resolveMode(): Mode {
	const raw = (process.env.SECRET_REDACT_MODE ?? "warn").toLowerCase();
	if (raw === "off" || raw === "warn" || raw === "redact" || raw === "block")
		return raw;
	return "warn";
}

const mode = resolveMode();
if (mode === "off") process.exit(0);

const input = (await readHookInput()) as HookInput;
const tr = input.tool_response ?? {};
const fields = ["stdout", "stderr", "content", "output"] as const;
const hits: { field: string; pattern: string }[] = [];
const redacted: Record<string, unknown> = { ...tr };

for (const f of fields) {
	const raw = (tr as Record<string, unknown>)[f];
	if (typeof raw !== "string" || raw.length === 0) continue;
	let updated = raw;
	for (const { id, re, tag } of SECRET_PATTERNS) {
		if (re.test(raw)) {
			hits.push({ field: f, pattern: id });
			updated = updated.replace(re, `${tag}[REDACTED-ASI03-${id}]`);
		}
	}
	if (updated !== raw) redacted[f] = updated;
}

if (hits.length === 0) process.exit(0);

const msg = [
	`ASI03 secret literal 검출 in tool output:`,
	hits.map((h) => `  - ${h.field}: ${h.pattern}`).join("\n"),
	`tool=${input.tool_name ?? "?"}, mode=${mode}`,
	`조치: athsra get / wrangler secret put 으로 secret 이전. git history 검토.`,
	`mode 우회: SECRET_REDACT_MODE=off (env)`,
].join("\n");

if (mode === "block") {
	console.error(`BLOCKED: ${msg}`);
	process.exit(2);
}

if (mode === "redact") {
	console.error(`REDACTED: ${msg}`);
	const output = {
		hookSpecificOutput: {
			hookEventName: "PostToolUse",
			updatedToolOutput: redacted,
		},
	};
	process.stdout.write(JSON.stringify(output));
	process.exit(0);
}

// warn mode — stderr 만, allow
console.error(`WARN: ${msg}`);
process.exit(0);
