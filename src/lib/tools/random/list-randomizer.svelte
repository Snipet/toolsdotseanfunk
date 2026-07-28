<script lang="ts">
	import { cryptoRandom, sample, seededRandom, shuffle } from '$lib/random/random';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ mode: 'shuffle', winners: 3, seed: '', dedupe: false });

	let text = $state('Ada Lovelace\nGrace Hopper\nAlan Turing\nKatherine Johnson\nMargaret Hamilton\nDonald Knuth\nBarbara Liskov\nEdsger Dijkstra');
	let nonce = $state(0);

	const items = $derived.by(() => {
		const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
		return s.dedupe ? [...new Set(lines)] : lines;
	});

	const output = $derived.by(() => {
		void nonce;
		if (!items.length) return [];
		const random = s.seed ? seededRandom(`${s.seed}:${nonce}`) : cryptoRandom;
		return s.mode === 'shuffle' ? shuffle(items, random) : sample(items, s.winners, random);
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'shuffle'} onclick={() => (s.mode = 'shuffle')}>
				Shuffle everything
			</button>
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'draw'} onclick={() => (s.mode = 'draw')}>
				Draw winners
			</button>
		</div>

		<div class="field-row">
			{#if s.mode === 'draw'}
				<Field label="How many winners" for="lr-winners" error={s.winners > items.length ? `Only ${items.length} entries` : undefined}>
					<input id="lr-winners" type="number" min="1" max={Math.max(1, items.length)} bind:value={s.winners} />
				</Field>
			{/if}
			<Field label="Seed (optional)" for="lr-seed" hint="Publish a seed to make the draw verifiable">
				<input id="lr-seed" type="text" bind:value={s.seed} placeholder="e.g. giveaway-2026-07-28" autocomplete="off" />
			</Field>
			<div class="checks">
				<label class="check"><input type="checkbox" bind:checked={s.dedupe} /> Remove duplicate entries</label>
			</div>
		</div>

		<div class="row">
			<button type="button" class="btn btn-primary" onclick={() => (nonce += 1)}>
				<Icon name="shuffle" size={16} /> {s.mode === 'shuffle' ? 'Shuffle' : 'Draw'}
			</button>
			{#if output.length}<CopyButton value={() => output.join('\n')} label="Copy result" />{/if}
		</div>
	</div>

	<div class="tool-card-grid">
		<div class="card">
			<label for="lr-input">Entries — one per line</label>
			<textarea id="lr-input" bind:value={text} rows="14" spellcheck="false"></textarea>
			<p class="small muted">{items.length} entr{items.length === 1 ? 'y' : 'ies'}</p>
		</div>

		<div class="card">
			<h2>{s.mode === 'shuffle' ? 'Shuffled order' : `${output.length} winner${output.length === 1 ? '' : 's'}`}</h2>
			{#if output.length}
				<ol class="results">
					{#each output as item, i (i)}
						<li class:winner={s.mode === 'draw'}>{item}</li>
					{/each}
				</ol>
			{:else}
				<p class="muted">Add some entries.</p>
			{/if}
		</div>
	</div>

	{#if s.seed}
		<Note>
			<strong>Verifiable draw.</strong> With a seed set, the result is reproducible: anyone with the
			same entry list, the same seed and the same settings will get exactly this outcome. Publish the
			seed <em>before</em> the draw — a future lottery number or block hash works well — and nobody
			has to take your word for it.
		</Note>
	{/if}

	{#snippet explainer()}
		<p>
			Shuffling uses the Fisher–Yates algorithm, which produces every possible ordering with equal
			probability in a single pass. Drawing winners shuffles and takes from the front, so each entry
			has exactly the same chance and nobody can win twice.
		</p>
		<h3>The naive shuffle is biased</h3>
		<p>
			Sorting a list with a random comparator — <code>arr.sort(() =&gt; Math.random() - 0.5)</code> —
			is the most common shuffle in the wild and it is wrong. Sort algorithms assume a consistent
			comparator; giving them a random one produces measurably uneven distributions, with the exact
			bias depending on the engine's sort implementation. Fisher–Yates is barely more code and is
			provably uniform.
		</p>
		<h3>Running a defensible giveaway</h3>
		<ol>
			<li>Freeze the entry list and publish it, or publish a hash of it.</li>
			<li>Announce the seed source in advance — a specified future lottery draw, a block hash, a
			public random beacon.</li>
			<li>After that value exists, run the draw with it as the seed.</li>
			<li>Publish the seed and the list. Anyone can reproduce the result here.</li>
		</ol>
		<p>
			That sequence removes the need for participants to trust you, which is the only property that
			actually matters in a public draw.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 300px;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.checks {
		display: flex;
		align-items: flex-end;
		padding-bottom: 0.6rem;
	}
	.results {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding-left: 1.6rem;
		margin: 0;
	}
	.results li {
		padding: 0.35rem 0.5rem;
		background: var(--bg-sunken);
		border-radius: var(--radius-sm);
	}
	.results li.winner {
		background: var(--accent-soft);
		border: 1px solid var(--accent-border);
		font-weight: 600;
	}
</style>
