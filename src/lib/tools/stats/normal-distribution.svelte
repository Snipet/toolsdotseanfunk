<script lang="ts">
	import { normalCdf, normalInv, normalPdf } from '$lib/math/stats';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ mean: 100, sd: 15, mode: 'below', x1: 115, x2: 130, p: 0.95 });

	const valid = $derived(s.sd > 0);

	const z1 = $derived((s.x1 - s.mean) / s.sd);
	const z2 = $derived((s.x2 - s.mean) / s.sd);

	const probability = $derived.by(() => {
		if (!valid) return NaN;
		switch (s.mode) {
			case 'below': return normalCdf(s.x1, s.mean, s.sd);
			case 'above': return 1 - normalCdf(s.x1, s.mean, s.sd);
			case 'between': return Math.abs(normalCdf(s.x2, s.mean, s.sd) - normalCdf(s.x1, s.mean, s.sd));
			default: return 1 - Math.abs(normalCdf(s.x2, s.mean, s.sd) - normalCdf(s.x1, s.mean, s.sd));
		}
	});

	const criticalValue = $derived(valid ? normalInv(s.p, s.mean, s.sd) : NaN);

	// Curve geometry: ±4 sd covers essentially the whole distribution.
	const W = 640;
	const H = 260;
	const lo = $derived(s.mean - 4 * s.sd);
	const hi = $derived(s.mean + 4 * s.sd);
	const peak = $derived(normalPdf(s.mean, s.mean, s.sd));
	const px = (x: number) => ((x - lo) / (hi - lo)) * W;
	const py = (d: number) => H - (d / peak) * (H - 24);

	const curve = $derived(
		Array.from({ length: 201 }, (_, i) => {
			const x = lo + ((hi - lo) * i) / 200;
			return `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(normalPdf(x, s.mean, s.sd)).toFixed(1)}`;
		}).join(' ')
	);

	/** Shaded region matching the selected probability mode. */
	const shaded = $derived.by(() => {
		if (!valid) return '';
		const clamp = (v: number) => Math.max(lo, Math.min(hi, v));
		const ranges: Array<[number, number]> =
			s.mode === 'below'
				? [[lo, clamp(s.x1)]]
				: s.mode === 'above'
					? [[clamp(s.x1), hi]]
					: s.mode === 'between'
						? [[clamp(Math.min(s.x1, s.x2)), clamp(Math.max(s.x1, s.x2))]]
						: [
								[lo, clamp(Math.min(s.x1, s.x2))],
								[clamp(Math.max(s.x1, s.x2)), hi]
							];

		return ranges
			.map(([a, b]) => {
				if (b <= a) return '';
				const steps = 80;
				let d = `M${px(a).toFixed(1)},${H}`;
				for (let i = 0; i <= steps; i++) {
					const x = a + ((b - a) * i) / steps;
					d += ` L${px(x).toFixed(1)},${py(normalPdf(x, s.mean, s.sd)).toFixed(1)}`;
				}
				return `${d} L${px(b).toFixed(1)},${H} Z`;
			})
			.join(' ');
	});

	const EMPIRICAL = [
		{ k: 1, label: '68.27%' },
		{ k: 2, label: '95.45%' },
		{ k: 3, label: '99.73%' }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Mean (μ)" for="nd-mean"><input id="nd-mean" type="number" step="any" bind:value={s.mean} /></Field>
			<Field label="Standard deviation (σ)" for="nd-sd" error={!valid ? 'Must be greater than zero' : undefined}>
				<input id="nd-sd" type="number" step="any" min="0.0001" bind:value={s.sd} />
			</Field>
			<Field label="Find" for="nd-mode">
				<select id="nd-mode" bind:value={s.mode}>
					<option value="below">P(X ≤ x)</option>
					<option value="above">P(X ≥ x)</option>
					<option value="between">P(x₁ ≤ X ≤ x₂)</option>
					<option value="outside">P(outside x₁ … x₂)</option>
				</select>
			</Field>
		</div>

		<div class="field-row">
			<Field label={s.mode === 'below' || s.mode === 'above' ? 'x' : 'x₁'} for="nd-x1">
				<input id="nd-x1" type="number" step="any" bind:value={s.x1} />
			</Field>
			{#if s.mode === 'between' || s.mode === 'outside'}
				<Field label="x₂" for="nd-x2"><input id="nd-x2" type="number" step="any" bind:value={s.x2} /></Field>
			{/if}
		</div>

		<svg viewBox="0 0 {W} {H}" class="curve" role="img" aria-label="Normal curve with the selected probability shaded">
			<path d={shaded} fill="color-mix(in srgb, var(--accent) 30%, transparent)" />
			<path d={curve} fill="none" stroke="var(--accent)" stroke-width="2.5" />
			<line x1="0" y1={H} x2={W} y2={H} stroke="var(--border-strong)" stroke-width="1" />
			<line x1={px(s.mean)} y1={py(peak)} x2={px(s.mean)} y2={H} stroke="var(--text-faint)" stroke-width="1" stroke-dasharray="3 3" />
			{#each [-3, -2, -1, 1, 2, 3] as k (k)}
				<line x1={px(s.mean + k * s.sd)} y1={H - 6} x2={px(s.mean + k * s.sd)} y2={H} stroke="var(--text-faint)" stroke-width="1" />
				<text x={px(s.mean + k * s.sd)} y={H - 10} text-anchor="middle" font-size="10" fill="var(--text-faint)">
					{k > 0 ? '+' : ''}{k}σ
				</text>
			{/each}
		</svg>

		<div class="results-grid">
			<Result label="Probability" primary value={valid ? `${fmtLoose(probability * 100, 4)}%` : '—'} detail={valid ? `p = ${fmtLoose(probability, 6)}` : undefined} />
			<Result label="z-score of x{s.mode === 'between' || s.mode === 'outside' ? '₁' : ''}" value={valid ? fmtLoose(z1, 4) : '—'} detail="(x − μ) ÷ σ" />
			{#if s.mode === 'between' || s.mode === 'outside'}
				<Result label="z-score of x₂" value={valid ? fmtLoose(z2, 4) : '—'} />
			{/if}
			<Result label="Complement" value={valid ? `${fmtLoose((1 - probability) * 100, 4)}%` : '—'} />
		</div>
	</div>

	<section class="card stack">
		<h2>Work backwards from a probability</h2>
		<div class="field-row">
			<Field label="Cumulative probability: {fmtLoose(s.p * 100, 2)}%" for="nd-p">
				<input id="nd-p" type="range" min="0.001" max="0.999" step="0.001" bind:value={s.p} />
			</Field>
			<Result label="Critical value" value={valid ? fmtLoose(criticalValue, 6) : '—'} detail="The x with this much area below it" />
			<Result label="Critical z" value={valid ? fmtLoose(normalInv(s.p), 6) : '—'} />
		</div>
	</section>

	<section class="card">
		<h2>The empirical rule</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Range</th><th>Values</th><th class="num">Contains</th></tr></thead>
				<tbody>
					{#each EMPIRICAL as row (row.k)}
						<tr>
							<td>μ ± {row.k}σ</td>
							<td class="num">{fmtLoose(s.mean - row.k * s.sd, 3)} to {fmtLoose(s.mean + row.k * s.sd, 3)}</td>
							<td class="num">{row.label}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			The normal distribution is the bell curve: symmetric about its mean, with the spread set by the
			standard deviation. It appears constantly not because nature prefers it, but because the
			central limit theorem drives sums and averages toward it regardless of what they started as.
		</p>
		<code class="formula">z = (x − μ) / σ
f(x) = (1 / σ√(2π)) · e^(−z²/2)</code>
		<h3>The z-score is the whole trick</h3>
		<p>
			A z-score says how many standard deviations a value sits from the mean. Converting to z lets
			one table serve every normal distribution — which is why z-tables exist at all, and why 1.96
			(95%) and 2.576 (99%) are worth memorising.
		</p>
		<h3>68–95–99.7</h3>
		<p>
			About 68% of values fall within one standard deviation of the mean, 95% within two, and 99.7%
			within three. For IQ scores (μ = 100, σ = 15) that puts about 2.3% of people above 130 — which
			matches the usual figure for the “gifted” threshold.
		</p>
		<h3>When not to use it</h3>
		<p>
			Normality is an assumption, not a guarantee. Income, city sizes, file sizes and insurance
			claims are all strongly right-skewed, and assuming a bell curve badly understates the tail. A
			histogram of your actual data is the cheapest check available.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			The cumulative distribution uses Graeme West's implementation of Hart's algorithm (accurate to
			about 1 × 10⁻¹⁵); the inverse uses Acklam's approximation with a Halley refinement. Both are
			verified against published z-table values in the test suite.
		</p>
	{/snippet}
</ToolShell>

<style>
	.curve {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
</style>
