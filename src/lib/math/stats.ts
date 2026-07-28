/** Statistics helpers: descriptive summaries, distributions and regression. */

export interface Summary {
	n: number;
	sum: number;
	mean: number;
	median: number;
	modes: number[];
	min: number;
	max: number;
	range: number;
	q1: number;
	q3: number;
	iqr: number;
	/** Sample standard deviation (n − 1 denominator). */
	sd: number;
	/** Population standard deviation (n denominator). */
	sdPopulation: number;
	variance: number;
	variancePopulation: number;
	/** Standard error of the mean. */
	sem: number;
	skewness: number;
	outliers: number[];
	sorted: number[];
}

/** Parse numbers out of free-form pasted data: commas, spaces, newlines, tabs. */
export function parseNumbers(input: string): number[] {
	return input
		.split(/[\s,;]+/)
		.map((token) => token.trim())
		// Number('') is 0, so empty tokens must go before conversion, not after.
		.filter((token) => token !== '')
		.map(Number)
		.filter((value) => Number.isFinite(value));
}

/**
 * Quantile by linear interpolation between order statistics — the method
 * used by R's type 7 and by NumPy's default, so results match those tools.
 */
export function quantile(sorted: number[], p: number): number {
	if (!sorted.length) return NaN;
	if (sorted.length === 1) return sorted[0];
	const pos = (sorted.length - 1) * p;
	const base = Math.floor(pos);
	const rest = pos - base;
	return sorted[base + 1] !== undefined
		? sorted[base] + rest * (sorted[base + 1] - sorted[base])
		: sorted[base];
}

export function summarize(values: number[]): Summary | null {
	const n = values.length;
	if (!n) return null;

	const sorted = [...values].sort((a, b) => a - b);
	const sum = values.reduce((a, b) => a + b, 0);
	const mean = sum / n;

	const median = quantile(sorted, 0.5);
	const q1 = quantile(sorted, 0.25);
	const q3 = quantile(sorted, 0.75);
	const iqr = q3 - q1;

	const counts = new Map<number, number>();
	for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
	const maxCount = Math.max(...counts.values());
	// Every value appearing once means there is no mode, not that all are modes.
	const modes =
		maxCount === 1 ? [] : [...counts.entries()].filter(([, c]) => c === maxCount).map(([v]) => v).sort((a, b) => a - b);

	const squaredDeviations = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
	const variancePopulation = squaredDeviations / n;
	const variance = n > 1 ? squaredDeviations / (n - 1) : 0;
	const sd = Math.sqrt(variance);
	const sdPopulation = Math.sqrt(variancePopulation);

	const skewness =
		n > 2 && sd > 0
			? (n / ((n - 1) * (n - 2))) * values.reduce((acc, v) => acc + ((v - mean) / sd) ** 3, 0)
			: 0;

	// Tukey's fences: the standard 1.5 × IQR rule.
	const lowFence = q1 - 1.5 * iqr;
	const highFence = q3 + 1.5 * iqr;
	const outliers = sorted.filter((v) => v < lowFence || v > highFence);

	return {
		n, sum, mean, median, modes,
		min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0],
		q1, q3, iqr, sd, sdPopulation, variance, variancePopulation,
		sem: n > 0 ? sd / Math.sqrt(n) : 0,
		skewness, outliers, sorted
	};
}

// ---------------------------------------------------------------------------
// Normal distribution
// ---------------------------------------------------------------------------

