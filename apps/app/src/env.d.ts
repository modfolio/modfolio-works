/// <reference types="astro/client" />

declare namespace App {
	interface Locals {
		user: import("@modfolio/connect-sdk/astro").ConnectUser | null;
		/**
		 * Cloudflare execution context, injected by `@astrojs/cloudflare`. Present at
		 * the edge, absent in the Node dev/preview path — always access optionally.
		 * Used for `waitUntil()` to populate the health-probe Cache API entry off the
		 * response's critical path.
		 */
		cfContext?: import("@astrojs/cloudflare").Runtime["cfContext"];
	}
}
