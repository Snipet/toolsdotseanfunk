<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	interface Criterion {
		id: number;
		name: string;
		weight: number;
	}
	interface Option {
		id: number;
		name: string;
		scores: Record<number, number>;
	}

	let nextCriterion = 4;
	let nextOption = 4;

	let criteria = $state<Criterion[]>([
		{ id: 1, name: 'Cost', weight: 5 },
		{ id: 2, name: 'Speed', weight: 3 },
		{ id: 3, name: 'Reliability', weight: 4 }
	]);

	let options = $state<Option[]>([
		{ id: 1, name: 'Option A', scores: { 1: 8, 2: 5, 3: 7 } },
		{ id: 2, name: 'Option B', scores: { 1: 4, 2: 9, 3: 8 } },
		{ id: 3, name: 'Option C', scores: { 1: 6, 2: 6, 3: 9 } }
	]);

	const totalWeight = $derived(criteria.reduce((sum, c) => sum + Math.max(0, c.weight), 0));

	const scored = $derived(
		options
			.map((option) => {
				const raw = criteria.reduce(
					(sum, criterion) => sum + (option.scores[criterion.id] ?? 0) * Math.max(0, criterion.weight),
					0
				);
				return {
					...option,
					raw,
					// Normalised to 0–100 so the number means something on its own.
					normalised: totalWeight > 0 ? (raw / (totalWeight * 10)) * 100 : 0
				};
			})
			.sort((a, b) => b.raw - a.raw)
	);

	const winner = $derived(scored[0]);
	const margin = $derived(
		scored.length > 1 && scored[0].raw > 0 ? (scored[0].raw - scored[1].raw) / scored[0].raw : 0
	);

	function addCriterion() {
		criteria = [...criteria, { id: nextCriterion++, name: '', weight: 3 }];
	}
	function removeCriterion(id: number) {
		criteria = criteria.filter((c) => c.id !== id);
	}
	function addOption() {
		options = [...options, { id: nextOption++, name: `Option ${String.fromCharCode(64 + options.length + 1)}`, scores: {} }];
	}
	function removeOption(id: number) {
		options = options.filter((o) => o.id !== id);
	}
	function setScore(optionId: number, criterionId: number, value: number) {
		options = options.map((option) =>
			option.id === optionId
				? { ...option, scores: { ...option.scores, [criterionId]: Math.max(0, Math.min(10, value)) } }
				: option
		);
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<p class="small muted">
			Weight each criterion by how much it matters (1–10), then score each option against it (0–10).
		</p>

		<div class="scroll-x">
			<table class="data matrix">
				<thead>
					<tr>
						<th>Criterion</th>
						<th class="num">Weight</th>
						{#each options as option (option.id)}
							<th>
								<input type="text" bind:value={option.name} aria-label="Name of option" class="head-input" />
							</th>
						{/each}
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each criteria as criterion (criterion.id)}
						<tr>
							<td><input type="text" bind:value={criterion.name} placeholder="Criterion" aria-label="Criterion name" /></td>
							<td class="num">
								<input type="number" min="0" max="10" bind:value={criterion.weight} aria-label="Weight for {criterion.name}" class="small-input" />
							</td>
							{#each options as option (option.id)}
								<td class="num">
									<input
										type="number"
										min="0"
										max="10"
										value={option.scores[criterion.id] ?? 0}
										oninput={(e) => setScore(option.id, criterion.id, Number(e.currentTarget.value))}
										aria-label="Score of {option.name} for {criterion.name}"
										class="small-input"
									/>
								</td>
							{/each}
							<td>
								<button type="button" class="btn btn-sm btn-ghost" onclick={() => removeCriterion(criterion.id)} disabled={criteria.length <= 1} aria-label="Remove {criterion.name}">
									<Icon name="trash" size={14} />
								</button>
							</td>
						</tr>
					{/each}
					<tr class="totals">
						<td><strong>Weighted total</strong></td>
						<td class="num">{totalWeight}</td>
						{#each options as option (option.id)}
							{@const entry = scored.find((x) => x.id === option.id)}
							<td class="num" class:best={winner?.id === option.id}>
								<strong>{entry ? fmtLoose(entry.raw, 0) : 0}</strong>
							</td>
						{/each}
						<td></td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="row no-print">
			<button type="button" class="btn btn-sm" onclick={addCriterion}><Icon name="plus" size={14} /> Add criterion</button>
			<button type="button" class="btn btn-sm" onclick={addOption}><Icon name="plus" size={14} /> Add option</button>
			<button type="button" class="btn btn-sm btn-ghost" onclick={() => removeOption(options[options.length - 1].id)} disabled={options.length <= 2}>
				Remove last option
			</button>
		</div>
	</div>

	{#if winner}
		<Result
			label="Highest score"
			primary
			value={winner.name || 'Option'}
			detail={margin < 0.05
				? 'Within 5% of the runner-up — the model is not telling you much. Trust your judgement, or add a criterion that distinguishes them.'
				: `${fmtLoose(margin * 100, 1)}% ahead of the next option`}
			tone={margin < 0.05 ? 'warning' : 'positive'}
		/>

		<section class="card">
			<h2>Ranking</h2>
			<div class="ranking">
				{#each scored as entry, i (entry.id)}
					<div class="rank-row">
						<span class="rank">{i + 1}</span>
						<span class="rank-name">{entry.name || `Option ${i + 1}`}</span>
						<span class="rank-bar">
							<span class="rank-fill" style="width: {winner.raw ? (entry.raw / winner.raw) * 100 : 0}%"></span>
						</span>
						<span class="rank-score num">{fmtLoose(entry.normalised, 1)}%</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			A weighted decision matrix separates two things people usually tangle together: how much each
			factor matters, and how well each option performs on it.
		</p>
		<code class="formula">score = Σ (weight × rating)</code>
		<h3>Set the weights before you score</h3>
		<p>
			This is the discipline that makes the method worth anything. Deciding what matters
			<em>before</em> you look at how the options perform stops you from quietly re-weighting until
			your favourite wins. If you find yourself adjusting weights after seeing the totals, you have
			already made the decision — which is itself useful information.
		</p>
		<h3>A close result is a real result</h3>
		<p>
			When two options land within a few percent, the honest conclusion is that they are equivalent
			on the criteria you listed. Either pick on a factor you have not modelled — gut feel, timing,
			who you would rather work with — or accept that the choice matters less than it feels like it
			does.
		</p>
		<h3>Watch for missing criteria</h3>
		<p>
			The matrix can only weigh what you put in it. Risk, reversibility and opportunity cost are the
			three most commonly omitted, and often the most important. A cheap decision you can undo beats
			an optimal one you cannot.
		</p>
	{/snippet}
</ToolShell>

<style>
	table.matrix input {
		min-height: 34px;
		padding: 0.3rem 0.45rem;
		font-size: 0.88rem;
	}
	.small-input {
		width: 68px;
		text-align: center;
	}
	.head-input {
		min-width: 110px;
		font-weight: 600;
	}
	tr.totals td {
		border-top: 2px solid var(--border-strong);
		background: var(--bg-sunken);
	}
	td.best {
		color: var(--positive);
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.ranking {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.rank-row {
		display: grid;
		grid-template-columns: 28px minmax(80px, 1fr) 2fr 60px;
		gap: 0.6rem;
		align-items: center;
		font-size: 0.9rem;
	}
	.rank {
		font-weight: 700;
		color: var(--text-faint);
		text-align: right;
	}
	.rank-bar {
		height: 18px;
		background: var(--bg-sunken);
		border-radius: 4px;
		overflow: hidden;
	}
	.rank-fill {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.rank-score {
		text-align: right;
		font-weight: 600;
	}
</style>
