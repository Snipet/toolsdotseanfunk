<script lang="ts">
	import { parseNumbers, summarize } from '$lib/math/stats';
	import { fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let raw = $state('12, 15, 11, 18, 14, 15, 22, 9, 15, 17, 13, 41');

	const values = $derived(parseNumbers(raw));
	const s = $derived(summarize(values));

	const W = 640;
	const H = 120;

	// Box plot geometry, padded so whiskers and outliers stay on canvas.
	const plot = $derived.by(() => {
		if (!s) return null;
		const lo = Math.min(s.min, s.q1 - 1.5 * s.iqr);
		const hi = Math.max(s.max, s.q3 + 1.5 * s.iqr);
		const pad = (hi - lo) * 0.06 || 1;
		const min = lo - pad;
		const max = hi + pad;
		const x = (v: number) => ((v - min) / (max - min)) * W;
		const inliers = s.sorted.filter((v) => !s.outliers.includes(v));
		return {
			x,
			min,
			max,
			whiskerLow: Math.min(...inliers),
			whiskerHigh: Math.max(...inliers)
		};
	});

	const summaryText = $derived(
		!s
			? ''
			: [
					`n\t${s.n}`,
					`mean\t${s.mean}`,
					`median\t${s.median}`,
					`sd (sample)\t${s.sd}`,
					`sd (population)\t${s.sdPopulation}`,
					`min\t${s.min}`,
					`Q1\t${s.q1}`,
					`Q3\t${s.q3}`,
					`max\t${s.max}`
				].join('\n')
	);
</script>

<ToolShell {tool}>
	<div class="card">
		<div class="head">
			<label for="ds-data">Your data — separate with commas, spaces or newlines</label>
			{#if s}<CopyButton value={summaryText} label="Copy summary" />{/if}
		</div>
		<textarea id="ds-data" bind:value={raw} rows="5" spellcheck="false" class="mono"></textarea>
		<p class="small muted">
			{values.length} value{values.length === 1 ? '' : 's'} read.
		</p>
	</div>

	{#if !s}
		<Note tone="warning">Paste some numbers to see the summary.</Note>
	{:else}
		<div class="results-grid">
			<Result label="Mean" primary value={fmtLoose(s.mean, 6)} detail="Sum {fmtLoose(s.sum, 4)} ÷ {s.n}" />
			<Result label="Median" primary value={fmtLoose(s.median, 6)} detail="The middle value" />
			<Result
				label="Mode"
				value={s.modes.length ? s.modes.map((m) => fmtLoose(m, 4)).join(', ') : 'None'}
				detail={s.modes.length > 1 ? 'Multimodal' : s.modes.length ? 'Most frequent value' : 'Every value appears once'}
			/>
			<Result label="Count" value={String(s.n)} />
		</div>

		<section class="card">
			<h2>Spread</h2>
			<div class="results-grid">
				<Result label="Standard deviation (sample)" value={fmtLoose(s.sd, 6)} detail="Divides by n − 1 — use for a sample" />
				<Result label="Standard deviation (population)" value={fmtLoose(s.sdPopulation, 6)} detail="Divides by n — use for the whole population" />
				<Result label="Variance (sample)" value={fmtLoose(s.variance, 6)} />
				<Result label="Standard error of the mean" value={fmtLoose(s.sem, 6)} detail="sd ÷ √n" />
				<Result label="Range" value={fmtLoose(s.range, 6)} detail="{fmtLoose(s.min, 4)} to {fmtLoose(s.max, 4)}" />
				<Result label="Interquartile range" value={fmtLoose(s.iqr, 6)} detail="Q3 − Q1" />
			</div>
		</section>

		<section class="card">
			<h2>Five-number summary</h2>
			{#if plot}
				<svg viewBox="0 0 {W} {H}" class="boxplot" role="img" aria-label="Box plot of the data">
					<line x1={plot.x(plot.whiskerLow)} y1="60" x2={plot.x(s.q1)} y2="60" stroke="var(--text-muted)" stroke-width="2" />
					<line x1={plot.x(s.q3)} y1="60" x2={plot.x(plot.whiskerHigh)} y2="60" stroke="var(--text-muted)" stroke-width="2" />
					<line x1={plot.x(plot.whiskerLow)} y1="42" x2={plot.x(plot.whiskerLow)} y2="78" stroke="var(--text-muted)" stroke-width="2" />
					<line x1={plot.x(plot.whiskerHigh)} y1="42" x2={plot.x(plot.whiskerHigh)} y2="78" stroke="var(--text-muted)" stroke-width="2" />
					<rect
						x={plot.x(s.q1)}
						y="32"
						width={Math.max(1, plot.x(s.q3) - plot.x(s.q1))}
						height="56"
						fill="color-mix(in srgb, var(--accent) 18%, transparent)"
						stroke="var(--accent)"
						stroke-width="2"
						rx="2"
					/>
					<line x1={plot.x(s.median)} y1="32" x2={plot.x(s.median)} y2="88" stroke="var(--accent)" stroke-width="3" />
					{#each s.outliers as o (o)}
						<circle cx={plot.x(o)} cy="60" r="4" fill="none" stroke="var(--negative)" stroke-width="2" />
					{/each}
					<text x={plot.x(s.q1)} y="24" text-anchor="middle" font-size="11" fill="var(--text-muted)">Q1 {fmtLoose(s.q1, 3)}</text>
					<text x={plot.x(s.median)} y="108" text-anchor="middle" font-size="11" fill="var(--accent)">med {fmtLoose(s.median, 3)}</text>
					<text x={plot.x(s.q3)} y="24" text-anchor="middle" font-size="11" fill="var(--text-muted)">Q3 {fmtLoose(s.q3, 3)}</text>
				</svg>
			{/if}
			<div class="results-grid">
				<Result label="Minimum" value={fmtLoose(s.min, 6)} />
				<Result label="Q1 (25th percentile)" value={fmtLoose(s.q1, 6)} />
				<Result label="Median (50th)" value={fmtLoose(s.median, 6)} />
				<Result label="Q3 (75th percentile)" value={fmtLoose(s.q3, 6)} />
				<Result label="Maximum" value={fmtLoose(s.max, 6)} />
			</div>
		</section>

		<section class="card">
			<h2>Shape and outliers</h2>
			<div class="results-grid">
				<Result
					label="Skewness"
					value={fmtLoose(s.skewness, 4)}
					detail={Math.abs(s.skewness) < 0.5 ? 'Roughly symmetric' : s.skewness > 0 ? 'Right-tailed — a few large values pull the mean up' : 'Left-tailed — a few small values pull the mean down'}
				/>
				<Result
					label="Outliers (1.5 × IQR rule)"
					value={s.outliers.length ? s.outliers.map((o) => fmtLoose(o, 4)).join(', ') : 'None'}
					tone={s.outliers.length ? 'warning' : 'neutral'}
					detail={`Outside ${fmtLoose(s.q1 - 1.5 * s.iqr, 3)} to ${fmtLoose(s.q3 + 1.5 * s.iqr, 3)}`}
				/>
				<Result
					label="Mean vs median"
					value={fmtLoose(s.mean - s.median, 4)}
					detail={Math.abs(s.mean - s.median) < 1e-9 ? 'Identical — a symmetric distribution' : 'A gap between them signals skew'}
				/>
			</div>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			Three questions describe most datasets: where is the centre, how spread out is it, and is
			anything unusual? Mean and median answer the first, standard deviation and IQR the second,
			Tukey's fences the third.
		</p>
		<h3>Sample or population — the n vs n−1 question</h3>
		<p>
			If your numbers are the <em>entire</em> group you care about, divide by n. If they are a sample
			you are using to estimate a larger population, divide by n − 1. Dividing by n understates the
			true spread, because the sample mean sits closer to your own data than the real mean does;
			n − 1 (Bessel's correction) removes that bias. When in doubt, use the sample figure.
		</p>
		<code class="formula">sample sd     = √( Σ(x − x̄)² / (n − 1) )
population sd = √( Σ(x − μ)²  /  n     )</code>
		<h3>Mean versus median</h3>
		<p>
			The mean uses every value, so a single extreme number moves it. The median only cares about
			order, so it does not. When the two differ substantially, the distribution is skewed — which is
			exactly why incomes are reported as medians and test scores as means.
		</p>
		<h3>Outliers are not errors</h3>
		<p>
			The 1.5 × IQR rule flags points unusually far from the middle half of the data. That is a
			prompt to investigate, not permission to delete. An outlier may be a typo, or it may be the
			most interesting observation you have.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Quartiles use linear interpolation between order statistics (R's type 7, NumPy's default), so
			results match those tools. Outlier detection uses Tukey's 1.5 × IQR fences; skewness is the
			adjusted Fisher–Pearson standardised moment coefficient, matching Excel's <code>SKEW</code>.
		</p>
	{/snippet}
</ToolShell>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.3rem;
	}
	.head label {
		margin-bottom: 0;
	}
	.boxplot {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		margin: 0.75rem 0 1rem;
	}
</style>
