<script lang="ts">
	import { diffLines, levenshtein } from '$lib/text/text';
	import { fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let left = $state('The quick brown fox\njumps over the lazy dog.\nPack my box with five\ndozen liquor jugs.');
	let right = $state('The quick brown fox\nleaps over the lazy dog.\nPack my box with five\ndozen liquor jugs.\nSphinx of black quartz.');

	let ignoreCase = $state(false);
	let ignoreWhitespace = $state(false);

	// A 2,000-line cap keeps the O(n·m) table from exhausting memory on a paste.
	const MAX_LINES = 2000;

	const normalise = (text: string) =>
		text
			.split('\n')
			.slice(0, MAX_LINES)
			.map((line) => {
				let out = line;
				if (ignoreWhitespace) out = out.trim().replace(/\s+/g, ' ');
				if (ignoreCase) out = out.toLowerCase();
				return out;
			});

	const truncated = $derived(
		left.split('\n').length > MAX_LINES || right.split('\n').length > MAX_LINES
	);

	const rawLeft = $derived(left.split('\n').slice(0, MAX_LINES));
	const rawRight = $derived(right.split('\n').slice(0, MAX_LINES));

	const diff = $derived.by(() => {
		const a = normalise(left);
		const b = normalise(right);
		const result = diffLines(a, b);
		// Show the original text, not the normalised comparison key.
		return result.map((row) => ({
			...row,
			text:
				row.op === 'insert'
					? (rawRight[(row.rightNumber ?? 1) - 1] ?? row.text)
					: (rawLeft[(row.leftNumber ?? 1) - 1] ?? row.text)
		}));
	});

	const added = $derived(diff.filter((d) => d.op === 'insert').length);
	const removed = $derived(diff.filter((d) => d.op === 'delete').length);
	const unchanged = $derived(diff.filter((d) => d.op === 'equal').length);
	const identical = $derived(added === 0 && removed === 0);

	const similarity = $derived.by(() => {
		const a = left.slice(0, 20000);
		const b = right.slice(0, 20000);
		if (!a && !b) return 100;
		const distance = levenshtein(a, b);
		return (1 - distance / Math.max(a.length, b.length)) * 100;
	});
</script>

<ToolShell {tool}>
	<div class="tool-card-grid">
		<div class="card">
			<label for="df-left">Original</label>
			<textarea id="df-left" bind:value={left} rows="10" spellcheck="false" class="mono"></textarea>
		</div>
		<div class="card">
			<label for="df-right">Changed</label>
			<textarea id="df-right" bind:value={right} rows="10" spellcheck="false" class="mono"></textarea>
		</div>
	</div>

	<div class="card stack">
		<div class="checks">
			<label class="check"><input type="checkbox" bind:checked={ignoreCase} /> Ignore case</label>
			<label class="check"><input type="checkbox" bind:checked={ignoreWhitespace} /> Ignore whitespace</label>
		</div>

		<div class="results-grid">
			<Result label="Status" primary value={identical ? 'Identical' : `${added + removed} changed lines`} tone={identical ? 'positive' : 'warning'} />
			<Result label="Added" value={`+${added}`} tone="positive" />
			<Result label="Removed" value={`−${removed}`} tone="negative" />
			<Result label="Unchanged" value={String(unchanged)} />
			<Result label="Character similarity" value={`${fmtLoose(similarity, 2)}%`} detail="Levenshtein distance" />
		</div>

		{#if truncated}
			<Note tone="warning">Only the first {MAX_LINES} lines of each side are compared.</Note>
		{/if}
	</div>

	<section class="card">
		<h2>Differences</h2>
		<div class="diff scroll-x">
			{#each diff as row, i (i)}
				<div class="row" data-op={row.op}>
					<span class="gutter">{row.leftNumber ?? ''}</span>
					<span class="gutter">{row.rightNumber ?? ''}</span>
					<span class="marker">{row.op === 'insert' ? '+' : row.op === 'delete' ? '−' : ' '}</span>
					<span class="line">{row.text || ' '}</span>
				</div>
			{/each}
		</div>
	</section>

	{#snippet explainer()}
		<p>
			This finds the longest common subsequence of the two line lists — the largest set of lines that
			appear in the same relative order in both — and reports everything else as an insertion or a
			deletion. It is the same core algorithm <code>diff</code> and Git use.
		</p>
		<h3>Why a “changed” line shows as two</h3>
		<p>
			Line-level diffs have no concept of editing a line: a modification is a deletion followed by an
			insertion. That is why a one-word change appears as a red line and a green line rather than one
			highlighted word.
		</p>
		<h3>Ignoring whitespace and case</h3>
		<p>
			These options change what counts as “the same line” for comparison, but the output still shows
			your original text. That is what you want when reformatting has churned the whitespace and you
			only care about substantive changes.
		</p>
		<h3>Similarity percentage</h3>
		<p>
			The similarity figure is character-level Levenshtein distance — the minimum number of single
			character insertions, deletions or substitutions to turn one text into the other, expressed as
			a percentage of the longer text. It is a different question from the line diff, and useful for
			“roughly how different are these?”
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 220px;
		font-size: 0.88rem;
	}
	.checks {
		display: flex;
		gap: 1.25rem;
		flex-wrap: wrap;
	}
	.diff {
		font-family: var(--font-mono);
		font-size: 0.84rem;
		line-height: 1.6;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-sunken);
		margin-top: 0.75rem;
		max-height: 540px;
		overflow-y: auto;
	}
	.row {
		display: grid;
		grid-template-columns: 42px 42px 20px 1fr;
		gap: 0;
		white-space: pre;
		min-width: max-content;
	}
	.row[data-op='insert'] {
		background: color-mix(in srgb, var(--positive) 16%, transparent);
	}
	.row[data-op='delete'] {
		background: color-mix(in srgb, var(--negative) 14%, transparent);
	}
	.gutter {
		text-align: right;
		padding: 0 0.4rem;
		color: var(--text-faint);
		user-select: none;
		border-right: 1px solid var(--border);
	}
	.marker {
		text-align: center;
		font-weight: 700;
		user-select: none;
	}
	.row[data-op='insert'] .marker {
		color: var(--positive);
	}
	.row[data-op='delete'] .marker {
		color: var(--negative);
	}
	.line {
		padding-right: 0.75rem;
	}
</style>
