<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ weight: 100, reps: 5, unit: 'kg' });

	const FORMULAS = [
		{ name: 'Epley', fn: (w: number, r: number) => w * (1 + r / 30) },
		{ name: 'Brzycki', fn: (w: number, r: number) => (r < 37 ? w * (36 / (37 - r)) : NaN) },
		{ name: 'Lombardi', fn: (w: number, r: number) => w * Math.pow(r, 0.1) },
		{ name: 'O’Conner', fn: (w: number, r: number) => w * (1 + 0.025 * r) },
		{ name: 'Wathan', fn: (w: number, r: number) => (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r)) }
	];

	const estimates = $derived(FORMULAS.map((f) => ({ name: f.name, value: f.fn(s.weight, s.reps) })));
	const valid = $derived(s.weight > 0 && s.reps >= 1 && s.reps <= 20);
	const average = $derived(
		estimates.filter((e) => Number.isFinite(e.value)).reduce((a, e) => a + e.value, 0) /
			estimates.filter((e) => Number.isFinite(e.value)).length
	);

	// Percentage-of-max training table, with the reps typically achievable.
	const TRAINING = [
		{ percent: 100, reps: 1 },
		{ percent: 95, reps: 2 },
		{ percent: 90, reps: 4 },
		{ percent: 85, reps: 6 },
		{ percent: 80, reps: 8 },
		{ percent: 75, reps: 10 },
		{ percent: 70, reps: 12 },
		{ percent: 65, reps: 15 },
		{ percent: 60, reps: 20 }
	];

	/** Round to the nearest loadable increment: 2.5 kg or 5 lb. */
	const step = $derived(s.unit === 'kg' ? 2.5 : 5);
	const roundToPlate = (v: number) => Math.round(v / step) * step;
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Weight lifted" for="rm-weight"><input id="rm-weight" type="number" min="1" step="2.5" bind:value={s.weight} /></Field>
			<Field label="Reps completed" for="rm-reps" hint="Accuracy falls off above about 10" error={s.reps > 20 ? 'Too many reps for a useful estimate' : undefined}>
				<input id="rm-reps" type="number" min="1" max="20" bind:value={s.reps} />
			</Field>
			<Field label="Unit" for="rm-unit">
				<select id="rm-unit" bind:value={s.unit}><option value="kg">kg</option><option value="lb">lb</option></select>
			</Field>
		</div>

		<Result
			label="Estimated one-rep max"
			primary
			value={valid ? `${fmtLoose(average, 1)} ${s.unit}` : '—'}
			detail={valid ? `Average of five formulas · round to ${roundToPlate(average)} ${s.unit} on the bar` : undefined}
		/>

		<div class="results-grid">
			{#each estimates as estimate (estimate.name)}
				<Result label={estimate.name} value={Number.isFinite(estimate.value) ? `${fmtLoose(estimate.value, 1)} ${s.unit}` : '—'} />
			{/each}
		</div>

		{#if s.reps > 10}
			<Note tone="warning">
				Above about ten reps the estimate degrades quickly — endurance starts to matter more than
				strength, and the formulas diverge. A set of 3–6 gives a much more reliable number.
			</Note>
		{/if}
	</div>

	<section class="card">
		<h2>Training percentages</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th class="num">% of 1RM</th><th class="num">Weight</th><th class="num">Rounded</th><th class="num">Typical reps</th></tr></thead>
				<tbody>
					{#each TRAINING as row (row.percent)}
						<tr>
							<td class="num">{row.percent}%</td>
							<td class="num">{fmtLoose((average * row.percent) / 100, 1)} {s.unit}</td>
							<td class="num">{roundToPlate((average * row.percent) / 100)} {s.unit}</td>
							<td class="num">{row.reps}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			A one-rep max is the heaviest weight you can lift once with good form. Testing it directly is
			taxing and carries risk, so it is usually estimated from a submaximal set instead.
		</p>
		<code class="formula">Epley:   1RM = w × (1 + reps/30)
Brzycki: 1RM = w × 36 / (37 − reps)</code>
		<h3>Why five formulas?</h3>
		<p>
			They were each fitted to different populations and lifts, and they disagree — particularly
			above six reps. Brzycki tends to read low at high reps, Epley high. Showing the spread is more
			honest than picking one and presenting it as fact; the average is a reasonable working number.
		</p>
		<h3>It varies by lift and by person</h3>
		<p>
			Deadlifts and squats generally produce more reps at a given percentage than bench press,
			because larger muscle groups fatigue differently. Training history matters too — a lifter who
			trains heavy singles will out-perform their estimated max, and one who trains high reps will
			fall short of it.
		</p>
		<h3>Use it as a planning tool</h3>
		<p>
			Percentage-based programmes need a number to work from, and this is a good enough one.
			Re-estimate every few weeks rather than treating a single figure as fixed. If a prescribed
			weight feels wrong on the day, trust the day.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Epley B, <em>Boyd Epley Workout</em>, 1985. Brzycki M, “Strength testing: predicting a one-rep
			max from reps to fatigue”, JOPERD, 1993. Also Lombardi, O'Conner and Wathan as commonly cited
			in strength-training literature.
		</p>
	{/snippet}
</ToolShell>
