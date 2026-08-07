import { createAstroAuth } from "@modfolio/connect-sdk/astro";

export const auth = createAstroAuth({
	// v10 은 로그아웃 기본이 **전역**(Connect end_session 경유)이고 그 뒤 착지점의
	// 기본값이 `/` 다. 이 앱은 **홈이 보호돼 있어**(실측: 미인증 `GET /` → 302
	// /auth/login) 기본값을 그대로 두면 로그아웃 직후 로그인으로 튕겨 «실패한 것처럼»
	// 보인다. 그래서 명시한다. ⚠ 값은 **앱 상대 경로** — 절대 URL 은 sanitize 된다.
	logout: { postLogoutRedirect: "/auth/login" },
	clientId: "works",
});
