/**
 * scripts/hooks/pre-push-guard.ts
 *
 * PreToolUse Bash hook for `git push`.
 *
 * v3.1 (2026-05-18 — solo pre-production speed). This is where the project
 * quality gate moved to after it was removed from pre-commit-guard.ts. It
 * runs `quality:all` (or `check` + `typecheck`) once, right before code
 * leaves the machine, and prints a concise summary the model and user can
 * see — but it NEVER exits 2, so a push is never blocked.
 *
 * Rationale (정공법 정합): code-quality enforcement is not deleted, only
 * moved off the per-commit hot path. The HARD gate remains the `/release`
 * pipeline (`bun run release:gate`). Pre-push gives an early, visible signal
 * without taxing every commit and without an inescapable block (--no-verify
 * is also no longer blocked by pre-destructive-guard).
 *
 * Cross-platform: preserves the WSL PATH-sanitisation and Windows-UNC skip
 * that the old pre-commit gate carried (2026-04-26 WSL regression fix) so we
 * do not regress those environments.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ## v3.44 (2026-07-29) — 판정 불능은 위반이 아니다 (pdgd 실측)
 *
 * pdgd 보고: `quality:all` 이 부하 시 15분까지 가는데 훅 러너 timeout 은 600초다.
 * 게이트는 build 도중 잘렸고 훅은 그것을 **FAILED 로** 출력했다. 즉
 * *"검사가 끝나지 않았다"* 가 *"검사가 실패했다"* 로 보고됐다. 사람은 없는
 * 결함을 찾아 나서고, 진짜 원인(예산 부족)은 화면 어디에도 없다.
 *
 * 원인은 한 줄이었다 — 구 구현은 `run.status === 0` 만 성공으로 보고 **나머지
 * 전부**를 FAILED 로 뭉갰다. `status === null`(시그널로 죽음)·`ETIMEDOUT`(예산
 * 소진)·`ENOENT`(spawn 실패)는 게이트가 red 라는 뜻이 아니라 **게이트가 판정을
 * 내리지 않았다**는 뜻이다. `.claude/rules/agent-evidence.md` 의 「판정 불능과
 * 위반은 다른 종료 코드여야 한다」를 훅 층에서 재생산한 셈.
 *
 * 두 층위가 있었고 둘 다 고쳤다:
 *
 *   ① **바깥(러너)** — 훅이 자식에 timeout 을 주지 않아 예산을 소유한 쪽이
 *      Claude Code 뿐이었다. 러너가 훅째로 죽이면 stderr 는 **빈 문자열**이라
 *      아무 설명도 남지 않는다(실측 확인). 이제 훅이 러너 예산보다 조금 짧은
 *      자기 예산을 들고 돌아, 잘리기 **전에** 스스로 진단을 남긴다.
 *   ② **안(분류)** — 위 3-way 분류. 아래 종료 코드 계약 참조.
 *
 * ## 종료 코드 계약
 *
 *   0 = 판정 완료 · 게이트 green
 *   1 = 판정 완료 · 게이트 red (위반)
 *   3 = **판정 불능** — 게이트가 판정을 내리지 않았다 (시간 초과 / 시그널 /
 *       spawn 실패 / 검사 대상 0건)
 *   2 = 쓰지 않는다. Claude Code 는 **2 만** "이 도구 호출을 취소"로 읽는다.
 *
 * 1 과 3 은 둘 다 비차단이다("non-blocking error: stderr 를 사용자에게 보여주고
 * 실행은 계속"). 즉 v3.1 의 「push 를 절대 막지 않는다」는 그대로고, 바뀐 것은
 * **세 상태가 서로 구분된다**는 점뿐이다. 덤으로 exit 0 의 stderr 는 전사(轉寫)
 * 모드에서만 보이므로, 비-green 을 비-0 으로 내보내야 사람에게 실제로 닿는다.
 *
 * ⚠ 판정 불능을 "통과"로 만들지 않는다(그건 반대쪽 결함). 그렇다고 push 를
 * 막지도 않는다 — 느린 머신 하나가 푸시 불능이 되는 것은 이 훅의 계약이 아니다.
 * 목적은 **사람이 보고 판단할 수 있게 구분해서 보이는 것**이다.
 *
 * ## 예산은 멤버가 정한다
 *
 * 하드코딩하지 않는다. 우선순위:
 *   1. `MODFOLIO_PRE_PUSH_TIMEOUT_MS` (ms, 그대로 자식 예산 — 마진 미적용)
 *   2. `.claude/settings*.json` 에 **실제 배선된** 훅 `timeout`(초) — 러너가
 *      강제하는 진짜 예산이므로 가장 참되다
 *   3. `.claude/harness-lock.json` `extraHooks[{file:"pre-push-guard.ts",timeout}]`
 *      — 오너 선언 SoT (harness-pull 이 이 값으로 settings 를 배선한다)
 *   4. 없으면 60초 (Claude Code 훅 기본 timeout)
 *
 * 2~4 는 러너 예산이므로 `SAFETY_MARGIN_MS` 를 빼고 자식에 준다 — 훅이 먼저
 * 끊고 진단을 출력한 뒤 러너가 도착해야 메시지가 살아남는다.
 *
 * OWASP Agentic 2026 매핑:
 *   - ASI02 Tool Misuse — quality 가시화 (비차단, 사용자 판단 보존)
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	bashCommand,
	isSvelteKitProject,
	readHookInput,
	spawnSyncWithSvelteKitRetry,
} from "./_lib.ts";

/** 판정 완료 · 게이트 green. */
const EXIT_GREEN = 0;
/** 판정 완료 · 게이트 red. 비차단 — Claude Code 는 2 만 차단으로 읽는다. */
const EXIT_GATE_RED = 1;
/** 판정 불능 — 게이트가 판정을 내리지 않았다. 통과도 위반도 아니다. */
const EXIT_INDETERMINATE = 3;

