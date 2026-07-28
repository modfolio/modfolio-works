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
import { failClosed } from "./_fail-closed.ts";
import { bashCommand, gitRoot, readHookInput } from "./_lib.ts";

type Tier = "critical" | "high" | "medium";
type Mode = "off" | "warn" | "block";
interface Rule {
	re: RegExp;
	vector: string;
	why: string;
	/**
	 * Presence-only vectors (a credential STRING appears) may be suppressed when
	 * the surrounding text is an obvious placeholder. Money-MOVEMENT vectors must
	 * never set this — a charge is a charge regardless of nearby words.
	 */
	placeholderSuppressible?: boolean;
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
// `git` is inert (commit/push/clone move no money; a `git commit -m '<spend text>'`
// message is DATA — paired with quote-aware segments() so the message stays one git
// segment). Note `gh` is NOT inert (gh codespace create / billing bill money).
const INERT_LEAD =
	/^\s*(echo|printf|cat|grep|rg|ls|head|tail|less|more|true|sed|awk|test|git|\[|:)\b/i;

/**
 * A credential-SHAPED string that is definitionally not a credential.
 *
 * Found 2026-07-22 by dogfooding: this guard blocked a `git commit` because the
 * COMMIT MESSAGE contained `sk_live_your_key_here` while documenting a
 * placeholder-detection fix. Prose about a key is not a key.
 *
 * Scope is deliberately tiny — it ONLY suppresses key-PRESENCE vectors
 * (`stripe-live-key` and friends), never a money-MOVEMENT verb. A command that
 * actually charges is still blocked no matter what words surround it, so this
 * cannot be used to smuggle a spend past the guard.
 *
 * Same family as the svelte-MCP carve-out (v3.17.6) and the `/home` fix
 * (v3.21.2): the guard stays absolute about real spend, and stops firing on
 * text that merely looks like it.
 */
const PLACEHOLDER_CRED =
	/x{4,}|\.{3}|_{4,}|0{6,}|(?<![a-z])(your|here|placeholder|example|dummy|changeme|change_me|replace|redacted|todo|fake|sample)(?![a-z])/i;

/**
 * True when the MATCHED credential token itself is a placeholder.
 *
 * Deliberately scoped to the token, NOT the whole segment: testing the segment
 * would let `stripe pay --key sk_live_REAL --note "example"` suppress a real
 * key just by containing an innocent word. Here only
 * `sk_live_your_key_here` — the token — can suppress itself.
 */
function isPlaceholderCredential(seg: string, re: RegExp): boolean {
	const m = re.exec(seg);
	if (!m || m.index === undefined) return false;
	// Widen the match to the full credential-ish token it sits in.
	const start = m.index;
	let end = start;
	while (end < seg.length && /[A-Za-z0-9_\-<>.]/.test(seg[end] ?? "")) end += 1;
	const token = seg.slice(start, end);
	return PLACEHOLDER_CRED.test(token) || /<[^>]*>/.test(token);
}

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
		/** Presence-only vector — suppressible by placeholder text. */
		placeholderSuppressible: true,
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

// Claude Code ENVIRONMENT MCP tools — session management / UI / visualization. They move no
// money; their ARGS are user content (a chapter title, a spawned-task PROMPT, widget code) that
// legitimately mentions "payment"/"billing" OR even describes a spend command — pure TEXT, not
// an executed spend. BOTH the MCP_PAYMENT arg-word match AND the Bash-segment fallthrough would
// false-positive on that text (observed 2026-06-29: mcp__ccd_session__mark_chapter / __spawn_task
// blocked while the session worked ON payment topics → orphaned, hung tasks). Skipped wholesale
// (like athsra) — local-only namespaces, zero external money capability. NOT including
// Claude_Preview / computer-use / Claude_in_Chrome (those can drive a browser/external payment
// surface — the guard stays on them).
const SESSION_SAFE_MCP =
	/^mcp__(ccd_session|ccd_session_mgmt|ccd_directory|visualize)__/;

// Claude Code remote/scheduling tools — schedule messages / triggers / sessions; move NO money.
// Their args (a reminder message, a trigger prompt) routinely mention "payment"/"billing" as pure
// TEXT (e.g. a status heartbeat "payment 크레딧=쿼터"), which the MCP_PAYMENT haystack match
// false-positives on → in AUTONOMOUS mode that HARD-BLOCKS the loop's OWN scheduler, killing the
// unattended/overnight run (observed 2026-07-01: send_later blocked on a heartbeat that described
// the payment policy). Matched by tool-name SUFFIX — the remote server UUID varies per connection;
// the tool names are stable. These spawn Claude work (quota, not money — payment-safety.md "credits
// ≠ $"); a real spend in a SPAWNED session is still guarded there by this same hook.
const SCHEDULER_SAFE_MCP =
	/__(send_later|create_trigger|update_trigger|delete_trigger|list_triggers|fire_trigger|list_environments|list_repos|add_repo|register_repo_root|create_scheduled_task|list_scheduled_tasks|update_scheduled_task)$/;

// GitHub MCP server — repo/PR/issue metadata + content tools; NO payment surface (no sponsors/
// marketplace/billing tools in this server). Its args are repo CONTENT: a PR body, issue comment,
// commit message, or pushed file that legitimately *describes* payment topics — this universe has a
// payments repo, so PR/issue narratives routinely say pay/billing/결제 — or even quotes a spend
// command as text GitHub never executes. Observed 2026-07-02: create_pull_request HARD-BLOCKED in a
// remote session because the PR body summarized billing-feedback synthesis (MCP_PAYMENT haystack
// match). Skipped wholesale (same reasoning as SESSION_SAFE/SCHEDULER_SAFE: args = TEXT, not an
// executed spend). Pushing code that CI later runs is not a new laundering path — plain Bash
// `git push` is already inert-lead; execution-time spends are guarded where they execute.
const GITHUB_SAFE_MCP = /^mcp__github__/;

// Cloudflare MCP server — READ-ONLY introspection tools (get/list/query resource metadata,
// docs search). They move NO money: they inspect existing Workers/D1/KV/R2/Hyperdrive, they do
// not provision. Their serialized args are resource IDENTIFIERS that routinely contain a repo/
// worker name like "modfolio-pay-app" → the MCP_PAYMENT haystack's `\bpay\b` matched the hyphen-
// bounded "pay" and HARD-BLOCKED a read-only `workers_get_worker({scriptName:"modfolio-pay-app"})`
// (observed 2026-07-02, pay round). Allowlisted by tool-name SUFFIX — the CF MCP server UUID varies
// per connection; the tool names are stable. Matched EXACTLY (read verbs only) so the billable
// WRITE tools (`*_create` / `*_delete` / `*_edit` / `*_update` — which provision paid CF resources,
// same class as the `wrangler … create` HIGH rule) are NOT allowlisted and stay guarded.
const CF_READONLY_MCP =
	/__(workers_get_worker|workers_get_worker_code|workers_list|d1_databases_list|d1_database_get|d1_database_query|kv_namespaces_list|kv_namespace_get|r2_buckets_list|r2_bucket_get|hyperdrive_configs_list|hyperdrive_config_get|search_cloudflare_documentation|migrate_pages_to_workers_guide)$/;

// Svelte MCP server — documentation lookup + `svelte-autofixer` (static code analysis / a11y +
// runes lint). NO payment surface: it reads/analyzes component CODE, provisions nothing, moves no
// money. Its serialized args are the Svelte SOURCE being analyzed — in the payments app that source
// legitimately contains "payment"/"billing"/결제 identifiers, so MCP_PAYMENT.test(haystack) matched
// and HARD-BLOCKED a pure `svelte-autofixer` analysis (observed 2026-07-04, pay session27). Skipped
// wholesale (same class as GITHUB_SAFE_MCP: args = CODE/TEXT, not an executed spend). The svelte MCP
// exposes no write/provision/billing tools, so `^mcp__svelte__` wholesale is safe — UNLIKE CF/neon
// which CAN provision paid resources and stay guarded (CF via read-verb allowlist above).
const SVELTE_SAFE_MCP = /^mcp__svelte__/;

// ecosystem-state MCP server — the hub's OWN read-only projection of `@modfolio/contracts`
// (registry + events). All 8 tools are `readOnlyHint:true` pure derivations: no fetch, no fs
// write, no secrets, no provisioning (`scripts/mcp/ecosystem-state-tools.ts` header documents
// trifecta 0/3). Its serialized args are CONTRACT EVENT NAMES — and the payment events are
// precisely the ones a wiring audit has to ask about, so `subscription.cancelled` /
// `payment.completed` make MCP_PAYMENT match on essentially every useful call. Observed
// 2026-07-28 (fleet wiring sweep): `ecosystem_webhook_url({repo, eventType:
// 'subscription.cancelled'})` was HARD-BLOCKED while auditing whether consumers are wired at
// all. Blocking a read-only lookup protects no money — it blocks the audit that finds broken
// money paths. Skipped wholesale (same class as SVELTE/GITHUB: args = DATA/TEXT, not a spend);
// safe as a namespace because the server exposes no write tool at all, UNLIKE CF/neon.
const ECOSYSTEM_STATE_SAFE_MCP = /^mcp__ecosystem-state__/;

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

// Split a compound command into shell segments — a decoy allow-token in one segment
// cannot rescue a spend in another. QUOTE-AWARE: a separator / newline / `#` INSIDE
// '...' or "..." is DATA (e.g. a commit-message body), not a command boundary — so
// `git commit -m 'stripe charges create'` stays ONE git segment (inert), not a spend.
// (bash/sh -c '<spend>' still blocks: its leading isn't inert and the spend text is
// matched in the whole segment.) Comments outside quotes are stripped inline (a decoy
// `# stripe charges create` can't whitelist). Unbalanced quotes fall back to one
// trailing segment — leading still classified. Shell escapes/`$()` are not modeled;
// on that ambiguity the guard inspects rather than skips (safe direction).
function segments(cmd: string): string[] {
	const out: string[] = [];
	let buf = "";
	let quote: '"' | "'" | null = null;
	for (let i = 0; i < cmd.length; i++) {
		const c = cmd[i];
		if (quote) {
			buf += c;
			if (c === quote) quote = null;
			continue;
		}
		if (c === '"' || c === "'") {
			quote = c;
			buf += c;
			continue;
		}
		if (c === "#") {
			// comment outside quotes — skip to end of line (the `\n` itself splits below).
			while (i + 1 < cmd.length && cmd[i + 1] !== "\n") i++;
			continue;
		}
		if (c === ";" || c === "&" || c === "|" || c === "\n") {
			out.push(buf.trim());
			buf = "";
			continue;
		}
		buf += c;
	}
	out.push(buf.trim());
	return out.filter(Boolean);
}

// Unwrap a shell-wrapper invocation — `bash -lc "…"`, `sh -c '…'`, `zsh -c "…"`, or the
// universe's ubiquitous `wsl.exe -d ubuntu bash -lc "…"` — to the INNER command it runs, so the
// guard classifies WHAT ACTUALLY EXECUTES (the inner pipeline, split per-segment) instead of the
// whole quoted inner collapsing into ONE non-inert `bash`/`wsl.exe`-led blob. That collapse
// false-positived a READ-ONLY `git show X | grep -iE 'tosspayments…|/v1/billing…'` (RED-FLAG
// money-path scan) as a live `toss-live` charge: the inner `|` sat inside the wrapper's quotes so
// segments() never split it, and the grep-PATTERN literals matched the payment rules (observed
// 2026-07-02, pay round). Unwrapping only EXPOSES the inner — a REAL wrapped spend
// (`bash -lc "curl -X POST api.tosspayments.com/v1/payments …"` or `bash -lc "stripe charges
// create"`) unwraps to that exact command and is still classified/blocked, MORE precisely. On any
// parse ambiguity (unbalanced/absent trailing quote) the regex simply does not match → the raw
// command is classified (conservative — still inspected). Bounded recursion for nested wrappers.
const SHELL_WRAP =
	/\b(?:ba|z|da)?sh(?:\.exe)?\s+-[A-Za-z]*c[A-Za-z]*\s+(["'])([\s\S]*)\1/;

// Classify a command by shell segment, unwrapping any `bash -c "…"` wrapper so the INNER pipeline
// is what gets classified. For a wrapping segment we check BOTH: (a) the inner recursively (a real
// wrapped spend like `bash -lc "stripe charges create"` still blocks), and (b) the OUTER segment
// with the wrapped inner stripped (so an outer spend around the wrapper — `curl … api.stripe.com
// -d x $(bash -c "…")` — still blocks) — while the inner's grep/echo PATTERN literals are no longer
// misread as a live spend. Bounded recursion for nested wrappers; on the depth cap or a
// non-wrapping segment it classifies the segment as-is (conservative).
function classifyShell(
	cmd: string,
	projectAllow: RegExp[],
	depth = 0,
): Hit | null {
	for (const seg of segments(cmd)) {
		const m = depth < 4 ? seg.match(SHELL_WRAP) : null;
		if (m?.[2]?.trim()) {
			const innerHit = classifyShell(m[2].trim(), projectAllow, depth + 1);
			if (innerHit) return innerHit;
			const outerHit = classifySegment(
				seg.replace(SHELL_WRAP, " "),
				projectAllow,
			);
			if (outerHit) return outerHit;
			continue;
		}
		const hit = classifySegment(seg, projectAllow);
		if (hit) return hit;
	}
	return null;
}

function classifySegment(seg: string, projectAllow: RegExp[]): Hit | null {
	if (INERT_LEAD.test(seg)) return null;
	for (const re of SAFE_ALLOW) if (re.test(seg)) return null;
	for (const re of projectAllow) if (re.test(seg)) return null;
	const curl = curlSpend(seg);
	if (curl) return curl;
	for (const r of CRITICAL) {
		if (!r.re.test(seg)) continue;
		if (r.placeholderSuppressible && isPlaceholderCredential(seg, r.re))
			continue;
		return { tier: "critical", vector: r.vector, why: r.why };
	}
	for (const r of HIGH)
		if (r.re.test(seg)) return { tier: "high", vector: r.vector, why: r.why };
	for (const r of MEDIUM)
		if (r.re.test(seg)) return { tier: "medium", vector: r.vector, why: r.why };
	return null;
}

// athsra is the universe-wide secret store (every repo uses `athsra run` / its MCP
// tools), not a payment surface — its read/write tools cannot move money. `athsra_run`
// is the one exception: it injects secrets then runs an arbitrary command, so the money
// signal is that command (+args), NOT the project name. We reassemble "command arg…" and
// classify it with the Bash rules — fixing the `\bpay\b` false-positive on a project
// named e.g. "modfolio-pay" AND closing the gap where bashCommand() saw only `command`
// and missed args like `wrangler r2 bucket create`. project/config/cwd are ignored.
function athsraRunCmdline(
	toolInput: Record<string, unknown> | undefined,
): string {
	const ti = toolInput ?? {};
	const command = typeof ti.command === "string" ? ti.command : "";
	const args = Array.isArray(ti.args)
		? ti.args.filter((a): a is string => typeof a === "string")
		: [];
	return [command, ...args].join(" ").trim();
}

function classify(
	haystack: string,
	toolName: string,
	projectAllow: RegExp[],
): Hit | null {
	if (toolName.startsWith("mcp__")) {
		if (toolName.startsWith("mcp__athsra__")) {
			// athsra secret-store tool — not a payment surface. Skip the MCP_PAYMENT name/arg
			// match that false-positived on a project named "modfolio-pay" (read-only key
			// listing). EXCEPTION: athsra_run's haystack is the injected command+args (built in
			// main via athsraRunCmdline) → it falls through to the Bash rules below, where a real
			// spend (stripe / wrangler … create) is still caught.
			if (toolName !== "mcp__athsra__athsra_run") return null;
		} else if (
			SESSION_SAFE_MCP.test(toolName) ||
			SCHEDULER_SAFE_MCP.test(toolName) ||
			GITHUB_SAFE_MCP.test(toolName) ||
			CF_READONLY_MCP.test(toolName) ||
			SVELTE_SAFE_MCP.test(toolName) ||
			ECOSYSTEM_STATE_SAFE_MCP.test(toolName)
		) {
			// Claude Code environment / remote-scheduling / GitHub content / Svelte code-analysis /
			// ecosystem-state contract-derivation tool — not a payment
			// surface. Its payment-mentioning or command-describing args are TEXT, not an executed
			// spend. Skip BOTH the MCP_PAYMENT match and the Bash-segment fallthrough (same as athsra).
			return null;
		} else if (MCP_PAYMENT.test(toolName) || MCP_PAYMENT.test(haystack)) {
			// Other MCP: name-based on the whole payload (not shell-segmentable).
			return {
				tier: "high",
				vector: "mcp-payment",
				why: "payment-capable MCP tool",
			};
		}
		// Other MCP, non-payment name: fall through to best-effort Bash-segment classification
		// (catches a spend in a single-string arg; JSON of multi-args is unreliable — that gap
		// is closed for athsra_run via athsraRunCmdline, the universe's command-injecting tool).
	}
	// Bash (and athsra_run's command+args): classify each shell segment independently, unwrapping
	// any `bash -c "…"` / `wsl.exe … bash -lc "…"` wrapper so the INNER pipeline is classified (a
	// read-only `git show | grep 'tosspayments…'` is inert; a wrapped real spend still blocks).
	return classifyShell(haystack, projectAllow);
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

failClosed("pre-payment-guard");

const input = await readHookInput();
const toolName = input.tool_name ?? "";
const bash = bashCommand(input);
// haystack = what we classify. For athsra_run the money signal is the injected
// command+args (not the project name) — see athsraRunCmdline. Bash: the command
// string. Other MCP: serialized tool_input.
const haystack =
	toolName === "mcp__athsra__athsra_run"
		? athsraRunCmdline(input.tool_input)
		: bash || JSON.stringify(input.tool_input ?? {});
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
