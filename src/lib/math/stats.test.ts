import { describe, expect, it } from 'vitest';
import {
	combinations,
	diceSumDistribution,
	linearRegression,
	normalCdf,
	normalInv,
	parseNumbers,
	permutations,
	quantile,
	summarize
} from './stats';

describe('parseNumbers', () => {
	it('accepts commas, spaces, tabs and newlines together', () => {
		expect(parseNumbers('1, 2\t3\n4  5')).toEqual([1, 2, 3, 4, 5]);
	});

	it('drops non-numeric tokens rather than producing NaN', () => {
		expect(parseNumbers('1, apple, 3')).toEqual([1, 3]);
		expect(parseNumbers('')).toEqual([]);
	});

	it('keeps negatives and decimals', () => {
		expect(parseNumbers('-1.5, 2e3, .25')).toEqual([-1.5, 2000, 0.25]);
	});
});

describe('descriptive statistics', () => {
	const s = summarize([2, 4, 4, 4, 5, 5, 7, 9])!;

	it('matches the textbook example', () => {
		// This dataset is the Wikipedia standard-deviation worked example.
		expect(s.n).toBe(8);
		expect(s.mean).toBe(5);
		expect(s.median).toBe(4.5);
		expect(s.modes).toEqual([4]);
		expect(s.sdPopulation).toBe(2);
		expect(s.sd).toBeCloseTo(2.13809, 4);
		expect(s.variancePopulation).toBe(4);
	});

	it('reports no mode when every value is unique', () => {
		expect(summarize([1, 2, 3])!.modes).toEqual([]);
	});

	it('reports every tied mode', () => {
		expect(summarize([1, 1, 2, 2, 3])!.modes).toEqual([1, 2]);
	});

	it('computes quartiles the way R and NumPy do', () => {
		const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		expect(quantile(sorted, 0.25)).toBeCloseTo(3.25, 10);
		expect(quantile(sorted, 0.5)).toBeCloseTo(5.5, 10);
		expect(quantile(sorted, 0.75)).toBeCloseTo(7.75, 10);
	});

	it('flags outliers with Tukey fences', () => {
		const withOutlier = summarize([1, 2, 3, 4, 5, 6, 7, 8, 100])!;
		expect(withOutlier.outliers).toContain(100);
		expect(summarize([1, 2, 3, 4, 5])!.outliers).toEqual([]);
	});

	it('returns null for empty input', () => {
		expect(summarize([])).toBeNull();
	});

	it('handles a single value without dividing by zero', () => {
		const one = summarize([42])!;
		expect(one.mean).toBe(42);
		expect(one.sd).toBe(0);
		expect(one.variance).toBe(0);
	});
});

describe('normal distribution', () => {
	it('matches published z-table values', () => {
		expect(normalCdf(0)).toBeCloseTo(0.5, 10);
		expect(normalCdf(1)).toBeCloseTo(0.8413447, 6);
		expect(normalCdf(1.96)).toBeCloseTo(0.9750021, 6);
		expect(normalCdf(-1.96)).toBeCloseTo(0.0249979, 6);
		expect(normalCdf(2.58)).toBeCloseTo(0.9950600, 5);
	});

	it('inverts to the critical values everyone memorises', () => {
		expect(normalInv(0.975)).toBeCloseTo(1.959964, 5);
		expect(normalInv(0.95)).toBeCloseTo(1.644854, 5);
		expect(normalInv(0.5)).toBeCloseTo(0, 10);
		expect(normalInv(0.005)).toBeCloseTo(-2.575829, 5);
	});

	it('round-trips cdf and inverse', () => {
		for (const p of [0.001, 0.05, 0.25, 0.5, 0.75, 0.95, 0.999]) {
			expect(normalCdf(normalInv(p))).toBeCloseTo(p, 7);
		}
	});

	it('respects mean and standard deviation', () => {
		expect(normalCdf(100, 100, 15)).toBeCloseTo(0.5, 10);
		expect(normalInv(0.5, 100, 15)).toBeCloseTo(100, 8);
		// IQ above 130 is famously about 2.3% of the population.
		expect(1 - normalCdf(130, 100, 15)).toBeCloseTo(0.0228, 3);
	});
});

describe('combinatorics', () => {
	it('computes the lottery and card-hand classics', () => {
		expect(combinations(52, 5)).toBe(2598960);
		expect(combinations(49, 6)).toBe(13983816);
		expect(combinations(5, 0)).toBe(1);
		expect(combinations(5, 5)).toBe(1);
		expect(permutations(5, 3)).toBe(60);
		expect(permutations(10, 10)).toBe(3628800);
	});

	it('rejects impossible arguments', () => {
		expect(Number.isNaN(combinations(3, 5))).toBe(true);
		expect(Number.isNaN(permutations(3, -1))).toBe(true);
	});
});

describe('linear regression', () => {
	it('recovers a line exactly', () => {
		const fit = linearRegression([
			{ x: 1, y: 3 },
			{ x: 2, y: 5 },
			{ x: 3, y: 7 }
		])!;
		expect(fit.slope).toBeCloseTo(2, 12);
		expect(fit.intercept).toBeCloseTo(1, 12);
		expect(fit.r2).toBeCloseTo(1, 12);
		expect(fit.predict(10)).toBeCloseTo(21, 10);
	});

	it('handles a negative relationship', () => {
		const fit = linearRegression([
			{ x: 1, y: 10 },
			{ x: 2, y: 8 },
			{ x: 3, y: 6 },
			{ x: 4, y: 4 }
		])!;
		expect(fit.slope).toBeCloseTo(-2, 10);
		expect(fit.r).toBeCloseTo(-1, 10);
	});

	it('returns null when there is nothing to fit', () => {
		expect(linearRegression([{ x: 1, y: 1 }])).toBeNull();
		// All x identical — a vertical line has no slope.
		expect(linearRegression([{ x: 1, y: 1 }, { x: 1, y: 2 }])).toBeNull();
	});
});

describe('dice distribution', () => {
	it('matches the 2d6 table', () => {
		const dist = diceSumDistribution(2, 6);
		expect(dist.get(2)).toBe(1);
		expect(dist.get(7)).toBe(6);
		expect(dist.get(12)).toBe(1);
		expect([...dist.values()].reduce((a, b) => a + b, 0)).toBe(36);
	});

	it('matches the 3d6 total', () => {
		const dist = diceSumDistribution(3, 6);
		expect([...dist.values()].reduce((a, b) => a + b, 0)).toBe(216);
		expect(dist.get(10)).toBe(27);
		expect(dist.get(3)).toBe(1);
	});
});
