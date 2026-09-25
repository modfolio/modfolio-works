/**
 * _git-push-detect.ts — «이 명령이 원격 전송(`git push`)을 **실행**하는가» 를 셸 구조로 묻는다.
 *
 * ## 왜 부분문자열이 아닌가 (2026-09-16 · 같은 날 네 번)
 *
 * `pre-push-guard` 의 매처는 `/\bgit\s+push\b/` 였다 — «이 문자열이 명령문 어딘가 있는가».
 * 그날 전송이 아닌 명령 넷이 막혔다:
 *
 *   atelier ①  grep -n "git push\|readInput\|…" .claude/hooks/pre-push-guard.ts   ← 패턴 인자
 *   atelier ②  python3 - <<'PY' … 본문에 안내 문장 «time git push» … PY           ← heredoc 본문
 *   허브   ③  cat > feedback/…/편지.md <<'EOF' … «git push 는 …» … EOF             ← heredoc 본문
 *   허브   ④  bun run gate:full && git commit … && git push                         ← 이건 진짜(영수증이 옛것)
 *
 * ①②③ 은 저장소를 바꾸지도 원격에 닿지도 않는다. 그런데 이 부류의 오탐은 **훅을 끄게 만드는
 * 정확한 형태**이고, 우회가 3초면 된다(문자열을 파일로 옮겨 실행) — 즉 정직한 사용자에게만
 * 비용을 물린다(atelier 정정 편지 2026-09-16 §덤으로). 그래서 셸을 **얕게 파싱**한다:
 *
 *   · 따옴표 안은 한 단어다 — `"git push\|x"` 는 grep 의 **인자**이지 명령이 아니다
 *   · heredoc 본문은 명령이 아니다 — 단 `bash <<EOF` 처럼 **셸이 읽는** 본문은 다시 셸로 본다
 *   · `$( … )` · `` ` … ` `` · `bash -c "…"` · `eval …` 안은 **명령이다** — 재귀
 *   · 앞의 `VAR=x` · `env -u X` · `timeout 120` · `time` · `nohup` · `sudo` 는 껍데기 — 벗긴다
 *   · `git` 의 전역 옵션(`-C dir` · `-c k=v` · `--no-pager` …) 뒤의 **첫 단어가 `push`** 일 때만 참
 *
 * ## 원리적으로 못 보는 것 (명시)
 *
 *   `G=git; $G push` · `alias p='git push'` · 스크립트 파일 안의 push — 변수·별칭·파일은
 *   실행 전에 값을 모른다. 이 매처는 **정직한 명령문**을 정확히 가르는 장치이지 회피를 막는
 *   장치가 아니다(회피는 부분문자열로도 못 막았다). 그 한계는 `pre-push-guard` 헤더에도 적는다.
 */

import { resolve as pathResolve } from "node:path";

/** 인자를 받지 않는 껍데기 — 그대로 벗긴다. */
const WRAPPERS_NOARG: ReadonlySet<string> = new Set([
	"time",
	"nohup",
	"command",
	"exec",
	"builtin",
	"caffeinate",
	"unbuffer",
]);
/** 셸 예약어 — `if git push; then` · `do git push; done` 의 앞자리. */
const KEYWORDS: ReadonlySet<string> = new Set([
	"do",
	"then",
	"else",
	"elif",
	"if",
	"while",
	"until",
	"!",
]);
const SHELLS = /^(bash|sh|zsh|dash|ksh|fish)$/;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
/** `git` 전역 옵션 중 **다음 단어를 인자로 먹는** 것. */
const GIT_OPT_WITH_ARG: ReadonlySet<string> = new Set([
	"-C",
	"-c",
	"--git-dir",
	"--work-tree",
	"--namespace",
	"--exec-path",
	"--super-prefix",
	"--config-env",
	"--list-cmds",
]);

function basename(word: string): string {
	return word.slice(word.lastIndexOf("/") + 1);
}

