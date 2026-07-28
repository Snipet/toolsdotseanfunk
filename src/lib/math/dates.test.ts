import { describe, expect, it } from 'vitest';
import {
	addBusinessDays,
	addMonths,
	businessDaysBetween,
	calendarDiff,
	dayOfYear,
	daysBetween,
	isLeapYear,
	isoWeek,
	parseIsoDate
} from './dates';

const d = (s: string) => parseIsoDate(s)!;

describe('parseIsoDate', () => {
	it('parses valid dates', () => {
		expect(parseIsoDate('2026-07-28')?.getMonth()).toBe(6);
	});

	it('rejects dates that would silently roll over', () => {
		expect(parseIsoDate('2025-02-30')).toBeNull();
		expect(parseIsoDate('2025-13-01')).toBeNull();
		expect(parseIsoDate('not a date')).toBeNull();
	});
});

describe('daysBetween', () => {
	it('counts whole days', () => {
		expect(daysBetween(d('2026-01-01'), d('2026-01-31'))).toBe(30);
		expect(daysBetween(d('2026-01-31'), d('2026-01-01'))).toBe(-30);
		expect(daysBetween(d('2026-01-01'), d('2026-01-01'))).toBe(0);
	});

	it('handles leap years', () => {
		expect(daysBetween(d('2024-01-01'), d('2025-01-01'))).toBe(366);
		expect(daysBetween(d('2025-01-01'), d('2026-01-01'))).toBe(365);
	});
});

describe('calendarDiff', () => {
	it('reports years, months and days', () => {
		const diff = calendarDiff(d('1990-06-15'), d('2026-07-28'));
		expect(diff.years).toBe(36);
		expect(diff.months).toBe(1);
		expect(diff.days).toBe(13);
	});

	it('borrows from the previous month', () => {
		const diff = calendarDiff(d('2026-01-31'), d('2026-03-01'));
		expect(diff.years).toBe(0);
		expect(diff.months).toBe(1);
		expect(diff.days).toBe(1);
	});

	it('handles same-day anniversaries', () => {
		const diff = calendarDiff(d('2000-02-29'), d('2024-02-29'));
		expect(diff.years).toBe(24);
		expect(diff.months).toBe(0);
		expect(diff.days).toBe(0);
	});

	it('is signed when the dates are reversed', () => {
		expect(calendarDiff(d('2026-07-28'), d('2026-01-01')).totalDays).toBeLessThan(0);
	});
});

describe('addMonths', () => {
	it('clamps to the end of a shorter month', () => {
		expect(addMonths(d('2026-01-31'), 1).getMonth()).toBe(1);
		expect(addMonths(d('2026-01-31'), 1).getDate()).toBe(28);
		expect(addMonths(d('2024-01-31'), 1).getDate()).toBe(29); // leap year
	});

	it('handles year rollover in both directions', () => {
		expect(addMonths(d('2026-12-15'), 1).getFullYear()).toBe(2027);
		expect(addMonths(d('2026-01-15'), -1).getFullYear()).toBe(2025);
	});
});

describe('leap years', () => {
	it('applies the full Gregorian rule', () => {
		expect(isLeapYear(2024)).toBe(true);
		expect(isLeapYear(2025)).toBe(false);
		expect(isLeapYear(1900)).toBe(false); // divisible by 100
		expect(isLeapYear(2000)).toBe(true); // divisible by 400
	});
});

describe('ISO week numbers', () => {
	it('matches the standard edge cases', () => {
		// 2026-01-01 is a Thursday, so it belongs to week 1.
		expect(isoWeek(d('2026-01-01'))).toBe(1);
		// 2021-01-01 is a Friday, so it belongs to week 53 of 2020.
		expect(isoWeek(d('2021-01-01'))).toBe(53);
		expect(isoWeek(d('2026-07-28'))).toBe(31);
	});
});

describe('day of year', () => {
	it('counts from 1', () => {
		expect(dayOfYear(d('2026-01-01'))).toBe(1);
		expect(dayOfYear(d('2026-12-31'))).toBe(365);
		expect(dayOfYear(d('2024-12-31'))).toBe(366);
	});
});

describe('business days', () => {
	it('skips weekends', () => {
		// Monday 2026-07-27 to Monday 2026-08-03 is five working days.
		expect(businessDaysBetween(d('2026-07-27'), d('2026-08-03'))).toBe(5);
	});

	it('honours a holiday list', () => {
		expect(businessDaysBetween(d('2026-07-27'), d('2026-08-03'), [d('2026-07-29')])).toBe(4);
	});

	it('adds business days, skipping the weekend', () => {
		// Friday + 1 business day is Monday.
		expect(addBusinessDays(d('2026-07-31'), 1).getDate()).toBe(3);
		expect(addBusinessDays(d('2026-07-31'), 1).getMonth()).toBe(7);
	});

	it('subtracts business days', () => {
		// Monday − 1 business day is the previous Friday.
		expect(addBusinessDays(d('2026-08-03'), -1).getDate()).toBe(31);
	});
});
