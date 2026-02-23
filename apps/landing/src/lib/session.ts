import { createRemoteJWKSet, jwtVerify } from "jose";
import { SESSION_COOKIE, getConnectUrl } from "./auth";

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksCacheUrl = "";

function getJWKS(connectUrl: string) {
	if (!jwksCache || jwksCacheUrl !== connectUrl) {
		jwksCache = createRemoteJWKSet(
			new URL(`${connectUrl}/.well-known/jwks.json`),
		);
		jwksCacheUrl = connectUrl;
	}
	return jwksCache;
}

export async function verifySession(
	cookieHeader: string | null,
): Promise<SessionUser | null> {
	if (!cookieHeader) return null;

	const token = cookieHeader
		.split(";")
		.map((c) => c.trim())
		.find((c) => c.startsWith(`${SESSION_COOKIE}=`))
		?.slice(SESSION_COOKIE.length + 1);

	if (!token) return null;

	try {
		const connectUrl = getConnectUrl();
		const JWKS = getJWKS(connectUrl);
		const { payload } = await jwtVerify(token, JWKS, {
			algorithms: ["ES256"],
			issuer: connectUrl,
		});

		if (
			typeof payload.sub !== "string" ||
			typeof payload.email !== "string"
		) {
			return null;
		}

		return {
			id: payload.sub,
			email: payload.email as string,
			name:
				typeof payload.name === "string"
					? payload.name
					: (payload.email as string),
			roles: Array.isArray(payload.roles)
				? (payload.roles as string[])
				: [],
		};
	} catch {
		return null;
	}
}
