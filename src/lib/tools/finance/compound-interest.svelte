<script lang="ts">
	import { aprToApy, futureValue } from '$lib/math/finance';
	import { currency, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ principal: 10000, rate: 7, years: 20, contribution: 500, frequency: 12, atStart: false });

	const periodicRate = $derived(s.rate / 100 / s.frequency);
	const periods = $derived(Math.round(s.years * s.frequency));
	const valid = $derived(s.years > 0 && s.frequency > 0);

	const final = $derived(valid ? futureValue(s.principal, periodicRate, periods, s.contribution, s.atStart) : NaN);
	const contributed = $derived(s.contribution * periods);
	const invested = $derived(s.principal + contributed);
	const interest = $derived(final - invested);

	const apy = $derived(aprToApy(s.rate / 100, s.frequency));

	const yearly = $derived.by(() => {
		if (!valid) return [];
		return Array.from({ length: Math.floor(s.years) + 1 }, (_, year) => {
			const p = Math.round(year * s.frequency);
			const value = futureValue(s.principal, periodicRate, p, s.contribution, s.atStart);
			const paid = s.principal + s.contribution * p;
			return { year, value, paid, growth: value - paid };
		});
	});

	const W = 640;
	const H = 220;
	const maxValue = $derived(Math.max(...yearly.map((y) => y.value), 1));
	const px = (year: number) => (year / Math.max(1, s.years)) * W;
	const py = (v: number) => H - (v / maxValue) * H;

	const totalPath = $derived(yearly.map((y, i) => `${i ? 'L' : 'M'}${px(y.year).toFixed(1)},${py(y.value).toFixed(1)}`).join(' '));
	const paidPath = $derived(yearly.map((y, i) => `${i ? 'L' : 'M'}${px(y.year).toFixed(1)},${py(y.paid).toFixed(1)}`).join(' '));

	/** Rule of 72: a quick mental estimate of the doubling time. */
	const doublingYears = $derived(s.rate > 0 ? Math.log(2) / Math.log(1 + apy) : Infinity);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Starting amount" for="ci-principal"><input id="ci-principal" type="number" min="0" step="500" bind:value={s.principal} /></Field>
			<Field label="Annual rate (%)" for="ci-rate"><input id="ci-rate" type="number" step="0.1" bind:value={s.rate} /></Field>
			<Field label="Years" for="ci-years"><input id="ci-years" type="number" min="1" max="80" bind:value={s.years} /></Field>
		</div>
		<div class="field-row">
			<Field label="Contribution each period" for="ci-contrib"><input id="ci-contrib" type="number" min="0" step="50" bind:value={s.contribution} /></Field>
			<Field label="Compounding" for="ci-freq">
				<select id="ci-freq" bind:value={s.frequency}>
					<option value={1}>Annually</option>
					<option value={2}>Semi-annually</option>
					<option value={4}>Quarterly</option>
					<option value={12}>Monthly</option>
					<option value={52}>Weekly</option>
					<option value={365}>Daily</option>
				</select>
			</Field>
			<div class="check-wrap">
				<label class="check"><input type="checkbox" bind:checked={s.atStart} /> Contribute at the start of each period</label>
			</div>
		</div>

		<div class="results-grid">
			<Result label="Final balance" primary value={valid ? currency(final) : '—'} />
			<Result label="Interest earned" primary value={valid ? currency(interest) : '—'} tone="positive" detail={valid && invested > 0 ? `${fmtLoose((interest / invested) * 100, 1)}% on top of what you put in` : undefined} />
			<Result label="Total you contributed" value={currency(invested)} detail={`${currency(s.principal)} to start + ${currency(contributed)} added`} />
			<Result label="Effective annual yield (APY)" value={`${fmtLoose(apy * 100, 4)}%`} detail={`${s.rate}% nominal, compounded ${s.frequency}× a year`} />
			<Result label="Money doubles every" value={Number.isFinite(doublingYears) ? `${fmtLoose(doublingYears, 1)} years` : '—'} detail="Rule of 72 estimate: {s.rate > 0 ? fmtLoose(72 / s.rate, 1) : '—'} years" />
		</div>

		{#if yearly.length > 1}
			<div>
				<svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Balance growth, showing contributions versus interest">
					<path d="{totalPath} L{W},{H} L0,{H} Z" fill="color-mix(in srgb, var(--positive) 20%, transparent)" />
					<path d="{paidPath} L{W},{H} L0,{H} Z" fill="color-mix(in srgb, var(--accent) 25%, transparent)" />
					<path d={paidPath} fill="none" stroke="var(--accent)" stroke-width="2" />
					<path d={totalPath} fill="none" stroke="var(--positive)" stroke-width="2.5" />
				</svg>
				<p class="legend small">
					<span class="swatch accent"></span> What you put in
					<span class="swatch positive"></span> Total including growth
				</p>
			</div>
		{/if}
	</div>

	<section class="card">
		<h2>Year by year</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Year</th><th class="num">Contributed</th><th class="num">Interest</th><th class="num">Balance</th></tr></thead>
				<tbody>
					{#each yearly.slice(1) as row (row.year)}
						<tr>
							<td>{row.year}</td>
							<td class="num">{currency(row.paid)}</td>
							<td class="num">{currency(row.growth)}</td>
							<td class="num">{currency(row.value)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Compound interest is interest earning interest. The balance grows exponentially rather than
			linearly, which is why the shape of the chart above is a curve that steepens — and why the
			last decade of a long investment contributes more than the first two combined.
		</p>
		<code class="formula">FV = P(1 + i)ⁿ + C · [((1 + i)ⁿ − 1) / i]

P = starting amount   C = contribution per period
i = rate ÷ periods    n = periods × years</code>
		<h3>Nominal rate versus APY</h3>
		<p>
			A “7% APR compounded monthly” does not earn 7% a year — it earns 7.23%, because each month's
			interest starts earning too. APY (or AER) folds that in, which is why it is the honest number
			for comparing savings accounts. The gap widens with both the rate and the frequency.
		</p>
		<h3>Time beats amount</h3>
		<p>
			Someone investing $200 a month from age 25 to 35 and then stopping usually ends up ahead of
			someone starting at 35 and paying in for thirty years. Ten years of head start compounds for
			the whole remaining period. There is no way to buy that back later.
		</p>
		<h3>The rule of 72</h3>
		<p>
			Divide 72 by the percentage rate to estimate the doubling time. At 7%, money doubles in about
			ten years; at 3%, twenty-four. It is a mental shortcut accurate to within a few percent for
			rates between about 4% and 15%.
		</p>
		<h3>This ignores inflation, tax and fees</h3>
		<p>
			A 7% return with 3% inflation is roughly 4% in real purchasing power. A 1% annual fund fee
			removes far more than 1% of the final balance, because it also removes everything that fee
			would have compounded into. Both effects are large over decades.
		</p>
	{/snippet}
</ToolShell>

<style>
	.chart {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	.legend {
		display: flex;
		gap: 1rem;
		align-items: center;
		color: var(--text-muted);
		margin-top: 0.4rem;
	}
	.swatch {
		width: 11px;
		height: 11px;
		border-radius: 2px;
		display: inline-block;
		margin-right: 0.25rem;
	}
	.swatch.accent {
		background: var(--accent);
	}
	.swatch.positive {
		background: var(--positive);
	}
	.check-wrap {
		display: flex;
		align-items: flex-end;
		padding-bottom: 0.6rem;
	}
</style>
