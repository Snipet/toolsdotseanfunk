<script lang="ts">
	import { canvasToBlob, compressToTarget, download, render, renameExtension, type LoadedImage } from '$lib/image/image';
	import { bytes, fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import ImageDrop from '$lib/components/ImageDrop.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let image = $state<LoadedImage | null>(null);
	let mode = $state<'quality' | 'target'>('quality');
	let quality = $state(0.8);
	let targetKb = $state(200);
	let format = $state('image/jpeg');
	let maxWidth = $state(0);
	let output = $state<{ url: string; size: number; quality: number } | null>(null);
	let originalUrl = $state('');
	let working = $state(false);
	let sliderPosition = $state(50);

	function onLoad(loaded: LoadedImage) {
		image = loaded;
		maxWidth = loaded.width;
		if (originalUrl) URL.revokeObjectURL(originalUrl);
		// Re-encode losslessly for the comparison pane so both sides render
		// from the same decoded pixels.
		const canvas = render(loaded.bitmap, { width: loaded.width, height: loaded.height });
		canvas.toBlob((blob) => {
			if (blob) originalUrl = URL.createObjectURL(blob);
		}, 'image/png');
	}

	$effect(() => {
		if (!image) return;
		const source = image;
		const m = mode;
		const q = quality;
		const target = targetKb * 1024;
		const type = format;
		const width = Math.min(maxWidth || source.width, source.width);
		let cancelled = false;
		working = true;

		(async () => {
			const height = Math.round((width / source.width) * source.height);
			const canvas = render(source.bitmap, {
				width,
				height,
				background: type === 'image/jpeg' ? '#ffffff' : undefined
			});

			let blob: Blob | null = null;
			let usedQuality = q;

			if (m === 'target') {
				const result = await compressToTarget(canvas, type, target);
				blob = result?.blob ?? null;
				usedQuality = result?.quality ?? 0;
			} else {
				blob = await canvasToBlob(canvas, type, q);
			}

			if (cancelled || !blob) return;
			if (output) URL.revokeObjectURL(output.url);
			output = { url: URL.createObjectURL(blob), size: blob.size, quality: usedQuality };
			working = false;
		})();

		return () => {
			cancelled = true;
		};
	});

	function save() {
		if (!image || !output) return;
		fetch(output.url)
			.then((r) => r.blob())
			.then((blob) => download(blob, renameExtension(image!.name, format.split('/')[1].replace('jpeg', 'jpg'))));
	}

	const saved = $derived(image && output ? 1 - output.size / image.size : 0);
	const missedTarget = $derived(mode === 'target' && output && output.size > targetKb * 1024);

	const TARGETS = [
		{ label: 'Discord (10 MB)', kb: 10240 },
		{ label: 'Email attachment (2 MB)', kb: 2048 },
		{ label: 'Web hero (500 KB)', kb: 500 },
		{ label: 'Web content (200 KB)', kb: 200 },
		{ label: 'Passport upload (100 KB)', kb: 100 },
		{ label: 'Thumbnail (50 KB)', kb: 50 }
	];
</script>

<ToolShell {tool}>
	<ImageDrop {image} onload={onLoad} />

	{#if image}
		<div class="card stack">
			<div class="row no-print">
				<button type="button" class="btn btn-sm" class:btn-primary={mode === 'quality'} onclick={() => (mode = 'quality')}>
					Set the quality
				</button>
				<button type="button" class="btn btn-sm" class:btn-primary={mode === 'target'} onclick={() => (mode = 'target')}>
					Hit a target file size
				</button>
			</div>

			<div class="field-row">
				{#if mode === 'quality'}
					<Field label="Quality: {Math.round(quality * 100)}%" for="cp-quality">
						<input id="cp-quality" type="range" min="0.1" max="1" step="0.02" bind:value={quality} />
					</Field>
				{:else}
					<Field label="Target size (KB)" for="cp-target">
						<input id="cp-target" type="number" min="5" max="20000" bind:value={targetKb} />
					</Field>
				{/if}
				<Field label="Format" for="cp-format">
					<select id="cp-format" bind:value={format}>
						<option value="image/jpeg">JPEG</option>
						<option value="image/webp">WebP — usually smaller</option>
					</select>
				</Field>
				<Field label="Maximum width (px)" for="cp-width" hint="Resizing is the biggest single saving">
					<input id="cp-width" type="number" min="50" max={image.width} bind:value={maxWidth} />
				</Field>
			</div>

			{#if mode === 'target'}
				<div class="row no-print">
					{#each TARGETS as target (target.label)}
						<button type="button" class="btn btn-sm" onclick={() => (targetKb = target.kb)}>{target.label}</button>
					{/each}
				</div>
			{/if}

			<div class="results-grid">
				<Result label="Original" value={bytes(image.size)} detail={`${image.width} × ${image.height}`} copyable={false} />
				<Result label="Compressed" primary value={output ? bytes(output.size) : working ? '…' : '—'} copyable={false} />
				<Result
					label="Saved"
					primary
					value={output ? `${fmtLoose(saved * 100, 1)}%` : '—'}
					tone={saved > 0 ? 'positive' : 'warning'}
					detail={output ? `${bytes(Math.max(0, image.size - output.size))} smaller` : undefined}
					copyable={false}
				/>
				{#if mode === 'target' && output}
					<Result label="Quality used" value={`${Math.round(output.quality * 100)}%`} detail="Found by binary search" copyable={false} />
				{/if}
			</div>

			{#if missedTarget}
				<Note tone="warning">
					Even at the lowest quality this image will not fit under {targetKb} KB at
					{maxWidth} px wide. Reduce the maximum width — halving the dimensions cuts the pixel count
					to a quarter, which does far more than quality ever will.
				</Note>
			{/if}

			<button type="button" class="btn btn-primary" onclick={save} disabled={!output}>
				<Icon name="download" size={16} /> Download compressed image
			</button>
		</div>

		{#if output && originalUrl}
			<section class="card">
				<h2>Before and after</h2>
				<p class="small muted">Drag the slider to compare.</p>
				<div class="compare" style="--position: {sliderPosition}%">
					<img src={originalUrl} alt="Original" class="layer" />
					<div class="clipped"><img src={output.url} alt="Compressed" class="layer" /></div>
					<div class="divider"></div>
					<label class="visually-hidden" for="cp-slider">Comparison position</label>
					<input id="cp-slider" type="range" min="0" max="100" bind:value={sliderPosition} class="slider" />
				</div>
				<div class="compare-labels small muted">
					<span>Original — {bytes(image.size)}</span>
					<span>Compressed — {bytes(output.size)}</span>
				</div>
			</section>
		{/if}
	{/if}

	{#snippet explainer()}
		<p>
			Compression happens on a canvas in your browser using the built-in JPEG and WebP encoders. The
			file is never uploaded.
		</p>
		<h3>Resolution beats quality</h3>
		<p>
			File size scales with the number of pixels, so halving the width and height quarters the pixel
			count — a far larger saving than any quality setting, and usually with less visible damage. If
			an image is displayed at 800 px wide, storing it at 4000 px is pure waste.
		</p>
		<h3>Where the quality slider actually matters</h3>
		<p>
			Between 100% and about 85% the difference is invisible in most photographs while the file
			shrinks dramatically. Below roughly 60% you start seeing blocking around edges and banding in
			smooth gradients. 80% is a reliable default.
		</p>
		<h3>Hitting a target size</h3>
		<p>
			There is no formula from quality to bytes — it depends entirely on the image content. This tool
			binary-searches the quality setting, encoding twelve times to converge just under your target.
			Flat graphics compress enormously; noisy photographs and film grain barely compress at all.
		</p>
		<h3>Do not re-compress repeatedly</h3>
		<p>
			Each JPEG save discards a little more. Always compress from the original rather than from a
			previously compressed copy, or the artefacts compound.
		</p>
	{/snippet}
</ToolShell>

<style>
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.3rem;
	}
	.compare {
		position: relative;
		margin-top: 0.75rem;
		border-radius: var(--radius-sm);
		overflow: hidden;
		border: 1px solid var(--border);
		background: var(--bg-sunken);
	}
	.layer {
		display: block;
		width: 100%;
		max-height: 520px;
		object-fit: contain;
	}
	.clipped {
		position: absolute;
		inset: 0;
		width: var(--position);
		overflow: hidden;
	}
	.clipped .layer {
		width: 100vw;
		max-width: none;
		height: 100%;
		object-fit: contain;
		object-position: left center;
	}
	.divider {
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--position);
		width: 2px;
		background: var(--accent);
		pointer-events: none;
	}
	.slider {
		position: absolute;
		inset: auto 0 0 0;
		width: 100%;
		margin: 0;
		opacity: 0.001;
		height: 100%;
		top: 0;
		cursor: ew-resize;
	}
	.compare-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 0.4rem;
	}
</style>
