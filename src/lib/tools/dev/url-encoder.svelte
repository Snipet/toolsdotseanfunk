<script lang="ts">
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let text = $state('https://tools.seanfunk.com/search?q=3 tbsp to tsp&lang=en#results');
	let mode = $state<'component' | 'uri'>('component');

	const encoded = $derived.by(() => {
		try {
			return mode === 'component' ? encodeURIComponent(text) : encodeURI(text);
		} catch {
			return '';
		}
	});

	const decoded = $derived.by(() => {
		try {
			return decodeURIComponent(text.replace(/\+/g, ' '));
		} catch {
			return null;
		}
	});

	const parsed = $derived.by(() => {
		try {
			const url = new URL(text.trim());
			return {
				url,
				params: [...url.searchParams.entries()]
			};
		} catch {
			return null;
		}
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<label for="ue-input">URL or text</label>
		<textarea id="ue-input" bind:value={text} rows="3" spellcheck="false" class="mono"></textarea>

		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={mode === 'component'} onclick={() => (mode = 'component')}>
				encodeURIComponent
			</button>
			<button type="button" class="btn btn-sm" class:btn-primary={mode === 'uri'} onclick={() => (mode = 'uri')}>
				encodeURI
			</button>
		</div>

		<div class="out">
			<div class="out-head">
				<label for="ue-enc">Encoded</label>
				<CopyButton value={() => encoded} label="Copy" />
			</div>
			<textarea id="ue-enc" value={encoded} rows="3" readonly spellcheck="false" class="mono"></textarea>
		</div>

		<div class="out">
			<div class="out-head">
				<label for="ue-dec">Decoded</label>
				<CopyButton value={() => decoded ?? ''} label="Copy" />
			</div>
			<textarea id="ue-dec" value={decoded ?? 'Malformed percent-encoding'} rows="3" readonly spellcheck="false" class="mono"></textarea>
		</div>
	</div>

	{#if parsed}
		<section class="card">
			<h2>URL parts</h2>
			<div class="results-grid">
				<Result label="Protocol" value={parsed.url.protocol} />
				<Result label="Host" value={parsed.url.host} />
				<Result label="Path" value={parsed.url.pathname} />
				{#if parsed.url.port}<Result label="Port" value={parsed.url.port} />{/if}
				{#if parsed.url.hash}<Result label="Fragment" value={parsed.url.hash} />{/if}
			</div>

			{#if parsed.params.length}
				<h3 class="sub">Query parameters</h3>
				<div class="scroll-x">
					<table class="data">
						<thead><tr><th>Key</th><th>Value</th></tr></thead>
						<tbody>
							{#each parsed.params as [key, value] (key + value)}
								<tr><td class="mono">{key}</td><td class="mono">{value}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/if}

	<Note>
		<strong>encodeURIComponent</strong> escapes <code>/ ? : @ &amp; = + $ #</code> and is what you
		want for a single query value. <strong>encodeURI</strong> leaves those alone because they are
		structural, so it is for escaping a whole URL that already has its parts in place.
	</Note>

	{#snippet explainer()}
		<p>
			Percent-encoding replaces unsafe bytes with <code>%</code> followed by two hex digits. A space
			becomes <code>%20</code>, and a character outside ASCII becomes several escapes — one per UTF-8
			byte, which is why <code>é</code> is <code>%C3%A9</code>.
		</p>
		<h3>The plus-sign problem</h3>
		<p>
			In <code>application/x-www-form-urlencoded</code> — HTML form submissions — a space is encoded
			as <code>+</code>, not <code>%20</code>. Elsewhere in a URL, <code>+</code> is a literal plus.
			This is why a search for “C++” sometimes arrives as “C  ”. The decoder above treats
			<code>+</code> as a space, matching form behaviour.
		</p>
		<h3>Reserved versus unreserved</h3>
		<p>
			RFC 3986 leaves <code>A–Z a–z 0–9 - . _ ~</code> unescaped everywhere. Everything else is
			either reserved with structural meaning or must be escaped. Encoding an already-encoded string
			double-escapes it: <code>%20</code> becomes <code>%2520</code>, a bug that is easy to create
			and hard to spot.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 80px;
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
	.sub {
		margin-top: 1.25rem;
		margin-bottom: 0.5rem;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.75rem;
	}
</style>
