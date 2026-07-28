import { describe, expect, it } from 'vitest';
import { answer, fromRoman, toRoman } from './omnibox';
import { searchTools } from './search';

const NOW = new Date(2026, 6, 28); // 28 July 2026, a Tuesday
const first = (q: string) => answer(q, NOW)[0];

describe('omnibox unit conversion', () => {
	it('answers the motivating example', () => {
		const a = first('3 tbsp to tsp');
		expect(a.value).toBe('9 teaspoons');
		expect(a.href).toBe('/convert/tablespoon-to-teaspoon?value=3');
	});

	it('accepts every connector word', () => {
		for (const q of ['3 tbsp to tsp', '3 tbsp in tsp', '3 tbsp as tsp', '3 tbsp = tsp', '3 tbsp → tsp']) {
			expect(first(q)?.value, q).toBe('9 teaspoons');
		}
	});

	it('handles temperature and singular labels', () => {
		expect(first('72F in C')?.value).toBe('22.22222222 degrees Celsius');
		expect(first('1 mile to km')?.value).toBe('1.609344 kilometers');
		expect(first('1 kg to g')?.value).toBe('1,000 grams');
	});

	it('defaults to a quantity of one', () => {
		expect(first('mile to km')?.value).toBe('1.609344 kilometers');
	});

	it('offers a fraction alongside small kitchen volumes', () => {
		expect(first('0.75 cup to cups')?.detail).toContain('¾');
	});

	it('refuses to convert across dimensions', () => {
		expect(answer('3 kg to liters', NOW)).toHaveLength(0);
	});

	it('links to the generic dimension page when no pair page exists', () => {
		const a = first('5 furlongs to fathoms');
		expect(a.href).toContain('/convert/length?value=5');
		expect(a.href).toContain('from=furlong');
	});
});

describe('omnibox percentages', () => {
	it('answers "15% of 80"', () => {
		const a = first('15% of 80');
		expect(a.value).toBe('12');
		expect(a.href).toContain('/math/percentage');
	});

	it('answers "12 is what percent of 80"', () => {
		expect(first('12 is what percent of 80')?.value).toBe('15%');
		expect(first('what percent of 80 is 12')?.value).toBe('15%');
	});

	it('answers percent change', () => {
		expect(first('percent change from 20 to 30')?.value).toBe('+50%');
		expect(first('percent change from 30 to 20')?.value).toBe('-33.33333333%');
	});
});

describe('omnibox dates', () => {
	it('counts the days until a holiday', () => {
		const a = first('days until Christmas');
		expect(a.value).toBe('150 days');
	});

	it('parses explicit dates in several shapes', () => {
		expect(first('days until Dec 25')?.value).toBe('150 days');
		expect(first('days until 2026-08-01')?.value).toBe('4 days');
		expect(first('how many days until December 25 2026')?.value).toBe('150 days');
	});
});

describe('omnibox number bases and roman numerals', () => {
	it('converts to hex, binary and octal', () => {
		expect(first('255 in hex')?.value).toBe('0xFF');
		expect(first('10 in binary')?.value).toBe('0b1010');
		expect(first('0xff to decimal')?.value).toBe('255');
	});

	it('converts to roman numerals', () => {
		expect(first('1994 to roman')?.value).toBe('MCMXCIV');
	});
});

describe('roman numerals round-trip', () => {
	it('matches the classic values', () => {
		expect(toRoman(4)).toBe('IV');
		expect(toRoman(9)).toBe('IX');
		expect(toRoman(40)).toBe('XL');
		expect(toRoman(1987)).toBe('MCMLXXXVII');
		expect(toRoman(3999)).toBe('MMMCMXCIX');
		expect(fromRoman('MCMXCIV')).toBe(1994);
		expect(fromRoman('MMMCMXCIX')).toBe(3999);
	});

	it('round-trips every value up to 3999', () => {
		for (let n = 1; n <= 3999; n++) expect(fromRoman(toRoman(n)), `n=${n}`).toBe(n);
	});

	it('uses the vinculum above 3999 and round-trips it', () => {
		expect(fromRoman(toRoman(5000))).toBe(5000);
		expect(fromRoman(toRoman(1234567))).toBe(1234567);
	});

	it('rejects out-of-range input', () => {
		expect(toRoman(0)).toBe('');
		expect(toRoman(-5)).toBe('');
		expect(toRoman(1.5)).toBe('');
	});
});

describe('omnibox arithmetic', () => {
	it('evaluates bare expressions', () => {
		expect(first('2+2*3')?.value).toBe('8');
		expect(first('what is 17 * 23')?.value).toBe('391');
		expect(first('sqrt(2)')?.value).toBe('1.41421356237');
	});

	it('ignores plain prose and bare numbers', () => {
		expect(answer('word counter', NOW)).toHaveLength(0);
		expect(answer('42', NOW)).toHaveLength(0);
		expect(answer('how do I resize an image', NOW)).toHaveLength(0);
	});
});

describe('tool search', () => {
	it('finds tools by exact title', () => {
		expect(searchTools('word counter')[0].path).toBe('/text/word-counter');
	});

	it('finds tools by synonym', () => {
		expect(searchTools('shrink image')[0].path).toBe('/image/resize');
		expect(searchTools('resize pic')[0].path).toBe('/image/resize');
		expect(searchTools('what do i need on the final')[0].path).toBe('/school/final-grade');
		expect(searchTools('gcf')[0].path).toBe('/math/gcd-lcm');
	});

	it('finds the flagship visualizer from econ vocabulary', () => {
		for (const q of ['supply and demand', 'equilibrium', 'deadweight loss', 'price ceiling']) {
			expect(searchTools(q)[0].path, q).toBe('/visualize/supply-and-demand');
		}
	});

	it('returns nothing for gibberish', () => {
		expect(searchTools('qzxwvjkl')).toHaveLength(0);
	});
});
