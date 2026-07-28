/** Loan, investment and everyday money math. */

export interface Payment {
	number: number;
	payment: number;
	interest: number;
	principal: number;
	balance: number;
	cumulativeInterest: number;
}

/**
 * Standard amortising payment.
 *
 *   P = L · i / (1 − (1 + i)^−n)
 *
 * where i is the periodic rate and n the number of periods. A zero rate
 * degenerates to simple division, which the formula cannot express.
 */
export function periodicPayment(principal: number, periodicRate: number, periods: number): number {
	if (periods <= 0) return NaN;
	if (periodicRate === 0) return principal / periods;
	return (principal * periodicRate) / (1 - Math.pow(1 + periodicRate, -periods));
}

/** Number of periods to clear a balance at a fixed payment. Infinity if it never clears. */
export function periodsToPayoff(principal: number, periodicRate: number, payment: number): number {
	if (payment <= 0) return Infinity;
	if (periodicRate === 0) return principal / payment;
	// The payment must at least cover the interest accruing each period.
	if (payment <= principal * periodicRate) return Infinity;
	return -Math.log(1 - (principal * periodicRate) / payment) / Math.log(1 + periodicRate);
}

export function buildSchedule(
	principal: number,
	periodicRate: number,
	periods: number,
	extraPerPeriod = 0
): Payment[] {
	const base = periodicPayment(principal, periodicRate, periods);
	if (!Number.isFinite(base)) return [];

	const schedule: Payment[] = [];
	let balance = principal;
	let cumulativeInterest = 0;

	// Cap the loop well above any realistic term so a pathological rate cannot hang the page.
	for (let n = 1; n <= Math.min(periods, 2400) && balance > 0.005; n++) {
		const interest = balance * periodicRate;
		let payment = base + extraPerPeriod;
		let principalPart = payment - interest;
		// Final payment: never overshoot the remaining balance.
		if (principalPart > balance) {
			principalPart = balance;
			payment = principalPart + interest;
		}
		balance -= principalPart;
		cumulativeInterest += interest;
		schedule.push({
			number: n,
			payment,
			interest,
			principal: principalPart,
			balance: Math.max(0, balance),
			cumulativeInterest
		});
	}
	return schedule;
}

/** Future value with regular contributions, made at the start or end of each period. */
export function futureValue(
	present: number,
	periodicRate: number,
	periods: number,
	contribution = 0,
	atStart = false
): number {
	const growth = Math.pow(1 + periodicRate, periods);
	if (periodicRate === 0) return present + contribution * periods;
	const annuity = contribution * ((growth - 1) / periodicRate) * (atStart ? 1 + periodicRate : 1);
	return present * growth + annuity;
}

/** Contribution per period needed to reach a target. */
export function contributionForGoal(
	target: number,
	present: number,
	periodicRate: number,
	periods: number
): number {
	if (periods <= 0) return NaN;
	if (periodicRate === 0) return (target - present) / periods;
	const growth = Math.pow(1 + periodicRate, periods);
	return (target - present * growth) / ((growth - 1) / periodicRate);
}

/** Nominal annual rate → effective annual rate for a given compounding frequency. */
export function aprToApy(apr: number, compoundsPerYear: number): number {
	if (compoundsPerYear <= 0) return Math.exp(apr) - 1; // continuous
	return Math.pow(1 + apr / compoundsPerYear, compoundsPerYear) - 1;
}

export function apyToApr(apy: number, compoundsPerYear: number): number {
	if (compoundsPerYear <= 0) return Math.log(1 + apy);
	return compoundsPerYear * (Math.pow(1 + apy, 1 / compoundsPerYear) - 1);
}

/** Compound annual growth rate between two values over a number of years. */
export function cagr(start: number, end: number, years: number): number {
	if (start <= 0 || years <= 0) return NaN;
	return Math.pow(end / start, 1 / years) - 1;
}

/** Net present value of a series of cash flows, flow 0 at t = 0. */
export function npv(rate: number, flows: number[]): number {
	return flows.reduce((acc, flow, t) => acc + flow / Math.pow(1 + rate, t), 0);
}

/** Internal rate of return by bisection — robust where Newton's method is not. */
export function irr(flows: number[], guessLow = -0.9999, guessHigh = 10): number {
	let lo = guessLow;
	let hi = guessHigh;
	let fLo = npv(lo, flows);
	let fHi = npv(hi, flows);
	if (fLo * fHi > 0) return NaN; // no sign change: no root to find in this bracket

	for (let i = 0; i < 200; i++) {
		const mid = (lo + hi) / 2;
		const fMid = npv(mid, flows);
		if (Math.abs(fMid) < 1e-9) return mid;
		if (fLo * fMid < 0) {
			hi = mid;
			fHi = fMid;
		} else {
			lo = mid;
			fLo = fMid;
		}
	}
	return (lo + hi) / 2;
}
