/**
 * scripts/hooks/pre-destructive-guard.ts
 *
 * PreToolUse Bash hook. Blocks ONLY catastrophic, irreversible operations.
 * Exit 2 signals Claude Code to cancel the command.
 *
 * v3.1 (2026-05-18 — solo pre-production). Scope deliberately narrowed.
 * Previously this also blocked `git reset --hard`, `git clean -f`,
 * `git checkout --`, any `--force`, and `--no-verify`. For a 1-person
 * pre-production fleet where everything is in git history and the workflow
 * is direct-to-main, those are NOT footguns — they are normal recovery
 * tools, and blocking `--no-verify` left the old pre-commit quality gate
 * with no escape hatch (the dominant velocity complaint). They are now
 * ALLOWED. What remains blocked is only what destroys work or history
 * unrecoverably:
 *
 *   1. Recursive force-remove of root / home / system / cwd / glob
 *      (`rm -rf /`, `rm -rf ~`, `rm -rf *`, `rm -rf .`, `/etc`, ...)
 *   2. Plain `git push --force` / `-f` (rewrites REMOTE history).
 *      `--force-with-lease` is the safe variant and is allowed.
 *   3. Deletion of secret material (`.env`, `.env.keys`, `*.pem`, ssh keys).
 *
 * OWASP Agentic 2026 매핑:
 *   - ASI02 Tool Misuse — irreversible destructive Bash 차단
 *   - ASI09 Human-Agent Trust — 복구 불가 행위만 게이트 (정공법: 근본 footgun만)
 */

import { bashCommand, readHookInput } from "./_lib.ts";

const input = await readHookInput();
const cmd = bashCommand(input);
if (!cmd) process.exit(0);

const CATASTROPHIC: ReadonlyArray<{ re: RegExp; why: string }> = [
	// 1a. rm with -r and -f (either order, combined or split) targeting a
	//     catastrophic path. `rm -rf node_modules` / `rm -rf dist` are NOT
	//     matched — only root, home, system dirs, bare cwd, or a bare glob.
	{
		re: /\brm\s+-[a-z]*r[a-z]*f[a-z]*\s+(?:--no-preserve-root\s+)?(?:\/(?:\s|$)|~(?:\/\*|\s|$)|\$HOME|\*(?:\s|$)|\.(?:\s|$)|\/(?:home|etc|usr|var|bin|sbin|root|boot|lib)\b)/i,
		why: "recursive force-remove of root/home/system/cwd/glob",
	},
	{
		re: /\brm\s+-[a-z]*f[a-z]*r[a-z]*\s+(?:--no-preserve-root\s+)?(?:\/(?:\s|$)|~(?:\/\*|\s|$)|\$HOME|\*(?:\s|$)|\.(?:\s|$)|\/(?:home|etc|usr|var|bin|sbin|root|boot|lib)\b)/i,
		why: "recursive force-remove of root/home/system/cwd/glob",
	},
	// 3. Deleting secret material.
	{
		re: /\brm\s+(?:-\w+\s+)*(?:[^\s|;&]*\/)?(?:\.env(?:\.keys|\.local|\.[a-z]+)?|[^\s|;&]*\.pem|id_rsa|id_ed25519)\b/i,
		why: "deletion of secret material (.env / .keys / .pem / ssh key)",
	},
];

for (const { re, why } of CATASTROPHIC) {
	if (re.test(cmd)) {
		console.error(`BLOCKED: ${why}. (pre-destructive-guard)`);
		process.exit(2);
	}
}

// 2. Plain force-push rewrites remote history. Allow --force-with-lease.
if (/\bgit\s+push\b/i.test(cmd) && /(?:^|\s)(?:--force|-f)\b/.test(cmd)) {
	if (!/--force-with-lease\b/.test(cmd)) {
		console.error(
			"BLOCKED: git push --force rewrites remote history. Use --force-with-lease if you really must. (pre-destructive-guard)",
		);
		process.exit(2);
	}
}

process.exit(0);
