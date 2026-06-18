/**
 * scripts/hooks/pre-payment-guard.ts
 *
 * PreToolUse(Bash) + PreToolUse(mcp__*) hook. Blocks agent-initiated money-spend
 * unless an out-of-band human approval token is present. Exit 2 = block, 0 = allow.
 *
 * The guard exists because the fleet runs `bypassPermissions` (zero approve-prompt),
 * so a DETERMINISTIC hook is the only safety net — not an LLM filter (5% bypass).
 * Real-world motivation: an AI that autonomously spent money and bankrupted a company.
 *
 * Tiers (interactive): critical=3 approvals, high=2, medium=1. Autonomous/headless
 * (cron · ralph-loop · loop) = HARD block, no approval path. canon: payment-safety.md.
 *
 * Honest scope: a dev-time hook only sees the Bash/MCP tool input it is given. It
 * does NOT see runtime app spend (a deployed Worker calling Stripe in prod). It
 * raises the bar from "agent silently spends in one Bash call" to "agent is blocked,
 * needs N out-of-band human approvals it cannot manufacture, every attempt audited."
 *
 * Residual gap (documented, not hidden): a Bash-capable agent can write files, so the
 * approval path is protected by a permissions.deny rule (deny > bypass); the only fully
 * agent-proof leg is a human creating the token in a separate, un-agented terminal.
 *
 * 우회 (사람용 escape, logged): PAYMENT_GUARD_MODE=off | warn  (기본 block).
 */

import { createHash } from "node:crypto";
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { bashCommand, gitRoot, readHookInput } from "./_lib.ts";

type Tier = "critical" | "high" | "medium";
type Mode = "off" | "warn" | "block";
interface Rule {
	re: RegExp;
	vector: string;
	why: string;
}
interface Hit {
	tier: Tier;
	vector: string;
	why: string;
}

const REQUIRED: Record<Tier, number> = { critical: 3, high: 2, medium: 1 };

// Allowlist — checked FIRST. Safe equivalents (no money / sandbox / read-only)
// so the guard does not become noise that gets disabled.
// Allowlist — safe equivalents (no money / sandbox / read-only). Applied
// PER-SEGMENT (see classify) so an appended decoy can't rescue a spend segment.
const SAFE_ALLOW: RegExp[] = [
	/--dry-run\b/i,
	/\b(sk|pk|rk)_test_|whsec_test/i,
	/\bstripe\s+(listen|trigger|fixtures|samples|get|retrieve|list)\b/i,
	/\bwrangler\s+[a-z:0-9 ]*\b(list|get|info|tail|versions|whoami)\b/i,
	/\bwrangler\s+dev\b/i,
	/\bminiflare\b/i,
	/--keep-vars\b/i,
];

