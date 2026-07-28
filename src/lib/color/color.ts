/** Colour parsing, conversion and contrast maths. */

export interface Rgb {
	r: number;
	g: number;
	b: number;
}
export interface Hsl {
	h: number;
	s: number;
	l: number;
}
export interface Hsv {
	h: number;
	s: number;
	v: number;
}
export interface Cmyk {
	c: number;
	m: number;
	y: number;
	k: number;
}

const clamp = (value: number, min = 0, max = 255) => Math.min(max, Math.max(min, value));

const NAMED: Record<string, string> = {
	black: '#000000', white: '#ffffff', red: '#ff0000', lime: '#00ff00', blue: '#0000ff',
	yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff', silver: '#c0c0c0', gray: '#808080',
	grey: '#808080', maroon: '#800000', olive: '#808000', green: '#008000', purple: '#800080',
	teal: '#008080', navy: '#000080', orange: '#ffa500', pink: '#ffc0cb', brown: '#a52a2a',
	gold: '#ffd700', indigo: '#4b0082', violet: '#ee82ee', tan: '#d2b48c', salmon: '#fa8072',
	crimson: '#dc143c', coral: '#ff7f50', turquoise: '#40e0d0', beige: '#f5f5dc', ivory: '#fffff0',
	khaki: '#f0e68c', lavender: '#e6e6fa', plum: '#dda0dd', orchid: '#da70d6', tomato: '#ff6347'
};

