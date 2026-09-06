/**
 * scripts/hooks/pre-measurement-guard.ts
 * PreToolUse Bash hook. **측정이 조용히 틀리는 세 형태**를 명령 실행 전에 막는다.
 *
 * ## 왜 훅인가 — 산문은 실패한 것이 관측됐다
 *
 * 이 셋은 전부 `agent-evidence.md` 에 **이미 적혀 있다**. 그 파일은 28.8KB 이고
 * **30+ repo 에 매 턴 주입**된다. 그런데 2026-08-25 한 세션에서 셋 다 밟혔다 —
 * 규칙이 컨텍스트 안에 있는 채로.
 *
 * ```
 * ①  git push -q 2>&1 | tail -2; echo "push exit=$?"   → tail 의 종료코드를 읽었다
 *                                                          (push 는 실패했는데 «0» 으로 보고)
 * ②  ${PIPESTATUS[0]}  in zsh                          → 빈 문자열. bash 문법이다
 * ③  rg -rn "pattern"                                  → -r 은 --replace. 인용문만 틀린다
 * ```
 *
 * **읽히는 것과 지켜지는 것은 다른 문장이다.** 훅은 0 토큰이고 그 행동 직전에 발동한다.
 *
 * ## 좁게 문다 — 그리고 인라인 탈출구가 있다
 *
 * 새 runtime guard 를 넓게 block default 로 깔면 정상 작업을 끊고, 그러면 가드가
 * **우회되거나 제거된다**(playbook `PB-TST-0050`). 그래서:
 *
 * - 오탐 공간을 열거할 수 있을 만큼 **좁은** 패턴만 문다
 * - 의도적으로 그 형태를 쓰고 싶으면 명령에 `# measure-ok` 를 적으면 통과한다
 *   (지우면 되는 설정이 아니라 **그 명령에 한정된, 보이는** 예외다)
 * - 전면 비활성화는 `MODFOLIO_MEASUREMENT_GUARD=off`
 *
 * 차단 비용이 싼 자리라서 block 을 골랐다 — 막히면 명령을 고쳐 다시 쓰면 끝이고,
 * 그게 정확히 원하는 행동이다.
 */

import { failClosed } from "./_fail-closed.ts";
import { bashCommand, readHookInput } from "./_lib.ts";

export interface MeasurementFinding {
	readonly id:
		| "pipe-exit"
		| "zsh-pipestatus"
		| "rg-bundled-r"
		| "pgrep-self-count"
		| "zsh-word-split";
	readonly why: string;
	readonly fix: string;
}

/** 이 명령에 한해 통과시키는 표식. 보이고, 그 명령에만 붙는다. */
const ESCAPE = /#\s*measure-ok\b/;

/**
 * 인용부 안의 내용을 같은 길이의 공백으로 지운다 — **길이를 보존**해야
 * 「파이프가 `$?` 보다 앞인가」라는 위치 판정이 유효하다.
 *
 * ⚠ 이것이 없으면 오탐이 난다. 실측: 이 훅을 배선한 **바로 다음 명령**에서
 * `ssh nas 'docker ps --format "{{.Names}}|{{.Image}}"' > o; RC=$?` 가 막혔다.
 * 그 `|` 는 셸 파이프가 아니라 **포맷 구분자**다.
 *
 * 원격 명령 안의 *진짜* 파이프도 마찬가지로 무관하다 — `ssh h 'a | b'` 뒤의 `$?` 는
 * **ssh 의 종료코드**이고 그게 우리가 원하는 값이다. 그래서 인용부를 통째로 지우는
 * 것이 좁히는 게 아니라 **정확한** 판정이다.
 */
export type QuoteMode =
	/** 두 인용부 모두 지운다 — `|`·명령어처럼 **셸 문법**을 찾을 때. */
	| "both"
	/** 작은따옴표만 지운다 — `$?`·`$PIPESTATUS` 처럼 **확장되는 것**을 찾을 때. */
	| "single";