/** `<<` heredoc 의 본문을 떼어 낸다. 셸 인터프리터가 읽는 본문은 `shellBodies` 로 돌려준다. */
export function stripHeredocs(cmd: string): {
	text: string;
	shellBodies: string[];
} {
	const lines = cmd.split("\n");
	const kept: string[] = [];
	const shellBodies: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		kept.push(line);
		// 한 줄에 heredoc 이 여럿일 수 있다 — 순서대로 본문이 이어진다.
		const ops = [
			...line.matchAll(
				/<<(-?)\s*(?:'([^']+)'|"([^"]+)"|\\?([A-Za-z_][A-Za-z0-9_]*))/g,
			),
		];
		for (const op of ops) {
			const dash = op[1] === "-";
			const term = op[2] ?? op[3] ?? op[4] ?? "";
			if (term.length === 0) continue;
			// 이 heredoc 을 읽는 명령의 머리 — 같은 줄에서 `<<` 앞, 마지막 구분자 뒤의 첫 단어.
			const before = line.slice(0, op.index ?? 0);
			const seg = before.split(/&&|\|\||[;|(]/).pop() ?? "";
			const headWord = seg.trim().split(/\s+/)[0] ?? "";
			const shellReads = SHELLS.test(basename(headWord));
			const body: string[] = [];
			let j = i + 1;
			for (; j < lines.length; j++) {
				const raw = lines[j] ?? "";
				const probe = dash ? raw.replace(/^\t+/, "") : raw;
				if (probe === term) break;
				body.push(raw);
			}
			if (shellReads) shellBodies.push(body.join("\n"));
			i = j; // 종결자 줄까지 소비 (없으면 끝까지)
		}
	}
	return { text: kept.join("\n"), shellBodies };
}

function matchParen(src: string, openAt: number): number {
	let depth = 0;
	let q: "'" | '"' | null = null;
	for (let i = openAt; i < src.length; i++) {
		const c = src[i];
		if (q) {
			if (c === "\\" && q === '"') i++;
			else if (c === q) q = null;
			continue;
		}
		if (c === "'" || c === '"') q = c;
		else if (c === "(") depth++;
		else if (c === ")") {
			depth--;
			if (depth === 0) return i;
		}
	}
	return src.length;
}

/**
 * 명령문을 **단순 명령(단어 배열)** 의 목록으로. 따옴표는 한 단어로 접고, 구분자
 * (`;` `|` `&` `\n` `(` `)` `{` `}`)에서 자르고, `$(…)`·백틱·heredoc 안의 셸은 재귀로 편입한다.
 */
