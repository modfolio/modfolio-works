/**
 * scripts/hooks/stop-feedback-log.ts
 *
 * Stop hook. Writes a terse session log into the modfolio-ecosystem feedback tree
 * so aggregation and retro scripts see what happened. Deterministic — no agent.
 *
 * Output: <ecosystem>/feedback/<repo>/logs/<YYYY>/<MM>/<YYYY-MM-DD>_<sessionId>.log
 * The nested date directories keep feedback/<repo>/ from accumulating hundreds
 * of flat log files (modfolio-pay IMPROVEMENT-5, gistcore Issue 12).
 */

import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { findEcosystemRoot, gitRoot } from "./_lib.ts";

const cwd = gitRoot();
const repo = basename(cwd);
// Self-skip: don't log when running inside the ecosystem repo itself.
// Match both current (`modfolio-ecosystem`) and legacy (`modfolio-universe`) names.
if (repo === "modfolio-ecosystem" || repo === "modfolio-universe")
	process.exit(0);

const ecosystemRoot = findEcosystemRoot(cwd);
if (!ecosystemRoot) process.exit(0);

const now = new Date();
const yyyy = String(now.getFullYear());
const mm = String(now.getMonth() + 1).padStart(2, "0");
const dd = String(now.getDate()).padStart(2, "0");
const date = `${yyyy}-${mm}-${dd}`;

const logDir = join(ecosystemRoot, "feedback", repo, "logs", yyyy, mm);
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

const sessionId = randomBytes(4).toString("hex");
const logFile = join(logDir, `${date}_${sessionId}.log`);

function safeExec(cmd: string): string {
	try {
		return execSync(cmd, {
			cwd,
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		});
	} catch {
		return "";
	}
}

const stat = safeExec("git diff --stat").trim() || "no changes";
const names = safeExec("git diff --name-only").trim();
const fileList = names ? names.split(/\r?\n/) : [];

const uiCount = fileList.filter((f) =>
	/\.(svelte|tsx|jsx|astro|vue|css)$/i.test(f),
).length;
const apiCount = fileList.filter((f) =>
	/(routes|api|server).*\.ts$/i.test(f),
).length;
const schemaCount = fileList.filter((f) => /schema/i.test(f)).length;

const body = [
	`# ${date} session ${sessionId}`,
	"",
	"## Changed Files",
	stat,
	"",
	"## Categories",
	`UI: ${uiCount} | API: ${apiCount} | Schema: ${schemaCount}`,
	"",
].join("\n");

writeFileSync(logFile, body, "utf-8");
process.exit(0);
