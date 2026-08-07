#!/usr/bin/env bun
/**
 * scripts/hooks/pre-irreversible-guard.ts
 *
 * PreToolUse(Bash) hook. **무인 모드에서만** 되돌릴 수 없는 작업을 차단한다.
 * Exit 2 = block, 0 = allow. 배석 중(interactive)에는 **아무것도 막지 않는다.**
 *
 * ## 왜 있나 — 원칙이 산문으로만 존재했다
 *
 * 오너 원칙(voice 후보 B2-2): *"npm 게시·프로덕션 마이그레이션·시크릿 로테이션처럼
 * **되돌릴 수 없는** 작업은 무인 모드에서 착수하지 않는다. 배석 중에 확인받고 한다.
 * 미룬 동안 산출물은 계속 쌓아 둔다."* 근거는 *"무인의 «묻지 않는다» 는 판단을 위임받은
 * 것이지 되돌릴 수 없는 것까지 위임받은 것이 아니다"* 이고, 되돌릴 수 있는 일은 무인에도
 * 그냥 한다.
 *
 * 2026-08-06 실측: 그 원칙은 **어디에도 집행되지 않았다.**
 *
 *     isAutonomous()                pre-payment-guard.ts:330  → 돈은 무인에서 HARD block ✅
 *     npm/bun publish               게이트 0건 ✗
 *     wrangler d1 migrations --remote  게이트 0건 ✗
 *     athsra rotate-master          게이트 0건 ✗
 *
 * 「값을 바꿔도 동작이 그대로인데 안전 성질만 바뀌는 것은 반드시 단언한다」 —
 * 산문 원칙은 위반해도 **아무것도 실패하지 않는다**. 그래서 게이트로 만든다.
 * (그 원칙을 말뭉치 문장으로 등재하는 대신 여기로 옮긴 판단: 오너 «정공법으로», 2026-08-06.)
 *
 * ## 무엇을 막나 — «되돌릴 수 없는» 것만
 *
 *   1. **패키지 게시** — 레지스트리는 같은 버전을 다시 못 쓴다. 이 저장소는 2026-08-05 에
 *      재게시로 타르볼 sha512 를 깨뜨려 fleet 의 `bun add` 를 죽일 뻔했다.
 *   2. **원격 마이그레이션** — 프로덕션 스키마는 저장소 밖이고 롤백이 자동이 아니다.
 *   3. **시크릿 마스터 로테이션** — 모든 envelope 재암호화 + 전 토큰 revoke.
 *   4. **git push --force / 태그 삭제** — 원격 히스토리 파괴.
 *   5. **원격 리소스 삭제** — D1/R2/KV/워커 삭제는 데이터를 지운다.
 *
 * ⚠ `--dry-run` 은 되돌릴 것이 없으므로 통과시킨다. 무인 라운드가 **산출물을 계속 쌓는**
 *    것이 원칙의 후반부이고, dry-run 을 막으면 그 절반을 못 하게 된다.
 *
 * ## 왜 배석 중에는 안 막나
 *
 * 오너가 자리에 있으면 «확인받고 한다» 가 이미 성립한다. 배석 중에도 막으면 이 가드는
 * 매일 마찰이 되고, **상시 걸리는 게이트는 사람을 우회하도록 훈련시킨다.** 이 저장소가
 * 거짓 빨강에 대해 반복해 기록한 바로 그 대가다.
 *
 * 우회 (사람용 escape, 로그 남김): MODFOLIO_IRREVERSIBLE_GUARD=off
 */

import { failClosed } from "./_fail-closed.ts";
import { bashCommand, readHookInput } from "./_lib.ts";

/** 무인/헤드리스인가. `pre-payment-guard.ts` 와 **같은 판정**을 쓴다 — 두 가드가 갈리면 안 된다. */
export function isAutonomous(env: NodeJS.ProcessEnv = process.env): boolean {
	// ⚠ `stdout.isTTY` 를 쓰지 않는다 — 훅 서브프로세스는 항상 파이프라 모든 대화형 세션이
	//    무인으로 오분류된다(pre-payment-guard 가 같은 주석을 달고 있다).
	return env.MODFOLIO_AUTONOMOUS === "1" || env.CI === "true";
}

export interface IrreversibleRule {
	readonly re: RegExp;
	readonly vector: string;
	readonly why: string;
}

