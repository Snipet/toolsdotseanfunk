<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ current: 87, want: 90, weight: 30 });

	/**
	 * current × (1 − w) + final × w = target, solved for the final.
	 */
	const needed = $derived(
		s.weight > 0 ? (s.want - s.current * (1 - s.weight / 100)) / (s.weight / 100) : NaN
	);

	const verdict = $derived(
		!Number.isFinite(needed)
			? { tone: 'neutral' as const, message: 'Set the exam weight above zero.' }
			: needed <= 0
				? { tone: 'positive' as const, message: 'You have already secured this grade — even a zero on the final keeps you there.' }
				: needed <= 60
					? { tone: 'positive' as const, message: 'Very achievable.' }
					: needed <= 85
						? { tone: 'neutral' as const, message: 'Achievable with solid preparation.' }
						: needed <= 100
							? { tone: 'warning' as const, message: 'Tight — this needs a strong exam.' }
							: { tone: 'negative' as const, message: 'Not reachable with this exam alone. Ask about extra credit or a resit.' }
	);

	const TARGETS = [
		{ letter: 'A', percent: 93 },
		{ letter: 'A−', percent: 90 },
		{ letter: 'B+', percent: 87 },
		{ letter: 'B', percent: 83 },
		{ letter: 'B−', percent: 80 },
		{ letter: 'C', percent: 73 },
		{ letter: 'Pass', percent: 60 }
	];

	const table = $derived(
		TARGETS.map((target) => ({
			...target,
			needed: s.weight > 0 ? (target.percent - s.current * (1 - s.weight / 100)) / (s.weight / 100) : NaN
		}))
	);

	const maxPossible = $derived(s.current * (1 - s.weight / 100) + 100 * (s.weight / 100));
	const minPossible = $derived(s.current * (1 - s.weight / 100));
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Current grade (%)" for="fg-current" hint="Your grade before the final">
				<input id="fg-current" type="number" min="0" max="150" step="0.1" bind:value={s.current} />
			</Field>
			<Field label="Grade you want (%)" for="fg-want">
				<input id="fg-want" type="number" min="0" max="150" step="0.1" bind:value={s.want} />
			</Field>
			<Field label="Final exam weight (%)" for="fg-weight" hint="From your syllabus">
				<input id="fg-weight" type="number" min="1" max="100" step="1" bind:value={s.weight} />
			</Field>
		</div>

		<Result
			label="You need on the final"
			primary
			value={Number.isFinite(needed) ? `${fmtLoose(Math.max(0, needed), 2)}%` : '—'}
			tone={verdict.tone}
			detail={verdict.message}
		/>

		<div class="results-grid">
			<Result label="Best possible final grade" value={`${fmtLoose(maxPossible, 2)}%`} detail="100% on the exam" tone="positive" />
			<Result label="Worst possible final grade" value={`${fmtLoose(minPossible, 2)}%`} detail="0% on the exam" tone="negative" />
			<Result label="The exam can move you" value={`${fmtLoose(maxPossible - minPossible, 2)} points`} detail="The full range at stake" />
		</div>
	</div>

	<section class="card">
		<h2>What each target needs</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Target grade</th><th class="num">Overall %</th><th class="num">Needed on the final</th><th>Verdict</th></tr></thead>
				<tbody>
					{#each table as row (row.letter)}
						<tr class:impossible={row.needed > 100} class:secured={row.needed <= 0}>
							<td>{row.letter}</td>
							<td class="num">{row.percent}%</td>
							<td class="num">
								{!Number.isFinite(row.needed) ? '—' : row.needed <= 0 ? 'Already there' : row.needed > 100 ? `${fmtLoose(row.needed, 1)}%` : `${fmtLoose(row.needed, 1)}%`}
							</td>
							<td class="muted small">
								{row.needed <= 0 ? 'Secured' : row.needed > 100 ? 'Out of reach' : row.needed > 90 ? 'Very demanding' : row.needed > 70 ? 'Work needed' : 'Comfortable'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#if needed > 100}
		<Note tone="warning">
			Scoring above 100% is only possible with extra credit or a curve. Talk to your instructor now
			rather than after the exam — options like a resit, a dropped lowest score, or an alternative
			assessment are far more likely to be available before results are posted.
		</Note>
	{/if}

	{#snippet explainer()}
		<p>
			Your final grade is a weighted average of everything before the exam and the exam itself.
			Rearranging that for the exam score gives you the number you need.
		</p>
		<code class="formula">target = current × (1 − w) + final × w

final = (target − current × (1 − w)) ÷ w

w = the exam's weight, as a decimal</code>
		<h3>Why the weight matters more than the gap</h3>
		<p>
			An exam worth 20% can only move your overall grade within a 20-point band. If you are 5 points
			short, you need 25 points above your current average on the exam — a large ask. The same 5-point
			gap with a 50%-weighted exam needs only 10 points above. Check the syllabus for the real weight
			before panicking.
		</p>
		<h3>Get your current grade right</h3>
		<p>
			The answer is only as good as the number you put in. Use the grade calculator to work out your
			true weighted average across categories rather than the raw points total, which usually differs.
		</p>
		<h3>If the number is above 100</h3>
		<p>
			It is genuinely unreachable through the exam alone. That is worth knowing early — it turns the
			question from “how hard do I study” into “what are my options”, and those options mostly expire
			once grades are final.
		</p>
	{/snippet}
</ToolShell>

<style>
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	tr.impossible td {
		color: var(--negative);
	}
	tr.secured td {
		color: var(--positive);
	}
</style>
