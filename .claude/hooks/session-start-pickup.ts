#!/usr/bin/env bun
/**
 * scripts/hooks/session-start-pickup.ts
 *
 * SessionStart hook — "프로젝트 열기 = 최신 하네스".
 *
 * 동작:
 *   1. `@modfolio/harness` devDep 보유 repo 만 작동 (ecosystem self + sibling).
 *   2. `feedback/<repo>/inbox/*.md` 최근 entries 출력.
 *   3. sibling 이 ecosystem.harnessLatest 보다 뒤쳐졌으면:
 *        - working tree clean + lock 미차단 → `modfolio-harness-pull --apply`
 *          자동 실행 + 자동 commit + 1줄 요약 (drift self-heal).
 *        - dirty 또는 `harness-lock.json {autoPull:false}` → advisory only.
 *
 * 철학 (v3.1, 2026-05-18):
 *   - 최신 하네스 = universe 의 유일 canonical 상태. 구버전 = "아직 안 연
 *     프로젝트" 의 transient 이지 의도된 per-app pin 아님.
 *   - Hub-not-enforcer 보존: ecosystem 은 push 하지 않는다. sibling 이
 *     자기 session start 에서 스스로 pull 한다. opt-out = harness-lock.json.
 *   - 절대 throw / push / blocking 안 함. 항상 exit 0.
 *
 * canon `evergreen-principle.md` §v2.3, `harness-adoption-guide.md` 정합.
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
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
 * "프로젝트 열기 = 최신" 의 실제 구현. ecosystem 은 아무것도 push 하지 않는다 —
 * sibling 이 자기 session start 에서 스스로 pull 한다 (Hub-not-enforcer 보존).
 *
 * 안전 규칙 (정공법):
 *   - working tree clean 일 때만 자동 `--apply` + 자동 commit (revert 가능 기록).
 *     dirty 면 WIP 와 엉키지 않게 advisory 만.
 *   - `.claude/harness-lock.json` { autoPull:false } → advisory only (opt-out).
 *   - 절대 throw 안 함 / push 안 함 / blocking 안 함. SessionStart 는 항상 exit 0.
 */
function harnessAutoPull(
	root: string,
	installed: string,
	latest: string,
): string[] {
	const lock = readHarnessLock(root);
	const advisory = [
		`  📦 harness ${installed} → ${latest} (최신) — drift 는 "아직 안 연 프로젝트" 의 transient 상태`,
		`     → bun run harness-pull -- --apply (commit 후 실행 권장)`,
	];
	if (lock.autoPull === false) {
		return [
			`  📦 harness ${installed} → ${latest} (최신) — autoPull:false (lock) → 수동`,
			`     → bun run harness-pull -- --apply`,
		];
	}
	if (!isWorkingTreeClean(root)) {
		return advisory; // dirty: WIP 보호 — 자동 mutation 안 함
	}
	try {
		const env = sanitizedEnv();
		const pull = spawnSync("bunx", ["modfolio-harness-pull", "--apply"], {
			cwd: root,
			encoding: "utf-8",
			timeout: 120_000,
			shell: process.platform === "win32",
			env,
		});
		if (pull.status !== 0) return advisory;
		// tree 가 pull 전 clean 이었으므로 이후 변경은 전부 pull 산출물 → 안전 commit.
		if (isWorkingTreeClean(root)) {
			return [`  📦 harness ${installed} → ${latest}: 변경 없음 (이미 정합)`];
		}
		execSync("git add -A", { cwd: root, stdio: "ignore" });
		execSync(
			`git commit -m "chore(harness): auto-pull ${latest} on session open"`,
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
			`  📦 harness auto-pulled ${installed} → ${latest} (commit ${sha}) — git push 는 사용자 재량`,
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
						// "열면 = 최신": sibling 이 스스로 pull (ecosystem push X).
						lines.push(
							...harnessAutoPull(gitRoot(), installed, eco.harnessLatest),
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

await main();
