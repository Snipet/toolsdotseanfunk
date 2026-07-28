<script lang="ts">
	import { gcd } from '$lib/format';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ w: 1920, h: 1080, newW: 1280, lock: 'width' });

	const ratio = $derived(s.h > 0 ? s.w / s.h : NaN);
	const divisor = $derived(gcd(Math.round(s.w), Math.round(s.h)) || 1);
	const simplified = $derived(`${Math.round(s.w) / divisor} : ${Math.round(s.h) / divisor}`);

	const newHeight = $derived(Math.round(s.newW / ratio));

	const NAMED: Array<{ name: string; w: number; h: number; use: string }> = [
		{ name: '16:9', w: 16, h: 9, use: 'HD video, most monitors and phones' },
		{ name: '16:10', w: 16, h: 10, use: 'Many laptops and productivity displays' },
		{ name: '4:3', w: 4, h: 3, use: 'Older screens, iPad, many projectors' },
		{ name: '3:2', w: 3, h: 2, use: '35 mm photography, Surface devices' },
		{ name: '21:9', w: 21, h: 9, use: 'Ultrawide monitors' },
		{ name: '1:1', w: 1, h: 1, use: 'Square — Instagram, avatars' },
		{ name: '9:16', w: 9, h: 16, use: 'Vertical video — Reels, TikTok, Stories' },
		{ name: '2.39:1', w: 239, h: 100, use: 'Anamorphic widescreen cinema' },
		{ name: '5:4', w: 5, h: 4, use: '1280×1024 displays' }
	];

	const closest = $derived.by(() => {
		if (!Number.isFinite(ratio)) return null;
		return NAMED.map((item) => ({ ...item, diff: Math.abs(item.w / item.h - ratio) })).sort(
			(a, b) => a.diff - b.diff
		)[0];
	});

	const COMMON_SIZES = [
		{ label: '4K UHD', w: 3840, h: 2160 },
		{ label: '1440p', w: 2560, h: 1440 },
		{ label: '1080p', w: 1920, h: 1080 },
		{ label: '720p', w: 1280, h: 720 },
		{ label: 'Instagram square', w: 1080, h: 1080 },
		{ label: 'Instagram story', w: 1080, h: 1920 },
		{ label: 'Open Graph image', w: 1200, h: 630 },
		{ label: 'YouTube thumbnail', w: 1280, h: 720 }
	];

	const scaled = $derived(
		[0.25, 0.5, 0.75, 1.5, 2].map((factor) => ({
			factor,
			w: Math.round(s.w * factor),
			h: Math.round(s.h * factor)
		}))
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Width" for="ar-w"><input id="ar-w" type="number" min="1" bind:value={s.w} /></Field>
			<Field label="Height" for="ar-h"><input id="ar-h" type="number" min="1" bind:value={s.h} /></Field>
		</div>

		<div class="results-grid">
			<Result label="Aspect ratio" primary value={simplified} detail={closest && closest.diff > 0.001 ? `Closest standard: ${closest.name}` : closest ? `Exactly ${closest.name}` : undefined} />
			<Result label="Decimal" value={fmtLoose(ratio, 5)} detail={`${fmtLoose(ratio, 2)} : 1`} />
			<Result label="Megapixels" value={fmtLoose((s.w * s.h) / 1e6, 2)} />
			<Result label="Orientation" value={ratio > 1 ? 'Landscape' : ratio < 1 ? 'Portrait' : 'Square'} />
		</div>

		<div class="preview">
			<div class="box" style="aspect-ratio: {Math.max(0.1, Math.min(10, ratio))}">
				<span>{s.w} × {s.h}</span>
			</div>
		</div>
	</div>

	<section class="card stack">
		<h2>Resize keeping this ratio</h2>
		<div class="field-row">
			<Field label="New width" for="ar-new"><input id="ar-new" type="number" min="1" bind:value={s.newW} /></Field>
			<Result label="Matching height" primary value={Number.isFinite(newHeight) ? String(newHeight) : '—'} />
			<Result label="Result" value={`${s.newW} × ${newHeight}`} />
		</div>

		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Scale</th><th class="num">Width</th><th class="num">Height</th></tr></thead>
				<tbody>
					{#each scaled as row (row.factor)}
						<tr>
							<td>{row.factor}×</td>
							<td class="num">{row.w}</td>
							<td class="num">{row.h}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="card">
		<h2>Standard ratios</h2>
		<div class="ratios">
			{#each NAMED as item (item.name)}
				<button type="button" class="ratio" class:active={closest?.name === item.name} onclick={() => { s.w = item.w * 120; s.h = item.h * 120; }}>
					<span class="ratio-name">{item.name}</span>
					<span class="ratio-use small muted">{item.use}</span>
				</button>
			{/each}
		</div>
	</section>

	<section class="card">
		<h2>Common sizes</h2>
		<div class="sizes">
			{#each COMMON_SIZES as size (size.label)}
				<button type="button" class="btn btn-sm" onclick={() => { s.w = size.w; s.h = size.h; }}>
					{size.label} — {size.w}×{size.h}
				</button>
			{/each}
		</div>
	</section>

	{#snippet explainer()}
		<p>
			An aspect ratio is width divided by height, expressed in the smallest whole numbers that give
			the same quotient. 1920 ÷ 1080 simplifies to 16 : 9 by dividing both by their greatest common
			divisor, 120.
		</p>
		<code class="formula">new height = new width × (height ÷ width)</code>
		<h3>Why 16:9 won</h3>
		<p>
			It is the geometric mean of the two formats television had to serve when the standard was set:
			4:3 broadcast and 2.35:1 cinema. Choosing the middle minimises the total wasted area when
			letterboxing or pillarboxing either one.
		</p>
		<h3>Cropping versus stretching</h3>
		<p>
			Changing the aspect ratio of existing content means either cropping (losing edges) or
			distorting (everyone gets wider). Fitting content into a different ratio without either means
			adding bars. There is no fourth option.
		</p>
		<h3>Vertical video is not a mistake</h3>
		<p>
			9:16 exists because phones are held upright. For anything intended primarily for a phone
			screen, vertical uses the full display rather than a third of it.
		</p>
	{/snippet}
</ToolShell>

<style>
	.preview {
		display: flex;
		justify-content: center;
		padding: 0.5rem 0;
	}
	.box {
		max-width: 100%;
		max-height: 220px;
		width: min(420px, 100%);
		border: 2px dashed var(--accent);
		border-radius: var(--radius-sm);
		background: var(--accent-soft);
		display: grid;
		place-items: center;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--accent);
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.ratios {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	}
	.ratio {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.1rem;
		padding: 0.55rem 0.7rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
	}
	.ratio:hover {
		border-color: var(--accent-border);
	}
	.ratio.active {
		background: var(--accent-soft);
		border-color: var(--accent-border);
	}
	.ratio-name {
		font-weight: 650;
	}
	.sizes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
</style>
