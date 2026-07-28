<script lang="ts">
	import { CVD_TYPES, parseColor, readableOn, simulateCvd, toHex, contrastRatio } from '$lib/color/color';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ palette: '#2f6f43,#b3261e,#8a6100,#1f6fb8,#6b6b65' });

	const colors = $derived(
		s.palette
			.split(',')
			.map((value) => value.trim())
			.map((value) => ({ value, rgb: parseColor(value) }))
			.filter((entry): entry is { value: string; rgb: NonNullable<ReturnType<typeof parseColor>> } => entry.rgb !== null)
	);

	const PREVALENCE: Record<string, string> = {
		Protanopia: 'Red-blind — about 1% of men',
		Deuteranopia: 'Green-blind — about 1% of men, the most common form',
		Tritanopia: 'Blue-blind — rare, about 0.01% of people, affects sexes equally',
		Achromatopsia: 'Total colour blindness — very rare'
	};

	/** Pairs that become hard to tell apart under a given simulation. */
	const confusions = $derived.by(() =>
		CVD_TYPES.map((type) => {
			const pairs: Array<{ a: string; b: string; ratio: number }> = [];
			for (let i = 0; i < colors.length; i++) {
				for (let j = i + 1; j < colors.length; j++) {
					const simA = simulateCvd(colors[i].rgb, type);
					const simB = simulateCvd(colors[j].rgb, type);
					const ratio = contrastRatio(simA, simB);
					if (ratio < 1.3) pairs.push({ a: colors[i].value, b: colors[j].value, ratio });
				}
			}
			return { type, pairs };
		}).filter((entry) => entry.pairs.length)
	);

	function addColor() {
		s.palette = `${s.palette},#888888`;
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field label="Palette — comma-separated colours" for="cb-palette">
			<input id="cb-palette" type="text" class="mono" bind:value={s.palette} autocomplete="off" spellcheck="false" />
		</Field>
		<div class="row no-print">
			<button type="button" class="btn btn-sm" onclick={addColor}>Add a colour</button>
			<button type="button" class="btn btn-sm" onclick={() => (s.palette = '#e63946,#f1faee,#a8dadc,#457b9d,#1d3557')}>Load an example</button>
		</div>
	</div>

	<section class="card">
		<h2>Normal vision</h2>
		<div class="row-swatches">
			{#each colors as color (color.value)}
				<div class="swatch" style="background: {toHex(color.rgb)}; color: {readableOn(color.rgb)}">
					{toHex(color.rgb).toUpperCase()}
				</div>
			{/each}
		</div>
	</section>

	{#each CVD_TYPES as type (type)}
		<section class="card">
			<h2>{type}</h2>
			<p class="small muted">{PREVALENCE[type]}</p>
			<div class="row-swatches">
				{#each colors as color (color.value)}
					{@const simulated = simulateCvd(color.rgb, type)}
					<div class="swatch" style="background: {toHex(simulated)}; color: {readableOn(simulated)}">
						{toHex(simulated).toUpperCase()}
					</div>
				{/each}
			</div>
		</section>
	{/each}

	{#if confusions.length}
		<section class="card">
			<h2>Colours that become hard to distinguish</h2>
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th>Simulation</th><th>Pair</th><th class="num">Contrast between them</th></tr></thead>
					<tbody>
						{#each confusions as entry (entry.type)}
							{#each entry.pairs as pair (pair.a + pair.b)}
								<tr>
									<td>{entry.type}</td>
									<td>
										<span class="chip" style="background: {pair.a}"></span>
										{pair.a}
										<span class="chip" style="background: {pair.b}"></span>
										{pair.b}
									</td>
									<td class="num">{fmtLoose(pair.ratio, 2)} : 1</td>
								</tr>
							{/each}
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{:else if colors.length > 1}
		<Note>
			No pairs in this palette collapse into near-identical colours under any of the simulations
			above. That is a good sign, though it does not replace testing with real content.
		</Note>
	{/if}

	{#snippet explainer()}
		<p>
			Around 8% of men and 0.5% of women of northern European descent have some form of colour vision
			deficiency. The most common types affect the red-green axis, which is precisely the axis most
			interfaces use for “good” and “bad”.
		</p>
		<h3>What the simulations show</h3>
		<dl>
			<dt>Protanopia</dt><dd>The long-wavelength (red) cones are missing. Reds appear dark and shift toward brown.</dd>
			<dt>Deuteranopia</dt><dd>The medium-wavelength (green) cones are missing. The most common form; red and green converge on yellow-brown.</dd>
			<dt>Tritanopia</dt><dd>The short-wavelength (blue) cones are missing. Rare, and affects blue-yellow rather than red-green.</dd>
			<dt>Achromatopsia</dt><dd>No colour discrimination at all. Extremely rare, and the strictest test of whether your design works on luminance alone.</dd>
		</dl>
		<h3>Never rely on hue alone</h3>
		<p>
			If red means error and green means success, someone with deuteranopia sees two similar
			yellow-browns. Pair colour with a second signal every time — an icon, a label, a pattern, a
			position. This is WCAG success criterion 1.4.1, “Use of Color”.
		</p>
		<h3>Design for luminance</h3>
		<p>
			Colours that differ in <em>lightness</em> stay distinguishable under every deficiency. A quick
			check: view your palette in greyscale — the achromatopsia row above does exactly that. If the
			swatches merge there, they will be ambiguous for someone.
		</p>
		<h3>These are approximations</h3>
		<p>
			The simulation uses linear matrix transforms, which reproduce the broad effect but not the full
			physiology — and they model the complete absence of a cone type (dichromacy) rather than the
			more common reduced sensitivity (anomalous trichromacy). Use them to catch obvious problems,
			not to certify a design.
		</p>
	{/snippet}
</ToolShell>

<style>
	h2 {
		font-size: 1.05rem;
	}
	.row-swatches {
		display: grid;
		gap: 3px;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		margin-top: 0.7rem;
	}
	.swatch {
		height: 74px;
		display: grid;
		place-items: center;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
	}
	.chip {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 2px;
		border: 1px solid var(--border);
		vertical-align: middle;
		margin: 0 0.2rem;
	}
</style>
