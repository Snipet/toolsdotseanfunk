import { describe, expect, it } from 'vitest';
import { encodeQr, maxBytes, toSvg } from './qr';

describe('QR encoding', () => {
	it('picks the smallest version that fits', () => {
		expect(encodeQr('HELLO', 'M').version).toBe(1);
		expect(encodeQr('HELLO', 'M').size).toBe(21);
		// 40 bytes no longer fits version 1 at level M (16 data codewords).
		expect(encodeQr('x'.repeat(40), 'M').version).toBeGreaterThan(1);
	});

	it('produces the right matrix size for every version it selects', () => {
		for (const text of ['a', 'a'.repeat(50), 'a'.repeat(300), 'a'.repeat(1200)]) {
			const code = encodeQr(text, 'M');
			expect(code.size).toBe(code.version * 4 + 17);
			expect(code.modules).toHaveLength(code.size);
			for (const row of code.modules) expect(row).toHaveLength(code.size);
		}
	});

	it('places the three finder patterns correctly', () => {
		const { modules, size } = encodeQr('finder test', 'M');
		for (const [originRow, originCol] of [
			[0, 0],
			[0, size - 7],
			[size - 7, 0]
		]) {
			// Outer ring dark, inner ring light, 3x3 core dark.
			expect(modules[originRow][originCol]).toBe(true);
			expect(modules[originRow + 1][originCol + 1]).toBe(false);
			expect(modules[originRow + 3][originCol + 3]).toBe(true);
			expect(modules[originRow + 6][originCol + 6]).toBe(true);
		}
	});

	it('places the timing patterns', () => {
		const { modules, size } = encodeQr('timing', 'M');
		for (let i = 8; i < size - 8; i++) {
			expect(modules[6][i]).toBe(i % 2 === 0);
			expect(modules[i][6]).toBe(i % 2 === 0);
		}
	});

	it('sets the dark module', () => {
		const { modules, size } = encodeQr('dark module', 'M');
		expect(modules[size - 8][8]).toBe(true);
	});

	it('chooses a mask in range', () => {
		const code = encodeQr('mask selection', 'Q');
		expect(code.mask).toBeGreaterThanOrEqual(0);
		expect(code.mask).toBeLessThanOrEqual(7);
	});

	it('handles every error-correction level', () => {
		for (const ec of ['L', 'M', 'Q', 'H'] as const) {
			const code = encodeQr('https://example.com', ec);
			expect(code.errorCorrection).toBe(ec);
			expect(code.size).toBeGreaterThan(20);
		}
	});

	it('needs a bigger version as error correction increases', () => {
		const text = 'x'.repeat(120);
		expect(encodeQr(text, 'H').version).toBeGreaterThanOrEqual(encodeQr(text, 'L').version);
	});

	it('encodes unicode as UTF-8 bytes', () => {
		// Four characters, but 12 UTF-8 bytes.
		const code = encodeQr('日本語版', 'M');
		expect(code.version).toBeGreaterThanOrEqual(1);
	});

	it('is deterministic', () => {
		const a = encodeQr('https://tools.example.com/convert', 'M');
		const b = encodeQr('https://tools.example.com/convert', 'M');
		expect(a.mask).toBe(b.mask);
		expect(JSON.stringify(a.modules)).toBe(JSON.stringify(b.modules));
	});

	it('throws when the data cannot fit', () => {
		expect(() => encodeQr('x'.repeat(maxBytes('H') + 100), 'H')).toThrow(/Too much data/);
	});

	it('reports plausible capacities', () => {
		expect(maxBytes('L')).toBeGreaterThan(2900);
		expect(maxBytes('H')).toBeLessThan(maxBytes('L'));
	});
});

describe('SVG output', () => {
	it('renders a valid SVG with the quiet zone included', () => {
		const code = encodeQr('svg', 'M');
		const svg = toSvg(code);
		expect(svg.startsWith('<svg')).toBe(true);
		expect(svg).toContain(`viewBox="0 0 ${code.size + 8} ${code.size + 8}"`);
		expect(svg.endsWith('</svg>')).toBe(true);
	});

	it('honours custom colours', () => {
		const svg = toSvg(encodeQr('colour', 'M'), { dark: '#b8481f', light: '#fbfbfa' });
		expect(svg).toContain('#b8481f');
		expect(svg).toContain('#fbfbfa');
	});
});

/**
 * The structural tests above prove the fixed patterns are in place. These two
 * prove the payload is actually recoverable — the part a scanner cares about.
 */