/**
 * ⚠ 각 정규식은 «되돌릴 수 없는» 동작만 잡아야 한다. 조회·목록·dry-run 이 걸리면 무인
 * 라운드가 산출물을 못 쌓고, 그러면 원칙의 후반부를 가드가 깨뜨린다.
 */
export const IRREVERSIBLE: readonly IrreversibleRule[] = [
	{
		re: /\b(?:npm|bun|pnpm|yarn)\s+publish\b/i,
		vector: "package-publish",
		why: "레지스트리는 같은 버전을 다시 쓸 수 없다 — 게시는 되돌릴 수 없다",
	},
	{
		re: /\bwrangler\s+d1\s+(?:migrations\s+apply|execute)\b[^\n]*--remote\b/i,
		vector: "remote-migration",
		why: "프로덕션 스키마는 저장소 밖이고 롤백이 자동이 아니다",
	},
	{
		re: /\bathsra\s+(?:rotate-master|purge)\b/i,
		vector: "secret-rotation",
		why: "모든 envelope 재암호화 + 전 토큰 revoke — major event",
	},
	{
		re: /\bwrangler\s+secret\s+(?:put|delete)\b/i,
		vector: "prod-secret-write",
		why: "프로덕션 시크릿 교체는 이전 값을 복구할 수 없다",
	},
	{
		re: /\bgit\s+push\b[^\n]*(?:--force(?!-with-lease)|(?:^|\s)-f(?:$|\s))/i,
		vector: "force-push",
		why: "원격 히스토리를 파괴한다",
	},
	{
		re: /\bgit\s+push\b[^\n]*\s--delete\b/i,
		vector: "remote-ref-delete",
		why: "원격 브랜치/태그 삭제는 되돌릴 수 없다",
	},
	{
		re: /\bwrangler\s+(?:d1\s+delete|r2\s+bucket\s+delete|kv:?namespace\s+delete|delete)\b/i,
		vector: "remote-resource-delete",
		why: "원격 리소스 삭제는 데이터를 지운다",
	},
];

/** dry-run 계열은 되돌릴 것이 없다 — 무인 라운드가 산출물을 쌓는 것을 막지 않는다. */
const DRY = /--dry-run\b|--dryrun\b|--dry\b/i;

export interface Verdict {
	readonly blocked: boolean;
	readonly vector?: string;
	readonly why?: string;
}

/**
 * 순수 판정 — 실행 없이 합성 입력으로 대조할 수 있게 분리한다.
 *
 * 실행으로만 대조하면 대조쌍이 «무인 환경» 이라는 재현하기 번거로운 조건에 의존한다
 * (이 저장소가 렌더 게이트에서 같은 이유로 판정을 분리했다).
 */
export function judgeIrreversible(cmd: string, autonomous: boolean): Verdict {
	if (!autonomous) return { blocked: false };
	if (DRY.test(cmd)) return { blocked: false };
	for (const rule of IRREVERSIBLE) {
		if (rule.re.test(cmd))
			return { blocked: true, vector: rule.vector, why: rule.why };
	}
	return { blocked: false };
}

async function main(): Promise<void> {
	const mode = process.env.MODFOLIO_IRREVERSIBLE_GUARD ?? "block";
	if (mode === "off") process.exit(0);

	const input = await readHookInput();
	const cmd = bashCommand(input);
	if (!cmd) process.exit(0);

	const verdict = judgeIrreversible(cmd, isAutonomous());
	if (!verdict.blocked) process.exit(0);

	process.stderr.write(
		`BLOCKED (pre-irreversible-guard): 무인 모드에서 되돌릴 수 없는 작업\n` +
			`vector=${verdict.vector} — ${verdict.why}\n\n` +
			`무인의 «묻지 않는다» 는 판단을 위임받은 것이지 되돌릴 수 없는 것까지 위임받은 것이 아닙니다.\n` +
			`산출물은 계속 쌓아 두고, 오너가 배석했을 때 확인받고 진행하십시오.\n` +
			`되돌릴 수 있는 작업은 무인에서도 그대로 진행됩니다 (--dry-run 도 통과).\n` +
			`escape (로그 남김): MODFOLIO_IRREVERSIBLE_GUARD=off\n`,
	);
	process.exit(2);
}

if (import.meta.main) {
	await main().catch(() => failClosed("pre-irreversible-guard"));
}
