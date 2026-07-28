<script lang="ts">
	import { canvasToBlob, download, render, renameExtension, type LoadedImage } from '$lib/image/image';
	import { bytes } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import ImageDrop from '$lib/components/ImageDrop.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	let image = $state<LoadedImage | null>(null);
	let x = $state(0);
	let y = $state(0);
	let w = $state(0);
	let h = $state(0);
	let ratioLock = $state('free');
	let preview = $state('');
	let originalUrl = $state('');
	let format = $state('image/png');

	const PRESETS = [
		{ label: 'Free', value: 'free', ratio: 0 },
		{ label: 'Square 1:1', value: '1:1', ratio: 1 },
		{ label: 'Landscape 16:9', value: '16:9', ratio: 16 / 9 },
		{ label: 'Portrait 9:16', value: '9:16', ratio: 9 / 16 },
		{ label: 'Photo 4:3', value: '4:3', ratio: 4 / 3 },
		{ label: 'Photo 3:2', value: '3:2', ratio: 3 / 2 },
		{ label: 'Passport 2×2 in', value: '2x2', ratio: 1 },
		{ label: 'OG image 1.91:1', value: 'og', ratio: 1.91 }
	];

	const activeRatio = $derived(PRESETS.find((p) => p.value === ratioLock)?.ratio ?? 0);

	function onLoad(loaded: LoadedImage) {
		image = loaded;
		x = 0;
		y = 0;
		w = loaded.width;
		h = loaded.height;
		format = loaded.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';

		// Render the full image once for the selection overlay to sit on top of.
		if (originalUrl) URL.revokeObjectURL(originalUrl);
		const canvas = render(loaded.bitmap, { width: loaded.width, height: loaded.height });
		canvas.toBlob((blob) => {
			if (blob) originalUrl = URL.createObjectURL(blob);
		}, 'image/png');
	}

	/** Keep the crop rectangle inside the image and on the locked ratio. */
	function normalise() {
		if (!image) return;
		w = Math.max(1, Math.min(w, image.width));
		h = Math.max(1, Math.min(h, image.height));
		if (activeRatio > 0) {
			h = Math.round(w / activeRatio);
			if (h > image.height) {
				h = image.height;
				w = Math.round(h * activeRatio);
			}
		}
		x = Math.max(0, Math.min(x, image.width - w));
		y = Math.max(0, Math.min(y, image.height - h));
	}

	$effect(() => {
		void ratioLock;
		normalise();
	});

	$effect(() => {
		if (!image) return;
		const source = image;
		const rect = { x, y, w, h };
		const type = format;
		let cancelled = false;

		(async () => {
			const canvas = render(source.bitmap, {
				width: rect.w,
				height: rect.h,
				sx: rect.x,
				sy: rect.y,
				sw: rect.w,
				sh: rect.h,
				background: type === 'image/jpeg' ? '#ffffff' : undefined
			});
			const blob = await canvasToBlob(canvas, type, 0.92);
			if (cancelled || !blob) return;
			if (preview) URL.revokeObjectURL(preview);
			preview = URL.createObjectURL(blob);
		})();

		return () => {
			cancelled = true;
		};
	});

	function centre() {
		if (!image) return;
		x = Math.round((image.width - w) / 2);
		y = Math.round((image.height - h) / 2);
	}

	function maximise() {
		if (!image) return;
		if (activeRatio > 0) {
			const imageRatio = image.width / image.height;
			if (imageRatio > activeRatio) {
				h = image.height;
				w = Math.round(h * activeRatio);
			} else {
				w = image.width;
				h = Math.round(w / activeRatio);
			}
		} else {
			w = image.width;
			h = image.height;
		}
		centre();
	}

	async function save() {
		if (!image) return;
		const canvas = render(image.bitmap, {
			width: w,
			height: h,
			sx: x,
			sy: y,
			sw: w,
			sh: h,
			background: format === 'image/jpeg' ? '#ffffff' : undefined
		});
		const blob = await canvasToBlob(canvas, format, 0.92);
		if (blob) download(blob, renameExtension(image.name, format.split('/')[1].replace('jpeg', 'jpg')));
	}
</script>

