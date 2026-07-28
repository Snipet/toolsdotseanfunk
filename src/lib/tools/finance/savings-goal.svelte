<script lang="ts">
	import { contributionForGoal, futureValue } from '$lib/math/finance';
	import { currency, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ target: 25000, current: 2000, months: 36, rate: 4 });

	const monthlyRate = $derived(s.rate / 100 / 12);
	const valid = $derived(s.months > 0 && s.target > 0);

	const needed = $derived(valid ? contributionForGoal(s.target, s.current, monthlyRate, s.months) : NaN);
	const withoutInterest = $derived(valid ? (s.target - s.current) / s.months : NaN);
	const totalContributed = $derived(needed * s.months);
	const interestEarned = $derived(s.target - s.current - totalContributed);

	/** If the goal is already reachable by growth alone, say so rather than showing a negative. */
	const alreadyThere = $derived(needed <= 0);

	const milestones = $derived(
		valid && !alreadyThere
			? [0.25, 0.5, 0.75, 1].map((fraction) => {
					const targetValue = s.target * fraction;
					// Search month by month; the series has no clean closed-form inverse.
					let month = 0;
					while (month <= s.months && futureValue(s.current, monthlyRate, month, needed) < targetValue) month++;
					return { fraction, month: Math.min(month, s.months), value: targetValue };
				})
			: []
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Savings goal" for="sg-target"><input id="sg-target" type="number" min="1" step="500" bind:value={s.target} /></Field>
			<Field label="Already saved" for="sg-current"><input id="sg-current" type="number" min="0" step="100" bind:value={s.current} /></Field>
			<Field label="Months to get there" for="sg-months"><input id="sg-months" type="number" min="1" max="600" bind:value={s.months} /></Field>
			<Field label="Interest rate (%)" for="sg-rate" hint="APY on your savings"><input id="sg-rate" type="number" min="0" max="20" step="0.1" bind:value={s.rate} /></Field>
		</div>

		{#if alreadyThere}
			<Note>
				Your existing balance grows to {currency(futureValue(s.current, monthlyRate, s.months))} on its
				own — you are already going to clear this goal without adding anything.
			</Note>
		{:else}
			<Result label="Save each month" primary value={valid ? currency(needed) : '—'} detail={valid ? `${currency(needed / 4.33)} a week, or ${currency(needed / 30.4)} a day` : undefined} />
		{/if}

		<div class="results-grid">
			<Result label="Total you contribute" value={valid && !alreadyThere ? currency(totalContributed) : '—'} />
			<Result label="Interest does the rest" value={valid && !alreadyThere ? currency(interestEarned) : '—'} tone="positive" detail={valid && !alreadyThere ? `${fmtLoose((interestEarned / s.target) * 100, 1)}% of the goal` : undefined} />
			<Result label="Without any interest you'd need" value={valid ? currency(withoutInterest) : '—'} detail="Per month, in a shoebox" />
			<Result label="Goal date" value={valid ? new Date(new Date().setMonth(new Date().getMonth() + s.months)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'} />
		</div>

		{#if milestones.length}
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th>Milestone</th><th class="num">Amount</th><th class="num">Reached in</th></tr></thead>
					<tbody>
						{#each milestones as m (m.fraction)}
							<tr>
								<td>{m.fraction * 100}%</td>
								<td class="num">{currency(m.value)}</td>
								<td class="num">{m.month} month{m.month === 1 ? '' : 's'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	{#snippet explainer()}
		<p>
			This inverts the future-value formula: instead of asking what a monthly deposit grows into, it
			asks what deposit is needed to land on a target.
		</p>
		<code class="formula">C = (target − present × (1+i)ⁿ) / (((1+i)ⁿ − 1) / i)</code>
		<h3>Interest matters less over short horizons</h3>
		<p>
			For a three-year goal at 4%, interest covers only a small slice of the total — the work is
			done by the deposits. Over fifteen or twenty years the balance flips and growth does most of
			it. That is why short-term goals belong in safe, boring accounts and long-term ones do not.
		</p>
		<h3>Pay yourself first</h3>
		<p>
			The single most effective mechanism is an automatic transfer on payday, before the money is
			available to spend. The figure above is only useful if it leaves the account without requiring
			a decision each month.
		</p>
	{/snippet}
</ToolShell>