/** Claude Code 훅의 기본 timeout(초). 멤버가 아무것도 선언하지 않았을 때의 러너 예산. */
const DEFAULT_RUNNER_TIMEOUT_SEC = 60;
/** 러너보다 이만큼 먼저 끊는다 — 진단을 출력할 시간을 확보하기 위해. */
const SAFETY_MARGIN_MS = 5_000;
/** 예산이 아무리 작아도 이보다 짧게는 주지 않는다(선언 실수로 0초가 되는 것 방지). */
const MIN_BUDGET_MS = 1_000;

const input = await readHookInput();
const cmd = bashCommand(input);
// Only act on a real `git push`. `git push --help`, `git push-something`, etc.
// fall through untouched.
if (!cmd || !/\bgit\s+push\b/i.test(cmd)) process.exit(EXIT_GREEN);

const projectRoot = process.cwd();

function readJsonSafe(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, "utf-8"));
	} catch {
		return undefined;
	}
}

function availableScripts(): Set<string> {
	const pkg = readJsonSafe(join(projectRoot, "package.json")) as
		| { scripts?: Record<string, string> }
		| undefined;
	return new Set(Object.keys(pkg?.scripts ?? {}));
}

/**
 * settings JSON 안에서 이 훅을 배선한 엔트리의 `timeout`(초) 을 찾는다.
 *
 * 형태를 가정하지 않고 재귀로 훑는다 — `hooks.PreToolUse[].hooks[]` 구조가
 * 바뀌어도, 오너가 손으로 다른 위치에 적어도 찾는다. 앵커는 커맨드 문자열에
 * 이 훅 파일 이름이 들어 있는 객체.
 */
