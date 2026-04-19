/**
 * scripts/hooks/_lib.ts
 *
 * Shared helpers for Claude Code hook scripts. All hooks read a JSON payload
 * from stdin and signal intent via exit code — no reliance on $TOOL_INPUT
 * shell variables, tail/grep/sed/od, or HEREDOCs. Runs unchanged on Windows
 * PowerShell, macOS, Linux, and WSL since bun is the only runtime dependency.
 *
 * Reported by: atelier-and-folio (Issue 3, 2026-04-16) — unix-only hook
 * commands silently failed on member projects using a native Windows shell.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stdin } from "node:process";

export interface HookInput {
	tool_name?: string;
	tool_input?: Record<string, unknown>;
	tool_response?: Record<string, unknown>;
	stop_hook_active?: boolean;
	hook_event_name?: string;
}

/** Maximum ms to wait for the Claude Code hook runner to close stdin. */
const STDIN_TIMEOUT_MS = 5000;

/**
 * Read the JSON hook event from stdin. Returns empty object if stdin is
 * empty, unparseable, or not closed within STDIN_TIMEOUT_MS. The timeout
 * is defensive — in practice Claude Code pipes the JSON and closes stdin
 * immediately, but a misconfigured runner must never hang the commit.
 */
export async function readHookInput(): Promise<HookInput> {
	const read = (async () => {
		let data = "";
		for await (const chunk of stdin) data += chunk;
		return data;
	})();

	const timer = new Promise<string>((resolveTimer) => {
		setTimeout(() => resolveTimer(""), STDIN_TIMEOUT_MS).unref?.();
	});

	const data = await Promise.race([read, timer]);
	if (!data.trim()) return {};
	try {
		return JSON.parse(data) as HookInput;
	} catch {
		return {};
	}
}

/** Extract the Bash command, if the input was for a Bash tool. */
export function bashCommand(input: HookInput): string {
	const cmd = input.tool_input?.command;
	return typeof cmd === "string" ? cmd : "";
}

/** Extract file paths for Edit / Write / MultiEdit tools. */
export function editedFiles(input: HookInput): string[] {
	const out: string[] = [];
	const fp = input.tool_input?.file_path;
	if (typeof fp === "string") out.push(fp);
	const edits = input.tool_input?.edits;
	if (Array.isArray(edits) && typeof fp === "string") {
		// MultiEdit already captured by file_path above
	}
	return out;
}

/** Return the current git top-level directory, or cwd on failure. */
export function gitRoot(): string {
	try {
		return execSync("git rev-parse --show-toplevel", {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return process.cwd();
	}
}

/**
 * Walk up from startDir looking for a sibling `modfolio-universe/` with
 * ecosystem.json. Returns `undefined` when not found — callers decide whether
 * that is fatal. ESM top-level imports only (no require interop).
 */
export function findUniverseRoot(startDir: string): string | undefined {
	let current = resolve(startDir);
	for (let i = 0; i < 10; i++) {
		const candidate = join(current, "modfolio-universe");
		if (existsSync(join(candidate, "ecosystem.json"))) return candidate;
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}
	return undefined;
}

/**
 * Detector source files whose regex literals would match their own rules
 * if naively scanned. The ts_ignore_or_any pattern hit 4 times over three
 * weeks because the suppression-directive regex sits as a string literal
 * inside these two files — a regex scanning for TS suppression directives
 * matches the directive text when it appears quoted in source. Rule test
 * functions consult this set to self-exclude.
 */
export const DETECTOR_SOURCE_FILES: ReadonlySet<string> = new Set([
	"scripts/hooks/stop-pattern-history.ts",
	"scripts/hooks/pre-commit-guard.ts",
]);

/**
 * Git diff names, excluding pattern-history so the Stop pattern hook does
 * not detect itself and loop forever.
 */
export function changedFiles(cwd: string): string[] {
	try {
		const staged = execSync("git diff --name-only --cached", {
			cwd,
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		const unstaged = execSync("git diff --name-only", {
			cwd,
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		const merged = new Set<string>();
		for (const line of `${staged}\n${unstaged}`.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			if (trimmed === "memory/pattern-history.md") continue;
			if (trimmed === "memory/pattern-history.jsonl") continue;
			merged.add(trimmed);
		}
		return [...merged].sort();
	} catch {
		return [];
	}
}
