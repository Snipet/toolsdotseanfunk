/** Number-theory and number-writing helpers shared by several tools. */

const ONES = [
	'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
	'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
	'nineteen'
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'];

function chunkToWords(n: number): string {
	if (n === 0) return '';
	if (n < 20) return ONES[n];
	if (n < 100) {
		const t = TENS[Math.floor(n / 10)];
		const r = n % 10;
		return r ? `${t}-${ONES[r]}` : t;
	}
	const h = `${ONES[Math.floor(n / 100)]} hundred`;
	const rest = n % 100;
	return rest ? `${h} ${chunkToWords(rest)}` : h;
}

/**
 * Write an integer out in English.
 * Uses the short scale and the American convention of no "and" between the
 * hundreds and the tens, which is what cheque-writing guides specify.
 */
export function integerToWords(value: number): string {
	if (!Number.isFinite(value)) return '';
	const n = Math.trunc(Math.abs(value));
	if (n === 0) return value < 0 ? 'negative zero' : 'zero';
	if (n >= 1e18) return 'number too large';

	const chunks: string[] = [];
	let rest = n;
	let scale = 0;
	while (rest > 0) {
		const chunk = rest % 1000;
		if (chunk) {
			const words = chunkToWords(chunk);
			chunks.unshift(scale ? `${words} ${SCALES[scale]}` : words);
		}
		rest = Math.floor(rest / 1000);
		scale++;
	}
	return (value < 0 ? 'negative ' : '') + chunks.join(' ');
}

/** Full number-to-words including a decimal part, read digit by digit. */
export function numberToWords(value: number): string {
	if (!Number.isFinite(value)) return '';
	const [whole, frac] = String(Math.abs(value)).split('.');
	const head = integerToWords(Number(whole) * (value < 0 ? -1 : 1));
	if (!frac) return head;
	const digits = frac.split('').map((d) => ONES[Number(d)]).join(' ');
	return `${head} point ${digits}`;
}

/** Cheque style: "One thousand two hundred and 34/100 dollars". */
export function currencyToWords(value: number, unit = 'dollars'): string {
	const negative = value < 0;
	const cents = Math.round(Math.abs(value) * 100);
	const whole = Math.floor(cents / 100);
	const rest = cents % 100;
	const head = integerToWords(whole);
	const capitalised = head.charAt(0).toUpperCase() + head.slice(1);
	return `${negative ? 'Negative ' : ''}${capitalised} and ${String(rest).padStart(2, '0')}/100 ${unit}`;
}

/** Trial division, fast enough for anything a browser input can hold. */
export function isPrime(n: number): boolean {
	if (!Number.isInteger(n) || n < 2) return false;
	if (n < 4) return true;
	if (n % 2 === 0) return false;
	const limit = Math.sqrt(n);
	for (let i = 3; i <= limit; i += 2) if (n % i === 0) return false;
	return true;
}

export interface PrimeFactor {
	prime: number;
	exponent: number;
}

export function primeFactors(n: number): PrimeFactor[] {
	const out: PrimeFactor[] = [];
	let rest = Math.abs(Math.trunc(n));
	if (rest < 2) return out;

	const push = (p: number) => {
		let exponent = 0;
		while (rest % p === 0) {
			rest /= p;
			exponent++;
		}
		if (exponent) out.push({ prime: p, exponent });
	};

	push(2);
	push(3);
	// 6k ± 1 wheel — every prime above 3 has one of these two forms.
	for (let i = 5; i * i <= rest; i += 6) {
		push(i);
		push(i + 2);
	}
	if (rest > 1) out.push({ prime: rest, exponent: 1 });
	return out;
}

/** All divisors of n, ascending. Returns [] for n < 1. */
export function divisors(n: number): number[] {
	const target = Math.abs(Math.trunc(n));
	if (target < 1) return [];
	const small: number[] = [];
	const large: number[] = [];
	for (let i = 1; i * i <= target; i++) {
		if (target % i === 0) {
			small.push(i);
			if (i !== target / i) large.push(target / i);
		}
	}
	return [...small, ...large.reverse()];
}

/** Euclid's algorithm, keeping each step so the tool can show the work. */
export function gcdSteps(a: number, b: number): Array<{ a: number; b: number; r: number }> {
	const steps: Array<{ a: number; b: number; r: number }> = [];
	let x = Math.abs(Math.trunc(a));
	let y = Math.abs(Math.trunc(b));
	while (y !== 0 && steps.length < 200) {
		const r = x % y;
		steps.push({ a: x, b: y, r });
		x = y;
		y = r;
	}
	return steps;
}

/** Convert to any base 2–36, handling fractions to a fixed depth. */
export function toBaseString(value: number, base: number, fractionDigits = 12): string {
	if (!Number.isFinite(value)) return '';
	const negative = value < 0;
	const abs = Math.abs(value);
	const whole = Math.floor(abs);
	let out = whole.toString(base).toUpperCase();

	let frac = abs - whole;
	if (frac > 0) {
		out += '.';
		for (let i = 0; i < fractionDigits && frac > 0; i++) {
			frac *= base;
			const digit = Math.floor(frac);
			out += digit.toString(base).toUpperCase();
			frac -= digit;
		}
	}
	return (negative ? '-' : '') + out;
}

/** Parse a string in any base 2–36. Returns NaN when a digit is out of range. */
export function fromBaseString(text: string, base: number): number {
	const clean = text.trim().replace(/[\s_]/g, '');
	if (!clean) return NaN;
	const negative = clean.startsWith('-');
	const body = negative ? clean.slice(1) : clean;
	const [whole, frac] = body.split('.');

	const digitValue = (c: string) => {
		const v = parseInt(c, 36);
		return Number.isNaN(v) || v >= base ? NaN : v;
	};

	let result = 0;
	for (const c of whole ?? '') {
		const v = digitValue(c);
		if (Number.isNaN(v)) return NaN;
		result = result * base + v;
	}
	if (frac) {
		let scale = 1 / base;
		for (const c of frac) {
			const v = digitValue(c);
			if (Number.isNaN(v)) return NaN;
			result += v * scale;
			scale /= base;
		}
	}
	return negative ? -result : result;
}
