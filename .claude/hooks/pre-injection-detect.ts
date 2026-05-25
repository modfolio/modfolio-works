/**
 * scripts/hooks/pre-injection-detect.ts
 *
 * PreToolUse hook for Bash + Read + WebFetch + WebSearch.
 *
 * Tool 결과 안에 embed 된 prompt injection 패턴 (e.g. WebFetch 응답 안 "ignore previous instructions")
 * 을 감지하면 stderr 로 경고 + exit 2 (block). 사용자가 명시 confirm 후 retry 가능.
 *
 * OWASP Agentic 2026 매핑:
 *   - ASI01 Goal Hijack — embedded prompt injection 의 1차 mitigation
 *
 * Note: 본 hook 은 PreToolUse 라 tool 호출 *전* 검사 — 즉 tool input (예: Bash 명령
 *       자체 또는 Read file 의 path) 이 injection 패턴 포함 시만 차단. 출력 결과의
 *       검증은 `post-secret-redact.ts` 와 함께 PostToolUse 로 처리.
 *
 * Test 자동화: `scripts/modfolio/governance.ts` 의 ASI01 (canon/agent .md scan) 과 정합.
 *   실 차단 = 이 hook, 검사 보고 = governance.ts.
 *
 * 우회: false positive 우려 시 `INJECTION_DETECT_MODE=warn` 으로 stderr 만 출력.
 *       기본은 `warn` (block 아님 — 1머신 dogfood 안전). 정확도 검증 후 `block` 로 격상.
 */

import { readHookInput } from "./_lib.ts";

interface HookInput {
	tool_name?: string;
	tool_input?: {
		command?: string;
		file_path?: string;
		path?: string;
		url?: string;
		query?: string;
	};
}

const INJECTION_PATTERNS: ReadonlyArray<{ id: string; re: RegExp }> = [
	{
		id: "ignore-previous",
		re: /ignore\s+(?:all\s+)?previous\s+(?:instructions?|prompts?)/i,
	},
	{ id: "system-override", re: /system\s+(?:prompt\s+)?override/i },
	{
		id: "forget-instructions",
		re: /forget\s+(?:all\s+)?(?:prior\s+|previous\s+)?instructions/i,
	},
	{ id: "jailbreak-marker", re: /\bDAN\s+mode\b|\bjailbreak\b/i },
];

type Mode = "off" | "warn" | "block";
function resolveMode(): Mode {
	const raw = (process.env.INJECTION_DETECT_MODE ?? "warn").toLowerCase();
	if (raw === "off" || raw === "warn" || raw === "block") return raw;
	return "warn";
}

const mode = resolveMode();
if (mode === "off") process.exit(0);

const input = (await readHookInput()) as HookInput;
const ti = input.tool_input ?? {};
const targets: string[] = [];
if (ti.command) targets.push(ti.command);
if (ti.file_path) targets.push(ti.file_path);
if (ti.path) targets.push(ti.path);
if (ti.url) targets.push(ti.url);
if (ti.query) targets.push(ti.query);

if (targets.length === 0) process.exit(0);

const haystack = targets.join("\n");
const hits: string[] = [];
for (const { id, re } of INJECTION_PATTERNS) {
	if (re.test(haystack)) hits.push(id);
}

if (hits.length === 0) process.exit(0);

const msg = [
	`ASI01 prompt injection 패턴 의심: ${hits.join(", ")}`,
	`tool=${input.tool_name ?? "?"}, mode=${mode}`,
	`패턴: ${INJECTION_PATTERNS.filter((p) => hits.includes(p.id))
		.map((p) => p.id)
		.join("|")}`,
	`조치: tool input 에 embed 된 injection 가능성 검토. canon agent-governance.md ASI01 mitigation 참조.`,
	`mode 우회: INJECTION_DETECT_MODE=off (env)`,
].join("\n");

if (mode === "block") {
	console.error(`BLOCKED: ${msg}`);
	process.exit(2);
}

// warn mode — stderr 출력 + allow
console.error(`WARN: ${msg}`);
process.exit(0);