/**
 * ⚠ **축마다 마스킹이 다르다.** 첫 구현은 둘을 하나로 묶었고, 그 결과 원 사건
 * `echo "push exit=$?"` 를 **놓쳤다** — 큰따옴표 안의 `$?` 는 셸이 **확장한다**.
 * 리터럴인 것은 작은따옴표 안뿐이다. 하나의 «인용부 제거» 로 뭉치면 오탐을 고치면서
 * 검출력이 함께 지워진다(대조쌍에 진짜 결함을 같이 넣지 않았으면 못 봤을 자리다).
 */
/**
 * `$( … )` 안을 같은 길이의 공백으로 지운다 — **명령 치환 안의 파이프는 그 세그먼트의
 * 파이프라인이 아니다.**
 *
 * ⚠ 실측 2026-08-25 (네 번째 오탐):
 * `timeout 300 bun run $S > /tmp/x-$(echo $S | tr ':' '-').log 2>&1; echo "exit=$?"`
 * 가 막혔다. `$?` 는 `timeout` 의 종료코드이고, 파이프는 **파일명을 만드는 치환 안**에
 * 있었다. 중첩을 세어 짝을 맞춘다.
 */
export function stripCommandSubstitution(cmd: string): string {
	let out = "";
	let depth = 0;
	for (let i = 0; i < cmd.length; i += 1) {
		const c = cmd[i] as string;
		if (depth === 0 && c === "$" && cmd[i + 1] === "(") {
			depth = 1;
			out += "  ";
			i += 1;
			continue;
		}
		if (depth > 0) {
			if (c === "(") depth += 1;
			else if (c === ")") depth -= 1;
			out += " ";
			continue;
		}
		out += c;
	}
	return out;
}

export function stripQuoted(cmd: string, mode: QuoteMode = "both"): string {
	let out = "";
	let quote: string | null = null;
	for (let i = 0; i < cmd.length; i += 1) {
		const c = cmd[i] as string;
		if (quote === null && (c === "'" || c === '"')) {
			quote = c;
			out += c;
			continue;
		}
		if (quote !== null) {
			// 큰따옴표 안에서만 백슬래시가 이스케이프다(작은따옴표 안에서는 리터럴).
			if (quote === '"' && c === "\\" && i + 1 < cmd.length) {
				out += mode === "both" ? "  " : cmd.slice(i, i + 2);
				i += 1;
				continue;
			}
			if (c === quote) {
				quote = null;
				out += c;
				continue;
			}
			/*
			 * `single` 모드에서는 큰따옴표 **안의 내용을 보존**한다 — `$?` 는 거기서도
			 * 확장되기 때문이다.
			 *
			 * ⚠ **단 줄바꿈은 예외다.** 줄바꿈은 확장이 아니라 **셸 문법**(세그먼트 경계)
			 * 이라 모드에 따라 다르게 다루면 두 마스킹본의 세그먼트 수가 어긋나고,
			 * `pipeExitTrap` 이 그때 `return false` 로 **판정을 통째로 끈다.**
			 *
			 * 실측 2026-08-25: 여러 줄 커밋 메시지를 낀
			 * `… && git push -q 2>&1 | tail -2; echo "push exit=$?"` 가 **그냥 통과했다.**
			 * 즉 이 가드는 내가 쓰는 명령의 큰 부류에서 조용히 꺼져 있었다 —
			 * 「판정 불능을 통과로 접는다」의 교과서적 형태다.
			 */
			out += mode === "both" || quote === "'" || c === "\n" ? " " : c;
			continue;
		}
		out += c;
	}
	return out;
}

/**
 * 파이프 뒤의 `$?` — **왼쪽이 아니라 마지막 단계의 종료코드**다.
 *
 * `pipefail` 이 켜져 있거나 `PIPESTATUS`/`pipestatus` 를 읽으면 의도적이므로 통과.
 */
