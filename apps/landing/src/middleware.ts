import { defineMiddleware } from "astro:middleware";
import { verifySession } from "./lib/session";

export const onRequest = defineMiddleware(async (context, next) => {
	const cookieHeader = context.request.headers.get("cookie");
	context.locals.user = await verifySession(cookieHeader);
	return next();
});
