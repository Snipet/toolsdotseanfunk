<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	interface Category {
		id: number;
		name: string;
		weight: number;
		earned: number;
		possible: number;
	}

	let nextId = 5;
	let categories = $state<Category[]>([
		{ id: 1, name: 'Homework', weight: 20, earned: 178, possible: 200 },
		{ id: 2, name: 'Quizzes', weight: 20, earned: 84, possible: 100 },
		{ id: 3, name: 'Midterm', weight: 25, earned: 82, possible: 100 },
		{ id: 4, name: 'Final exam', weight: 35, earned: 0, possible: 0 }
	]);

	const totalWeight = $derived(categories.reduce((sum, c) => sum + c.weight, 0));

	// A category with no points recorded is not yet graded, so it is excluded
	// from the current average rather than counted as a zero.
	const graded = $derived(categories.filter((c) => c.possible > 0));
	const gradedWeight = $derived(graded.reduce((sum, c) => sum + c.weight, 0));

	const currentGrade = $derived(
		gradedWeight > 0
			? graded.reduce((sum, c) => sum + (c.earned / c.possible) * c.weight, 0) / gradedWeight * 100
			: 0
	);

	const finalIfPerfect = $derived(
		totalWeight > 0
			? (graded.reduce((sum, c) => sum + (c.earned / c.possible) * c.weight, 0) + (totalWeight - gradedWeight)) /
					totalWeight *
					100
			: 0
	);
	const finalIfZero = $derived(
		totalWeight > 0
			? (graded.reduce((sum, c) => sum + (c.earned / c.possible) * c.weight, 0) / totalWeight) * 100
			: 0
	);

	const SCALE = [
		{ min: 97, letter: 'A+' }, { min: 93, letter: 'A' }, { min: 90, letter: 'A−' },
		{ min: 87, letter: 'B+' }, { min: 83, letter: 'B' }, { min: 80, letter: 'B−' },
		{ min: 77, letter: 'C+' }, { min: 73, letter: 'C' }, { min: 70, letter: 'C−' },
		{ min: 67, letter: 'D+' }, { min: 63, letter: 'D' }, { min: 60, letter: 'D−' },
		{ min: 0, letter: 'F' }
	];

	const letter = $derived(SCALE.find((s) => currentGrade >= s.min)?.letter ?? 'F');

	function add() {
		categories = [...categories, { id: nextId++, name: '', weight: 0, earned: 0, possible: 0 }];
	}
	function remove(id: number) {
		categories = categories.filter((c) => c.id !== id);
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="scroll-x">
			<table class="data">
				<thead>
					<tr><th>Category</th><th class="num">Weight %</th><th class="num">Points earned</th><th class="num">Out of</th><th class="num">Score</th><th></th></tr>
				</thead>
				<tbody>
					{#each categories as category (category.id)}
						<tr class:ungraded={category.possible === 0}>
							<td><input type="text" bind:value={category.name} placeholder="Category" aria-label="Category name" /></td>
							<td class="num"><input type="number" min="0" max="100" bind:value={category.weight} aria-label="Weight" class="narrow" /></td>
							<td class="num"><input type="number" min="0" step="0.5" bind:value={category.earned} aria-label="Points earned" class="narrow" /></td>
							<td class="num"><input type="number" min="0" step="0.5" bind:value={category.possible} aria-label="Points possible" class="narrow" /></td>
							<td class="num">
								{category.possible > 0 ? `${fmtLoose((category.earned / category.possible) * 100, 1)}%` : '—'}
							</td>
							<td>
								<button type="button" class="btn btn-sm btn-ghost" onclick={() => remove(category.id)} disabled={categories.length <= 1} aria-label="Remove category">
									<Icon name="trash" size={14} />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="row no-print">
			<button type="button" class="btn btn-sm" onclick={add}><Icon name="plus" size={14} /> Add category</button>
			<span class="small" class:warn={totalWeight !== 100}>
				Weights total {totalWeight}%{totalWeight !== 100 ? ' — should be 100%' : ''}
			</span>
		</div>

		<div class="results-grid">
			<Result label="Current grade" primary value={`${fmtLoose(currentGrade, 2)}%`} detail={`Letter grade ${letter}`} />
			<Result label="Graded so far" value={`${gradedWeight}% of the course`} detail="Categories with points entered" />
			<Result label="Best possible final" value={`${fmtLoose(finalIfPerfect, 2)}%`} tone="positive" detail="Full marks on everything remaining" />
			<Result label="Worst possible final" value={`${fmtLoose(finalIfZero, 2)}%`} tone="negative" detail="Zero on everything remaining" />
		</div>

		{#if totalWeight !== 100}
			<Note tone="warning">
				Your category weights add to {totalWeight}%, not 100%. The current grade is calculated over
				the graded portion only, so it is still meaningful — but the best and worst case figures
				assume the weights are complete.
			</Note>
		{/if}
	</div>

	<section class="card">
		<h2>Grade scale</h2>
		<div class="scale">
			{#each SCALE as step (step.letter)}
				<div class="step" class:active={letter === step.letter}>
					<span class="letter">{step.letter}</span>
					<span class="range small muted">{step.min}%+</span>
				</div>
			{/each}
		</div>
		<p class="small muted">
			A common US scale. Institutions vary — check your syllabus, especially around the A−/B+ boundary.
		</p>
	</section>

	{#snippet explainer()}
		<p>
			A weighted grade is the average of your category percentages, weighted by how much each
			category counts toward the final mark.
		</p>
		<code class="formula">grade = Σ (category % × weight) ÷ Σ weight</code>
		<h3>Points versus percentages</h3>
		<p>
			The distinction matters. If homework is 20% of your grade, it contributes 20% regardless of
			whether it is worth 200 raw points or 20 — so a 40-point assignment inside a 200-point homework
			category is worth far less than a 40-point quiz inside a 100-point quiz category. Entering
			points per category, as above, handles that correctly.
		</p>
		<h3>Ungraded categories are excluded, not zeroed</h3>
		<p>
			A category with nothing entered is treated as not yet graded, so your current grade reflects
			only the work that has been marked. Counting the unwritten final as a zero would show a
			misleadingly grim number — which is why the best and worst cases are shown separately.
		</p>
		<h3>Watch what is still to come</h3>
		<p>
			The gap between the best and worst possible outcomes shows how much is genuinely still at
			stake. When that gap is 35 points, the current grade tells you very little.
		</p>
	{/snippet}
</ToolShell>

<style>
	table input {
		min-height: 34px;
		padding: 0.3rem 0.45rem;
		font-size: 0.88rem;
	}
	.narrow {
		width: 88px;
		text-align: right;
	}
	tr.ungraded {
		opacity: 0.65;
	}
	.warn {
		color: var(--warning);
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.scale {
		display: grid;
		gap: 0.35rem;
		grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
	}
	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.45rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	.step.active {
		background: var(--accent-soft);
		border-color: var(--accent-border);
	}
	.letter {
		font-weight: 700;
	}
</style>
