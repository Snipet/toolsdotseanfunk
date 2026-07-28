/**
 * A QR code encoder, byte mode, versions 1–40.
 *
 * Implements ISO/IEC 18004: data encoding, Reed–Solomon error correction over
 * GF(256), block interleaving, the eight mask patterns with penalty scoring,
 * and format/version information. Written from the specification rather than
 * pulled in as a dependency, so the whole tool stays client-side and auditable.
 */

export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** Total data codewords per version, indexed [version - 1][L, M, Q, H]. */
const DATA_CODEWORDS: number[][] = [
	[19, 16, 13, 9], [34, 28, 22, 16], [55, 44, 34, 26], [80, 64, 48, 36],
	[108, 86, 62, 46], [136, 108, 76, 60], [156, 124, 88, 66], [194, 154, 110, 86],
	[232, 182, 132, 100], [274, 216, 154, 122], [324, 254, 180, 140], [370, 290, 206, 158],
	[428, 334, 244, 180], [461, 365, 261, 197], [523, 415, 295, 223], [589, 453, 325, 253],
	[647, 507, 367, 283], [721, 563, 397, 313], [795, 627, 445, 341], [861, 669, 485, 385],
	[932, 714, 512, 406], [1006, 782, 568, 442], [1094, 860, 614, 464], [1174, 914, 664, 514],
	[1276, 1000, 718, 538], [1370, 1062, 754, 596], [1468, 1128, 808, 628], [1531, 1193, 871, 661],
	[1631, 1267, 911, 701], [1735, 1373, 985, 745], [1843, 1455, 1033, 793], [1955, 1541, 1115, 845],
	[2071, 1631, 1171, 901], [2191, 1725, 1231, 961], [2306, 1812, 1286, 986], [2434, 1914, 1354, 1054],
	[2566, 1992, 1426, 1096], [2702, 2102, 1502, 1142], [2812, 2216, 1582, 1222], [2956, 2334, 1666, 1276]
];

/** EC codewords per block, indexed [version - 1][L, M, Q, H]. */
const EC_CODEWORDS_PER_BLOCK: number[][] = [
	[7, 10, 13, 17], [10, 16, 22, 28], [15, 26, 18, 22], [20, 18, 26, 16],
	[26, 24, 18, 22], [18, 16, 24, 28], [20, 18, 18, 26], [24, 22, 22, 26],
	[30, 22, 20, 24], [18, 26, 24, 28], [20, 30, 28, 24], [24, 22, 26, 28],
	[26, 22, 24, 22], [30, 24, 20, 24], [22, 24, 30, 24], [24, 28, 24, 30],
	[28, 28, 28, 28], [30, 26, 28, 28], [28, 26, 26, 26], [28, 26, 30, 28],
	[28, 26, 28, 30], [28, 28, 30, 24], [30, 28, 30, 30], [30, 28, 30, 30],
	[26, 28, 30, 30], [28, 28, 28, 30], [30, 28, 30, 30], [30, 28, 30, 30],
	[30, 28, 30, 30], [30, 28, 30, 30], [30, 28, 30, 30], [30, 28, 30, 30],
	[30, 28, 30, 30], [30, 28, 30, 30], [30, 28, 30, 30], [30, 28, 30, 30],
	[30, 28, 30, 30], [30, 28, 30, 30], [30, 28, 30, 30], [30, 28, 30, 30]
];

/** Number of error-correction blocks, indexed [version - 1][L, M, Q, H]. */
const EC_BLOCKS: number[][] = [
	[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 2, 2], [1, 2, 2, 4],
	[1, 2, 4, 4], [2, 4, 4, 4], [2, 4, 6, 5], [2, 4, 6, 6],
	[2, 5, 8, 8], [4, 5, 8, 8], [4, 5, 8, 11], [4, 8, 10, 11],
	[4, 9, 12, 16], [4, 9, 16, 16], [6, 10, 12, 18], [6, 10, 17, 16],
	[6, 11, 16, 19], [6, 13, 18, 21], [7, 14, 21, 25], [8, 16, 20, 25],
	[8, 17, 23, 25], [9, 17, 23, 34], [9, 18, 25, 30], [10, 20, 27, 32],
	[12, 21, 29, 35], [12, 23, 34, 37], [12, 25, 34, 40], [13, 26, 35, 42],
	[14, 28, 38, 45], [15, 29, 40, 48], [16, 31, 43, 51], [17, 33, 45, 54],
	[18, 35, 48, 57], [19, 37, 51, 60], [19, 38, 53, 63], [20, 40, 56, 66],
	[21, 43, 59, 70], [22, 45, 62, 74], [24, 47, 65, 77], [25, 49, 68, 81]
];

