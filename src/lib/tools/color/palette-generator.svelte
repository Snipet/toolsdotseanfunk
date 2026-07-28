<script lang="ts">
	import { harmonies, parseColor, readableOn, toHex } from '$lib/color/color';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ base: '#b8481f' });

	const base = $derived(parseColor(s.base));
	const sets = $derived(base ? harmonies(base) : {});

	function randomise() {
		const hue = Math.floor(Math.random() * 360);
		const converted = parseColor(`hsl(${hue}, ${45 + Math.random() * 45}%, ${35 + Math.random() * 25}%)`);
		if (converted) s.base = toHex(converted);
	}

	const cssVariables = $derived(
		Object.entries(sets)
			.map(([name, colors]) =>
				colors
					.map((color, i) => `  --${name.toLowerCase().replace(/\s+/g, '-')}-${i + 1}: ${toHex(color)};`)
					.join('\n')
			)
			.join('\n')
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Base colour" for="pg-base">
				<div class="color-input">
					<input type="color" value={base ? toHex(base) : '#000000'} oninput={(e) => (s.base = e.currentTarget.value)} aria-label="Pick a base colour" />
					<input id="pg-base" type="text" class="mono" bind:value={s.base} autocomplete="off" spellcheck="false" />
				</div>
			</Field>
			<div class="actions">
				<button type="button" class="btn" onclick={randomise}>Random colour</button>
				<CopyButton value={() => `:root {\n${cssVariables}\n}`} label="Copy CSS variables" />
			</div>
		</div>
	</div>

	{#each Object.entries(sets) as [name, colors] (name)}
		<section class="card">
			<div class="head">
				<h2>{name}</h2>
				<CopyButton value={colors.map(toHex).join(', ')} label="Copy" />
			</div>
			<div class="palette">
				{#each colors as color, i (i)}
					<button
						type="button"
						class="swatch"
						style="background: {toHex(color)}; color: {readableOn(color)}"
						onclick={() => (s.base = toHex(color))}
						title="Use as the base colour"
					>
						<span class="hex">{toHex(color).toUpperCase()}</span>
					</button>
				{/each}
			</div>
		</section>
	{/each}

	{#snippet explainer()}
		<p>
			Colour harmonies come from geometry on the hue wheel. Pick a base hue, rotate by a fixed angle,
			and the resulting colours relate to each other in a way the eye reads as deliberate.
		</p>
		<dl>
			<dt>Complementary — 180° apart</dt>
			<dd>Maximum contrast and vibrancy. Excellent for a single accent against a dominant colour; exhausting if used in equal amounts.</dd>
			<dt>Analogous — ±30°</dt>
			<dd>Neighbours on the wheel. Calm and cohesive, which is why it dominates nature photography and most brand palettes.</dd>
			<dt>Triadic — 120° apart</dt>
			<dd>Vivid and balanced. Works best with one colour dominant and the other two as accents.</dd>
			<dt>Split complementary</dt>
			<dd>The two colours either side of the complement. Nearly the contrast of complementary, considerably easier to balance.</dd>
			<dt>Tetradic — a rectangle on the wheel</dt>
			<dd>Four colours, two complementary pairs. The most flexible and the hardest to keep from looking chaotic.</dd>
			<dt>Monochromatic</dt>
			<dd>One hue at several lightness levels. Guaranteed to cohere; relies on contrast rather than hue to create hierarchy.</dd>
		</dl>
		<h3>The 60-30-10 rule</h3>
		<p>
			A reliable starting distribution: 60% dominant colour, 30% secondary, 10% accent. Harmony
			gives you which colours; proportion gives you whether the result works.
		</p>
		<h3>Check the contrast</h3>
		<p>
			Harmonious does not mean readable. Two colours 120° apart can be perfectly balanced and still
			fail a contrast check when one is text on the other. Run any text-and-background pair through
			the contrast checker before committing to it.
		</p>
	{/snippet}
</ToolShell>

<style>
	.color-input {
		display: flex;
		gap: 0.4rem;
	}
	.color-input input[type='color'] {
		width: 48px;
		flex: none;
	}
	.actions {
		display: flex;
		align-items: flex-end;
		gap: 0.4rem;
		padding-bottom: 0.25rem;
		flex-wrap: wrap;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.6rem;
	}
	h2 {
		font-size: 1rem;
	}
	.palette {
		display: grid;
		gap: 0.4rem;
		grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
	}
	.swatch {
		height: 88px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		display: flex;
		align-items: flex-end;
		padding: 0.5rem;
		transition: transform 0.1s ease;
	}
	.swatch:hover {
		transform: translateY(-2px);
	}
	.hex {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		font-weight: 600;
	}
</style>
