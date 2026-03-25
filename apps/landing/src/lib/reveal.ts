export function initReveal(): void {
	// ── Scroll-Y custom property ──────────────────────────────────────────────
	window.addEventListener(
		"scroll",
		() => {
			document.documentElement.style.setProperty(
				"--scroll-y",
				`${window.scrollY}`,
			);
		},
		{ passive: true },
	);

	const revealTargets = document.querySelectorAll("[data-reveal]");

	// ── Reduced motion: reveal immediately, skip observer ─────────────────────
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		for (const el of revealTargets) {
			(el as HTMLElement).classList.add("revealed");
		}
		return;
	}

	// ── IntersectionObserver reveal ───────────────────────────────────────────
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;

				const el = entry.target as HTMLElement;
				const delay = el.dataset.revealDelay;

				if (delay) {
					el.style.transitionDelay = `${delay}ms`;
				}

				el.classList.add("revealed");
				observer.unobserve(el);
			}
		},
		{ threshold: 0.15 },
	);

	for (const el of revealTargets) {
		observer.observe(el);
	}
}
