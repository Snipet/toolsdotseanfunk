<script lang="ts">
	import { toSignificant } from '$lib/units/units';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ value: '3.14159', places: 2, sigfigs: 3, nearest: 5 });

	const n = $derived(Number(s.value.replace(/,/g, '')));
	const valid = $derived(Number.isFinite(n) && s.value.trim() !== '');

	const halfUp = $derived(roundPlaces(n, s.places, 'up'));
	const halfEven = $derived(roundPlaces(n, s.places, 'even'));
	const truncated = $derived(truncPlaces(n, s.places));
	const ceiling = $derived(Math.ceil(n * 10 ** s.places) / 10 ** s.places);
	const floored = $derived(Math.floor(n * 10 ** s.places) / 10 ** s.places);
	const sig = $derived(toSignificant(n, s.sigfigs));
	const toNearest = $derived(Math.round(n / s.nearest) * s.nearest);

	function roundPlaces(value: number, places: number, mode: 'up' | 'even'): number {
		const factor = 10 ** places;
		// Nudging by an epsilon keeps 1.005 from rounding down because its
		// binary representation is a hair under.
		const scaled = value * factor;
		if (mode === 'up') return Math.round(scaled + (scaled >= 0 ? 1e-9 : -1e-9)) / factor;
		const floorVal = Math.floor(scaled);
		const diff = scaled - floorVal;
		if (Math.abs(diff - 0.5) > 1e-9) return Math.round(scaled) / factor;
		return (floorVal % 2 === 0 ? floorVal : floorVal + 1) / factor;
	}

	function truncPlaces(value: number, places: number): number {
		const factor = 10 ** places;
		return Math.trunc(value * factor) / factor;
	}

	const sigfigCount = $derived.by(() => {
		if (!valid) return 0;
		const str = Math.abs(n).toExponential();
		const mantissa = str.split('e')[0].replace('.', '').replace(/0+$/, '');
		return Math.max(1, mantissa.length);
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Number" for="rd-value">
				<input id="rd-value" type="text" inputmode="decimal" bind:value={s.value} autocomplete="off" />
			</Field>
			<Field label="Decimal places" for="rd-places">
				<input id="rd-places" type="number" min="0" max="15" bind:value={s.places} />
			</Field>
		</div>

		<div class="results-grid">
			<Result
				label="Rounded (half up)"
				primary
				value={valid ? halfUp.toFixed(Math.min(15, s.places)) : '—'}
				detail="The everyday rule taught in school"
			/>
			<Result
				label="Banker's rounding (half to even)"
				value={valid ? halfEven.toFixed(Math.min(15, s.places)) : '—'}
				detail="Ties go to the even digit — the IEEE-754 default"
			/>
			<Result label="Rounded down (floor)" value={valid ? floored.toFixed(Math.min(15, s.places)) : '—'} />
			<Result label="Rounded up (ceiling)" value={valid ? ceiling.toFixed(Math.min(15, s.places)) : '—'} />
			<Result label="Truncated" value={valid ? truncated.toFixed(Math.min(15, s.places)) : '—'} detail="Chop, do not round" />
		</div>
	</div>

	<div class="card stack">
		<h2>Significant figures</h2>
		<div class="field-row">
			<Field label="Significant figures: {s.sigfigs}" for="rd-sig">
				<input id="rd-sig" type="range" min="1" max="12" bind:value={s.sigfigs} />
			</Field>
			<Result label="To {s.sigfigs} s.f." value={valid ? String(sig) : '—'} />
			<Result label="Your input has" value={valid ? `${sigfigCount} s.f.` : '—'} />
		</div>
	</div>

	<div class="card stack">
		<h2>Round to the nearest…</h2>
		<div class="field-row">
			<Field label="Multiple" for="rd-nearest">
				<input id="rd-nearest" type="number" step="any" min="0.0001" bind:value={s.nearest} />
			</Field>
			<Result label="Nearest {s.nearest}" value={valid ? String(Number(toNearest.toPrecision(12))) : '—'} />
		</div>
		<div class="row no-print">
			{#each [0.05, 0.25, 5, 10, 100, 1000] as m (m)}
				<button type="button" class="btn btn-sm" onclick={() => (s.nearest = m)}>{m}</button>
			{/each}
		</div>
	</div>

	{#snippet explainer()}
		<p>
			There is no single correct way to round — there are several conventions, and which one you want
			depends on whether you care about the individual value or the sum of many of them.
		</p>
		<h3>Half up versus half to even</h3>
		<p>
			“Round half up” always sends a tie away from zero: 2.5 becomes 3. It is simple, and it is what
			everybody is taught. But it is biased: over many values, ties always push the total upward.
		</p>
		<p>
			<strong>Banker's rounding</strong> sends ties to the nearest even digit: 2.5 becomes 2, and 3.5
			becomes 4. Half the ties go up and half go down, so the bias cancels. This is why it is the
			IEEE-754 default and why accounting and statistical software use it.
		</p>
		<h3>Significant figures</h3>
		<p>
			Significant figures track <em>precision</em> rather than position. Leading zeros never count;
			trailing zeros after a decimal point do. 0.00420 has three significant figures. When
			multiplying or dividing, the answer carries the significant figures of the least precise input
			— a measurement is never made more accurate by arithmetic.
		</p>
		<h3>Do not round twice</h3>
		<p>
			Rounding 2.44 to one decimal gives 2.4, then to zero gives 2. Rounding 2.44 straight to zero
			gives 2 as well — but 2.45 → 2.5 → 3 versus 2.45 → 2 shows the trap. Always round once, from
			the original value.
		</p>
	{/snippet}
</ToolShell>
