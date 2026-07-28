/**
 * The answer-first omnibox.
 *
 * Typing "3 tbsp to tsp" should show "9 teaspoons" in the dropdown, not a list
 * of links to a converter. This module turns a raw query string into zero or
 * more instant answers, each with a deep link to the full tool pre-filled with
 * the same inputs.
 */

import { convert, findUnit, formatNumber, unitLabel, conversionFormula } from './units/units';
import { compile, ExpressionError } from './math/expression';
import { formatFraction, ordinal } from './format';
import { CONVERTER_PAIRS } from './catalog';

export interface Answer {
	/** Short label above the answer, e.g. "Volume conversion". */
	kind: string;
	/** The answer itself, large and copyable. */
	value: string;
	/** Restatement of the question, shown small above the value. */
	question: string;
	/** Formula or footnote shown under the value. */
	detail?: string;
	/** Link to the full tool with state pre-filled. */
	href: string;
	hrefLabel: string;
}

const CONNECTORS = /\s+(?:to|in|into|as|=|->|→|>)\s+/i;

/** Best converter destination for a unit pair: a dedicated page if one exists. */
function converterHref(fromId: string, toId: string, value: number, dimensionId: string): string {
	const hasPair = CONVERTER_PAIRS.some(([f, x]) => f === fromId && x === toId);
	const q = `?value=${encodeURIComponent(String(value))}`;
	if (hasPair) return `/convert/${fromId}-to-${toId}${q}`;
	return `/convert/${dimensionId}${q}&from=${fromId}&to=${toId}`;
}

function unitConversion(query: string): Answer | undefined {
	const parts = query.split(CONNECTORS);
	if (parts.length !== 2) return undefined;

	const left = parts[0].trim();
	const rightRaw = parts[1].trim();

	// "3 tbsp" / "72°F" / "12.5 kilometres" / "tbsp" (implicit 1)
	const m = /^(-?[\d.,]+(?:\s*\/\s*\d+)?(?:e[+-]?\d+)?)?\s*(.+)$/i.exec(left);
	if (!m) return undefined;
	const value = m[1] ? Number(m[1].replace(/,/g, '')) : 1;
	if (!Number.isFinite(value)) return undefined;

	const from = findUnit(m[2]);
	const to = findUnit(rightRaw);
	if (!from || !to) return undefined;
	if (from.dimension.id !== to.dimension.id) return undefined;

	const result = convert(value, from.unit, to.unit);
	const kitchen = from.dimension.id === 'volume' && Math.abs(result) < 100;

	return {
		kind: `${from.dimension.name} conversion`,
		question: `${formatNumber(value)} ${unitLabel(from.unit, value)}`,
		value: `${formatNumber(result)} ${unitLabel(to.unit, result)}`,
		detail: kitchen
			? `≈ ${formatFraction(result)} ${unitLabel(to.unit, result)}  ·  ${conversionFormula(from.unit, to.unit)}`
			: conversionFormula(from.unit, to.unit),
		href: converterHref(from.unit.id, to.unit.id, value, from.dimension.id),
		hrefLabel: 'Open the full converter'
	};
}

function percentage(query: string): Answer | undefined {
	const q = query.trim();

	// "15% of 80"
	let m = /^([\d.,]+)\s*%\s+of\s+([\d.,]+)$/i.exec(q);
	if (m) {
		const p = Number(m[1].replace(/,/g, ''));
		const total = Number(m[2].replace(/,/g, ''));
		return {
			kind: 'Percentage',
			question: `${p}% of ${formatNumber(total)}`,
			value: formatNumber((p / 100) * total),
			detail: `${p} ÷ 100 × ${formatNumber(total)}`,
			href: `/math/percentage?mode=of&a=${p}&b=${total}`,
			hrefLabel: 'Open the percentage calculator'
		};
	}

	// "what percent of 80 is 12" / "12 is what percent of 80"
	m = /^(?:what\s+percent(?:age)?\s+of\s+([\d.,]+)\s+is\s+([\d.,]+)|([\d.,]+)\s+is\s+what\s+percent(?:age)?\s+of\s+([\d.,]+))$/i.exec(q);
	if (m) {
		const total = Number((m[1] ?? m[4]).replace(/,/g, ''));
		const part = Number((m[2] ?? m[3]).replace(/,/g, ''));
		return {
			kind: 'Percentage',
			question: `${formatNumber(part)} out of ${formatNumber(total)}`,
			value: `${formatNumber((part / total) * 100)}%`,
			detail: `${formatNumber(part)} ÷ ${formatNumber(total)} × 100`,
			href: `/math/percentage?mode=isWhat&a=${part}&b=${total}`,
			hrefLabel: 'Open the percentage calculator'
		};
	}

	// "percent change from 20 to 30" / "20 to 30 percent change"
	m = /^(?:percent(?:age)?\s+(?:change|increase|difference)\s+from\s+)?([\d.,]+)\s+to\s+([\d.,]+)\s+percent(?:age)?\s*(?:change|increase)?$/i.exec(q)
		?? /^percent(?:age)?\s+(?:change|increase|difference)\s+from\s+([\d.,]+)\s+to\s+([\d.,]+)$/i.exec(q);
	if (m) {
		const a = Number(m[1].replace(/,/g, ''));
		const b = Number(m[2].replace(/,/g, ''));
		const change = ((b - a) / Math.abs(a)) * 100;
		return {
			kind: 'Percent change',
			question: `${formatNumber(a)} → ${formatNumber(b)}`,
			value: `${change >= 0 ? '+' : ''}${formatNumber(change)}%`,
			detail: `(${formatNumber(b)} − ${formatNumber(a)}) ÷ ${formatNumber(Math.abs(a))} × 100`,
			href: `/math/percentage?mode=change&a=${a}&b=${b}`,
			hrefLabel: 'Open the percentage calculator'
		};
	}

	return undefined;
}