export function normalPdf(x: number, mean = 0, sd = 1): number {
	const z = (x - mean) / sd;
	return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/**
 * P(X ≤ x) for a normal distribution.
 *
 * Graeme West's implementation of Hart's algorithm — accurate to roughly
 * 1 × 10⁻¹⁵ across the whole range, rather than the 1 × 10⁻⁷ of the usual
 * Abramowitz & Stegun polynomial. Stats tools report p-values, so the extra
 * precision is worth the extra constants.
 */
export function normalCdf(x: number, mean = 0, sd = 1): number {
	const z = (x - mean) / sd;
	const az = Math.abs(z);
	let upperTail: number;

	if (az > 37) {
		upperTail = 0;
	} else {
		const e = Math.exp(-(az * az) / 2);
		if (az < 7.07106781186547) {
			let b = 3.52624965998911e-2 * az + 0.700383064443688;
			b = b * az + 6.37396220353165;
			b = b * az + 33.912866078383;
			b = b * az + 112.079291497871;
			b = b * az + 221.213596169931;
			b = b * az + 220.206867912376;
			let d = 8.83883476483184e-2 * az + 1.75566716318264;
			d = d * az + 16.064177579207;
			d = d * az + 86.7807322029461;
			d = d * az + 296.564248779674;
			d = d * az + 637.333633378831;
			d = d * az + 793.826512519948;
			d = d * az + 440.413735824752;
			upperTail = (e * b) / d;
		} else {
			// Continued fraction for the far tail.
			let b = az + 0.65;
			b = az + 4 / b;
			b = az + 3 / b;
			b = az + 2 / b;
			b = az + 1 / b;
			upperTail = e / (b * 2.506628274631);
		}
	}

	return z > 0 ? 1 - upperTail : upperTail;
}

/** Error function, derived from the high-precision normal CDF. */
export function erf(x: number): number {
	return 2 * normalCdf(x * Math.SQRT2) - 1;
}

/**
 * Inverse normal CDF (probit), Acklam's rational approximation refined by a
 * single Halley step — accurate to roughly 1 × 10⁻¹⁵.
 */
export function normalInv(p: number, mean = 0, sd = 1): number {
	if (p <= 0) return -Infinity;
	if (p >= 1) return Infinity;

	const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
	const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
	const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
	const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

	const pLow = 0.02425;
	const pHigh = 1 - pLow;
	let q: number;
	let r: number;
	let x: number;

	if (p < pLow) {
		q = Math.sqrt(-2 * Math.log(p));
		x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
			((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
	} else if (p <= pHigh) {
		q = p - 0.5;
		r = q * q;
		x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
			(((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
	} else {
		q = Math.sqrt(-2 * Math.log(1 - p));
		x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
			((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
	}

	// One Halley refinement against the (more accurate) CDF.
	const e = normalCdf(x) - p;
	const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
	x = x - u / (1 + (x * u) / 2);

	return mean + sd * x;
}

// ---------------------------------------------------------------------------
// Combinatorics
// ---------------------------------------------------------------------------

/** log Γ(z), Lanczos — keeps big factorials from overflowing. */
export function logGamma(z: number): number {
	const g = 7;
	const C = [
		0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
		-176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
		1.5056327351493116e-7
	];
	if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
	z -= 1;
	let x = C[0];
	for (let i = 1; i < g + 2; i++) x += C[i] / (z + i);
	const t = z + g + 0.5;
	return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

export function factorial(n: number): number {
	if (n < 0 || !Number.isInteger(n)) return NaN;
	if (n > 170) return Infinity;
	let r = 1;
	for (let i = 2; i <= n; i++) r *= i;
	return r;
}

export function combinations(n: number, r: number): number {
	if (r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) return NaN;
	if (r === 0 || r === n) return 1;
	// Exact for small inputs, log-gamma for large ones.
	if (n <= 170) {
		let result = 1;
		const k = Math.min(r, n - r);
		for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
		return Math.round(result);
	}
	return Math.exp(logGamma(n + 1) - logGamma(r + 1) - logGamma(n - r + 1));
}

export function permutations(n: number, r: number): number {
	if (r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) return NaN;
	if (n <= 170) {
		let result = 1;
		for (let i = 0; i < r; i++) result *= n - i;
		return result;
	}
	return Math.exp(logGamma(n + 1) - logGamma(n - r + 1));
}

export function binomialPmf(k: number, n: number, p: number): number {
	if (k < 0 || k > n) return 0;
	return combinations(n, k) * p ** k * (1 - p) ** (n - k);
}

// ---------------------------------------------------------------------------
// Regression
// ---------------------------------------------------------------------------

export interface Regression {
	slope: number;
	intercept: number;
	r: number;
	r2: number;
	/** Standard error of the estimate. */
	se: number;
	n: number;
	predict: (x: number) => number;
}

export function linearRegression(points: Array<{ x: number; y: number }>): Regression | null {
	const n = points.length;
	if (n < 2) return null;

	const meanX = points.reduce((a, p) => a + p.x, 0) / n;
	const meanY = points.reduce((a, p) => a + p.y, 0) / n;

	let sxy = 0;
	let sxx = 0;
	let syy = 0;
	for (const p of points) {
		sxy += (p.x - meanX) * (p.y - meanY);
		sxx += (p.x - meanX) ** 2;
		syy += (p.y - meanY) ** 2;
	}
	if (sxx === 0) return null;

	const slope = sxy / sxx;
	const intercept = meanY - slope * meanX;
	const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
	const residualSum = points.reduce((a, p) => a + (p.y - (slope * p.x + intercept)) ** 2, 0);

	return {
		slope,
		intercept,
		r,
		r2: r * r,
		se: n > 2 ? Math.sqrt(residualSum / (n - 2)) : 0,
		n,
		predict: (x: number) => slope * x + intercept
	};
}

/** Exact distribution of the sum of `count` dice with `sides` faces each. */
export function diceSumDistribution(count: number, sides: number): Map<number, number> {
	let dist = new Map<number, number>([[0, 1]]);
	for (let d = 0; d < count; d++) {
		const next = new Map<number, number>();
		for (const [sum, ways] of dist) {
			for (let face = 1; face <= sides; face++) {
				next.set(sum + face, (next.get(sum + face) ?? 0) + ways);
			}
		}
		dist = next;
	}
	return dist;
}
