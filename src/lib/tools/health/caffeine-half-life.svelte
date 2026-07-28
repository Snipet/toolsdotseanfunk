<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const DRINKS = [
		{ id: 'espresso', name: 'Espresso (single)', mg: 63 },
		{ id: 'coffee', name: 'Brewed coffee (240 mL)', mg: 95 },
		{ id: 'coffee-large', name: 'Large coffee (475 mL)', mg: 190 },
		{ id: 'cold-brew', name: 'Cold brew (350 mL)', mg: 205 },
		{ id: 'black-tea', name: 'Black tea', mg: 47 },
		{ id: 'green-tea', name: 'Green tea', mg: 28 },
		{ id: 'energy', name: 'Energy drink (250 mL)', mg: 80 },
		{ id: 'cola', name: 'Cola (355 mL)', mg: 34 },
		{ id: 'preworkout', name: 'Pre-workout scoop', mg: 200 },
		{ id: 'custom', name: 'Custom amount', mg: 100 }
	];

	const s = urlState({ drink: 'coffee', mg: 95, hour: 8, halfLife: 5, bedHour: 23 });

	const dose = $derived(s.drink === 'custom' ? s.mg : (DRINKS.find((d) => d.id === s.drink)?.mg ?? 95));

	/** First-order elimination: every half-life removes half of what remains. */
	const remainingAt = (hoursLater: number) => dose * Math.pow(0.5, hoursLater / s.halfLife);

	const hoursUntilBed = $derived(s.bedHour > s.hour ? s.bedHour - s.hour : s.bedHour + 24 - s.hour);
	const atBedtime = $derived(remainingAt(hoursUntilBed));

	// Sleep research often flags ~50 mg as the level at which onset is affected.
	const hoursToThreshold = $derived(
		dose > 50 ? s.halfLife * Math.log2(dose / 50) : 0
	);
	const hoursToNegligible = $derived(dose > 10 ? s.halfLife * Math.log2(dose / 10) : 0);

	const timeline = $derived(
		Array.from({ length: 25 }, (_, i) => ({
			hour: (s.hour + i) % 24,
			offset: i,
			mg: remainingAt(i)
		}))
	);

	const W = 640;
	const H = 180;
	const path = $derived(
		timeline
			.map((p, i) => `${i ? 'L' : 'M'}${((i / 24) * W).toFixed(1)},${(H - (p.mg / Math.max(dose, 1)) * H).toFixed(1)}`)
			.join(' ')
	);
	const bedX = $derived((Math.min(hoursUntilBed, 24) / 24) * W);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="What did you drink?" for="ch-drink">
				<select id="ch-drink" bind:value={s.drink}>
					{#each DRINKS as d (d.id)}<option value={d.id}>{d.name}{d.id !== 'custom' ? ` — ${d.mg} mg` : ''}</option>{/each}
				</select>
			</Field>
			{#if s.drink === 'custom'}
				<Field label="Caffeine (mg)" for="ch-mg"><input id="ch-mg" type="number" min="0" max="1000" step="5" bind:value={s.mg} /></Field>
			{/if}
			<Field label="Time you drank it" for="ch-hour">
				<select id="ch-hour" bind:value={s.hour}>
					{#each Array.from({ length: 24 }, (_, i) => i) as h (h)}<option value={h}>{String(h).padStart(2, '0')}:00</option>{/each}
				</select>
			</Field>
			<Field label="Bedtime" for="ch-bed">
				<select id="ch-bed" bind:value={s.bedHour}>
					{#each Array.from({ length: 24 }, (_, i) => i) as h (h)}<option value={h}>{String(h).padStart(2, '0')}:00</option>{/each}
				</select>
			</Field>
			<Field label="Your half-life (hours)" for="ch-hl" hint="5 hours is typical; range is 2–10">
				<input id="ch-hl" type="number" min="1.5" max="12" step="0.5" bind:value={s.halfLife} />
			</Field>
		</div>

		<Result
			label="Still in your system at bedtime"
			primary
			value={`${fmtLoose(atBedtime, 0)} mg`}
			tone={atBedtime > 50 ? 'warning' : 'positive'}
			detail={atBedtime > 50
				? `That is ${fmtLoose((atBedtime / dose) * 100, 0)}% of the dose — enough to delay sleep onset for many people.`
				: `${fmtLoose((atBedtime / dose) * 100, 0)}% of the dose remains — unlikely to affect sleep much.`}
		/>

		<div class="results-grid">
			<Result label="Dose" value={`${dose} mg`} />
			<Result label="Down to 50 mg after" value={`${fmtLoose(hoursToThreshold, 1)} hours`} detail={`Around ${String(Math.round(s.hour + hoursToThreshold) % 24).padStart(2, '0')}:00`} />
			<Result label="Down to 10 mg after" value={`${fmtLoose(hoursToNegligible, 1)} hours`} detail="Effectively cleared" />
			<Result label="Half gone after" value={`${s.halfLife} hours`} />
		</div>

		<div>
			<svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Caffeine level decaying over 24 hours">
				<path d="{path} L{W},{H} L0,{H} Z" fill="color-mix(in srgb, var(--accent) 18%, transparent)" />
				<path d={path} fill="none" stroke="var(--accent)" stroke-width="2.5" />
				<line x1="0" y1={H - (50 / Math.max(dose, 1)) * H} x2={W} y2={H - (50 / Math.max(dose, 1)) * H} stroke="var(--warning)" stroke-dasharray="4 3" stroke-width="1.5" />
				<line x1={bedX} y1="0" x2={bedX} y2={H} stroke="var(--text)" stroke-dasharray="3 3" />
			</svg>
			<p class="small muted">
				24 hours from your drink. The dashed horizontal line is 50 mg; the vertical line is bedtime.
			</p>
		</div>
	</div>

	<Note tone="warning">
		Half-life varies enormously between people — roughly 2 to 10 hours depending on genetics
		(the CYP1A2 enzyme), liver function, smoking, and hormonal contraceptives, which can
		<em>double</em> it. Pregnancy extends it further still. Adjust the half-life above to match your
		own experience rather than trusting the default.
	</Note>

	{#snippet explainer()}
		<p>
			Caffeine clears by first-order kinetics: a constant <em>fraction</em> is removed per unit time,
			not a constant amount. That produces exponential decay, so each half-life halves whatever is
			left.
		</p>
		<code class="formula">remaining = dose × 0.5^(hours / half-life)</code>
		<h3>Why an afternoon coffee reaches midnight</h3>
		<p>
			With a 5-hour half-life, a 95 mg coffee at 3pm still leaves about 24 mg at 11pm and 12 mg at
			4am. Controlled studies have found measurable sleep disruption from caffeine taken six hours
			before bed even when people report no subjective effect — the disruption shows up in sleep
			architecture rather than in how long it takes to fall asleep.
		</p>
		<h3>Tolerance is not clearance</h3>
		<p>
			Regular drinkers feel less of a jolt, but the caffeine is still present and still acting on
			adenosine receptors while you sleep. “Coffee doesn't affect me” usually means the alerting
			effect has faded, not the pharmacology.
		</p>
		<h3>Daily limits</h3>
		<p>
			The EFSA and FDA both put 400 mg a day as generally safe for healthy adults, and 200 mg in a
			single dose. Pregnancy guidance is 200 mg a day total. Roughly four cups of brewed coffee
			reaches the daily figure.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Caffeine content figures from <strong>USDA FoodData Central</strong> and manufacturer
			disclosures; brewed coffee varies widely with method and bean. Safety thresholds from the
			<strong>EFSA Scientific Opinion on Caffeine</strong> (2015) and FDA guidance. Sleep-latency
			findings from Drake C et al., <em>Journal of Clinical Sleep Medicine</em>, 2013.
		</p>
	{/snippet}
</ToolShell>

<style>
	.chart {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
</style>
