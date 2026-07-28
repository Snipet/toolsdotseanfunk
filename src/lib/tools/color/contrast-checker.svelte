<script lang="ts">
	import { parseColor, rgbToHsl, hslToRgb, toHex, wcag, contrastRatio } from '$lib/color/color';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ fg: '#6b6b65', bg: '#fbfbfa' });

	const foreground = $derived(parseColor(s.fg));
	const background = $derived(parseColor(s.bg));
	const valid = $derived(foreground !== null && background !== null);

	const result = $derived(valid ? wcag(foreground!, background!) : null);

	/**
	 * Nudge the foreground's lightness until it clears the target ratio,
	 * moving away from the background so the hue is preserved.
	 */
	function suggest(target: number): string | null {
		if (!foreground || !background) return null;
		const bgLuminanceHigh = rgbToHsl(background).l > 50;
		const hsl = rgbToHsl(foreground);
		for (let step = 0; step <= 100; step++) {
			const l = bgLuminanceHigh ? hsl.l - step : hsl.l + step;
			if (l < 0 || l > 100) break;
			const candidate = hslToRgb({ ...hsl, l });
			if (contrastRatio(candidate, background) >= target) return toHex(candidate);
		}
		return null;
	}

	const suggestionAA = $derived(result && !result.normalAA ? suggest(4.5) : null);
	const suggestionAAA = $derived(result && !result.normalAAA ? suggest(7) : null);

	const PAIRS = [
		{ label: 'Body text', fg: '#191917', bg: '#fbfbfa' },
		{ label: 'Muted text', fg: '#6b6b65', bg: '#fbfbfa' },
		{ label: 'Accent on white', fg: '#b8481f', bg: '#ffffff' },
		{ label: 'White on accent', fg: '#ffffff', bg: '#b8481f' },
		{ label: 'Dark mode body', fg: '#ececef', bg: '#16161a' }
	];

	function swap() {
		[s.fg, s.bg] = [s.bg, s.fg];
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Text colour" for="ct-fg">
				<div class="color-input">
					<input type="color" value={foreground ? toHex(foreground) : '#000000'} oninput={(e) => (s.fg = e.currentTarget.value)} aria-label="Pick text colour" />
					<input id="ct-fg" type="text" class="mono" bind:value={s.fg} autocomplete="off" spellcheck="false" />
				</div>
			</Field>
			<Field label="Background colour" for="ct-bg">
				<div class="color-input">
					<input type="color" value={background ? toHex(background) : '#ffffff'} oninput={(e) => (s.bg = e.currentTarget.value)} aria-label="Pick background colour" />
					<input id="ct-bg" type="text" class="mono" bind:value={s.bg} autocomplete="off" spellcheck="false" />
				</div>
			</Field>
			<div class="swap-wrap">
				<button type="button" class="btn" onclick={swap}>Swap</button>
			</div>
		</div>

		{#if result && foreground && background}
			<Result
				label="Contrast ratio"
				primary
				value={`${fmtLoose(result.ratio, 2)} : 1`}
				tone={result.normalAAA ? 'positive' : result.normalAA ? 'positive' : result.largeAA ? 'warning' : 'negative'}
				detail={result.normalAAA ? 'Passes everything' : result.normalAA ? 'Passes AA for all text sizes' : result.largeAA ? 'Large text only' : 'Fails at every level'}
			/>

			<div class="preview" style="background: {toHex(background)}; color: {toHex(foreground)}">
				<p class="big">Large text — 24px or 18.66px bold</p>
				<p class="normal">Normal body text at 16 pixels. The quick brown fox jumps over the lazy dog, and this sentence exists so you can judge readability at a realistic length rather than from two words.</p>
				<p class="small-text">Small print at 13 pixels, which is where contrast problems bite hardest.</p>
			</div>

			<div class="scroll-x">
				<table class="data">
					<thead><tr><th>Requirement</th><th>Needs</th><th class="num">Result</th></tr></thead>
					<tbody>
						<tr class:pass={result.normalAA} class:fail={!result.normalAA}>
							<td>AA — normal text</td><td class="num">4.5 : 1</td><td class="num">{result.normalAA ? 'Pass' : 'Fail'}</td>
						</tr>
						<tr class:pass={result.normalAAA} class:fail={!result.normalAAA}>
							<td>AAA — normal text</td><td class="num">7 : 1</td><td class="num">{result.normalAAA ? 'Pass' : 'Fail'}</td>
						</tr>
						<tr class:pass={result.largeAA} class:fail={!result.largeAA}>
							<td>AA — large text</td><td class="num">3 : 1</td><td class="num">{result.largeAA ? 'Pass' : 'Fail'}</td>
						</tr>
						<tr class:pass={result.largeAAA} class:fail={!result.largeAAA}>
							<td>AAA — large text</td><td class="num">4.5 : 1</td><td class="num">{result.largeAAA ? 'Pass' : 'Fail'}</td>
						</tr>
						<tr class:pass={result.uiAA} class:fail={!result.uiAA}>
							<td>AA — UI components and graphics</td><td class="num">3 : 1</td><td class="num">{result.uiAA ? 'Pass' : 'Fail'}</td>
						</tr>
					</tbody>
				</table>
			</div>

			{#if suggestionAA || suggestionAAA}
				<Note>
					<strong>Suggested fixes</strong> — same hue and saturation, adjusted lightness:
					{#if suggestionAA}
						<button type="button" class="suggest" style="background: {suggestionAA}" onclick={() => (s.fg = suggestionAA)}>
							{suggestionAA} for AA
						</button>
					{/if}
					{#if suggestionAAA}
						<button type="button" class="suggest" style="background: {suggestionAAA}" onclick={() => (s.fg = suggestionAAA)}>
							{suggestionAAA} for AAA
						</button>
					{/if}
				</Note>
			{/if}
		{:else}
			<Note tone="warning">Enter two valid colours.</Note>
		{/if}
	</div>

	<section class="card">
		<h2>Try these pairs</h2>
		<div class="pairs">
			{#each PAIRS as pair (pair.label)}
				<button type="button" class="pair" onclick={() => { s.fg = pair.fg; s.bg = pair.bg; }} style="background: {pair.bg}; color: {pair.fg}">
					<span>{pair.label}</span>
					<span class="ratio">{fmtLoose(contrastRatio(parseColor(pair.fg)!, parseColor(pair.bg)!), 1)}:1</span>
				</button>
			{/each}
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Contrast ratio compares the relative luminance of two colours. It runs from 1:1 (identical) to
			21:1 (pure black on pure white).
		</p>
		<code class="formula">ratio = (L₁ + 0.05) / (L₂ + 0.05)

L = 0.2126 R + 0.7152 G + 0.0722 B  (after gamma correction)</code>
		<h3>What counts as large text</h3>
		<p>
			WCAG defines large as 18pt (24px) or larger, or 14pt (18.66px) bold. Larger glyphs have thicker
			strokes, so they stay legible at a lower ratio — which is why the threshold drops from 4.5:1 to
			3:1.
		</p>
		<h3>It is not only about text</h3>
		<p>
			WCAG 2.1 added a 3:1 requirement for user-interface components and meaningful graphics — the
			border of an input, the bar of a chart, an icon that conveys information. Low-contrast form
			borders are one of the most common accessibility failures on modern sites.
		</p>
		<h3>The green weighting</h3>
		<p>
			Green contributes 71% of perceived luminance, red 21% and blue 7%. That is why yellow (red plus
			green, so very bright) is nearly invisible on white, while pure blue on white passes AAA
			despite looking dark.
		</p>
		<h3>The formula has known flaws</h3>
		<p>
			WCAG 2.x contrast is a simple ratio that does not model how the eye actually behaves — it is
			notably unreliable for dark backgrounds, often passing pairs that are hard to read and failing
			pairs that are fine. APCA, developed for WCAG 3, addresses this but is not yet a standard. For
			compliance today, WCAG 2 is what is tested against.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Thresholds and the luminance formula are from <strong>WCAG 2.2</strong>, success criteria
			1.4.3 (Contrast Minimum), 1.4.6 (Contrast Enhanced) and 1.4.11 (Non-text Contrast).
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
	.swap-wrap {
		display: flex;
		align-items: flex-end;
		padding-bottom: 0.25rem;
	}
	.preview {
		padding: 1.25rem;
		border-radius: var(--radius);
		border: 1px solid var(--border);
	}
	.preview p + p {
		margin-top: 0.6rem;
	}
	.big {
		font-size: 24px;
		font-weight: 600;
	}
	.normal {
		font-size: 16px;
	}
	.small-text {
		font-size: 13px;
	}
	tr.pass td:last-child {
		color: var(--positive);
		font-weight: 600;
	}
	tr.fail td:last-child {
		color: var(--negative);
		font-weight: 600;
	}
	.suggest {
		display: inline-block;
		margin: 0.35rem 0.35rem 0 0;
		padding: 0.25rem 0.6rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		color: #fff;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		cursor: pointer;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.pairs {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
	}
	.pair {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2rem;
		padding: 0.7rem 0.85rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		font-size: 0.88rem;
	}
	.ratio {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		opacity: 0.75;
	}
</style>
