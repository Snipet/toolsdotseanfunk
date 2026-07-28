/**
 * Randomness helpers.
 *
 * Everything uses the crypto RNG by default so draws are unbiased and
 * unpredictable, with an optional seeded generator for reproducible results —
 * useful when a raffle needs to be auditable.
 */

export type RandomFn = () => number;

/** Uniform [0, 1) from the cryptographic source. */
export const cryptoRandom: RandomFn = () =>
	crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

/**
 * xorshift128, seeded from a string. Deterministic, so the same seed always
 * produces the same sequence — the basis of a verifiable draw.
 */
export function seededRandom(seed: string): RandomFn {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	let a = h || 1;
	let b = (h ^ 0x9e3779b9) >>> 0 || 2;
	let c = (h ^ 0x85ebca6b) >>> 0 || 3;
	let d = (h ^ 0xc2b2ae35) >>> 0 || 4;

	return () => {
		const t = a ^ (a << 11);
		a = b;
		b = c;
		c = d;
		d = (d ^ (d >>> 19) ^ (t ^ (t >>> 8))) >>> 0;
		return d / 2 ** 32;
	};
}

/** Uniform integer in [min, max], inclusive. */
export function randomInt(min: number, max: number, random: RandomFn = cryptoRandom): number {
	const lo = Math.ceil(Math.min(min, max));
	const hi = Math.floor(Math.max(min, max));
	return lo + Math.floor(random() * (hi - lo + 1));
}

/** Fisher–Yates. Returns a new array; the input is untouched. */
export function shuffle<T>(items: readonly T[], random: RandomFn = cryptoRandom): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** Draw `count` distinct items. */
export function sample<T>(items: readonly T[], count: number, random: RandomFn = cryptoRandom): T[] {
	return shuffle(items, random).slice(0, Math.max(0, Math.min(count, items.length)));
}

/** Split into `groupCount` groups as evenly as possible. */
export function intoGroups<T>(
	items: readonly T[],
	groupCount: number,
	random: RandomFn = cryptoRandom
): T[][] {
	const shuffled = shuffle(items, random);
	const groups: T[][] = Array.from({ length: Math.max(1, groupCount) }, () => []);
	shuffled.forEach((item, i) => groups[i % groups.length].push(item));
	return groups;
}

export interface DiceRoll {
	notation: string;
	rolls: number[];
	kept: number[];
	modifier: number;
	total: number;
}

/**
 * Parse and roll standard dice notation: 4d6, 2d20+3, 4d6kh3 (keep highest 3),
 * 2d20kl1 (keep lowest — disadvantage).
 */
export function rollDice(notation: string, random: RandomFn = cryptoRandom): DiceRoll | null {
	const match = /^\s*(\d*)d(\d+)\s*(?:(kh|kl)(\d+))?\s*([+-]\s*\d+)?\s*$/i.exec(notation);
	if (!match) return null;

	const count = Math.min(Number(match[1] || 1), 200);
	const sides = Math.min(Number(match[2]), 1000);
	if (count < 1 || sides < 2) return null;

	const keepMode = match[3]?.toLowerCase();
	const keepCount = match[4] ? Math.min(Number(match[4]), count) : count;
	const modifier = match[5] ? Number(match[5].replace(/\s+/g, '')) : 0;

	const rolls = Array.from({ length: count }, () => randomInt(1, sides, random));

	let kept = [...rolls];
	if (keepMode === 'kh') kept = [...rolls].sort((a, b) => b - a).slice(0, keepCount);
	else if (keepMode === 'kl') kept = [...rolls].sort((a, b) => a - b).slice(0, keepCount);

	return {
		notation: notation.trim(),
		rolls,
		kept,
		modifier,
		total: kept.reduce((sum, v) => sum + v, 0) + modifier
	};
}

/**
 * Secret Santa: a single derangement (nobody draws themselves), honouring
 * exclusion pairs. Retries because a valid assignment is not always found on
 * the first attempt with tight constraints.
 */
export function secretSanta(
	names: string[],
	exclusions: Array<[string, string]> = [],
	random: RandomFn = cryptoRandom
): Array<{ giver: string; receiver: string }> | null {
	if (names.length < 2) return null;

	const blocked = new Set(exclusions.flatMap(([a, b]) => [`${a}→${b}`, `${b}→${a}`]));

	for (let attempt = 0; attempt < 500; attempt++) {
		const receivers = shuffle(names, random);
		const valid = names.every(
			(giver, i) => receivers[i] !== giver && !blocked.has(`${giver}→${receivers[i]}`)
		);
		if (valid) return names.map((giver, i) => ({ giver, receiver: receivers[i] }));
	}
	return null;
}