function scanWiredTimeoutSec(node: unknown): number | undefined {
	if (Array.isArray(node)) {
		for (const item of node) {
			const found = scanWiredTimeoutSec(item);
			if (found !== undefined) return found;
		}
		return undefined;
	}
	if (!node || typeof node !== "object") return undefined;
	const rec = node as Record<string, unknown>;
	if (
		typeof rec.command === "string" &&
		rec.command.includes("pre-push-guard") &&
		typeof rec.timeout === "number" &&
		Number.isFinite(rec.timeout) &&
		rec.timeout > 0
	) {
		return rec.timeout;
	}
	for (const value of Object.values(rec)) {
		const found = scanWiredTimeoutSec(value);
		if (found !== undefined) return found;
	}
	return undefined;
}

/** `.claude/harness-lock.json` `extraHooks` 의 오너 선언(초). */
function lockDeclaredTimeoutSec(): number | undefined {
	const lock = readJsonSafe(
		join(projectRoot, ".claude", "harness-lock.json"),
	) as
		| { extraHooks?: Array<string | { file?: string; timeout?: number }> }
		| undefined;
	for (const raw of lock?.extraHooks ?? []) {
		if (typeof raw === "string" || !raw) continue;
		if (raw.file !== "pre-push-guard.ts") continue;
		if (
			typeof raw.timeout === "number" &&
			Number.isFinite(raw.timeout) &&
			raw.timeout > 0
		) {
			return raw.timeout;
		}
	}
	return undefined;
}

/** 러너 예산(초) → 자식 예산(ms). 진단 출력 몫을 남긴다. */
function withMargin(seconds: number): number {
	return Math.max(MIN_BUDGET_MS, Math.round(seconds * 1000) - SAFETY_MARGIN_MS);
}

function resolveBudget(): { ms: number; source: string } {
	const raw = process.env.MODFOLIO_PRE_PUSH_TIMEOUT_MS;
	if (raw !== undefined) {
		const parsed = Number.parseInt(raw, 10);
		if (Number.isFinite(parsed) && parsed > 0) {
			return {
				ms: parsed,
				source: `env MODFOLIO_PRE_PUSH_TIMEOUT_MS=${parsed}ms`,
			};
		}
	}
	for (const file of ["settings.local.json", "settings.json"]) {
		const wired = scanWiredTimeoutSec(
			readJsonSafe(join(projectRoot, ".claude", file)),
		);
		if (wired !== undefined) {
			return {
				ms: withMargin(wired),
				source: `.claude/${file} 배선 timeout=${wired}s`,
			};
		}
	}
	const declared = lockDeclaredTimeoutSec();
	if (declared !== undefined) {
		return {
			ms: withMargin(declared),
			source: `.claude/harness-lock.json extraHooks timeout=${declared}s`,
		};
	}
	return {
		ms: withMargin(DEFAULT_RUNNER_TIMEOUT_SEC),
		source: `기본값 ${DEFAULT_RUNNER_TIMEOUT_SEC}s (Claude Code 훅 기본 timeout — 선언 없음)`,
	};
}

const budget = resolveBudget();

/**
 * 예산을 늘리는 법. 시간 초과·예산 소진 메시지에 항상 붙인다 — 원인이 코드가
 * 아니라 예산일 때 사람이 다음에 무엇을 할지 알아야 한다.
 */
const BUDGET_ADVICE = [
	"→ 예산을 자기 실측에 맞춘다 — `.claude/harness-lock.json`:",
	'     { "extraHooks": [{ "file": "pre-push-guard.ts", "timeout": 1200 }] }',
	"   (초 단위. harness-pull 이 이 값으로 settings.json 훅 timeout 을 배선하고,",
	"    훅은 그보다 5초 일찍 끊어 이 진단을 남긴다.)",
	"→ 즉시 판정이 필요하면 수동으로: `bun run quality:all`",
].join("\n");

const scripts = availableScripts();
const steps: string[][] = [];
if (scripts.has("quality:all")) {
	steps.push(["bun", "run", "quality:all"]);
} else {
	if (scripts.has("check")) steps.push(["bun", "run", "check"]);
	if (scripts.has("typecheck")) steps.push(["bun", "run", "typecheck"]);
}

