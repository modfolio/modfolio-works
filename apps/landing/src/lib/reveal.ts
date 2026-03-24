export function initReveal(): void {
	// ── Scroll-Y custom property ──────────────────────────────────────────────
	window.addEventListener(
		"scroll",
		() => {
			document.documentElement.style.setProperty(
				"--scroll-y",
				`${window.scrollY}px`,
			);
		},
		{ passive: true },
	);

	// ── IntersectionObserver reveal ───────────────────────────────────────────
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;

				const el = entry.target as HTMLElement;
				const delay = el.dataset.revealDelay;

				if (delay) {
					el.style.transitionDelay = delay;
				}

				el.classList.add("revealed");
				observer.unobserve(el);
			}
		},
		{ threshold: 0.15 },
	);

	for (const el of document.querySelectorAll("[data-reveal]")) {
		observer.observe(el);
	}
}
