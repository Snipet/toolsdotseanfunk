<script lang="ts">
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let text = $state('The rain in SPAIN stays mainly in the plain.\nThe rain is wet.');
	let find = $state('rain');
	let replace = $state('snow');
	let useRegex = $state(false);
	let caseSensitive = $state(true);
	let wholeWord = $state(false);

	const pattern = $derived.by(() => {
		if (!find) return null;
		try {
			let source = useRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			if (wholeWord) source = `\\b(?:${source})\\b`;
			return new RegExp(source, caseSensitive ? 'g' : 'gi');
		} catch {
			return null;
		}
	});

	const invalidRegex = $derived(useRegex && Boolean(find) && pattern === null);

	const matches = $derived(pattern ? [...text.matchAll(pattern)] : []);

	const output = $derived.by(() => {
		if (!pattern) return text;
		try {
			return text.replace(pattern, replace);
		} catch {
			return text;
		}
	});

	/** Highlighted preview, built from match offsets so the source stays intact. */
	const preview = $derived.by(() => {
		if (!pattern || !matches.length) return [{ text, match: false }];
		const parts: Array<{ text: string; match: boolean }> = [];
		let cursor = 0;
		for (const m of matches) {
			const index = m.index ?? 0;
			if (index > cursor) parts.push({ text: text.slice(cursor, index), match: false });
			parts.push({ text: m[0], match: true });
			cursor = index + m[0].length;
		}
		if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
		return parts;
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Find" for="fr-find" error={invalidRegex ? 'Not a valid regular expression' : undefined}>
				<input id="fr-find" type="text" class="mono" bind:value={find} autocomplete="off" spellcheck="false" />
			</Field>
			<Field label="Replace with" for="fr-replace" hint={useRegex ? 'Use $1, $2 for capture groups' : undefined}>
				<input id="fr-replace" type="text" class="mono" bind:value={replace} autocomplete="off" spellcheck="false" />
			</Field>
		</div>

		<div class="checks">
			<label class="check"><input type="checkbox" bind:checked={useRegex} /> Regular expression</label>
			<label class="check"><input type="checkbox" bind:checked={caseSensitive} /> Case sensitive</label>
			<label class="check"><input type="checkbox" bind:checked={wholeWord} /> Whole words only</label>
		</div>

		<Result label="Matches" primary value={String(matches.length)} detail={matches.length ? 'Highlighted in the preview below' : 'No matches'} copyable={false} />
	</div>

	<div class="tool-card-grid">
		<div class="card">
			<label for="fr-text">Text</label>
			<textarea id="fr-text" bind:value={text} rows="12" spellcheck="false" class="mono"></textarea>
			<div class="preview" aria-hidden="true">
				{#each preview as part, i (i)}<span class:hit={part.match}>{part.text}</span>{/each}
			</div>
		</div>
		<div class="card">
			<div class="out-head">
				<label for="fr-out">Result</label>
				<CopyButton value={() => output} label="Copy" />
			</div>
			<textarea id="fr-out" value={output} rows="12" readonly spellcheck="false" class="mono"></textarea>
		</div>
	</div>

	{#if useRegex}
		<Note>
			Capture groups are available in the replacement as <code>$1</code>, <code>$2</code> and so on;
			<code>$&amp;</code> is the whole match. To insert a literal dollar sign, write <code>$$</code>.
		</Note>
	{/if}

	{#snippet explainer()}
		<p>
			In plain mode the search text is escaped, so characters like <code>.</code> and
			<code>(</code> match themselves rather than being treated as regular-expression syntax. Tick
			“regular expression” to use the full pattern language.
		</p>
		<h3>Whole words</h3>
		<p>
			The whole-word option wraps your pattern in word boundaries, so searching for “cat” will not
			match “catalogue”. A word boundary sits between a word character and a non-word character —
			which means it does not do what you want for terms containing hyphens or apostrophes.
		</p>
		<h3>Useful patterns</h3>
		<dl>
			<dt><code>\s+</code></dt><dd>Any run of whitespace — replace with a single space to normalise.</dd>
			<dt><code>^\s+|\s+$</code></dt><dd>Leading and trailing whitespace on each line (needs multiline in a full engine).</dd>
			<dt><code>(\w+)@(\w+)</code></dt><dd>Two capture groups, reusable as <code>$1</code> and <code>$2</code>.</dd>
			<dt><code>[^\x20-\x7E]</code></dt><dd>Anything outside printable ASCII — good for finding stray characters.</dd>
		</dl>
		<h3>Everything stays local</h3>
		<p>
			The replacement runs in your browser. Nothing is uploaded, which matters when the text you are
			cleaning up contains anything sensitive.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 260px;
		font-size: 0.88rem;
	}
	.checks {
		display: flex;
		gap: 1.25rem;
		flex-wrap: wrap;
	}
	.preview {
		margin-top: 0.6rem;
		padding: 0.6rem 0.7rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: 0.82rem;
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 160px;
		overflow-y: auto;
	}
	.hit {
		background: color-mix(in srgb, var(--accent) 35%, transparent);
		border-radius: 2px;
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
</style>