const MONTHS = [
	'january', 'february', 'march', 'april', 'may', 'june',
	'july', 'august', 'september', 'october', 'november', 'december'
];

const HOLIDAYS: Record<string, [number, number]> = {
	christmas: [11, 25],
	'christmas day': [11, 25],
	xmas: [11, 25],
	'new year': [0, 1],
	"new year's": [0, 1],
	'new years': [0, 1],
	halloween: [9, 31],
	'valentines day': [1, 14],
	"valentine's day": [1, 14],
	'july 4th': [6, 4],
	'independence day': [6, 4]
};

/** Parse "Dec 25", "25 December", "2027-03-04", "Christmas". */
function parseLooseDate(text: string, now: Date): Date | undefined {
	const s = text.trim().toLowerCase().replace(/(\d+)(st|nd|rd|th)\b/g, '$1');

	const holiday = HOLIDAYS[s];
	if (holiday) {
		const d = new Date(now.getFullYear(), holiday[0], holiday[1]);
		if (d < startOfDay(now)) d.setFullYear(d.getFullYear() + 1);
		return d;
	}

	const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
	if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

	const monthName = MONTHS.findIndex((mo) => s.includes(mo.slice(0, 3)) && new RegExp(`\\b${mo.slice(0, 3)}`).test(s));
	if (monthName >= 0) {
		const dayMatch = /\b(\d{1,2})\b/.exec(s);
		const yearMatch = /\b(\d{4})\b/.exec(s);
		const day = dayMatch ? Number(dayMatch[1]) : 1;
		const year = yearMatch ? Number(yearMatch[1]) : now.getFullYear();
		const d = new Date(year, monthName, day);
		if (!yearMatch && d < startOfDay(now)) d.setFullYear(year + 1);
		return Number.isNaN(d.getTime()) ? undefined : d;
	}

	const slash = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(s);
	if (slash) {
		const year = slash[3] ? Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]) : now.getFullYear();
		const d = new Date(year, Number(slash[1]) - 1, Number(slash[2]));
		if (!slash[3] && d < startOfDay(now)) d.setFullYear(year + 1);
		return d;
	}

	return undefined;
}

function startOfDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoDate(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntil(query: string, now: Date): Answer | undefined {
	const m = /^(?:how\s+many\s+)?days\s+(?:until|till|til|to|before)\s+(.+)$/i.exec(query.trim());
	if (!m) return undefined;
	const target = parseLooseDate(m[1], now);
	if (!target) return undefined;

	const days = Math.round((startOfDay(target).getTime() - startOfDay(now).getTime()) / 86400000);
	const label = target.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

	return {
		kind: 'Date',
		question: `Today → ${label}`,
		value: days === 0 ? 'Today' : `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}${days < 0 ? ' ago' : ''}`,
		detail: `${label} · week ${isoWeek(target)}`,
		href: `/time/date-difference?from=${isoDate(now)}&to=${isoDate(target)}`,
		hrefLabel: 'Open the date calculator'
	};
}

function isoWeek(date: Date): number {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const BASES: Record<string, number> = {
	binary: 2,
	bin: 2,
	octal: 8,
	oct: 8,
	decimal: 10,
	dec: 10,
	hex: 16,
	hexadecimal: 16
};

function baseConversion(query: string): Answer | undefined {
	const m = CONNECTORS.exec(query);
	if (!m) return undefined;
	const [leftRaw, rightRaw] = query.split(CONNECTORS);
	const targetBase = BASES[rightRaw?.trim().toLowerCase()];
	if (!targetBase) return undefined;

	const left = leftRaw.trim().toLowerCase();
	let value: number | undefined;
	let sourceBase = 10;
	if (/^0x[0-9a-f]+$/.test(left)) {
		value = parseInt(left.slice(2), 16);
		sourceBase = 16;
	} else if (/^0b[01]+$/.test(left)) {
		value = parseInt(left.slice(2), 2);
		sourceBase = 2;
	} else if (/^-?\d+$/.test(left)) {
		value = Number(left);
	}
	if (value === undefined || !Number.isFinite(value)) return undefined;

	const out = value.toString(targetBase).toUpperCase();
	const prefix = targetBase === 16 ? '0x' : targetBase === 2 ? '0b' : targetBase === 8 ? '0o' : '';

	return {
		kind: 'Number base',
		question: `${left} (base ${sourceBase}) → base ${targetBase}`,
		value: `${prefix}${out}`,
		detail: `decimal ${value.toLocaleString('en-US')}`,
		href: `/convert/number-base?value=${value}&base=10`,
		hrefLabel: 'Open the base converter'
	};
}

const ROMAN: Array<[number, string]> = [
	[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
	[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
];

export function toRoman(n: number): string {
	if (!Number.isInteger(n) || n < 1 || n > 3999999) return '';
	let out = '';
	let rest = n;
	// Values above 3,999 use the vinculum (overline = ×1000); we render with a
	// combining overline so it copies as real text.
	if (rest >= 4000) {
		const thousands = Math.floor(rest / 1000);
		out += toRoman(thousands)
			.split('')
			.map((c) => c + '̅')
			.join('');
		rest %= 1000;
	}
	for (const [value, sym] of ROMAN) {
		while (rest >= value) {
			out += sym;
			rest -= value;
		}
	}
	return out;
}

export function fromRoman(s: string): number {
	const clean = s.toUpperCase().replace(/[^IVXLCDM̅]/g, '');
	const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
	let total = 0;
	let i = 0;
	while (i < clean.length) {
		const char = clean[i];
		const overlined = clean[i + 1] === '̅';
		const mult = overlined ? 1000 : 1;
		const current = (values[char] ?? 0) * mult;
		let next = 0;
		const nj = i + (overlined ? 2 : 1);
		if (nj < clean.length) {
			const nOver = clean[nj + 1] === '̅';
			next = (values[clean[nj]] ?? 0) * (nOver ? 1000 : 1);
		}
		if (current < next) total -= current;
		else total += current;
		i += overlined ? 2 : 1;
	}
	return total;
}

function romanNumeral(query: string): Answer | undefined {
	const parts = query.split(CONNECTORS);
	if (parts.length !== 2) return undefined;
	const target = parts[1].trim().toLowerCase();
	if (!/^roman(\s+numerals?)?$/.test(target)) return undefined;
	const n = Number(parts[0].trim().replace(/,/g, ''));
	if (!Number.isInteger(n) || n < 1 || n > 3999999) return undefined;
	return {
		kind: 'Roman numerals',
		question: n.toLocaleString('en-US'),
		value: toRoman(n),
		detail: `${ordinal(n)} · ${n.toLocaleString('en-US')}`,
		href: `/convert/roman-numerals?value=${n}`,
		hrefLabel: 'Open the Roman numeral converter'
	};
}

function arithmetic(query: string): Answer | undefined {
	const q = query.trim().replace(/^(?:what\s+is|calculate|=)\s*/i, '').replace(/[=?]\s*$/, '');
	// Needs at least one operator, and must not be a bare number or a word.
	if (!/[-+*/^%!(]/.test(q)) return undefined;
	if (!/\d/.test(q)) return undefined;
	if (/[a-z]{3,}/i.test(q.replace(/\b(?:sin|cos|tan|log|ln|sqrt|abs|exp|pi|e|min|max|round|floor|ceil|mod|pow|hypot|atan|asin|acos|fact|deg|rad|cbrt|log2|log10|tau|phi)\b/gi, ''))) {
		return undefined;
	}
	try {
		const compiled = compile(q);
		if (compiled.variables.length) return undefined;
		const result = compiled.evaluate();
		if (!Number.isFinite(result)) return undefined;
		return {
			kind: 'Calculation',
			question: q,
			value: formatNumber(result, 12),
			href: `/math/scientific-calculator?expr=${encodeURIComponent(q)}`,
			hrefLabel: 'Open the calculator'
		};
	} catch (err) {
		if (err instanceof ExpressionError) return undefined;
		return undefined;
	}
}

const PARSERS: Array<(q: string, now: Date) => Answer | undefined> = [
	(q) => unitConversion(q),
	(q) => percentage(q),
	(q, now) => daysUntil(q, now),
	(q) => baseConversion(q),
	(q) => romanNumeral(q),
	(q) => arithmetic(q)
];

/**
 * Try every parser and return the answers that matched, best first.
 * Returns an empty array when the query is just a tool search.
 */
export function answer(query: string, now: Date = new Date()): Answer[] {
	const q = query.trim();
	if (!q || q.length > 200) return [];
	const out: Answer[] = [];
	for (const parser of PARSERS) {
		try {
			const a = parser(q, now);
			if (a) out.push(a);
		} catch {
			// A malformed query is not an error — just no answer from this parser.
		}
	}
	return out;
}
