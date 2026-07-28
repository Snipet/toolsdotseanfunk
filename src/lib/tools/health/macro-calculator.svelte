<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const PRESETS = [
		{ id: 'balanced', label: 'Balanced (30/40/30)', p: 30, c: 40, f: 30 },
		{ id: 'highprotein', label: 'High protein (40/30/30)', p: 40, c: 30, f: 30 },
		{ id: 'lowcarb', label: 'Low carb (30/20/50)', p: 30, c: 20, f: 50 },
		{ id: 'keto', label: 'Ketogenic (25/5/70)', p: 25, c: 5, f: 70 },
		{ id: 'endurance', label: 'Endurance (20/55/25)', p: 20, c: 55, f: 25 },
		{ id: 'custom', label: 'Custom', p: 0, c: 0, f: 0 }
	];

	const s = urlState({ calories: 2200, preset: 'balanced', p: 30, c: 40, f: 30, weightKg: 70 });

	const preset = $derived(PRESETS.find((x) => x.id === s.preset) ?? PRESETS[0]);
	const split = $derived(s.preset === 'custom' ? { p: s.p, c: s.c, f: s.f } : { p: preset.p, c: preset.c, f: preset.f });
	const totalPercent = $derived(split.p + split.c + split.f);

	// 4 kcal per gram of protein and carbohydrate, 9 for fat (Atwater factors).
	const proteinG = $derived((s.calories * split.p) / 100 / 4);
	const carbsG = $derived((s.calories * split.c) / 100 / 4);
	const fatG = $derived((s.calories * split.f) / 100 / 9);

	const proteinPerKg = $derived(s.weightKg > 0 ? proteinG / s.weightKg : NaN);

	const rows = $derived([
		{ name: 'Protein', grams: proteinG, percent: split.p, kcal: (s.calories * split.p) / 100, color: 'var(--accent)' },
		{ name: 'Carbohydrate', grams: carbsG, percent: split.c, kcal: (s.calories * split.c) / 100, color: 'var(--positive)' },
		{ name: 'Fat', grams: fatG, percent: split.f, kcal: (s.calories * split.f) / 100, color: 'var(--warning)' }
	]);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Daily calorie target" for="mc-cal" hint="From the BMR & TDEE calculator">
				<input id="mc-cal" type="number" min="800" max="8000" step="50" bind:value={s.calories} />
			</Field>
			<Field label="Split" for="mc-preset">
				<select id="mc-preset" bind:value={s.preset}>
					{#each PRESETS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
				</select>
			</Field>
			<Field label="Body weight (kg)" for="mc-weight" hint="For the g/kg check">
				<input id="mc-weight" type="number" min="30" max="250" step="0.5" bind:value={s.weightKg} />
			</Field>
		</div>

		{#if s.preset === 'custom'}
			<div class="field-row">
				<Field label="Protein ({s.p}%)" for="mc-p"><input id="mc-p" type="range" min="0" max="70" bind:value={s.p} /></Field>
				<Field label="Carbs ({s.c}%)" for="mc-c"><input id="mc-c" type="range" min="0" max="80" bind:value={s.c} /></Field>
				<Field label="Fat ({s.f}%)" for="mc-f"><input id="mc-f" type="range" min="0" max="80" bind:value={s.f} /></Field>
			</div>
			{#if totalPercent !== 100}
				<p class="small warn">Your percentages add to {totalPercent}%, not 100%. Results are scaled as entered.</p>
			{/if}
		{/if}

		<div class="bar" role="img" aria-label="Macronutrient split">
			{#each rows as row (row.name)}
				{#if row.percent > 0}
					<span class="seg" style="width: {(row.percent / Math.max(1, totalPercent)) * 100}%; background: {row.color}">
						{row.percent >= 12 ? row.name : ''}
					</span>
				{/if}
			{/each}
		</div>

		<div class="results-grid">
			{#each rows as row (row.name)}
				<Result label={row.name} primary value={`${fmtLoose(row.grams, 0)} g`} detail={`${row.percent}% · ${fmtLoose(row.kcal, 0)} kcal`} />
			{/each}
			<Result
				label="Protein per kg body weight"
				value={Number.isFinite(proteinPerKg) ? `${fmtLoose(proteinPerKg, 2)} g/kg` : '—'}
				tone={proteinPerKg >= 1.2 && proteinPerKg <= 2.2 ? 'positive' : 'warning'}
				detail={proteinPerKg < 1.2 ? 'Below the usual 1.2–2.2 g/kg range for active people' : proteinPerKg > 2.2 ? 'Above what most evidence finds useful' : 'Within the commonly cited range'}
			/>
		</div>
	</div>

	<section class="card">
		<h2>Per meal</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Meals per day</th><th class="num">Protein</th><th class="num">Carbs</th><th class="num">Fat</th><th class="num">Calories</th></tr></thead>
				<tbody>
					{#each [3, 4, 5] as meals (meals)}
						<tr>
							<td>{meals}</td>
							<td class="num">{fmtLoose(proteinG / meals, 0)} g</td>
							<td class="num">{fmtLoose(carbsG / meals, 0)} g</td>
							<td class="num">{fmtLoose(fatG / meals, 0)} g</td>
							<td class="num">{fmtLoose(s.calories / meals, 0)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Macronutrients are the three things that carry calories. Converting a percentage split into
			grams needs the energy density of each.
		</p>
		<code class="formula">protein: 4 kcal per gram
carbs:   4 kcal per gram
fat:     9 kcal per gram
alcohol: 7 kcal per gram

grams = calories × percent ÷ 100 ÷ kcal-per-gram</code>
		<h3>Protein is usually the one worth setting first</h3>
		<p>
			Most evidence puts the useful range for active adults at 1.2–2.2 g per kg of body weight, with
			the upper end during a calorie deficit where protein helps preserve muscle. Setting protein by
			body weight and then splitting the remaining calories between carbs and fat is more robust than
			working from percentages alone — a 30% protein target means very different things at 1,500 and
			3,000 calories.
		</p>
		<h3>Fat has a floor</h3>
		<p>
			Fat is needed for hormone production and for absorbing vitamins A, D, E and K. Sustained
			intakes below about 20% of calories are worth avoiding without a specific reason.
		</p>
		<h3>Carbs are the flexible one</h3>
		<p>
			Carbohydrate is not essential in the strict biochemical sense, which is why ketogenic splits
			work for some people. But it is the preferred fuel for hard training, so endurance athletes
			generally do better at the high end and low-carb approaches suit lower-intensity activity.
		</p>
		<h3>Consistency beats optimisation</h3>
		<p>
			The differences between reasonable macro splits are small compared with the difference between
			hitting your calorie target and not. Pick a split you can actually eat.
		</p>
	{/snippet}
</ToolShell>

<style>
	.bar {
		display: flex;
		height: 34px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		border: 1px solid var(--border);
		font-size: 0.75rem;
		font-weight: 600;
		color: #fff;
	}
	.seg {
		display: grid;
		place-items: center;
		white-space: nowrap;
		overflow: hidden;
	}
	.warn {
		color: var(--warning);
	}
</style>
