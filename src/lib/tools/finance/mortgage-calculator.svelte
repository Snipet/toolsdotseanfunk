<script lang="ts">
	import { buildSchedule, periodicPayment } from '$lib/math/finance';
	import { currency, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({
		price: 400000,
		downPercent: 20,
		rate: 6.75,
		years: 30,
		taxRate: 1.1,
		insurance: 1500,
		hoa: 0,
		pmiRate: 0.6
	});

	const down = $derived((s.price * s.downPercent) / 100);
	const principal = $derived(s.price - down);
	const ltv = $derived(s.price > 0 ? (principal / s.price) * 100 : 0);

	const monthlyRate = $derived(s.rate / 100 / 12);
	const periods = $derived(Math.round(s.years * 12));
	const valid = $derived(principal > 0 && periods > 0);

	const principalAndInterest = $derived(valid ? periodicPayment(principal, monthlyRate, periods) : NaN);
	const monthlyTax = $derived((s.price * s.taxRate) / 100 / 12);
	const monthlyInsurance = $derived(s.insurance / 12);
	// PMI applies while LTV is above 80% and drops off automatically at 78%.
	const needsPmi = $derived(ltv > 80);
	const monthlyPmi = $derived(needsPmi ? (principal * s.pmiRate) / 100 / 12 : 0);

	const totalMonthly = $derived(
		principalAndInterest + monthlyTax + monthlyInsurance + monthlyPmi + s.hoa
	);

	const schedule = $derived(valid ? buildSchedule(principal, monthlyRate, periods) : []);
	const totalInterest = $derived(schedule.at(-1)?.cumulativeInterest ?? 0);

	/** Month at which the balance falls to 78% of the original price — PMI ends. */
	const pmiEndsMonth = $derived.by(() => {
		if (!needsPmi) return null;
		const target = s.price * 0.78;
		const index = schedule.findIndex((r) => r.balance <= target);
		return index === -1 ? null : index + 1;
	});

	const breakdown = $derived([
		{ label: 'Principal & interest', value: principalAndInterest, color: 'var(--accent)' },
		{ label: 'Property tax', value: monthlyTax, color: 'var(--positive)' },
		{ label: 'Home insurance', value: monthlyInsurance, color: 'var(--warning)' },
		{ label: 'PMI', value: monthlyPmi, color: 'var(--negative)' },
		{ label: 'HOA', value: s.hoa, color: 'var(--text-faint)' }
	].filter((row) => row.value > 0));
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Home price" for="mg-price"><input id="mg-price" type="number" min="0" step="5000" bind:value={s.price} /></Field>
			<Field label="Down payment ({s.downPercent}% = {currency(down)})" for="mg-down">
				<input id="mg-down" type="range" min="0" max="100" step="0.5" bind:value={s.downPercent} />
			</Field>
			<Field label="Interest rate (%)" for="mg-rate"><input id="mg-rate" type="number" min="0" max="25" step="0.05" bind:value={s.rate} /></Field>
			<Field label="Term (years)" for="mg-years">
				<select id="mg-years" bind:value={s.years}>
					{#each [10, 15, 20, 25, 30, 40] as y (y)}<option value={y}>{y} years</option>{/each}
				</select>
			</Field>
		</div>

		<div class="field-row">
			<Field label="Property tax rate (% of value / yr)" for="mg-tax"><input id="mg-tax" type="number" min="0" max="5" step="0.05" bind:value={s.taxRate} /></Field>
			<Field label="Home insurance (per year)" for="mg-ins"><input id="mg-ins" type="number" min="0" step="100" bind:value={s.insurance} /></Field>
			<Field label="HOA (per month)" for="mg-hoa"><input id="mg-hoa" type="number" min="0" step="25" bind:value={s.hoa} /></Field>
			<Field label="PMI rate (% of loan / yr)" for="mg-pmi" hint="Applies above 80% LTV"><input id="mg-pmi" type="number" min="0" max="3" step="0.05" bind:value={s.pmiRate} /></Field>
		</div>

		<Result
			label="Total monthly payment"
			primary
			value={valid ? currency(totalMonthly) : '—'}
			detail={valid ? `${currency(principalAndInterest)} principal & interest, plus ${currency(totalMonthly - principalAndInterest)} in taxes, insurance${needsPmi ? ', PMI' : ''}${s.hoa ? ' and HOA' : ''}` : undefined}
		/>

		<div class="bar" role="img" aria-label="Monthly payment breakdown">
			{#each breakdown as row (row.label)}
				<span class="seg" style="width: {(row.value / totalMonthly) * 100}%; background: {row.color}" title="{row.label}: {currency(row.value)}"></span>
			{/each}
		</div>
		<div class="legend">
			{#each breakdown as row (row.label)}
				<span class="legend-item">
					<span class="swatch" style="background: {row.color}"></span>
					{row.label} — {currency(row.value)}
				</span>
			{/each}
		</div>

		<div class="results-grid">
			<Result label="Loan amount" value={currency(principal)} detail="{fmtLoose(ltv, 1)}% loan-to-value" />
			<Result label="Total interest over {s.years} years" value={valid ? currency(totalInterest) : '—'} tone="warning" />
			<Result label="Total of all payments" value={valid ? currency(principal + totalInterest) : '—'} />
			<Result
				label="PMI"
				value={needsPmi ? `${currency(monthlyPmi)}/mo` : 'Not required'}
				tone={needsPmi ? 'warning' : 'positive'}
				detail={needsPmi && pmiEndsMonth ? `Drops off around payment ${pmiEndsMonth} (${Math.floor(pmiEndsMonth / 12)}y ${pmiEndsMonth % 12}m in)` : needsPmi ? undefined : '20% or more down'}
			/>
		</div>

		{#if needsPmi}
			<Note>
				With less than 20% down, lenders normally require private mortgage insurance. It protects
				the lender, not you. By law in the US it must be cancelled automatically once the balance
				reaches 78% of the original value, and you can request cancellation at 80%.
			</Note>
		{/if}
	</div>

	{#snippet explainer()}
		<p>
			The payment people quote is “P&I” — principal and interest. The payment you actually make is
			PITI: principal, interest, taxes and insurance, plus PMI and any HOA dues. On a typical US
			purchase the extras add 20–30% on top of the loan payment, which is why affordability
			calculations based on P&I alone mislead.
		</p>
		<code class="formula">P&I = L · i / (1 − (1 + i)^−n)
PITI = P&I + property tax/12 + insurance/12 + PMI + HOA</code>
		<h3>The term is the biggest lever</h3>
		<p>
			A 15-year mortgage has a much higher payment but dramatically less total interest, because
			interest accrues for half as long on a balance that falls twice as fast. Compare the total
			interest figure above across terms — the difference is often larger than the down payment.
		</p>
		<h3>Down payment does two things at once</h3>
		<p>
			It reduces the amount borrowed, and past 20% it removes PMI entirely. Between 15% and 20% down,
			the effective return on the extra cash is unusually high for that reason alone.
		</p>
		<h3>What this does not include</h3>
		<p>
			Closing costs, points, origination fees, escrow shortfalls, maintenance, and any tax deduction
			you may be entitled to. Property tax rates vary enormously by locality — check your county
			assessor rather than trusting a national average.
		</p>
	{/snippet}
</ToolShell>

<style>
	.bar {
		display: flex;
		height: 26px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		border: 1px solid var(--border);
	}
	.seg {
		display: block;
		height: 100%;
	}
	.legend {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		font-size: 0.82rem;
		color: var(--text-muted);
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.swatch {
		width: 11px;
		height: 11px;
		border-radius: 2px;
		display: inline-block;
	}
</style>
