<script lang="ts">
	import { linearRegression, summarize } from '$lib/math/stats';
	import { fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let raw = $state(`1, 2.1
2, 4.2
3, 5.8
4, 8.4
5, 9.9
6, 12.3
7, 13.8
8, 16.5`);

	let predictX = $state(10);

	const points = $derived(
		raw
			.split('\n')
			.map((line) => line.split(/[\s,;\t]+/).filter(Boolean).map(Number))
			.filter((pair) => pair.length >= 2 && pair.every(Number.isFinite))
			.map(([x, y]) => ({ x, y }))
	);

	const fit = $derived(linearRegression(points));

	const W = 640;
	const H = 340;
	const PAD = 44;

	const geometry = $derived.by(() => {
		if (!points.length) return null;
		const xs = points.map((p) => p.x);
		const ys = points.map((p) => p.y);
		const xMin = Math.min(...xs);
		const xMax = Math.max(...xs);
		const yMin = Math.min(...ys);
		const yMax = Math.max(...ys);
		const xPad = (xMax - xMin) * 0.08 || 1;
		const yPad = (yMax - yMin) * 0.08 || 1;
		const x0 = xMin - xPad;
		const x1 = xMax + xPad;
		const y0 = yMin - yPad;
		const y1 = yMax + yPad;
		return {
			x0, x1, y0, y1,
			px: (x: number) => PAD + ((x - x0) / (x1 - x0)) * (W - PAD - 12),
			py: (y: number) => H - PAD - ((y - y0) / (y1 - y0)) * (H - PAD - 12)
		};
	});

	const residuals = $derived(
		fit ? points.map((p) => ({ ...p, residual: p.y - fit.predict(p.x) })) : []
	);
	const residualSummary = $derived(summarize(residuals.map((r) => r.residual)));
</script>

<ToolShell {tool}>
	<div class="card">
		<label for="lr-data">Data — one “x, y” pair per line</label>
		<textarea id="lr-data" bind:value={raw} rows="8" spellcheck="false" class="mono"></textarea>
		<p class="small muted">{points.length} point{points.length === 1 ? '' : 's'} read.</p>
	</div>

	{#if !fit}
		<Note tone="warning">
			Enter at least two points with different x values. A vertical line has no slope to fit.
		</Note>
	{:else}
		<div class="results-grid">
			<Result label="Equation" primary value={`y = ${fmtLoose(fit.slope, 6)}x ${fit.intercept >= 0 ? '+' : '−'} ${fmtLoose(Math.abs(fit.intercept), 6)}`} />
			<Result label="R²" primary value={fmtLoose(fit.r2, 6)} detail={`${fmtLoose(fit.r2 * 100, 2)}% of the variation in y is explained by x`} />
			<Result label="Correlation (r)" value={fmtLoose(fit.r, 6)} detail={Math.abs(fit.r) > 0.9 ? 'Very strong' : Math.abs(fit.r) > 0.7 ? 'Strong' : Math.abs(fit.r) > 0.4 ? 'Moderate' : 'Weak'} />
			<Result label="Slope" value={fmtLoose(fit.slope, 6)} detail="y changes by this much per unit of x" />
			<Result label="Intercept" value={fmtLoose(fit.intercept, 6)} detail="Predicted y when x = 0" />
			<Result label="Standard error" value={fmtLoose(fit.se, 6)} detail="Typical distance from the line" />
		</div>

		{#if geometry}
			<section class="card">
				<h2>Scatter and fitted line</h2>
				<svg viewBox="0 0 {W} {H}" class="plot" role="img" aria-label="Scatter plot with the fitted regression line">
					<line x1={PAD} y1={H - PAD} x2={W - 12} y2={H - PAD} stroke="var(--border-strong)" />
					<line x1={PAD} y1="12" x2={PAD} y2={H - PAD} stroke="var(--border-strong)" />
					<line
						x1={geometry.px(geometry.x0)}
						y1={geometry.py(fit.predict(geometry.x0))}
						x2={geometry.px(geometry.x1)}
						y2={geometry.py(fit.predict(geometry.x1))}
						stroke="var(--accent)"
						stroke-width="2.5"
					/>
					{#each points as p, i (i)}
						<line
							x1={geometry.px(p.x)}
							y1={geometry.py(p.y)}
							x2={geometry.px(p.x)}
							y2={geometry.py(fit.predict(p.x))}
							stroke="var(--text-faint)"
							stroke-width="1"
							stroke-dasharray="2 2"
						/>
						<circle cx={geometry.px(p.x)} cy={geometry.py(p.y)} r="4.5" fill="var(--text)" />
					{/each}
					<text x={PAD} y={H - 14} font-size="11" fill="var(--text-faint)">{fmtLoose(geometry.x0, 3)}</text>
					<text x={W - 12} y={H - 14} text-anchor="end" font-size="11" fill="var(--text-faint)">{fmtLoose(geometry.x1, 3)}</text>
					<text x={PAD - 6} y={H - PAD} text-anchor="end" font-size="11" fill="var(--text-faint)">{fmtLoose(geometry.y0, 3)}</text>
					<text x={PAD - 6} y="18" text-anchor="end" font-size="11" fill="var(--text-faint)">{fmtLoose(geometry.y1, 3)}</text>
				</svg>
				<p class="small muted">Dotted lines are the residuals — the vertical gaps the fit minimises.</p>
			</section>
		{/if}

		<section class="card stack">
			<h2>Predict</h2>
			<div class="field-row">
				<Field label="x" for="lr-predict"><input id="lr-predict" type="number" step="any" bind:value={predictX} /></Field>
				<Result label="Predicted y" value={fmtLoose(fit.predict(predictX), 6)} />
				<Result
					label="Extrapolating?"
					value={predictX < Math.min(...points.map((p) => p.x)) || predictX > Math.max(...points.map((p) => p.x)) ? 'Yes — outside your data' : 'No'}
					tone={predictX < Math.min(...points.map((p) => p.x)) || predictX > Math.max(...points.map((p) => p.x)) ? 'warning' : 'neutral'}
				/>
			</div>
		</section>

		{#if residualSummary}
			<section class="card">
				<h2>Residuals</h2>
				<div class="results-grid">
					<Result label="Mean residual" value={fmtLoose(residualSummary.mean, 8)} detail="Always ~0 for a least-squares fit" />
					<Result label="Largest positive" value={fmtLoose(residualSummary.max, 5)} />
					<Result label="Largest negative" value={fmtLoose(residualSummary.min, 5)} />
					<Result label="Residual spread (sd)" value={fmtLoose(residualSummary.sd, 5)} />
				</div>
			</section>
		{/if}
	{/if}

	{#snippet explainer()}
		<p>
			Least-squares regression finds the single straight line that minimises the sum of squared
			vertical distances between the line and your points. Squaring is what makes the answer unique
			and computable in closed form — and also what makes the fit sensitive to outliers.
		</p>
		<code class="formula">slope     b = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²
intercept a = ȳ − b·x̄
R²          = r², the fraction of variance in y explained by x</code>
		<h3>Reading R²</h3>
		<p>
			R² runs from 0 to 1. It is the proportion of the variation in y that the line accounts for.
			0.9 is a tight fit; 0.3 means the line captures a real but minor part of what is going on. A
			high R² does <em>not</em> mean the model is right — only that a line describes this data well.
		</p>
		<h3>Correlation is not causation, and the line is not the truth</h3>
		<p>
			A strong fit tells you two variables move together. It cannot tell you which causes which, or
			whether something else causes both. Anscombe's quartet — four datasets with identical slope,
			intercept and R² but wildly different shapes — is the standard reminder to look at the scatter
			plot before believing the numbers.
		</p>
		<h3>Extrapolation</h3>
		<p>
			Predicting inside your observed range is interpolation and is usually reasonable. Predicting
			outside it assumes the relationship keeps holding, which nothing in your data supports. The
			tool flags when you cross that line.
		</p>
	{/snippet}
</ToolShell>

<style>
	.plot {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		margin: 0.75rem 0 0.5rem;
	}
	textarea {
		min-height: 170px;
	}
</style>
