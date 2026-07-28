<script lang="ts">
	import { contrastRatio, parseColor, readableOn, shades, toHex } from '$lib/color/color';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ base: '#b8481f', name: 'brand' });

	const base = $derived(parseColor(s.base));
	const ramp = $derived(base ? shades(base) : []);

	const white = { r: 255, g: 255, b: 255 };
	const black = { r: 0, g: 0, b: 0 };

	const cssOutput = $derived(
		`:root {\n${ramp.map((entry) => `  --${s.name}-${entry.step}: ${toHex(entry.color)};`).join('\n')}\n}`
	);

	const tailwindOutput = $derived(
		`${s.name}: {\n${ramp.map((entry) => `  ${entry.step}: '${toHex(entry.color)}',`).join('\n')}\n}`
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Base colour" for="sh-base">
				<div class="color-input">
					<input type="color" value={base ? toHex(base) : '#000000'} oninput={(e) => (s.base = e.currentTarget.value)} aria-label="Pick a base colour" />
					<input id="sh-base" type="text" class="mono" bind:value={s.base} autocomplete="off" spellcheck="false" />
				</div>
			</Field>
			<Field label="Variable name" for="sh-name">
				<input id="sh-name" type="text" bind:value={s.name} autocomplete="off" />
			</Field>
		</div>
	</div>

	<section class="card">
		<h2>Tonal ramp</h2>
		<div class="ramp">
			{#each ramp as entry (entry.step)}
				<button
					type="button"
					class="step"
					style="background: {toHex(entry.color)}; color: {readableOn(entry.color)}"
					onclick={() => (s.base = toHex(entry.color))}
				>
					<span class="step-number">{entry.step}</span>
					<span class="step-hex">{toHex(entry.color).toUpperCase()}</span>
				</button>
			{/each}
		</div>
	</section>

	<section class="card">
		<h2>Contrast against black and white</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Step</th><th>Hex</th><th class="num">vs white</th><th class="num">vs black</th><th>Safe for body text on</th></tr></thead>
				<tbody>
					{#each ramp as entry (entry.step)}
						{@const onWhite = contrastRatio(entry.color, white)}
						{@const onBlack = contrastRatio(entry.color, black)}
						<tr>
							<td>{entry.step}</td>
							<td class="mono">{toHex(entry.color)}</td>
							<td class="num" class:good={onWhite >= 4.5}>{fmtLoose(onWhite, 2)}</td>
							<td class="num" class:good={onBlack >= 4.5}>{fmtLoose(onBlack, 2)}</td>
							<td class="muted small">
								{onWhite >= 4.5 && onBlack >= 4.5 ? 'either' : onWhite >= 4.5 ? 'white' : onBlack >= 4.5 ? 'black' : 'neither'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<div class="tool-card-grid">
		<section class="card">
			<div class="head">
				<h2>CSS custom properties</h2>
				<CopyButton value={() => cssOutput} label="Copy" />
			</div>
			<pre class="code">{cssOutput}</pre>
		</section>
		<section class="card">
			<div class="head">
				<h2>Tailwind config</h2>
				<CopyButton value={() => tailwindOutput} label="Copy" />
			</div>
			<pre class="code">{tailwindOutput}</pre>
		</section>
	</div>

	{#snippet explainer()}
		<p>
			A tonal ramp takes one hue and generates a series of lightness steps, giving you a full scale
			from a near-white tint to a near-black shade — the backbone of any design system.
		</p>
		<h3>The 50–950 numbering</h3>
		<p>
			The convention popularised by Material Design and Tailwind: 50 is lightest, 500 is the base,
			950 is darkest. Numbering rather than naming means adding a step later does not force a rename,
			and it makes “one step darker” an obvious operation.
		</p>
		<h3>Why lightness alone is not quite enough</h3>
		<p>
			This ramp holds hue and saturation constant and varies lightness, which is simple and
			predictable. Perceptually, though, equal HSL lightness steps do not look equally spaced — blues
			read as darker than yellows at the same value. Ramps built in a perceptual space such as OKLCH
			handle that better; the trade-off is that they are harder to reason about by hand.
		</p>
		<h3>Check contrast before you commit</h3>
		<p>
			The table above shows which steps are safe for body text on white and on black. A common
			outcome is that only steps 600 and above work on white — useful to know before building an
			interface around step 400.
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
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.6rem;
	}
	.head h2 {
		margin-bottom: 0;
	}
	.ramp {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
		gap: 3px;
	}
	.step {
		height: 96px;
		border: none;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: flex-start;
		padding: 0.5rem;
		cursor: pointer;
		gap: 0.1rem;
	}
	.step:first-child {
		border-radius: var(--radius-sm) 0 0 var(--radius-sm);
	}
	.step:last-child {
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}
	.step-number {
		font-size: 0.72rem;
		font-weight: 700;
		opacity: 0.75;
	}
	.step-hex {
		font-family: var(--font-mono);
		font-size: 0.68rem;
	}
	.code {
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
		font-size: 0.8rem;
		overflow-x: auto;
		margin: 0;
		line-height: 1.6;
	}
	td.good {
		color: var(--positive);
		font-weight: 600;
	}
</style>
