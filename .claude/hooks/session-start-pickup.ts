#!/usr/bin/env bun
/**
 * scripts/hooks/session-start-pickup.ts
 *
 * SessionStart hook — drift 안내 (기본) + opt-in 자동 self-heal.
 *
 * 동작:
 *   1. `@modfolio/harness` devDep 보유 repo 만 작동 (ecosystem self + sibling).
 *   2. `feedback/<repo>/inbox/*.md` 최근 entries 출력.
 *   3. sibling 이 ecosystem.harnessLatest 보다 뒤쳐졌으면:
 *        - 기본 = **advisory only** (수동 동기화 명령 1줄 안내). 자동 mutation 없음.
 *        - `harness-lock.json {autoPull:true}` 로 **명시 opt-in** 한 프로젝트만
 *          `bun update` + `modfolio-harness-pull --apply` + 자동 commit (self-heal).
 *          단 working tree clean + origin behind 아님 일 때만.
 *
 * 철학 (v3.2, 2026-06-18 — 기본 advisory 로 전환):
 *   - 최신 하네스 = universe 의 유일 canonical 상태. 구버전 = "아직 안 연
 *     프로젝트" 의 transient 이지 의도된 per-app pin 아님 (drift 프레이밍 불변).
 *   - 그러나 "session 열기 = 자동 pull+commit" (구 default-ON) 은 (1) on-demand
 *     수동 pull 모델과 충돌하고 (2) stale base 위 자동 commit 이 divergent 로컬
 *     히스토리를 만들며 (3) 구버전 --apply 가 멤버 소유 파일을 덮어쓸 수 있어
 *     실운영에서 문제를 냈다 (athsra 2026-06-18: ahead1/behind48 → reset, CHANGELOG
 *     blank). → 기본은 안내만, 자동은 명시 opt-in.
 *   - Hub-not-enforcer 보존: ecosystem 은 push 하지 않는다. pull/commit 주체는
 *     끝까지 sibling 자신. opt-in = harness-lock.json {autoPull:true}.
 *   - 절대 throw / push / blocking 안 함. 항상 exit 0, 실패는 advisory 로 degrade.
 *
 * canon `evergreen-principle.md` §v2.5, `harness-adoption-guide.md` 정합.
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
	bunExec,
	findEcosystemRoot,
	gitRoot,
	readHookInput,
	recordHookDuration,
} from "./_lib.ts";

interface PackageJson {
	name?: string;
	version?: string;
	devDependencies?: Record<string, string>;
	dependencies?: Record<string, string>;
}

function readPkg(path: string): PackageJson | undefined {
	try {
		return JSON.parse(readFileSync(path, "utf-8")) as PackageJson;
	} catch {
		return undefined;
	}
}

function cleanSemver(range: string | undefined): string | undefined {
	if (!range) return undefined;
	const m = /^[\^~>=<]*\s*([0-9]+(?:\.[0-9]+){0,2})/.exec(range.trim());
	return m?.[1];
}

function compareSemver(a: string, b: string): number {
	const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
	const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const da = pa[i] ?? 0;
		const db = pb[i] ?? 0;
		if (da !== db) return da < db ? -1 : 1;
	}
	return 0;
}

function recentInboxMessages(repoRoot: string, ownRepoName: string): string[] {
	// ecosystem 측 inbox path
	const ownInbox = join(repoRoot, "feedback", ownRepoName, "inbox");
	// ecosystem repo 자체의 경우는 inbox 안 봄 (sibling 측 path 만 의미)
	const sibInbox = join(repoRoot, "feedback-incoming"); // sibling-side mirror 후보 (향후)
	const candidates = [ownInbox, sibInbox];
	const messages: string[] = [];
	for (const dir of candidates) {
		if (!existsSync(dir)) continue;
		let entries: string[] = [];
		try {
			entries = readdirSync(dir);
		} catch {
			continue;
		}
		const md = entries.filter((f) => f.endsWith(".md"));
		md.sort();
		// 최근 3 entries
		for (const f of md.slice(-3)) {
			const full = join(dir, f);
			try {
				const stat = statSync(full);
				const daysAgo = Math.floor(
					(Date.now() - stat.mtimeMs) / (24 * 3600 * 1000),
				);
				if (daysAgo > 30) continue; // 30일 이상 오래된 메시지 skip
				messages.push(`  📬 inbox: ${f} (${daysAgo}d ago)`);
			} catch {
				// skip
			}
		}
	}
	return messages;
}

/** WSL: /mnt/c PATH 항목 제거 — Windows bun shim → cmd.exe 회귀 방지. */
function sanitizedEnv(): NodeJS.ProcessEnv {
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

interface HarnessLock {
	enableSessionPickup?: boolean;
	autoPull?: boolean;
}

function readHarnessLock(root: string): HarnessLock {
	try {
		return JSON.parse(
			readFileSync(join(root, ".claude", "harness-lock.json"), "utf-8"),
		);
	} catch {
		return {};
	}
}

function isWorkingTreeClean(root: string): boolean {
	try {
		const out = execSync("git status --porcelain", {
			cwd: root,
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		});
		return out.trim().length === 0;
	} catch {
		// git 없거나 repo 아님 — 자동 mutation 안전하지 않음 → clean 아님 취급
		return false;
	}
}

/**
 * 로컬이 upstream(origin) 보다 behind 인지 best-effort 로 판정.
 *
 * 자동 commit 은 stale base 위에서 일어나면 divergent 히스토리를 만든다
 * (athsra 2026-06-18: 로컬 ahead1/behind48 → `git reset --hard` 로 수습). 따라서
 * opt-in 자동 self-heal 경로에서 commit 직전에 behind 면 보류한다.
 *
 * - read-only `git fetch` (CLAUDE.md 상 항상 허용) 로 remote 상태 갱신 후 behind count.
 * - upstream 미설정 / fetch 실패(offline) → false (divergence 위험 없음 또는 판정
 *   불가). opt-in 경로이므로 진행 허용 — 잔여 위험은 offline+미pull 인 좁은 경우뿐.
 */
function isBehindUpstream(root: string): boolean {
	try {
		// best-effort: remote 갱신 (실패해도 아래 rev-list 는 last-known 기준으로 시도)
		spawnSync("git", ["fetch", "--quiet"], {
			cwd: root,
			timeout: 15_000,
			stdio: "ignore",
			shell: process.platform === "win32",
		});
		const behind = execSync("git rev-list --count HEAD..@{u}", {
			cwd: root,
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		return (Number.parseInt(behind, 10) || 0) > 0;
	} catch {
		// @{u} 미설정 (upstream 없음) 또는 git 실패 → divergence 위험 판정 불가, 진행 허용
		return false;
	}
}

/**
 * SessionStart drift pickup. ecosystem 은 아무것도 push 하지 않는다 — sibling 이
 * 자기 session start 에서 스스로 본다 (Hub-not-enforcer 보존).
 *
 * 기본 = **advisory only** (수동 동기화 명령 안내). 자동 pull+commit 은 명시
 * opt-in (`harness-lock.json {autoPull:true}`) 한 프로젝트만. 근거 = 파일 상단
 * 철학 주석 (session-open 자동 mutation 의 3 문제, athsra 2026-06-18).
 *
 * opt-in 자동 self-heal 경로 안전 규칙 (정공법):
 *   - working tree clean 일 때만 `--apply` + commit. dirty → advisory (WIP 보호).
 *   - origin 보다 behind 면 보류 → advisory (stale-base commit divergence 차단).
 *   - 절대 throw 안 함 / push 안 함 / blocking 안 함. 모든 실패는 advisory 로 degrade.
 */
export function harnessDriftPickup(
	root: string,
	installed: string,
	latest: string,
): string[] {
	const lock = readHarnessLock(root);
	const manual = `bun update @modfolio/harness @modfolio/contracts && bun run harness-pull -- --apply`;
	const advisory = [
		`  📦 harness ${installed} → ${latest} (최신) — drift 는 "이 release 이후 아직 안 연 프로젝트" 의 transient`,
		`     수동 동기화 (commit clean 상태에서 권장): ${manual}`,
		`     자동 동기화를 원하면 .claude/harness-lock.json 에 { "autoPull": true }`,
	];
	// 기본 advisory. 자동 pull+commit 은 명시 opt-in (autoPull:true) 한 프로젝트만.
	// (구 default-ON auto 는 athsra 2026-06-18 divergence/clobber 로 폐기 — 상단 주석)
	if (lock.autoPull !== true) {
		return advisory;
	}
	// --- 여기부터 opt-in 자동 self-heal 경로 (autoPull:true) ---
	if (!isWorkingTreeClean(root)) {
		return advisory; // dirty: WIP 보호 — 자동 mutation 안 함
	}
	if (isBehindUpstream(root)) {
		// origin 에 미pull 커밋 존재 → 자동 commit 시 divergent. 먼저 사용자 pull 유도.
		return [
			`  📦 harness ${installed} → ${latest} — 로컬이 origin 보다 behind. 자동 pull 보류 (divergence 방지)`,
			`     먼저 git pull 후: ${manual}`,
		];
	}
	try {
		const env = sanitizedEnv();
		// 1. npm dep 를 실제로 상향 — caret 만으로는 lockfile 이 구버전에 고착돼 pull 이
		//    구 binary/assets 로 돌아간다 (Codex 점검: sibling 들이 3.2~3.5 에 멈춰 있음).
		//    @modfolio/contracts 미보유 sibling 은 no-op (bun update 는 기존 dep 만 갱신).
		const upd = spawnSync(
			bunExec(),
			["update", "@modfolio/harness", "@modfolio/contracts"],
			{
				cwd: root,
				encoding: "utf-8",
				timeout: 180_000,
				shell: process.platform === "win32",
				env,
			},
		);
		// bun update 실패(보통 GITHUB_TOKEN 부재) → advisory degrade. 구 binary pull 은 무의미.
		if (upd.status !== 0) return advisory;
		// 2. 갱신된 binary 로 pull.
		// `bunx foo` == `bun x foo` — routed through bunExec() so the child uses the
		// same bun as this hook rather than whatever $PATH resolves.
		const pull = spawnSync(
			bunExec(),
			["x", "modfolio-harness-pull", "--apply"],
			{
				cwd: root,
				encoding: "utf-8",
				timeout: 120_000,
				shell: process.platform === "win32",
				env,
			},
		);
		if (pull.status !== 0) return advisory;
		// tree 가 시작 시 clean 이었으므로 이후 변경(package.json/lockfile + pull 산출물)은
		// 전부 self-heal 결과 → 안전 commit (revert 가능 기록).
		if (isWorkingTreeClean(root)) {
			return [
				`  📦 harness ${installed} → ${latest}: dep 갱신·변경 없음 (이미 정합)`,
			];
		}
		execSync("git add -A", { cwd: root, stdio: "ignore" });
		execSync(
			`git commit -m "chore(harness): bun update + auto-pull ${latest} (autoPull opt-in)"`,
			{
				cwd: root,
				stdio: "ignore",
				env,
			},
		);
		const sha = execSync("git rev-parse --short HEAD", {
			cwd: root,
			encoding: "utf-8",
		}).trim();
		return [
			`  📦 harness auto-pull ${installed} → ${latest} (commit ${sha}, autoPull opt-in) — git push 는 사용자 재량`,
		];
	} catch {
		return advisory; // 어떤 실패도 advisory 로 degrade — 세션은 계속
	}
}

async function main(): Promise<void> {
	const start = performance.now();
	await readHookInput(); // payload 소비 (Claude Code hook protocol)

	const cwd = process.cwd();
	const root = gitRoot();
	const pkg = readPkg(join(root, "package.json"));

	// non-modfolio repo: silent exit
	if (!pkg) {
		process.exit(0);
	}

	const isEcosystem = pkg.name === "@modfolio/harness";
	const harnessDep =
		pkg.devDependencies?.["@modfolio/harness"] ??
		pkg.dependencies?.["@modfolio/harness"];

	if (!isEcosystem && !harnessDep) {
		// modfolio 외부 repo — silent exit
		process.exit(0);
	}

	const lines: string[] = [];

	if (isEcosystem) {
		// ecosystem self: harness publish 격차 자가 점검
		try {
			const eco = JSON.parse(
				readFileSync(join(root, "ecosystem.json"), "utf-8"),
			) as {
				harnessLatest?: string;
			};
			if (
				eco.harnessLatest &&
				pkg.version &&
				pkg.version !== eco.harnessLatest
			) {
				lines.push(
					`  ⚠ ecosystem self: package.json.version=${pkg.version} ≠ harnessLatest=${eco.harnessLatest}`,
				);
				lines.push(`     → harness-publish 직전 정합 필요`);
			}
		} catch {
			// skip
		}
	} else {
		// sibling: harness 격차 확인
		const ecoRoot = findEcosystemRoot(cwd);
		if (ecoRoot) {
			try {
				const eco = JSON.parse(
					readFileSync(join(ecoRoot, "ecosystem.json"), "utf-8"),
				) as {
					harnessLatest?: string;
				};
				const installed = cleanSemver(harnessDep);
				if (installed && eco.harnessLatest) {
					if (compareSemver(installed, eco.harnessLatest) < 0) {
						// drift 안내 (기본 advisory) — 자동 self-heal 은 autoPull:true opt-in 만.
						lines.push(
							...harnessDriftPickup(gitRoot(), installed, eco.harnessLatest),
						);
					}
				}
			} catch {
				// skip — host-sibling 없거나 ecosystem.json 못 읽음
			}
		}
		// inbox 메시지
		const repoName = pkg.name?.replace(/^@[^/]+\//, "") ?? "";
		if (repoName && ecoRoot) {
			const msgs = recentInboxMessages(ecoRoot, repoName);
			lines.push(...msgs);
		}
	}

	if (lines.length > 0) {
		console.log("");
		console.log("═══ modfolio session pickup ═══");
		for (const l of lines) console.log(l);
		console.log("");
	}

	const duration = performance.now() - start;
	await recordHookDuration("session-start-pickup", duration);
	process.exit(0);
}

// import.meta.main 가드 — 테스트가 `harnessDriftPickup` 를 import 할 때 main() 의
// hook 파이프라인이 부작용으로 실행되지 않도록 (repo 컨벤션: harness-pull.ts 등 동일).
if (import.meta.main) {
	await main();
}