/**
 * 명령을 **세그먼트**로 자른다 — `;` · `&&` · `||` · 줄바꿈이 경계다.
 * 위치를 보존한 마스킹본에서 자르므로 인용부·heredoc 안의 구분자는 경계가 아니다.
 */
export function segments(masked: string): string[] {
	const out: string[] = [];
	let start = 0;
	for (let i = 0; i < masked.length; i += 1) {
		const c = masked[i];
		const two = masked.slice(i, i + 2);
		if (c === ";" || c === "\n" || two === "&&" || two === "||") {
			out.push(masked.slice(start, i));
			if (two === "&&" || two === "||") i += 1;
			start = i + 1;
		}
	}
	out.push(masked.slice(start));
	return out;
}

/** 세그먼트 안에 **최상위 파이프**가 있는가. `||` 는 이미 경계로 잘렸다. */
function hasTopLevelPipe(seg: string): boolean {
	return /[^|]\|[^|]/.test(seg);
}

/**
 * 파이프 뒤의 `$?` — **왼쪽이 아니라 마지막 단계의 종료코드**다.
 *
 * ⚠ **세그먼트 단위로 본다.** 초판은 「문자열 어딘가에 파이프가 있고 그 뒤에 `$?` 가
 * 있으면」 물었고, 실제 명령 **24,501건**에 재생하니 **4.616%** 가 막혔다
 * (`bun run guard:replay`). 표본의 지배적 오탐이 이것이었다:
 *
 * ```
 * biome check . 2>&1 | tail -30 ; echo "---" ; biome check . >/dev/null 2>&1 ; echo "EXIT=$?"
 * └── 보여주려고 파이프 ──┘                   └── 판정하려고 다시, 파이프 없이 ──┘  └ 이건 옳다
 * ```
 *
 * 즉 **규칙을 올바로 지킨 형태**(표시용과 판정용의 분리)를 벌하고 있었다. `$?` 는
 * **바로 앞 세그먼트**의 종료코드이므로 그 세그먼트에 파이프가 있을 때만 문다.
 */
function pipeExitTrap(cmd: string): boolean {
	if (/pipefail|PIPESTATUS|pipestatus/.test(cmd)) return false;
	// 파이프는 **셸 문법** → 두 인용부 모두 밖. `$?` 는 **확장** → 작은따옴표만 밖.
	// 명령 치환 안은 **그 세그먼트의 파이프라인이 아니다** — 두 축 모두에서 지운다.
	const forPipe = segments(stripCommandSubstitution(stripQuoted(cmd, "both")));
	const forQuery = segments(
		stripCommandSubstitution(stripQuoted(cmd, "single")),
	);
	// 마스킹 두 벌의 세그먼트 수가 다르면 짝을 못 맞춘다 — 판정 불능이므로 물지 않는다.
	if (forPipe.length !== forQuery.length) return false;
	for (let i = 1; i < forQuery.length; i += 1) {
		if (!/\$\{?\?\}?/.test(forQuery[i] ?? "")) continue;
		// **바로 앞의 «실행되는» 세그먼트**를 찾는다 — 빈 줄과 비워진 heredoc 본문은
		// 명령이 아니므로 건너뛴다. 안 건너뛰면 heredoc 을 낀 진짜 결함을 놓친다.
		let j = i - 1;
		while (j >= 0 && (forPipe[j] ?? "").trim().length === 0) j -= 1;
		if (j >= 0 && hasTopLevelPipe(forPipe[j] ?? "")) return true;
	}
	return false;
}

/**
 * zsh 에서 `${PIPESTATUS[0]}` 는 **빈 문자열**이다 — bash 배열이고 zsh 는
 * `$pipestatus[1]`(소문자·1-indexed)을 쓴다. 빈 값은 조건문에서 조용히 거짓이 된다.
 */
