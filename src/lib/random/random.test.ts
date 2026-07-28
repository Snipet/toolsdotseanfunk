import { describe, expect, it } from 'vitest';
import {
	intoGroups,
	randomInt,
	rollDice,
	sample,
	secretSanta,
	seededRandom,
	shuffle
} from './random';

const rng = seededRandom('deterministic-test-seed');

describe('seededRandom', () => {
	it('is deterministic for the same seed', () => {
		const a = seededRandom('abc');
		const b = seededRandom('abc');
		expect([a(), a(), a()]).toEqual([b(), b(), b()]);
	});

	it('differs between seeds', () => {
		expect(seededRandom('abc')()).not.toBe(seededRandom('xyz')());
	});

	it('stays within [0, 1)', () => {
		const r = seededRandom('range');
		for (let i = 0; i < 1000; i++) {
			const value = r();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});
});

describe('randomInt', () => {
	it('respects inclusive bounds', () => {
		const seen = new Set<number>();
		for (let i = 0; i < 2000; i++) {
			const value = randomInt(1, 6, rng);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(6);
			seen.add(value);
		}
		expect(seen.size).toBe(6);
	});

	it('handles reversed and equal bounds', () => {
		expect(randomInt(10, 5, rng)).toBeGreaterThanOrEqual(5);
		expect(randomInt(3, 3, rng)).toBe(3);
	});
});

describe('shuffle', () => {
	it('preserves every element', () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8];
		const output = shuffle(input, rng);
		expect(output).toHaveLength(input.length);
		expect([...output].sort((a, b) => a - b)).toEqual(input);
	});

	it('does not mutate the input', () => {
		const input = [1, 2, 3];
		shuffle(input, rng);
		expect(input).toEqual([1, 2, 3]);
	});

	it('is unbiased across positions', () => {
		// Every element should land in every position roughly equally often.
		const counts = [0, 0, 0];
		for (let i = 0; i < 6000; i++) counts[shuffle(['a', 'b', 'c'], rng).indexOf('a')]++;
		for (const count of counts) expect(count).toBeGreaterThan(1600);
	});
});

describe('sample and grouping', () => {
	it('draws distinct items', () => {
		const drawn = sample(['a', 'b', 'c', 'd', 'e'], 3, rng);
		expect(drawn).toHaveLength(3);
		expect(new Set(drawn).size).toBe(3);
	});

	it('clamps to the list length', () => {
		expect(sample(['a', 'b'], 10, rng)).toHaveLength(2);
		expect(sample(['a', 'b'], 0, rng)).toHaveLength(0);
	});

	it('splits into balanced groups', () => {
		const groups = intoGroups(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3, rng);
		expect(groups).toHaveLength(3);
		expect(groups.flat().sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
		// Seven into three is 3/2/2 — never a difference greater than one.
		const sizes = groups.map((g) => g.length);
		expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
	});
});

describe('dice notation', () => {
	it('parses and rolls the basic forms', () => {
		const roll = rollDice('2d6', rng)!;
		expect(roll.rolls).toHaveLength(2);
		expect(roll.total).toBeGreaterThanOrEqual(2);
		expect(roll.total).toBeLessThanOrEqual(12);
	});

	it('applies modifiers', () => {
		const roll = rollDice('1d2+5', rng)!;
		expect(roll.total).toBeGreaterThanOrEqual(6);
		expect(roll.total).toBeLessThanOrEqual(7);
		expect(roll.modifier).toBe(5);
	});

	it('handles a missing count', () => {
		expect(rollDice('d20', rng)!.rolls).toHaveLength(1);
	});

	it('keeps the highest for advantage', () => {
		const roll = rollDice('4d6kh3', rng)!;
		expect(roll.rolls).toHaveLength(4);
		expect(roll.kept).toHaveLength(3);
		// The discarded die is the lowest of the four.
		expect(Math.min(...roll.kept)).toBeGreaterThanOrEqual(Math.min(...roll.rolls));
		expect(roll.total).toBe(roll.kept.reduce((a, b) => a + b, 0));
	});

	it('keeps the lowest for disadvantage', () => {
		const roll = rollDice('2d20kl1', rng)!;
		expect(roll.kept).toHaveLength(1);
		expect(roll.kept[0]).toBe(Math.min(...roll.rolls));
	});

	it('rejects nonsense', () => {
		expect(rollDice('hello', rng)).toBeNull();
		expect(rollDice('2d1', rng)).toBeNull();
		expect(rollDice('0d6', rng)).toBeNull();
	});
});

describe('secret santa', () => {
	it('never assigns anyone to themselves', () => {
		const names = ['Ada', 'Grace', 'Alan', 'Katherine', 'Margaret'];
		for (let i = 0; i < 200; i++) {
			const result = secretSanta(names, [], rng)!;
			expect(result).toHaveLength(names.length);
			for (const { giver, receiver } of result) expect(giver).not.toBe(receiver);
		}
	});

	it('gives everyone exactly one gift', () => {
		const names = ['A', 'B', 'C', 'D'];
		const result = secretSanta(names, [], rng)!;
		expect(new Set(result.map((r) => r.receiver)).size).toBe(names.length);
		expect(new Set(result.map((r) => r.giver)).size).toBe(names.length);
	});

	it('honours exclusion pairs in both directions', () => {
		const names = ['A', 'B', 'C', 'D', 'E'];
		const result = secretSanta(names, [['A', 'B']], rng)!;
		const pairs = result.map((r) => `${r.giver}${r.receiver}`);
		expect(pairs).not.toContain('AB');
		expect(pairs).not.toContain('BA');
	});

	it('returns null when the constraints are impossible', () => {
		expect(secretSanta(['A'], [], rng)).toBeNull();
		// Two people who cannot draw each other have nowhere to go.
		expect(secretSanta(['A', 'B'], [['A', 'B']], rng)).toBeNull();
	});
});
