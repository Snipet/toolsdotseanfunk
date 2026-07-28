<script lang="ts">
	import { loadImage, type LoadedImage } from '$lib/image/image';
	import { bytes } from '$lib/format';
	import Icon from './Icon.svelte';

	interface Props {
		image: LoadedImage | null;
		onload: (image: LoadedImage) => void;
		accept?: string;
	}

	let { image, onload, accept = 'image/*' }: Props = $props();

	let dragging = $state(false);
	let error = $state('');

	async function handle(file: File | undefined) {
		if (!file) return;
		error = '';
		try {
			onload(await loadImage(file));
		} catch {
			error = 'That file could not be read as an image.';
		}
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		void handle(event.dataTransfer?.files?.[0]);
	}

	function onPaste(event: ClipboardEvent) {
		const file = [...(event.clipboardData?.items ?? [])]
			.find((item) => item.type.startsWith('image/'))
			?.getAsFile();
		if (file) void handle(file);
	}
</script>

<svelte:window onpaste={onPaste} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="drop"
	class:dragging
	class:has-image={Boolean(image)}
	ondragover={(e) => {
		e.preventDefault();
		dragging = true;
	}}
	ondragleave={() => (dragging = false)}
	ondrop={onDrop}
>
	<label class="picker">
		<input type="file" {accept} onchange={(e) => handle(e.currentTarget.files?.[0])} class="visually-hidden" />
		<Icon name="download" size={22} />
		<span class="headline">
			{image ? 'Choose a different image' : 'Drop an image, paste, or click to choose'}
		</span>
		<span class="small muted">Processed entirely in your browser — never uploaded</span>
	</label>

	{#if image}
		<p class="meta small muted">
			<strong>{image.name}</strong> · {image.width} × {image.height} · {bytes(image.size)}
		</p>
	{/if}
	{#if error}
		<p class="error small">{error}</p>
	{/if}
</div>

<style>
	.drop {
		border: 2px dashed var(--border-strong);
		border-radius: var(--radius);
		background: var(--bg-sunken);
		padding: 1.5rem 1rem;
		text-align: center;
		transition: border-color 0.12s ease, background 0.12s ease;
	}
	.drop.dragging {
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.drop.has-image {
		padding: 1rem;
	}
	.picker {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		cursor: pointer;
		margin: 0;
	}
	.picker :global(svg) {
		color: var(--text-faint);
	}
	.headline {
		font-size: 0.95rem;
		font-weight: 550;
		color: var(--text);
	}
	.meta {
		margin-top: 0.7rem;
		padding-top: 0.7rem;
		border-top: 1px solid var(--border);
	}
	.error {
		color: var(--negative);
		margin-top: 0.5rem;
	}
</style>
