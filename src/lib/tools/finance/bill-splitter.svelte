<script lang="ts">
	import { currency } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	interface Person {
		id: number;
		name: string;
		paid: number;
	}

	let nextId = 4;
	let people = $state<Person[]>([
		{ id: 1, name: 'Alex', paid: 120 },
		{ id: 2, name: 'Sam', paid: 45 },
		{ id: 3, name: 'Jordan', paid: 0 }
	]);

	const total = $derived(people.reduce((sum, p) => sum + (Number(p.paid) || 0), 0));
	const share = $derived(people.length ? total / people.length : 0);

	const balances = $derived(
		people.map((p) => ({ ...p, balance: (Number(p.paid) || 0) - share }))
	);

	/**
	 * Greedy settlement: repeatedly match the largest debtor with the largest
	 * creditor. Produces at most n − 1 transfers, which is the minimum possible.
	 */
	const settlements = $derived.by(() => {
		const debtors = balances.filter((b) => b.balance < -0.005).map((b) => ({ ...b })).sort((a, b) => a.balance - b.balance);
		const creditors = balances.filter((b) => b.balance > 0.005).map((b) => ({ ...b })).sort((a, b) => b.balance - a.balance);
		const transfers: Array<{ from: string; to: string; amount: number }> = [];

		let i = 0;
		let j = 0;
		while (i < debtors.length && j < creditors.length) {
			const amount = Math.min(-debtors[i].balance, creditors[j].balance);
			if (amount > 0.005) {
				transfers.push({ from: debtors[i].name || 'Someone', to: creditors[j].name || 'Someone', amount });
			}
			debtors[i].balance += amount;
			creditors[j].balance -= amount;
			if (Math.abs(debtors[i].balance) < 0.005) i++;
			if (Math.abs(creditors[j].balance) < 0.005) j++;
		}
		return transfers;
	});

	const summary = () =>
		settlements.map((t) => `${t.from} pays ${t.to} ${currency(t.amount)}`).join('\n') ||
		'Everyone is square.';

	function add() {
		people = [...people, { id: nextId++, name: '', paid: 0 }];
	}

	function remove(id: number) {
		people = people.filter((p) => p.id !== id);
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<p class="small muted">Enter what each person actually paid. The tool works out who owes whom.</p>

		<div class="people">
			{#each people as person, i (person.id)}
				<div class="person">
					<input
						type="text"
						bind:value={person.name}
						placeholder="Name {i + 1}"
						aria-label="Name of person {i + 1}"
						autocomplete="off"
					/>
					<input
						type="number"
						min="0"
						step="0.01"
						bind:value={person.paid}
						aria-label="Amount paid by person {i + 1}"
					/>
					<button
						type="button"
						class="btn btn-sm btn-ghost"
						onclick={() => remove(person.id)}
						disabled={people.length <= 2}
						aria-label="Remove {person.name || `person ${i + 1}`}"
					>
						<Icon name="trash" size={15} />
					</button>
				</div>
			{/each}
		</div>

		<button type="button" class="btn btn-sm no-print" onclick={add}>
			<Icon name="plus" size={15} /> Add person
		</button>

		<div class="results-grid">
			<Result label="Total spent" primary value={currency(total)} />
			<Result label="Fair share each" primary value={currency(share)} detail="{people.length} people" />
		</div>
	</div>

	<section class="card">
		<h2>Balances</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Person</th><th class="num">Paid</th><th class="num">Owes / is owed</th></tr></thead>
				<tbody>
					{#each balances as b (b.id)}
						<tr>
							<td>{b.name || 'Unnamed'}</td>
							<td class="num">{currency(Number(b.paid) || 0)}</td>
							<td class="num" class:pos={b.balance > 0.005} class:neg={b.balance < -0.005}>
								{b.balance > 0.005 ? `is owed ${currency(b.balance)}` : b.balance < -0.005 ? `owes ${currency(-b.balance)}` : 'square'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="card">
		<div class="head">
			<h2>Settle up</h2>
			<CopyButton value={summary} label="Copy" />
		</div>
		{#if settlements.length}
			<ul class="transfers">
				{#each settlements as t, i (i)}
					<li>
						<strong>{t.from}</strong> pays <strong>{t.to}</strong>
						<span class="amount">{currency(t.amount)}</span>
					</li>
				{/each}
			</ul>
			<p class="small muted">
				{settlements.length} transfer{settlements.length === 1 ? '' : 's'} — the fewest possible for this
				group.
			</p>
		{:else}
			<p class="muted">Everyone is square. Nothing to settle.</p>
		{/if}
	</section>

	{#snippet explainer()}
		<p>
			Splitting a shared bill is two steps: work out each person's fair share, then find the smallest
			set of payments that squares everyone up.
		</p>
		<code class="formula">balance = what they paid − total ÷ number of people</code>
		<h3>Why not just have everyone pay everyone?</h3>
		<p>
			With five people that would be up to twenty transfers. Matching the largest debtor against the
			largest creditor repeatedly always settles the group in at most n − 1 transfers — one fewer
			than the number of people — which is provably the minimum for the general case.
		</p>
		<h3>Uneven shares</h3>
		<p>
			This tool splits evenly. If one person had the lobster and another had a salad, enter the
			amounts each person <em>should</em> bear as what they “paid”, then adjust — or use the tip
			calculator for a simple per-person split and settle the difference separately.
		</p>
		<h3>Rounding</h3>
		<p>
			Balances that come within half a penny of zero are treated as settled, so floating-point dust
			never produces a “pay $0.00” instruction.
		</p>
	{/snippet}
</ToolShell>

<style>
	.people {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.person {
		display: grid;
		grid-template-columns: 1fr 140px auto;
		gap: 0.5rem;
		align-items: center;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.head h2 {
		font-size: 1.05rem;
	}
	.pos {
		color: var(--positive);
	}
	.neg {
		color: var(--negative);
	}
	.transfers {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.transfers li {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		background: var(--bg-sunken);
		border-radius: var(--radius-sm);
	}
	.amount {
		margin-left: auto;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
	}
</style>
