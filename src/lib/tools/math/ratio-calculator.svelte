<script lang="ts">
	import { gcd } from '$lib/format';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ a: 3, b: 4, c: 9, d: 0, solve: 'd' });

	const solved = $derived.by(() => {
		const { a, b, c, d } = s;
		switch (s.solve) {
			case 'a': return (b * c) / d;
			case 'b': return (a * d) / c;
			case 'c': return (a * d) / b;
			default: return (b * c) / a;
		}
	});

	const values = $derived({
		a: s.solve === 'a' ? solved : s.a,
		b: s.solve === 'b' ? solved : s.b,
		c: s.solve === 'c' ? solved : s.c,
		d: s.solve === 'd' ? solved : s.d
	});

	const valid = $derived(Number.isFinite(solved));

	// Simplify the left-hand ratio when both parts are whole numbers.
	const simplified = $derived.by(() => {
		const { a, b } = values;
		if (!Number.isInteger(a) || !Number.isInteger(b) || a === 0 || b === 0) {
			return `${fmtLoose(a / b, 4)} : 1`;
		}
		const g = gcd(a, b) || 1;
		return `${a / g} : ${b / g}`;
	});

	const total = $derived(values.a + values.b);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<p class="small muted">Leave one box as the unknown and it is solved for you.</p>

		{#snippet slot(key: 'a' | 'b' | 'c' | 'd', label: string)}
			{#if s.solve === key}
				<input type="text" readonly class="solved" aria-label="{label} (solved)" value={valid ? fmtLoose(solved, 6) : '—'} />
			{:else}
				<input type="number" step="any" bind:value={s[key]} aria-label={label} />
			{/if}
		{/snippet}

		<div class="proportion">
			<div class="frac">
				{@render slot('a', 'A')}
				<span class="bar"></span>
				{@render slot('b', 'B')}
			</div>
			<span class="eq">=</span>
			<div class="frac">
				{@render slot('c', 'C')}
				<span class="bar"></span>
				{@render slot('d', 'D')}
			</div>
		</div>

		<Field label="Solve for" for="ratio-solve">
			<select id="ratio-solve" bind:value={s.solve}>
				<option value="a">A (top left)</option>
				<option value="b">B (bottom left)</option>
				<option value="c">C (top right)</option>
				<option value="d">D (bottom right)</option>
			</select>
		</Field>

		<Result
			label="Missing value"
			primary
			value={valid ? fmtLoose(solved, 8) : '—'}
			detail={valid ? `A : B = C : D  →  ${fmtLoose(values.a, 3)} : ${fmtLoose(values.b, 3)} = ${fmtLoose(values.c, 3)} : ${fmtLoose(values.d, 3)}` : 'Check for a zero in the denominator'}
		/>

		<div class="results-grid">
			<Result label="Simplified ratio" value={simplified} />
			<Result label="As a decimal" value={valid ? fmtLoose(values.a / values.b, 6) : '—'} />
			<Result label="As a percentage" value={valid ? `${fmtLoose((values.a / values.b) * 100, 4)}%` : '—'} />
			<Result label="Share of the total" value={valid && total ? `${fmtLoose((values.a / total) * 100, 2)}% : ${fmtLoose((values.b / total) * 100, 2)}%` : '—'} detail="Splitting {fmtLoose(total, 3)} in this ratio" />
		</div>
	</div>

	{#snippet explainer()}
		<p>
			A proportion says two ratios are equal. Cross-multiplying turns it into a single equation you
			can solve for whichever term is missing.
		</p>
		<code class="formula">A / B = C / D    →    A × D = B × C</code>
		<h3>Where this shows up</h3>
		<ul>
			<li><strong>Scaling recipes and mixtures</strong> — 3 parts to 4 parts, at any batch size.</li>
			<li><strong>Maps and models</strong> — 1 : 87 means 1 cm on the model is 87 cm in reality.</li>
			<li><strong>Unit pricing</strong> — if 3 kg costs £9, what does 5 kg cost?</li>
			<li><strong>Similar triangles</strong> — the classic shadow-and-height problem is a proportion.</li>
		</ul>
		<h3>Ratio versus fraction</h3>
		<p>
			“3 : 4” and “3/4” are not quite the same claim. The ratio compares two <em>parts</em>; the
			fraction compares a part to the <em>whole</em>. Mixing 3 : 4 gives seven parts total, of which
			the first is 3/7 — not 3/4. Getting this backwards is the single most common ratio error.
		</p>
	{/snippet}
</ToolShell>

<style>
	.proportion {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		flex-wrap: wrap;
	}
	.frac {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}
	.frac input {
		width: 100px;
		text-align: center;
	}
	.frac input.solved {
		background: var(--accent-soft);
		border-color: var(--accent-border);
		color: var(--accent);
		font-weight: 650;
	}
	.bar {
		width: 100px;
		height: 2px;
		background: var(--text);
	}
	.eq {
		font-size: 1.4rem;
		color: var(--text-muted);
	}
</style>
