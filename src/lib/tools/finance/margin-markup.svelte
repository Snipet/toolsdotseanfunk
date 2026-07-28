<script lang="ts">
	import { currency, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ mode: 'fromMargin', cost: 40, price: 100, margin: 60, markup: 150 });

	const derivedValues = $derived.by(() => {
		switch (s.mode) {
			case 'fromMargin': {
				const price = s.margin < 100 ? s.cost / (1 - s.margin / 100) : NaN;
				return { cost: s.cost, price, profit: price - s.cost };
			}
			case 'fromMarkup': {
				const price = s.cost * (1 + s.markup / 100);
				return { cost: s.cost, price, profit: price - s.cost };
			}
			default:
				return { cost: s.cost, price: s.price, profit: s.price - s.cost };
		}
	});

	const { cost, price, profit } = $derived(derivedValues);
	const marginPct = $derived(price > 0 ? (profit / price) * 100 : NaN);
	const markupPct = $derived(cost > 0 ? (profit / cost) * 100 : NaN);
	const valid = $derived(Number.isFinite(price) && price > 0);

	const TABLE = [20, 25, 30, 40, 50, 60, 70];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Note>
			<strong>Margin</strong> is profit as a share of the <em>selling price</em>.
			<strong>Markup</strong> is profit as a share of the <em>cost</em>. A 50% markup is only a 33%
			margin — confusing them is one of the most expensive mistakes in small-business pricing.
		</Note>

		<Field label="What do you know?" for="mm-mode">
			<select id="mm-mode" bind:value={s.mode}>
				<option value="fromMargin">Cost and target margin</option>
				<option value="fromMarkup">Cost and target markup</option>
				<option value="fromPrice">Cost and selling price</option>
			</select>
		</Field>

		<div class="field-row">
			<Field label="Unit cost" for="mm-cost"><input id="mm-cost" type="number" min="0" step="1" bind:value={s.cost} /></Field>
			{#if s.mode === 'fromMargin'}
				<Field label="Target margin ({s.margin}%)" for="mm-margin"><input id="mm-margin" type="range" min="0" max="95" bind:value={s.margin} /></Field>
			{:else if s.mode === 'fromMarkup'}
				<Field label="Target markup ({s.markup}%)" for="mm-markup"><input id="mm-markup" type="range" min="0" max="500" step="5" bind:value={s.markup} /></Field>
			{:else}
				<Field label="Selling price" for="mm-price"><input id="mm-price" type="number" min="0" step="1" bind:value={s.price} /></Field>
			{/if}
		</div>

		<div class="results-grid">
			<Result label="Selling price" primary value={valid ? currency(price) : '—'} />
			<Result label="Profit per unit" primary value={valid ? currency(profit) : '—'} tone={profit >= 0 ? 'positive' : 'negative'} />
			<Result label="Gross margin" value={valid ? `${fmtLoose(marginPct, 2)}%` : '—'} detail="profit ÷ price" />
			<Result label="Markup" value={valid ? `${fmtLoose(markupPct, 2)}%` : '—'} detail="profit ÷ cost" />
		</div>
	</div>

	<section class="card">
		<h2>Margin ↔ markup conversion</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th class="num">Margin</th><th class="num">Equivalent markup</th><th class="num">Price on a {currency(cost)} cost</th></tr></thead>
				<tbody>
					{#each TABLE as m (m)}
						<tr>
							<td class="num">{m}%</td>
							<td class="num">{fmtLoose((m / (100 - m)) * 100, 1)}%</td>
							<td class="num">{currency(cost / (1 - m / 100))}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Both describe the same profit; they just divide it by different things.
		</p>
		<code class="formula">margin = profit ÷ price
markup = profit ÷ cost
price  = cost ÷ (1 − margin)
price  = cost × (1 + markup)</code>
		<h3>The expensive mistake</h3>
		<p>
			A retailer wanting a 40% margin who applies a 40% markup instead sells at £56 on a £40 cost —
			a 28.6% margin, not 40%. Across a whole catalogue that shortfall is often the entire difference
			between profit and loss. To hit a 40% margin you need a 66.7% markup.
		</p>
		<h3>Margin is capped, markup is not</h3>
		<p>
			Margin can never reach 100%, because profit can never exceed the price. Markup has no ceiling —
			a product costing £1 and selling for £10 carries a 900% markup and a 90% margin. This asymmetry
			is why margin is the standard for reporting and markup the standard for pricing rules.
		</p>
		<h3>Gross, not net</h3>
		<p>
			These figures use unit cost only. Rent, salaries, marketing and overhead come out of the gross
			margin, so a healthy gross margin does not by itself mean a profitable business.
		</p>
	{/snippet}
</ToolShell>
