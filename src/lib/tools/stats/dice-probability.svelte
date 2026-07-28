<script lang="ts">
	import { diceSumDistribution } from '$lib/math/stats';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ count: 2, sides: 6, target: 7, comparison: 'exactly' });

	const distribution = $derived(diceSumDistribution(Math.min(s.count, 12), Math.min(s.sides, 100)));
	const total = $derived(Math.pow(Math.min(s.sides, 100), Math.min(s.count, 12)));

	const rows = $derived(
		[...distribution.entries()].sort((a, b) => a[0] - b[0]).map(([sum, ways]) => ({
			sum,
			ways,
			probability: ways / total
		}))
	);

	const maxWays = $derived(Math.max(...rows.map((r) => r.ways), 1));

	const probability = $derived.by(() => {
		const matching = rows.filter((r) => {
			switch (s.comparison) {
				case 'exactly': return r.sum === s.target;
				case 'atLeast': return r.sum >= s.target;
				case 'atMost': return r.sum <= s.target;
				default: return r.sum !== s.target;
			}
		});
		return matching.reduce((acc, r) => acc + r.probability, 0);
	});

	const mean = $derived(s.count * ((s.sides + 1) / 2));
	const sd = $derived(Math.sqrt((s.count * (s.sides ** 2 - 1)) / 12));

	const comparisonLabel = $derived(
		{ exactly: 'exactly', atLeast: 'at least', atMost: 'at most', not: 'anything but' }[s.comparison] ??
			'exactly'
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Number of dice" for="dp-count" hint="Up to 12">
				<input id="dp-count" type="number" min="1" max="12" bind:value={s.count} />
			</Field>
			<Field label="Sides per die" for="dp-sides">
				<select id="dp-sides" bind:value={s.sides}>
					{#each [4, 6, 8, 10, 12, 20, 100] as sides (sides)}
						<option value={sides}>d{sides}</option>
					{/each}
				</select>
			</Field>
			<Field label="Result is" for="dp-cmp">
				<select id="dp-cmp" bind:value={s.comparison}>
					<option value="exactly">exactly</option>
					<option value="atLeast">at least</option>
					<option value="atMost">at most</option>
					<option value="not">anything but</option>
				</select>
			</Field>
			<Field label="Target sum" for="dp-target">
				<input id="dp-target" type="number" bind:value={s.target} />
			</Field>
		</div>

		<Result
			label="Rolling {s.count}d{s.sides} for {comparisonLabel} {s.target}"
			primary
			value={`${fmtLoose(probability * 100, 4)}%`}
			detail={probability > 0 ? `About 1 in ${fmtLoose(1 / probability, 2)} rolls` : 'Impossible with these dice'}
		/>

		<div class="results-grid">
			<Result label="Expected value" value={fmtLoose(mean, 3)} detail="n × (sides + 1) ÷ 2" />
			<Result label="Standard deviation" value={fmtLoose(sd, 3)} />
			<Result label="Possible outcomes" value={total.toLocaleString('en-US')} detail={`${s.sides}^${s.count}`} />
			<Result label="Range" value={`${s.count} to ${s.count * s.sides}`} />
		</div>
	</div>

	<section class="card">
		<h2>Full distribution</h2>
		<div class="chart">
			{#each rows as row (row.sum)}
				<div class="bar-row" class:target={s.comparison === 'exactly' && row.sum === s.target}>
					<span class="bar-label num">{row.sum}</span>
					<span class="bar-track">
						<span class="bar-fill" style="width: {(row.ways / maxWays) * 100}%"></span>
					</span>
					<span class="bar-value num">{fmtLoose(row.probability * 100, 2)}%</span>
					<span class="bar-ways num muted small">{row.ways.toLocaleString('en-US')} ways</span>
				</div>
			{/each}
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Dice probabilities are counted, not estimated. This tool builds the exact distribution by
			convolution — starting from a single die and folding in one more at a time — so every figure
			here is a precise fraction, not a simulation.
		</p>
		<h3>Why 7 is the most common roll on 2d6</h3>
		<p>
			There are 36 equally likely outcomes, and six of them total 7 (1+6, 2+5, 3+4, 4+3, 5+2, 6+1).
			Only one totals 2, and only one totals 12. The middle of the range simply has more ways to be
			reached, which is why craps is built around 7 and why the sum of many dice starts looking like
			a bell curve — the central limit theorem in its most tangible form.
		</p>
		<code class="formula">E[sum]   = n × (s + 1) / 2
Var[sum] = n × (s² − 1) / 12</code>
		<h3>Sums are not uniform, even though each die is</h3>
		<p>
			A single die is flat: every face equally likely. Add a second and the flatness disappears
			immediately. This catches people out in game design constantly — 3d6 for ability scores
			clusters hard around 10–11, while a d20 gives every result the same weight.
		</p>
		<h3>“At least” beats “exactly”</h3>
		<p>
			For most game questions the useful figure is a cumulative one — the chance of rolling
			<em>at least</em> a certain total, not exactly it. Switch the comparison above to see the tail
			probability directly.
		</p>
	{/snippet}
</ToolShell>

<style>
	.chart {
		display: flex;
		flex-direction: column;
		gap: 3px;
		margin-top: 0.75rem;
		max-height: 460px;
		overflow-y: auto;
	}
	.bar-row {
		display: grid;
		grid-template-columns: 44px 1fr 66px 90px;
		gap: 0.5rem;
		align-items: center;
		font-size: 0.85rem;
		padding: 1px 0;
	}
	.bar-row.target {
		background: var(--accent-soft);
		border-radius: 4px;
	}
	.bar-label {
		text-align: right;
		font-weight: 600;
	}
	.bar-track {
		height: 16px;
		background: var(--bg-sunken);
		border-radius: 3px;
		overflow: hidden;
	}
	.bar-fill {
		display: block;
		height: 100%;
		background: var(--accent);
		border-radius: 3px;
	}
	.bar-value {
		text-align: right;
	}
	@media (max-width: 620px) {
		.bar-row {
			grid-template-columns: 36px 1fr 58px;
		}
		.bar-ways {
			display: none;
		}
	}
</style>
