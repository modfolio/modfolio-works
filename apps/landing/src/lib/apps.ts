export interface WorksApp {
	id: string;
	name: string;
	tagline: string;
	description: string;
	outcome: string;
	domain: string;
	url: string;
	status: "active" | "landing";
	accentVar: string;
}

export const apps: WorksApp[] = [
	{
		id: "naviaca",
		name: "Naviaca",
		tagline: "학원 운영의 모든 것을 한 곳에서",
		description:
			"학생 관리, 수업 편성, 출석, 성적, 결제까지 — 학원에 필요한 모든 기능을 하나의 시스템으로.",
		outcome: "학원 운영 시간을 절반으로 줄입니다",
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
		outcome: "OPIc IM3 이상을 3개월 안에 달성합니다",
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
		outcome: "작문 점수를 눈에 보이게 올립니다",
		domain: "fortiscribe.com",
		url: "https://app.fortiscribe.com",
		status: "landing",
		accentVar: "var(--color-accent-fortiscribe)",
	},
];