export function simpleCommands(cmd: string): string[][] {
	const out: string[][] = [];
	const { text, shellBodies } = stripHeredocs(cmd);
	for (const b of shellBodies) out.push(...simpleCommands(b));
	let words: string[] = [];
	let cur = "";
	let inWord = false;
	let q: "'" | '"' | null = null;
	const flush = () => {
		if (inWord) {
			words.push(cur);
			cur = "";
			inWord = false;
		}
	};
	const endCmd = () => {
		flush();
		if (words.length > 0) out.push(words);
		words = [];
	};
	for (let i = 0; i < text.length; i++) {
		const c = text[i] ?? "";
		if (q === "'") {
			if (c === "'") q = null;
			else cur += c;
			continue;
		}
		if (q === '"') {
			if (c === "\\" && i + 1 < text.length) {
				cur += text[i + 1];
				i++;
			} else if (c === '"') q = null;
			else if (c === "$" && text[i + 1] === "(") {
				const end = matchParen(text, i + 1);
				out.push(...simpleCommands(text.slice(i + 2, end)));
				i = end;
			} else if (c === "`") {
				const end = text.indexOf("`", i + 1);
				if (end > i) {
					out.push(...simpleCommands(text.slice(i + 1, end)));
					i = end;
				}
			} else cur += c;
			continue;
		}
		if (c === "\\" && i + 1 < text.length) {
			if (text[i + 1] === "\n") {
				i++; // 줄 잇기
				continue;
			}
			cur += text[i + 1];
			inWord = true;
			i++;
			continue;
		}
		if (c === "'" || c === '"') {
			q = c;
			inWord = true;
			continue;
		}
		if (c === "$" && text[i + 1] === "(") {
			const end = matchParen(text, i + 1);
			out.push(...simpleCommands(text.slice(i + 2, end)));
			inWord = true; // 치환 결과가 한 단어로 선다
			i = end;
			continue;
		}
		if (c === "`") {
			const end = text.indexOf("`", i + 1);
			if (end > i) {
				out.push(...simpleCommands(text.slice(i + 1, end)));
				inWord = true;
				i = end;
				continue;
			}
		}
		if (c === "#" && !inWord) {
			const nl = text.indexOf("\n", i);
			endCmd();
			if (nl < 0) break;
			i = nl;
			continue;
		}
		if (c === "\n") {
			endCmd();
			continue;
		}
		if (c === " " || c === "\t" || c === "\r") {
			flush();
			continue;
		}
		if (
			c === ";" ||
			c === "|" ||
			c === "&" ||
			c === "(" ||
			c === ")" ||
			c === "{" ||
			c === "}"
		) {
			endCmd();
			continue;
		}
		cur += c;
		inWord = true;
	}
	endCmd();
	return out;
}

/** 단순 명령 하나가 `git push` 인가 — 껍데기를 벗기고 `git` 의 하위명령을 본다. */
export function isGitPushWords(w: readonly string[]): boolean {
	let i = 0;
	for (;;) {
		const h = w[i];
		if (h === undefined) return false;
		if (ASSIGNMENT.test(h) || WRAPPERS_NOARG.has(h) || KEYWORDS.has(h)) {
			i++;
			continue;
		}
		if (h === "env") {
			i++;
			while (i < w.length) {
				const a = w[i] ?? "";
				if (ASSIGNMENT.test(a)) i++;
				else if (/^(-u|-C|-S|--unset|--chdir|--split-string)$/.test(a)) i += 2;
				else if (a.startsWith("-")) i++;
				else break;
			}
			continue;
		}
		if (h === "timeout") {
			i++;
			while (i < w.length && (w[i] ?? "").startsWith("-")) {
				i += /^(-k|-s|--kill-after|--signal)$/.test(w[i] ?? "") ? 2 : 1;
			}
			i++; // duration
			continue;
		}
		if (h === "nice") {
			i++;
			if (w[i] === "-n") i += 2;
			else if ((w[i] ?? "").startsWith("-")) i++;
			continue;
		}
		if (h === "sudo" || h === "doas") {
			i++;
			while (i < w.length && (w[i] ?? "").startsWith("-")) {
				i += /^-(u|g|h|p|C|D|U|r|t)$/.test(w[i] ?? "") ? 2 : 1;
			}
			continue;
		}
		/**
		 * `wsl.exe -d ubuntu bash -c "…"` — Windows 호스트에서 WSL 저장소를 다루는 **정상 경로**다.
		 *
		 * pdgd 제보(2026-09-22): 그 호스트는 저장소가 `//wsl.localhost/...`(UNC)이고 셸이
		 * Git Bash 라, Windows git 에 원격 자격이 없어 push 가 **반드시** `wsl.exe` 를 통과한다.
		 * 그래서 이 껍데기가 목록에 없는 동안 `pre-push-guard` 는 그 호스트에서 **상시** 눈이 멀었고,
		 * 게이트 빨강인 커밋이 main 에 올라갔다(`bfb9367e`).
		 *
		 * ⚠ 스크립트 **파일**을 넘기는 형태(`wsl.exe -d ubuntu bash /tmp/x.sh`)는 여전히 못 본다 —
		 *   그건 이 매처의 선언된 한계이고 이 수정이 바꾸지 않는다. 바뀌는 것은 **본문이 명령문인데**
		 *   바깥 `wsl.exe` 하나 때문에 못 보던 경우다.
		 */
		if (/^wsl(\.exe)?$/i.test(basename(h))) {
			i++;
			while (i < w.length) {
				const a = w[i] ?? "";
				if (/^(-d|--distribution|-u|--user|--cd|--shell-type)$/i.test(a))
					i += 2;
				else if (/^(-e|--exec)$/i.test(a)) {
					i++;
					break;
				} else if (a.startsWith("-")) i++;
				else break;
			}
			continue;
		}
		if (h === "stdbuf") {
			i++;
			while (i < w.length && (w[i] ?? "").startsWith("-")) {
				i += /^-(o|e|i)$/.test(w[i] ?? "") ? 2 : 1;
			}
			continue;
		}
		break;
	}
	const head = w[i];
	if (head === undefined) return false;
	const name = basename(head);
	if (SHELLS.test(name)) {
		// `bash -c "…"` · `sh -lc "…"` — 다음 단어가 셸 스크립트다.
		for (let k = i + 1; k < w.length; k++) {
			const a = w[k] ?? "";
			if (/^-[A-Za-z]*c[A-Za-z]*$/.test(a)) {
				const script = w[k + 1];
				return script !== undefined && isGitPushCommand(script);
			}
			if (!a.startsWith("-")) break;
		}
		return false;
	}
	if (name === "eval") return isGitPushCommand(w.slice(i + 1).join(" "));
	if (name === "git-push") return true;
	if (name !== "git") return false;
	i++;
	while (i < w.length) {
		const a = w[i] ?? "";
		if (GIT_OPT_WITH_ARG.has(a)) {
			i += 2;
			continue;
		}
		if (a.startsWith("-")) {
			i++;
			continue;
		}
		break;
	}
	if (w[i] !== "push") return false;
	const rest = w.slice(i + 1);
	// 도움말·드라이런은 원격에 닿지 않는다.
	if (
		rest.includes("--help") ||
		rest.includes("-h") ||
		rest.includes("--dry-run")
	)
		return false;
	return true;
}