// 검사 대상 0건은 "통과"가 아니다 (`agent-evidence.md` — 빈 대상은 통과가 아니라
// 실패다). 이 훅이 배선돼 있다는 것은 이 repo 가 push 게이트를 원한다는 뜻인데
// 돌릴 게이트가 없으면 그건 green 이 아니라 **판정 불능**이다.
if (steps.length === 0) {
	console.error(
		"[pre-push-guard] ⚠ 판정 불능 — quality 게이트 스크립트가 없다 " +
			"(package.json 에 `quality:all` 도 `check`/`typecheck` 도 없음). " +
			"검사 대상 0건을 green 으로 읽지 않는다. push 는 진행(비차단).",
	);
	process.exit(EXIT_INDETERMINATE);
}

// WSL 호스트의 PATH 에서 Windows mount (`/mnt/c/...`) 항목 제거 — `bun run`
// 이 child spawn 시 Windows bun shim 을 잡아 cmd.exe 를 trigger 하는 회귀
// 방지 (2026-04-26 WSL 발견). linux 일 때만 적용.
function sanitizePath(): NodeJS.ProcessEnv {
	if (process.platform !== "linux") return process.env;
	const filtered = (process.env.PATH ?? "")
		.split(":")
		.filter(
			(p) =>
				p.length > 0 && !p.startsWith("/mnt/c/") && !p.startsWith("/mnt/d/"),
		)
		.join(":");
	return { ...process.env, PATH: filtered };
}

const sanitizedEnv = sanitizePath();

// Windows host 가 WSL repo 를 UNC path (`\\wsl.localhost\...`) 로 접근하면
// Windows bun 이 cmd.exe 를 child shell 로 써 UNC 를 거부 → hook 이 quality
// 를 실행할 수 없는 platform 한계.
//
// v3.44: 이것도 **판정 불능**이다(구현상 exit 0 = "이상 없음"으로 읽혔다).
// 게이트가 red 인지 green 인지 이 환경에서는 알 수 없다 — 그 사실을 그대로
// 말한다. 여전히 비차단.
const isWindowsWslRepo =
	process.platform === "win32" && /^\\\\wsl/i.test(process.cwd());
if (isWindowsWslRepo) {
	console.error(
		"[pre-push-guard] ⚠ 판정 불능 — Windows host + WSL UNC path 에서는 quality 를 실행할 수 없다(platform 한계). " +
			"게이트가 green 인지 red 인지 모른다. WSL native shell 에서 `bun run quality:all` 로 판정하세요. push 는 진행(비차단).",
	);
	process.exit(EXIT_INDETERMINATE);
}

const isSvelteKit = isSvelteKitProject(projectRoot);

type StepVerdict =
	| { kind: "pass"; label: string; ms: number }
	| { kind: "fail"; label: string; ms: number; status: number; tail: string }
	| {
			kind: "indeterminate";
			label: string;
			ms: number;
			detail: string;
			tail: string;
	  };

/**
 * spawnSync 출력은 encoding 설정에 따라 string 이거나 Buffer 다
 * (`spawnSyncWithSvelteKitRetry` 는 generic 이 아닌 `SpawnSyncOptions` 를 받으므로
 * 타입상 둘 다 가능). 어느 쪽이든 utf-8 텍스트로 정규화한다.
 */
function toText(value: unknown): string {
	if (typeof value === "string") return value;
	if (value === null || value === undefined) return "";
	return String(value);
}

/** 자식 출력의 마지막 n 줄 — 진단에 필요한 만큼만. */
function tailOf(stdout: unknown, stderr: unknown, n: number): string {
	return `${toText(stdout)}${toText(stderr)}`
		.split(/\r?\n/)
		.filter((l) => l.trim())
		.slice(-n)
		.join("\n");
}

const verdicts: StepVerdict[] = [];
let remainingMs = budget.ms;

