/// <reference types="astro/client" />

declare namespace App {
	interface Locals {
		user: import("@modfolio/connect-sdk/astro").ConnectUser | null;
	}
}
