/**
 * scripts/hooks/_fail-closed.ts
 *
 * Make a BLOCKING hook refuse rather than crash.
 *
 * Claude Code reads exit 2 as "cancel this tool call" and every other exit code
 * as "allow". So an uncaught exception anywhere in a guard silently PERMITS the
 * exact thing the guard exists to stop — and it looks like success in the
 * transcript, because nothing is printed.
 *
 * Observed for real on 2026-07-22: a one-argument call to a two-parameter helper
 * threw inside `pre-payment-guard`, and a command carrying a live Stripe key
 * came back exit 1 = allowed. The bug was mine, introduced minutes earlier; the
 * point is that NO amount of care makes a guard crash-proof, so the guard must
 * be wrong-safe instead.
 *
 * Same lesson as the `readHookInput` stdin race fixed the same night: **a guard
 * that fails open is worse than no guard**, because everyone believes it is
 * watching. If a guard cannot decide, it refuses.
 *
 * ONLY for guards whose "block" signal is exit 2. Advisory/notice hooks
 * (`pre-ui-edit-notice`, `post-biome-check`, the Stop hooks) must NOT use this —
 * for them a crash should stay non-blocking, since blocking on a broken notice
 * would be its own outage.
 */

/** Install fail-closed handlers. Call once, at the top of a blocking hook. */
export function failClosed(hookName: string): void {
	const refuse = (kind: string, detail: string): never => {
		console.error(
			[
				`BLOCKED (${hookName}): internal ${kind} — failing CLOSED.`,
				`detail: ${detail}`,
				"",
				"이 훅은 판단할 수 없으면 통과시키지 않는다. 훅 자체를 고치세요.",
			].join("\n"),
		);
		process.exit(2);
	};

	process.on("uncaughtException", (err) => {
		refuse("error", (err as Error)?.message ?? String(err));
	});
	process.on("unhandledRejection", (reason) => {
		refuse("rejection", String(reason));
	});
}
