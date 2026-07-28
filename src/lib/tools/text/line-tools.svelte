<script lang="ts">
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	let text = $state('banana\napple\ncherry\napple\ndate\nBanana\n\nelderberry');

	let sort = $state('none');
	let dedupe = $state(false);
	let caseInsensitive = $state(false);
	let trim = $state(true);
	let removeEmpty = $state(false);
	let reverse = $state(false);
	let numbering = $state(false);
	let prefix = $state('');
	let suffix = $state('');

	const output = $derived.by(() => {
		let lines = text.split('\n');

		if (trim) lines = lines.map((l) => l.trim());
		if (removeEmpty) lines = lines.filter((l) => l.length > 0);

		if (dedupe) {
			const seen = new Set<string>();
			lines = lines.filter((l) => {
				const key = caseInsensitive ? l.toLowerCase() : l;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
		}

		const compare = (a: string, b: string) =>
			caseInsensitive ? a.toLowerCase().localeCompare(b.toLowerCase()) : a.localeCompare(b);

		if (sort === 'asc') lines = [...lines].sort(compare);
		else if (sort === 'desc') lines = [...lines].sort((a, b) => compare(b, a));
		else if (sort === 'length') lines = [...lines].sort((a, b) => a.length - b.length);
		else if (sort === 'numeric') lines = [...lines].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
		else if (sort === 'random') {
			lines = [...lines];
			// Fisher-Yates seeded from the crypto RNG, so shuffles are unbiased.
			for (let i = lines.length - 1; i > 0; i--) {
				const j = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * (i + 1));
				[lines[i], lines[j]] = [lines[j], lines[i]];
			}
		}

		if (reverse) lines = [...lines].reverse();
		if (prefix || suffix) lines = lines.map((l) => `${prefix}${l}${suffix}`);
		if (numbering) {
			const width = String(lines.length).length;
			lines = lines.map((l, i) => `${String(i + 1).padStart(width, ' ')}. ${l}`);
		}

		return lines.join('\n');
	});

	const inputCount = $derived(text.split('\n').length);
	const outputCount = $derived(output ? output.split('\n').length : 0);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Sort" for="lt-sort">
				<select id="lt-sort" bind:value={sort}>
					<option value="none">Keep original order</option>
					<option value="asc">A → Z</option>
					<option value="desc">Z → A</option>
					<option value="length">Shortest first</option>
					<option value="numeric">Numerically</option>
					<option value="random">Randomly</option>
				</select>
			</Field>
			<Field label="Prefix each line" for="lt-prefix"><input id="lt-prefix" type="text" bind:value={prefix} placeholder="e.g. - " /></Field>
			<Field label="Suffix each line" for="lt-suffix"><input id="lt-suffix" type="text" bind:value={suffix} placeholder="e.g. ," /></Field>
		</div>

		<div class="checks">
			<label class="check"><input type="checkbox" bind:checked={dedupe} /> Remove duplicates</label>
			<label class="check"><input type="checkbox" bind:checked={caseInsensitive} /> Ignore case</label>
			<label class="check"><input type="checkbox" bind:checked={trim} /> Trim whitespace</label>
			<label class="check"><input type="checkbox" bind:checked={removeEmpty} /> Remove empty lines</label>
			<label class="check"><input type="checkbox" bind:checked={reverse} /> Reverse order</label>
			<label class="check"><input type="checkbox" bind:checked={numbering} /> Add line numbers</label>
		</div>
	</div>

	<div class="tool-card-grid">
		<div class="card">
			<label for="lt-input">Input — {inputCount} lines</label>
			<textarea id="lt-input" bind:value={text} rows="14" spellcheck="false" class="mono"></textarea>
		</div>
		<div class="card">
			<div class="out-head">
				<label for="lt-output">Output — {outputCount} lines</label>
				<CopyButton value={() => output} label="Copy" />
			</div>
			<textarea id="lt-output" value={output} rows="14" readonly spellcheck="false" class="mono"></textarea>
		</div>
	</div>

	{#snippet explainer()}
		<p>
			Operations apply in a fixed order — trim, remove empties, deduplicate, sort, reverse, then add
			prefixes and numbering — so the result is predictable regardless of which order you tick the
			boxes.
		</p>
		<h3>Deduplication keeps the first occurrence</h3>
		<p>
			With “ignore case” on, <code>Apple</code> and <code>apple</code> are treated as the same entry
			and the first one encountered survives. Deduplicating before sorting means the surviving copy
			is the one that appeared first in your original data.
		</p>
		<h3>Sorting is locale-aware</h3>
		<p>
			Alphabetical sorting uses <code>localeCompare</code>, so accented characters sort where a human
			would expect rather than by raw code point. Numeric sorting reads the leading number on each
			line, which handles “10. item” lists correctly where alphabetical sorting would put 10 before 2.
		</p>
		<h3>Random order</h3>
		<p>
			The shuffle is a Fisher–Yates pass seeded from the browser's cryptographic random source, so it
			is unbiased and unpredictable — suitable for drawing a random order fairly.
		</p>
	{/snippet}
</ToolShell>

<style>
	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
	}
	textarea {
		min-height: 300px;
		font-size: 0.88rem;
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
