export interface WorksApp {
	id: string;
	name: string;
	tagline: string;
	shortDescription: string;
	description: string;
	outcome: string;
	features: { title: string; body: string }[];
	domain: string;
	url: string;
	status: "active" | "landing";
	accentVar: string;
	cardImage: string;
	detailImage: string;
}

export const apps: WorksApp[] = [
	{
		id: "naviaca",
		name: "Naviaca",
		tagline: "학원 운영의 모든 것을 한 곳에서.",
		shortDescription: "학생 관리부터 결제까지, 하나의 흐름",
		description:
			"학생 관리, 수업 편성, 출석, 성적, 결제. 흩어진 업무를 하나의 흐름으로 모읍니다.",
		outcome: "운영에 쓰는 시간을 절반으로 줄입니다.",
		features: [
			{
				title: "학생 관리",
				body: "학생 정보, 반 편성, 출결, 성적을 한 화면에서. 엑셀과 수기 장부에서 벗어납니다.",
			},
			{
				title: "수업 운영",
				body: "시간표, 보강, 대체 수업까지. 복잡한 편성을 시스템이 정리합니다.",
			},
			{
				title: "결제 · 청구",
				body: "수강료 청구부터 수납 확인까지 시스템이 처리합니다. 운영자는 교육에만 집중하세요.",
			},
		],
		domain: "naviaca.com",
		url: "https://app.naviaca.com",
		status: "active",
		accentVar: "var(--color-accent-naviaca)",
		cardImage: "/images/cards/naviaca.svg",
		detailImage: "/images/detail/naviaca.svg",
	},
	{
		id: "gistcore",
		name: "GistCore",
		tagline: "AI와 대화하며 영어가 는다.",
		shortDescription: "OPIc 실전 시나리오 기반 AI 스피킹 연습",
		description:
			"OPIc 실전 시나리오를 AI 튜터와 반복 연습. 발화를 분석하고 즉각 피드백을 돌려줍니다.",
		outcome: "OPIc IM3 이상, 3개월 안에.",
		features: [
			{
				title: "실전 시나리오",
				body: "OPIc 출제 패턴을 기반으로 한 대화 상황. 시험장에서 당황하지 않도록 미리 경험합니다.",
			},
			{
				title: "즉각 피드백",
				body: "발화가 끝나는 즉시 분석합니다. 문법, 발음, 표현을 짚어주고 더 나은 대안을 제시합니다.",
			},
			{
				title: "반복이 실력이 됩니다",
				body: "같은 시나리오를 여러 번, 다른 방식으로. 반복할수록 자연스러운 영어가 입에 붙습니다.",
			},
		],
		domain: "gistcore.com",
		url: "https://app.gistcore.com",
		status: "active",
		accentVar: "var(--color-accent-gistcore)",
		cardImage: "/images/cards/gistcore.svg",
		detailImage: "/images/detail/gistcore.svg",
	},
	{
		id: "fortiscribe",
		name: "Fortiscribe",
		tagline: "작문 실력이 눈에 보인다.",
		shortDescription: "AI 기반 영어/한국어 작문 첨삭",
		description:
			"영어, 한국어 작문을 제출하면 AI가 문법, 구조, 논리를 첨삭. 반복할수록 글이 달라집니다.",
		outcome: "작문 점수를 측정 가능하게 올립니다.",
		features: [
			{
				title: "다각도 첨삭",
				body: "문법만 보지 않습니다. 구조, 논리, 표현까지 글 전체를 읽고 첨삭합니다.",
			},
			{
				title: "반복 훈련",
				body: "같은 주제를 다시 쓰고, 이전 첨삭과 비교합니다. 어디가 나아졌는지 눈에 보입니다.",
			},
			{
				title: "영어, 한국어 모두",
				body: "영어 에세이부터 한국어 논술까지. 언어를 넘어 글쓰기의 근본 체력을 키웁니다.",
			},
		],
		domain: "fortiscribe.com",
		url: "https://app.fortiscribe.com",
		status: "landing",
		accentVar: "var(--color-accent-fortiscribe)",
		cardImage: "/images/cards/fortiscribe.svg",
		detailImage: "/images/detail/fortiscribe.svg",
	},
];
