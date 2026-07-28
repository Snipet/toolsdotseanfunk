<script lang="ts">
	import { CUP_ML, INGREDIENTS, INGREDIENT_BY_ID, INGREDIENT_GROUPS } from '$lib/data/ingredients';
	import { formatFraction, fmtLoose, parseLooseNumber } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	// Volume measures expressed in US cups, so one density figure covers all.
	const MEASURES = [
		{ id: 'cup', name: 'cup', cups: 1 },
		{ id: 'tbsp', name: 'tablespoon', cups: 1 / 16 },
		{ id: 'tsp', name: 'teaspoon', cups: 1 / 48 },
		{ id: 'ml', name: 'millilitre', cups: 1 / CUP_ML },
		{ id: 'floz', name: 'fluid ounce (US)', cups: 1 / 8 },
		{ id: 'metric-cup', name: 'metric cup (250 mL)', cups: 250 / CUP_ML },
		{ id: 'uk-cup', name: 'imperial cup (284 mL)', cups: 284.130625 / CUP_ML }
	];

	const s = urlState({ amount: '1', measure: 'cup', ingredient: 'flour-ap', reverse: false });

	const ingredient = $derived(INGREDIENT_BY_ID.get(s.ingredient) ?? INGREDIENTS[0]);
	const measure = $derived(MEASURES.find((m) => m.id === s.measure) ?? MEASURES[0]);
	const amount = $derived(parseLooseNumber(s.amount));
	const valid = $derived(Number.isFinite(amount));

	// Forward: volume → weight. Reverse: weight (grams) → volume.
	const grams = $derived(valid ? (s.reverse ? amount : amount * measure.cups * ingredient.gramsPerCup) : NaN);
	const inMeasure = $derived(valid ? grams / (ingredient.gramsPerCup * measure.cups) : NaN);

	const ounces = $derived(grams / 28.349523125);

	const grouped = $derived(
		INGREDIENT_GROUPS.map((group) => ({
			group,
			items: INGREDIENTS.filter((i) => i.group === group)
		}))
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="mode no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={!s.reverse} onclick={() => (s.reverse = false)}>
				Volume → weight
			</button>
			<button type="button" class="btn btn-sm" class:btn-primary={s.reverse} onclick={() => (s.reverse = true)}>
				Weight → volume
			</button>
		</div>

		<div class="inputs">
			<Field label="Amount" for="ic-amount" hint={s.reverse ? 'In grams' : 'Fractions like 1 1/2 work'}>
				<input id="ic-amount" type="text" inputmode="decimal" bind:value={s.amount} autocomplete="off" />
			</Field>

			{#if !s.reverse}
				<Field label="Measure" for="ic-measure">
					<select id="ic-measure" bind:value={s.measure}>
						{#each MEASURES as m (m.id)}
							<option value={m.id}>{m.name}</option>
						{/each}
					</select>
				</Field>
			{:else}
				<Field label="Convert to" for="ic-measure">
					<select id="ic-measure" bind:value={s.measure}>
						{#each MEASURES as m (m.id)}
							<option value={m.id}>{m.name}s</option>
						{/each}
					</select>
				</Field>
			{/if}

			<Field label="Ingredient" for="ic-ingredient">
				<select id="ic-ingredient" bind:value={s.ingredient}>
					{#each grouped as { group, items } (group)}
						<optgroup label={group}>
							{#each items as item (item.id)}
								<option value={item.id}>{item.name}</option>
							{/each}
						</optgroup>
					{/each}
				</select>
			</Field>
		</div>

		{#if s.reverse}
			<Result
				label="Volume"
				primary
				value={valid ? `${formatFraction(inMeasure, 8)} ${measure.name}${Math.abs(inMeasure) === 1 ? '' : 's'}` : '—'}
				detail={valid ? `Exactly ${fmtLoose(inMeasure, 3)} ${measure.name}s · ${ingredient.name} at ${ingredient.gramsPerCup} g per cup` : undefined}
			/>
		{:else}
			<Result
				label="Weight"
				primary
				value={valid ? `${fmtLoose(grams, 1)} g` : '—'}
				detail={valid ? `${fmtLoose(ounces, 2)} oz · ${ingredient.name} at ${ingredient.gramsPerCup} g per cup` : undefined}
			/>
		{/if}

		{#if ingredient.note}
			<Note><strong>{ingredient.name}:</strong> {ingredient.note}</Note>
		{/if}
	</div>

	<section class="card">
		<h2>One cup of each, in grams</h2>
		<div class="scroll-x">
			<table class="data">
				<thead>
					<tr><th>Ingredient</th><th class="num">1 cup</th><th class="num">1 tbsp</th><th class="num">100 g is</th></tr>
				</thead>
				<tbody>
					{#each INGREDIENTS as item (item.id)}
						<tr class:active={item.id === s.ingredient}>
							<td>
								<button type="button" class="pick" onclick={() => (s.ingredient = item.id)}>{item.name}</button>
							</td>
							<td class="num">{item.gramsPerCup} g</td>
							<td class="num">{fmtLoose(item.gramsPerCup / 16, 1)} g</td>
							<td class="num">{formatFraction(100 / item.gramsPerCup, 8)} cup</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			A cup measures <em>volume</em>; a gram measures <em>mass</em>. Converting between them needs to
			know what is in the cup. A cup of all-purpose flour is about 120 g; a cup of granulated sugar
			is 200 g; a cup of honey is 340 g. Any tool that offers a single “cups to grams” number without
			asking what you are measuring is guessing.
		</p>
		<code class="formula">grams = cups × density (g per cup)</code>
		<h3>Why flour is the worst offender</h3>
		<p>
			Flour compacts. Spooned gently into the cup and levelled off, it weighs about 120 g. Scooped
			straight from the bag, the same cup can hold 145 g — a 20% difference, which is the gap between
			a tender cake and a tough one. This is the single strongest argument for baking by weight.
		</p>
		<h3>Which cup?</h3>
		<p>
			A US cup is 236.6 mL, an imperial cup is 284.1 mL, and a metric cup — Australian and most
			modern recipe books — is exactly 250 mL. All three are offered above; the densities are per US
			cup, and the other measures are scaled from it.
		</p>
		<h3>Salt is not salt</h3>
		<p>
			Diamond Crystal kosher salt is roughly half as dense as table salt, and Morton kosher salt sits
			between them. A recipe calling for a tablespoon of one and made with another can be
			meaningfully saltier. When a recipe specifies a brand of salt, it is not being fussy.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Baking densities follow King Arthur Baking's published ingredient weight chart; whole foods
			follow USDA FoodData Central. Values are rounded to the nearest gram, and real-world variation
			of ±5% is normal.
		</p>
	{/snippet}
</ToolShell>

<style>
	.mode {
		display: flex;
		gap: 0.4rem;
	}
	.inputs {
		display: grid;
		grid-template-columns: minmax(90px, 0.6fr) 1fr 1.4fr;
		gap: 0.75rem;
	}
	@media (max-width: 680px) {
		.inputs {
			grid-template-columns: 1fr;
		}
	}
	tr.active {
		background: var(--accent-soft);
	}
	.pick {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: inherit;
		cursor: pointer;
		text-align: left;
	}
	.pick:hover {
		color: var(--accent);
		text-decoration: underline;
	}
</style>
