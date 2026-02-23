import type { APIRoute } from "astro";
import { buildAuthorizeUrl, generatePKCE, getRedirectUri } from "../../lib/auth";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
	const { verifier, challenge } = await generatePKCE();
	const state = crypto.randomUUID();
	const nonce = crypto.randomUUID();

	const cookieOpts = {
		path: "/",
		httpOnly: true,
		secure: true,
		sameSite: "lax" as const,
		maxAge: 600,
	};

	cookies.set("mw_pkce_verifier", verifier, cookieOpts);
	cookies.set("mw_oauth_state", state, cookieOpts);

	const returnTo = url.searchParams.get("returnTo") ?? "/";
	cookies.set("mw_return_to", returnTo, cookieOpts);

	const authorizeUrl = buildAuthorizeUrl({
		codeChallenge: challenge,
		state,
		redirectUri: getRedirectUri(url),
		nonce,
	});

	return redirect(authorizeUrl, 302);
};
