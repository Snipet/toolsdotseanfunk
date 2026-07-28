<script lang="ts">
	import { secretSanta } from '$lib/random/random';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let namesText = $state('Ada\nGrace\nAlan\nKatherine\nMargaret\nDonald');
	let exclusionsText = $state('Ada, Grace');
	let assignments = $state<Array<{ giver: string; receiver: string }> | null>(null);
	let revealed = $state<Set<string>>(new Set());
	let failed = $state(false);

	const names = $derived([...new Set(namesText.split('\n').map((n) => n.trim()).filter(Boolean))]);

	const exclusions = $derived(
		exclusionsText
			.split('\n')
			.map((line) => line.split(',').map((n) => n.trim()).filter(Boolean))
			.filter((pair): pair is [string, string] => pair.length === 2)
	);

	function draw() {
		revealed = new Set();
		const result = secretSanta(names, exclusions);
		failed = result === null;
		assignments = result;
	}

	function reveal(giver: string) {
		revealed = new Set([...revealed, giver]);
	}

	function hideAll() {
		revealed = new Set();
	}

	const allText = () =>
		(assignments ?? []).map((a) => `${a.giver} → ${a.receiver}`).join('\n');
</script>

<ToolShell {tool}>
	<div class="tool-card-grid">
		<div class="card">
			<label for="ss-names">Participants — one per line</label>
			<textarea id="ss-names" bind:value={namesText} rows="10" spellcheck="false"></textarea>
			<p class="small muted">{names.length} participant{names.length === 1 ? '' : 's'}</p>
		</div>
		<div class="card">
			<label for="ss-exclusions">Cannot be paired — one pair per line, comma separated</label>
			<textarea id="ss-exclusions" bind:value={exclusionsText} rows="10" spellcheck="false" placeholder={'Ada, Grace\nAlan, Donald'}></textarea>
			<p class="small muted">
				{exclusions.length} exclusion{exclusions.length === 1 ? '' : 's'} — applied in both directions
			</p>
		</div>
	</div>

	<div class="card stack">
		<div class="row">
			<button type="button" class="btn btn-primary" onclick={draw} disabled={names.length < 2}>
				<Icon name="shuffle" size={16} /> Draw names
			</button>
			{#if assignments}
				<button type="button" class="btn btn-sm" onclick={hideAll}>Hide all again</button>
				<CopyButton value={allText} label="Copy the full list (organiser only)" />
			{/if}
		</div>

		{#if failed}
			<Note tone="warning">
				No valid arrangement exists with these exclusions. With {names.length} people, the
				constraints are too tight — remove an exclusion or add another participant. (Two people who
				cannot be paired with each other is always impossible, since each must give to the other.)
			</Note>
		{/if}
	</div>

	{#if assignments}
		<section class="card">
			<h2>Assignments</h2>
			<p class="small muted">
				Hand the device to each person in turn and let them reveal only their own. Nobody sees
				anyone else's unless you copy the full list.
			</p>
			<div class="cards">
				{#each assignments as assignment (assignment.giver)}
					<button
						type="button"
						class="reveal-card"
						class:revealed={revealed.has(assignment.giver)}
						onclick={() => reveal(assignment.giver)}
					>
						<span class="giver">{assignment.giver}</span>
						{#if revealed.has(assignment.giver)}
							<span class="receiver">gives to <strong>{assignment.receiver}</strong></span>
						{:else}
							<span class="hidden-label">Tap to reveal</span>
						{/if}
					</button>
				{/each}
			</div>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			A Secret Santa draw is a <em>derangement</em>: a permutation in which no element stays in its
			original position — nobody draws themselves. Exclusions add further forbidden pairings.
		</p>
		<h3>The hat method is flawed</h3>
		<p>
			Drawing names from a hat has a real failure mode: the last person can end up with their own
			name, forcing a restart that leaks information about everyone else's draw. Computing the
			assignment all at once avoids that entirely.
		</p>
		<h3>How the derangement is found</h3>
		<p>
			By rejection sampling: shuffle, check every constraint, and retry if any is violated. This is
			uniform across all valid arrangements, which a “fix it up afterwards” approach is not. About
			37% of random shuffles are already derangements — the proportion converges to 1/e — so a valid
			one is usually found in the first few attempts.
		</p>
		<h3>Keeping it secret from the organiser</h3>
		<p>
			The reveal cards let each person see only their own assignment. If even the organiser should
			not know, have someone outside the group run the draw, or pass the device around without
			looking. Everything is computed locally, so nothing is stored or transmitted either way.
		</p>
		<h3>Common exclusions</h3>
		<p>
			Couples and housemates are the usual ones — the point of the exchange is generally that people
			buy for someone they would not otherwise have bought for.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 220px;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.3rem;
	}
	.cards {
		display: grid;
		gap: 0.6rem;
		grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
		margin-top: 0.9rem;
	}
	.reveal-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		text-align: left;
		min-height: 88px;
		transition: background 0.15s ease, border-color 0.15s ease;
	}
	.reveal-card:hover {
		border-color: var(--accent-border);
	}
	.reveal-card.revealed {
		background: var(--accent-soft);
		border-color: var(--accent-border);
		cursor: default;
	}
	.giver {
		font-weight: 650;
		font-size: 1rem;
	}
	.receiver {
		font-size: 0.9rem;
		color: var(--text-muted);
	}
	.receiver strong {
		color: var(--accent);
	}
	.hidden-label {
		font-size: 0.8rem;
		color: var(--text-faint);
		font-style: italic;
	}
</style>
