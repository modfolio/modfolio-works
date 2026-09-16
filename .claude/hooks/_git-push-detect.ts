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
