<script lang="ts">
	import { rollDice, type DiceRoll } from '$lib/random/random';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ notation: '4d6kh3' });

	let history = $state<DiceRoll[]>([]);
	let current = $state<DiceRoll | null>(null);
	let error = $state('');

	function roll(notation = s.notation) {
		const result = rollDice(notation);
		if (!result) {
			error = 'Could not read that. Try something like 2d6, d20+3 or 4d6kh3.';
			return;
		}
		error = '';
		current = result;
		history = [result, ...history].slice(0, 25);
	}

	const QUICK = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', '2d6', '3d6', '4d6kh3', '2d20kh1', '2d20kl1'];

	const stats = $derived.by(() => {
		if (!history.length) return null;
		const totals = history.map((h) => h.total);
		return {
			rolls: history.length,
			average: totals.reduce((a, b) => a + b, 0) / totals.length,
			highest: Math.max(...totals),
			lowest: Math.min(...totals)
		};
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Dice notation" for="dr-notation" error={error || undefined} hint="Count, d, sides, optional kh/kl to keep highest or lowest, optional modifier">
				<input
					id="dr-notation"
					type="text"
					class="mono"
					bind:value={s.notation}
					onkeydown={(e) => e.key === 'Enter' && roll()}
					autocomplete="off"
					spellcheck="false"
				/>
			</Field>
			<div class="roll-wrap">
				<button type="button" class="btn btn-primary" onclick={() => roll()}>
					<Icon name="dice" size={16} /> Roll
				</button>
			</div>
		</div>

		<div class="quick no-print">
			{#each QUICK as notation (notation)}
				<button type="button" class="btn btn-sm" onclick={() => { s.notation = notation; roll(notation); }}>{notation}</button>
			{/each}
		</div>

		{#if current}
			<Result
				label={current.notation}
				primary
				value={String(current.total)}
				detail={current.modifier
					? `${current.kept.join(' + ')} ${current.modifier > 0 ? '+' : '−'} ${Math.abs(current.modifier)}`
					: current.kept.join(' + ')}
			/>

			<div class="dice">
				{#each current.rolls as value, i (i)}
					{@const dropped = current.kept.length < current.rolls.length && !isKept(current, i)}
					<span class="die" class:dropped>{value}</span>
				{/each}
			</div>
		{/if}
	</div>

	{#if stats}
		<div class="results-grid">
			<Result label="Rolls this session" value={String(stats.rolls)} copyable={false} />
			<Result label="Average total" value={stats.average.toFixed(2)} copyable={false} />
			<Result label="Highest" value={String(stats.highest)} tone="positive" copyable={false} />
			<Result label="Lowest" value={String(stats.lowest)} tone="negative" copyable={false} />
		</div>
	{/if}

	{#if history.length}
		<section class="card">
			<div class="head">
				<h2>History</h2>
				<button type="button" class="btn btn-sm btn-ghost" onclick={() => { history = []; current = null; }}>
					<Icon name="trash" size={14} /> Clear
				</button>
			</div>
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th>Notation</th><th>Dice</th><th class="num">Total</th></tr></thead>
					<tbody>
						{#each history as entry, i (i)}
							<tr>
								<td class="mono">{entry.notation}</td>
								<td class="mono small muted">{entry.rolls.join(', ')}</td>
								<td class="num"><strong>{entry.total}</strong></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			Dice notation is the standard shorthand from tabletop gaming: a count, the letter d, and the
			number of sides.
		</p>
		<dl>
			<dt><code>d20</code></dt><dd>One twenty-sided die.</dd>
			<dt><code>3d6</code></dt><dd>Three six-sided dice, summed.</dd>
			<dt><code>2d8+4</code></dt><dd>Two eight-sided dice plus a flat modifier.</dd>
			<dt><code>4d6kh3</code></dt><dd>Roll four, keep the highest three — the classic D&amp;D ability-score method.</dd>
			<dt><code>2d20kh1</code></dt><dd>Advantage: roll two d20s, take the better.</dd>
			<dt><code>2d20kl1</code></dt><dd>Disadvantage: roll two, take the worse.</dd>
		</dl>
		<h3>What advantage is actually worth</h3>
		<p>
			Rolling two d20s and keeping the higher raises the average from 10.5 to 13.825 — worth about
			+3.3 on average, but the effect is not uniform. It helps most when you need a middling roll
			(around +5 at a target of 11) and least at the extremes, where you were nearly certain either
			way. That non-linearity is why advantage feels better than a flat bonus in tight situations.
		</p>
		<h3>Why 4d6 drop lowest</h3>
		<p>
			3d6 averages 10.5 with a symmetric spread. 4d6 keeping the best three averages about 12.24 and
			skews high, producing characters that are above average without guaranteeing it. It is a
			deliberate design choice about the shape of the distribution, not just the mean.
		</p>
		<h3>Fairness</h3>
		<p>
			Every die uses <code>crypto.getRandomValues</code> with an unbiased range mapping. There is no
			“due for a six” — each roll is independent of everything before it.
		</p>
	{/snippet}
</ToolShell>

<script lang="ts" module>
	/** A rolled die is kept if the multiset of kept values still contains it. */
	function isKept(roll: DiceRoll, index: number): boolean {
		const remaining = [...roll.kept];
		for (let i = 0; i < roll.rolls.length; i++) {
			const position = remaining.indexOf(roll.rolls[i]);
			if (position >= 0) {
				remaining.splice(position, 1);
				if (i === index) return true;
			}
		}
		return false;
	}
</script>

<style>
	.roll-wrap {
		display: flex;
		align-items: flex-end;
		padding-bottom: 0.25rem;
	}
	.quick {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.dice {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.die {
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		background: var(--bg-sunken);
		border: 2px solid var(--border-strong);
		border-radius: 10px;
		font-size: 1.2rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.die.dropped {
		opacity: 0.35;
		text-decoration: line-through;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.6rem;
	}
	h2 {
		font-size: 1.05rem;
	}
</style>
