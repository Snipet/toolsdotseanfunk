<script lang="ts">
	import { cagr } from '$lib/math/finance';
	import { currency, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ initial: 10000, final: 18000, years: 5, costs: 0 });

	const netFinal = $derived(s.final - s.costs);
	const gain = $derived(netFinal - s.initial);
	const roi = $derived(s.initial > 0 ? gain / s.initial : NaN);
	const annualised = $derived(cagr(s.initial, netFinal, s.years));
	const doublingYears = $derived(annualised > 0 ? Math.log(2) / Math.log(1 + annualised) : Infinity);
	const valid = $derived(s.initial > 0 && s.years > 0);

	const yearly = $derived(
		valid && Number.isFinite(annualised)
			? Array.from({ length: Math.floor(s.years) + 1 }, (_, i) => ({
					year: i,
					value: s.initial * Math.pow(1 + annualised, i)
				}))
			: []
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Amount invested" for="roi-initial"><input id="roi-initial" type="number" min="0" step="100" bind:value={s.initial} /></Field>
			<Field label="Value now" for="roi-final"><input id="roi-final" type="number" min="0" step="100" bind:value={s.final} /></Field>
			<Field label="Years held" for="roi-years"><input id="roi-years" type="number" min="0.25" step="0.25" bind:value={s.years} /></Field>
			<Field label="Fees and costs" for="roi-costs" hint="Commissions, tax, maintenance"><input id="roi-costs" type="number" min="0" step="50" bind:value={s.costs} /></Field>
		</div>

		<div class="results-grid">
			<Result label="Total return (ROI)" primary value={valid ? `${roi >= 0 ? '+' : ''}${fmtLoose(roi * 100, 2)}%` : '—'} tone={roi >= 0 ? 'positive' : 'negative'} />
			<Result label="Annualised return (CAGR)" primary value={valid ? `${fmtLoose(annualised * 100, 2)}%` : '—'} tone={annualised >= 0 ? 'positive' : 'negative'} detail="The steady rate that would produce the same result" />
			<Result label="Profit" value={valid ? currency(gain) : '—'} tone={gain >= 0 ? 'positive' : 'negative'} />
			<Result label="Multiple" value={valid ? `${fmtLoose(netFinal / s.initial, 3)}×` : '—'} />
			<Result label="Doubles every" value={Number.isFinite(doublingYears) ? `${fmtLoose(doublingYears, 1)} years` : '—'} detail="At this annualised rate" />
			<Result label="Rule of 72 estimate" value={annualised > 0 ? `${fmtLoose(72 / (annualised * 100), 1)} years` : '—'} />
		</div>

		{#if yearly.length > 1}
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th>Year</th><th class="num">Value at CAGR</th><th class="num">Cumulative gain</th></tr></thead>
					<tbody>
						{#each yearly as row (row.year)}
							<tr>
								<td>{row.year}</td>
								<td class="num">{currency(row.value)}</td>
								<td class="num">{currency(row.value - s.initial)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	{#snippet explainer()}
		<p>
			ROI is the total percentage gain. CAGR is the constant annual rate that would have produced
			that gain over the holding period — the number to use when comparing investments of different
			lengths.
		</p>
		<code class="formula">ROI  = (final − initial) / initial
CAGR = (final / initial)^(1/years) − 1</code>
		<h3>Why total return misleads</h3>
		<p>
			A 100% return is spectacular over three years and mediocre over twenty. ROI cannot tell them
			apart; CAGR can. Any comparison between two investments held for different periods needs the
			annualised figure.
		</p>
		<h3>CAGR is a smoothed fiction</h3>
		<p>
			It describes the straight line between the start and end points, not the path taken. Two
			investments with identical CAGR can differ enormously in volatility — one climbing steadily,
			the other halving before recovering. That difference matters a great deal if you might need to
			sell partway through.
		</p>
		<h3>Include the costs</h3>
		<p>
			Trading commissions, management fees, stamp duty and capital gains tax all come out of the
			return. A fund charging 1% a year gives up substantially more than 1% of the final balance,
			because the fee also forfeits everything that money would have compounded into.
		</p>
	{/snippet}
</ToolShell>
