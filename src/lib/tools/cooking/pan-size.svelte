<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	type Shape = 'round' | 'square' | 'rect' | 'loaf' | 'bundt';

	const s = urlState({
		fromShape: 'round' as Shape,
		fromA: 9,
		fromB: 9,
		toShape: 'square' as Shape,
		toA: 8,
		toB: 8,
		depth: 2
	});

	/** Footprint area in square inches. Depth is handled separately. */
	function area(shape: Shape, a: number, b: number): number {
		switch (shape) {
			case 'round':
			case 'bundt':
				return Math.PI * (a / 2) ** 2;
			case 'square':
				return a * a;
			default:
				return a * b;
		}
	}

	const fromArea = $derived(area(s.fromShape as Shape, s.fromA, s.fromB));
	const toArea = $derived(area(s.toShape as Shape, s.toA, s.toB));
	const ratio = $derived(toArea / fromArea);
	const valid = $derived(Number.isFinite(ratio) && ratio > 0);

	const fromVolume = $derived((fromArea * s.depth) / 231); // cubic inches → US gallons… /231
	const cupsFrom = $derived((fromArea * s.depth) * 0.554113); // in³ → US cups
	const cupsTo = $derived(toArea * s.depth * 0.554113);

	/** New batter depth if you pour the same batter into the new pan. */
	const newDepth = $derived((fromArea * s.depth) / toArea);

	const SINGLE = ['round', 'square', 'bundt'];

	const COMMON = [
		{ label: '8-inch round', shape: 'round' as Shape, a: 8, b: 8 },
		{ label: '9-inch round', shape: 'round' as Shape, a: 9, b: 9 },
		{ label: '10-inch round', shape: 'round' as Shape, a: 10, b: 10 },
		{ label: '8-inch square', shape: 'square' as Shape, a: 8, b: 8 },
		{ label: '9-inch square', shape: 'square' as Shape, a: 9, b: 9 },
		{ label: '9×13 rectangle', shape: 'rect' as Shape, a: 9, b: 13 },
		{ label: '8×4 loaf', shape: 'loaf' as Shape, a: 8, b: 4 },
		{ label: '9×5 loaf', shape: 'loaf' as Shape, a: 9, b: 5 }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="tool-card-grid">
			<fieldset>
				<legend class="legend">Recipe calls for</legend>
				<div class="field-row">
					<Field label="Shape" for="ps-from-shape">
						<select id="ps-from-shape" bind:value={s.fromShape}>
							<option value="round">Round</option>
							<option value="square">Square</option>
							<option value="rect">Rectangle</option>
							<option value="loaf">Loaf</option>
							<option value="bundt">Bundt / tube</option>
						</select>
					</Field>
					<Field label={SINGLE.includes(s.fromShape) ? 'Diameter / side (in)' : 'Length (in)'} for="ps-from-a">
						<input id="ps-from-a" type="number" min="1" step="0.5" bind:value={s.fromA} />
					</Field>
					{#if !SINGLE.includes(s.fromShape)}
						<Field label="Width (in)" for="ps-from-b">
							<input id="ps-from-b" type="number" min="1" step="0.5" bind:value={s.fromB} />
						</Field>
					{/if}
				</div>
			</fieldset>

			<fieldset>
				<legend class="legend">You have</legend>
				<div class="field-row">
					<Field label="Shape" for="ps-to-shape">
						<select id="ps-to-shape" bind:value={s.toShape}>
							<option value="round">Round</option>
							<option value="square">Square</option>
							<option value="rect">Rectangle</option>
							<option value="loaf">Loaf</option>
							<option value="bundt">Bundt / tube</option>
						</select>
					</Field>
					<Field label={SINGLE.includes(s.toShape) ? 'Diameter / side (in)' : 'Length (in)'} for="ps-to-a">
						<input id="ps-to-a" type="number" min="1" step="0.5" bind:value={s.toA} />
					</Field>
					{#if !SINGLE.includes(s.toShape)}
						<Field label="Width (in)" for="ps-to-b">
							<input id="ps-to-b" type="number" min="1" step="0.5" bind:value={s.toB} />
						</Field>
					{/if}
				</div>
			</fieldset>
		</div>

		<Field label="Batter depth in the original pan (in)" for="ps-depth" hint="Most cake recipes fill to about 2 inches">
			<input id="ps-depth" type="number" min="0.25" step="0.25" bind:value={s.depth} />
		</Field>

		<div class="results-grid">
			<Result
				label="Scale the recipe by"
				primary
				value={valid ? `×${fmtLoose(ratio, 2)}` : '—'}
				tone={valid && (ratio > 1.15 || ratio < 0.85) ? 'warning' : 'neutral'}
				detail={valid
					? ratio > 1.05
						? `Make ${Math.round((ratio - 1) * 100)}% more batter`
						: ratio < 0.95
							? `Make ${Math.round((1 - ratio) * 100)}% less batter, or expect a deeper cake`
							: 'Close enough to use the recipe as written'
					: undefined}
			/>
			<Result label="Original pan holds" value={valid ? `${fmtLoose(cupsFrom, 1)} cups` : '—'} detail={`At ${s.depth} in deep`} />
			<Result label="New pan holds" value={valid ? `${fmtLoose(cupsTo, 1)} cups` : '—'} detail={`At ${s.depth} in deep`} />
			<Result
				label="Same batter, new depth"
				value={valid ? `${fmtLoose(newDepth, 2)} in` : '—'}
				tone={newDepth > 2.5 ? 'warning' : 'neutral'}
				detail={newDepth > 2.5 ? 'Deep — bake lower and longer' : 'Comfortable'}
			/>
		</div>

		<div class="quick no-print">
			<span class="small muted">Quick pick:</span>
			{#each COMMON as pan (pan.label)}
				<button
					type="button"
					class="btn btn-sm"
					onclick={() => {
						s.toShape = pan.shape;
						s.toA = pan.a;
						s.toB = pan.b;
					}}
				>
					{pan.label}
				</button>
			{/each}
		</div>

		{#if newDepth > 2.5}
			<Note tone="warning">
				At {fmtLoose(newDepth, 2)} inches the batter is deep enough that the outside will set long
				before the middle. Drop the oven by 25 °F (15 °C) and add 10–20 minutes, or split the batter
				across two pans.
			</Note>
		{/if}
	</div>

	{#snippet explainer()}
		<p>
			Pans are compared by the volume of batter they hold, and for a given batter depth that is just
			their footprint area. So the swap comes down to comparing two areas.
		</p>
		<code class="formula">round area = π × (diameter ÷ 2)²
square / rectangle area = length × width
scale factor = new area ÷ old area</code>
		<h3>The classic case</h3>
		<p>
			A 9-inch round has an area of 63.6 in²; an 8-inch square has 64 in². They are within 1% of each
			other, which is why that swap is the one every baking book endorses without adjustment. A
			9-inch <em>square</em>, at 81 in², is 27% larger — same recipe, noticeably thinner cake, and a
			shorter bake.
		</p>
		<h3>Bundt and tube pans</h3>
		<p>
			The centre tube removes volume that this footprint estimate does not account for, so treat
			bundt figures as an upper bound. The reliable method is to measure: fill the pan with water a
			cup at a time until it reaches the fill line.
		</p>
		<h3>Bake time does not scale with the recipe</h3>
		<p>
			Heat travels inward from the surface, so what governs the bake is <em>depth</em>, not total
			volume. A thinner layer bakes faster at the same temperature; a deeper one needs a lower oven so
			the edges do not overcook while the centre catches up. Start checking at two-thirds of the
			original time.
		</p>
	{/snippet}
</ToolShell>

<style>
	.legend {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-muted);
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.quick {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
		align-items: center;
	}
</style>
