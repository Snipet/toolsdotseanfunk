/**
 * A small, dependency-free math expression parser.
 *
 * Shared by the scientific calculator, the omnibox and the function grapher.
 * Recursive-descent over a hand-written tokenizer; compiles to a closure so
 * the grapher can evaluate thousands of points without re-parsing.
 */

export type Scope = Record<string, number>;

export class ExpressionError extends Error {}

const CONSTANTS: Scope = {
	pi: Math.PI,
	π: Math.PI,
	e: Math.E,
	tau: Math.PI * 2,
	phi: (1 + Math.sqrt(5)) / 2,
	inf: Infinity,
	infinity: Infinity
};

function factorial(n: number): number {
	if (n < 0 || !Number.isInteger(n)) return gamma(n + 1);
	if (n > 170) return Infinity;
	let r = 1;
	for (let i = 2; i <= n; i++) r *= i;
	return r;
}

/** Lanczos approximation — lets factorial() accept non-integers. */
function gamma(z: number): number {
	const g = 7;
	const C = [
		0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
		-176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
		1.5056327351493116e-7
	];
	if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
	z -= 1;
	let x = C[0];
	for (let i = 1; i < g + 2; i++) x += C[i] / (z + i);
	const t = z + g + 0.5;
	return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

type Fn = (...args: number[]) => number;

const FUNCTIONS: Record<string, { arity: number | [number, number]; fn: Fn }> = {
	sin: { arity: 1, fn: Math.sin },
	cos: { arity: 1, fn: Math.cos },
	tan: { arity: 1, fn: Math.tan },
	asin: { arity: 1, fn: Math.asin },
	acos: { arity: 1, fn: Math.acos },
	atan: { arity: 1, fn: Math.atan },
	atan2: { arity: 2, fn: Math.atan2 },
	sinh: { arity: 1, fn: Math.sinh },
	cosh: { arity: 1, fn: Math.cosh },
	tanh: { arity: 1, fn: Math.tanh },
	asinh: { arity: 1, fn: Math.asinh },
	acosh: { arity: 1, fn: Math.acosh },
	atanh: { arity: 1, fn: Math.atanh },
	sqrt: { arity: 1, fn: Math.sqrt },
	cbrt: { arity: 1, fn: Math.cbrt },
	abs: { arity: 1, fn: Math.abs },
	ln: { arity: 1, fn: Math.log },
	log: { arity: [1, 2], fn: (x, b) => (b === undefined ? Math.log10(x) : Math.log(x) / Math.log(b)) },
	log10: { arity: 1, fn: Math.log10 },
	log2: { arity: 1, fn: Math.log2 },
	exp: { arity: 1, fn: Math.exp },
	floor: { arity: 1, fn: Math.floor },
	ceil: { arity: 1, fn: Math.ceil },
	round: {
		arity: [1, 2],
		fn: (x, d) => {
			const p = Math.pow(10, d ?? 0);
			return Math.round(x * p) / p;
		}
	},
	trunc: { arity: 1, fn: Math.trunc },
	sign: { arity: 1, fn: Math.sign },
	min: { arity: [1, 16], fn: (...a) => Math.min(...a) },
	max: { arity: [1, 16], fn: (...a) => Math.max(...a) },
	hypot: { arity: [1, 16], fn: (...a) => Math.hypot(...a) },
	pow: { arity: 2, fn: Math.pow },
	mod: { arity: 2, fn: (a, b) => ((a % b) + b) % b },
	gcd: {
		arity: [2, 16],
		fn: (...a) => a.reduce((x, y) => {
			x = Math.abs(x);
			y = Math.abs(y);
			while (y) [x, y] = [y, x % y];
			return x;
		})
	},
	fact: { arity: 1, fn: factorial },
	gamma: { arity: 1, fn: gamma },
	deg: { arity: 1, fn: (x) => (x * 180) / Math.PI },
	rad: { arity: 1, fn: (x) => (x * Math.PI) / 180 }
};

export const FUNCTION_NAMES = Object.keys(FUNCTIONS).sort();

// --- Tokenizer -------------------------------------------------------------

type Token =
	| { type: 'num'; value: number }
	| { type: 'name'; value: string }
	| { type: 'op'; value: string }
	| { type: 'paren'; value: '(' | ')' }
	| { type: 'comma' };

function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	const src = input
		.replace(/×/g, '*')
		.replace(/[÷∕]/g, '/')
		.replace(/[−–—]/g, '-')
		.replace(/[[{]/g, '(')
		.replace(/[\]}]/g, ')')
		.replace(/√/g, 'sqrt ');
	let i = 0;

	while (i < src.length) {
		const c = src[i];
		if (/\s/.test(c)) {
			i++;
			continue;
		}
		if (/[0-9.]/.test(c)) {
			const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
			if (!m) throw new ExpressionError(`Unexpected "${c}"`);
			tokens.push({ type: 'num', value: Number(m[0]) });
			i += m[0].length;
			continue;
		}
		if (/[a-zA-Zπ_]/.test(c)) {
			const m = /^[a-zA-Z_π][a-zA-Z0-9_]*/.exec(src.slice(i))!;
			tokens.push({ type: 'name', value: m[0] });
			i += m[0].length;
			continue;
		}
		if (c === '(' || c === ')') {
			tokens.push({ type: 'paren', value: c });
			i++;
			continue;
		}
		if (c === ',') {
			tokens.push({ type: 'comma' });
			i++;
			continue;
		}
		if ('+-*/^%!'.includes(c)) {
			tokens.push({ type: 'op', value: c });
			i++;
			continue;
		}
		throw new ExpressionError(`Unexpected character "${c}"`);
	}
	return tokens;
}

