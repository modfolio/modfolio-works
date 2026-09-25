/**
 * scripts/hooks/post-biome-check.ts
 *
 * PostToolUse Edit|Write hook — **편집한 파일만** biome 으로 보고, 위반이 있을 때만 모델에게 전한다.
 * Records hook duration to OTLP collector (silent when offline).
 *
 * ## 3.93.0 (2026-09-23 · atelier-and-folio 편지) — 두 결함을 같이 고쳤다
 *
 * ① 편집 1회마다 `bun run check`(= 멤버에선 대개 `biome check .` 저장소 전체)를 돌렸다 — anf 실측 2.1~2.9초,
 *   편집한 파일만이면 89ms. 저장소 전체 lint 는 게이트(`gate:quick`)의 몫이다.
 * ② 기본 경로가 exit 0 + 평문 stdout 이었다 — PostToolUse 의 exit 0 stdout 은 트랜스크립트 모드에서 사람에게만
 *   보이고 **모델에게 안 간다.** 편집마다 비용을 내고 결과는 아무도 못 봤다. 이제 위반이 있으면
 *   `hookSpecificOutput.additionalContext` 로 모델에게 짧게(최대 5건 · 1,500자) 전하고, 없으면 조용하다.
 *   옛 opt-in(`BIOME_CHECK_AUGMENT=1` · updatedToolOutput)은 이 기본 동작에 흡수됐다 — 그 값은 더 읽지 않는다.
 *
 * 건너뛰는 것(«미검사» — 게이트가 덮는다): `check` 스크립트가 biome 이 아닌 repo · 로컬 biome 바이너리가 없는 repo
 * (`bun x` 로 레지스트리에서 받지 않는다) · 이 repo 밖의 파일 · biome 이 다루지 않는 확장자 · biome 이 시간 초과로 죽은 경우.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { editedFiles, readHookInput, recordHookDuration } from "./_lib.ts";

/** biome 이 다루는 확장자 — 그 밖은 조용히 건너뛴다. */
export const BIOME_EXT = /\.(?:[cm]?[jt]sx?|json|jsonc|css|graphql|gql)$/i;

/** 파일을 고치는 플래그 — 편집 직후 훅이 몰래 파일을 바꾸지 않는다(판정만 한다). */
const MUTATING = /^--(write|fix|apply|apply-unsafe|unsafe|staged|changed)\b/;

/**
 * 훅이 직접 정하는 옵션 — 스크립트에서 옮겨 오지 않는다. biome 은 같은 옵션이 두 번 오면 파일명 없는 CLI 오류로 거부하고
 * (2.5.13 실측: `argument --no-errors-on-unmatched cannot be used multiple times`) 그 오류는 위반이 아니라서 훅이 조용히 꺼진다(리뷰 dA P2).
 */
const HOOK_OWNED = /^--(max-diagnostics(=.*)?|no-errors-on-unmatched)$/;

/**
 * `check` 스크립트의 biome 호출 — 하위 명령(`check`·`lint`·`ci`)과 플래그를 그대로 쓴다(`ci --error-on-warnings` ·
 * `--config-path` 가 게이트와 같은 판정을 내게 · 3.93.0 후보 리뷰 P3). 경로 인자와 파일을 고치는 플래그는 뺀다.
 * biome 이 아니면 null — 파일 단위로 좁힐 방법을 모른다(저장소 전체를 다시 돌지 않는다).
 */
export function biomeInvocation(
	script: string | undefined,
): { sub: string; flags: string[] } | null {
	if (typeof script !== "string") return null;
	const m = /(?:^|[\s;&|(])biome\s+(check|lint|ci)\b(.*)$/.exec(script);
	if (!m) return null;
	const flags: string[] = [];
	const tokens = (m[2] ?? "").trim().split(/\s+/).filter(Boolean);
	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i] ?? "";
		if (/^(&&|\|\||;|\||\))/.test(t)) break;
		if (!t.startsWith("-")) continue; // 경로 인자(`.`·`src`) — 편집한 파일로 바꾼다
		if (MUTATING.test(t)) continue;
		if (HOOK_OWNED.test(t)) {
			if (t === "--max-diagnostics") i++; // 값이 다음 단어인 형태
			continue;
		}
		flags.push(t);
		if (
			/^--(config-path|max-diagnostics|reporter|diagnostic-level|vcs-root)$/.test(
				t,
			) &&
			tokens[i + 1]
		) {
			flags.push(tokens[i + 1] ?? "");
			i++;
		}
	}
	return { sub: m[1] ?? "check", flags };
}

