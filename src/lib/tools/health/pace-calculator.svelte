<script lang="ts">
	import { clock, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const DISTANCES = [
		{ id: '5k', label: '5K', km: 5 },
		{ id: '10k', label: '10K', km: 10 },
		{ id: 'half', label: 'Half marathon', km: 21.0975 },
		{ id: 'marathon', label: 'Marathon', km: 42.195 },
		{ id: 'mile', label: 'Mile', km: 1.609344 },
		{ id: 'custom', label: 'Custom', km: 0 }
	];

	const s = urlState({ solve: 'pace', preset: 'marathon', km: 42.195, hours: 4, minutes: 0, seconds: 0, paceMin: 5, paceSec: 41, metric: true });

	const distanceKm = $derived(s.preset === 'custom' ? s.km : (DISTANCES.find((d) => d.id === s.preset)?.km ?? 0));
	const totalSeconds = $derived(s.hours * 3600 + s.minutes * 60 + s.seconds);
	const paceSeconds = $derived(s.paceMin * 60 + s.paceSec);

	const unitKm = $derived(s.metric ? distanceKm : distanceKm / 1.609344);
	const unitName = $derived(s.metric ? 'km' : 'mile');

	// Solve for whichever field the user is not supplying.
	const computedPace = $derived(unitKm > 0 ? totalSeconds / unitKm : NaN);
	const computedTime = $derived(paceSeconds * unitKm);
	const computedDistance = $derived(paceSeconds > 0 ? totalSeconds / paceSeconds : NaN);

	const pace = $derived(s.solve === 'pace' ? computedPace : paceSeconds);
	const time = $derived(s.solve === 'time' ? computedTime : totalSeconds);
	const distance = $derived(s.solve === 'distance' ? computedDistance : unitKm);

	const speed = $derived(pace > 0 ? 3600 / pace : NaN);
	const paceOther = $derived(s.metric ? pace * 1.609344 : pace / 1.609344);

	const splits = $derived(
		Number.isFinite(pace) && distance > 0
			? Array.from({ length: Math.min(Math.ceil(distance), 30) }, (_, i) => ({
					unit: i + 1,
					cumulative: pace * Math.min(i + 1, distance)
				}))
			: []
	);

	const equivalents = $derived(
		Number.isFinite(pace)
			? DISTANCES.filter((d) => d.id !== 'custom').map((d) => {
					const dist = s.metric ? d.km : d.km / 1.609344;
					return { label: d.label, time: pace * dist };
				})
			: []
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={s.metric} onclick={() => (s.metric = true)}>min/km</button>
			<button type="button" class="btn btn-sm" class:btn-primary={!s.metric} onclick={() => (s.metric = false)}>min/mile</button>
		</div>

		<Field label="Solve for" for="pc-solve">
			<select id="pc-solve" bind:value={s.solve}>
				<option value="pace">Pace (I know the distance and time)</option>
				<option value="time">Finish time (I know the distance and pace)</option>
				<option value="distance">Distance (I know the pace and time)</option>
			</select>
		</Field>

		<div class="field-row">
			{#if s.solve !== 'distance'}
				<Field label="Distance" for="pc-preset">
					<select id="pc-preset" bind:value={s.preset}>
						{#each DISTANCES as d (d.id)}<option value={d.id}>{d.label}</option>{/each}
					</select>
				</Field>
				{#if s.preset === 'custom'}
					<Field label="Distance (km)" for="pc-km"><input id="pc-km" type="number" min="0.1" step="0.1" bind:value={s.km} /></Field>
				{/if}
			{/if}

			{#if s.solve !== 'time'}
				<Field label="Time" for="pc-h">
					<div class="time-inputs">
						<input id="pc-h" type="number" min="0" max="99" bind:value={s.hours} aria-label="Hours" />
						<span>:</span>
						<input type="number" min="0" max="59" bind:value={s.minutes} aria-label="Minutes" />
						<span>:</span>
						<input type="number" min="0" max="59" bind:value={s.seconds} aria-label="Seconds" />
					</div>
				</Field>
			{/if}

			{#if s.solve !== 'pace'}
				<Field label="Pace per {unitName}" for="pc-pm">
					<div class="time-inputs">
						<input id="pc-pm" type="number" min="0" max="59" bind:value={s.paceMin} aria-label="Pace minutes" />
						<span>:</span>
						<input type="number" min="0" max="59" bind:value={s.paceSec} aria-label="Pace seconds" />
					</div>
				</Field>
			{/if}
		</div>

		<div class="results-grid">
			<Result label="Pace" primary value={Number.isFinite(pace) ? `${clock(pace)} / ${unitName}` : '—'} />
			<Result label="Finish time" primary value={Number.isFinite(time) ? clock(time, true) : '—'} />
			<Result label="Distance" value={Number.isFinite(distance) ? `${fmtLoose(distance, 3)} ${unitName}` : '—'} />
			<Result label="Speed" value={Number.isFinite(speed) ? `${fmtLoose(speed, 2)} ${unitName}/h` : '—'} />
			<Result label="Pace per {s.metric ? 'mile' : 'km'}" value={Number.isFinite(paceOther) ? clock(paceOther) : '—'} />
		</div>
	</div>

	{#if equivalents.length}
		<section class="card">
			<h2>At this pace</h2>
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th>Distance</th><th class="num">Finish time</th></tr></thead>
					<tbody>
						{#each equivalents as row (row.label)}
							<tr><td>{row.label}</td><td class="num">{clock(row.time, true)}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="small muted">
				Straight extrapolation at even pace. Real race times slow over longer distances — a marathon
				at your 5K pace is not a realistic target.
			</p>
		</section>
	{/if}

	{#if splits.length}
		<section class="card">
			<h2>Even splits</h2>
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th class="num">{unitName === 'km' ? 'Km' : 'Mile'}</th><th class="num">Elapsed</th></tr></thead>
					<tbody>
						{#each splits as split (split.unit)}
							<tr><td class="num">{split.unit}</td><td class="num">{clock(split.cumulative, true)}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			Pace is time divided by distance — how long each unit takes. Speed is its reciprocal. Runners
			use pace because it is what a watch shows and what you can hold in your head mid-race.
		</p>
		<code class="formula">pace  = time ÷ distance
time  = pace × distance
speed = distance ÷ time</code>
		<h3>Marathon distance is oddly specific</h3>
		<p>
			42.195 km — 26 miles 385 yards — comes from the 1908 London Olympics, where the course was
			extended so the finish would sit in front of the royal box. The figure was standardised in 1921
			and has been the distance ever since.
		</p>
		<h3>Negative splits</h3>
		<p>
			The even splits above are a planning tool, not a strategy. Most marathon personal bests are run
			with a slightly <em>faster</em> second half, because starting conservatively preserves
			glycogen. Going out fast and fading is the most common way a well-trained runner misses a
			target.
		</p>
		<h3>Predicting across distances</h3>
		<p>
			The table above assumes the same pace at every distance, which no runner achieves. Riegel's
			formula — T₂ = T₁ × (D₂/D₁)^1.06 — is the standard correction, and even it tends to be
			optimistic for the marathon unless your training volume supports it.
		</p>
	{/snippet}
</ToolShell>

<style>
	.time-inputs {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.time-inputs input {
		width: 70px;
		text-align: center;
	}
	.time-inputs span {
		color: var(--text-faint);
	}
</style>
