export interface WorksApp {
	id: string;
	name: string;
	tagline: string;
	description: string;
	domain: string;
	url: string;
	status: "active" | "landing";
	accentVar: string;
}

/**
 * Live reachability state for a sub-app, resolved by `/api/health`.
 *
 * - `up`         — origin answered with a healthy status (2xx/3xx).
 * - `degraded`   — origin answered, but slowly or with a 5xx/429 (reachable, unhealthy).
 * - `down`       — origin could not be reached (network error / timeout / 4xx other than 429).
 * - `coming-soon`— app is not yet launched (`status === "landing"`); never probed.
 */
export type HealthState = "up" | "degraded" | "down" | "coming-soon";

/** One entry in the `/api/health` JSON response. */
export interface HealthResult {
	/** Matches `WorksApp.id`. */
	id: string;
	state: HealthState;
	/** Observed HTTP status, or `null` when the probe never got a response. */
	httpStatus: number | null;
	/** Round-trip latency in milliseconds, or `null` for un-probed (`coming-soon`) apps. */
	ms: number | null;
}

export const apps: WorksApp[] = [
	{
		id: "naviaca",
		name: "Naviaca",
		tagline: "학원 운영의 모든 것을 한 곳에서",
		description:
			"학생 관리, 수업 편성, 출석, 성적, 결제까지 — 학원에 필요한 모든 기능을 하나의 시스템으로.",
		domain: "naviaca.com",
		url: "https://app.naviaca.com",
		status: "active",
		accentVar: "var(--color-accent-naviaca)",
	},
	{
		id: "gistcore",
		name: "GistCore",
		tagline: "AI와 대화하며 영어가 는다",
		description:
			"OPIc 실전 시나리오를 AI 튜터와 반복 연습. 발화 분석과 즉각 피드백으로 스피킹 실력을 끌어올립니다.",
		domain: "gistcore.com",
		url: "https://app.gistcore.com",
		status: "active",
		accentVar: "var(--color-accent-gistcore)",
	},
	{
		id: "fortiscribe",
		name: "Fortiscribe",
		tagline: "작문 실력이 눈에 보인다",
		description:
			"영어, 한국어 작문을 제출하면 AI가 문법, 구조, 논리를 첨삭. 반복 훈련으로 글쓰기 근육을 키웁니다.",
		domain: "fortiscribe.com",
		url: "https://app.fortiscribe.com",
		status: "landing",
		accentVar: "var(--color-accent-fortiscribe)",
	},
];
