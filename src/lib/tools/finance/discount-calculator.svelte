<script lang="ts">
	import { currency, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ price: 120, discount1: 30, discount2: 0, taxRate: 0, mode: 'forward' });

	const afterFirst = $derived(s.price * (1 - s.discount1 / 100));
	const afterSecond = $derived(afterFirst * (1 - s.discount2 / 100));
	const withTax = $derived(afterSecond * (1 + s.taxRate / 100));

	const saved = $derived(s.price - afterSecond);
	const effectiveDiscount = $derived(s.price > 0 ? (saved / s.price) * 100 : 0);
	const naiveSum = $derived(s.discount1 + s.discount2);

	// Reverse mode: given the sale price and the discount, recover the original.
	const originalPrice = $derived(s.discount1 < 100 ? s.price / (1 - s.discount1 / 100) : NaN);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="modes no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'forward'} onclick={() => (s.mode = 'forward')}>
				What will I pay?
			</button>
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'reverse'} onclick={() => (s.mode = 'reverse')}>
				What was it before?
			</button>
		</div>

		{#if s.mode === 'forward'}
			<div class="field-row">
				<Field label="Original price" for="dc-price"><input id="dc-price" type="number" min="0" step="1" bind:value={s.price} /></Field>
				<Field label="Discount ({s.discount1}%)" for="dc-d1"><input id="dc-d1" type="range" min="0" max="90" bind:value={s.discount1} /></Field>
				<Field label="Second discount ({s.discount2}%)" for="dc-d2" hint="Stacked on the reduced price"><input id="dc-d2" type="range" min="0" max="90" bind:value={s.discount2} /></Field>
				<Field label="Sales tax (%)" for="dc-tax"><input id="dc-tax" type="number" min="0" max="30" step="0.1" bind:value={s.taxRate} /></Field>
			</div>

			<div class="results-grid">
				<Result label="You pay" primary value={currency(s.taxRate > 0 ? withTax : afterSecond)} detail={s.taxRate > 0 ? `${currency(afterSecond)} plus ${currency(withTax - afterSecond)} tax` : undefined} />
				<Result label="You save" primary value={currency(saved)} tone="positive" />
				<Result
					label="Effective discount"
					value={`${fmtLoose(effectiveDiscount, 2)}%`}
					detail={s.discount2 > 0 ? `Not ${naiveSum}% — the second discount applies to the already-reduced price` : undefined}
					tone={s.discount2 > 0 ? 'warning' : 'neutral'}
				/>
				{#if s.discount2 > 0}
					<Result label="After the first discount" value={currency(afterFirst)} />
				{/if}
			</div>
		{:else}
			<div class="field-row">
				<Field label="Sale price you saw" for="dc-sale"><input id="dc-sale" type="number" min="0" step="1" bind:value={s.price} /></Field>
				<Field label="Discount claimed ({s.discount1}%)" for="dc-rev"><input id="dc-rev" type="range" min="0" max="95" bind:value={s.discount1} /></Field>
			</div>
			<div class="results-grid">
				<Result label="Original price" primary value={Number.isFinite(originalPrice) ? currency(originalPrice) : '—'} />
				<Result label="Amount off" value={Number.isFinite(originalPrice) ? currency(originalPrice - s.price) : '—'} tone="positive" />
			</div>
		{/if}
	</div>

	<section class="card">
		<h2>Discount reference</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th class="num">Original</th>{#each [10, 20, 25, 30, 40, 50, 70] as d (d)}<th class="num">{d}% off</th>{/each}</tr></thead>
				<tbody>
					{#each [20, 50, 100, 200, 500] as p (p)}
						<tr>
							<td class="num">{currency(p)}</td>
							{#each [10, 20, 25, 30, 40, 50, 70] as d (d)}
								<td class="num">{currency(p * (1 - d / 100))}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			A discount multiplies the price by (1 − rate). Stacked discounts multiply again — they do not
			add.
		</p>
		<code class="formula">final = price × (1 − d₁) × (1 − d₂)</code>
		<h3>“30% off, then an extra 20%” is 44% off, not 50%</h3>
		<p>
			0.7 × 0.8 = 0.56, so you pay 56% of the original. The second discount applies to a smaller
			number, so it delivers less than its headline. This is the most common piece of retail
			arithmetic people get wrong, and stores know it.
		</p>
		<h3>Discount then tax, or tax then discount?</h3>
		<p>
			It makes no difference — multiplication is commutative. Retailers apply the discount first
			because tax is legally owed on the amount actually paid, but the total is identical either
			way.
		</p>
		<h3>Reverse mode</h3>
		<p>
			To recover an original price, divide rather than multiply. A £70 item marked “30% off” was £100
			— not £91, which is what adding 30% back would wrongly give you. Dividing by 0.7 is the correct
			operation.
		</p>
	{/snippet}
</ToolShell>

<style>
	.modes {
		display: flex;
		gap: 0.4rem;
	}
</style>
