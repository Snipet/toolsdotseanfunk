import { describe, expect, it } from 'vitest';
import {
	aprToApy,
	apyToApr,
	buildSchedule,
	cagr,
	contributionForGoal,
	futureValue,
	irr,
	npv,
	periodicPayment,
	periodsToPayoff
} from './finance';

describe('periodicPayment', () => {
	it('matches the textbook 30-year mortgage', () => {
		// $200,000 at 6% nominal for 30 years → $1,199.10/month.
		expect(periodicPayment(200000, 0.06 / 12, 360)).toBeCloseTo(1199.1, 1);
	});

	it('matches a 5-year car loan', () => {
		expect(periodicPayment(25000, 0.05 / 12, 60)).toBeCloseTo(471.78, 2);
	});

	it('degenerates correctly at a zero rate', () => {
		expect(periodicPayment(1200, 0, 12)).toBe(100);
	});
});

describe('amortization schedule', () => {
	const schedule = buildSchedule(200000, 0.06 / 12, 360);

	it('runs for the full term and ends at zero', () => {
		expect(schedule).toHaveLength(360);
		expect(schedule[359].balance).toBeCloseTo(0, 6);
	});

	it('starts mostly interest and ends mostly principal', () => {
		expect(schedule[0].interest).toBeGreaterThan(schedule[0].principal);
		expect(schedule[359].principal).toBeGreaterThan(schedule[359].interest);
		expect(schedule[0].interest).toBeCloseTo(1000, 6); // 200000 × 0.005
	});

	it('totals the expected interest', () => {
		expect(schedule[359].cumulativeInterest).toBeCloseTo(231676.38, 0);
	});

	it('shortens the term when extra principal is paid', () => {
		const accelerated = buildSchedule(200000, 0.06 / 12, 360, 200);
		expect(accelerated.length).toBeLessThan(360);
		expect(accelerated[accelerated.length - 1].cumulativeInterest).toBeLessThan(
			schedule[359].cumulativeInterest
		);
		expect(accelerated[accelerated.length - 1].balance).toBeCloseTo(0, 6);
	});

	it('never overshoots on the final payment', () => {
		for (const row of schedule) expect(row.balance).toBeGreaterThanOrEqual(0);
	});
});

describe('periodsToPayoff', () => {
	it('inverts periodicPayment', () => {
		const payment = periodicPayment(10000, 0.01, 24);
		expect(periodsToPayoff(10000, 0.01, payment)).toBeCloseTo(24, 6);
	});

	it('returns Infinity when the payment cannot cover the interest', () => {
		// $5,000 at 2%/month accrues $100; paying $80 never clears it.
		expect(periodsToPayoff(5000, 0.02, 80)).toBe(Infinity);
		expect(periodsToPayoff(5000, 0.02, 0)).toBe(Infinity);
	});
});

describe('future value', () => {
	it('compounds a lump sum', () => {
		expect(futureValue(1000, 0.05, 10)).toBeCloseTo(1628.89, 2);
	});

	it('adds an ordinary annuity', () => {
		// $100/month for 10 years at 6% nominal.
		expect(futureValue(0, 0.06 / 12, 120, 100)).toBeCloseTo(16387.93, 2);
	});

	it('pays more when contributions come at the start of the period', () => {
		const end = futureValue(0, 0.06 / 12, 120, 100, false);
		const start = futureValue(0, 0.06 / 12, 120, 100, true);
		expect(start).toBeGreaterThan(end);
		expect(start / end).toBeCloseTo(1 + 0.06 / 12, 10);
	});

	it('handles a zero rate', () => {
		expect(futureValue(500, 0, 12, 100)).toBe(1700);
	});
});

describe('contributionForGoal', () => {
	it('inverts futureValue', () => {
		const contribution = contributionForGoal(50000, 5000, 0.05 / 12, 120);
		expect(futureValue(5000, 0.05 / 12, 120, contribution)).toBeCloseTo(50000, 4);
	});
});

describe('rate conversions', () => {
	it('converts APR to APY', () => {
		expect(aprToApy(0.12, 12)).toBeCloseTo(0.126825, 6);
		expect(aprToApy(0.05, 1)).toBeCloseTo(0.05, 10);
		expect(aprToApy(0.05, 0)).toBeCloseTo(Math.exp(0.05) - 1, 10); // continuous
	});

	it('round-trips APR and APY', () => {
		for (const compounds of [1, 4, 12, 365]) {
			expect(apyToApr(aprToApy(0.075, compounds), compounds)).toBeCloseTo(0.075, 12);
		}
	});
});

describe('returns', () => {
	it('computes CAGR', () => {
		expect(cagr(1000, 2000, 10)).toBeCloseTo(0.071773, 6);
		expect(cagr(100, 100, 5)).toBeCloseTo(0, 12);
	});

	it('computes NPV and IRR consistently', () => {
		const flows = [-1000, 300, 400, 500, 600];
		const rate = irr(flows);
		expect(rate).toBeCloseTo(0.24886, 4);
		expect(npv(rate, flows)).toBeCloseTo(0, 6);
	});

	it('returns NaN for cash flows with no sign change', () => {
		expect(Number.isNaN(irr([100, 200, 300]))).toBe(true);
	});
});
