<script lang="ts">
	import { canvasToBlob, download, render, renameExtension, type LoadedImage } from '$lib/image/image';
	import { bytes, fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import ImageDrop from '$lib/components/ImageDrop.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const FORMATS = [
		{ type: 'image/png', label: 'PNG', extension: 'png', lossy: false },
		{ type: 'image/jpeg', label: 'JPEG', extension: 'jpg', lossy: true },
		{ type: 'image/webp', label: 'WebP', extension: 'webp', lossy: true }
	];

	let image = $state<LoadedImage | null>(null);
	let quality = $state(0.9);
	let background = $state('#ffffff');
	let results = $state<Array<{ label: string; type: string; extension: string; size: number; url: string }>>([]);
	let working = $state(false);

	function onLoad(loaded: LoadedImage) {
		image = loaded;
		results = [];
	}

	// Encode into every format so the sizes can be compared side by side.
	$effect(() => {
		if (!image) return;
		const source = image;
		const q = quality;
		const bg = background;
		let cancelled = false;
		working = true;

		(async () => {
			const out: typeof results = [];
			for (const format of FORMATS) {
				const canvas = render(source.bitmap, {
					width: source.width,
					height: source.height,
					background: format.type === 'image/jpeg' ? bg : undefined
				});
				const blob = await canvasToBlob(canvas, format.type, format.lossy ? q : undefined);
				if (!blob) continue;
				out.push({
					label: format.label,
					type: format.type,
					extension: format.extension,
					size: blob.size,
					url: URL.createObjectURL(blob)
				});
			}
			if (cancelled) {
				out.forEach((r) => URL.revokeObjectURL(r.url));
				return;
			}
			results.forEach((r) => URL.revokeObjectURL(r.url));
			results = out;
			working = false;
		})();

		return () => {
			cancelled = true;
		};
	});

	async function save(entry: (typeof results)[number]) {
		if (!image) return;
		const blob = await fetch(entry.url).then((r) => r.blob());
		download(blob, renameExtension(image.name, entry.extension));
	}

	const smallest = $derived(results.length ? results.reduce((a, b) => (a.size < b.size ? a : b)) : null);
</script>

<ToolShell {tool}>
	<ImageDrop {image} onload={onLoad} />

	{#if image}
		<div class="card stack">
			<div class="field-row">
				<Field label="Quality for lossy formats: {Math.round(quality * 100)}%" for="ic-quality">
					<input id="ic-quality" type="range" min="0.1" max="1" step="0.05" bind:value={quality} />
				</Field>
				<Field label="Background behind transparency" for="ic-bg" hint="JPEG has no alpha channel">
					<input id="ic-bg" type="color" bind:value={background} />
				</Field>
			</div>
		</div>

		<div class="formats">
			{#each results as entry (entry.type)}
				<div class="format card" class:best={smallest?.type === entry.type}>
					<div class="format-head">
						<h2>{entry.label}</h2>
						{#if smallest?.type === entry.type}<span class="badge">Smallest</span>{/if}
					</div>
					<img src={entry.url} alt="{entry.label} preview" class="thumb" />
					<div class="format-meta">
						<span class="size">{bytes(entry.size)}</span>
						<span class="small muted">
							{entry.size < image.size ? '−' : '+'}{fmtLoose(Math.abs(1 - entry.size / image.size) * 100, 1)}% vs original
						</span>
					</div>
					<button type="button" class="btn btn-sm" onclick={() => save(entry)}>
						<Icon name="download" size={14} /> Download .{entry.extension}
					</button>
				</div>
			{/each}
		</div>

		{#if working}<p class="small muted">Encoding…</p>{/if}

		<Result label="Original" value={`${image.type} · ${image.width} × ${image.height}`} detail={bytes(image.size)} copyable={false} />
	{/if}

	<Note>
		HEIC and AVIF input depend on your browser's decoder. Safari opens HEIC natively; Chrome and
		Firefox generally do not, so an iPhone photo may fail to load there. Everything that does load is
		converted locally.
	</Note>

	{#snippet explainer()}
		<p>
			Conversion decodes the image to raw pixels and re-encodes it in the target format. Because it
			runs on a canvas in your browser, the file never leaves your device.
		</p>
		<h3>Which format when</h3>
		<dl>
			<dt>PNG</dt><dd>Lossless, alpha channel, best for screenshots, UI, logos and anything with sharp edges or flat colour. Poor at photographs.</dd>
			<dt>JPEG</dt><dd>Lossy, tuned for photographs, no transparency. Still the most universally supported format anywhere.</dd>
			<dt>WebP</dt><dd>Typically 25–35% smaller than JPEG at equivalent quality, with alpha and animation. Supported everywhere current.</dd>
		</dl>
		<h3>Converting a JPEG to PNG will not improve it</h3>
		<p>
			The compression artefacts are already baked into the pixels. PNG will store them losslessly and
			produce a much larger file for no visual gain. Lossless formats preserve what they are given;
			they cannot restore what was discarded.
		</p>
		<h3>Metadata is dropped</h3>
		<p>
			Canvas re-encoding discards EXIF, including GPS coordinates, camera model and timestamps. That
			is a privacy win for anything you are about to publish — and worth knowing if you were relying
			on that data being there.
		</p>
	{/snippet}
</ToolShell>

<style>
	.formats {
		display: grid;
		gap: 0.7rem;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}
	.format {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.format.best {
		border-color: var(--positive);
	}
	.format-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	h2 {
		font-size: 1rem;
	}
	.badge {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 700;
		color: var(--positive);
	}
	.thumb {
		width: 100%;
		height: 150px;
		object-fit: contain;
		background: repeating-conic-gradient(var(--bg-sunken) 0% 25%, var(--bg-raised) 0% 50%) 50% / 16px 16px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
	}
	.format-meta {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.size {
		font-weight: 650;
		font-variant-numeric: tabular-nums;
	}
</style>
