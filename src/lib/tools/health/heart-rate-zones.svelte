<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ age: 35, resting: 60, maxOverride: 0, method: 'karvonen' });

	// Tanaka is a better population fit than the old 220 − age.
	const tanakaMax = $derived(208 - 0.7 * s.age);
	const classicMax = $derived(220 - s.age);
	const maxHr = $derived(s.maxOverride > 0 ? s.maxOverride : tanakaMax);
	const reserve = $derived(maxHr - s.resting);

	const ZONES = [
		{ n: 1, name: 'Recovery', low: 0.5, high: 0.6, purpose: 'Warm-up, cool-down, easy movement' },
		{ n: 2, name: 'Aerobic base', low: 0.6, high: 0.7, purpose: 'Fat oxidation, endurance foundation' },
		{ n: 3, name: 'Tempo', low: 0.7, high: 0.8, purpose: 'Aerobic capacity, sustained effort' },
		{ n: 4, name: 'Threshold', low: 0.8, high: 0.9, purpose: 'Lactate threshold, race pace' },
		{ n: 5, name: 'VO₂ max', low: 0.9, high: 1.0, purpose: 'Maximum aerobic power, short intervals' }
	];

	function bpm(fraction: number): number {
		// Karvonen works from heart rate reserve; the simple method from max alone.
		return s.method === 'karvonen' ? s.resting + reserve * fraction : maxHr * fraction;
	}

	const valid = $derived(maxHr > s.resting && s.resting > 20);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Age" for="hr-age"><input id="hr-age" type="number" min="10" max="100" bind:value={s.age} /></Field>
			<Field label="Resting heart rate (bpm)" for="hr-rest" hint="Measured first thing in the morning">
				<input id="hr-rest" type="number" min="30" max="120" bind:value={s.resting} />
			</Field>
			<Field label="Known max HR (optional)" for="hr-max" hint="From a lab or field test">
				<input id="hr-max" type="number" min="0" max="230" bind:value={s.maxOverride} />
			</Field>
			<Field label="Method" for="hr-method">
				<select id="hr-method" bind:value={s.method}>
					<option value="karvonen">Karvonen (heart rate reserve)</option>
					<option value="simple">Percentage of max</option>
				</select>
			</Field>
		</div>

		<div class="results-grid">
			<Result label="Maximum heart rate" primary value={valid ? `${Math.round(maxHr)} bpm` : '—'} detail={s.maxOverride > 0 ? 'Your measured value' : `Tanaka: 208 − 0.7 × ${s.age}`} />
			<Result label="Heart rate reserve" value={valid ? `${Math.round(reserve)} bpm` : '—'} detail="Max − resting" />
			<Result label="220 − age would give" value={`${Math.round(classicMax)} bpm`} detail="The older formula, kept for comparison" />
		</div>
	</div>

	<section class="card">
		<h2>Your zones</h2>
		<div class="zones">
			{#each ZONES as zone (zone.n)}
				<div class="zone" data-zone={zone.n}>
					<div class="zone-head">
						<span class="zone-num">Zone {zone.n}</span>
						<span class="zone-name">{zone.name}</span>
						<span class="zone-range num">{valid ? `${Math.round(bpm(zone.low))}–${Math.round(bpm(zone.high))} bpm` : '—'}</span>
					</div>
					<p class="zone-purpose small muted">
						{zone.purpose} · {zone.low * 100}–{zone.high * 100}% of {s.method === 'karvonen' ? 'reserve' : 'max'}
					</p>
				</div>
			{/each}
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Heart rate zones translate “how hard should this feel” into a number you can watch. Zone
			boundaries are conventions, not physiology — the underlying thresholds are real, but the 5-zone
			split is a coaching convenience.
		</p>
		<code class="formula">Karvonen: target = resting + (max − resting) × intensity
Simple:   target = max × intensity
Tanaka:   max ≈ 208 − 0.7 × age</code>
		<h3>Karvonen versus percentage of max</h3>
		<p>
			The simple method ignores your resting heart rate, so it gives the same zones to a sedentary
			person and a trained athlete of the same age. Karvonen works from heart rate <em>reserve</em>,
			which accounts for fitness — a low resting rate shifts the zones up. Karvonen is the better
			default for anyone who has been training for a while.
		</p>
		<h3>220 − age is worse than its fame suggests</h3>
		<p>
			That formula came from a 1970s review and was never validated properly; its standard deviation
			is around 10–12 bpm, so it can be badly wrong for an individual. Tanaka's 208 − 0.7 × age fits
			the data better, especially for older adults. Neither replaces an actual measured maximum.
		</p>
		<h3>Zone 2 gets the attention for a reason</h3>
		<p>
			Sustained easy aerobic work builds mitochondrial density and capillarisation without much
			recovery cost, which is why endurance athletes spend most of their volume there. The common
			mistake is running zone 2 sessions at zone 3 — hard enough to accumulate fatigue, easy enough
			to miss the high-intensity adaptations.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Tanaka H, Monahan KD, Seals DR, “Age-predicted maximal heart rate revisited”, <em>Journal of the
			American College of Cardiology</em>, 2001. Karvonen MJ et al., 1957.
		</p>
	{/snippet}
</ToolShell>

<style>
	.zones {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.zone {
		padding: 0.6rem 0.85rem;
		border-radius: var(--radius-sm);
		border-left: 4px solid;
		background: var(--bg-sunken);
	}
	.zone[data-zone='1'] { border-color: #7aa8d6; }
	.zone[data-zone='2'] { border-color: var(--positive); }
	.zone[data-zone='3'] { border-color: var(--warning); }
	.zone[data-zone='4'] { border-color: #d97a3f; }
	.zone[data-zone='5'] { border-color: var(--negative); }
	.zone-head {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.zone-num {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 700;
		color: var(--text-muted);
	}
	.zone-name {
		font-weight: 600;
	}
	.zone-range {
		margin-left: auto;
		font-weight: 650;
	}
	.zone-purpose {
		margin-top: 0.15rem;
	}
</style>
