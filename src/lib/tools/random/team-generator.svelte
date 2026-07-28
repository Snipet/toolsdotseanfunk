<script lang="ts">
	import { cryptoRandom, intoGroups, seededRandom, shuffle } from '$lib/random/random';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ mode: 'count', groups: 3, perGroup: 4, keepApart: '', seed: '' });

	let text = $state('Ada\nGrace\nAlan\nKatherine\nMargaret\nDonald\nBarbara\nEdsger\nRadia\nLeslie\nFrances\nJean');
	let nonce = $state(0);

	const people = $derived(text.split('\n').map((line) => line.trim()).filter(Boolean));

	const pairs = $derived(
		s.keepApart
			.split('\n')
			.map((line) => line.split(/[,+]/).map((n) => n.trim()).filter(Boolean))
			.filter((pair) => pair.length >= 2)
	);

	const groupCount = $derived(
		s.mode === 'count' ? Math.max(1, s.groups) : Math.max(1, Math.ceil(people.length / Math.max(1, s.perGroup)))
	);

	const teams = $derived.by(() => {
		void nonce;
		if (!people.length) return [];
		const random = s.seed ? seededRandom(`${s.seed}:${nonce}`) : cryptoRandom;

		// Try repeatedly until no keep-apart pair lands in the same group.
		for (let attempt = 0; attempt < 400; attempt++) {
			const candidate = intoGroups(people, groupCount, random);
			const violated = pairs.some((pair) =>
				candidate.some((group) => pair.filter((name) => group.includes(name)).length > 1)
			);
			if (!violated) return candidate;
		}
		return intoGroups(people, groupCount, random);
	});

	const unsatisfiable = $derived(
		pairs.length > 0 &&
			teams.some((group) => pairs.some((pair) => pair.filter((name) => group.includes(name)).length > 1))
	);

	const asText = () => teams.map((group, i) => `Team ${i + 1}: ${group.join(', ')}`).join('\n');
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Split by" for="tg-mode">
				<select id="tg-mode" bind:value={s.mode}>
					<option value="count">Number of teams</option>
					<option value="size">People per team</option>
				</select>
			</Field>
			{#if s.mode === 'count'}
				<Field label="How many teams" for="tg-groups">
					<input id="tg-groups" type="number" min="1" max="50" bind:value={s.groups} />
				</Field>
			{:else}
				<Field label="People per team" for="tg-size">
					<input id="tg-size" type="number" min="1" max="50" bind:value={s.perGroup} />
				</Field>
			{/if}
			<Field label="Seed (optional)" for="tg-seed">
				<input id="tg-seed" type="text" bind:value={s.seed} autocomplete="off" />
			</Field>
		</div>

		<div class="row">
			<button type="button" class="btn btn-primary" onclick={() => (nonce += 1)}>
				<Icon name="shuffle" size={16} /> Generate teams
			</button>
			{#if teams.length}<CopyButton value={asText} label="Copy teams" />{/if}
		</div>
	</div>

	<div class="tool-card-grid">
		<div class="card">
			<label for="tg-people">People — one per line</label>
			<textarea id="tg-people" bind:value={text} rows="10" spellcheck="false"></textarea>
			<p class="small muted">{people.length} people into {groupCount} teams</p>
		</div>
		<div class="card">
			<label for="tg-apart">Keep apart — one pair per line, comma separated</label>
			<textarea id="tg-apart" bind:value={s.keepApart} rows="10" spellcheck="false" placeholder={'Ada, Grace\nAlan, Donald'}></textarea>
			<p class="small muted">{pairs.length} constraint{pairs.length === 1 ? '' : 's'}</p>
		</div>
	</div>

	{#if unsatisfiable}
		<Note tone="warning">
			Could not satisfy every keep-apart constraint with {groupCount} teams. Either add another team
			or remove a constraint — with this many restrictions there may be no valid arrangement at all.
		</Note>
	{/if}

	{#if teams.length}
		<div class="teams">
			{#each teams as team, i (i)}
				<section class="team card">
					<h2>Team {i + 1} <span class="count small muted">{team.length}</span></h2>
					<ul>
						{#each team as person (person)}
							<li>{person}</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}

	{#snippet explainer()}
		<p>
			The roster is shuffled with Fisher–Yates and then dealt round-robin into the teams, which keeps
			the sizes within one of each other automatically — twelve people into five teams gives 3, 3, 2,
			2, 2 rather than four teams of three and one empty.
		</p>
		<h3>Keep-apart constraints</h3>
		<p>
			Constraints are satisfied by rejection sampling: generate an arrangement, check it, and try
			again if it violates a rule. This is simple and stays perfectly fair among the valid
			arrangements, but it cannot succeed when the constraints are impossible — five people who must
			all be separated cannot fit into three teams, and the tool will say so rather than quietly
			breaking a rule.
		</p>
		<h3>Random is not balanced</h3>
		<p>
			These teams are randomly assigned, not skill-balanced. For a fair contest, either seed the
			teams by ability yourself, or use the snake-draft convention — 1, 2, 3, 3, 2, 1 — over a ranked
			list.
		</p>
		<h3>Reproducible groupings</h3>
		<p>
			Setting a seed makes the arrangement stable, so reloading the page or sharing the link gives
			the same teams. Useful when you want the same groups for a whole term rather than fresh ones
			every session.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 220px;
	}
	.teams {
		display: grid;
		gap: 0.7rem;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	}
	h2 {
		font-size: 1rem;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}
	.count {
		font-weight: 400;
	}
	.team ul {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.team li {
		padding: 0.3rem 0.5rem;
		background: var(--bg-sunken);
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
	}
</style>
