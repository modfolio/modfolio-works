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

import { failClosed } from "./_fail-closed.ts";
import { bashCommand, readHookInput } from "./_lib.ts";

// CLI 동작 불변 — `bun run <file>` 은 `import.meta.main` 이 참이다.
// 가드가 없으면 이 모듈을 **import 하는 테스트가 프로세스째 종료**된다
// (2026-08-25 실측: `payment-ledger-clean` 을 import 하자 훅 스위트 15개가 돌았다).
if (import.meta.main) {
	failClosed("pre-destructive-guard");

	const input = await readHookInput();
	const cmd = bashCommand(input);
	if (!cmd) process.exit(0);

	// 0. 훅 층 **생존 probe** — 0 토큰·결정적. atelier 실측(2026-09-16): `profile: "strict"` 인데
	//    PreToolUse·PostToolUse 가 한 건도 안 도는 세션이 있었다(SessionStart 는 돌았다). 「가드가 있다」
	//    를 전제로 행동하는 에이전트 + 실제로는 없는 가드 = 처음부터 없던 것보다 나쁘다. 훅 층은 훅
	//    바깥에서 잴 수 없으므로(스크립트는 Claude 의 훅 체계를 못 부른다) **실제 도구 호출 하나**로 잰다:
	//    `true  # hook-probe` 를 실행하면 이 가드가 exit 2 로 막으며 아래 문장을 낸다. 문장이 안 보이고
	//    명령이 그냥 실행됐으면 이 세션의 훅 층은 죽은 것이다 — 그때 지출·파괴·전송은 스스로 멈춘다.
	//    이 가드에 두는 이유: velocity 프로필이 **모든 멤버에 배선하는** 두 안전망 중 하나라서다.
	//    ⚠ probe 는 **명령 전체**가 그 한 줄일 때만이다 — 커밋 메시지·편지 heredoc 이 그 표식을 «언급» 하는
	//    것은 probe 가 아니다(첫 판이 부분문자열이라 이 파일을 커밋하는 명령을 막았다).
	if (/^\s*(?:true|:)\s+#\s*hook-probe\s*$/.test(cmd)) {
		console.error(
			"[hook-probe] ✓ PreToolUse 훅 층이 이 세션에서 돈다 (pre-destructive-guard). " +
				"이 명령은 probe 라 의도적으로 막았다(exit 2) — 계속 진행하면 된다.",
		);
		process.exit(2);
	}

	const CATASTROPHIC: ReadonlyArray<{ re: RegExp; why: string }> = [
		// 1a. rm with -r and -f (either order, combined or split) targeting a
		//     catastrophic path. `rm -rf node_modules` / `rm -rf dist` are NOT
		//     matched — only root, home, system dirs, bare cwd, or a bare glob.
		//     System-root depth ≤2 (+`/*` glob)까지만 재앙으로 본다 — `/home`,
		//     `/home/mod`, `/home/mod/*` 는 차단하되 `/home/mod/code/<repo>` 같은
		//     깊은 하위 경로는 통과 (2026-07-12 오탐 정정: 절대경로가 `/home` 으로
		//     시작한다는 이유만으로 승인된 개별 디렉토리 삭제가 막히던 것.
		//     git 원격이 있는 작업물 삭제는 복구 가능 — v3.1 철학 그대로).
		{
			re: /\brm\s+-[a-z]*r[a-z]*f[a-z]*\s+(?:--no-preserve-root\s+)?(?:\/(?:\s|$)|~(?:\/\*|\s|$)|\$HOME|\*(?:\s|$)|\.(?:\s|$)|\/(?:home|etc|usr|var|bin|sbin|root|boot|lib)(?:\/[\w.@-]+)?(?:\/\*)?\/?(?=\s|$|[;&|)]))/i,
			why: "recursive force-remove of root/home/system/cwd/glob",
		},
		{
			re: /\brm\s+-[a-z]*f[a-z]*r[a-z]*\s+(?:--no-preserve-root\s+)?(?:\/(?:\s|$)|~(?:\/\*|\s|$)|\$HOME|\*(?:\s|$)|\.(?:\s|$)|\/(?:home|etc|usr|var|bin|sbin|root|boot|lib)(?:\/[\w.@-]+)?(?:\/\*)?\/?(?=\s|$|[;&|)]))/i,
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
	//    Inspect ONLY the arguments of each `git push` invocation (its token
	//    span up to the next shell separator), NOT the whole compound command.
	//    Root cause of prior false-positives: testing `git push` presence and
	//    `-f`/`--force` presence independently across the entire command meant a
	//    benign `git push origin main` next to an unrelated `-f` token elsewhere
	//    (`[ -f "$x" ]`, `grep -f`, `rm -f`, `tar -f`) blocked the safe push.
	for (const invocation of cmd.match(/\bgit\s+push\b[^\n;|&]*/gi) ?? []) {
		if (
			/(?:^|\s)(?:--force|-f)\b/.test(invocation) &&
			!/--force-with-lease\b/.test(invocation)
		) {
			console.error(
				"BLOCKED: git push --force rewrites remote history. Use --force-with-lease if you really must. (pre-destructive-guard)",
			);
			process.exit(2);
		}
	}

	process.exit(0);
}
