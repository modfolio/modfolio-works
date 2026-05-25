/**
 * scripts/hooks/stop-session-end.ts
 *
 * SessionEnd hook. Emits a single OTLP log event to the mod-ai-toolkit OTEL
 * collector summarizing the ended session: duration, changed files, any
 * ESCALATE patterns still present. Langfuse picks this up as a session
 * summary record so we can see harness drift across sessions without
 * needing a full trace.
 *
 * Fire-and-forget — failures are logged but never exit non-zero (SessionEnd
 * shouldn't be able to block anything, and the user has already moved on).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readHookInput } from "./_lib.ts";

interface PatternRow {
	pattern: string;
	count: number;
	status: string;
}

const input = await readHookInput();
void input; // not currently needed; shape documented for future hooks

const endpoint =
	process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://otel.mod-ai.localhost";
const toolkitLogPath = process.env.TOOLKIT_LOCAL_LOG_PATH;

function readJsonl(path: string): PatternRow[] {
	if (!existsSync(path)) return [];
	const rows: PatternRow[] = [];
	for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
		if (!line.trim()) continue;
		try {
			const parsed = JSON.parse(line) as Partial<PatternRow>;
			if (typeof parsed.pattern === "string") {
				rows.push({
					pattern: parsed.pattern,
					count: typeof parsed.count === "number" ? parsed.count : 0,
					status:
						typeof parsed.status === "string" ? parsed.status : "TRACKING",
				});
			}
		} catch {
			// skip malformed
		}
	}
	return rows;
}

const cwd = process.cwd();
const patternsPath = join(cwd, "memory", "pattern-history.jsonl");
const patterns = readJsonl(patternsPath);
const escalated = patterns.filter((p) => p.status === "ESCALATE");

const payload = {
	resourceLogs: [
		{
			resource: {
				attributes: [
					{ key: "service.name", value: { stringValue: "modfolio-harness" } },
					{
						key: "repo",
						value: { stringValue: cwd.split(/[\\/]/).pop() ?? "unknown" },
					},
				],
			},
			scopeLogs: [
				{
					scope: { name: "session-end-hook" },
					logRecords: [
						{
							timeUnixNano: `${Date.now() * 1_000_000}`,
							severityText: escalated.length > 0 ? "WARN" : "INFO",
							body: {
								stringValue: `session ended. escalated_patterns=${escalated.length} total_patterns=${patterns.length}`,
							},
							attributes: [
								{ key: "event", value: { stringValue: "session_end" } },
								{
									key: "escalated_patterns",
									value: { intValue: escalated.length },
								},
								{ key: "total_patterns", value: { intValue: patterns.length } },
								{
									key: "escalated_list",
									value: {
										stringValue:
											escalated.map((r) => r.pattern).join(",") || "(none)",
									},
								},
							],
						},
					],
				},
			],
		},
	],
};

async function send(): Promise<void> {
	try {
		const res = await fetch(`${endpoint.replace(/\/$/, "")}/v1/logs`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(2000),
		});
		if (!res.ok) throw new Error(`status ${res.status}`);
	} catch (err) {
		// fallback: write to local log if env var set
		if (toolkitLogPath) {
			try {
				const line = `${new Date().toISOString()} session_end escalated=${escalated.length} ${JSON.stringify(escalated.map((r) => r.pattern))}\n`;
				const fs = await import("node:fs/promises");
				await fs.appendFile(toolkitLogPath, line, "utf-8");
			} catch {
				// silent
			}
		}
		void err;
	}
}

await send();
process.exit(0);
