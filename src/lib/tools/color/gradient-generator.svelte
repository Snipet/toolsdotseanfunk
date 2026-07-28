<script lang="ts">
	import { parseColor, toHex } from '$lib/color/color';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ type: 'linear', angle: 135, shape: 'circle', stops: '#b8481f@0,#f0a35d@50,#2f6f43@100' });

	const stops = $derived(
		s.stops
			.split(',')
			.map((part) => {
				const [color, position] = part.split('@');
				return { color: color?.trim() ?? '#000000', position: Number(position ?? 0) };
			})
			.filter((stop) => parseColor(stop.color))
			.sort((a, b) => a.position - b.position)
	);

	const stopList = $derived(stops.map((stop) => `${stop.color} ${stop.position}%`).join(', '));

	const css = $derived(
		s.type === 'linear'
			? `linear-gradient(${s.angle}deg, ${stopList})`
			: s.type === 'radial'
				? `radial-gradient(${s.shape} at center, ${stopList})`
				: `conic-gradient(from ${s.angle}deg at center, ${stopList})`
	);

	function updateStop(index: number, changes: Partial<{ color: string; position: number }>) {
		const next = stops.map((stop, i) => (i === index ? { ...stop, ...changes } : stop));
		s.stops = next.map((stop) => `${stop.color}@${stop.position}`).join(',');
	}

	function addStop() {
		const next = [...stops, { color: '#888888', position: 100 }];
		s.stops = next.map((stop) => `${stop.color}@${stop.position}`).join(',');
	}

	function removeStop(index: number) {
		if (stops.length <= 2) return;
		s.stops = stops
			.filter((_, i) => i !== index)
			.map((stop) => `${stop.color}@${stop.position}`)
			.join(',');
	}

	const PRESETS = [
		{ name: 'Sunset', stops: '#ff512f@0,#f09819@100', angle: 135 },
		{ name: 'Ocean', stops: '#2193b0@0,#6dd5ed@100', angle: 135 },
		{ name: 'Ember', stops: '#b8481f@0,#f0a35d@50,#2f6f43@100', angle: 135 },
		{ name: 'Twilight', stops: '#0f2027@0,#203a43@50,#2c5364@100', angle: 160 },
		{ name: 'Peach', stops: '#ffecd2@0,#fcb69f@100', angle: 90 },
		{ name: 'Mono fade', stops: '#191917@0,#fbfbfa@100', angle: 180 }
	];
</script>

