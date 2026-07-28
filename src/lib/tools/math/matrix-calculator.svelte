<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ a: '4 7\n2 6', b: '1 0\n0 1', op: 'multiply' });

	type Matrix = number[][];

	function parse(text: string): Matrix | null {
		const rows = text
			.trim()
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => line.split(/[\s,]+/).map(Number));
		if (!rows.length) return null;
		const width = rows[0].length;
		if (rows.some((r) => r.length !== width || r.some((v) => !Number.isFinite(v)))) return null;
		return rows;
	}

	const A = $derived(parse(s.a));
	const B = $derived(parse(s.b));

	function multiply(m: Matrix, n: Matrix): Matrix | null {
		if (m[0].length !== n.length) return null;
		return m.map((row) => n[0].map((_, j) => row.reduce((sum, v, k) => sum + v * n[k][j], 0)));
	}

	function transpose(m: Matrix): Matrix {
		return m[0].map((_, j) => m.map((row) => row[j]));
	}

	function determinant(m: Matrix): number {
		const n = m.length;
		if (n !== m[0].length) return NaN;
		// LU-style elimination with partial pivoting; O(n³) and numerically sane.
		const a = m.map((r) => [...r]);
		let det = 1;
		for (let i = 0; i < n; i++) {
			let pivot = i;
			for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > Math.abs(a[pivot][i])) pivot = r;
			if (Math.abs(a[pivot][i]) < 1e-12) return 0;
			if (pivot !== i) {
				[a[i], a[pivot]] = [a[pivot], a[i]];
				det = -det;
			}
			det *= a[i][i];
			for (let r = i + 1; r < n; r++) {
				const f = a[r][i] / a[i][i];
				for (let c = i; c < n; c++) a[r][c] -= f * a[i][c];
			}
		}
		return det;
	}

	/** Gauss-Jordan to reduced row echelon form; also yields rank and the inverse. */
	function rref(m: Matrix): { matrix: Matrix; rank: number } {
		const a = m.map((r) => [...r]);
		const rows = a.length;
		const cols = a[0].length;
		let lead = 0;
		let rank = 0;
		for (let r = 0; r < rows && lead < cols; r++) {
			let i = r;
			while (Math.abs(a[i][lead]) < 1e-12) {
				i++;
				if (i === rows) {
					i = r;
					lead++;
					if (lead === cols) return { matrix: a, rank };
				}
			}
			[a[i], a[r]] = [a[r], a[i]];
			const lv = a[r][lead];
			for (let c = 0; c < cols; c++) a[r][c] /= lv;
			for (let k = 0; k < rows; k++) {
				if (k === r) continue;
				const f = a[k][lead];
				for (let c = 0; c < cols; c++) a[k][c] -= f * a[r][c];
			}
			lead++;
			rank++;
		}
		return { matrix: a, rank };
	}

	function inverse(m: Matrix): Matrix | null {
		const n = m.length;
		if (n !== m[0].length) return null;
		const augmented = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
		const { matrix } = rref(augmented);
		// The left half must have become the identity for an inverse to exist.
		for (let i = 0; i < n; i++) if (Math.abs(matrix[i][i] - 1) > 1e-8) return null;
		return matrix.map((row) => row.slice(n));
	}

	const result = $derived.by(() => {
		if (!A) return { error: 'Matrix A could not be parsed — every row needs the same number of values.' };
		switch (s.op) {
			case 'multiply': {
				if (!B) return { error: 'Matrix B could not be parsed.' };
				const m = multiply(A, B);
				return m
					? { matrix: m, note: `${A.length}×${A[0].length} times ${B.length}×${B[0].length} gives ${m.length}×${m[0].length}` }
					: { error: `Cannot multiply: A has ${A[0].length} columns but B has ${B.length} rows.` };
			}
			case 'add':
			case 'subtract': {
				if (!B) return { error: 'Matrix B could not be parsed.' };
				if (A.length !== B.length || A[0].length !== B[0].length)
					return { error: 'Addition needs matrices of identical shape.' };
				const sign = s.op === 'add' ? 1 : -1;
				return { matrix: A.map((row, i) => row.map((v, j) => v + sign * B[i][j])) };
			}
			case 'transpose':
				return { matrix: transpose(A), note: `${A.length}×${A[0].length} becomes ${A[0].length}×${A.length}` };
			case 'determinant': {
				const d = determinant(A);
				return Number.isNaN(d)
					? { error: 'The determinant is only defined for square matrices.' }
					: { scalar: d, note: d === 0 ? 'Zero determinant — the matrix is singular and has no inverse.' : undefined };
			}
			case 'inverse': {
				const inv = inverse(A);
				return inv ? { matrix: inv } : { error: 'This matrix is singular — no inverse exists.' };
			}
			default: {
				const { matrix, rank } = rref(A);
				return { matrix, note: `Rank ${rank}` };
			}
		}
	});

	const needsB = $derived(['multiply', 'add', 'subtract'].includes(s.op));

	const asText = $derived.by(() => {
		if ('matrix' in result && result.matrix) {
			return result.matrix.map((row) => row.map((v) => fmtLoose(v, 6)).join('\t')).join('\n');
		}
		if ('scalar' in result && typeof result.scalar === 'number') return fmtLoose(result.scalar, 8);
		return '';
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field label="Operation" for="mx-op">
			<select id="mx-op" bind:value={s.op}>
				<option value="multiply">A × B</option>
				<option value="add">A + B</option>
				<option value="subtract">A − B</option>
				<option value="transpose">Transpose of A</option>
				<option value="determinant">Determinant of A</option>
				<option value="inverse">Inverse of A</option>
				<option value="rref">Reduced row echelon form of A</option>
			</select>
		</Field>

		<Note>
			Type one row per line, values separated by spaces or commas. Shape is inferred, so a 3×4
			matrix needs no configuration.
		</Note>

		<div class="tool-card-grid">
			<div>
				<label for="mx-a">Matrix A {A ? `(${A.length}×${A[0].length})` : ''}</label>
				<textarea id="mx-a" class="mono" bind:value={s.a} rows="5" spellcheck="false"></textarea>
			</div>
			{#if needsB}
				<div>
					<label for="mx-b">Matrix B {B ? `(${B.length}×${B[0].length})` : ''}</label>
					<textarea id="mx-b" class="mono" bind:value={s.b} rows="5" spellcheck="false"></textarea>
				</div>
			{/if}
		</div>
	</div>

	<section class="card">
		<div class="out-head">
			<h2>Result</h2>
			{#if asText}<CopyButton value={asText} label="Copy" />{/if}
		</div>

		{#if 'error' in result}
			<Note tone="warning">{result.error}</Note>
		{:else if 'scalar' in result && typeof result.scalar === 'number'}
			<Result label="Determinant" primary value={fmtLoose(result.scalar, 8)} detail={result.note} />
		{:else}
			<div class="scroll-x">
				<table class="matrix">
					<tbody>
						{#each result.matrix as row, i (i)}
							<tr>
								{#each row as cell, j (j)}
									<td>{fmtLoose(Math.abs(cell) < 1e-12 ? 0 : cell, 6)}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if result.note}<p class="small muted">{result.note}</p>{/if}
		{/if}
	</section>

	{#snippet explainer()}
		<p>
			A matrix is a rectangle of numbers, and matrix operations are the language of linear algebra —
			solving systems of equations, transforming graphics, running regressions, propagating a neural
			network's weights.
		</p>
		<h3>Multiplication is not commutative</h3>
		<p>
			AB and BA are generally different matrices, and one may not even be defined. Multiplication
			requires the columns of A to match the rows of B: an m×n times an n×p gives an m×p. Each entry
			is the dot product of a row of A with a column of B.
		</p>
		<code class="formula">(AB)ᵢⱼ = Σₖ Aᵢₖ × Bₖⱼ</code>
		<h3>The determinant</h3>
		<p>
			For a square matrix, the determinant is the factor by which the transformation scales area (2D)
			or volume (3D). A determinant of 0 means the transformation flattens space onto a lower
			dimension — information is destroyed, so it cannot be undone, which is exactly why singular
			matrices have no inverse.
		</p>
		<h3>Reduced row echelon form</h3>
		<p>
			RREF is the canonical simplified form: leading 1s stepping right and down, zeros everywhere else
			in those columns. It solves linear systems, reveals the rank, and finds a basis for the column
			space — all from one elimination.
		</p>
		<h3>Numerical notes</h3>
		<p>
			Elimination uses partial pivoting to stay stable, and values within 10⁻¹² of zero are displayed
			as 0 rather than as floating-point dust. For ill-conditioned matrices, treat the last couple of
			digits with suspicion.
		</p>
	{/snippet}
</ToolShell>

<style>
	.out-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.out-head h2 {
		font-size: 1.05rem;
	}
	table.matrix {
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 0.9rem;
	}
	table.matrix td {
		padding: 0.4rem 0.75rem;
		text-align: right;
		border: 1px solid var(--border);
		background: var(--bg-sunken);
		min-width: 70px;
	}
	textarea {
		font-size: 0.9rem;
		min-height: 130px;
	}
</style>
