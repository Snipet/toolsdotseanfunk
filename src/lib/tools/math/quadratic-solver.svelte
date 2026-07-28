<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ a: 1, b: -3, c: 2 });

	const discriminant = $derived(s.b * s.b - 4 * s.a * s.c);
	const isQuadratic = $derived(s.a !== 0);

	const roots = $derived.by(() => {
		if (!isQuadratic) {
			// Degenerate: bx + c = 0.
			if (s.b === 0) return { kind: 'none' as const };
			return { kind: 'linear' as const, x: -s.c / s.b };
		}
		if (discriminant > 0) {
			const sq = Math.sqrt(discriminant);
			return { kind: 'two' as const, x1: (-s.b + sq) / (2 * s.a), x2: (-s.b - sq) / (2 * s.a) };
		}
		if (discriminant === 0) return { kind: 'one' as const, x: -s.b / (2 * s.a) };
		const sq = Math.sqrt(-discriminant);
		return { kind: 'complex' as const, re: -s.b / (2 * s.a), im: sq / (2 * s.a) };
	});

	const vertexX = $derived(-s.b / (2 * s.a));
	const vertexY = $derived(s.a * vertexX * vertexX + s.b * vertexX + s.c);

	const rootsText = $derived.by(() => {
		switch (roots.kind) {
			case 'two':
				return `x = ${fmtLoose(roots.x1, 6)}  or  x = ${fmtLoose(roots.x2, 6)}`;
			case 'one':
				return `x = ${fmtLoose(roots.x, 6)} (repeated)`;
			case 'complex':
				return `x = ${fmtLoose(roots.re, 6)} ± ${fmtLoose(Math.abs(roots.im), 6)}i`;
			case 'linear':
				return `x = ${fmtLoose(roots.x, 6)}`;
			default:
				return 'No solution';
		}
	});

	const factored = $derived.by(() => {
		if (roots.kind === 'two') return `${s.a === 1 ? '' : s.a}(x ${roots.x1 >= 0 ? '−' : '+'} ${fmtLoose(Math.abs(roots.x1), 4)})(x ${roots.x2 >= 0 ? '−' : '+'} ${fmtLoose(Math.abs(roots.x2), 4)})`;
		if (roots.kind === 'one') return `${s.a === 1 ? '' : s.a}(x ${roots.x >= 0 ? '−' : '+'} ${fmtLoose(Math.abs(roots.x), 4)})²`;
		return 'Not factorable over the real numbers';
	});

	// Plot bounds framed around the vertex and roots so the shape is always visible.
	const span = $derived(
		Math.max(4, roots.kind === 'two' ? Math.abs(roots.x1 - roots.x2) * 1.6 : 8)
	);
	const xMin = $derived(vertexX - span / 2);
	const xMax = $derived(vertexX + span / 2);
	const samples = $derived(
		Array.from({ length: 121 }, (_, i) => {
			const x = xMin + ((xMax - xMin) * i) / 120;
			return { x, y: s.a * x * x + s.b * x + s.c };
		})
	);
	const yValues = $derived(samples.map((p) => p.y));
	const yMin = $derived(Math.min(...yValues, 0));
	const yMax = $derived(Math.max(...yValues, 0));

	const W = 640;
	const H = 300;
	const px = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
	const py = (y: number) => H - ((y - yMin) / (yMax - yMin || 1)) * H;

	const path = $derived(samples.map((p, i) => `${i ? 'L' : 'M'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' '));
</script>

<ToolShell {tool}>
	<div class="card stack">
		<p class="equation mono">
			<input type="number" step="any" bind:value={s.a} aria-label="Coefficient a" />x² +
			<input type="number" step="any" bind:value={s.b} aria-label="Coefficient b" />x +
			<input type="number" step="any" bind:value={s.c} aria-label="Constant c" /> = 0
		</p>

		<Result label="Solutions" primary value={rootsText} copyable />

		<div class="results-grid">
			<Result
				label="Discriminant (b² − 4ac)"
				value={fmtLoose(discriminant, 6)}
				detail={discriminant > 0 ? 'Positive → two real roots' : discriminant === 0 ? 'Zero → one repeated root' : 'Negative → two complex roots'}
				tone={discriminant > 0 ? 'positive' : discriminant < 0 ? 'warning' : 'neutral'}
			/>
			<Result label="Vertex" value={isQuadratic ? `(${fmtLoose(vertexX, 4)}, ${fmtLoose(vertexY, 4)})` : '—'} detail={isQuadratic ? (s.a > 0 ? 'Minimum — parabola opens up' : 'Maximum — parabola opens down') : undefined} />
			<Result label="Axis of symmetry" value={isQuadratic ? `x = ${fmtLoose(vertexX, 4)}` : '—'} />
			<Result label="Y-intercept" value={`(0, ${fmtLoose(s.c, 4)})`} />
		</div>
	</div>

	{#if isQuadratic}
		<section class="card">
			<h2>The parabola</h2>
			<svg viewBox="0 0 {W} {H}" class="plot" role="img" aria-label="Graph of the quadratic, showing its roots and vertex">
				{#if yMin <= 0 && yMax >= 0}
					<line x1="0" y1={py(0)} x2={W} y2={py(0)} stroke="var(--border-strong)" stroke-width="1" />
				{/if}
				{#if xMin <= 0 && xMax >= 0}
					<line x1={px(0)} y1="0" x2={px(0)} y2={H} stroke="var(--border-strong)" stroke-width="1" />
				{/if}
				<path d={path} fill="none" stroke="var(--accent)" stroke-width="2.5" />
				{#if roots.kind === 'two'}
					<circle cx={px(roots.x1)} cy={py(0)} r="5" fill="var(--accent)" />
					<circle cx={px(roots.x2)} cy={py(0)} r="5" fill="var(--accent)" />
				{:else if roots.kind === 'one'}
					<circle cx={px(roots.x)} cy={py(0)} r="5" fill="var(--accent)" />
				{/if}
				<circle cx={px(vertexX)} cy={py(vertexY)} r="4" fill="none" stroke="var(--text)" stroke-width="2" />
			</svg>
			<p class="small muted">
				x from {fmtLoose(xMin, 2)} to {fmtLoose(xMax, 2)}. Filled dots are roots; the ring is the vertex.
			</p>
		</section>
	{/if}

	<section class="card">
		<h2>Working</h2>
		<ol class="steps">
			<li>
				<span class="step-label">Start from the quadratic formula</span>
				<code>x = (−b ± √(b² − 4ac)) / 2a</code>
			</li>
			<li>
				<span class="step-label">Substitute</span>
				<code>x = (−({s.b}) ± √(({s.b})² − 4·{s.a}·{s.c})) / (2·{s.a})</code>
			</li>
			<li>
				<span class="step-label">Evaluate the discriminant</span>
				<code>{s.b}² − 4({s.a})({s.c}) = {fmtLoose(discriminant, 6)}</code>
			</li>
			<li>
				<span class="step-label">Solve</span>
				<code>{rootsText}</code>
			</li>
			<li>
				<span class="step-label">Factored form</span>
				<code>{factored}</code>
			</li>
		</ol>
	</section>

	{#snippet explainer()}
		<p>
			A quadratic is any equation of the form ax² + bx + c = 0 with a ≠ 0. Its graph is a parabola,
			and its solutions are wherever that parabola crosses the x-axis.
		</p>
		<code class="formula">x = (−b ± √(b² − 4ac)) / 2a</code>
		<h3>The discriminant tells you the story before you solve</h3>
		<dl>
			<dt>b² − 4ac &gt; 0</dt>
			<dd>Two distinct real roots — the parabola crosses the axis twice.</dd>
			<dt>b² − 4ac = 0</dt>
			<dd>One repeated root — the parabola just touches the axis at its vertex.</dd>
			<dt>b² − 4ac &lt; 0</dt>
			<dd>No real roots — the parabola misses the axis entirely. The solutions are a complex conjugate pair.</dd>
		</dl>
		<h3>Where the formula comes from</h3>
		<p>
			Completing the square. Divide through by a, move the constant across, add (b/2a)² to both
			sides to make the left a perfect square, then take the square root. The ± appears because a
			positive number has two square roots — which is the whole reason a quadratic has two answers.
		</p>
		<h3>The vertex</h3>
		<p>
			The parabola is symmetric about x = −b/2a, so that is where the minimum (a &gt; 0) or maximum
			(a &lt; 0) sits. This is the form used in optimisation problems: maximum revenue, peak height of
			a thrown object, least material for a given volume.
		</p>
	{/snippet}
</ToolShell>

<style>
	.equation {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
		font-size: 1.15rem;
	}
	.equation input {
		width: 88px;
		text-align: center;
	}
	.plot {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		margin: 0.75rem 0 0.5rem;
	}
	.steps {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		margin: 0.75rem 0 0;
		padding-left: 1.2rem;
	}
	.step-label {
		display: block;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.steps code {
		display: inline-block;
		margin-top: 0.2rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 0.15rem 0.45rem;
	}
</style>