<ToolShell {tool}>
	<div class="preview card" style="background-image: {css}">
		<span class="preview-label">Preview</span>
	</div>

	<div class="card stack">
		<div class="field-row">
			<Field label="Type" for="gg-type">
				<select id="gg-type" bind:value={s.type}>
					<option value="linear">Linear</option>
					<option value="radial">Radial</option>
					<option value="conic">Conic</option>
				</select>
			</Field>
			{#if s.type === 'linear' || s.type === 'conic'}
				<Field label="Angle: {s.angle}°" for="gg-angle">
					<input id="gg-angle" type="range" min="0" max="360" bind:value={s.angle} />
				</Field>
			{:else}
				<Field label="Shape" for="gg-shape">
					<select id="gg-shape" bind:value={s.shape}>
						<option value="circle">Circle</option>
						<option value="ellipse">Ellipse</option>
					</select>
				</Field>
			{/if}
		</div>

		<div class="stops">
			{#each stops as stop, i (i)}
				<div class="stop">
					<input
						type="color"
						value={parseColor(stop.color) ? toHex(parseColor(stop.color)!) : '#000000'}
						oninput={(e) => updateStop(i, { color: e.currentTarget.value })}
						aria-label="Colour of stop {i + 1}"
					/>
					<input
						type="text"
						class="mono"
						value={stop.color}
						oninput={(e) => updateStop(i, { color: e.currentTarget.value })}
						aria-label="Hex of stop {i + 1}"
					/>
					<input
						type="range"
						min="0"
						max="100"
						value={stop.position}
						oninput={(e) => updateStop(i, { position: Number(e.currentTarget.value) })}
						aria-label="Position of stop {i + 1}"
					/>
					<span class="pos num">{stop.position}%</span>
					<button type="button" class="btn btn-sm btn-ghost" onclick={() => removeStop(i)} disabled={stops.length <= 2} aria-label="Remove stop {i + 1}">
						<Icon name="trash" size={15} />
					</button>
				</div>
			{/each}
		</div>

		<button type="button" class="btn btn-sm no-print" onclick={addStop}><Icon name="plus" size={15} /> Add stop</button>

		<div class="out-head">
			<label for="gg-css">CSS</label>
			<CopyButton value={() => `background-image: ${css};`} label="Copy CSS" />
		</div>
		<textarea id="gg-css" value={`background-image: ${css};`} rows="3" readonly spellcheck="false" class="mono"></textarea>
	</div>

	<section class="card">
		<h2>Presets</h2>
		<div class="presets">
			{#each PRESETS as preset (preset.name)}
				<button
					type="button"
					class="preset"
					style="background-image: linear-gradient({preset.angle}deg, {preset.stops.split(',').map((p) => p.split('@')[0] + ' ' + p.split('@')[1] + '%').join(', ')})"
					onclick={() => { s.stops = preset.stops; s.angle = preset.angle; }}
				>
					{preset.name}
				</button>
			{/each}
		</div>
	</section>

	<Note>
		CSS interpolates gradients in sRGB by default, which is why a red-to-green gradient passes through
		a muddy brown. Adding <code>in oklch</code> — <code>linear-gradient(in oklch, red, green)</code> —
		interpolates perceptually and keeps the midpoint vivid. Support is good in current browsers but
		not universal, so provide the plain version as a fallback.
	</Note>

	{#snippet explainer()}
		<p>
			A CSS gradient is generated by the browser at render time — no image file, no extra request,
			and it scales to any size without loss.
		</p>
		<h3>The three types</h3>
		<dl>
			<dt>linear-gradient</dt><dd>Colours progress along a line. 0° points up, 90° points right.</dd>
			<dt>radial-gradient</dt><dd>Colours radiate from a point. Good for spotlights and soft vignettes.</dd>
			<dt>conic-gradient</dt><dd>Colours sweep around a centre. This is how you build a pie chart or a colour wheel in pure CSS.</dd>
		</dl>
		<h3>Banding</h3>
		<p>
			Long, subtle gradients between similar colours often show visible steps, because 8 bits per
			channel is not enough resolution to fill a large area smoothly. Adding a faint noise overlay,
			or a third stop to shorten each transition, usually fixes it.
		</p>
		<h3>Hard stops</h3>
		<p>
			Two stops at the same position produce a hard edge rather than a blend — useful for stripes,
			progress bars and split backgrounds without any extra markup.
		</p>
	{/snippet}
</ToolShell>

<style>
	.preview {
		height: 220px;
		display: flex;
		align-items: flex-end;
		padding: 1rem;
		border-color: var(--border-strong);
	}
	.preview-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
		color: #fff;
		mix-blend-mode: difference;
	}
	.stops {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.stop {
		display: grid;
		grid-template-columns: 48px 110px 1fr 50px auto;
		gap: 0.5rem;
		align-items: center;
	}
	.pos {
		font-size: 0.82rem;
		text-align: right;
		color: var(--text-muted);
	}
	.out-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.3rem;
	}
	.out-head label {
		margin-bottom: 0;
	}
	textarea {
		min-height: 70px;
		font-size: 0.82rem;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.presets {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
	}
	.preset {
		height: 64px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: #fff;
		font-weight: 600;
		font-size: 0.85rem;
		text-shadow: 0 1px 3px rgb(0 0 0 / 0.5);
	}
	@media (max-width: 640px) {
		.stop {
			grid-template-columns: 48px 1fr auto;
		}
		.stop input[type='range'] {
			grid-column: 1 / -1;
		}
	}
</style>
