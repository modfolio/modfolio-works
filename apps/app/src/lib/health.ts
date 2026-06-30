import type { HealthResult, HealthState } from "./apps";

/**
 * Client island: resolves live sub-app health in a single `/api/health` pass and
 * paints three things from that one response:
 *   1. each card's status pill (loading → real reachability state),
 *   2. each reachable card's round-trip latency (the `ms` the edge already measured),
 *   3. a hub-level "System Status" rollup band (worst-state-wins + operational count).
 *
 * No-JS fallback: when this never runs, cards keep their SSR `loading` pill (the
 * app's static `active`/`coming-soon` baseline) and the summary band keeps its SSR
 * `loading` copy. So the portal degrades gracefully.
 *
 * Follows the `reveal.ts` convention: a single exported `init*` with no framework.
 */

/** A health state plus the two extra UI-only states the island can drive. */
type CardState = HealthState | "loading" | "error";

/** Korean label + screen-reader sentence for every renderable card state. */
const STATE_COPY: Record<CardState, { label: string; sr: string }> = {
	loading: { label: "확인 중", sr: "상태 확인 중" },
	up: { label: "정상", sr: "정상 작동 중" },
	degraded: { label: "지연", sr: "응답이 느림" },
	down: { label: "점검 중", sr: "접속할 수 없음" },
	"coming-soon": { label: "준비 중", sr: "출시 예정" },
	error: { label: "상태 확인 불가", sr: "상태를 확인할 수 없음" },
};

/**
 * Hub-level rollup state. Mirrors the card states the band can ever show — the
 * summary is itself a 4-state surface (loading / resolved-ok / degraded-or-down /
 * error). `coming-soon` is never a *rollup* verdict (it describes one app, not the
 * fleet), so it is intentionally absent here.
 */
type SummaryState = "loading" | "up" | "degraded" | "down" | "error";

/** Headline copy for the rollup band, keyed by the worst observed fleet state. */
const SUMMARY_COPY: Record<SummaryState, string> = {
	loading: "시스템 상태 확인 중",
	up: "모든 시스템 정상",
	degraded: "일부 시스템 지연",
	down: "일부 시스템 점검 중",
	error: "시스템 상태 확인 불가",
};

interface CardEls {
	id: string;
	root: HTMLElement;
	dot: HTMLElement | null;
	label: HTMLElement | null;
	latency: HTMLElement | null;
	retry: HTMLButtonElement | null;
}

interface SummaryEls {
	root: HTMLElement;
	headline: HTMLElement | null;
	count: HTMLElement | null;
	retry: HTMLButtonElement | null;
}

function collectCards(): CardEls[] {
	const cards: CardEls[] = [];
	for (const root of document.querySelectorAll<HTMLElement>(
		"[data-health-card]",
	)) {
		const id = root.dataset.appId;
		if (!id) continue;
		cards.push({
			id,
			root,
			dot: root.querySelector<HTMLElement>("[data-health-dot]"),
			label: root.querySelector<HTMLElement>("[data-health-label]"),
			latency: root.querySelector<HTMLElement>("[data-health-latency]"),
			retry: root.querySelector<HTMLButtonElement>("[data-health-retry]"),
		});
	}
	return cards;
}

function collectSummary(): SummaryEls | null {
	const root = document.querySelector<HTMLElement>("[data-health-summary]");
	if (!root) return null;
	return {
		root,
		headline: root.querySelector<HTMLElement>("[data-health-summary-headline]"),
		count: root.querySelector<HTMLElement>("[data-health-summary-count]"),
		retry: root.querySelector<HTMLButtonElement>("[data-health-summary-retry]"),
	};
}

/** Apply a state to one card: data attr (drives CSS) + text + dot aria-label. */
function paint(card: CardEls, state: CardState): void {
	const copy = STATE_COPY[state];
	card.root.dataset.healthState = state;
	if (card.label) card.label.textContent = copy.label;
	if (card.dot) card.dot.setAttribute("aria-label", copy.sr);
}

/**
 * Paint a card's latency span from the `ms` the edge already measured. Shown only
 * for states where the number *means* "how fast the origin answered" — `up` and
 * `degraded`. For `down` the `ms` is time-to-failure (misleading as latency), and
 * `coming-soon`/`loading`/`error` have no meaningful round-trip, so the span is
 * cleared and hidden (CSS keys visibility off non-empty text via `:empty`).
 */