for (const step of steps) {
	const label = step.join(" ");

	if (remainingMs < MIN_BUDGET_MS) {
		verdicts.push({
			kind: "indeterminate",
			label,
			ms: 0,
			detail: `앞 단계가 예산(${(budget.ms / 1000).toFixed(1)}s)을 소진 — 실행조차 하지 않았다`,
			tail: "",
		});
		continue;
	}

	const head = step[0];
	const bin = head === "bun" ? process.execPath : (head ?? "bun");
	const isTypecheck = step.includes("typecheck") || step.includes("check");
	if (isSvelteKit && isTypecheck) {
		// `.svelte-kit/types/` 생성 race 회피 (modfolio-pay / modfolio-press WSL2).
		// sync 도 같은 예산에서 나간다 — 여기서 매달리면 게이트도 못 돈다.
		const syncStarted = Date.now();
		spawnSync(process.execPath, ["x", "svelte-kit", "sync"], {
			stdio: "ignore",
			env: sanitizedEnv,
			shell: process.platform === "win32",
			timeout: Math.min(remainingMs, 60_000),
		});
		remainingMs -= Date.now() - syncStarted;
		if (remainingMs < MIN_BUDGET_MS) {
			verdicts.push({
				kind: "indeterminate",
				label,
				ms: 0,
				detail: "`svelte-kit sync` 가 예산을 소진 — 게이트를 실행하지 못했다",
				tail: "",
			});
			continue;
		}
	}

	const started = Date.now();
	const run = spawnSyncWithSvelteKitRetry(bin, step.slice(1), {
		encoding: "utf-8",
		env: sanitizedEnv,
		shell: process.platform === "win32",
		timeout: remainingMs,
	});
	const elapsed = Date.now() - started;
	remainingMs -= elapsed;

	// 3-way 분류. 순서가 중요하다 — 시간 초과는 `error` 로 오고 `status` 는
	// null 이므로, `status` 부터 보면 다시 "실패"로 뭉개진다.
	const err = run.error;
	const errCode =
		err && "code" in err && typeof err.code === "string" ? err.code : undefined;
	if (errCode === "ETIMEDOUT") {
		verdicts.push({
			kind: "indeterminate",
			label,
			ms: elapsed,
			detail: `예산 ${(budget.ms / 1000).toFixed(1)}s 소진 — 게이트가 판정을 내리기 전에 끊겼다`,
			tail: tailOf(run.stdout, run.stderr, 10),
		});
	} else if (err) {
		verdicts.push({
			kind: "indeterminate",
			label,
			ms: elapsed,
			detail: `게이트를 실행하지 못했다 (${errCode ?? "spawn error"}: ${err.message})`,
			tail: tailOf(run.stdout, run.stderr, 10),
		});
	} else if (run.status === 0) {
		verdicts.push({ kind: "pass", label, ms: elapsed });
	} else if (run.status === 2) {
		// ⚠ 게이트가 **스스로 «판정 불능»** 을 선언했다. 이 저장소 규율에서 exit 2 는
		// "위반이 없다" 도 "위반이 있다" 도 아니라 **"검사가 성립하지 않았다"** 다
		// (`agent-evidence.md` — 판정 불능과 위반은 다른 종료 코드여야 한다).
		//
		// ⚠ 이 branch 가 **없었다**(atelier-and-folio 제보 2026-08-05): 3-way 분류의
		// indeterminate 는 timeout·spawn 실패·시그널로만 채워졌고, exit 2 는 아래
		// `else` 로 떨어져 **fail** 이 됐다. 즉 이 파일 아래쪽 주석이 명시한 우선순위
		// ("판정 불능 > 위반 > green")를 **그 코드를 읽는 유일한 소비자가 다시 뭉개고**
		// 있었다. 의도는 맞고 배선이 한 줄 빠져 있었다.
		//
		// ⚠ 그리고 이건 표현만의 문제가 아니다 — 실측(2026-08-06): `bun run` 과 셸 `&&`
		// 는 **exit 2 를 그대로 전파**한다(`bun run ok && bun run two` → 2). 그래서
		// `quality:all` 안의 어떤 스텝이 2 를 내면 체인도 2 를 내고, 이 branch 가 그것을
		// 받는다. 남는 잔여는 «위반이 먼저 나오면 뒤의 판정 불능이 가려진다» 뿐이다.
		verdicts.push({
			kind: "indeterminate",
			label,
			ms: elapsed,
			detail: `게이트가 판정 불능(exit 2)을 선언했다 — 위반이 없다는 뜻이 아니라 검사가 성립하지 않았다는 뜻이다`,
			tail: tailOf(run.stdout, run.stderr, 15),
		});
	} else if (typeof run.status !== "number") {
		// 시그널로 죽었다(OOM killer, 외부 kill…). 종료 코드가 없다 = 판정이 없다.
		verdicts.push({
			kind: "indeterminate",
			label,
			ms: elapsed,
			detail: `게이트가 종료 코드 없이 죽었다 (signal ${run.signal ?? "unknown"}) — 판정이 나온 적 없다`,
			tail: tailOf(run.stdout, run.stderr, 10),
		});
	} else {
		verdicts.push({
			kind: "fail",
			label,
			ms: elapsed,
			status: run.status,
			tail: tailOf(run.stdout, run.stderr, 15),
		});
	}
}