// Segments whose LEADING command cannot move money — skipped so a quoted/echoed
// pattern (`echo 'terraform apply'`, `grep 'stripe charges create'`) is not a
// false positive (and so a decoy `echo --dry-run` segment can't whitelist).
const INERT_LEAD =
	/^\s*(echo|printf|cat|grep|rg|ls|head|tail|less|more|true|sed|awk|test|\[|:)\b/i;

const CRITICAL: Rule[] = [
	{
		re: /\bstripe\s+(charges?|payment_?intents?|payouts?|transfers?|refunds?|invoiceitems?|subscriptions?)\s+(create|capture|confirm|pay|finalize)\b/i,
		vector: "stripe-live-charge",
		why: "live Stripe money movement via CLI",
	},
	{
		re: /\b(sk|rk)_live_[0-9A-Za-z]/i,
		vector: "stripe-live-key",
		why: "live Stripe secret key present",
	},
	{
		re: /\btoss-?payments?\b[^\n]*\b(confirm|approve|charge|billing)\b/i,
		vector: "toss-live",
		why: "Toss Payments live confirm/charge",
	},
	{
		re: /\b(paddle|lemon-?squeezy|square|adyen|razorpay|mollie|gumroad|paypal|braintree|chargebee|recurly)\b[^\n]*\b(create|capture|charge|pay|authori[sz]e|sale|payout|refund|subscription)\b/i,
		vector: "payment-provider-live",
		why: "live payment-provider money movement",
	},
	{
		re: /\b(namecheap|gandi|porkbun|godaddy|route53domains|gcloud\s+domains)\b[^\n]*\b(register|purchase|buy|create|transfer)\b/i,
		vector: "domain-register",
		why: "paid domain registration",
	},
	{
		re: /\b(coinbase|metamask|ethers|web3|wallet)\b[^\n]*\b(send|transfer|sendtransaction|pay)\b/i,
		vector: "crypto-send",
		why: "crypto wallet outbound transfer",
	},
];

const HIGH: Rule[] = [
	{
		re: /\bwrangler\s+(r2\s+bucket|d1|kv:?namespace|queues|hyperdrive|vectorize|pages\s+project)\s+create\b/i,
		vector: "cf-paid-resource",
		why: "creates a billable Cloudflare resource",
	},
	{
		re: /\b(terraform|tofu)\s+apply\b/i,
		vector: "iac-apply",
		why: "provisions real infrastructure (terraform)",
	},
	{
		re: /\bpulumi\s+up\b/i,
		vector: "iac-apply",
		why: "provisions real infrastructure (pulumi)",
	},
	{
		re: /\b(sst|cdk|serverless)\s+deploy\b/i,
		vector: "iac-apply",
		why: "provisions real infrastructure (IaC)",
	},
	{
		re: /\b(aws|gcloud|az)\b[^\n]*\b(create|run-instances|provision|deploy|up)\b/i,
		vector: "cloud-provision",
		why: "provisions a billable cloud resource (non-CF — also off-policy)",
	},
	{
		re: /\b(vercel\b[^\n]*(--prod|deploy)|netlify\s+deploy|railway\s+up|fly(?:ctl)?\s+deploy|render\b[^\n]*deploy|heroku\s+(create|ps:scale))/i,
		vector: "non-cf-deploy",
		why: "paid non-Cloudflare deploy (also off-policy)",
	},
	{
		re: /\bgh\s+codespace\s+create\b/i,
		vector: "gh-codespace",
		why: "GitHub Codespace (bills hourly)",
	},
	{
		re: /\bgh\b[^\n]*\bbilling\b/i,
		vector: "gh-billing",
		why: "GitHub billing / plan change",
	},
];

const MEDIUM: Rule[] = [
	{
		re: /\btwilio\b[^\n]*\bmessages\b[^\n]*\bcreate\b/i,
		vector: "sms-send",
		why: "Twilio SMS send (metered)",
	},
	{
		re: /\bresend\s+(emails?:send|emails?\s+send|send)\b/i,
		vector: "email-send",
		why: "Resend email send (metered)",
	},
	{
		re: /\b(huggingface|replicate)\b[^\n]*\b(inference|predict|run)\b/i,
		vector: "paid-inference",
		why: "paid model inference",
	},
	{
		re: /\bopenai\s+api\b[^\n]*\bcreate\b/i,
		vector: "paid-inference",
		why: "paid OpenAI API call",
	},
	{
		re: /\bgh\s+(workflow\s+run|api\b[^\n]*dispatches)\b/i,
		vector: "gha-minutes",
		why: "triggers paid GitHub Actions minutes (gh-actions-policy.md)",
	},
];

// curl/wget to a paid API — order-INDEPENDENT (curl + write-verb + host in any
// order). Fixes the arg-order bypass (`curl -X POST <host>` and `curl <host> -d`).
const PAYMENT_HOSTS =
	/\bapi\.(stripe|tosspayments)\.com\b|\bapi\.paypal\.com\b|\bapi\.adyen\.com\b/i;
const METERED_HOSTS =
	/\b(api\.resend\.com|api\.twilio\.com|api-inference\.huggingface\.co|api\.replicate\.com|api\.openai\.com|api\.anthropic\.com)\b/i;
const HTTP_WRITE =
	/-X\s*(POST|PUT|PATCH|DELETE)\b|--request\s+(POST|PUT|PATCH|DELETE)\b|(?:^|\s)(-d\b|--data\b|--data-raw\b|--data-binary\b|--json\b|-F\b|--form\b)/i;

function curlSpend(seg: string): Hit | null {
	if (!/\b(curl|wget|http|https)\b/i.test(seg) || !HTTP_WRITE.test(seg))
		return null;
	if (PAYMENT_HOSTS.test(seg)) {
		return {
			tier: "critical",
			vector: "payment-raw-write",
			why: "raw write to a live payment API",
		};
	}
	if (METERED_HOSTS.test(seg)) {
		return {
			tier: "medium",
			vector: "metered-paid-api",
			why: "raw write to a metered paid API",
		};
	}
	return null;
}

// MCP payment-capable tools — the hook only sees the tool name + serialized args.
const MCP_PAYMENT =
	/payment|charge|stripe|toss|payout|invoice|checkout|billing|subscription|\bpay\b|transfer|refund|wallet|fund|square|paddle|paypal|adyen|razorpay|mollie/i;

function resolveMode(): Mode {
	const raw = (process.env.PAYMENT_GUARD_MODE ?? "block").toLowerCase();
	return raw === "off" || raw === "warn" || raw === "block" ? raw : "block";
}

function isAutonomous(): boolean {
	// Explicit marker set by the loop/ralph/schedule engines, or CI. NOTE: we do
	// NOT use process.stdout.isTTY — a hook subprocess always has piped stdio, so
	// isTTY would mislabel every interactive session as autonomous.
	return process.env.MODFOLIO_AUTONOMOUS === "1" || process.env.CI === "true";
}

function loadProjectAllow(root: string): RegExp[] {
	const p = join(root, ".claude", "rules", "payment-allowlist.json");
	if (!existsSync(p)) return [];
	try {
		const data = JSON.parse(readFileSync(p, "utf-8")) as {
			entries?: Array<{ pattern?: string }>;
		};
		const out: RegExp[] = [];
		for (const e of data.entries ?? []) {
			if (typeof e.pattern === "string") {
				try {
					out.push(new RegExp(e.pattern, "i"));
				} catch {
					// bad regex in allowlist — ignore that entry, never crash the guard.
				}
			}
		}
		return out;
	} catch {
		return [];
	}
}

// Strip shell comments so a decoy in a `# ...` comment can't whitelist a spend.
function stripComments(s: string): string {
	return s.replace(/#.*$/gm, "");
}

// Split a compound command into shell segments — a decoy allow-token in one
// segment then cannot rescue a spend in another (the SAFE_ALLOW-decoy bypass).
function segments(cmd: string): string[] {
	return stripComments(cmd)
		.split(/\n|;|&&|\|\||\||&/)
		.map((s) => s.trim())
		.filter(Boolean);
}

function classifySegment(seg: string, projectAllow: RegExp[]): Hit | null {
	if (INERT_LEAD.test(seg)) return null;
	for (const re of SAFE_ALLOW) if (re.test(seg)) return null;
	for (const re of projectAllow) if (re.test(seg)) return null;
	const curl = curlSpend(seg);
	if (curl) return curl;
	for (const r of CRITICAL)
		if (r.re.test(seg))
			return { tier: "critical", vector: r.vector, why: r.why };
	for (const r of HIGH)
		if (r.re.test(seg)) return { tier: "high", vector: r.vector, why: r.why };
	for (const r of MEDIUM)
		if (r.re.test(seg)) return { tier: "medium", vector: r.vector, why: r.why };
	return null;
}

function classify(
	haystack: string,
	toolName: string,
	projectAllow: RegExp[],
): Hit | null {
	// MCP: name-based on the whole payload (not shell-segmentable).
	if (
		toolName.startsWith("mcp__") &&
		(MCP_PAYMENT.test(toolName) || MCP_PAYMENT.test(haystack))
	) {
		return {
			tier: "high",
			vector: "mcp-payment",
			why: "payment-capable MCP tool",
		};
	}
	// Bash: classify each shell segment independently (decoy-resistant).
	for (const seg of segments(haystack)) {
		const hit = classifySegment(seg, projectAllow);
		if (hit) return hit;
	}
	return null;
}

// Audit destination — overridable (PAYMENT_AUDIT_PATH) so tests never pollute
// the tracked log. Default: <repo>/memory/payment-approvals.jsonl — TRACKED +
// merge=union (.gitattributes) so the forensic trail transfers across devices
// and cross-device appends merge cleanly. canon payment-safety.md §7.
function auditPath(root: string): string {
	return (
		process.env.PAYMENT_AUDIT_PATH ||
		join(root, "memory", "payment-approvals.jsonl")
	);
}

function audit(root: string, record: Record<string, unknown>): void {
	try {
		const p = auditPath(root);
		mkdirSync(dirname(p), { recursive: true });
		appendFileSync(
			p,
			`${JSON.stringify({ ts: new Date().toISOString(), ...record })}\n`,
		);
	} catch {
		// audit must never block the guard decision.
	}
}

interface ApprovalEntry {
	by?: string;
	at?: string;
}
interface ApprovalToken {
	command_sha256?: string;
	expires_at?: string;
	approvals?: ApprovalEntry[];
}

// Approvals are CONTEMPORANEOUS confirmations, not standing grants — cap the
// window so a forged far-future expiry can't create a long-lived auto-approve.
const MAX_APPROVAL_WINDOW_MS = 10 * 60 * 1000;

function validateApproval(
	approvalPath: string,
	cmdHash: string,
	required: number,
): { ok: true } | { ok: false; reason: string } {
	if (!existsSync(approvalPath))
		return { ok: false, reason: "no approval file" };
	let tok: ApprovalToken;
	try {
		tok = JSON.parse(readFileSync(approvalPath, "utf-8")) as ApprovalToken;
	} catch {
		return { ok: false, reason: "unparseable approval file" };
	}
	if (tok.command_sha256 !== cmdHash) {
		return {
			ok: false,
			reason: "scope mismatch (approval is for a different command)",
		};
	}
	const exp = tok.expires_at ? Date.parse(tok.expires_at) : Number.NaN;
	if (Number.isNaN(exp))
		return { ok: false, reason: "missing/invalid expires_at" };
	const now = Date.now();
	if (exp < now) return { ok: false, reason: "approval expired" };
	if (exp - now > MAX_APPROVAL_WINDOW_MS) {
		return {
			ok: false,
			reason:
				"expires_at too far ahead (max 10 min — approvals are not standing grants)",
		};
	}
	// Each approval must be a DISTINCT named human confirmation ({"by","at"}).
	// Bare values (e.g. [1,2,3]) or duplicate names do NOT count — this raises
	// the forgery bar past "array length". Full closure still needs a human in a
	// non-agented terminal (documented residual gap, payment-safety.md §4).
	const approvals = Array.isArray(tok.approvals) ? tok.approvals : [];
	const names = new Set<string>();
	for (const a of approvals) {
		if (a && typeof a === "object" && typeof a.by === "string" && a.by.trim()) {
			names.add(a.by.trim().toLowerCase());
		}
	}
	if (names.size < required) {
		return {
			ok: false,
			reason: `needs ${required} DISTINCT named approval(s) {"by","at"}, has ${names.size}`,
		};
	}
	return { ok: true };
}

// ─── Main ────────────────────────────────────────────────────────────────────

const mode = resolveMode();
if (mode === "off") process.exit(0);

const input = await readHookInput();
const toolName = input.tool_name ?? "";
const bash = bashCommand(input);
const haystack = bash || JSON.stringify(input.tool_input ?? {});
const isMcp = toolName.startsWith("mcp__");
// Nothing to inspect — but for MCP the tool NAME alone is a signal, so don't
// early-exit on empty args when it's an mcp__* tool.
if (!isMcp && (!haystack || haystack === "{}")) process.exit(0);

const root = gitRoot();
const hit = classify(haystack, toolName, loadProjectAllow(root));
if (!hit) process.exit(0);

const cmdHash = createHash("sha256")
	.update(haystack)
	.digest("hex")
	.slice(0, 16);
const preview = haystack.replace(/\s+/g, " ").slice(0, 80);
const autonomous = isAutonomous();

// Autonomous / headless — HARD block, no approval path (no human to approve).
if (autonomous) {
	audit(root, {
		event: "denied-autonomous",
		vector: hit.vector,
		severity: hit.tier,
		command_sha256: cmdHash,
		command_preview: preview,
		mode,
		autonomous: true,
	});
	console.error(
		[
			`BLOCKED (pre-payment-guard): ${hit.tier.toUpperCase()} money-spend in AUTONOMOUS mode.`,
			`vector=${hit.vector} — ${hit.why}`,
			`No approval path exists when no human is present. cron / ralph-loop / loop`,
			`MUST NOT spend money unattended (lethal-trifecta.md, payment-safety.md §5).`,
		].join("\n"),
	);
	process.exit(2);
}

// warn mode — non-blocking escape hatch (logged).
if (mode === "warn") {
	audit(root, {
		event: "warned",
		vector: hit.vector,
		severity: hit.tier,
		command_sha256: cmdHash,
		command_preview: preview,
		mode,
		autonomous: false,
	});
	console.error(
		`WARN (pre-payment-guard): ${hit.tier.toUpperCase()} money-spend — ${hit.vector}: ${hit.why}`,
	);
	process.exit(0);
}

// block mode (default) — require an out-of-band human approval token.
const required = REQUIRED[hit.tier];
const approvalPath = join(root, ".claude", "payment-approval.json");
const verdict = validateApproval(approvalPath, cmdHash, required);

if (verdict.ok) {
	// Single-use: consume the token so it cannot be replayed for this command.
	// Next attempt needs a fresh human approval. (The deny rule keeps the agent
	// from re-creating it via Write/Edit; Bash-forge remains the documented gap.)
	try {
		rmSync(approvalPath, { force: true });
	} catch {
		// non-fatal — the window cap + scope binding still bound a stale token.
	}
	audit(root, {
		event: "consumed",
		vector: hit.vector,
		severity: hit.tier,
		command_sha256: cmdHash,
		command_preview: preview,
		mode,
		autonomous: false,
		approvals_count: required,
	});
	process.exit(0);
}

audit(root, {
	event: "blocked",
	vector: hit.vector,
	severity: hit.tier,
	command_sha256: cmdHash,
	command_preview: preview,
	mode,
	autonomous: false,
	reason: verdict.reason,
});
console.error(
	[
		`BLOCKED (pre-payment-guard): ${hit.tier.toUpperCase()} money-spend detected.`,
		`vector=${hit.vector} — ${hit.why}`,
		`reason: ${verdict.reason}`,
		``,
		`This requires ${required} out-of-band human approval(s). THE AGENT CANNOT self-approve.`,
		`In a SEPARATE terminal (not via the agent), a human creates:`,
		`  ${approvalPath}`,
		`  {`,
		`    "command_sha256": "${cmdHash}",`,
		`    "expires_at": "<ISO 8601, within 10 min>",`,
		`    "approvals": [ ${required} DISTINCT entries {"by":"name","at":"<ISO>"} ]`,
		`  }`,
		`Single-use (consumed on success). Token path is permissions.deny'd to the agent.`,
		`Audit: ${auditPath(root)}`,
		`Policy: knowledge/canon/payment-safety.md   Escape (logged): PAYMENT_GUARD_MODE=off`,
	].join("\n"),
);
process.exit(2);
