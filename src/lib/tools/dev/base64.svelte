<script lang="ts">
	import { bytes } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let mode = $state<'encode' | 'decode'>('encode');
	let text = $state('The Everything Toolbox — free, fast, private.');
	let urlSafe = $state(false);
	let fileResult = $state<{ name: string; size: number; base64: string; type: string } | null>(null);

	/** btoa() only handles Latin-1, so encode through UTF-8 bytes first. */
	function encode(value: string): string {
		const utf8 = new TextEncoder().encode(value);
		let binary = '';
		for (const byte of utf8) binary += String.fromCharCode(byte);
		const b64 = btoa(binary);
		return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
	}

	function decode(value: string): { ok: true; text: string } | { ok: false; error: string } {
		try {
			let normalised = value.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
			// Restore the padding the URL-safe variant strips.
			while (normalised.length % 4) normalised += '=';
			const binary = atob(normalised);
			const codes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
			return { ok: true, text: new TextDecoder('utf-8', { fatal: false }).decode(codes) };
		} catch {
			return { ok: false, error: 'Not valid Base64 — check for stray characters.' };
		}
	}

	const result = $derived.by(() => {
		if (!text.trim()) return { ok: true as const, value: '' };
		if (mode === 'encode') return { ok: true as const, value: encode(text) };
		const decoded = decode(text);
		return decoded.ok ? { ok: true as const, value: decoded.text } : { ok: false as const, error: decoded.error };
	});

	const inputBytes = $derived(new Blob([text]).size);
	const outputBytes = $derived(result.ok ? new Blob([result.value]).size : 0);

	async function onFile(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const buffer = await file.arrayBuffer();
		const view = new Uint8Array(buffer);
		let binary = '';
		// Chunked to avoid blowing the argument limit on String.fromCharCode.
		for (let i = 0; i < view.length; i += 8192) {
			binary += String.fromCharCode(...view.subarray(i, i + 8192));
		}
		fileResult = { name: file.name, size: file.size, base64: btoa(binary), type: file.type || 'application/octet-stream' };
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={mode === 'encode'} onclick={() => (mode = 'encode')}>Encode</button>
			<button type="button" class="btn btn-sm" class:btn-primary={mode === 'decode'} onclick={() => (mode = 'decode')}>Decode</button>
			<label class="check"><input type="checkbox" bind:checked={urlSafe} /> URL-safe alphabet</label>
			<button type="button" class="btn btn-sm" onclick={() => { if (result.ok) { text = result.value; mode = mode === 'encode' ? 'decode' : 'encode'; } }}>
				Swap
			</button>
		</div>

		<Field label={mode === 'encode' ? 'Plain text' : 'Base64'} for="b64-input">
			<textarea id="b64-input" bind:value={text} rows="6" spellcheck="false" class="mono"></textarea>
		</Field>

		{#if !result.ok}
			<Note tone="warning">{result.error}</Note>
		{:else}
			<div class="out-head">
				<label for="b64-output">{mode === 'encode' ? 'Base64' : 'Decoded text'}</label>
				<CopyButton value={() => (result.ok ? result.value : '')} label="Copy" />
			</div>
			<textarea id="b64-output" value={result.value} rows="6" readonly spellcheck="false" class="mono"></textarea>

			<div class="results-grid">
				<Result label="Input size" value={bytes(inputBytes)} copyable={false} />
				<Result label="Output size" value={bytes(outputBytes)} detail={inputBytes ? `${Math.round((outputBytes / inputBytes - 1) * 100)}% ${outputBytes > inputBytes ? 'larger' : 'smaller'}` : undefined} copyable={false} />
			</div>
		{/if}
	</div>

	<section class="card stack">
		<h2>Encode a file</h2>
		<p class="small muted">The file is read locally — it is never uploaded.</p>
		<input type="file" onchange={onFile} aria-label="Choose a file to encode" />

		{#if fileResult}
			<div class="results-grid">
				<Result label="File" value={fileResult.name} copyable={false} />
				<Result label="Size" value={bytes(fileResult.size)} detail={`${bytes(fileResult.base64.length)} as Base64`} copyable={false} />
			</div>
			<div class="out-head">
				<label for="b64-file">Data URI</label>
				<CopyButton value={() => `data:${fileResult?.type};base64,${fileResult?.base64}`} label="Copy data URI" />
			</div>
			<textarea id="b64-file" value={`data:${fileResult.type};base64,${fileResult.base64}`} rows="4" readonly spellcheck="false" class="mono"></textarea>
			{#if fileResult.type.startsWith('image/')}
				<img class="preview" src={`data:${fileResult.type};base64,${fileResult.base64}`} alt="Preview of the encoded file" />
			{/if}
		{/if}
	</section>

	{#snippet explainer()}
		<p>
			Base64 represents arbitrary binary data using 64 printable ASCII characters, so it can travel
			through channels that only handle text — email bodies, JSON payloads, URLs, HTML attributes.
		</p>
		<h3>How it works</h3>
		<p>
			Three bytes (24 bits) are regrouped into four 6-bit values, each mapped to one character of
			<code>A–Z a–z 0–9 + /</code>. When the input is not a multiple of three, <code>=</code> pads the
			output. That 3-to-4 ratio is why Base64 is always about 33% larger than the original.
		</p>
		<h3>It is encoding, not encryption</h3>
		<p>
			Anyone can decode it instantly — this page just did. Base64 in an HTTP Basic auth header or a
			JWT payload provides no confidentiality at all. If it needs to be secret, it needs to be
			encrypted.
		</p>
		<h3>The URL-safe variant</h3>
		<p>
			<code>+</code> and <code>/</code> have meaning in URLs and filenames, so RFC 4648 defines a
			variant using <code>-</code> and <code>_</code> instead, usually with the padding stripped. JWTs
			use it. Decoding here accepts either, restoring the padding automatically.
		</p>
		<h3>Unicode</h3>
		<p>
			The browser's <code>btoa</code> throws on any character above U+00FF, which is why naive
			implementations break on emoji and accented text. This encodes to UTF-8 bytes first, so
			anything you can type works.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 130px;
		font-size: 0.85rem;
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
	.preview {
		max-height: 220px;
		width: auto;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
	}
	h2 {
		font-size: 1.05rem;
	}
</style>
