/**
 * scripts/hooks/stop-subagent.ts
 *
 * SubagentStop hook. Called when a sub-agent session ends. We log the
 * terminal state so cascading failures become visible — previously a
 * sub-agent crashing was silently swallowed and the parent just saw a
 * truncated response.
 *
 * Fire-and-forget; never exits non-zero.
 */

import { readHookInput } from "./_lib.ts";

const input = await readHookInput();

const endpoint =
	process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://otel.mod-ai.localhost";

const toolName =
	typeof input.tool_name === "string" ? input.tool_name : "Agent";
const response = input.tool_response ?? {};
const success = typeof response === "object" && response !== null;

const payload = {
	resourceLogs: [
		{
			resource: {
				attributes: [
					{ key: "service.name", value: { stringValue: "modfolio-harness" } },
				],
			},
			scopeLogs: [
				{
					scope: { name: "subagent-stop-hook" },
					logRecords: [
						{
							timeUnixNano: `${Date.now() * 1_000_000}`,
							severityText: success ? "INFO" : "WARN",
							body: {
								stringValue: `subagent stopped (tool=${toolName})`,
							},
							attributes: [
								{ key: "event", value: { stringValue: "subagent_stop" } },
								{ key: "tool_name", value: { stringValue: toolName } },
							],
						},
					],
				},
			],
		},
	],
};

try {
	await fetch(`${endpoint.replace(/\/$/, "")}/v1/logs`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(2000),
	});
} catch {
	// silent — SubagentStop must never block
}

process.exit(0);
