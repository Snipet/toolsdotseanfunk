/** Text analysis and transformation helpers. */

export interface TextStats {
	characters: number;
	charactersNoSpaces: number;
	words: number;
	uniqueWords: number;
	sentences: number;
	paragraphs: number;
	lines: number;
	syllables: number;
	readingMinutes: number;
	speakingMinutes: number;
	longestWord: string;
	averageWordLength: number;
	averageSentenceLength: number;
}

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

export function words(text: string): string[] {
	return text.match(WORD_RE) ?? [];
}

export function sentences(text: string): string[] {
	// Split on terminal punctuation followed by whitespace, protecting common
	// abbreviations that would otherwise produce phantom sentences.
	const guarded = text.replace(/\b(Mr|Mrs|Ms|Dr|Prof|St|vs|etc|e\.g|i\.e|Inc|Ltd)\./gi, '$1<DOT>');
	return guarded
		.split(/[.!?]+(?:\s|$)/)
		.map((s) => s.replace(/<DOT>/g, '.').trim())
		.filter(Boolean);
}

/**
 * Syllable estimate for English. Heuristic, not a dictionary — good enough
 * for readability indices, which are themselves approximations.
 */
export function countSyllables(word: string): number {
	const w = word.toLowerCase().replace(/[^a-z]/g, '');
	if (!w) return 0;
	if (w.length <= 3) return 1;

	const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
	// Contiguous vowel runs, each counted once: "beautiful" → eau, i, u = 3.
	const groups = trimmed.match(/[aeiouy]+/g);
	return Math.max(1, groups?.length ?? 1);
}

export function analyse(text: string): TextStats {
	const wordList = words(text);
	const sentenceList = sentences(text);
	const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
	const syllables = wordList.reduce((acc, w) => acc + countSyllables(w), 0);
	const longest = wordList.reduce((a, b) => (b.length > a.length ? b : a), '');

	return {
		characters: [...text].length,
		charactersNoSpaces: [...text.replace(/\s/g, '')].length,
		words: wordList.length,
		uniqueWords: new Set(wordList.map((w) => w.toLowerCase())).size,
		sentences: sentenceList.length,
		paragraphs,
		lines: text ? text.split('\n').length : 0,
		syllables,
		// 238 wpm silent reading, 150 wpm speaking aloud — the commonly cited means.
		readingMinutes: wordList.length / 238,
		speakingMinutes: wordList.length / 150,
		longestWord: longest,
		averageWordLength: wordList.length ? wordList.join('').length / wordList.length : 0,
		averageSentenceLength: sentenceList.length ? wordList.length / sentenceList.length : 0
	};
}

export interface Readability {
	fleschReadingEase: number;
	fleschKincaidGrade: number;
	gunningFog: number;
	smog: number;
	colemanLiau: number;
	automatedReadability: number;
	averageGrade: number;
}

export function readability(text: string): Readability | null {
	const wordList = words(text);
	const sentenceList = sentences(text);
	if (!wordList.length || !sentenceList.length) return null;

	const w = wordList.length;
	const s = sentenceList.length;
	const syllables = wordList.reduce((acc, x) => acc + countSyllables(x), 0);
	const complex = wordList.filter((x) => countSyllables(x) >= 3).length;
	const letters = wordList.join('').replace(/[^a-zA-Z]/g, '').length;

	const asl = w / s;
	const asw = syllables / w;

	const fleschReadingEase = 206.835 - 1.015 * asl - 84.6 * asw;
	const fleschKincaidGrade = 0.39 * asl + 11.8 * asw - 15.59;
	const gunningFog = 0.4 * (asl + 100 * (complex / w));
	const smog = 1.043 * Math.sqrt(complex * (30 / s)) + 3.1291;
	const colemanLiau = 0.0588 * ((letters / w) * 100) - 0.296 * ((s / w) * 100) - 15.8;
	const automatedReadability = 4.71 * (letters / w) + 0.5 * asl - 21.43;

	const grades = [fleschKincaidGrade, gunningFog, smog, colemanLiau, automatedReadability];

	return {
		fleschReadingEase,
		fleschKincaidGrade,
		gunningFog,
		smog,
		colemanLiau,
		automatedReadability,
		averageGrade: grades.reduce((a, b) => a + b, 0) / grades.length
	};
}

// ---------------------------------------------------------------------------
// Case conversion
// ---------------------------------------------------------------------------

