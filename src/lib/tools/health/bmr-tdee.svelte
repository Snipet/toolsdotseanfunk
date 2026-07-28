<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ metric: true, kg: 70, cm: 175, lb: 154, ft: 5, inch: 9, age: 30, sex: 'male', activity: 1.55, bodyFat: 0 });

	const weightKg = $derived(s.metric ? s.kg : s.lb * 0.45359237);
	const heightCm = $derived(s.metric ? s.cm : (s.ft * 12 + s.inch) * 2.54);

	// Mifflin-St Jeor: the formula with the best validation record for adults.
	const mifflin = $derived(
		10 * weightKg + 6.25 * heightCm - 5 * s.age + (s.sex === 'male' ? 5 : -161)
	);
	// Harris-Benedict (1984 revision), for comparison.
	const harris = $derived(
		s.sex === 'male'
			? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * s.age
			: 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * s.age
	);
	// Katch-McArdle uses lean mass, so it needs a body-fat estimate.
	const leanMass = $derived(weightKg * (1 - s.bodyFat / 100));
	const katch = $derived(s.bodyFat > 0 ? 370 + 21.6 * leanMass : NaN);

	const bmr = $derived(mifflin);
	const tdee = $derived(bmr * s.activity);
	const valid = $derived(Number.isFinite(bmr) && bmr > 0);

	const ACTIVITY = [
		{ value: 1.2, label: 'Sedentary — desk job, little exercise' },
		{ value: 1.375, label: 'Lightly active — 1–3 sessions a week' },
		{ value: 1.55, label: 'Moderately active — 3–5 sessions a week' },
		{ value: 1.725, label: 'Very active — 6–7 sessions a week' },
		{ value: 1.9, label: 'Extremely active — physical job or twice daily' }
	];

	const GOALS = [
		{ label: 'Lose 0.5 kg (1 lb) a week', delta: -500 },
		{ label: 'Lose 0.25 kg (0.5 lb) a week', delta: -250 },
		{ label: 'Maintain', delta: 0 },
		{ label: 'Gain 0.25 kg (0.5 lb) a week', delta: 250 },
		{ label: 'Gain 0.5 kg (1 lb) a week', delta: 500 }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={s.metric} onclick={() => (s.metric = true)}>Metric</button>
			<button type="button" class="btn btn-sm" class:btn-primary={!s.metric} onclick={() => (s.metric = false)}>Imperial</button>
		</div>

		{#if s.metric}
			<div class="field-row">
				<Field label="Weight (kg)" for="bt-kg"><input id="bt-kg" type="number" min="20" max="400" step="0.1" bind:value={s.kg} /></Field>
				<Field label="Height (cm)" for="bt-cm"><input id="bt-cm" type="number" min="100" max="260" bind:value={s.cm} /></Field>
				<Field label="Age" for="bt-age"><input id="bt-age" type="number" min="15" max="110" bind:value={s.age} /></Field>
				<Field label="Sex" for="bt-sex">
					<select id="bt-sex" bind:value={s.sex}><option value="male">Male</option><option value="female">Female</option></select>
				</Field>
			</div>
		{:else}
			<div class="field-row">
				<Field label="Weight (lb)" for="bt-lb"><input id="bt-lb" type="number" min="50" max="900" step="0.5" bind:value={s.lb} /></Field>
				<Field label="Feet" for="bt-ft"><input id="bt-ft" type="number" min="3" max="8" bind:value={s.ft} /></Field>
				<Field label="Inches" for="bt-in"><input id="bt-in" type="number" min="0" max="11.9" step="0.5" bind:value={s.inch} /></Field>
				<Field label="Age" for="bt-age2"><input id="bt-age2" type="number" min="15" max="110" bind:value={s.age} /></Field>
				<Field label="Sex" for="bt-sex2">
					<select id="bt-sex2" bind:value={s.sex}><option value="male">Male</option><option value="female">Female</option></select>
				</Field>
			</div>
		{/if}

		<Field label="Activity level" for="bt-activity">
			<select id="bt-activity" bind:value={s.activity}>
				{#each ACTIVITY as a (a.value)}<option value={a.value}>{a.label}</option>{/each}
			</select>
		</Field>

		<div class="results-grid">
			<Result label="BMR — at complete rest" primary value={valid ? `${fmtLoose(bmr, 0)} kcal/day` : '—'} detail="Mifflin–St Jeor" />
			<Result label="TDEE — with your activity" primary value={valid ? `${fmtLoose(tdee, 0)} kcal/day` : '—'} detail={`BMR × ${s.activity}`} />
			<Result label="Harris–Benedict BMR" value={valid ? `${fmtLoose(harris, 0)} kcal/day` : '—'} detail="The older formula, for comparison" />
			<Result label="Katch–McArdle BMR" value={Number.isFinite(katch) ? `${fmtLoose(katch, 0)} kcal/day` : 'Needs body fat %'} detail={s.bodyFat > 0 ? `Lean mass ${fmtLoose(leanMass, 1)} kg` : 'Most accurate if you know your body fat'} />
		</div>

		<Field label="Body fat % (optional, for Katch–McArdle)" for="bt-bf">
			<input id="bt-bf" type="number" min="0" max="70" step="0.5" bind:value={s.bodyFat} />
		</Field>
	</div>

	<section class="card">
		<h2>Calorie targets</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Goal</th><th class="num">Daily calories</th><th class="num">Change from TDEE</th></tr></thead>
				<tbody>
					{#each GOALS as goal (goal.label)}
						<tr class:active={goal.delta === 0}>
							<td>{goal.label}</td>
							<td class="num">{valid ? fmtLoose(Math.max(0, tdee + goal.delta), 0) : '—'}</td>
							<td class="num">{goal.delta > 0 ? '+' : ''}{goal.delta || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<Note tone="warning">
			Very low intakes are not simply “faster”. Most guidance places a floor around 1,500 kcal for
			men and 1,200 for women, below which meeting micronutrient needs becomes difficult. Anyone with
			a medical condition, or who is pregnant or breastfeeding, should work from clinical advice
			rather than a calculator.
		</Note>
	</section>

	{#snippet explainer()}
		<p>
			<strong>BMR</strong> is what your body burns doing nothing at all — keeping your heart beating,
			your brain running, your temperature stable. <strong>TDEE</strong> multiplies that by an
			activity factor to estimate everything you burn in a day.
		</p>
		<code class="formula">Mifflin–St Jeor
  men:   BMR = 10w + 6.25h − 5a + 5
  women: BMR = 10w + 6.25h − 5a − 161
  (w in kg, h in cm, a in years)

TDEE = BMR × activity factor</code>
		<h3>Which formula?</h3>
		<p>
			Mifflin–St Jeor (1990) validates better than the older Harris–Benedict for most adults, which is
			why it is the default here. Katch–McArdle uses lean body mass instead of total weight, so it is
			the most accurate of the three — but only if your body-fat estimate is any good.
		</p>
		<h3>The activity multiplier is the weak link</h3>
		<p>
			BMR formulas are accurate to roughly ±10% for most people. The activity factor is much cruder:
			the gap between “moderately active” and “very active” is 11%, and honest self-assessment is
			rare. Treat TDEE as a starting hypothesis, then adjust from what actually happens to your
			weight over two or three weeks.
		</p>
		<h3>The 3,500-calorie rule is an approximation</h3>
		<p>
			A pound of fat is often quoted as 3,500 kcal, giving the tidy “500/day = 1 lb/week”. Real
			bodies adapt — metabolic rate falls somewhat as weight drops, so the deficit that worked in
			month one produces less in month four. Expect the rate to slow and re-estimate periodically.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Mifflin MD, St Jeor ST, et al., “A new predictive equation for resting energy expenditure in
			healthy individuals”, <em>American Journal of Clinical Nutrition</em>, 1990. Harris–Benedict
			figures use the 1984 Roza–Shizgal revision. Katch–McArdle from <em>Exercise Physiology</em>.
		</p>
	{/snippet}
</ToolShell>

<style>
	tr.active {
		background: var(--accent-soft);
		font-weight: 600;
	}
</style>
