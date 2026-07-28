<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ weightKg: 70, exerciseMin: 30, climate: 'temperate', metric: true });

	// 35 mL per kg is the common baseline guideline for healthy adults.
	const baseline = $derived(s.weightKg * 35);
	// Roughly 350–500 mL per 30 minutes of exercise.
	const exercise = $derived((s.exerciseMin / 30) * 400);
	const climateExtra = $derived(
		s.climate === 'hot' ? baseline * 0.2 : s.climate === 'cold-dry' ? baseline * 0.05 : 0
	);

	const totalMl = $derived(baseline + exercise + climateExtra);
	const fromFood = $derived(totalMl * 0.2); // food typically supplies ~20%
	const toDrink = $derived(totalMl - fromFood);

	const display = (ml: number) =>
		s.metric ? `${fmtLoose(ml / 1000, 2)} L` : `${fmtLoose(ml / 236.588, 1)} cups`;
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={s.metric} onclick={() => (s.metric = true)}>Litres</button>
			<button type="button" class="btn btn-sm" class:btn-primary={!s.metric} onclick={() => (s.metric = false)}>Cups</button>
		</div>

		<div class="field-row">
			<Field label="Body weight (kg)" for="wi-weight"><input id="wi-weight" type="number" min="20" max="250" step="0.5" bind:value={s.weightKg} /></Field>
			<Field label="Exercise today (minutes)" for="wi-ex"><input id="wi-ex" type="number" min="0" max="360" step="5" bind:value={s.exerciseMin} /></Field>
			<Field label="Climate" for="wi-climate">
				<select id="wi-climate" bind:value={s.climate}>
					<option value="temperate">Temperate</option>
					<option value="hot">Hot or humid</option>
					<option value="cold-dry">Cold and dry, or at altitude</option>
				</select>
			</Field>
		</div>

		<div class="results-grid">
			<Result label="Total fluid needed" primary value={display(totalMl)} detail="From all sources" />
			<Result label="To drink" primary value={display(toDrink)} detail="Food supplies roughly the other 20%" />
			<Result label="Baseline from body weight" value={display(baseline)} detail="About 35 mL per kg" />
			<Result label="Added for exercise" value={display(exercise)} detail="Roughly 400 mL per 30 minutes" />
			<Result label="Per waking hour" value={display(toDrink / 16)} detail="Spread across a 16-hour day" />
			<Result label="500 mL bottles" value={`${fmtLoose(toDrink / 500, 1)}`} />
		</div>

		<Note tone="warning">
			<strong>The 8×8 rule is folklore.</strong> “Eight 8-ounce glasses a day” has no identifiable
			evidence behind it. Real needs vary with body size, activity, climate, diet, medication and
			health conditions — and thirst is a reasonably good regulator for most healthy adults. Drinking
			far more than needed is not harmless: hyponatraemia from excessive water intake is rare but
			genuinely dangerous.
		</Note>
	</div>

	{#snippet explainer()}
		<p>
			Fluid balance is simple in principle: replace what you lose. Losses come from urine (the bulk
			of it), breathing, sweat and the digestive tract, and they scale with body size, activity and
			heat.
		</p>
		<code class="formula">baseline ≈ 35 mL per kg of body weight
plus ~400 mL per 30 minutes of exercise
plus ~20% in hot or humid conditions</code>
		<h3>Food counts</h3>
		<p>
			The EFSA and US Institute of Medicine both express recommendations as <em>total</em> water,
			including food. Fruit and vegetables are largely water; soup, milk and yoghurt more so. Roughly
			20% of intake typically comes from food, which is why “drink 3 litres” overshoots the actual
			drinking requirement.
		</p>
		<h3>Coffee and tea are not diuretics in practice</h3>
		<p>
			Caffeine has a mild diuretic effect, but the fluid in the drink more than compensates.
			Controlled studies find no meaningful difference in hydration between water and moderate coffee
			consumption. Alcohol is genuinely dehydrating.
		</p>
		<h3>A better indicator than any calculation</h3>
		<p>
			Urine colour. Pale straw suggests you are well hydrated; dark amber suggests you are not.
			Combined with thirst, it beats any weight-based formula for day-to-day purposes.
		</p>
		<h3>When formulas are not enough</h3>
		<p>
			Kidney disease, heart failure, pregnancy, breastfeeding, and several medications all change
			fluid requirements substantially — sometimes in the direction of <em>restricting</em> intake.
			Those are conversations for a clinician, not a calculator.
		</p>
	{/snippet}
</ToolShell>
