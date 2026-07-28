<script lang="ts">
	import { CUP_ML, INGREDIENTS, INGREDIENT_GROUPS } from '$lib/data/ingredients';
	import { fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	let filter = $state('');

	const shown = $derived(
		filter.trim()
			? INGREDIENTS.filter((i) => i.name.toLowerCase().includes(filter.trim().toLowerCase()))
			: INGREDIENTS
	);

	const grouped = $derived(
		INGREDIENT_GROUPS.map((group) => ({ group, items: shown.filter((i) => i.group === group) })).filter(
			(entry) => entry.items.length
		)
	);

	const VOLUME = [
		{ measure: '1 teaspoon', ml: 4.93, tbsp: '⅓ tbsp', cups: '1/48 cup' },
		{ measure: '1 tablespoon', ml: 14.79, tbsp: '1 tbsp', cups: '1/16 cup' },
		{ measure: '1 fluid ounce', ml: 29.57, tbsp: '2 tbsp', cups: '⅛ cup' },
		{ measure: '¼ cup', ml: 59.15, tbsp: '4 tbsp', cups: '¼ cup' },
		{ measure: '⅓ cup', ml: 78.86, tbsp: '5⅓ tbsp', cups: '⅓ cup' },
		{ measure: '½ cup', ml: 118.29, tbsp: '8 tbsp', cups: '½ cup' },
		{ measure: '¾ cup', ml: 177.44, tbsp: '12 tbsp', cups: '¾ cup' },
		{ measure: '1 cup', ml: 236.59, tbsp: '16 tbsp', cups: '1 cup' },
		{ measure: '1 pint', ml: 473.18, tbsp: '32 tbsp', cups: '2 cups' },
		{ measure: '1 quart', ml: 946.35, tbsp: '64 tbsp', cups: '4 cups' },
		{ measure: '1 gallon', ml: 3785.41, tbsp: '256 tbsp', cups: '16 cups' }
	];

	const OVEN = [
		{ f: 250, c: 120, gas: '½' },
		{ f: 275, c: 140, gas: '1' },
		{ f: 300, c: 150, gas: '2' },
		{ f: 325, c: 160, gas: '3' },
		{ f: 350, c: 180, gas: '4' },
		{ f: 375, c: 190, gas: '5' },
		{ f: 400, c: 200, gas: '6' },
		{ f: 425, c: 220, gas: '7' },
		{ f: 450, c: 230, gas: '8' },
		{ f: 475, c: 245, gas: '9' }
	];

	const CUPS = [
		{ region: 'United States (customary)', ml: 236.59 },
		{ region: 'United States (legal / nutrition labels)', ml: 240 },
		{ region: 'Metric — Australia, NZ, Canada', ml: 250 },
		{ region: 'Imperial — older UK recipes', ml: 284.13 },
		{ region: 'Japan (gō-based cup)', ml: 200 }
	];

	const TEMPERATURES = [
		{ food: 'Poultry, all cuts', f: 165, c: 74 },
		{ food: 'Ground meats', f: 160, c: 71 },
		{ food: 'Beef, pork, lamb — steaks, chops, roasts', f: 145, c: 63, note: 'Plus a 3-minute rest' },
		{ food: 'Fish and shellfish', f: 145, c: 63 },
		{ food: 'Leftovers and casseroles', f: 165, c: 74 },
		{ food: 'Egg dishes', f: 160, c: 71 }
	];
</script>

<ToolShell {tool}>
	<div class="card no-print">
		<div class="row">
			<label class="visually-hidden" for="cc-filter">Filter ingredients</label>
			<input id="cc-filter" type="search" bind:value={filter} placeholder="Filter ingredients…" autocomplete="off" />
			<button type="button" class="btn" onclick={() => window.print()}><Icon name="print" size={16} /> Print</button>
		</div>
	</div>

	<section class="card">
		<h2>Volume equivalents</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Measure</th><th class="num">Millilitres</th><th class="num">Tablespoons</th><th class="num">Cups</th></tr></thead>
				<tbody>
					{#each VOLUME as row (row.measure)}
						<tr><td>{row.measure}</td><td class="num">{row.ml}</td><td class="num">{row.tbsp}</td><td class="num">{row.cups}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="small muted">US customary measures. 3 teaspoons = 1 tablespoon; 16 tablespoons = 1 cup.</p>
	</section>

	<section class="card">
		<h2>Cups by ingredient</h2>
		<p class="small muted">
			The table that matters most. Grams per US cup ({fmtLoose(CUP_ML, 1)} mL), so a cup of flour and
			a cup of sugar are correctly different.
		</p>
		{#each grouped as { group, items } (group)}
			<h3>{group}</h3>
			<div class="scroll-x">
				<table class="data">
					<thead>
						<tr><th>Ingredient</th><th class="num">1 cup</th><th class="num">½ cup</th><th class="num">⅓ cup</th><th class="num">¼ cup</th><th class="num">1 tbsp</th></tr>
					</thead>
					<tbody>
						{#each items as item (item.id)}
							<tr>
								<td>{item.name}</td>
								<td class="num">{item.gramsPerCup} g</td>
								<td class="num">{Math.round(item.gramsPerCup / 2)} g</td>
								<td class="num">{Math.round(item.gramsPerCup / 3)} g</td>
								<td class="num">{Math.round(item.gramsPerCup / 4)} g</td>
								<td class="num">{fmtLoose(item.gramsPerCup / 16, 1)} g</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/each}
	</section>

	<section class="card">
		<h2>Oven temperatures</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th class="num">Fahrenheit</th><th class="num">Celsius</th><th class="num">Fan / convection</th><th class="num">Gas mark</th></tr></thead>
				<tbody>
					{#each OVEN as row (row.f)}
						<tr>
							<td class="num">{row.f} °F</td>
							<td class="num">{row.c} °C</td>
							<td class="num">{row.c - 20} °C</td>
							<td class="num">{row.gas}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="card">
		<h2>“One cup” around the world</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Where</th><th class="num">Millilitres</th><th class="num">Difference from a US cup</th></tr></thead>
				<tbody>
					{#each CUPS as row (row.region)}
						<tr>
							<td>{row.region}</td>
							<td class="num">{row.ml} mL</td>
							<td class="num">{row.ml === 236.59 ? '—' : `${row.ml > 236.59 ? '+' : ''}${fmtLoose(((row.ml / 236.59) - 1) * 100, 1)}%`}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="small muted">
			A recipe that says “1 cup” without specifying can be off by 20%. When it matters, weigh.
		</p>
	</section>

	<section class="card">
		<h2>Safe internal temperatures</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Food</th><th class="num">°F</th><th class="num">°C</th><th>Note</th></tr></thead>
				<tbody>
					{#each TEMPERATURES as row (row.food)}
						<tr>
							<td>{row.food}</td>
							<td class="num">{row.f}</td>
							<td class="num">{row.c}</td>
							<td class="muted small">{row.note ?? ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="small muted">
			USDA minimums, measured with a thermometer in the thickest part, away from bone.
		</p>
	</section>

	{#snippet explainer()}
		<p>
			Kept on one page so it can be printed and stuck inside a cupboard door. Everything here is
			static — no calculation, no interaction needed.
		</p>
		<h3>Weigh, do not scoop</h3>
		<p>
			The single biggest source of inconsistency in home baking is measuring flour by volume. The same
			cup can hold 120 g or 145 g depending on whether you spooned it in or scooped it from the bag —
			a 20% swing that ruins a cake. Every gram figure in the table above assumes the spoon-and-level
			method.
		</p>
		<h3>The teaspoon–tablespoon–cup ladder</h3>
		<p>
			3 teaspoons make a tablespoon, 16 tablespoons make a cup. Those two facts cover most kitchen
			arithmetic. Australian tablespoons are the exception: they hold 20 mL — four teaspoons, not
			three — so an Australian recipe's tablespoon is a third larger than an American one.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Ingredient weights follow King Arthur Baking's published ingredient weight chart and USDA
			FoodData Central. Internal temperatures are <strong>USDA Food Safety and Inspection Service</strong>
			minimums. Volume equivalents are exact by definition of the US customary units.
		</p>
	{/snippet}
</ToolShell>

<style>
	h2 {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}
	h3 {
		font-size: 0.92rem;
		margin: 1.1rem 0 0.4rem;
		color: var(--text-muted);
	}
	.row input {
		flex: 1;
		min-width: 200px;
	}
</style>
