// OIDC Authorization Code Flow + PKCE S256 — modfolio-connect SSO

const CLIENT_ID = "modfolio-works";
export const SESSION_COOKIE = "mc_session";
const CONNECT_URL = "https://connect.modfolio.io";

function base64UrlEncode(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	const binary = String.fromCharCode(...bytes);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

export async function generatePKCE(): Promise<{
	verifier: string;
	challenge: string;
}> {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	const verifier = base64UrlEncode(bytes.buffer as ArrayBuffer);
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(verifier),
	);
	const challenge = base64UrlEncode(digest);
	return { verifier, challenge };
}

export function getConnectUrl(): string {
	return CONNECT_URL;
}

export function getRedirectUri(requestUrl: URL): string {
	return `${requestUrl.origin}/auth/callback`;
}

export function buildAuthorizeUrl(params: {
	codeChallenge: string;
	state: string;
	redirectUri: string;
	nonce: string;
}): string {
	const url = new URL(`${CONNECT_URL}/sso/authorize`);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", CLIENT_ID);
	url.searchParams.set("redirect_uri", params.redirectUri);
	url.searchParams.set("state", params.state);
	url.searchParams.set("code_challenge", params.codeChallenge);
	url.searchParams.set("code_challenge_method", "S256");
	url.searchParams.set("scope", "openid profile email");
	url.searchParams.set("nonce", params.nonce);
	return url.toString();
}

export async function exchangeCode(
	code: string,
	codeVerifier: string,
	redirectUri: string,
): Promise<{ token: string; expires_in: number }> {
	const res = await fetch(`${CONNECT_URL}/sso/token`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
			client_id: CLIENT_ID,
			code_verifier: codeVerifier,
		}),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Token exchange failed: ${res.status} ${text}`);
	}
	return res.json();
}
