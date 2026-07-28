<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ flour: 500, hydration: 70, salt: 2, starter: 20, starterHydration: 100, yeast: 0 });

	const water = $derived((s.flour * s.hydration) / 100);
	const salt = $derived((s.flour * s.salt) / 100);
	const starter = $derived((s.flour * s.starter) / 100);
	const yeast = $derived((s.flour * s.yeast) / 100);

	// A starter carries its own flour and water, so the dough water must be
	// reduced to keep total hydration at the target.
	const starterFlour = $derived(starter / (1 + s.starterHydration / 100));
	const starterWater = $derived(starter - starterFlour);

	const totalFlour = $derived(s.flour + starterFlour);
	const totalWater = $derived(water + starterWater);
	const doughWater = $derived(water - starterWater);
	const trueHydration = $derived(totalFlour > 0 ? (totalWater / totalFlour) * 100 : 0);
	const totalDough = $derived(s.flour + water + salt + starter + yeast);

	const STYLES = [
		{ name: 'Ciabatta / focaccia', hydration: 80 },
		{ name: 'Rustic sourdough', hydration: 75 },
		{ name: 'Country loaf', hydration: 70 },
		{ name: 'Sandwich loaf', hydration: 65 },
		{ name: 'Neapolitan pizza', hydration: 62 },
		{ name: 'Bagels / pretzels', hydration: 55 }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Note>
			In baker's percentages, <strong>flour is always 100%</strong> and everything else is expressed
			as a percentage of the flour weight. That is why the numbers add up to more than 100 — and why
			any recipe can be scaled to any batch size without rewriting it.
		</Note>

		<div class="field-row">
			<Field label="Flour (g)" for="bp-flour">
				<input id="bp-flour" type="number" min="1" step="10" bind:value={s.flour} />
			</Field>
			<Field label="Hydration ({s.hydration}%)" for="bp-hydration">
				<input id="bp-hydration" type="range" min="50" max="100" bind:value={s.hydration} />
			</Field>
			<Field label="Salt (%)" for="bp-salt" hint="1.8–2.2% is typical">
				<input id="bp-salt" type="number" min="0" max="5" step="0.1" bind:value={s.salt} />
			</Field>
		</div>

		<div class="field-row">
			<Field label="Starter / levain (%)" for="bp-starter" hint="0 for a yeasted dough">
				<input id="bp-starter" type="number" min="0" max="100" step="1" bind:value={s.starter} />
			</Field>
			<Field label="Starter hydration (%)" for="bp-sh" hint="100% = equal flour and water">
				<input id="bp-sh" type="number" min="50" max="200" step="5" bind:value={s.starterHydration} />
			</Field>
			<Field label="Instant yeast (%)" for="bp-yeast" hint="0.5–1% for a same-day loaf">
				<input id="bp-yeast" type="number" min="0" max="5" step="0.1" bind:value={s.yeast} />
			</Field>
		</div>
	</div>

	<div class="card">
		<h2>Your formula</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Ingredient</th><th class="num">Baker's %</th><th class="num">Weight</th></tr></thead>
				<tbody>
					<tr><td>Flour</td><td class="num">100%</td><td class="num">{fmtLoose(s.flour, 0)} g</td></tr>
					<tr>
						<td>Water <span class="muted small">(add to dough)</span></td>
						<td class="num">{fmtLoose(s.hydration, 1)}%</td>
						<td class="num">{fmtLoose(doughWater, 0)} g</td>
					</tr>
					<tr><td>Salt</td><td class="num">{fmtLoose(s.salt, 1)}%</td><td class="num">{fmtLoose(salt, 1)} g</td></tr>
					{#if s.starter > 0}
						<tr>
							<td>Starter <span class="muted small">({fmtLoose(starterFlour, 0)} g flour + {fmtLoose(starterWater, 0)} g water)</span></td>
							<td class="num">{fmtLoose(s.starter, 1)}%</td>
							<td class="num">{fmtLoose(starter, 0)} g</td>
						</tr>
					{/if}
					{#if s.yeast > 0}
						<tr><td>Instant yeast</td><td class="num">{fmtLoose(s.yeast, 2)}%</td><td class="num">{fmtLoose(yeast, 2)} g</td></tr>
					{/if}
					<tr class="total">
						<td><strong>Total dough</strong></td>
						<td class="num">—</td>
						<td class="num"><strong>{fmtLoose(totalDough, 0)} g</strong></td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<div class="results-grid">
		<Result label="True hydration" primary value={`${fmtLoose(trueHydration, 1)}%`} detail="Including the flour and water inside the starter" />
		<Result label="Total flour" value={`${fmtLoose(totalFlour, 0)} g`} />
		<Result label="Total water" value={`${fmtLoose(totalWater, 0)} g`} />
		<Result label="Two 900 g loaves need" value={`${fmtLoose((1800 / totalDough) * s.flour, 0)} g flour`} />
	</div>

	<div class="card">
		<h2>Hydration by style</h2>
		<div class="styles">
			{#each STYLES as style (style.name)}
				<button type="button" class="style" class:active={s.hydration === style.hydration} onclick={() => (s.hydration = style.hydration)}>
					<span>{style.name}</span>
					<strong>{style.hydration}%</strong>
				</button>
			{/each}
		</div>
	</div>

	{#snippet explainer()}
		<p>
			Baker's percentage is the reason a professional formula fits on one line and scales to any
			batch. Flour is defined as 100%, and every other ingredient is a percentage of that flour
			weight — so “70% hydration, 2% salt” describes the dough completely, whether you are making one
			loaf or two hundred.
		</p>
		<code class="formula">ingredient % = (ingredient weight ÷ flour weight) × 100</code>
		<h3>Hydration, and what it does</h3>
		<p>
			Hydration is the water percentage. Lower doughs (55–62%) are stiff, easy to shape and give a
			tight crumb — bagels, pretzels, Neapolitan pizza. Higher doughs (75–85%) are slack and sticky
			but produce the open, glossy crumb of ciabatta and rustic sourdough. Whole-grain flours absorb
			more, so the same percentage feels drier.
		</p>
		<h3>Why the starter changes the maths</h3>
		<p>
			A levain is itself flour and water. At 100% hydration, 100 g of starter is 50 g flour and 50 g
			water — both of which count toward the dough's totals. This calculator subtracts the starter's
			water from the water you add, so the <em>true</em> hydration lands on your target rather than
			drifting above it.
		</p>
		<h3>Salt</h3>
		<p>
			1.8–2.2% is the standard band. Below about 1.5% bread tastes flat; above 2.5% fermentation
			slows noticeably. Salt also tightens gluten, which is why some bakers add it after an initial
			autolyse rather than at the start.
		</p>
	{/snippet}
</ToolShell>

<style>
	tr.total td {
		border-top: 2px solid var(--border-strong);
	}
	.styles {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		margin-top: 0.75rem;
	}
	.style {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.88rem;
		text-align: left;
	}
	.style:hover {
		border-color: var(--accent-border);
	}
	.style.active {
		background: var(--accent-soft);
		border-color: var(--accent-border);
		color: var(--accent);
	}
</style>
