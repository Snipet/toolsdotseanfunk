<script lang="ts">
	import { CPI, CPI_FIRST_YEAR, CPI_LAST_UPDATED, CPI_LAST_YEAR, CPI_YEARS, adjustForInflation, annualisedInflation } from '$lib/data/cpi';
	import { currency, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ amount: 100, from: 1990, to: CPI_LAST_YEAR });

	const adjusted = $derived(adjustForInflation(s.amount, s.from, s.to));
	const rate = $derived(annualisedInflation(s.from, s.to));
	const totalChange = $derived(adjusted / s.amount - 1);
	const valid = $derived(Number.isFinite(adjusted));

	const W = 640;
	const H = 200;
	const maxCpi = $derived(Math.max(...CPI_YEARS.map((y) => CPI[y])));
	const path = $derived(
		CPI_YEARS.map((year, i) => {
			const x = ((year - CPI_FIRST_YEAR) / (CPI_LAST_YEAR - CPI_FIRST_YEAR)) * W;
			const y = H - (CPI[year] / maxCpi) * H;
			return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
		}).join(' ')
	);
	const markerX = (year: number) => ((year - CPI_FIRST_YEAR) / (CPI_LAST_YEAR - CPI_FIRST_YEAR)) * W;

	/** Year-over-year inflation, for the highest and lowest years. */
	const yearly = $derived(
		CPI_YEARS.slice(1).map((year) => ({
			year,
			rate: CPI[year] / CPI[year - 1] - 1
		}))
	);
	const hottest = $derived([...yearly].sort((a, b) => b.rate - a.rate)[0]);
	const coldest = $derived([...yearly].sort((a, b) => a.rate - b.rate)[0]);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Amount" for="inf-amount"><input id="inf-amount" type="number" min="0" step="10" bind:value={s.amount} /></Field>
			<Field label="In this year" for="inf-from">
				<select id="inf-from" bind:value={s.from}>
					{#each CPI_YEARS as year (year)}<option value={year}>{year}</option>{/each}
				</select>
			</Field>
			<Field label="Is worth, in" for="inf-to">
				<select id="inf-to" bind:value={s.to}>
					{#each CPI_YEARS as year (year)}<option value={year}>{year}</option>{/each}
				</select>
			</Field>
		</div>

		<Result
			label="{currency(s.amount)} in {s.from}"
			primary
			value={valid ? currency(adjusted) : '—'}
			detail={valid ? `in ${s.to} dollars — a ${totalChange >= 0 ? 'rise' : 'fall'} of ${fmtLoose(Math.abs(totalChange) * 100, 1)}%` : undefined}
		/>

		<div class="results-grid">
			<Result label="Average annual inflation" value={Number.isFinite(rate) ? `${fmtLoose(rate * 100, 2)}%` : '—'} detail="Compounded over {Math.abs(s.to - s.from)} years" />
			<Result label="Cumulative price change" value={valid ? `${totalChange >= 0 ? '+' : ''}${fmtLoose(totalChange * 100, 1)}%` : '—'} />
			<Result label="Purchasing power" value={valid ? `${currency(s.amount / (adjusted / s.amount))}` : '—'} detail="What {currency(s.amount)} from {s.to} would have bought in {s.from}" />
			<Result label="CPI-U" value={`${fmtLoose(CPI[s.from], 1)} → ${fmtLoose(CPI[s.to], 1)}`} detail="1982–84 = 100" />
		</div>

		<div>
			<svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="US consumer price index since 1913">
				<path d="{path} L{W},{H} L0,{H} Z" fill="color-mix(in srgb, var(--accent) 14%, transparent)" />
				<path d={path} fill="none" stroke="var(--accent)" stroke-width="2" />
				<line x1={markerX(s.from)} y1="0" x2={markerX(s.from)} y2={H} stroke="var(--text-faint)" stroke-dasharray="3 3" />
				<line x1={markerX(s.to)} y1="0" x2={markerX(s.to)} y2={H} stroke="var(--text)" stroke-dasharray="3 3" />
			</svg>
			<p class="small muted">CPI-U, {CPI_FIRST_YEAR}–{CPI_LAST_YEAR}. Dotted lines mark your two years.</p>
		</div>
	</div>

	<section class="card">
		<h2>Notable years</h2>
		<div class="results-grid">
			<Result label="Highest inflation" value={`${hottest.year}: ${fmtLoose(hottest.rate * 100, 1)}%`} tone="negative" />
			<Result label="Lowest (deflation)" value={`${coldest.year}: ${fmtLoose(coldest.rate * 100, 1)}%`} tone="positive" />
			<Result label="Most recent year" value={`${CPI_LAST_YEAR}: ${fmtLoose((CPI[CPI_LAST_YEAR] / CPI[CPI_LAST_YEAR - 1] - 1) * 100, 1)}%`} />
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Inflation is measured by tracking the cost of a fixed basket of goods and services over time.
			The Consumer Price Index expresses that cost as a number relative to a base period — for CPI-U,
			the 1982–84 average is set to 100.
		</p>
		<code class="formula">value in year B = amount × (CPI of B ÷ CPI of A)</code>
		<h3>What the number does and does not tell you</h3>
		<p>
			CPI describes an <em>average urban household</em>. Your own inflation rate depends on what you
			actually buy: someone with a fixed mortgage and no car experienced the 2021–22 spike very
			differently from a renter who commutes. Healthcare and education have consistently outpaced
			the index; consumer electronics have consistently fallen behind it.
		</p>
		<h3>Deflation is rarer than people think</h3>
		<p>
			Prices fell meaningfully in the early 1930s and briefly in 2009. Otherwise the index has risen
			every year since 1913 — a dollar has lost over 96% of its purchasing power across that span.
		</p>
		<h3>Comparing salaries across decades</h3>
		<p>
			This is the right tool for “was my grandfather's $8,000 salary good?” — but wages are not
			prices. Real median household income has risen faster than CPI over the long run, so an
			inflation-adjusted historical salary usually understates the standard of living gap in both
			directions.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			<strong>US Bureau of Labor Statistics</strong>, Consumer Price Index for All Urban Consumers
			(CPI-U), series CUUR0000SA0, annual averages, index 1982–84 = 100.
			Data last updated: <strong>{CPI_LAST_UPDATED}</strong>.
		</p>
		<p>
			This uses annual averages, so figures for the current year will differ slightly from
			month-specific calculators such as the BLS's own.
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
</style>
