<script lang="ts">
	import { cryptoRandom, randomInt, sample, seededRandom } from '$lib/random/random';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ min: 1, max: 100, count: 1, unique: true, sort: false, seed: '' });

	let nonce = $state(0);

	const rangeSize = $derived(Math.floor(s.max) - Math.ceil(s.min) + 1);
	const impossible = $derived(s.unique && s.count > rangeSize);

	const numbers = $derived.by(() => {
		void nonce;
		if (impossible || rangeSize < 1) return [];
		const random = s.seed ? seededRandom(`${s.seed}:${nonce}`) : cryptoRandom;

		let out: number[];
		if (s.unique) {
			const pool = Array.from({ length: rangeSize }, (_, i) => Math.ceil(s.min) + i);
			out = sample(pool, s.count, random);
		} else {
			out = Array.from({ length: Math.min(s.count, 10000) }, () => randomInt(s.min, s.max, random));
		}
		return s.sort ? [...out].sort((a, b) => a - b) : out;
	});

	const PRESETS = [
		{ label: 'Coin (1–2)', min: 1, max: 2, count: 1 },
		{ label: 'Dice (1–6)', min: 1, max: 6, count: 1 },
		{ label: 'Percentage', min: 1, max: 100, count: 1 },
		{ label: 'Lottery (6 of 49)', min: 1, max: 49, count: 6 },
		{ label: 'PIN digits', min: 0, max: 9, count: 4 }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Minimum" for="rn-min"><input id="rn-min" type="number" bind:value={s.min} /></Field>
			<Field label="Maximum" for="rn-max"><input id="rn-max" type="number" bind:value={s.max} /></Field>
			<Field label="How many" for="rn-count" error={impossible ? `Only ${rangeSize} distinct values available` : undefined}>
				<input id="rn-count" type="number" min="1" max="10000" bind:value={s.count} />
			</Field>
		</div>

		<div class="row">
			<label class="check"><input type="checkbox" bind:checked={s.unique} /> No repeats</label>
			<label class="check"><input type="checkbox" bind:checked={s.sort} /> Sort ascending</label>
			{#each PRESETS as preset (preset.label)}
				<button type="button" class="btn btn-sm" onclick={() => { s.min = preset.min; s.max = preset.max; s.count = preset.count; }}>
					{preset.label}
				</button>
			{/each}
		</div>

		<Field label="Seed (optional)" for="rn-seed" hint="Leave empty for true randomness; set a seed to make a draw reproducible and auditable">
			<input id="rn-seed" type="text" bind:value={s.seed} placeholder="e.g. raffle-2026-07-28" autocomplete="off" />
		</Field>

		<div class="row">
			<button type="button" class="btn btn-primary" onclick={() => (nonce += 1)}>
				<Icon name="reset" size={16} /> Generate
			</button>
			{#if numbers.length}<CopyButton value={() => numbers.join(', ')} label="Copy all" />{/if}
		</div>
	</div>

	{#if numbers.length === 1}
		<Result label="Your number" primary value={String(numbers[0])} />
	{:else if numbers.length}
		<section class="card">
			<h2>{numbers.length} numbers</h2>
			<div class="numbers">
				{#each numbers as number, i (i)}
					<span class="number">{number}</span>
				{/each}
			</div>
		</section>
	{/if}

	{#if s.seed}
		<Note>
			<strong>Seeded mode.</strong> The sequence is derived from your seed, so anyone entering the
			same seed and settings gets exactly these numbers. That is what makes a public draw verifiable —
			publish the seed in advance, and nobody has to trust you. It also means the result is
			<em>not</em> secret: never use a seeded draw for anything that must be unpredictable.
		</Note>
	{/if}

	{#snippet explainer()}
		<p>
			Unseeded draws use <code>crypto.getRandomValues</code>, the browser's cryptographically secure
			random source. Seeded draws use a deterministic xorshift generator, so the same seed always
			produces the same sequence.
		</p>
		<h3>Why not Math.random</h3>
		<p>
			<code>Math.random</code> is a fast pseudorandom generator with no security guarantees — its
			internal state can be recovered from a handful of outputs, making future values predictable.
			That is irrelevant for a game and disqualifying for a prize draw.
		</p>
		<h3>With or without repeats</h3>
		<p>
			“No repeats” draws from a pool without replacement, like lottery balls — which is why the
			number you want cannot exceed the size of the range. Allowing repeats is like rolling a die
			repeatedly: each draw is independent, and duplicates are expected. In a group of 23 people, two
			sharing a birthday is more likely than not.
		</p>
		<h3>Making a draw provable</h3>
		<p>
			Publish the seed before the draw — a future block hash, a lottery result, a hash of the entrant
			list. Anyone can then reproduce your result and confirm nothing was rigged after the fact.
		</p>
	{/snippet}
</ToolShell>

<style>
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.numbers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.number {
		display: grid;
		place-items: center;
		min-width: 52px;
		padding: 0.4rem 0.6rem;
		background: var(--accent-soft);
		border: 1px solid var(--accent-border);
		border-radius: var(--radius-sm);
		font-size: 1.05rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
	}
</style>