function paintLatency(
	card: CardEls,
	state: CardState,
	ms: number | null,
): void {
	if (!card.latency) return;
	const showable =
		(state === "up" || state === "degraded") && ms !== null && ms >= 0;
	if (showable) {
		card.latency.textContent = `${ms}ms`;
		card.latency.setAttribute("aria-label", `응답 속도 ${ms}밀리초`);
	} else {
		card.latency.textContent = "";
		card.latency.removeAttribute("aria-label");
	}
}

/** Drive the rollup band: state attr (CSS) + headline + operational count. */
function paintSummary(
	summary: SummaryEls,
	state: SummaryState,
	operational: number,
	probed: number,
): void {
	summary.root.dataset.summaryState = state;
	if (summary.headline) summary.headline.textContent = SUMMARY_COPY[state];
	if (summary.count) {
		// `probed` = active (non-coming-soon) apps. While loading or on error we have
		// no verdict yet, so the count line stays empty rather than asserting "0/N".
		summary.count.textContent =
			state === "loading" || state === "error"
				? ""
				: `${probed}개 중 ${operational}개 정상 작동`;
	}
}

function announce(region: HTMLElement | null, message: string): void {
	if (region) region.textContent = message;
}

/**
 * Reduce per-app results to one fleet verdict. Only `active` apps (anything not
 * `coming-soon`) count toward the rollup — unlaunched apps are not an outage.
 * Worst state wins: any `down` → `down`, else any `degraded` → `degraded`, else
 * `up`. When there are no active apps at all the fleet is trivially `up`.
 */
function rollup(results: HealthResult[]): {
	state: SummaryState;
	operational: number;
	probed: number;
} {
	const active = results.filter((r) => r.state !== "coming-soon");
	const operational = active.filter((r) => r.state === "up").length;
	let state: SummaryState = "up";
	if (active.some((r) => r.state === "down")) {
		state = "down";
	} else if (active.some((r) => r.state === "degraded")) {
		state = "degraded";
	}
	return { state, operational, probed: active.length };
}

/**
 * Fetch `/api/health` once and resolve every card + the rollup band from that
 * single response. On failure, every still-loading card flips to `error` with a
 * working retry affordance, and the summary band shows its own `error` state
 * (never a silent catch).
 */
async function resolveAll(
	cards: CardEls[],
	summary: SummaryEls | null,
	region: HTMLElement | null,
): Promise<void> {
	// `coming-soon` is terminal and never probed (those apps are not launched).
	// Every other card — the active ones, rendered with an `up`/`loading` baseline,
	// plus any left in `error` from a prior failed pass — is (re)probed live.
	const pending = cards.filter(
		(c) => c.root.dataset.healthState !== "coming-soon",
	);
	for (const card of pending) {
		paint(card, "loading");
		paintLatency(card, "loading", null);
	}
	if (summary) paintSummary(summary, "loading", 0, 0);

	try {
		const res = await fetch("/api/health", {
			headers: { accept: "application/json" },
		});
		if (!res.ok) {
			throw new Error(`health endpoint responded ${res.status}`);
		}
		const results = (await res.json()) as HealthResult[];
		const byId = new Map(results.map((r) => [r.id, r]));

		let resolved = 0;
		for (const card of pending) {
			const result = byId.get(card.id);
			const state = result?.state ?? "error";
			paint(card, state);
			paintLatency(card, state, result?.ms ?? null);
			if (result && state !== "coming-soon") resolved += 1;
		}

		if (summary) {
			const { state, operational, probed } = rollup(results);
			paintSummary(summary, state, operational, probed);
		}

		announce(region, `${resolved}개 앱 상태 확인 완료`);
	} catch {
		for (const card of pending) {
			paint(card, "error");
			paintLatency(card, "error", null);
		}
		if (summary) paintSummary(summary, "error", 0, 0);
		announce(region, "앱 상태를 확인할 수 없습니다. 다시 시도해 주세요.");
	}
}

export function initHealth(): void {
	const cards = collectCards();
	if (cards.length === 0) return;

	const summary = collectSummary();
	const region = document.querySelector<HTMLElement>("[data-health-live]");

	// Wire every retry button (per-card + the summary band) once. Any click re-runs
	// the whole single-pass resolve, repainting cards and the rollup together.
	const retryButtons = [
		...cards.map((c) => c.retry),
		summary?.retry ?? null,
	].filter((b): b is HTMLButtonElement => b !== null);
	for (const button of retryButtons) {
		button.addEventListener("click", () => {
			void resolveAll(cards, summary, region);
		});
	}

	void resolveAll(cards, summary, region);
}