/** Parse hex, rgb(), hsl() or a CSS colour name. Returns null when unparseable. */
export function parseColor(input: string): Rgb | null {
	const text = input.trim().toLowerCase();
	if (!text) return null;

	const named = NAMED[text];
	if (named) return parseColor(named);

	const hex = /^#?([0-9a-f]{3,8})$/.exec(text);
	if (hex) {
		const digits = hex[1];
		if (digits.length === 3 || digits.length === 4) {
			return {
				r: parseInt(digits[0] + digits[0], 16),
				g: parseInt(digits[1] + digits[1], 16),
				b: parseInt(digits[2] + digits[2], 16)
			};
		}
		if (digits.length === 6 || digits.length === 8) {
			return {
				r: parseInt(digits.slice(0, 2), 16),
				g: parseInt(digits.slice(2, 4), 16),
				b: parseInt(digits.slice(4, 6), 16)
			};
		}
		return null;
	}

	const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(text);
	if (rgb) {
		return { r: clamp(Math.round(Number(rgb[1]))), g: clamp(Math.round(Number(rgb[2]))), b: clamp(Math.round(Number(rgb[3]))) };
	}

	const hsl = /^hsla?\(\s*([\d.-]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(text);
	if (hsl) {
		return hslToRgb({ h: Number(hsl[1]), s: Number(hsl[2]), l: Number(hsl[3]) });
	}

	return null;
}

export function toHex({ r, g, b }: Rgb): string {
	return (
		'#' +
		[r, g, b]
			.map((v) => clamp(Math.round(v)).toString(16).padStart(2, '0'))
			.join('')
	);
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const delta = max - min;
	const l = (max + min) / 2;

	let h = 0;
	let s = 0;
	if (delta !== 0) {
		s = delta / (1 - Math.abs(2 * l - 1));
		if (max === rn) h = ((gn - bn) / delta) % 6;
		else if (max === gn) h = (bn - rn) / delta + 2;
		else h = (rn - gn) / delta + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
	const hue = ((h % 360) + 360) % 360;
	const sat = Math.min(100, Math.max(0, s)) / 100;
	const light = Math.min(100, Math.max(0, l)) / 100;

	const c = (1 - Math.abs(2 * light - 1)) * sat;
	const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = light - c / 2;

	let rgb: [number, number, number];
	if (hue < 60) rgb = [c, x, 0];
	else if (hue < 120) rgb = [x, c, 0];
	else if (hue < 180) rgb = [0, c, x];
	else if (hue < 240) rgb = [0, x, c];
	else if (hue < 300) rgb = [x, 0, c];
	else rgb = [c, 0, x];

	return {
		r: Math.round((rgb[0] + m) * 255),
		g: Math.round((rgb[1] + m) * 255),
		b: Math.round((rgb[2] + m) * 255)
	};
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const delta = max - min;

	let h = 0;
	if (delta !== 0) {
		if (max === rn) h = ((gn - bn) / delta) % 6;
		else if (max === gn) h = (bn - rn) / delta + 2;
		else h = (rn - gn) / delta + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return { h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
}

export function rgbToCmyk({ r, g, b }: Rgb): Cmyk {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const k = 1 - Math.max(rn, gn, bn);
	if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
	return {
		c: ((1 - rn - k) / (1 - k)) * 100,
		m: ((1 - gn - k) / (1 - k)) * 100,
		y: ((1 - bn - k) / (1 - k)) * 100,
		k: k * 100
	};
}

export function cmykToRgb({ c, m, y, k }: Cmyk): Rgb {
	const cn = c / 100;
	const mn = m / 100;
	const yn = y / 100;
	const kn = k / 100;
	return {
		r: Math.round(255 * (1 - cn) * (1 - kn)),
		g: Math.round(255 * (1 - mn) * (1 - kn)),
		b: Math.round(255 * (1 - yn) * (1 - kn))
	};
}

// ---------------------------------------------------------------------------
// Contrast — WCAG 2.x
// ---------------------------------------------------------------------------

/** Relative luminance, per the WCAG definition. */
export function luminance({ r, g, b }: Rgb): number {
	const channel = (value: number) => {
		const v = value / 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two colours, from 1:1 to 21:1. */
export function contrastRatio(a: Rgb, b: Rgb): number {
	const la = luminance(a);
	const lb = luminance(b);
	const lighter = Math.max(la, lb);
	const darker = Math.min(la, lb);
	return (lighter + 0.05) / (darker + 0.05);
}

export interface WcagResult {
	ratio: number;
	normalAA: boolean;
	normalAAA: boolean;
	largeAA: boolean;
	largeAAA: boolean;
	uiAA: boolean;
}

export function wcag(a: Rgb, b: Rgb): WcagResult {
	const ratio = contrastRatio(a, b);
	return {
		ratio,
		normalAA: ratio >= 4.5,
		normalAAA: ratio >= 7,
		largeAA: ratio >= 3,
		largeAAA: ratio >= 4.5,
		uiAA: ratio >= 3
	};
}

// ---------------------------------------------------------------------------
// Harmonies and ramps
// ---------------------------------------------------------------------------

export function rotateHue(color: Rgb, degrees: number): Rgb {
	const hsl = rgbToHsl(color);
	return hslToRgb({ ...hsl, h: hsl.h + degrees });
}

export function harmonies(color: Rgb): Record<string, Rgb[]> {
	return {
		Complementary: [color, rotateHue(color, 180)],
		Analogous: [rotateHue(color, -30), color, rotateHue(color, 30)],
		Triadic: [color, rotateHue(color, 120), rotateHue(color, 240)],
		Tetradic: [color, rotateHue(color, 90), rotateHue(color, 180), rotateHue(color, 270)],
		'Split complementary': [color, rotateHue(color, 150), rotateHue(color, 210)],
		Monochromatic: [10, 30, 50, 70, 90].map((l) => hslToRgb({ ...rgbToHsl(color), l }))
	};
}

/** A tonal ramp at design-system steps, keeping hue and saturation. */
export function shades(color: Rgb): Array<{ step: number; color: Rgb }> {
	const hsl = rgbToHsl(color);
	const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
	const lightness = [97, 94, 86, 77, 66, 55, 45, 36, 27, 18, 11];
	return steps.map((step, i) => ({ step, color: hslToRgb({ ...hsl, l: lightness[i] }) }));
}

// ---------------------------------------------------------------------------
// Colour vision deficiency simulation
// ---------------------------------------------------------------------------

/**
 * Brettel/Viénot-style simulation via linear matrices in LMS space.
 * Approximate — useful for spotting problems, not a clinical model.
 */
const CVD_MATRICES: Record<string, number[][]> = {
	Protanopia: [
		[0.567, 0.433, 0.0],
		[0.558, 0.442, 0.0],
		[0.0, 0.242, 0.758]
	],
	Deuteranopia: [
		[0.625, 0.375, 0.0],
		[0.7, 0.3, 0.0],
		[0.0, 0.3, 0.7]
	],
	Tritanopia: [
		[0.95, 0.05, 0.0],
		[0.0, 0.433, 0.567],
		[0.0, 0.475, 0.525]
	],
	Achromatopsia: [
		[0.299, 0.587, 0.114],
		[0.299, 0.587, 0.114],
		[0.299, 0.587, 0.114]
	]
};

export const CVD_TYPES = Object.keys(CVD_MATRICES);

export function simulateCvd(color: Rgb, type: string): Rgb {
	const matrix = CVD_MATRICES[type];
	if (!matrix) return color;
	const { r, g, b } = color;
	return {
		r: clamp(Math.round(matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b)),
		g: clamp(Math.round(matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b)),
		b: clamp(Math.round(matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b))
	};
}

/** Black or white, whichever contrasts better against this colour. */
export function readableOn(color: Rgb): string {
	const white = { r: 255, g: 255, b: 255 };
	const black = { r: 0, g: 0, b: 0 };
	return contrastRatio(color, white) >= contrastRatio(color, black) ? '#ffffff' : '#000000';
}
