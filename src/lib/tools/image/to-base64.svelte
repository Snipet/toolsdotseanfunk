<script lang="ts">
	import { bytes, fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	let file = $state<{ name: string; type: string; size: number; base64: string } | null>(null);
	let dragging = $state(false);
	let error = $state('');

	async function handle(input: File | undefined) {
		if (!input) return;
		error = '';
		if (!input.type.startsWith('image/')) {
			error = 'That file is not an image.';
			return;
		}
		const buffer = await input.arrayBuffer();
		const view = new Uint8Array(buffer);
		let binary = '';
		// Chunked so a large file does not exceed the call-argument limit.
		for (let i = 0; i < view.length; i += 8192) {
			binary += String.fromCharCode(...view.subarray(i, i + 8192));
		}
		file = { name: input.name, type: input.type, size: input.size, base64: btoa(binary) };
	}

	const dataUri = $derived(file ? `data:${file.type};base64,${file.base64}` : '');
	const overhead = $derived(file ? file.base64.length / file.size - 1 : 0);

	const snippets = $derived(
		file
			? [
					{ name: 'Data URI', value: dataUri },
					{ name: 'HTML', value: `<img src="${dataUri}" alt="" />` },
					{ name: 'CSS', value: `background-image: url("${dataUri}");` },
					{ name: 'Markdown', value: `![alt](${dataUri})` },
					{ name: 'JSON', value: JSON.stringify({ image: dataUri }) }
				]
			: []
	);
</script>

<ToolShell {tool}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="drop"
		class:dragging
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={(e) => {
			e.preventDefault();
			dragging = false;
			void handle(e.dataTransfer?.files?.[0]);
		}}
	>
		<label class="picker">
			<input type="file" accept="image/*" onchange={(e) => handle(e.currentTarget.files?.[0])} class="visually-hidden" />
			<Icon name="download" size={22} />
			<span class="headline">{file ? 'Choose a different image' : 'Drop an image or click to choose'}</span>
			<span class="small muted">Encoded in your browser — never uploaded</span>
		</label>
		{#if error}<p class="error small">{error}</p>{/if}
	</div>

	{#if file}
		<div class="results-grid">
			<Result label="File" value={file.name} detail={file.type} copyable={false} />
			<Result label="Original size" value={bytes(file.size)} copyable={false} />
			<Result label="Base64 size" primary value={bytes(file.base64.length)} detail={`${fmtLoose(overhead * 100, 1)}% larger`} tone="warning" copyable={false} />
			<Result label="Data URI length" value={dataUri.length.toLocaleString('en-US') + ' chars'} copyable={false} />
		</div>

		<section class="card">
			<h2>Preview</h2>
			<img src={dataUri} alt="Encoded preview" class="preview" />
		</section>

		{#each snippets as snippet (snippet.name)}
			<section class="card">
				<div class="head">
					<h2>{snippet.name}</h2>
					<CopyButton value={snippet.value} label="Copy" />
				</div>
				<textarea value={snippet.value} rows="3" readonly spellcheck="false" class="mono" aria-label="{snippet.name} output"></textarea>
			</section>
		{/each}

		{#if file.size > 30 * 1024}
			<Note tone="warning">
				At {bytes(file.size)} this is on the large side for inlining. Data URIs cannot be cached
				separately from the document that contains them, so a big one is re-downloaded on every page
				load and bloats your HTML or CSS. Below about 5–10 KB inlining usually wins; above that a
				normal file request usually does.
			</Note>
		{/if}
	{/if}

	{#snippet explainer()}
		<p>
			A data URI embeds a file directly in a document — no separate HTTP request, no external
			dependency. The bytes are Base64-encoded so they survive in a text context.
		</p>
		<code class="formula">data:[mediatype][;base64],[data]</code>
		<h3>The 33% overhead</h3>
		<p>
			Base64 turns every three bytes into four characters, so an encoded image is always about a
			third larger than the file it came from. Gzip recovers some of that on the wire, but not all.
		</p>
		<h3>When inlining is worth it</h3>
		<ul>
			<li><strong>Small icons and SVGs</strong> — saving a round trip beats the size penalty.</li>
			<li><strong>Email HTML</strong> — many clients block external images but render inline ones.</li>
			<li><strong>Single-file deliverables</strong> — a self-contained HTML page with no asset folder.</li>
			<li><strong>Avoiding a flash</strong> — a tiny inline placeholder that renders before the real image arrives.</li>
		</ul>
		<h3>When it is not</h3>
		<p>
			Anything cacheable, anything large, and anything that could be lazy-loaded. An inline image is
			part of the document, so it blocks that document's parse and is re-sent every time the document
			changes. For SVG specifically, inlining the markup directly is better than Base64 — it is
			smaller and can be styled with CSS.
		</p>
	{/snippet}
</ToolShell>

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
	.error {
		color: var(--negative);
		margin-top: 0.5rem;
	}
	h2 {
		font-size: 1rem;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}
	.preview {
		max-width: 100%;
		max-height: 360px;
		margin-top: 0.7rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: repeating-conic-gradient(var(--bg-sunken) 0% 25%, var(--bg-raised) 0% 50%) 50% / 20px 20px;
	}
	textarea {
		font-size: 0.78rem;
		min-height: 80px;
		word-break: break-all;
	}
</style>
