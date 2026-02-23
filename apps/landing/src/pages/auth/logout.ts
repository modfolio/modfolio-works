import type { APIRoute } from "astro";
import { SESSION_COOKIE } from "../../lib/auth";

export const GET: APIRoute = async ({ cookies, redirect }) => {
	cookies.delete(SESSION_COOKIE, { path: "/" });
	return redirect("/", 302);
};
