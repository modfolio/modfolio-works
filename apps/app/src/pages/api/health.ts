import type { APIContext } from "astro";
import { apps, type HealthResult, type HealthState } from "../../lib/apps";

export const prerender = false;

/** Hard ceiling for a single origin probe before we treat it as `down`. */
const PROBE_TIMEOUT_MS = 4000;
/** Above this latency a reachable origin is reported as `degraded`, not `up`. */
const SLOW_THRESHOLD_MS = 2500;
/** How long the aggregated result is cached at the edge (seconds). */
const CACHE_TTL_SECONDS = 45;
/** Synthetic, stable key for the Cloudflare Cache API entry. */
const CACHE_KEY = "https://edu.modfolio.io/__health-cache/v1";

/**
 * Probe a single origin. Resolves to a {@link HealthResult} — never throws, so one
 * unreachable sub-app can never fail the whole aggregate.
 *
 * Strategy: a `HEAD` to the app root with `redirect: "manual"` (a 3xx to the login
 * wall still proves the origin is up). Some edges reject `HEAD`; on a 405 we retry
 * once with `GET`. Any thrown error (DNS, TLS, timeout via abort) → `down`.
 */
async function probe(id: string, url: string): Promise<HealthResult> {
	const started = Date.now();

	async function attempt(method: "HEAD" | "GET"): Promise<Response> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
		try {
			return await fetch(url, {
				method,
				redirect: "manual",
				signal: controller.signal,
				headers: { "user-agent": "modfolio-works-portal/health-check" },
			});
		} finally {
			clearTimeout(timer);
		}
	}

	try {
		let response = await attempt("HEAD");
		// Edge that disallows HEAD → fall back to GET once.
		if (response.status === 405 || response.status === 501) {
			response = await attempt("GET");
		}

		const ms = Date.now() - started;
		const status = response.status;
		const classified = classify(status, ms);
		return { id, state: classified, httpStatus: status, ms };
	} catch {
		// Network failure, TLS error, or aborted (timeout) → unreachable.
		return { id, state: "down", httpStatus: null, ms: Date.now() - started };
	}
}

/** Map an observed (status, latency) pair to a coarse health state. */
function classify(status: number, ms: number): HealthState {
	// `redirect: "manual"` surfaces 3xx as opaqueredirect (status 0) or the raw 3xx.
	// Treat 0 (opaque) and any 2xx/3xx as reachable+healthy.
	const reachableOk = status === 0 || (status >= 200 && status < 400);

	if (reachableOk) {
		return ms > SLOW_THRESHOLD_MS ? "degraded" : "up";
	}
	// Reachable but unhealthy: rate-limited or server error.
	if (status === 429 || status >= 500) {
		return "degraded";
	}
	// Other 4xx (401/403/404 …): the origin answered, but the root is not OK.
	// It is still *reachable*, yet not a healthy launch target → `down`.
	return "down";
}

/** Probe every app: `active` ones are fetched; `landing` ones are `coming-soon`. */
async function collect(): Promise<HealthResult[]> {
	const results = await Promise.all(
		apps.map((app) => {
			if (app.status !== "active") {
				return Promise.resolve<HealthResult>({
					id: app.id,
					state: "coming-soon",
					httpStatus: null,
					ms: null,
				});
			}
			return probe(app.id, app.url);
		}),
	);
	return results;
}

export async function GET(context: APIContext): Promise<Response> {
	// Auth guard. The portal page already redirects anonymous users, but the API
	// must defend itself so a direct hit never leaks sub-app reachability data.
	if (!context.locals.user) {
		return new Response(JSON.stringify({ error: "unauthorized" }), {
			status: 401,
			headers: { "content-type": "application/json; charset=utf-8" },
		});
	}

	// Cloudflare Cache API: serve a recent aggregate to avoid a thundering herd of
	// probes (one per concurrent portal viewer). `caches.default` is absent in the
	// dev/Node path, so guard for it.
	const cache =
		typeof caches !== "undefined" &&
		(caches as unknown as { default?: Cache }).default
			? (caches as unknown as { default: Cache }).default
			: null;

	if (cache) {
		const hit = await cache.match(CACHE_KEY);
		if (hit) {
			return hit;
		}
	}

	const results = await collect();

	const response = new Response(JSON.stringify(results), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": `public, max-age=${CACHE_TTL_SECONDS}`,
		},
	});

	if (cache) {
		// Store a clone off the critical path; the original is returned to this caller.
		// `cfContext` is absent in the Node dev path — fall back to an awaited put so
		// the cache still warms locally.
		const put = cache.put(CACHE_KEY, response.clone());
		if (context.locals.cfContext) {
			context.locals.cfContext.waitUntil(put);
		} else {
			await put;
		}
	}

	return response;
}
