<script lang="ts">
	import { periodsToPayoff } from '$lib/math/finance';
	import { currency, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ balance: 5000, apr: 22.9, payment: 150, minPercent: 2, minFloor: 25 });

	const monthlyRate = $derived(s.apr / 100 / 12);
	const monthlyInterest = $derived(s.balance * monthlyRate);

	const months = $derived(periodsToPayoff(s.balance, monthlyRate, s.payment));
	const totalPaid = $derived(Number.isFinite(months) ? s.payment * months : Infinity);
	const totalInterest = $derived(Number.isFinite(totalPaid) ? totalPaid - s.balance : Infinity);

	/**
	 * Minimum payments are a percentage of the balance with a floor, so they
	 * fall as the balance does — the reason they take so devastatingly long.
	 */
	const minimumPath = $derived.by(() => {
		let balance = s.balance;
		let interest = 0;
		let month = 0;
		while (balance > 0.005 && month < 1200) {
			const charge = balance * monthlyRate;
			const payment = Math.min(balance + charge, Math.max((balance * s.minPercent) / 100, s.minFloor));
			if (payment <= charge) return { months: Infinity, interest: Infinity, never: true };
			balance = balance + charge - payment;
			interest += charge;
			month++;
		}
		return { months: month, interest, never: month >= 1200 };
	});

	const extraScenarios = $derived(
		[0, 50, 100, 200].map((extra) => {
			const p = s.payment + extra;
			const m = periodsToPayoff(s.balance, monthlyRate, p);
			return {
				extra,
				payment: p,
				months: m,
				interest: Number.isFinite(m) ? p * m - s.balance : Infinity
			};
		})
	);

	const neverClears = $derived(!Number.isFinite(months));
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Balance" for="cc-balance"><input id="cc-balance" type="number" min="0" step="100" bind:value={s.balance} /></Field>
			<Field label="APR (%)" for="cc-apr"><input id="cc-apr" type="number" min="0" max="60" step="0.1" bind:value={s.apr} /></Field>
			<Field label="Monthly payment" for="cc-payment"><input id="cc-payment" type="number" min="0" step="10" bind:value={s.payment} /></Field>
		</div>

		{#if neverClears}
			<Note tone="warning">
				At {currency(s.payment)} a month you are not keeping up with the
				{currency(monthlyInterest)} of interest this balance accrues. The debt grows indefinitely.
				You need to pay more than {currency(monthlyInterest)} a month just to stand still.
			</Note>
		{:else}
			<Result
				label="Paid off in"
				primary
				value={`${Math.floor(months / 12)} years ${Math.round(months % 12)} months`}
				detail={`${Math.ceil(months)} payments of ${currency(s.payment)}`}
			/>
		{/if}

		<div class="results-grid">
			<Result label="Total interest" value={Number.isFinite(totalInterest) ? currency(totalInterest) : 'Never repaid'} tone="warning" detail={Number.isFinite(totalInterest) ? `${fmtLoose((totalInterest / s.balance) * 100, 0)}% on top of the balance` : undefined} />
			<Result label="Total paid" value={Number.isFinite(totalPaid) ? currency(totalPaid) : '—'} />
			<Result label="Interest this month alone" value={currency(monthlyInterest)} detail={`${currency(monthlyInterest / 30)} a day`} />
			<Result label="Daily periodic rate" value={`${fmtLoose((s.apr / 365), 4)}%`} />
		</div>
	</div>

	<section class="card">
		<h2>Minimum payments only</h2>
		<div class="results-grid">
			<Result
				label="Time to clear"
				value={minimumPath.never ? 'Over 100 years' : `${Math.floor(minimumPath.months / 12)} years ${minimumPath.months % 12} months`}
				tone="negative"
			/>
			<Result label="Interest paid" value={Number.isFinite(minimumPath.interest) ? currency(minimumPath.interest) : '—'} tone="negative" />
			<Result label="First minimum payment" value={currency(Math.max((s.balance * s.minPercent) / 100, s.minFloor))} detail="{s.minPercent}% of the balance, floor {currency(s.minFloor)}" />
		</div>
		<p class="small muted">
			The minimum falls as the balance does, which is precisely why it takes so long. Paying a fixed
			amount — even the same amount as today's minimum — clears the debt dramatically faster.
		</p>
	</section>

	<section class="card">
		<h2>What an extra payment does</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th class="num">Monthly payment</th><th class="num">Time to clear</th><th class="num">Total interest</th><th class="num">Interest saved</th></tr></thead>
				<tbody>
					{#each extraScenarios as row (row.extra)}
						<tr class:active={row.extra === 0}>
							<td class="num">{currency(row.payment)}{row.extra ? ` (+${currency(row.extra)})` : ''}</td>
							<td class="num">{Number.isFinite(row.months) ? `${Math.floor(row.months / 12)}y ${Math.round(row.months % 12)}m` : 'Never'}</td>
							<td class="num">{Number.isFinite(row.interest) ? currency(row.interest) : '—'}</td>
							<td class="num pos">{Number.isFinite(row.interest) && Number.isFinite(totalInterest) && row.extra ? currency(totalInterest - row.interest) : '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Credit card interest compounds monthly on whatever balance remains. The payoff time is the
			number of periods at which the payments finally exhaust the balance.
		</p>
		<code class="formula">n = −ln(1 − (B · i) / P) / ln(1 + i)

B = balance   i = APR ÷ 12   P = monthly payment</code>
		<h3>The minimum payment trap</h3>
		<p>
			Minimums are typically 1–3% of the balance with a small floor. Because they shrink as the
			balance shrinks, the final stretch crawls. A $5,000 balance at 23% APR paid at the minimum
			takes decades and can cost more in interest than the original debt. Paying a
			<em>fixed</em> amount instead — even today's minimum, frozen — often halves the time.
		</p>
		<h3>The break-even payment</h3>
		<p>
			If your payment is below one month's interest, the balance grows no matter how long you keep
			paying. That threshold is {currency(monthlyInterest)} at your current balance and rate — the
			absolute floor before any progress happens at all.
		</p>
		<h3>Snowball or avalanche?</h3>
		<p>
			With several cards, paying the highest APR first (avalanche) minimises total interest. Paying
			the smallest balance first (snowball) costs slightly more but produces a visible win sooner,
			and evidence suggests people stick with it more often. The mathematically optimal plan you
			abandon is worse than the slightly suboptimal one you finish.
		</p>
	{/snippet}
</ToolShell>

<style>
	tr.active {
		background: var(--bg-sunken);
		font-weight: 600;
	}
	.pos {
		color: var(--positive);
	}
</style>
