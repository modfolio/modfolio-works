/**
 * scripts/hooks/pre-gha-workflow-notice.ts
 *
 * PreToolUse(Edit|Write) hook. Non-blocking NOTICE when a .github/workflows/*
 * file is created/edited. GitHub Actions is banned (gh-actions-policy.md v2.0)
 * because Actions minutes cost money — CI/cron/deploy run on CF Workers Builds +
 * CF Cron Triggers + NAS Forgejo Actions ($0). Warn at write-time (exit 0); the
 * actual paid-minute spend happens later on GitHub's side (a dev hook can't see
 * it), so delta-audit (POLICY_GHA_WORKFLOW_PRESENT) and /release stay the backstop.
 */

import { editedFiles, readHookInput } from "./_lib.ts";

const input = await readHookInput();
const files = editedFiles(input);

if (files.some((f) => /\.github\/workflows\/.+\.ya?ml$/i.test(f))) {
	console.error(
		[
			"NOTICE (pre-gha-workflow-notice): editing a .github/workflows/* file.",
			"GitHub Actions is banned (gh-actions-policy.md v2.0) — Actions minutes cost money.",
			"Use CF Workers Builds (deploy) · CF Cron Triggers (cron) · NAS Forgejo Actions (CI), all $0.",
			"See: knowledge/canon/cf-deploy.md, cf-workers-builds-api.md, gh-actions-policy.md.",
		].join("\n"),
	);
}

process.exit(0);