/** 이 명령문 어딘가에서 `git push` 가 **실행되는가**. 인자·주석·heredoc 본문의 문자열은 아니다. */
export function isGitPushCommand(cmd: string): boolean {
	if (!cmd) return false;
	for (const words of simpleCommands(cmd))
		if (isGitPushWords(words)) return true;
	return false;
}

/** `git push` 가 인자를 받는 옵션 — 다음 단어는 refspec 이 아니다. */
const PUSH_OPT_WITH_ARG: ReadonlySet<string> = new Set([
	"-o",
	"--push-option",
	"--repo",
	"--receive-pack",
	"--exec",
]);
/** 대상을 명령줄 밖에서 정하는 옵션 — 이 형태는 읽지 않는다(null). */
const PUSH_OPT_UNREADABLE =
	/^(--all|--mirror|--tags|--branches|--follow-tags|--prune)$/;

/**
 * 평범한 `git push [옵션] [<원격> [<refspec>…]]` **한 개**가 보내는 대상 — `wip/*` 판정용(ADR-029 §7).
 *
 * 읽지 못하는 형태는 전부 null 이다 — 껍데기(env·bash -c·eval…) · git 전역 옵션(`-C` 등) · 여러 push ·
 * `--all`/`--tags` 류. null 을 받은 호출자는 **평소 규칙**(풀 영수증)을 쓴다 — 읽지 못한 것을 wip 로 접지 않는다.
 * refspecs 가 빈 배열이면 «현재 브랜치» 다(호출자가 HEAD 로 푼다).
 */
export function plainPushTargets(cmd: string): PushTargets | null {
	const all = plainPushTargetsAll(cmd);
	return all !== null && all.length === 1 ? (all[0] ?? null) : null;
}