function zshPipestatus(cmd: string): boolean {
	// 확장이므로 `single` — `"${PIPESTATUS[0]}"` 도 zsh 에선 빈 값으로 확장된다.
	return /\$\{?PIPESTATUS\[/.test(stripQuoted(cmd, "single"));
}

/**
 * `rg` 의 `-r` 은 `--replace` 다. grep 습관으로 `-rn`(재귀+행번호)처럼 묶어 쓰면
 * **exit 0 · 히트 수도 파일명도 맞고 인용문만 틀린다** — 가장 안 보이는 오류다.
 * rg 는 기본 재귀라 그런 플래그가 애초에 없다.
 */
function rgBundledR(cmd: string): boolean {
	// `-r` 이 **다른 짧은 플래그와 묶인** 형태만 문다. 단독 `-r <문자열>` 은 정상 치환이다.
	// ⚠ 첫판은 `rg\s[^;&|]*?\s-` 였고 **`rg -rn` 을 못 잡았다** — `rg\s` 가 공백을
	//   먹은 뒤 다시 공백을 요구해서, 플래그가 바로 붙은 가장 흔한 형태를 놓쳤다.
	//   중간 인자는 있어도 없어도 된다.
	return /(^|[;&|(\s])rg\s+(?:[^;&|]*\s+)?-(?:[a-qs-zA-Z]+r|r[a-qs-zA-Z]+)\b/.test(
		stripQuoted(cmd),
	);
}

/**
 * heredoc **본문**을 지운다 — 그것은 셸 코드가 아니라 **데이터**다.
 *
 * ⚠ 세 번째 오탐이었다(2026-08-25). 커밋 메시지를 `git commit -F - <<'EOF'` 로 넣는데,
 * 그 메시지가 **바로 이 가드가 잡은 오탐 사례를 인용**하고 있었다:
 * `` `ssh nas 'docker ps --format "{{.N}}|{{.I}}"'; RC=$?` `` — 가드가 자기 사건 기록을
 * 셸 코드로 읽고 커밋을 막았다.
 *
 * 열기 줄은 남긴다 — 거기엔 진짜 파이프가 있을 수 있다(`a | b <<'EOF'`).
 */
export function stripHeredocs(cmd: string): string {
	const lines = cmd.split("\n");
	const out: string[] = [];
	let tag: string | null = null;
	for (const line of lines) {
		if (tag !== null) {
			// 닫는 표식은 남긴다(줄 수 보존). 본문만 지운다.
			// 본문도 **종료 표식도** 비운다. 표식을 남기면 세그먼트 분할에서 그것이
			// 「바로 앞 명령」 자리를 차지해, heredoc 을 낀 진짜 파이프 결함을 놓친다.
			if (line.trim() === tag) tag = null;
			out.push("");
			continue;
		}
		out.push(line);
		const m = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(line);
		if (m) tag = m[2] as string;
	}
	return out.join("\n");
}

/**
 * `pgrep -c -f <패턴>` — **그 패턴을 담은 셸 자신을 센다.**
 *
 * 실행 중인 명령의 `cmdline` 에 그 패턴이 들어 있으므로 `pgrep -f` 는 **항상 자기를
 * 한 번 더 잡는다.** 세는 용도일 때 이것이 조용히 답을 바꾼다 — 「0인가」를 물었는데
 * 영원히 1 이상이 나오고, 감시 루프면 조건이 영원히 참이 된다(실측 22시간).
 *
 * ⚠ **2026-08-25 한 세션에서 두 번 밟았다.** 그 규칙이 `agent-evidence.md` 에 적혀
 * 있는 채로. 한 번은 「전파 프로세스 2개」로 오보했고, 한 번은 `pkill -f` 가 **자기
 * 셸을 죽여** exit 143 을 냈다.
 *
 * 세는 형태(`-c`)만 문다 — 목록 조회(`-a`·`-l`)는 자기 줄이 **눈에 보이므로** 다르다.
 */
function pgrepSelfCount(cmd: string): boolean {
	// `-c` 와 `-f` 가 둘 다 있는 pgrep/pkill. 묶음(`-cf`)과 분리(`-c -f`) 모두.
	return /(^|[;&|(\s])(pgrep|pkill)\s[^;&|]*(-[a-eg-z]*c[a-eg-z]*f|-[a-eg-z]*f[a-eg-z]*c|-c\s+[^;&|]*-f|-f\s+[^;&|]*-c)\b/.test(
		stripQuoted(cmd),
	);
}

/**
 * ⑤ `X=$(...)` 로 담아 놓고 `for y in $X` — **zsh 는 스칼라를 쪼개지 않는다.**
 *
 * 실측 (zsh 5.9, 2026-08-30):
 * ```
 *   v=$'a\nb\nc'
 *   for x in $v            → 1 회   ✗ 안 쪼개진다
 *   for x in $(printf …)   → 3 회   ✓ 명령 치환은 쪼개진다
 *   for x in ${=v}         → 3 회   ✓ 명시적 split
 *   arr=(a b c); for x in $arr → 3 회 ✓ 배열은 쪼개진다
 * ```
 *
 * bash 습관으로 쓰면 **루프가 1회만 돌고 조용히 틀린 답이 나온다.** 2026-08-29 하루에
 * 세 번 밟았고 셋 다 결론이 반대로 나올 뻔했다:
 *   ① 심볼 조회가 32행 전부 「1/6」  → 「거의 전부 기존 구현 있음」
 *   ② 판별자가 32종 중 22종 「부분 추출」 → 「절반이 추출」
 *   ③ 링크 스윕이 **「0건」 거짓 초록**   → 죽은 링크 13개를 놓칠 뻔
 *
 * ⚠ **배열이면 정상이다**(`arr=(a b c)`). 명령문만 보고 스칼라인지 배열인지 가를 수
 * 없으므로 **같은 명령 안에서 `$(...)`·`$'...'`·백틱으로 할당된 것**만 문다.
 * 그렇게 할당된 것은 반드시 스칼라 문자열이다 — 오탐이 원리적으로 없다.
 * (`set -- $X` 도 같은 축이다 — 위치 인자를 쪼개려는 것이므로.)
 */
function zshWordSplit(cmd: string): boolean {
	const bare = stripQuoted(cmd, "single");
	// 같은 명령 안에서 «명령 치환/ANSI-C 인용» 으로 할당된 이름들
	const assigned = new Set<string>();
	for (const m of bare.matchAll(
		/(^|[;&|(\s])([A-Za-z_][A-Za-z0-9_]*)=(?:"?\$\(|\$'|`)/g,
	)) {
		const name = m[2];
		if (name) assigned.add(name);
	}
	if (assigned.size === 0) return false;
	for (const name of assigned) {
		// for y in $NAME / ${NAME}   ·  set -- $NAME
		const forRe = new RegExp(
			`\\bfor\\s+[A-Za-z_][A-Za-z0-9_]*\\s+in\\s+[^;&\n]*\\$\\{?${name}\\}?(?![A-Za-z0-9_({=+:\\[])`,
		);
		const setRe = new RegExp(
			`\\bset\\s+--\\s+\\$\\{?${name}\\}?(?![A-Za-z0-9_({=+:\\[])`,
		);
		if (forRe.test(bare) || setRe.test(bare)) return true;
	}
	return false;
}

/** 순수 판단 — I/O 없음. */
export function judgeMeasurement(raw: string): MeasurementFinding[] {
	if (!raw || ESCAPE.test(raw)) return [];
	// heredoc 본문은 데이터다 — 판정 전에 지운다.
	const cmd = stripHeredocs(raw);
	const out: MeasurementFinding[] = [];
	if (pipeExitTrap(cmd)) {
		out.push({
			id: "pipe-exit",
			why: "파이프 뒤의 `$?` 는 **마지막 단계**의 종료코드다 — 왼쪽이 실패해도 0 이 나온다.",
			fix: "판정할 명령을 파이프 없이 돌리고 종료코드를 변수에 받아라: `cmd > log 2>&1; RC=$?` · 굳이 파이프면 `set -o pipefail` 또는 zsh `$pipestatus[1]`.",
		});
	}
	if (zshPipestatus(cmd)) {
		out.push({
			id: "zsh-pipestatus",
			// 템플릿 리터럴 + `\${` — 일반 문자열에 `${…}` 를 두면 멤버 기본 biome(noTemplateCurlyInString)이 경고한다(허브는 그 규칙을 꺼 두어 안 보였다 · 2026-09-06 umbracast·worthee 실측).
			why: `\`\${PIPESTATUS[…]}\` 는 bash 문법이고 이 셸은 zsh 다 — **빈 문자열**이 되어 조건이 조용히 거짓이 된다.`,
			fix: "zsh 는 `$pipestatus[1]` (소문자 · 1-indexed). 또는 파이프를 쓰지 말고 종료코드를 변수에 받아라.",
		});
	}
	if (rgBundledR(cmd)) {
		out.push({
			id: "rg-bundled-r",
			why: "`rg` 의 `-r` 은 `--replace` 다 — 묶어 쓰면 **exit 0 이고 히트 수도 맞는데 인용문만 틀린다**.",
			fix: "rg 는 기본 재귀다. 행번호는 `-n` · 파일명만 `-l` · 개수는 `-c`.",
		});
	}
	if (pgrepSelfCount(cmd)) {
		out.push({
			id: "pgrep-self-count",
			why: "`pgrep -c -f` 는 **그 패턴을 담은 이 셸 자신**을 함께 센다 — 「0인가」가 영원히 거짓이 된다.",
			fix: "PID 로 기다려라(`kill -0 $PID`). 굳이 세려면 `/proc/<pid>/cmdline` 을 열어 자기(`$$`)를 빼고 확인한다.",
		});
	}
	if (zshWordSplit(cmd)) {
		out.push({
			id: "zsh-word-split",
			why: "zsh 는 `$VAR` 를 **워드 스플리팅 하지 않는다** — `X=$(...)` 를 `for y in $X` 로 돌리면 루프가 **1회만** 돈다(실측 zsh 5.9).",
			fix: `\`printf '%s\\n' "$X" | while IFS= read -r y; do …\` · 또는 \`for y in \${=X}\` · 또는 애초에 \`$(...)\` 를 for 목록에 직접 둔다(명령 치환은 쪼개진다).`,
		});
	}
	return out;
}

if (import.meta.main) {
	failClosed("pre-measurement-guard");

	/*
	 * 세 단계다 — **`off` 밖에 없으면 멤버의 선택지가 「참거나 끄거나」 둘뿐**이고,
	 * 그러면 오탐 하나에 가드가 통째로 꺼진다(playbook `PB-TST-0050`).
	 *
	 *   (기본)  block  — 막는다. 명령을 고쳐 다시 쓰면 끝이다
	 *   warn         — 보여만 준다. 오탐이 의심되지만 신호는 보고 싶을 때
	 *   off          — 전면 비활성
	 */
	const mode = process.env.MODFOLIO_MEASUREMENT_GUARD ?? "block";
	if (mode === "off") process.exit(0);

	const input = await readHookInput();
	const cmd = bashCommand(input);
	if (!cmd) process.exit(0);

	const findings = judgeMeasurement(cmd);
	if (findings.length === 0) process.exit(0);

	const mark = mode === "warn" ? "⚠" : "⛔";
	for (const f of findings) {
		console.error(`${mark} 측정이 조용히 틀린다 [${f.id}]`);
		console.error(`   ${f.why}`);
		console.error(`   → ${f.fix}`);
	}
	console.error("   (의도한 형태라면 명령에 `# measure-ok` 를 붙인다)");
	if (mode === "warn") {
		console.error(
			"   MODFOLIO_MEASUREMENT_GUARD=warn — **막지 않는다**. 판정은 사람 몫이다.",
		);
		process.exit(0);
	}
	process.exit(2);
}