/** `check` 가 biome 인가. */
export function checkIsBiome(script: string | undefined): boolean {
	return biomeInvocation(script) !== null;
}

/** 이 repo 안의 파일이고 biome 이 다루는 확장자면 repo 상대 경로, 아니면 null. `..cache/a.ts` 같은 이름은 안이다. */
export function targetFile(root: string, filePath: string): string | null {
	const abs = isAbsolute(filePath) ? filePath : resolve(root, filePath);
	const rel = relative(root, abs);
	if (
		rel === "" ||
		rel === ".." ||
		rel.startsWith("../") ||
		rel.startsWith("..\\") ||
		isAbsolute(rel)
	)
		return null;
	return BIOME_EXT.test(rel) ? rel : null;
}

/** biome 런처(JS) — cwd 에서 git 최상위까지 올라가며 찾는다(워크스페이스 하위 폴더의 호이스팅 · 리뷰 P3). */
export function findBiomeLauncher(cwd: string, top: string): string | null {
	let dir = resolve(cwd);
	const stop = resolve(top);
	for (;;) {
		const p = join(dir, "node_modules", "@biomejs", "biome", "bin", "biome");
		if (existsSync(p)) return p;
		if (dir === stop) return null;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

/** 모델에게 갈 한 덩어리 — 길면 자른다(한 번 들어온 출력은 매 턴 다시 읽힌다 · `context-residency.md`). */
export function feedback(
	files: readonly string[],
	output: string,
	limit = 1500,
): string {
	const body = output.trim();
	const clipped =
		body.length > limit
			? `${body.slice(0, limit)}\n… (잘림 — 전체는 \`bun run check\`)`
			: body;
	return `[post-biome-check] ${files.join(" ")} — biome 위반:\n${clipped}`;
}

/**
 * 모델에게 전할 것인가 — 위반이면 biome 진단이 **편집한 파일을 가리킨다.** 실행 실패(런처·설정 오류)는 파일을 말하지 않으므로
 * 위반으로 보내지 않는다(리뷰 P3 — 오류문이 매 편집 «위반» 으로 주입되던 경로).
 */
export function isViolation(
	status: number | null,
	output: string,
	files: readonly string[],
): boolean {
	return (
		typeof status === "number" &&
		status !== 0 &&
		files.some((f) => output.includes(f))
	);
}

function readCheckScript(dir: string): string | undefined {
	try {
		return (
			JSON.parse(readFileSync(join(dir, "package.json"), "utf-8")) as {
				scripts?: Record<string, string>;
			}
		).scripts?.check;
	} catch {
		return undefined;
	}
}

// CLI 동작 불변 — `bun run <file>` 은 `import.meta.main` 이 참이다.
// 가드가 없으면 이 모듈을 **import 하는 테스트가 프로세스째 종료**된다
// (2026-08-25 실측: `payment-ledger-clean` 을 import 하자 훅 스위트 15개가 돌았다).
if (import.meta.main) {
	const start = performance.now();
	const cwd = process.cwd();
	const topRun = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		cwd,
		encoding: "utf8",
	});
	const top = topRun.status === 0 ? (topRun.stdout ?? "").trim() || cwd : cwd;
	const invocation = biomeInvocation(
		readCheckScript(cwd) ?? readCheckScript(top),
	);
	const launcher = findBiomeLauncher(cwd, top);
	if (invocation === null || launcher === null) process.exit(0);

	const files = editedFiles(await readHookInput())
		.map((f) => targetFile(cwd, f))
		.filter((f): f is string => f !== null);
	if (files.length === 0) process.exit(0);

	// 셸 없이 런처를 bun 으로 직접 — Windows 의 cmd 인용·`&` 해석과 `#!/usr/bin/env node` 의존이 없다(리뷰 P2·P3).
	// 파일은 `./` 를 붙여 `-` 로 시작하는 이름이 옵션으로 읽히지 않게 한다.
	const r = spawnSync(
		process.execPath,
		[
			launcher,
			invocation.sub,
			...invocation.flags,
			"--max-diagnostics=5",
			"--no-errors-on-unmatched",
			...files.map((f) => `./${f}`),
		],
		{ cwd, encoding: "utf-8", timeout: 20_000 },
	);
	const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
	if (isViolation(r.status, output, files)) {
		process.stdout.write(
			JSON.stringify({
				hookSpecificOutput: {
					hookEventName: "PostToolUse",
					additionalContext: feedback(files, output),
				},
			}),
		);
	}

	await recordHookDuration("post-biome-check", performance.now() - start);
	process.exit(0);
}