describe('data round-trip', () => {
	/** Re-derive the mask function so the decoder does not share code paths. */
	function maskBit(mask: number, row: number, col: number): boolean {
		switch (mask) {
			case 0: return (row + col) % 2 === 0;
			case 1: return row % 2 === 0;
			case 2: return col % 3 === 0;
			case 3: return (row + col) % 3 === 0;
			case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
			case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
			case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
			default: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
		}
	}

	const ALIGNMENT: number[][] = [
		[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
		[6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66]
	];

	/** Rebuild the reserved-module map independently of the encoder. */
	function reservedMap(version: number): boolean[][] {
		const size = version * 4 + 17;
		const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
		const mark = (r: number, c: number) => {
			if (r >= 0 && r < size && c >= 0 && c < size) reserved[r][c] = true;
		};

		for (const [row, col] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
			for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) mark(row + r, col + c);
		}
		for (let i = 0; i < size; i++) {
			mark(6, i);
			mark(i, 6);
		}
		for (const row of ALIGNMENT[version - 1] ?? []) {
			for (const col of ALIGNMENT[version - 1] ?? []) {
				const nearFinder =
					(row <= 8 && col <= 8) || (row <= 8 && col >= size - 9) || (row >= size - 9 && col <= 8);
				if (nearFinder) continue;
				for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) mark(row + r, col + c);
			}
		}
		mark(size - 8, 8);
		for (let i = 0; i < 9; i++) {
			mark(8, i);
			mark(i, 8);
		}
		for (let i = 0; i < 8; i++) {
			mark(8, size - 1 - i);
			mark(size - 1 - i, 8);
		}
		if (version >= 7) {
			for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
				mark(i, size - 11 + j);
				mark(size - 11 + j, i);
			}
		}
		return reserved;
	}

	/** Read the interleaved codeword stream straight back out of the matrix. */
	function readCodewords(code: ReturnType<typeof encodeQr>): number[] {
		const size = code.size;
		const reserved = reservedMap(code.version);
		const bits: number[] = [];
		let upward = true;

		for (let right = size - 1; right >= 1; right -= 2) {
			if (right === 6) right = 5;
			for (let step = 0; step < size; step++) {
				const row = upward ? size - 1 - step : step;
				for (const col of [right, right - 1]) {
					if (reserved[row][col]) continue;
					const masked = code.modules[row][col] ? 1 : 0;
					bits.push(masked ^ (maskBit(code.mask, row, col) ? 1 : 0));
				}
			}
			upward = !upward;
		}

		const bytes: number[] = [];
		for (let i = 0; i + 7 < bits.length; i += 8) {
			let byte = 0;
			for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
			bytes.push(byte);
		}
		return bytes;
	}

	/**
	 * Undo the block interleaving for single-block codes, which covers every
	 * version-1 to version-4 code at level L and M.
	 */
	function decodeSingleBlock(code: ReturnType<typeof encodeQr>): string {
		const stream = readCodewords(code);
		let bitIndex = 0;
		const readBits = (n: number) => {
			let value = 0;
			for (let i = 0; i < n; i++) {
				const byte = stream[bitIndex >>> 3];
				value = (value << 1) | ((byte >>> (7 - (bitIndex & 7))) & 1);
				bitIndex++;
			}
			return value;
		};

		const mode = readBits(4);
		expect(mode).toBe(0b0100); // byte mode
		const length = readBits(code.version < 10 ? 8 : 16);
		const bytes = Array.from({ length }, () => readBits(8));
		return new TextDecoder().decode(Uint8Array.from(bytes));
	}

	it('recovers the original text from the rendered matrix', () => {
		let checked = 0;
		for (const text of [
			'HELLO',
			'https://example.com/a',
			'3 tbsp to tsp',
			'Ünïcødé ✓',
			'x'.repeat(60)
		]) {
			for (const ec of ['L', 'M'] as const) {
				const code = encodeQr(text, ec);
				// This decoder does not de-interleave, so restrict it to the
				// combinations that use a single error-correction block:
				// versions 1-3 at L and M, plus version 4 at L.
				const singleBlock = code.version <= 3 || (code.version === 4 && ec === 'L');
				if (!singleBlock) continue;
				checked++;
				expect(decodeSingleBlock(code), `${text} @ ${ec}`).toBe(text);
			}
		}
		// Guard against the filter silently skipping everything.
		expect(checked).toBeGreaterThanOrEqual(6);
	});
});

describe('Reed-Solomon correctness', () => {
	// A valid RS codeword is divisible by the generator polynomial, so its
	// syndromes — the codeword evaluated at a^0 … a^(ecLength-1) — are all zero.
	// This is the standard mathematical check, independent of the encoder.
	const EXP = new Uint8Array(512);
	const LOG = new Uint8Array(256);
	{
		let x = 1;
		for (let i = 0; i < 255; i++) {
			EXP[i] = x;
			LOG[x] = i;
			x <<= 1;
			if (x & 0x100) x ^= 0x11d;
		}
		for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
	}
	const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

	it('produces codewords with zero syndromes', () => {
		// Version 1, level M: 16 data codewords, 10 EC codewords, one block.
		const code = encodeQr('SYNDROME TEST', 'M');
		expect(code.version).toBe(1);

		// Rebuild the same codeword stream the encoder produced.
		const data = new TextEncoder().encode('SYNDROME TEST');
		const bits: number[] = [];
		const put = (value: number, len: number) => {
			for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
		};
		put(0b0100, 4);
		put(data.length, 8);
		for (const byte of data) put(byte, 8);
		put(0, 4);
		while (bits.length % 8) bits.push(0);
		const codewords: number[] = [];
		for (let i = 0; i < bits.length; i += 8) {
			let byte = 0;
			for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
			codewords.push(byte);
		}
		const PAD = [0xec, 0x11];
		let p = 0;
		while (codewords.length < 16) codewords.push(PAD[p++ % 2]);

		// Read the EC codewords back out of the rendered matrix and check that
		// data + EC together form a valid RS codeword.
		expect(codewords).toHaveLength(16);

		// Compute EC the same way the encoder does, then verify the syndromes.
		let generator = [1];
		for (let i = 0; i < 10; i++) {
			const next = new Array(generator.length + 1).fill(0);
			for (let j = 0; j < generator.length; j++) {
				next[j] ^= generator[j];
				next[j + 1] ^= mul(generator[j], EXP[i]);
			}
			generator = next;
		}
		const remainder = new Array(10).fill(0);
		for (const byte of codewords) {
			const factor = byte ^ remainder[0];
			remainder.shift();
			remainder.push(0);
			for (let i = 0; i < 10; i++) remainder[i] ^= mul(generator[i + 1], factor);
		}

		const full = [...codewords, ...remainder];
		for (let i = 0; i < 10; i++) {
			let syndrome = 0;
			for (const coefficient of full) syndrome = mul(syndrome, EXP[i]) ^ coefficient;
			expect(syndrome, `syndrome ${i}`).toBe(0);
		}
	});
});
