import { describe, expect, it } from 'vitest';
import {
	CASE_TRANSFORMS,
	analyse,
	countSyllables,
	diffLines,
	levenshtein,
	readability,
	slugify,
	tokenize,
	words
} from './text';

describe('word counting', () => {
	it('counts words with apostrophes and hyphens as one', () => {
		expect(words("don't re-open it").length).toBe(3);
	});

	it('handles unicode letters', () => {
		expect(words('café naïve 日本語').length).toBe(3);
	});

	it('counts characters by code point, not code unit', () => {
		// An emoji outside the BMP is one character to a human.
		expect(analyse('👋').characters).toBe(1);
	});

	it('reports zero for empty text', () => {
		const stats = analyse('');
		expect(stats.words).toBe(0);
		expect(stats.sentences).toBe(0);
		expect(stats.lines).toBe(0);
	});

	it('does not split sentences on common abbreviations', () => {
		expect(analyse('Dr. Smith went home. He slept.').sentences).toBe(2);
	});
});

describe('syllable estimation', () => {
	it('handles the usual cases', () => {
		expect(countSyllables('cat')).toBe(1);
		expect(countSyllables('happy')).toBe(2);
		expect(countSyllables('beautiful')).toBe(3);
		expect(countSyllables('the')).toBe(1);
		expect(countSyllables('')).toBe(0);
	});
});

describe('readability', () => {
	it('scores simple text as easy and dense text as hard', () => {
		const simple = readability('The cat sat on the mat. The dog ran. It was fun.')!;
		const dense = readability(
			'Notwithstanding the aforementioned considerations, the implementation necessitates comprehensive evaluation of multifaceted organisational interdependencies.'
		)!;
		expect(simple.fleschReadingEase).toBeGreaterThan(dense.fleschReadingEase);
		expect(simple.fleschKincaidGrade).toBeLessThan(dense.fleschKincaidGrade);
	});

	it('returns null when there is nothing to score', () => {
		expect(readability('')).toBeNull();
	});
});

describe('case transforms', () => {
	const input = 'hello world example';

	it('produces every case correctly', () => {
		expect(CASE_TRANSFORMS['UPPER CASE'](input)).toBe('HELLO WORLD EXAMPLE');
		expect(CASE_TRANSFORMS['camelCase'](input)).toBe('helloWorldExample');
		expect(CASE_TRANSFORMS['PascalCase'](input)).toBe('HelloWorldExample');
		expect(CASE_TRANSFORMS['snake_case'](input)).toBe('hello_world_example');
		expect(CASE_TRANSFORMS['kebab-case'](input)).toBe('hello-world-example');
		expect(CASE_TRANSFORMS['CONSTANT_CASE'](input)).toBe('HELLO_WORLD_EXAMPLE');
	});

	it('round-trips between identifier cases', () => {
		expect(CASE_TRANSFORMS['snake_case']('helloWorldExample')).toBe('hello_world_example');
		expect(CASE_TRANSFORMS['camelCase']('hello_world_example')).toBe('helloWorldExample');
		expect(CASE_TRANSFORMS['kebab-case']('HTTPServerError')).toBe('http-server-error');
	});

	it('keeps minor words lowercase in smart title case', () => {
		expect(CASE_TRANSFORMS['Smart Title Case']('the lord of the rings')).toBe('The Lord of the Rings');
		// A minor word still capitalises when it is the last word.
		expect(CASE_TRANSFORMS['Smart Title Case']('what are you waiting for')).toBe(
			'What Are You Waiting For'
		);
	});

	it('capitalises after terminal punctuation in sentence case', () => {
		expect(CASE_TRANSFORMS['Sentence case']('hello world. how are you?')).toBe(
			'Hello world. How are you?'
		);
	});
});

describe('tokenize', () => {
	it('splits identifiers of every shape', () => {
		expect(tokenize('helloWorld')).toEqual(['hello', 'World']);
		expect(tokenize('hello_world')).toEqual(['hello', 'world']);
		expect(tokenize('HTTPResponse')).toEqual(['HTTP', 'Response']);
	});
});

describe('slugify', () => {
	it('strips diacritics and punctuation', () => {
		expect(slugify('Héllo, Wörld! (2026)')).toBe('hello-world-2026');
		expect(slugify('  multiple   spaces  ')).toBe('multiple-spaces');
		expect(slugify('already-a-slug')).toBe('already-a-slug');
	});

	it('accepts an alternative separator', () => {
		expect(slugify('hello world', '_')).toBe('hello_world');
	});
});

describe('diff', () => {
	it('detects an inserted line', () => {
		const result = diffLines(['a', 'b'], ['a', 'x', 'b']);
		expect(result.map((r) => r.op)).toEqual(['equal', 'insert', 'equal']);
	});

	it('detects a deleted line', () => {
		const result = diffLines(['a', 'x', 'b'], ['a', 'b']);
		expect(result.filter((r) => r.op === 'delete').map((r) => r.text)).toEqual(['x']);
	});

	it('reports everything equal for identical input', () => {
		expect(diffLines(['a', 'b'], ['a', 'b']).every((r) => r.op === 'equal')).toBe(true);
	});

	it('numbers lines on the side they belong to', () => {
		const result = diffLines(['a'], ['b']);
		expect(result.find((r) => r.op === 'delete')?.leftNumber).toBe(1);
		expect(result.find((r) => r.op === 'insert')?.rightNumber).toBe(1);
	});
});

describe('levenshtein', () => {
	it('matches the textbook distances', () => {
		expect(levenshtein('kitten', 'sitting')).toBe(3);
		expect(levenshtein('', 'abc')).toBe(3);
		expect(levenshtein('same', 'same')).toBe(0);
	});
});
