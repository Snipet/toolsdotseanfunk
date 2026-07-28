/** Shared number, fraction and duration formatting. */

const VULGAR: Record<string, string> = {
	'1/2': '½',
	'1/3': '⅓',
	'2/3': '⅔',
	'1/4': '¼',
	'3/4': '¾',
	'1/8': '⅛',
	'3/8': '⅜',
	'5/8': '⅝',
	'7/8': '⅞',
	'1/6': '⅙',
	'5/6': '⅚',
	'1/16': '¹⁄₁₆'
};

/** Greatest common divisor of two non-negative integers. */
export function gcd(a: number, b: number): number {
	a = Math.abs(a);
	b = Math.abs(b);
	while (b) [a, b] = [b, a % b];
	return a;
}

export function lcm(a: number, b: number): number {
	if (a === 0 || b === 0) return 0;
	return Math.abs(a * b) / gcd(a, b);
}

export interface Fraction {
	whole: number;
	numerator: number;
	denominator: number;
	negative: boolean;
}

/**
 * Approximate a decimal as a mixed number over a kitchen-friendly denominator.
 * Cooks want "2 ¼ cups", not "2.2500000001 cups".
 */
export function toFraction(value: number, maxDenominator = 16): Fraction {
	const negative = value < 0;
	const abs = Math.abs(value);
	const whole = Math.floor(abs);
	const frac = abs - whole;

	let best = { n: 0, d: 1, err: frac };
	for (const d of [2, 3, 4, 6, 8, 12, 16, 32].filter((x) => x <= maxDenominator)) {
		const n = Math.round(frac * d);
		const err = Math.abs(frac - n / d);
		if (err < best.err - 1e-12) best = { n, d, err };
	}

	let { n, d } = best;
	if (n === d) return { whole: whole + 1, numerator: 0, denominator: 1, negative };
	if (n === 0) return { whole, numerator: 0, denominator: 1, negative };
	const g = gcd(n, d);
	n /= g;
	d /= g;
	return { whole, numerator: n, denominator: d, negative };
}

/** Render a value as a mixed number using vulgar fractions where they exist. */
export function formatFraction(value: number, maxDenominator = 16): string {
	if (!Number.isFinite(value)) return '—';
	const { whole, numerator, denominator, negative } = toFraction(value, maxDenominator);
	const sign = negative ? '−' : '';
	if (numerator === 0) return `${sign}${whole}`;
	const key = `${numerator}/${denominator}`;
	const frac = VULGAR[key] ?? key;
	return whole === 0 ? `${sign}${frac}` : `${sign}${whole} ${frac}`;
}

/** Locale-aware number with a sensible cap on decimals. */
export function fmt(value: number, decimals = 2): string {
	if (!Number.isFinite(value)) return '—';
	return value.toLocaleString('en-US', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
}

/** Compact number: drops trailing zeros, keeps up to `max` decimals. */
export function fmtLoose(value: number, max = 4): string {
	if (!Number.isFinite(value)) return '—';
	return value.toLocaleString('en-US', { maximumFractionDigits: max });
}

export function currency(value: number, code = 'USD'): string {
	if (!Number.isFinite(value)) return '—';
	return value.toLocaleString('en-US', {
		style: 'currency',
		currency: code,
		maximumFractionDigits: 2
	});
}

export function percent(value: number, decimals = 2): string {
	if (!Number.isFinite(value)) return '—';
	return `${fmt(value, decimals)}%`;
}

/** Seconds → "1h 04m 30s", dropping empty leading parts. */
export function duration(totalSeconds: number): string {
	if (!Number.isFinite(totalSeconds)) return '—';
	const neg = totalSeconds < 0;
	let s = Math.round(Math.abs(totalSeconds));
	const h = Math.floor(s / 3600);
	s -= h * 3600;
	const m = Math.floor(s / 60);
	s -= m * 60;
	const parts: string[] = [];
	if (h) parts.push(`${h}h`);
	if (h || m) parts.push(`${String(m).padStart(h ? 2 : 1, '0')}m`);
	parts.push(`${String(s).padStart(h || m ? 2 : 1, '0')}s`);
	return (neg ? '−' : '') + parts.join(' ');
}

/** Seconds → "01:04:30" clock form. */
export function clock(totalSeconds: number, forceHours = false): string {
	const neg = totalSeconds < 0;
	let s = Math.floor(Math.abs(totalSeconds));
	const h = Math.floor(s / 3600);
	s -= h * 3600;
	const m = Math.floor(s / 60);
	s -= m * 60;
	const mm = String(m).padStart(2, '0');
	const ss = String(s).padStart(2, '0');
	return `${neg ? '−' : ''}${h || forceHours ? `${String(h).padStart(2, '0')}:` : ''}${mm}:${ss}`;
}

/** Bytes → "1.4 MB" (decimal) or "1.3 MiB" (binary). */
export function bytes(n: number, binary = false): string {
	const base = binary ? 1024 : 1000;
	const units = binary
		? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
		: ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
	let i = 0;
	let v = Math.abs(n);
	while (v >= base && i < units.length - 1) {
		v /= base;
		i++;
	}
	return `${(n < 0 ? -v : v).toLocaleString('en-US', { maximumFractionDigits: i === 0 ? 0 : 2 })} ${units[i]}`;
}

export function ordinal(n: number): string {
	const abs = Math.abs(Math.trunc(n));
	const rem100 = abs % 100;
	if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
	switch (abs % 10) {
		case 1:
			return `${n}st`;
		case 2:
			return `${n}nd`;
		case 3:
			return `${n}rd`;
		default:
			return `${n}th`;
	}
}

/** Parse loose numeric input: "1,234.5", "1 1/2", "3/4", "2½". */
export function parseLooseNumber(input: string): number {
	const raw = input.trim().replace(/,/g, '').replace(/−/g, '-');
	if (!raw) return NaN;

	const vulgarMap: Record<string, string> = {
		'½': '1/2',
		'⅓': '1/3',
		'⅔': '2/3',
		'¼': '1/4',
		'¾': '3/4',
		'⅛': '1/8',
		'⅜': '3/8',
		'⅝': '5/8',
		'⅞': '7/8',
		'⅙': '1/6',
		'⅚': '5/6'
	};
	let s = raw;
	for (const [glyph, plain] of Object.entries(vulgarMap)) {
		s = s.replace(glyph, (m, offset: number) => (offset > 0 && /\d/.test(s[offset - 1]) ? ' ' : '') + plain);
	}

	// "1 1/2"
	const mixed = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
	if (mixed) {
		const w = Number(mixed[1]);
		const v = Number(mixed[2]) / Number(mixed[3]);
		return w < 0 ? w - v : w + v;
	}
	// "3/4"
	const frac = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
	if (frac) return Number(frac[1]) / Number(frac[2]);

	const n = Number(s);
	return Number.isFinite(n) ? n : NaN;
}
