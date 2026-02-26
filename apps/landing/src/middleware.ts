import { auth } from "./lib/connect";

export const onRequest = auth.middleware;
