#!/usr/bin/env bun
/**
 * scripts/hooks/stop-feedback-send.ts
 *
 * Stop hook (opt-in) — 세션 종료 시 의미있는 변경이 있으면 `feedback-send` 자동 실행.
 *
 * 트리거 진화 루프의 **inflow**: sibling 작업 종료 → (이 hook) → ecosystem `feedback/<repo>/`
 * → ecosystem 다음 session 의 Evolution Pulse 가 표면화. **cron 아닌 session-end stage trigger**
 * (ecosystem 측 `session-start-evolve-pulse.ts` 의 sibling 자매).
 *
 * 안전 (velocity/Hub-not-enforcer 정합):
 *   - **opt-in 전용** — `harness-lock.json {autoFeedbackSend:true}` 일 때만 wiring(settings-adapt)
 *     + 본 hook 이 재확인(방어). 기본 OFF.
 *   - ecosystem 자체에서는 self-skip. ecosystem host-sibling 없으면 graceful skip.
 *   - 마지막 send 이후 새 commit 있을 때만(불필요 실행 방지). fire-and-forget·**항상 exit 0**(차단 없음).
 *   - feedback-send 는 ecosystem `feedback/` 에만 쓴다 — sibling 코드 안 건드림.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { findEcosystemRoot, gitRoot } from "./_lib.ts";

try {
	const cwd = gitRoot();
	const repo = basename(cwd);
	// ecosystem 자체에서는 안 함 (current + legacy 이름).
	if (repo === "modfolio-ecosystem" || repo === "modfolio-universe")
		process.exit(0);

	// opt-in 재확인 — wiring 이 게이트하지만 방어적 재확인.
	let optIn = false;
	try {
		const lock = JSON.parse(
			readFileSync(join(cwd, ".claude", "harness-lock.json"), "utf-8"),
		) as {
			autoFeedbackSend?: boolean;
		};
		optIn = lock.autoFeedbackSend === true;
	} catch {
		optIn = false;
	}
	if (!optIn) process.exit(0);

	// feedback-send 는 ecosystem host-sibling 의 feedback/ 에 쓴다 — 없으면 skip.
	const ecoRoot = findEcosystemRoot(cwd);
	if (!ecoRoot) process.exit(0);

	// 의미있는 변경? 마지막 send 이후 새 commit 있을 때만.
	const lastSendPath = join(cwd, ".claude", "last-feedback-send");
	const lastSendMs = existsSync(lastSendPath)
		? statSync(lastSendPath).mtimeMs
		: 0;
	let lastCommitMs = 0;
	try {
		lastCommitMs =
			Number(
				execSync("git log -1 --format=%ct", { cwd, encoding: "utf-8" }).trim(),
			) * 1000;
	} catch {
		lastCommitMs = 0;
	}
	if (lastCommitMs <= lastSendMs) process.exit(0); // 새 작업 없음 — skip.

	// feedback-send 실행 (ecosystem 스크립트, 현재 repo 대상). fire-and-forget.
	execSync(
		`bun ${JSON.stringify(join(ecoRoot, "scripts", "feedback-send.ts"))}`,
		{
			cwd,
			stdio: "ignore",
			timeout: 30000,
		},
	);
} catch {
	// 절대 차단 안 함 — 실패해도 조용히 exit 0.
}
process.exit(0);
