<script lang="ts">
	import { parseColor, rgbToCmyk, rgbToHsl, rgbToHsv, toHex, readableOn, luminance } from '$lib/color/color';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ value: '#b8481f' });

	const rgb = $derived(parseColor(s.value));
	const valid = $derived(rgb !== null);

	const hsl = $derived(rgb ? rgbToHsl(rgb) : null);
	const hsv = $derived(rgb ? rgbToHsv(rgb) : null);
	const cmyk = $derived(rgb ? rgbToCmyk(rgb) : null);

	const formats = $derived(
		rgb && hsl && hsv && cmyk
			? [
					{ name: 'HEX', value: toHex(rgb) },
					{ name: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
					{ name: 'RGB (modern)', value: `rgb(${rgb.r} ${rgb.g} ${rgb.b})` },
					{ name: 'HSL', value: `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)` },
					{ name: 'HSV / HSB', value: `hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)` },
					{ name: 'CMYK', value: `cmyk(${Math.round(cmyk.c)}%, ${Math.round(cmyk.m)}%, ${Math.round(cmyk.y)}%, ${Math.round(cmyk.k)}%)` },
					{ name: 'Integer', value: String((rgb.r << 16) | (rgb.g << 8) | rgb.b) },
					{ name: 'Android', value: `0xFF${toHex(rgb).slice(1).toUpperCase()}` },
					{ name: 'Swift', value: `UIColor(red: ${fmtLoose(rgb.r / 255, 3)}, green: ${fmtLoose(rgb.g / 255, 3)}, blue: ${fmtLoose(rgb.b / 255, 3)}, alpha: 1)` }
				]
			: []
	);

	// Sliders drive the same state, so typing and dragging stay in sync.
	function setChannel(channel: 'r' | 'g' | 'b', value: number) {
		if (!rgb) return;
		s.value = toHex({ ...rgb, [channel]: value });
	}
	function setHsl(key: 'h' | 's' | 'l', value: number) {
		if (!hsl) return;
		const next = { ...hsl, [key]: value };
		const converted = parseColor(`hsl(${next.h}, ${next.s}%, ${next.l}%)`);
		if (converted) s.value = toHex(converted);
	}
</script>

<ToolShell {tool}>
	<div class="layout">
		<div class="card stack">
			<div class="field-row">
				<Field label="Colour" for="cc-value" error={s.value && !valid ? 'Not a recognised colour' : undefined}>
					<input id="cc-value" type="text" class="mono" bind:value={s.value} autocomplete="off" spellcheck="false" />
				</Field>
				<Field label="Picker" for="cc-picker">
					<input id="cc-picker" type="color" value={rgb ? toHex(rgb) : '#000000'} oninput={(e) => (s.value = e.currentTarget.value)} />
				</Field>
			</div>

			{#if rgb && hsl}
				<div class="sliders">
					<div class="slider">
						<label for="cc-r">Red {rgb.r}</label>
						<input id="cc-r" type="range" min="0" max="255" value={rgb.r} oninput={(e) => setChannel('r', Number(e.currentTarget.value))} />
					</div>
					<div class="slider">
						<label for="cc-g">Green {rgb.g}</label>
						<input id="cc-g" type="range" min="0" max="255" value={rgb.g} oninput={(e) => setChannel('g', Number(e.currentTarget.value))} />
					</div>
					<div class="slider">
						<label for="cc-b">Blue {rgb.b}</label>
						<input id="cc-b" type="range" min="0" max="255" value={rgb.b} oninput={(e) => setChannel('b', Number(e.currentTarget.value))} />
					</div>
					<div class="slider">
						<label for="cc-h">Hue {Math.round(hsl.h)}°</label>
						<input id="cc-h" type="range" min="0" max="360" value={Math.round(hsl.h)} oninput={(e) => setHsl('h', Number(e.currentTarget.value))} />
					</div>
					<div class="slider">
						<label for="cc-s">Saturation {Math.round(hsl.s)}%</label>
						<input id="cc-s" type="range" min="0" max="100" value={Math.round(hsl.s)} oninput={(e) => setHsl('s', Number(e.currentTarget.value))} />
					</div>
					<div class="slider">
						<label for="cc-l">Lightness {Math.round(hsl.l)}%</label>
						<input id="cc-l" type="range" min="0" max="100" value={Math.round(hsl.l)} oninput={(e) => setHsl('l', Number(e.currentTarget.value))} />
					</div>
				</div>
			{/if}
		</div>

		<div class="swatch-card card" style="background: {rgb ? toHex(rgb) : 'var(--bg-sunken)'}; color: {rgb ? readableOn(rgb) : 'var(--text)'}">
			<span class="swatch-hex">{rgb ? toHex(rgb).toUpperCase() : '—'}</span>
			{#if rgb}
				<span class="swatch-meta">Relative luminance {fmtLoose(luminance(rgb), 4)}</span>
			{/if}
		</div>
	</div>

	<div class="results-grid">
		{#each formats as format (format.name)}
			<Result label={format.name} value={format.value} />
		{/each}
	</div>

	{#snippet explainer()}
		<p>
			Every format here describes the same colour; they differ in what they make easy to reason
			about.
		</p>
		<dl>
			<dt>RGB / HEX</dt><dd>How screens actually work — additive mixing of red, green and blue light. Hex is just RGB in base 16.</dd>
			<dt>HSL</dt><dd>Hue, saturation, lightness. Designed for humans: change lightness and you get the same colour, lighter. This is why design-system ramps are generated in HSL.</dd>
			<dt>HSV / HSB</dt><dd>Similar but with brightness instead of lightness — full brightness plus full saturation gives the pure hue rather than white. It is what most colour pickers use internally.</dd>
			<dt>CMYK</dt><dd>Subtractive, for print. Ink absorbs light rather than emitting it, which is why the model is inverted and why bright screen colours cannot be printed.</dd>
		</dl>
		<h3>CMYK conversion is only an approximation</h3>
		<p>
			A true conversion needs an ICC profile describing the specific paper, ink and press. The naive
			formula used here is fine for a rough idea and wrong for production printing — if the colour
			matters, get a proof.
		</p>
		<h3>Relative luminance</h3>
		<p>
			Luminance is not the same as lightness. It weights green far more heavily than blue, because
			human vision is most sensitive in the green part of the spectrum. That weighting is what drives
			WCAG contrast ratios, and why yellow text on white is unreadable while blue text on white is
			fine.
		</p>
	{/snippet}
</ToolShell>

<style>
	.layout {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
		align-items: stretch;
	}
	.swatch-card {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		gap: 0.2rem;
		min-height: 200px;
		border-color: var(--border-strong);
	}
	.swatch-hex {
		font-family: var(--font-mono);
		font-size: 1.5rem;
		font-weight: 650;
	}
	.swatch-meta {
		font-size: 0.8rem;
		opacity: 0.8;
	}
	.sliders {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: 1fr 1fr;
	}
	.slider label {
		margin-bottom: 0.1rem;
		font-size: 0.78rem;
	}
	@media (max-width: 760px) {
		.layout {
			grid-template-columns: 1fr;
		}
		.sliders {
			grid-template-columns: 1fr;
		}
	}
</style>
