/** Date arithmetic shared by the date & time tools. */

export const MS_PER_DAY = 86400000;

/** Midnight local time, so day counts are not skewed by time-of-day or DST. */
export function startOfDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isoDate(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseIsoDate(value: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
	if (!m) return null;
	const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	// Reject impossible dates that JS would silently roll over (2025-02-30).
	if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1) return null;
	return d;
}

/**
 * Whole days between two dates, counted at midnight so daylight-saving
 * transitions cannot produce a 0.958-day result.
 */
export function daysBetween(a: Date, b: Date): number {
	return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY);
}

export interface CalendarDiff {
	years: number;
	months: number;
	days: number;
	totalDays: number;
	totalMonths: number;
	totalWeeks: number;
}

/**
 * Calendar difference in years, months and days.
 *
 * Counts whole months first, then the leftover days from that anchor. This
 * avoids the borrowing ambiguity that bites at month ends: 31 Jan → 1 Mar
 * is "1 month, 1 day", because 31 Jan plus one month lands on 28 Feb.
 */
export function calendarDiff(from: Date, to: Date): CalendarDiff {
	const start = startOfDay(from);
	const end = startOfDay(to);
	const reversed = end < start;
	const a = reversed ? end : start;
	const b = reversed ? start : end;

	let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
	if (addMonths(a, months) > b) months -= 1;

	const anchor = addMonths(a, months);
	const days = daysBetween(anchor, b);

	const totalDays = daysBetween(a, b);
	const sign = reversed ? -1 : 1;

	return {
		years: Math.floor(months / 12) * sign,
		months: (months % 12) * sign,
		days: days * sign,
		totalDays: totalDays * sign,
		totalMonths: months * sign,
		totalWeeks: Math.floor(totalDays / 7) * sign
	};
}

export function addDays(d: Date, days: number): Date {
	const out = new Date(d);
	out.setDate(out.getDate() + days);
	return out;
}

/**
 * Add months, clamping to the end of the target month rather than rolling
 * over: 31 Jan + 1 month is 28/29 Feb, not 2/3 Mar.
 */
export function addMonths(d: Date, months: number): Date {
	const day = d.getDate();
	const out = new Date(d.getFullYear(), d.getMonth() + months, 1, d.getHours(), d.getMinutes(), d.getSeconds());
	const daysInTarget = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
	out.setDate(Math.min(day, daysInTarget));
	return out;
}

export function isWeekend(d: Date): boolean {
	const day = d.getDay();
	return day === 0 || day === 6;
}

export function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** ISO 8601 week number: weeks start Monday, week 1 contains the first Thursday. */
export function isoWeek(date: Date): number {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
}

/** The year the ISO week belongs to, which can differ at year boundaries. */
export function isoWeekYear(date: Date): number {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
	return d.getUTCFullYear();
}

export function dayOfYear(date: Date): number {
	return daysBetween(new Date(date.getFullYear(), 0, 1), date) + 1;
}

export function daysInYear(year: number): number {
	return isLeapYear(year) ? 366 : 365;
}

/**
 * Business days between two dates, inclusive of the start and exclusive of
 * the end, skipping weekends and any supplied holidays.
 */
export function businessDaysBetween(from: Date, to: Date, holidays: Date[] = []): number {
	const holidaySet = new Set(holidays.map((h) => isoDate(startOfDay(h))));
	const start = startOfDay(from);
	const end = startOfDay(to);
	const step = end >= start ? 1 : -1;
	let count = 0;
	let cursor = new Date(start);

	// Bounded so a pathological range cannot spin forever.
	let guard = 0;
	while (cursor.getTime() !== end.getTime() && guard++ < 200000) {
		if (step === 1) {
			if (!isWeekend(cursor) && !holidaySet.has(isoDate(cursor))) count++;
			cursor = addDays(cursor, 1);
		} else {
			cursor = addDays(cursor, -1);
			if (!isWeekend(cursor) && !holidaySet.has(isoDate(cursor))) count--;
		}
	}
	return count;
}

/** Add or subtract business days, skipping weekends and holidays. */
export function addBusinessDays(from: Date, days: number, holidays: Date[] = []): Date {
	const holidaySet = new Set(holidays.map((h) => isoDate(startOfDay(h))));
	const step = days >= 0 ? 1 : -1;
	let remaining = Math.abs(days);
	let cursor = startOfDay(from);
	let guard = 0;

	while (remaining > 0 && guard++ < 200000) {
		cursor = addDays(cursor, step);
		if (!isWeekend(cursor) && !holidaySet.has(isoDate(cursor))) remaining--;
	}
	return cursor;
}
