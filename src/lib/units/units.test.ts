import { describe, expect, it } from 'vitest';
import {
	DIMENSIONS,
	convert,
	findUnit,
	formatNumber,
	toSignificant,
	unitIn,
	unitLabel
} from './units';

const near = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('unit definitions', () => {
	it('gives every dimension a base unit with factor 1', () => {
		for (const d of DIMENSIONS) {
			const base = unitIn(d, d.base);
			expect(base, `${d.id} declares base "${d.base}"`).toBeDefined();
			if (!base!.toBase) expect(base!.factor, `${d.id} base factor`).toBe(1);
		}
	});

	it('uses unique unit ids across the whole catalog', () => {
		const seen = new Set<string>();
		for (const d of DIMENSIONS) {
			for (const u of d.units) {
				expect(seen.has(u.id), `duplicate unit id ${u.id}`).toBe(false);
				seen.add(u.id);
			}
		}
	});

	it('round-trips every unit through its base (property test)', () => {
		for (const d of DIMENSIONS) {
			for (const a of d.units) {
				for (const b of d.units) {
					for (const v of [1, 7.5, 1234.567]) {
						const there = convert(v, a, b);
						const back = convert(there, b, a);
						expect(
							Math.abs(back - v) / Math.max(1, Math.abs(v)),
							`${d.id}: ${a.id} → ${b.id} → ${a.id}`
						).toBeLessThan(1e-9);
					}
				}
			}
		}
	});
});

describe('known conversion values', () => {
	const c = (v: number, from: string, to: string) => {
		const f = findUnit(from)!;
		const t = findUnit(to)!;
		return convert(v, f.unit, t.unit);
	};

	it('converts the cooking pairs people actually search for', () => {
		near(c(3, 'tbsp', 'tsp'), 9, 1e-12);
		near(c(1, 'cup', 'tbsp'), 16, 1e-9);
		near(c(1, 'cup', 'ml'), 236.5882365, 1e-6);
		near(c(1, 'stick of butter', 'tbsp'), 8, 1e-9);
		near(c(1, 'stick of butter', 'cup'), 0.5, 1e-9);
		near(c(1, 'fluid ounce', 'tbsp'), 2, 1e-9);
		near(c(1, 'gallon', 'cup'), 16, 1e-9);
		near(c(1, 'metric cup', 'ml'), 250, 1e-9);
	});

	it('converts temperature at the reference points', () => {
		near(c(0, 'celsius', 'fahrenheit'), 32, 1e-9);
		near(c(100, 'celsius', 'fahrenheit'), 212, 1e-9);
		near(c(-40, 'celsius', 'fahrenheit'), -40, 1e-9);
		near(c(72, 'fahrenheit', 'celsius'), 22.222222222, 1e-6);
		near(c(0, 'celsius', 'kelvin'), 273.15, 1e-9);
		near(c(0, 'kelvin', 'rankine'), 0, 1e-9);
		near(c(491.67, 'rankine', 'fahrenheit'), 32, 1e-9);
	});

	it('converts length using the international definitions', () => {
		near(c(1, 'inch', 'cm'), 2.54, 1e-12);
		near(c(1, 'mile', 'km'), 1.609344, 1e-12);
		near(c(1, 'foot', 'inch'), 12, 1e-9);
		near(c(1, 'yard', 'foot'), 3, 1e-9);
		near(c(1, 'nautical mile', 'meter'), 1852, 1e-9);
		near(c(1, 'light-year', 'km'), 9460730472580.8, 1);
	});

	it('converts mass using NIST factors', () => {
		near(c(1, 'kg', 'lb'), 2.2046226218, 1e-8);
		near(c(1, 'lb', 'oz'), 16, 1e-9);
		near(c(1, 'stone', 'lb'), 14, 1e-9);
		near(c(1, 'tonne', 'kg'), 1000, 1e-9);
		near(c(1, 'troy ounce', 'gram'), 31.1034768, 1e-9);
	});

	it('handles the decimal/binary storage split', () => {
		near(c(1, 'kilobyte', 'byte'), 1000, 1e-9);
		near(c(1, 'kibibyte', 'byte'), 1024, 1e-9);
		near(c(1, 'gigabyte', 'megabyte'), 1000, 1e-9);
		near(c(1, 'byte', 'bit'), 8, 1e-9);
		near(c(8, 'megabit per second', 'megabyte per second'), 1, 1e-9);
	});

	it('treats fuel economy as the inverse measure it is', () => {
		// The canonical identity: L/100km = 235.2145 / mpg(US)
		near(c(30, 'mpg', 'l/100km'), 235.214583 / 30, 1e-4);
		near(c(8, 'l/100km', 'mpg'), 235.214583 / 8, 1e-4);
	});

	it('converts pressure, energy, power and angle', () => {
		near(c(1, 'bar', 'psi'), 14.503773773, 1e-6);
		near(c(1, 'atm', 'pascal'), 101325, 1e-6);
		near(c(1, 'kilocalorie', 'kilojoule'), 4.184, 1e-9);
		near(c(1, 'kwh', 'joule'), 3.6e6, 1e-3);
		near(c(1, 'horsepower', 'watt'), 745.6998715822702, 1e-6);
		near(c(180, 'degree', 'radian'), Math.PI, 1e-12);
		near(c(1, 'turn', 'degree'), 360, 1e-9);
	});

	it('converts speed and area', () => {
		near(c(100, 'km/h', 'mph'), 62.13711922, 1e-6);
		near(c(1, 'knot', 'km/h'), 1.852, 1e-9);
		near(c(1, 'acre', 'square foot'), 43560, 1e-6);
		near(c(1, 'hectare', 'square meter'), 10000, 1e-9);
	});
});

describe('unit lookup', () => {
	it('resolves symbols, names, plurals and aliases', () => {
		expect(findUnit('tbsp')?.unit.id).toBe('tablespoon');
		expect(findUnit('Tablespoons')?.unit.id).toBe('tablespoon');
		expect(findUnit('°F')?.unit.id).toBe('fahrenheit');
		expect(findUnit('kilometres')?.unit.id).toBe('kilometer');
		expect(findUnit('  KG ')?.unit.id).toBe('kilogram');
		expect(findUnit('lbs')?.unit.id).toBe('pound');
	});

	it('returns nothing for unknown tokens', () => {
		expect(findUnit('bananas')).toBeUndefined();
		expect(findUnit('')).toBeUndefined();
	});
});

describe('formatting', () => {
	it('never prints float noise', () => {
		expect(formatNumber(0.1 + 0.2)).toBe('0.3');
		expect(formatNumber(9.000000000001)).toBe('9');
		expect(formatNumber(1234567.891)).toBe('1,234,567.891');
	});

	it('falls back to scientific notation at the extremes', () => {
		expect(formatNumber(1e20)).toContain('10^');
		expect(formatNumber(1e-12)).toContain('10^');
	});

	it('rounds to significant figures', () => {
		expect(toSignificant(1234.5678, 3)).toBe(1230);
		expect(toSignificant(0.00012345, 2)).toBe(0.00012);
		expect(toSignificant(0, 3)).toBe(0);
	});

	it('pluralises irregular unit names', () => {
		const foot = findUnit('foot')!.unit;
		expect(unitLabel(foot, 1)).toBe('foot');
		expect(unitLabel(foot, 3)).toBe('feet');
		const kelvin = findUnit('kelvin')!.unit;
		expect(unitLabel(kelvin, 5)).toBe('kelvin');
	});
});