/** Split an identifier or sentence into its constituent words. */
export function tokenize(text: string): string[] {
	return text
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);
}

/** Words that stay lowercase in title case unless first or last. */
const MINOR_WORDS = new Set([
	'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per',
	'so', 'the', 'to', 'up', 'via', 'vs', 'yet', 'from', 'into', 'over', 'with'
]);

export const CASE_TRANSFORMS: Record<string, (text: string) => string> = {
	'UPPER CASE': (t) => t.toUpperCase(),
	'lower case': (t) => t.toLowerCase(),
	'Title Case': (t) =>
		t.toLowerCase().replace(/\b[\p{L}'’]+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1)),
	'Smart Title Case': (t) => {
		const parts = t.toLowerCase().match(/[\p{L}\p{N}'’-]+|[^\p{L}\p{N}]+/gu) ?? [];
		const wordIndices = parts.map((p, i) => (/[\p{L}\p{N}]/u.test(p) ? i : -1)).filter((i) => i >= 0);
		const first = wordIndices[0];
		const last = wordIndices[wordIndices.length - 1];
		return parts
			.map((part, i) => {
				if (!/[\p{L}\p{N}]/u.test(part)) return part;
				if (i !== first && i !== last && MINOR_WORDS.has(part)) return part;
				return part.charAt(0).toUpperCase() + part.slice(1);
			})
			.join('');
	},
	'Sentence case': (t) => t.toLowerCase().replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, (m) => m.toUpperCase()),
	camelCase: (t) =>
		tokenize(t)
			.map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
			.join(''),
	PascalCase: (t) =>
		tokenize(t)
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
			.join(''),
	snake_case: (t) => tokenize(t).map((w) => w.toLowerCase()).join('_'),
	'kebab-case': (t) => tokenize(t).map((w) => w.toLowerCase()).join('-'),
	CONSTANT_CASE: (t) => tokenize(t).map((w) => w.toUpperCase()).join('_'),
	'dot.case': (t) => tokenize(t).map((w) => w.toLowerCase()).join('.'),
	'Train-Case': (t) =>
		tokenize(t)
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
			.join('-'),
	aLtErNaTiNg: (t) => [...t].map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join(''),
	'iNVERSE cASE': (t) =>
		[...t].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('')
};

/** URL-safe slug: strip diacritics, drop punctuation, collapse to hyphens. */
export function slugify(text: string, separator = '-'): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, separator)
		.replace(new RegExp(`\\${separator}+`, 'g'), separator)
		.replace(new RegExp(`^\\${separator}|\\${separator}$`, 'g'), '');
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

export type DiffOp = 'equal' | 'insert' | 'delete';

export interface DiffLine {
	op: DiffOp;
	text: string;
	leftNumber?: number;
	rightNumber?: number;
}

/**
 * Line diff via the longest common subsequence.
 *
 * The DP table is O(n·m); inputs are capped by the caller so a giant paste
 * cannot allocate gigabytes.
 */
export function diffLines(a: string[], b: string[]): DiffLine[] {
	const n = a.length;
	const m = b.length;
	const table: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			table[i][j] =
				a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
		}
	}

	const out: DiffLine[] = [];
	let i = 0;
	let j = 0;
	let leftNumber = 1;
	let rightNumber = 1;

	while (i < n && j < m) {
		if (a[i] === b[j]) {
			out.push({ op: 'equal', text: a[i], leftNumber: leftNumber++, rightNumber: rightNumber++ });
			i++;
			j++;
		} else if (table[i + 1][j] >= table[i][j + 1]) {
			out.push({ op: 'delete', text: a[i], leftNumber: leftNumber++ });
			i++;
		} else {
			out.push({ op: 'insert', text: b[j], rightNumber: rightNumber++ });
			j++;
		}
	}
	while (i < n) out.push({ op: 'delete', text: a[i++], leftNumber: leftNumber++ });
	while (j < m) out.push({ op: 'insert', text: b[j++], rightNumber: rightNumber++ });

	return out;
}

/** Levenshtein edit distance, used for the similarity readout. */
export function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (!a.length) return b.length;
	if (!b.length) return a.length;

	let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		const current = [i];
		for (let j = 1; j <= b.length; j++) {
			current[j] = Math.min(
				previous[j] + 1,
				current[j - 1] + 1,
				previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
			);
		}
		previous = current;
	}
	return previous[b.length];
}