<ToolShell {tool}>
	<ImageDrop {image} onload={onLoad} />

	{#if image}
		<div class="card stack">
			<Field label="Aspect ratio" for="cr-ratio">
				<select id="cr-ratio" bind:value={ratioLock}>
					{#each PRESETS as preset (preset.value)}<option value={preset.value}>{preset.label}</option>{/each}
				</select>
			</Field>

			<div class="field-row">
				<Field label="X offset" for="cr-x">
					<input id="cr-x" type="number" min="0" max={image.width - 1} bind:value={x} onchange={normalise} />
				</Field>
				<Field label="Y offset" for="cr-y">
					<input id="cr-y" type="number" min="0" max={image.height - 1} bind:value={y} onchange={normalise} />
				</Field>
				<Field label="Width" for="cr-w">
					<input id="cr-w" type="number" min="1" max={image.width} bind:value={w} onchange={normalise} />
				</Field>
				<Field label="Height" for="cr-h">
					<input id="cr-h" type="number" min="1" max={image.height} bind:value={h} onchange={normalise} disabled={activeRatio > 0} />
				</Field>
			</div>

			<div class="row no-print">
				<button type="button" class="btn btn-sm" onclick={centre}>Centre</button>
				<button type="button" class="btn btn-sm" onclick={maximise}>Fill the frame</button>
				<Field label="Format" for="cr-format">
					<select id="cr-format" bind:value={format}>
						<option value="image/png">PNG</option>
						<option value="image/jpeg">JPEG</option>
						<option value="image/webp">WebP</option>
					</select>
				</Field>
			</div>

			{#if originalUrl}
				<div class="frame">
					<img src={originalUrl} alt="Source with the crop area highlighted" class="source" />
					<div
						class="selection"
						style="left: {(x / image.width) * 100}%; top: {(y / image.height) * 100}%; width: {(w / image.width) * 100}%; height: {(h / image.height) * 100}%"
					></div>
				</div>
			{/if}

			<div class="results-grid">
				<Result label="Crop size" primary value={`${w} × ${h}`} copyable={false} />
				<Result label="Aspect ratio" value={(w / h).toFixed(3)} copyable={false} />
				<Result label="Original" value={`${image.width} × ${image.height}`} detail={bytes(image.size)} copyable={false} />
			</div>

			<button type="button" class="btn btn-primary" onclick={save}>
				<Icon name="download" size={16} /> Download crop
			</button>
		</div>

		{#if preview}
			<section class="card">
				<h2>Result</h2>
				<img src={preview} alt="Cropped result" class="result-img" />
			</section>
		{/if}
	{/if}

	{#snippet explainer()}
		<p>
			Cropping selects a rectangle from the source pixels and discards the rest. Because it copies
			existing pixels rather than resampling them, there is no quality loss at all — the crop is
			exactly as sharp as the original.
		</p>
		<h3>Ratio presets</h3>
		<dl>
			<dt>1:1</dt><dd>Avatars, Instagram grid posts, app icons.</dd>
			<dt>16:9</dt><dd>Video thumbnails, presentation slides, most screens.</dd>
			<dt>9:16</dt><dd>Stories, Reels, TikTok — full-screen vertical.</dd>
			<dt>1.91:1</dt><dd>Open Graph and Twitter cards. Getting this wrong means your link preview is cropped by the platform, usually badly.</dd>
			<dt>2×2 inches</dt><dd>US passport photographs. Note that the printed size and DPI matter as much as the ratio.</dd>
		</dl>
		<h3>Crop before you resize</h3>
		<p>
			Cropping first means the resize works from only the pixels you are keeping, so the subject gets
			the full output resolution rather than sharing it with the parts you were about to throw away.
		</p>
	{/snippet}
</ToolShell>

<style>
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.frame {
		position: relative;
		width: fit-content;
		max-width: 100%;
		margin: 0 auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		overflow: hidden;
		line-height: 0;
	}
	.source {
		display: block;
		max-width: 100%;
		max-height: 440px;
		width: auto;
	}
	.selection {
		position: absolute;
		border: 2px solid var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.35);
	}
	.result-img {
		max-width: 100%;
		max-height: 520px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: repeating-conic-gradient(var(--bg-sunken) 0% 25%, var(--bg-raised) 0% 50%) 50% / 20px 20px;
	}
</style>
