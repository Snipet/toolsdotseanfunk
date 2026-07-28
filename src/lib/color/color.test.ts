import { describe, expect, it } from 'vitest';
import {
	cmykToRgb,
	contrastRatio,
	hslToRgb,
	luminance,
	parseColor,
	readableOn,
	rgbToCmyk,
	rgbToHsl,
	rgbToHsv,
	toHex,
	wcag
} from './color';

describe('parsing', () => {
	it('parses every hex length', () => {
		expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
		expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
		expect(parseColor('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
		expect(parseColor('#ff0000ff')).toEqual({ r: 255, g: 0, b: 0 });
	});

	it('parses functional notation', () => {
		expect(parseColor('rgb(255, 128, 0)')).toEqual({ r: 255, g: 128, b: 0 });
		expect(parseColor('rgba(255 128 0 / 0.5)')).toEqual({ r: 255, g: 128, b: 0 });
		expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0 });
	});

	it('parses named colours', () => {
		expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255 });
		expect(parseColor('  Navy  ')).toEqual({ r: 0, g: 0, b: 128 });
	});

	it('returns null for nonsense', () => {
		expect(parseColor('not a colour')).toBeNull();
		expect(parseColor('')).toBeNull();
		expect(parseColor('#12345')).toBeNull();
	});
});

describe('conversions', () => {
	it('round-trips RGB through HSL', () => {
		for (const color of [
			{ r: 255, g: 0, b: 0 },
			{ r: 18, g: 52, b: 86 },
			{ r: 128, g: 128, b: 128 },
			{ r: 0, g: 0, b: 0 },
			{ r: 255, g: 255, b: 255 },
			{ r: 184, g: 72, b: 31 }
		]) {
			const back = hslToRgb(rgbToHsl(color));
			expect(Math.abs(back.r - color.r)).toBeLessThanOrEqual(1);
			expect(Math.abs(back.g - color.g)).toBeLessThanOrEqual(1);
			expect(Math.abs(back.b - color.b)).toBeLessThanOrEqual(1);
		}
	});

	it('round-trips RGB through CMYK', () => {
		for (const color of [
			{ r: 255, g: 0, b: 0 },
			{ r: 12, g: 200, b: 99 },
			{ r: 0, g: 0, b: 0 }
		]) {
			expect(cmykToRgb(rgbToCmyk(color))).toEqual(color);
		}
	});

	it('produces the expected HSL for primaries', () => {
		expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
		expect(rgbToHsl({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, l: 50 });
		expect(rgbToHsl({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, l: 50 });
		expect(rgbToHsl({ r: 128, g: 128, b: 128 }).s).toBe(0);
	});

	it('produces the expected HSV', () => {
		expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, v: 100 });
		expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
	});

	it('formats hex with padding', () => {
		expect(toHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
		expect(toHex({ r: 1, g: 2, b: 3 })).toBe('#010203');
	});
});

describe('WCAG contrast', () => {
	it('matches the specification bounds', () => {
		const white = { r: 255, g: 255, b: 255 };
		const black = { r: 0, g: 0, b: 0 };
		expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
		expect(contrastRatio(white, white)).toBeCloseTo(1, 10);
	});

	it('is symmetric', () => {
		const a = { r: 184, g: 72, b: 31 };
		const b = { r: 251, g: 251, b: 250 };
		expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 12);
	});

	it('computes relative luminance correctly', () => {
		expect(luminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 10);
		expect(luminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 10);
		// Pure green carries most of the perceived luminance.
		expect(luminance({ r: 0, g: 255, b: 0 })).toBeCloseTo(0.7152, 4);
	});

	it('applies the AA and AAA thresholds', () => {
		const result = wcag({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
		expect(result.normalAA).toBe(true);
		expect(result.normalAAA).toBe(true);

		// Mid grey on white is about 3.9:1 — large text only.
		const grey = wcag({ r: 128, g: 128, b: 128 }, { r: 255, g: 255, b: 255 });
		expect(grey.ratio).toBeGreaterThan(3);
		expect(grey.ratio).toBeLessThan(4.5);
		expect(grey.normalAA).toBe(false);
		expect(grey.largeAA).toBe(true);
	});

	it('picks a readable foreground', () => {
		expect(readableOn({ r: 0, g: 0, b: 0 })).toBe('#ffffff');
		expect(readableOn({ r: 255, g: 255, b: 255 })).toBe('#000000');
		expect(readableOn({ r: 255, g: 235, b: 59 })).toBe('#000000');
	});
});