const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

for (const v of verdicts) {
	if (v.kind === "pass") {
		console.error(`[pre-push-guard] ✓ ${v.label} passed (${secs(v.ms)})`);
		continue;
	}
	if (v.kind === "fail") {
		console.error(
			`[pre-push-guard] ✗ ${v.label} FAILED — 게이트 red (exit ${v.status}, ${secs(v.ms)}). push 는 진행(비차단).\n` +
				`${v.tail}\n` +
				"→ 정공법: fix the root cause before `/release` (release:gate is the hard gate).",
		);
		continue;
	}
	console.error(
		`[pre-push-guard] ⚠ ${v.label} 시간 초과 — **판정 불능** (${secs(v.ms)}).\n` +
			`   ${v.detail}\n` +
			"   실패가 아니다 — 게이트가 red 인지 green 인지 아직 모른다.\n" +
			`   예산 출처: ${budget.source}\n` +
			(v.tail ? `   부분 출력(마지막 10줄):\n${v.tail}\n` : "") +
			BUDGET_ADVICE,
	);
}

const indeterminate = verdicts.filter((v) => v.kind === "indeterminate");
const failed = verdicts.filter((v) => v.kind === "fail");

// 우선순위: 판정 불능 > 위반 > green.
//
// 한 단계라도 판정이 성립하지 않았으면 **전체 판정도 성립하지 않는다** —
// 이때 exit 1(위반)을 내면 기계는 "게이트 red, 측정은 완료"로 읽고 예산 문제를
// 영원히 못 본다. 확인된 위반은 위에서 이미 전문(全文)으로 출력했으므로
// 사람에게는 아무것도 숨기지 않는다.
if (indeterminate.length > 0) {
	console.error(
		`[pre-push-guard] ⚠ 판정 불능 ${indeterminate.length}건${failed.length > 0 ? ` (+ 확인된 red ${failed.length}건)` : ""} — ` +
			"quality 판정이 성립하지 않았다. 통과도 위반도 아니다. push 는 진행(비차단).",
	);
	process.exit(EXIT_INDETERMINATE);
}

if (failed.length > 0) {
	console.error(
		"[pre-push-guard] ✗ quality red — code is being pushed anyway (solo pre-production policy). Address before shipping via /release.",
	);
	process.exit(EXIT_GATE_RED);
}

console.error(
	`[pre-push-guard] ✓ quality green (${verdicts.length} step, 예산 ${budget.source})`,
);
process.exit(EXIT_GREEN);
