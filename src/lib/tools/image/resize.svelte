<script lang="ts">
	import { canvasToBlob, download, render, renameExtension, type LoadedImage } from '$lib/image/image';
	import { bytes, fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import ImageDrop from '$lib/components/ImageDrop.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	let image = $state<LoadedImage | null>(null);
	let width = $state(0);
	let height = $state(0);
	let lockRatio = $state(true);
	let percent = $state(100);
	let format = $state('image/png');
	let quality = $state(0.9);
	let preview = $state('');
	let outputSize = $state(0);

	const ratio = $derived(image ? image.width / image.height : 1);

	function onLoad(loaded: LoadedImage) {
		image = loaded;
		width = loaded.width;
		height = loaded.height;
		percent = 100;
		format = loaded.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
	}

	function setWidth(value: number) {
		width = Math.max(1, Math.round(value));
		if (lockRatio) height = Math.max(1, Math.round(width / ratio));
		if (image) percent = Math.round((width / image.width) * 100);
	}
	function setHeight(value: number) {
		height = Math.max(1, Math.round(value));
		if (lockRatio) width = Math.max(1, Math.round(height * ratio));
		if (image) percent = Math.round((height / image.height) * 100);
	}
	function setPercent(value: number) {
		percent = value;
		if (!image) return;
		width = Math.max(1, Math.round((image.width * value) / 100));
		height = Math.max(1, Math.round((image.height * value) / 100));
	}

	// Re-render whenever anything that affects the output changes.
	$effect(() => {
		if (!image) return;
		const w = width;
		const h = height;
		const type = format;
		const q = quality;
		let cancelled = false;

		(async () => {
			const canvas = render(image.bitmap, {
				width: w,
				height: h,
				background: type === 'image/jpeg' ? '#ffffff' : undefined
			});
			const blob = await canvasToBlob(canvas, type, type === 'image/png' ? undefined : q);
			if (cancelled || !blob) return;
			if (preview) URL.revokeObjectURL(preview);
			preview = URL.createObjectURL(blob);
			outputSize = blob.size;
		})();

		return () => {
			cancelled = true;
		};
	});

	async function save() {
		if (!image) return;
		const canvas = render(image.bitmap, {
			width,
			height,
			background: format === 'image/jpeg' ? '#ffffff' : undefined
		});
		const blob = await canvasToBlob(canvas, format, format === 'image/png' ? undefined : quality);
		if (!blob) return;
		const extension = format.split('/')[1].replace('jpeg', 'jpg');
		download(blob, renameExtension(image.name, extension));
	}

	const PRESETS = [
		{ label: 'Full HD width', width: 1920 },
		{ label: 'HD width', width: 1280 },
		{ label: 'Web content', width: 800 },
		{ label: 'Thumbnail', width: 400 },
		{ label: 'Avatar', width: 200 }
	];
</script>

<ToolShell {tool}>
	<ImageDrop {image} onload={onLoad} />

	{#if image}
		<div class="card stack">
			<div class="field-row">
				<Field label="Width (px)" for="rs-w">
					<input id="rs-w" type="number" min="1" max="20000" value={width} oninput={(e) => setWidth(Number(e.currentTarget.value))} />
				</Field>
				<Field label="Height (px)" for="rs-h">
					<input id="rs-h" type="number" min="1" max="20000" value={height} oninput={(e) => setHeight(Number(e.currentTarget.value))} />
				</Field>
				<Field label="Scale: {percent}%" for="rs-pct">
					<input id="rs-pct" type="range" min="1" max="200" value={percent} oninput={(e) => setPercent(Number(e.currentTarget.value))} />
				</Field>
			</div>

			<div class="row">
				<label class="check"><input type="checkbox" bind:checked={lockRatio} /> Lock aspect ratio</label>
				{#each PRESETS as preset (preset.label)}
					<button type="button" class="btn btn-sm" onclick={() => setWidth(preset.width)}>{preset.label}</button>
				{/each}
			</div>

			<div class="field-row">
				<Field label="Output format" for="rs-format">
					<select id="rs-format" bind:value={format}>
						<option value="image/png">PNG — lossless, supports transparency</option>
						<option value="image/jpeg">JPEG — smaller, no transparency</option>
						<option value="image/webp">WebP — smaller still, wide support</option>
					</select>
				</Field>
				{#if format !== 'image/png'}
					<Field label="Quality: {Math.round(quality * 100)}%" for="rs-quality">
						<input id="rs-quality" type="range" min="0.1" max="1" step="0.05" bind:value={quality} />
					</Field>
				{/if}
			</div>

			<div class="results-grid">
				<Result label="Original" value={`${image.width} × ${image.height}`} detail={bytes(image.size)} copyable={false} />
				<Result label="New size" primary value={`${width} × ${height}`} detail={outputSize ? bytes(outputSize) : '…'} copyable={false} />
				<Result
					label="File size change"
					value={outputSize ? `${outputSize < image.size ? '−' : '+'}${fmtLoose(Math.abs(1 - outputSize / image.size) * 100, 1)}%` : '…'}
					tone={outputSize && outputSize < image.size ? 'positive' : 'neutral'}
					copyable={false}
				/>
				<Result label="Megapixels" value={fmtLoose((width * height) / 1e6, 2)} copyable={false} />
			</div>

			<button type="button" class="btn btn-primary" onclick={save}>
				<Icon name="download" size={16} /> Download resized image
			</button>
		</div>

		{#if preview}
			<section class="card">
				<h2>Preview</h2>
				<img src={preview} alt="Resized preview" class="preview" />
			</section>
		{/if}

		{#if width > image.width || height > image.height}
			<Note tone="warning">
				You are enlarging beyond the original resolution. The browser will interpolate, which adds
				pixels but no detail — the result will look soft. Scaling up rarely improves anything.
			</Note>
		{/if}
	{/if}

	{#snippet explainer()}
		<p>
			Resizing happens on an HTML canvas in this tab. The file is read with
			<code>createImageBitmap</code>, drawn at the new dimensions, and re-encoded. It is never sent
			anywhere — there is no server to send it to.
		</p>
		<h3>Downscaling versus upscaling</h3>
		<p>
			Downscaling discards information and generally looks fine. Upscaling has to invent pixels; the
			browser interpolates between neighbours, which produces a blurry approximation. No amount of
			resizing recovers detail that was never captured.
		</p>
		<h3>Choosing a format</h3>
		<dl>
			<dt>PNG</dt><dd>Lossless with transparency. Best for screenshots, logos and line art. Large for photographs.</dd>
			<dt>JPEG</dt><dd>Lossy, no transparency, excellent for photographs. Quality 80–90% is usually indistinguishable from the original at a fraction of the size.</dd>
			<dt>WebP</dt><dd>Typically 25–35% smaller than JPEG at the same visual quality, with transparency support. Supported by every current browser.</dd>
		</dl>
		<h3>Re-encoding a JPEG loses a little each time</h3>
		<p>
			JPEG compression is lossy and generational: opening and re-saving repeatedly accumulates
			artefacts. Resize from the original wherever possible rather than from a previously exported
			copy.
		</p>
		<h3>Transparency and JPEG</h3>
		<p>
			JPEG has no alpha channel, so transparent areas are filled with white before encoding.
			Choosing JPEG for an image with transparency is a one-way change.
		</p>
	{/snippet}
</ToolShell>

<style>
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.preview {
		max-width: 100%;
		max-height: 520px;
		width: auto;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: repeating-conic-gradient(var(--bg-sunken) 0% 25%, var(--bg-raised) 0% 50%) 50% / 20px 20px;
	}
</style>