// --- Parser ----------------------------------------------------------------

type Node = (scope: Scope) => number;

class Parser {
	private pos = 0;
	/** Every free identifier seen, so callers can discover "x" in "x^2". */
	readonly variables = new Set<string>();

	constructor(private tokens: Token[]) {}

	private peek(): Token | undefined {
		return this.tokens[this.pos];
	}

	private eat(pred: (t: Token) => boolean): Token | undefined {
		const t = this.peek();
		if (t && pred(t)) {
			this.pos++;
			return t;
		}
		return undefined;
	}

	private expect(pred: (t: Token) => boolean, what: string): Token {
		const t = this.eat(pred);
		if (!t) throw new ExpressionError(`Expected ${what}`);
		return t;
	}

	parse(): Node {
		const node = this.additive();
		if (this.pos < this.tokens.length) throw new ExpressionError('Unexpected trailing input');
		return node;
	}

	private additive(): Node {
		let left = this.multiplicative();
		for (;;) {
			const op = this.eat((t) => t.type === 'op' && (t.value === '+' || t.value === '-'));
			if (!op) return left;
			const right = this.multiplicative();
			const l = left;
			left = (op as { value: string }).value === '+' ? (s) => l(s) + right(s) : (s) => l(s) - right(s);
		}
	}

	private multiplicative(): Node {
		let left = this.unary();
		for (;;) {
			const op = this.eat(
				(t) => t.type === 'op' && (t.value === '*' || t.value === '/' || t.value === '%')
			);
			if (op) {
				const right = this.unary();
				const l = left;
				const o = (op as { value: string }).value;
				left =
					o === '*'
						? (s) => l(s) * right(s)
						: o === '/'
							? (s) => l(s) / right(s)
							: (s) => l(s) % right(s);
				continue;
			}
			// Implicit multiplication: "2x", "3(4+1)", "2 sin(x)".
			const next = this.peek();
			if (next && (next.type === 'name' || next.type === 'num' || (next.type === 'paren' && next.value === '('))) {
				const right = this.unary();
				const l = left;
				left = (s) => l(s) * right(s);
				continue;
			}
			return left;
		}
	}

	private unary(): Node {
		const op = this.eat((t) => t.type === 'op' && (t.value === '-' || t.value === '+'));
		if (op) {
			const operand = this.unary();
			return (op as { value: string }).value === '-' ? (s) => -operand(s) : operand;
		}
		return this.power();
	}

