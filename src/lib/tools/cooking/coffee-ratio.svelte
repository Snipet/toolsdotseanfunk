<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const METHODS = [
		{ id: 'pourover', name: 'Pour-over (V60, Chemex)', ratio: 16, grind: 'Medium', time: '3:00–4:00', temp: '94–96 °C' },
		{ id: 'french', name: 'French press', ratio: 15, grind: 'Coarse', time: '4:00', temp: '93–96 °C' },
		{ id: 'aeropress', name: 'AeroPress', ratio: 14, grind: 'Medium-fine', time: '1:30–2:30', temp: '80–90 °C' },
		{ id: 'drip', name: 'Drip machine', ratio: 17, grind: 'Medium', time: '5:00', temp: '92–96 °C' },
		{ id: 'espresso', name: 'Espresso', ratio: 2, grind: 'Fine', time: '25–30 s', temp: '92–94 °C' },
		{ id: 'moka', name: 'Moka pot', ratio: 10, grind: 'Fine-medium', time: '4:00–5:00', temp: 'Below boiling' },
		{ id: 'coldbrew', name: 'Cold brew concentrate', ratio: 5, grind: 'Coarse', time: '12–18 h', temp: 'Room / fridge' },
		{ id: 'coldbrew-rtd', name: 'Cold brew, ready to drink', ratio: 15, grind: 'Coarse', time: '12–18 h', temp: 'Room / fridge' }
	];

	const s = urlState({ method: 'pourover', water: 350, solveFor: 'coffee', coffee: 22, strength: 0 });

	const method = $derived(METHODS.find((m) => m.id === s.method) ?? METHODS[0]);
	// The strength slider nudges the ratio: negative is stronger (less water).
	const ratio = $derived(Math.max(1, method.ratio + s.strength));

	const coffee = $derived(s.solveFor === 'coffee' ? s.water / ratio : s.coffee);
	const water = $derived(s.solveFor === 'coffee' ? s.water : s.coffee * ratio);

	/** Ground coffee retains roughly twice its weight in water. */
	const retained = $derived(coffee * 2);
	const yieldMl = $derived(Math.max(0, water - retained));

	const CUPS = [1, 2, 4, 8];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field label="Brew method" for="cr-method">
			<select id="cr-method" bind:value={s.method}>
				{#each METHODS as m (m.id)}
					<option value={m.id}>{m.name} — 1:{m.ratio}</option>
				{/each}
			</select>
		</Field>

		<div class="field-row">
			<Field label="Solve for" for="cr-solve">
				<select id="cr-solve" bind:value={s.solveFor}>
					<option value="coffee">I know the water, tell me the coffee</option>
					<option value="water">I know the coffee, tell me the water</option>
				</select>
			</Field>
			{#if s.solveFor === 'coffee'}
				<Field label="Water (g / mL)" for="cr-water">
					<input id="cr-water" type="number" min="1" step="10" bind:value={s.water} />
				</Field>
			{:else}
				<Field label="Coffee (g)" for="cr-coffee">
					<input id="cr-coffee" type="number" min="1" step="1" bind:value={s.coffee} />
				</Field>
			{/if}
			<Field label="Strength ({s.strength === 0 ? 'as specified' : s.strength < 0 ? 'stronger' : 'lighter'})" for="cr-strength">
				<input id="cr-strength" type="range" min="-4" max="4" step="1" bind:value={s.strength} />
			</Field>
		</div>

		<div class="results-grid">
			<Result label="Coffee" primary value={`${fmtLoose(coffee, 1)} g`} detail={`About ${fmtLoose(coffee / 5.3, 1)} level tbsp`} />
			<Result label="Water" primary value={`${fmtLoose(water, 0)} g`} detail={`${fmtLoose(water, 0)} mL — water weighs 1 g per mL`} />
			<Result label="Ratio" value={`1 : ${fmtLoose(ratio, 1)}`} />
			<Result label="In the cup" value={`≈ ${fmtLoose(yieldMl, 0)} mL`} detail="Grounds hold back about 2× their weight" />
		</div>
	</div>

	<section class="card">
		<h2>{method.name}</h2>
		<dl class="specs">
			<div><dt>Grind</dt><dd>{method.grind}</dd></div>
			<div><dt>Brew time</dt><dd>{method.time}</dd></div>
			<div><dt>Water temperature</dt><dd>{method.temp}</dd></div>
			<div><dt>Standard ratio</dt><dd>1:{method.ratio}</dd></div>
		</dl>
	</section>

	<section class="card">
		<h2>Common batch sizes</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Servings</th><th class="num">Water</th><th class="num">Coffee</th></tr></thead>
				<tbody>
					{#each CUPS as n (n)}
						{@const w = n * 240}
						<tr>
							<td>{n} × 240 mL cup{n === 1 ? '' : 's'}</td>
							<td class="num">{w} g</td>
							<td class="num">{fmtLoose(w / ratio, 1)} g</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			A brew ratio is coffee weight to water weight. 1:16 means 1 gram of coffee for every 16 grams
			of water — so 22 g of coffee to 350 g of water. Water is convenient here because 1 mL weighs
			1 g, so your scale and your measuring jug agree.
		</p>
		<code class="formula">coffee (g) = water (g) ÷ ratio</code>
		<h3>Why weigh instead of scoop</h3>
		<p>
			A “scoop” of coffee varies by 30% or more depending on roast level, grind size and how the
			beans settle — dark roasts are less dense than light ones, so the same scoop delivers less
			coffee. A £10 scale removes the single largest source of inconsistency in home brewing.
		</p>
		<h3>Espresso counts differently</h3>
		<p>
			Espresso ratios are expressed as dry coffee to <em>liquid out</em>, not water in. A “1:2” shot
			means 18 g in, 36 g of espresso in the cup. Ratios around 1:2 are the modern standard; 1:1.5
			gives a ristretto, 1:3 a lungo.
		</p>
		<h3>If it tastes wrong</h3>
		<dl>
			<dt>Sour, thin, sharp</dt>
			<dd>Under-extracted. Grind finer, brew longer, or use hotter water.</dd>
			<dt>Bitter, drying, hollow</dt>
			<dd>Over-extracted. Grind coarser, brew shorter, or cool the water slightly.</dd>
			<dt>Correct but too intense</dt>
			<dd>That is strength, not extraction — add water to the cup rather than changing the grind.</dd>
		</dl>
	{/snippet}
</ToolShell>

<style>
	.specs {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		margin-top: 0.75rem;
	}
	.specs dt {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		font-weight: 600;
	}
	.specs dd {
		margin: 0.15rem 0 0;
		font-weight: 550;
	}
</style>
