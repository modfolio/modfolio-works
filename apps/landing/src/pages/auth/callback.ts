import type { APIRoute } from "astro";
import { SESSION_COOKIE, exchangeCode, getRedirectUri } from "../../lib/auth";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const savedState = cookies.get("mw_oauth_state")?.value;
	const verifier = cookies.get("mw_pkce_verifier")?.value;
	const returnTo = cookies.get("mw_return_to")?.value ?? "/";

	// Clean up temp cookies
	cookies.delete("mw_pkce_verifier", { path: "/" });
	cookies.delete("mw_oauth_state", { path: "/" });
	cookies.delete("mw_return_to", { path: "/" });

	if (!code || !state || !savedState || !verifier) {
		return new Response("Missing authorization parameters", { status: 400 });
	}

	if (state !== savedState) {
		return new Response("Invalid state parameter", { status: 400 });
	}

	const tokens = await exchangeCode(code, verifier, getRedirectUri(url));

	cookies.set(SESSION_COOKIE, tokens.token, {
		path: "/",
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		maxAge: tokens.expires_in,
	});

	return redirect(returnTo, 302);
};
