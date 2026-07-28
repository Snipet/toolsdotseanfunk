import { describe, expect, it } from 'vitest';
import { ExpressionError, compile, evaluate } from './expression';

describe('expression parser', () => {
	it('respects operator precedence and associativity', () => {
		expect(evaluate('2 + 3 * 4')).toBe(14);
		expect(evaluate('(2 + 3) * 4')).toBe(20);
		expect(evaluate('2 ^ 3 ^ 2')).toBe(512); // right-associative
		expect(evaluate('-2 ^ 2')).toBe(-4); // unary minus is weaker than ^
		expect(evaluate('2 ^ -1')).toBe(0.5);
		expect(evaluate('10 - 4 - 3')).toBe(3);
		expect(evaluate('100 / 5 / 2')).toBe(10);
	});

	it('handles implicit multiplication', () => {
		expect(evaluate('2(3+4)')).toBe(14);
		expect(evaluate('2x', { x: 5 })).toBe(10);
		expect(evaluate('3sin(0) + 2')).toBe(2);
	});

	it('supports functions and constants', () => {
		expect(evaluate('sqrt(16)')).toBe(4);
		expect(evaluate('log(1000)')).toBeCloseTo(3, 10);
		expect(evaluate('log(8, 2)')).toBeCloseTo(3, 10);
		expect(evaluate('ln(e)')).toBeCloseTo(1, 10);
		expect(evaluate('max(1, 9, 4)')).toBe(9);
		expect(evaluate('round(3.14159, 2)')).toBe(3.14);
		expect(evaluate('cos(pi)')).toBeCloseTo(-1, 10);
		expect(evaluate('mod(-7, 3)')).toBe(2);
		expect(evaluate('gcd(24, 36)')).toBe(12);
	});

	it('supports factorial and percent literals', () => {
		expect(evaluate('5!')).toBe(120);
		expect(evaluate('0!')).toBe(1);
		expect(evaluate('50% * 80')).toBe(40);
		expect(evaluate('10 % 3')).toBe(1); // still modulo when followed by a value
	});

	it('normalises unicode operators', () => {
		expect(evaluate('6 × 7')).toBe(42);
		expect(evaluate('84 ÷ 2')).toBe(42);
		expect(evaluate('10 − 1')).toBe(9);
		expect(evaluate('√81')).toBe(9);
	});

	it('reports the variables it saw', () => {
		const c = compile('m*x + b');
		expect(c.variables.sort()).toEqual(['b', 'm', 'x']);
		expect(c.evaluate({ m: 2, x: 3, b: 1 })).toBe(7);
	});

	it('throws a typed error on malformed input', () => {
		expect(() => compile('2 +')).toThrow(ExpressionError);
		expect(() => compile('(1 + 2')).toThrow(ExpressionError);
		expect(() => compile('nope(3)')).toThrow(ExpressionError);
		expect(() => compile('2 $ 3')).toThrow(ExpressionError);
		expect(() => compile('sqrt(1, 2)')).toThrow(ExpressionError);
	});

	it('returns NaN rather than throwing from evaluate()', () => {
		expect(Number.isNaN(evaluate('2 +'))).toBe(true);
	});

	it('does not evaluate arbitrary JavaScript', () => {
		expect(Number.isNaN(evaluate('constructor'))).toBe(true);
		expect(Number.isNaN(evaluate('[].constructor'))).toBe(true);
		expect(Number.isNaN(evaluate('globalThis'))).toBe(true);
	});
});