/** Row/column centres of the alignment patterns, per version. */
const ALIGNMENT_POSITIONS: number[][] = [
	[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
	[6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
	[6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86],
	[6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102],
	[6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
	[6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
	[6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142],
	[6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
	[6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166],
	[6, 30, 58, 86, 114, 142, 170]
];

const EC_ORDER: ErrorCorrection[] = ['L', 'M', 'Q', 'H'];
const EC_FORMAT_BITS: Record<ErrorCorrection, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };

// --- GF(256) arithmetic -----------------------------------------------------

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

{
	let x = 1;
	for (let i = 0; i < 255; i++) {
		EXP[i] = x;
		LOG[x] = i;
		// Multiply by 2 in GF(256) with the QR primitive polynomial 0x11D.
		x <<= 1;
		if (x & 0x100) x ^= 0x11d;
	}
	for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

function gfMultiply(a: number, b: number): number {
	if (a === 0 || b === 0) return 0;
	return EXP[LOG[a] + LOG[b]];
}

/** Generator polynomial for `degree` error-correction codewords. */
function generatorPolynomial(degree: number): Uint8Array {
	let poly = new Uint8Array([1]);
	for (let i = 0; i < degree; i++) {
		const next = new Uint8Array(poly.length + 1);
		for (let j = 0; j < poly.length; j++) {
			next[j] ^= poly[j];
			next[j + 1] ^= gfMultiply(poly[j], EXP[i]);
		}
		poly = next;
	}
	return poly;
}

function reedSolomon(data: Uint8Array, ecLength: number): Uint8Array {
	const generator = generatorPolynomial(ecLength);
	const remainder = new Uint8Array(ecLength);

	for (const byte of data) {
		const factor = byte ^ remainder[0];
		remainder.copyWithin(0, 1);
		remainder[ecLength - 1] = 0;
		for (let i = 0; i < ecLength; i++) {
			remainder[i] ^= gfMultiply(generator[i + 1], factor);
		}
	}
	return remainder;
}

// --- Encoding ---------------------------------------------------------------

class BitBuffer {
	bits: number[] = [];

	put(value: number, length: number): void {
		for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
	}

	get length(): number {
		return this.bits.length;
	}
}

/** Character-count indicator width for byte mode at this version. */
function byteModeLengthBits(version: number): number {
	return version < 10 ? 8 : 16;
}

function chooseVersion(byteLength: number, ec: ErrorCorrection): number {
	const ecIndex = EC_ORDER.indexOf(ec);
	for (let version = 1; version <= 40; version++) {
		const capacityBits = DATA_CODEWORDS[version - 1][ecIndex] * 8;
		const needed = 4 + byteModeLengthBits(version) + byteLength * 8;
		if (needed <= capacityBits) return version;
	}
	return -1;
}

function buildCodewords(data: Uint8Array, version: number, ec: ErrorCorrection): Uint8Array {
	const ecIndex = EC_ORDER.indexOf(ec);
	const totalDataCodewords = DATA_CODEWORDS[version - 1][ecIndex];

	const buffer = new BitBuffer();
	buffer.put(0b0100, 4); // byte mode
	buffer.put(data.length, byteModeLengthBits(version));
	for (const byte of data) buffer.put(byte, 8);

	// Terminator, then pad to a byte boundary.
	const capacityBits = totalDataCodewords * 8;
	buffer.put(0, Math.min(4, capacityBits - buffer.length));
	while (buffer.length % 8 !== 0) buffer.bits.push(0);

	const codewords: number[] = [];
	for (let i = 0; i < buffer.length; i += 8) {
		let byte = 0;
		for (let j = 0; j < 8; j++) byte = (byte << 1) | buffer.bits[i + j];
		codewords.push(byte);
	}
	// Alternating pad bytes, as specified.
	const PAD = [0xec, 0x11];
	let padIndex = 0;
	while (codewords.length < totalDataCodewords) codewords.push(PAD[padIndex++ % 2]);

	// Split into blocks, compute EC per block, then interleave.
	const blockCount = EC_BLOCKS[version - 1][ecIndex];
	const ecPerBlock = EC_CODEWORDS_PER_BLOCK[version - 1][ecIndex];
	const shortBlockSize = Math.floor(totalDataCodewords / blockCount);
	const longBlockCount = totalDataCodewords % blockCount;

	const dataBlocks: number[][] = [];
	const ecBlocks: Uint8Array[] = [];
	let offset = 0;
	for (let b = 0; b < blockCount; b++) {
		const size = shortBlockSize + (b >= blockCount - longBlockCount ? 1 : 0);
		const block = codewords.slice(offset, offset + size);
		offset += size;
		dataBlocks.push(block);
		ecBlocks.push(reedSolomon(Uint8Array.from(block), ecPerBlock));
	}

	const out: number[] = [];
	const maxDataLength = Math.max(...dataBlocks.map((b) => b.length));
	for (let i = 0; i < maxDataLength; i++) {
		for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
	}
	for (let i = 0; i < ecPerBlock; i++) {
		for (const block of ecBlocks) out.push(block[i]);
	}
	return Uint8Array.from(out);
}

// --- Matrix construction ----------------------------------------------------

type Cell = 0 | 1 | null;

function buildMatrix(version: number, ec: ErrorCorrection, codewords: Uint8Array, mask: number): Cell[][] {
	const size = version * 4 + 17;
	const matrix: Cell[][] = Array.from({ length: size }, () => new Array<Cell>(size).fill(null));
	const reserved: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

	const place = (r: number, c: number, value: Cell) => {
		matrix[r][c] = value;
		reserved[r][c] = true;
	};

	// Finder patterns plus their separators.
	const finder = (row: number, col: number) => {
		for (let r = -1; r <= 7; r++) {
			for (let c = -1; c <= 7; c++) {
				const rr = row + r;
				const cc = col + c;
				if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
				const inner = r >= 0 && r <= 6 && c >= 0 && c <= 6;
				const isDark =
					inner &&
					((r === 0 || r === 6 || c === 0 || c === 6) || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
				place(rr, cc, isDark ? 1 : 0);
			}
		}
	};
	finder(0, 0);
	finder(0, size - 7);
	finder(size - 7, 0);

	// Timing patterns.
	for (let i = 8; i < size - 8; i++) {
		place(6, i, i % 2 === 0 ? 1 : 0);
		place(i, 6, i % 2 === 0 ? 1 : 0);
	}

	// Alignment patterns, skipping the three finder corners.
	const positions = ALIGNMENT_POSITIONS[version - 1];
	for (const row of positions) {
		for (const col of positions) {
			const nearFinder =
				(row <= 8 && col <= 8) || (row <= 8 && col >= size - 9) || (row >= size - 9 && col <= 8);
			if (nearFinder) continue;
			for (let r = -2; r <= 2; r++) {
				for (let c = -2; c <= 2; c++) {
					const isDark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
					place(row + r, col + c, isDark ? 1 : 0);
				}
			}
		}
	}

	// Dark module, always set.
	place(size - 8, 8, 1);

	// Reserve the format information areas before laying out data.
	for (let i = 0; i < 9; i++) {
		if (!reserved[8][i]) reserved[8][i] = true;
		if (!reserved[i][8]) reserved[i][8] = true;
	}
	for (let i = 0; i < 8; i++) {
		reserved[8][size - 1 - i] = true;
		reserved[size - 1 - i][8] = true;
	}
	if (version >= 7) {
		for (let i = 0; i < 6; i++) {
			for (let j = 0; j < 3; j++) {
				reserved[i][size - 11 + j] = true;
				reserved[size - 11 + j][i] = true;
			}
		}
	}

	// Data placement: two columns at a time, right to left, boustrophedon.
	let bitIndex = 0;
	const totalBits = codewords.length * 8;
	let upward = true;
	for (let right = size - 1; right >= 1; right -= 2) {
		if (right === 6) right = 5; // skip the vertical timing column
		for (let step = 0; step < size; step++) {
			const row = upward ? size - 1 - step : step;
			for (const col of [right, right - 1]) {
				if (reserved[row][col]) continue;
				let bit = 0;
				if (bitIndex < totalBits) {
					bit = (codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1;
					bitIndex++;
				}
				matrix[row][col] = (bit ^ (maskBit(mask, row, col) ? 1 : 0)) as Cell;
			}
		}
		upward = !upward;
	}

	// Format information: 5 data bits, BCH(15,5), XOR 0x5412.
	const formatData = (EC_FORMAT_BITS[ec] << 3) | mask;
	let rem = formatData;
	for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
	const format = ((formatData << 10) | rem) ^ 0x5412;

	for (let i = 0; i < 15; i++) {
		const bit = ((format >>> i) & 1) as Cell;
		// Around the top-left finder.
		if (i < 6) matrix[i][8] = bit;
		else if (i < 8) matrix[i + 1][8] = bit;
		else if (i === 8) matrix[8][7] = bit;
		else matrix[8][14 - i] = bit;
		// Mirrored copy along the other two finders.
		if (i < 8) matrix[8][size - 1 - i] = bit;
		else matrix[size - 15 + i][8] = bit;
	}

	// Version information for versions 7 and above: BCH(18,6).
	if (version >= 7) {
		let versionRem = version;
		for (let i = 0; i < 12; i++) versionRem = (versionRem << 1) ^ ((versionRem >>> 11) * 0x1f25);
		const versionBits = (version << 12) | versionRem;
		for (let i = 0; i < 18; i++) {
			const bit = ((versionBits >>> i) & 1) as Cell;
			const row = Math.floor(i / 3);
			const col = size - 11 + (i % 3);
			matrix[row][col] = bit;
			matrix[col][row] = bit;
		}
	}

	return matrix;
}

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

/** The four penalty rules from the specification; lower is better. */
function penalty(matrix: Cell[][]): number {
	const size = matrix.length;
	let score = 0;

	// Rule 1: runs of five or more same-coloured modules in a row or column.
	for (const transposed of [false, true]) {
		for (let a = 0; a < size; a++) {
			let run = 1;
			for (let b = 1; b < size; b++) {
				const current = transposed ? matrix[b][a] : matrix[a][b];
				const previous = transposed ? matrix[b - 1][a] : matrix[a][b - 1];
				if (current === previous) {
					run++;
				} else {
					if (run >= 5) score += 3 + (run - 5);
					run = 1;
				}
			}
			if (run >= 5) score += 3 + (run - 5);
		}
	}

	// Rule 2: 2×2 blocks of the same colour.
	for (let r = 0; r < size - 1; r++) {
		for (let c = 0; c < size - 1; c++) {
			const v = matrix[r][c];
			if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) score += 3;
		}
	}

	// Rule 3: finder-like patterns.
	const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
	const B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
	for (const transposed of [false, true]) {
		for (let a = 0; a < size; a++) {
			for (let b = 0; b <= size - 11; b++) {
				const window = Array.from({ length: 11 }, (_, i) =>
					transposed ? matrix[b + i][a] : matrix[a][b + i]
				);
				if (A.every((v, i) => v === window[i]) || B.every((v, i) => v === window[i])) score += 40;
			}
		}
	}

	// Rule 4: deviation from a 50/50 light/dark balance.
	let dark = 0;
	for (const row of matrix) for (const cell of row) if (cell === 1) dark++;
	const percent = (dark * 100) / (size * size);
	score += Math.floor(Math.abs(percent - 50) / 5) * 10;

	return score;
}

export interface QrCode {
	size: number;
	version: number;
	errorCorrection: ErrorCorrection;
	mask: number;
	modules: boolean[][];
}

/** Encode text as a QR code, choosing the smallest version and best mask. */
export function encodeQr(text: string, ec: ErrorCorrection = 'M'): QrCode {
	const data = new TextEncoder().encode(text);
	const version = chooseVersion(data.length, ec);
	if (version === -1) {
		throw new Error(
			`Too much data for a QR code at error correction level ${ec} — ${data.length} bytes exceeds the maximum.`
		);
	}

	const codewords = buildCodewords(data, version, ec);

	let best: Cell[][] | null = null;
	let bestMask = 0;
	let bestScore = Infinity;
	for (let mask = 0; mask < 8; mask++) {
		const candidate = buildMatrix(version, ec, codewords, mask);
		const score = penalty(candidate);
		if (score < bestScore) {
			bestScore = score;
			best = candidate;
			bestMask = mask;
		}
	}

	return {
		size: version * 4 + 17,
		version,
		errorCorrection: ec,
		mask: bestMask,
		modules: best!.map((row) => row.map((cell) => cell === 1))
	};
}

/** Maximum bytes that fit at a given error-correction level. */
export function maxBytes(ec: ErrorCorrection): number {
	const ecIndex = EC_ORDER.indexOf(ec);
	const capacityBits = DATA_CODEWORDS[39][ecIndex] * 8;
	return Math.floor((capacityBits - 4 - 16) / 8);
}

/** Render to an SVG string with a quiet zone of four modules, as specified. */
export function toSvg(code: QrCode, options: { dark?: string; light?: string; margin?: number; size?: number } = {}): string {
	const { dark = '#000000', light = '#ffffff', margin = 4 } = options;
	const total = code.size + margin * 2;
	const paths: string[] = [];

	for (let r = 0; r < code.size; r++) {
		for (let c = 0; c < code.size; c++) {
			if (code.modules[r][c]) paths.push(`M${c + margin},${r + margin}h1v1h-1z`);
		}
	}

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"`,
		options.size ? ` width="${options.size}" height="${options.size}"` : '',
		` shape-rendering="crispEdges">`,
		`<rect width="${total}" height="${total}" fill="${light}"/>`,
		`<path d="${paths.join('')}" fill="${dark}"/>`,
		`</svg>`
	].join('');
}
