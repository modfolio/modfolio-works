import type { HealthResult, HealthState } from "./apps";

/**
 * Client island: resolves live sub-app health and swaps each card's status pill
 * from its server-rendered `loading` state to the real reachability state.
 *
 * No-JS fallback: when this never runs, cards keep their SSR `loading` pill, which
 * renders the app's static `active` / `coming-soon` label as a baseline (see
 * `AppCard.astro`). So the portal degrades gracefully.
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

interface CardEls {
	id: string;
	root: HTMLElement;
	dot: HTMLElement | null;
	label: HTMLElement | null;
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
			retry: root.querySelector<HTMLButtonElement>("[data-health-retry]"),
		});
	}
	return cards;
}

/** Apply a state to one card: data attr (drives CSS) + text + dot aria-label. */
function paint(card: CardEls, state: CardState): void {
	const copy = STATE_COPY[state];
	card.root.dataset.healthState = state;
	if (card.label) card.label.textContent = copy.label;
	if (card.dot) card.dot.setAttribute("aria-label", copy.sr);
}

function announce(region: HTMLElement | null, message: string): void {
	if (region) region.textContent = message;
}

/**
 * Fetch `/api/health` and resolve every card. On failure, every still-loading card
 * flips to `error` with a working retry affordance (never a silent catch).
 */
async function resolveAll(
	cards: CardEls[],
	region: HTMLElement | null,
): Promise<void> {
	// `coming-soon` is terminal and never probed (those apps are not launched).
	// Every other card — the active ones, rendered with an `up`/`loading` baseline,
	// plus any left in `error` from a prior failed pass — is (re)probed live.
	const pending = cards.filter(
		(c) => c.root.dataset.healthState !== "coming-soon",
	);
	for (const card of pending) paint(card, "loading");

	try {
		const res = await fetch("/api/health", {
			headers: { accept: "application/json" },
		});
		if (!res.ok) {
			throw new Error(`health endpoint responded ${res.status}`);
		}
		const results = (await res.json()) as HealthResult[];
		const byId = new Map(results.map((r) => [r.id, r.state]));

		let resolved = 0;
		for (const card of pending) {
			const state = byId.get(card.id);
			paint(card, state ?? "error");
			if (state && state !== "coming-soon") resolved += 1;
		}
		announce(region, `${resolved}개 앱 상태 확인 완료`);
	} catch {
		for (const card of pending) paint(card, "error");
		announce(region, "앱 상태를 확인할 수 없습니다. 다시 시도해 주세요.");
	}
}

export function initHealth(): void {
	const cards = collectCards();
	if (cards.length === 0) return;

	const region = document.querySelector<HTMLElement>("[data-health-live]");

	// Wire each retry button once. A click re-runs the whole resolve pass.
	for (const card of cards) {
		card.retry?.addEventListener("click", () => {
			void resolveAll(cards, region);
		});
	}

	void resolveAll(cards, region);
}
