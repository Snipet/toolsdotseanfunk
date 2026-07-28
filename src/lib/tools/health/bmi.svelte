<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ metric: true, kg: 70, cm: 175, lb: 154, ft: 5, inch: 9 });

	const weightKg = $derived(s.metric ? s.kg : s.lb * 0.45359237);
	const heightM = $derived(s.metric ? s.cm / 100 : (s.ft * 12 + s.inch) * 0.0254);

	const bmi = $derived(heightM > 0 ? weightKg / heightM ** 2 : NaN);
	const valid = $derived(Number.isFinite(bmi) && bmi > 0 && bmi < 200);

	const CATEGORIES = [
		{ max: 18.5, label: 'Underweight', tone: 'warning' as const },
		{ max: 25, label: 'Healthy weight', tone: 'positive' as const },
		{ max: 30, label: 'Overweight', tone: 'warning' as const },
		{ max: 35, label: 'Obesity class I', tone: 'negative' as const },
		{ max: 40, label: 'Obesity class II', tone: 'negative' as const },
		{ max: Infinity, label: 'Obesity class III', tone: 'negative' as const }
	];

	const category = $derived(CATEGORIES.find((c) => bmi < c.max) ?? CATEGORIES[0]);

	/** The weight range that would put this height in the 18.5–25 band. */
	const healthyLow = $derived(18.5 * heightM ** 2);
	const healthyHigh = $derived(24.9 * heightM ** 2);

	const toDisplay = (kg: number) => (s.metric ? `${fmtLoose(kg, 1)} kg` : `${fmtLoose(kg / 0.45359237, 1)} lb`);

	// Scale position for the visual band, clamped to the drawn range 15–40.
	const markerPercent = $derived(Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100)));
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={s.metric} onclick={() => (s.metric = true)}>Metric</button>
			<button type="button" class="btn btn-sm" class:btn-primary={!s.metric} onclick={() => (s.metric = false)}>Imperial</button>
		</div>

		{#if s.metric}
			<div class="field-row">
				<Field label="Weight (kg)" for="bmi-kg"><input id="bmi-kg" type="number" min="1" max="400" step="0.1" bind:value={s.kg} /></Field>
				<Field label="Height (cm)" for="bmi-cm"><input id="bmi-cm" type="number" min="50" max="260" step="0.5" bind:value={s.cm} /></Field>
			</div>
		{:else}
			<div class="field-row">
				<Field label="Weight (lb)" for="bmi-lb"><input id="bmi-lb" type="number" min="1" max="900" step="0.5" bind:value={s.lb} /></Field>
				<Field label="Height (feet)" for="bmi-ft"><input id="bmi-ft" type="number" min="1" max="8" bind:value={s.ft} /></Field>
				<Field label="Height (inches)" for="bmi-in"><input id="bmi-in" type="number" min="0" max="11.9" step="0.5" bind:value={s.inch} /></Field>
			</div>
		{/if}

		<Result label="Body mass index" primary value={valid ? fmtLoose(bmi, 1) : '—'} tone={valid ? category.tone : 'neutral'} detail={valid ? category.label : undefined} />

		<div class="scale" role="img" aria-label="BMI scale showing where {fmtLoose(bmi, 1)} falls">
			<div class="bands">
				<span class="band under" style="flex: 3.5">Under</span>
				<span class="band healthy" style="flex: 6.5">Healthy</span>
				<span class="band over" style="flex: 5">Over</span>
				<span class="band obese" style="flex: 10">Obese</span>
			</div>
			{#if valid}
				<span class="marker" style="left: {markerPercent}%"></span>
			{/if}
			<div class="ticks small muted"><span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span></div>
		</div>

		<div class="results-grid">
			<Result label="Healthy range for your height" value={valid ? `${toDisplay(healthyLow)} – ${toDisplay(healthyHigh)}` : '—'} detail="BMI 18.5 to 24.9" />
			<Result
				label="Difference from that range"
				value={!valid ? '—' : weightKg < healthyLow ? `${toDisplay(healthyLow - weightKg)} below` : weightKg > healthyHigh ? `${toDisplay(weightKg - healthyHigh)} above` : 'Inside the range'}
			/>
			<Result label="Ponderal index" value={valid ? fmtLoose(weightKg / heightM ** 3, 2) : '—'} detail="kg/m³ — scales better at extreme heights" />
		</div>

		<Note tone="warning">
			BMI was designed to describe populations, not individuals. It cannot distinguish muscle from
			fat, ignores where fat is carried, and systematically misclassifies athletes, older adults and
			some ethnic groups. Treat it as one weak signal among many, never as a diagnosis.
		</Note>
	</div>

	{#snippet explainer()}
		<p>
			Body mass index divides weight by the square of height. It was devised by Adolphe Quetelet in
			the 1830s as a statistical tool for characterising populations — he explicitly warned against
			applying it to individuals.
		</p>
		<code class="formula">BMI = weight(kg) / height(m)²
    = 703 × weight(lb) / height(in)²</code>
		<h3>Where it fails</h3>
		<ul>
			<li><strong>Muscle.</strong> Muscle is denser than fat, so athletes routinely score “overweight” or “obese” while carrying very little fat.</li>
			<li><strong>Distribution.</strong> Visceral fat around the organs carries far more risk than the same mass on hips and thighs. BMI cannot see the difference; waist-to-height ratio can.</li>
			<li><strong>Height.</strong> The square in the denominator undercounts tall people and overcounts short ones, because bodies scale closer to a cube. The ponderal index above corrects for this.</li>
			<li><strong>Ethnicity.</strong> Risk thresholds differ meaningfully across populations. The UK's NICE guidance, for example, lowers the overweight threshold for people of South Asian, Chinese, Black African and African-Caribbean background.</li>
			<li><strong>Age.</strong> Children and teenagers need age-and-sex-specific percentile charts, not these adult categories.</li>
		</ul>
		<h3>Better questions</h3>
		<p>
			Waist-to-height ratio (keep your waist under half your height) predicts metabolic risk better
			than BMI and needs only a tape measure. Blood pressure, fasting glucose, lipid panel and
			cardiorespiratory fitness all tell you more about health than any weight-derived number.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Category thresholds follow the <strong>World Health Organization</strong> adult BMI
			classification, as used by the CDC. These are the international standard cut-offs; several
			national bodies apply lower thresholds for specific populations.
		</p>
	{/snippet}
</ToolShell>

<style>
	.scale {
		position: relative;
		padding-bottom: 1.2rem;
	}
	.bands {
		display: flex;
		height: 26px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		font-size: 0.72rem;
		font-weight: 600;
		color: #fff;
	}
	.band {
		display: grid;
		place-items: center;
	}
	.under {
		background: color-mix(in srgb, var(--warning) 80%, #000);
	}
	.healthy {
		background: var(--positive);
	}
	.over {
		background: var(--warning);
	}
	.obese {
		background: var(--negative);
	}
	.marker {
		position: absolute;
		top: -4px;
		width: 3px;
		height: 34px;
		background: var(--text);
		border-radius: 2px;
		transform: translateX(-50%);
		box-shadow: 0 0 0 2px var(--bg-raised);
	}
	.ticks {
		display: flex;
		justify-content: space-between;
		margin-top: 0.2rem;
	}
</style>
