<script lang="ts">
	import { slugify } from '$lib/text/text';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ text: 'How to Convert 3 Tablespoons to Teaspoons — Café Edition!', separator: '-', lowercase: true, maxLength: 0 });

	const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'is', 'are']);
	let removeStopWords = $state(false);

	const slug = $derived.by(() => {
		let source = s.text;
		if (removeStopWords) {
			source = source
				.split(/\s+/)
				.filter((w) => !STOP_WORDS.has(w.toLowerCase().replace(/[^\p{L}]/gu, '')))
				.join(' ');
		}
		let out = slugify(source, s.separator);
		if (!s.lowercase) {
			// Re-derive with original casing preserved.
			out = source
				.normalize('NFD')
				.replace(/[̀-ͯ]/g, '')
				.replace(/[^\p{L}\p{N}]+/gu, s.separator)
				.replace(new RegExp(`\\${s.separator}+`, 'g'), s.separator)
				.replace(new RegExp(`^\\${s.separator}|\\${s.separator}$`, 'g'), '');
		}
		if (s.maxLength > 0 && out.length > s.maxLength) {
			out = out.slice(0, s.maxLength);
			const lastSep = out.lastIndexOf(s.separator);
			// Trim back to a word boundary rather than cutting mid-word.
			if (lastSep > s.maxLength * 0.6) out = out.slice(0, lastSep);
		}
		return out;
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field label="Title or text" for="sg-text">
			<input id="sg-text" type="text" bind:value={s.text} autocomplete="off" />
		</Field>

		<div class="field-row">
			<Field label="Separator" for="sg-sep">
				<select id="sg-sep" bind:value={s.separator}>
					<option value="-">Hyphen (-)</option>
					<option value="_">Underscore (_)</option>
					<option value=".">Dot (.)</option>
				</select>
			</Field>
			<Field label="Maximum length" for="sg-max" hint="0 for no limit">
				<input id="sg-max" type="number" min="0" max="200" bind:value={s.maxLength} />
			</Field>
			<div class="checks">
				<label class="check"><input type="checkbox" bind:checked={s.lowercase} /> Lowercase</label>
				<label class="check"><input type="checkbox" bind:checked={removeStopWords} /> Remove stop words</label>
			</div>
		</div>

		<Result label="Slug" primary value={slug || '—'} detail={`${slug.length} characters`} />

		<div class="results-grid">
			<Result label="Full URL preview" value={slug ? `https://example.com/${slug}` : '—'} />
			<Result label="Filename" value={slug ? `${slug}.html` : '—'} />
		</div>
	</div>

	{#snippet explainer()}
		<p>
			A slug is the human-readable part of a URL. Making one means stripping diacritics, dropping
			punctuation, and collapsing everything else to a single separator.
		</p>
		<h3>Why diacritics get stripped</h3>
		<p>
			“Café” becomes “cafe” by decomposing the character into a base letter plus a combining accent
			(Unicode NFD), then discarding the accent. URLs can technically carry Unicode via
			percent-encoding, but the encoded form is unreadable when copied and inconsistently handled by
			older systems.
		</p>
		<h3>Hyphens, not underscores</h3>
		<p>
			Google has stated for years that it treats hyphens as word separators and underscores as word
			joiners — so <code>blue-widgets</code> reads as two words and <code>blue_widgets</code> as one.
			Hyphens are the safer default for anything public.
		</p>
		<h3>Keep them stable</h3>
		<p>
			Changing a slug breaks every existing link to that page. If you must change one, put a
			permanent redirect in place. Short is good, but stable is better.
		</p>
	{/snippet}
</ToolShell>

<style>
	.checks {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		justify-content: flex-end;
		padding-bottom: 0.4rem;
	}
</style>