export interface PushTargets {
	readonly remote: string | null;
	readonly refspecs: readonly string[];
	readonly deletion: boolean;
	/** git pre-push 훅이 도는가 — `--no-verify` 면 거짓(마지막 `--verify`/`--no-verify` 가 이긴다). */
	readonly verify: boolean;
}

/**
 * 한 명령문의 `git push` **전부** — 하나라도 읽지 못하면 null(부분만 읽고 판정하지 않는다).
 * `git push origin wip/x; git push forgejo wip/x` 처럼 두 원격에 같은 wip 를 보내는 형태가 흔하다 — 각 push 는
 * git 훅을 따로 거치므로, 전부 wip 로 보이면 넘겨도 된다(2026-09-24 인계 지뢰: 이 형태가 풀 영수증 규칙으로 떨어졌다).
 */
export function plainPushTargetsAll(
	cmd: string,
): readonly PushTargets[] | null {
	const pushes = simpleCommands(cmd).filter((w) => isGitPushWords(w));
	if (pushes.length === 0) return null;
	const out: PushTargets[] = [];
	for (const w of pushes) {
		const t = readPushWords(w);
		if (t === null) return null;
		out.push(t);
	}
	return out;
}

function readPushWords(w: readonly string[]): PushTargets | null {
	if (w[0] !== "git" || w[1] !== "push") return null;
	const positional: string[] = [];
	let deletion = false;
	let verify = true;
	for (let i = 2; i < w.length; i++) {
		const a = w[i] ?? "";
		if (PUSH_OPT_UNREADABLE.test(a)) return null;
		if (a === "-d" || a === "--delete") {
			deletion = true;
			continue;
		}
		if (a === "--no-verify" || a === "--verify") {
			verify = a === "--verify";
			continue;
		}
		if (PUSH_OPT_WITH_ARG.has(a)) {
			i++;
			continue;
		}
		// 리다이렉션(`2>&1` 은 `&` 에서 잘려 `2>` 가 남는다 · `>log` · `2>/dev/null`)은 인자가 아니다.
		if (/^\d*[<>]{1,2}&?$/.test(a)) {
			i++;
			continue;
		}
		if (/^(\d*[<>]|&>)/.test(a)) continue;
		if (a.startsWith("-")) continue;
		positional.push(a);
	}
	return {
		remote: positional[0] ?? null,
		refspecs: positional.slice(1),
		deletion,
		verify,
	};
}

export type PushWorkdir =
	| { readonly kind: "dir"; readonly dir: string; readonly explicit: boolean }
	| { readonly kind: "unknown"; readonly reason: string };