	private power(): Node {
		const base = this.postfix();
		if (this.eat((t) => t.type === 'op' && t.value === '^')) {
			// Right-associative, and "-" binds tighter on the exponent: 2^-1.
			const exp = this.unary();
			return (s) => Math.pow(base(s), exp(s));
		}
		return base;
	}

	private postfix(): Node {
		let node = this.primary();
		while (this.eat((t) => t.type === 'op' && t.value === '!')) {
			const inner = node;
			node = (s) => factorial(inner(s));
		}
		return node;
	}

	private primary(): Node {
		const t = this.peek();
		if (!t) throw new ExpressionError('Unexpected end of expression');

		if (t.type === 'num') {
			this.pos++;
			const v = t.value;
			// "50%" as a bare literal means 0.5.
			if (this.peek()?.type === 'op' && (this.peek() as { value: string }).value === '%') {
				const after = this.tokens[this.pos + 1];
				const isModulo = after && (after.type === 'num' || after.type === 'name' || after.type === 'paren');
				if (!isModulo) {
					this.pos++;
					return () => v / 100;
				}
			}
			return () => v;
		}

		if (t.type === 'paren' && t.value === '(') {
			this.pos++;
			const inner = this.additive();
			this.expect((x) => x.type === 'paren' && x.value === ')', '")"');
			return inner;
		}

		if (t.type === 'name') {
			this.pos++;
			const name = t.value;
			const lower = name.toLowerCase();

			const spec = Object.hasOwn(FUNCTIONS, lower) ? FUNCTIONS[lower] : undefined;
			const followedByParen =
				this.peek()?.type === 'paren' && (this.peek() as { value: string }).value === '(';

			// A known function without parentheses takes the next operand:
			// "sqrt 81", "√81", "sin x". Unknown bare names stay variables.
			if (spec && !followedByParen) {
				const [min] = Array.isArray(spec.arity) ? spec.arity : [spec.arity, spec.arity];
				if (min === 1) {
					const arg = this.power();
					return (s) => spec.fn(arg(s));
				}
			}

			if (followedByParen) {
				if (!spec) throw new ExpressionError(`Unknown function "${name}"`);
				this.pos++;
				const args: Node[] = [];
				if (!this.eat((x) => x.type === 'paren' && x.value === ')')) {
					do {
						args.push(this.additive());
					} while (this.eat((x) => x.type === 'comma'));
					this.expect((x) => x.type === 'paren' && x.value === ')', '")"');
				}
				const [min, max] = Array.isArray(spec.arity) ? spec.arity : [spec.arity, spec.arity];
				if (args.length < min || args.length > max)
					throw new ExpressionError(`${name}() takes ${min === max ? min : `${min}–${max}`} argument(s)`);
				return (s) => spec.fn(...args.map((a) => a(s)));
			}

			if (Object.hasOwn(CONSTANTS, lower)) {
				const v = CONSTANTS[lower];
				return () => v;
			}
			this.variables.add(name);
			return (s) => {
				// `Object.hasOwn`, not `in` — otherwise "constructor" and friends
				// resolve off the prototype chain and leak non-numbers into results.
				if (!Object.hasOwn(s, name)) throw new ExpressionError(`Unknown variable "${name}"`);
				const v = s[name];
				if (typeof v !== 'number') throw new ExpressionError(`"${name}" is not a number`);
				return v;
			};
		}

		throw new ExpressionError('Unexpected token');
	}
}

export interface Compiled {
	evaluate: (scope?: Scope) => number;
	variables: string[];
}

/** Parse once, evaluate many times. Throws ExpressionError on bad syntax. */
export function compile(source: string): Compiled {
	const parser = new Parser(tokenize(source));
	const node = parser.parse();
	return {
		evaluate: (scope = {}) => node(scope),
		variables: [...parser.variables]
	};
}

/** One-shot evaluation. Returns NaN rather than throwing on bad input. */
export function evaluate(source: string, scope: Scope = {}): number {
	try {
		return compile(source).evaluate(scope);
	} catch {
		return NaN;
	}
}
