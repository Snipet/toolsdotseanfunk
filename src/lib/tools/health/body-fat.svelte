<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ sex: 'male', heightCm: 178, neckCm: 38, waistCm: 85, hipCm: 95, weightKg: 78 });

	/**
	 * US Navy circumference method (Hodgdon & Beckett, 1984).
	 * Metric form; the log is base 10.
	 */
	const bodyFat = $derived.by(() => {
		const { sex, heightCm, neckCm, waistCm, hipCm } = s;
		if (heightCm <= 0 || neckCm <= 0 || waistCm <= 0) return NaN;
		if (sex === 'male') {
			if (waistCm <= neckCm) return NaN;
			return (
				495 /
					(1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) -
				450
			);
		}
		if (waistCm + hipCm <= neckCm) return NaN;
		return (
			495 /
				(1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) -
			450
		);
	});

	const valid = $derived(Number.isFinite(bodyFat) && bodyFat > 0 && bodyFat < 70);
	const fatMass = $derived((s.weightKg * bodyFat) / 100);
	const leanMass = $derived(s.weightKg - fatMass);

	const CATEGORIES = {
		male: [
			{ max: 6, label: 'Essential fat' },
			{ max: 14, label: 'Athletic' },
			{ max: 18, label: 'Fitness' },
			{ max: 25, label: 'Average' },
			{ max: Infinity, label: 'Above average' }
		],
		female: [
			{ max: 14, label: 'Essential fat' },
			{ max: 21, label: 'Athletic' },
			{ max: 25, label: 'Fitness' },
			{ max: 32, label: 'Average' },
			{ max: Infinity, label: 'Above average' }
		]
	} as const;

	const category = $derived(
		(CATEGORIES[s.sex as 'male' | 'female'] ?? CATEGORIES.male).find((c) => bodyFat < c.max)?.label ?? '—'
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Note>
			Measure with a flexible tape, snug but not compressing. <strong>Neck</strong> just below the
			larynx. <strong>Waist</strong> at the navel for men, at the narrowest point for women.
			<strong>Hips</strong> at the widest point. Measure at the end of a normal exhale, and take the
			average of three attempts.
		</Note>

		<div class="field-row">
			<Field label="Sex" for="bf-sex">
				<select id="bf-sex" bind:value={s.sex}><option value="male">Male</option><option value="female">Female</option></select>
			</Field>
			<Field label="Height (cm)" for="bf-height"><input id="bf-height" type="number" min="100" max="250" step="0.5" bind:value={s.heightCm} /></Field>
			<Field label="Weight (kg)" for="bf-weight"><input id="bf-weight" type="number" min="30" max="300" step="0.1" bind:value={s.weightKg} /></Field>
		</div>
		<div class="field-row">
			<Field label="Neck (cm)" for="bf-neck"><input id="bf-neck" type="number" min="20" max="70" step="0.5" bind:value={s.neckCm} /></Field>
			<Field label="Waist (cm)" for="bf-waist"><input id="bf-waist" type="number" min="40" max="200" step="0.5" bind:value={s.waistCm} /></Field>
			{#if s.sex === 'female'}
				<Field label="Hips (cm)" for="bf-hip"><input id="bf-hip" type="number" min="50" max="200" step="0.5" bind:value={s.hipCm} /></Field>
			{/if}
		</div>

		<Result label="Estimated body fat" primary value={valid ? `${fmtLoose(bodyFat, 1)}%` : '—'} detail={valid ? category : 'Check your measurements — the waist must exceed the neck'} />

		<div class="results-grid">
			<Result label="Fat mass" value={valid ? `${fmtLoose(fatMass, 1)} kg` : '—'} />
			<Result label="Lean body mass" value={valid ? `${fmtLoose(leanMass, 1)} kg` : '—'} detail="Muscle, bone, organs, water" />
			<Result label="Waist-to-height ratio" value={s.heightCm > 0 ? fmtLoose(s.waistCm / s.heightCm, 3) : '—'} tone={s.waistCm / s.heightCm < 0.5 ? 'positive' : 'warning'} detail="Under 0.5 is the usual target" />
			{#if s.sex === 'female'}
				<Result label="Waist-to-hip ratio" value={s.hipCm > 0 ? fmtLoose(s.waistCm / s.hipCm, 3) : '—'} />
			{/if}
		</div>
	</div>

	<section class="card">
		<h2>Reference ranges</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Category</th><th class="num">Men</th><th class="num">Women</th></tr></thead>
				<tbody>
					<tr><td>Essential fat</td><td class="num">2–5%</td><td class="num">10–13%</td></tr>
					<tr><td>Athletes</td><td class="num">6–13%</td><td class="num">14–20%</td></tr>
					<tr><td>Fitness</td><td class="num">14–17%</td><td class="num">21–24%</td></tr>
					<tr><td>Average</td><td class="num">18–24%</td><td class="num">25–31%</td></tr>
					<tr><td>Above average</td><td class="num">25%+</td><td class="num">32%+</td></tr>
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			The US Navy method estimates body fat from circumference measurements and height. It works
			because fat distributes predictably enough across a population that waist girth relative to
			neck and height correlates with total fat.
		</p>
		<code class="formula">Men:   %fat = 495 / (1.0324 − 0.19077·log₁₀(waist − neck) + 0.15456·log₁₀(height)) − 450
Women: %fat = 495 / (1.29579 − 0.35004·log₁₀(waist + hip − neck) + 0.221·log₁₀(height)) − 450</code>
		<h3>How accurate is it?</h3>
		<p>
			Validation studies put the standard error at roughly 3–4 percentage points against
			hydrostatic weighing. That is good enough to track a direction over months, and not good
			enough to argue about a single point. DEXA is the practical gold standard; skinfold calipers in
			trained hands sit somewhere between.
		</p>
		<h3>Measure consistently, not perfectly</h3>
		<p>
			The number matters less than the trend. Measure at the same time of day, in the same state of
			hydration, with the same tape, and compare month to month. A one-point move week to week is
			measurement noise.
		</p>
		<h3>Essential fat is not optional</h3>
		<p>
			Below about 5% for men and 12% for women, the body is drawing on fat that organs and hormones
			require. Sustained very low body fat disrupts endocrine function — in women it commonly stops
			menstruation, a recognised marker of energy deficiency, not of fitness.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Hodgdon JA, Beckett MB, “Prediction of percent body fat for U.S. Navy men and women from body
			circumferences and height”, Naval Health Research Center, 1984. Category ranges follow the
			American Council on Exercise.
		</p>
	{/snippet}
</ToolShell>