/** 셸이 값으로 바꿀 단어 — 실행 전에는 모른다. */
const DYNAMIC_WORD = /[$`*?[]|^~[^/]/;

function resolveDir(base: string, word: string, home: string): string | null {
	if (DYNAMIC_WORD.test(word)) return null;
	const expanded =
		word === "~"
			? home
			: word.startsWith("~/")
				? `${home}${word.slice(1)}`
				: word;
	return pathResolve(base, expanded);
}

/**
 * 이 명령문의 `git push` 가 **어느 디렉터리에서** 도는가 — 훅 프로세스의 cwd 가 아니라 명령 자신의 `cd` · `git -C`.
 *
 * 2026-09-24 인계 지뢰: 세션 cwd 가 주 체크아웃인 채로 `cd <워크트리> && git push origin HEAD:main` 을 내자
 * `pre-push-guard` 가 **주 체크아웃의 영수증과 트리**로 판정해 세 번 막았다(main · wip 둘 다). PreToolUse 훅은
 * 명령이 돌기 **전에** 세션 cwd 에서 뜨므로, 명령 안의 `cd` 는 훅이 직접 읽어야 한다.
 *
 * - push 앞의 `cd <경로>`(와 `pushd`)를 순서대로 따라가고, push 의 `git -C <경로>` 를 얹는다. `bash -c "…"` 는 재귀.
 * - 모르는 것은 추측하지 않는다(`unknown`): 변수·글롭·`cd -`·`popd`·`--git-dir`/`--work-tree`·push 들이 서로 다른 곳.
 * - `explicit` = 명령이 디렉터리를 **바꿨다** — 호출자는 그 자리에 저장소가 없을 때 세션 프로젝트로 물러서면 안 된다.
 *
 * ⚠ 서브셸 `( cd x && … )` 의 `cd` 도 뒤 명령에 이어진 것으로 읽는다(단순 명령 목록이 괄호를 평평하게 편다) —
 * 그 뒤에 괄호 **밖**에서 push 하는 드문 형태만 틀리고, 틀려도 다른 저장소가 아니라 판정 불능/재판정 쪽이다.
 */
export function pushWorkdir(
	cmd: string,
	base: string,
	home = process.env.HOME ?? "/",
): PushWorkdir {
	let cwd = base;
	let changed = false;
	let known = true;
	/** push 시점에 자리가 바뀌어 있었나 — push 뒤의 `cd` 는 세지 않는다. */
	let explicit = false;
	const dirs = new Set<string>();
	for (const w of simpleCommands(cmd)) {
		const h = w[0];
		if (h === "cd" || h === "pushd") {
			const args = w.slice(1).filter((a) => !/^-[LPe@]+$/.test(a));
			const target = args[0];
			if (args.length > 1 || target === "-") known = false;
			else {
				const next =
					target === undefined ? home : resolveDir(cwd, target, home);
				if (next === null) known = false;
				else cwd = next;
			}
			changed = true;
			continue;
		}
		if (h === "popd") {
			known = false;
			changed = true;
			continue;
		}
		if (!isGitPushWords(w)) continue;
		if (!known)
			return {
				kind: "unknown",
				reason: "push 앞의 `cd` 대상을 실행 전에 알 수 없다",
			};
		const gi = w.findIndex((a) => basename(a) === "git");
		if (gi < 0) {
			// `bash -c "…"` · `eval …` — 본문을 지금 cwd 에서 다시 읽는다.
			const ci = w.findIndex((a) => /^-[A-Za-z]*c[A-Za-z]*$/.test(a));
			const body =
				ci >= 0
					? w[ci + 1]
					: w[0] === "eval"
						? w.slice(1).join(" ")
						: undefined;
			if (body === undefined)
				return { kind: "unknown", reason: "push 를 감싼 껍데기를 풀지 못했다" };
			const inner = pushWorkdir(body, cwd, home);
			if (inner.kind === "unknown") return inner;
			dirs.add(inner.dir);
			explicit ||= changed || inner.explicit;
			continue;
		}
		let dir = cwd;
		let viaC = false;
		for (let i = gi + 1; i < w.length && w[i] !== "push"; i++) {
			const a = w[i] ?? "";
			if (
				a === "--git-dir" ||
				a === "--work-tree" ||
				a.startsWith("--git-dir=") ||
				a.startsWith("--work-tree=")
			)
				return {
					kind: "unknown",
					reason: `\`${a}\` 로 저장소를 바꾼 push 는 읽지 않는다`,
				};
			if (a === "-C") {
				const next = resolveDir(dir, w[i + 1] ?? "", home);
				if (next === null || (w[i + 1] ?? "") === "")
					return {
						kind: "unknown",
						reason: "`git -C` 대상을 실행 전에 알 수 없다",
					};
				dir = next;
				viaC = true;
				i++;
			} else if (GIT_OPT_WITH_ARG.has(a)) i++;
		}
		dirs.add(dir);
		explicit ||= changed || viaC;
	}
	if (dirs.size > 1)
		return {
			kind: "unknown",
			reason: `push 들이 서로 다른 곳에서 돈다: ${[...dirs].join(" · ")}`,
		};
	const only = [...dirs][0];
	return only === undefined
		? { kind: "dir", dir: base, explicit: false }
		: { kind: "dir", dir: only, explicit };
}
