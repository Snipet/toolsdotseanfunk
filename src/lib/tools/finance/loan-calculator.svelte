<script lang="ts">
	import { buildSchedule, periodicPayment } from '$lib/math/finance';
	import { currency, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ amount: 25000, rate: 6.5, years: 5, extra: 0 });

	const monthlyRate = $derived(s.rate / 100 / 12);
	const periods = $derived(Math.round(s.years * 12));
	const valid = $derived(s.amount > 0 && periods > 0 && s.rate >= 0);

	const payment = $derived(valid ? periodicPayment(s.amount, monthlyRate, periods) : NaN);
	const schedule = $derived(valid ? buildSchedule(s.amount, monthlyRate, periods, s.extra) : []);
	const baseline = $derived(valid ? buildSchedule(s.amount, monthlyRate, periods, 0) : []);

	const totalInterest = $derived(schedule.at(-1)?.cumulativeInterest ?? 0);
	const baselineInterest = $derived(baseline.at(-1)?.cumulativeInterest ?? 0);
	const totalPaid = $derived(s.amount + totalInterest);
	const monthsSaved = $derived(baseline.length - schedule.length);

	// Yearly rollup keeps the table readable for a 30-year term.
	const byYear = $derived.by(() => {
		const years: Array<{ year: number; interest: number; principal: number; balance: number }> = [];
		for (let i = 0; i < schedule.length; i += 12) {
			const chunk = schedule.slice(i, i + 12);
			years.push({
				year: Math.floor(i / 12) + 1,
				interest: chunk.reduce((a, r) => a + r.interest, 0),
				principal: chunk.reduce((a, r) => a + r.principal, 0),
				balance: chunk.at(-1)!.balance
			});
		}
		return years;
	});

	const csv = () =>
		['Payment,Date offset (months),Payment,Interest,Principal,Balance']
			.concat(
				schedule.map(
					(r) => `${r.number},${r.number},${r.payment.toFixed(2)},${r.interest.toFixed(2)},${r.principal.toFixed(2)},${r.balance.toFixed(2)}`
				)
			)
			.join('\n');

	// Principal-vs-interest split, drawn as a stacked area over the term.
	const W = 640;
	const H = 180;
	const chart = $derived.by(() => {
		if (!schedule.length) return null;
		const max = s.amount;
		return schedule
			.map((r, i) => {
				const x = (i / (schedule.length - 1 || 1)) * W;
				const y = H - (r.balance / max) * H;
				return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Loan amount" for="ln-amount">
				<input id="ln-amount" type="number" min="0" step="500" bind:value={s.amount} />
			</Field>
			<Field label="Annual interest rate (%)" for="ln-rate">
				<input id="ln-rate" type="number" min="0" max="100" step="0.05" bind:value={s.rate} />
			</Field>
			<Field label="Term (years)" for="ln-years">
				<input id="ln-years" type="number" min="0.5" max="50" step="0.5" bind:value={s.years} />
			</Field>
			<Field label="Extra per month" for="ln-extra" hint="Straight off the principal">
				<input id="ln-extra" type="number" min="0" step="25" bind:value={s.extra} />
			</Field>
		</div>

		<div class="results-grid">
			<Result label="Monthly payment" primary value={valid ? currency(payment + s.extra) : '—'} detail={s.extra > 0 ? `${currency(payment)} required + ${currency(s.extra)} extra` : `Over ${periods} payments`} />
			<Result label="Total interest" primary value={valid ? currency(totalInterest) : '—'} tone="warning" detail={valid ? `${fmtLoose((totalInterest / s.amount) * 100, 1)}% of what you borrowed` : undefined} />
			<Result label="Total repaid" value={valid ? currency(totalPaid) : '—'} />
			<Result label="Payoff" value={valid ? `${Math.floor(schedule.length / 12)}y ${schedule.length % 12}m` : '—'} />
			{#if s.extra > 0}
				<Result label="Interest saved" value={currency(baselineInterest - totalInterest)} tone="positive" />
				<Result label="Time saved" value={`${Math.floor(monthsSaved / 12)}y ${monthsSaved % 12}m`} tone="positive" />
			{/if}
		</div>

		{#if chart}
			<div>
				<svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Loan balance falling over the term">
					<path d="{chart} L{W},{H} L0,{H} Z" fill="color-mix(in srgb, var(--accent) 18%, transparent)" />
					<path d={chart} fill="none" stroke="var(--accent)" stroke-width="2.5" />
				</svg>
				<p class="small muted">
					Balance over time. The curve is steepest at the end — early payments are mostly interest.
				</p>
			</div>
		{/if}
	</div>

	{#if byYear.length}
		<section class="card">
			<div class="head">
				<h2>Amortization by year</h2>
				<CopyButton value={csv} label="Copy full CSV" />
			</div>
			<div class="scroll-x">
				<table class="data">
					<thead>
						<tr><th>Year</th><th class="num">Interest</th><th class="num">Principal</th><th class="num">Balance</th></tr>
					</thead>
					<tbody>
						{#each byYear as row (row.year)}
							<tr>
								<td>{row.year}</td>
								<td class="num">{currency(row.interest)}</td>
								<td class="num">{currency(row.principal)}</td>
								<td class="num">{currency(row.balance)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="card">
			<h2>First twelve payments</h2>
			<div class="scroll-x">
				<table class="data">
					<thead>
						<tr><th class="num">#</th><th class="num">Payment</th><th class="num">Interest</th><th class="num">Principal</th><th class="num">Balance</th></tr>
					</thead>
					<tbody>
						{#each schedule.slice(0, 12) as row (row.number)}
							<tr>
								<td class="num">{row.number}</td>
								<td class="num">{currency(row.payment)}</td>
								<td class="num">{currency(row.interest)}</td>
								<td class="num">{currency(row.principal)}</td>
								<td class="num">{currency(row.balance)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			An amortising loan has a fixed payment, of which a shrinking part is interest and a growing
			part is principal. The payment is set so that the balance reaches exactly zero on the final
			period.
		</p>
		<code class="formula">P = L · i / (1 − (1 + i)^−n)

L = amount borrowed
i = annual rate ÷ 12
n = number of monthly payments</code>
		<h3>Why the early payments feel useless</h3>
		<p>
			Interest is charged on the balance you still owe, and at the start that is nearly all of it. On
			a $25,000 loan at 6.5%, the first payment puts about $135 toward interest — money that buys you
			nothing. By the final year almost every dollar reduces the balance. This is why an extra
			payment made in year one is worth far more than the same payment made in year five.
		</p>
		<h3>Extra payments</h3>
		<p>
			Anything above the required payment comes straight off the principal, which reduces every
			future interest charge. The effect compounds: paying an extra $100 a month on a $25,000 5-year
			loan clears it roughly a year early and saves several hundred in interest. Confirm with your
			lender that extra payments are applied to principal and that there is no prepayment penalty.
		</p>
		<h3>Rate versus APR</h3>
		<p>
			The interest rate is what accrues on the balance. The APR also folds in origination fees and
			points, so it is the number to use when comparing offers. Two loans with the same rate and
			different fees have different APRs, and the higher one costs more.
		</p>
	{/snippet}
</ToolShell>

<style>
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
	.chart {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
</style>
