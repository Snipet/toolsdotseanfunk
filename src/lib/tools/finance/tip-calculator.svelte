<script lang="ts">
	import { currency, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ bill: 84.5, tip: 20, people: 2, taxRate: 0, tipOnPreTax: true, roundUp: false });

	// If the bill shown already includes tax, back it out when tipping pre-tax.
	const preTax = $derived(s.taxRate > 0 ? s.bill / (1 + s.taxRate / 100) : s.bill);
	const tipBase = $derived(s.tipOnPreTax ? preTax : s.bill);
	const rawTip = $derived((tipBase * s.tip) / 100);

	const total = $derived(s.bill + rawTip);
	const roundedTotal = $derived(s.roundUp ? Math.ceil(total) : total);
	const tipAmount = $derived(roundedTotal - s.bill);

	const perPerson = $derived(s.people > 0 ? roundedTotal / s.people : NaN);
	const tipPerPerson = $derived(s.people > 0 ? tipAmount / s.people : NaN);

	const PRESETS = [10, 15, 18, 20, 22, 25];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Bill total" for="tip-bill"><input id="tip-bill" type="number" min="0" step="0.01" bind:value={s.bill} /></Field>
			<Field label="Tip ({s.tip}%)" for="tip-pct"><input id="tip-pct" type="range" min="0" max="35" step="1" bind:value={s.tip} /></Field>
			<Field label="Split between" for="tip-people"><input id="tip-people" type="number" min="1" max="50" bind:value={s.people} /></Field>
		</div>

		<div class="row no-print">
			{#each PRESETS as p (p)}
				<button type="button" class="btn btn-sm" class:btn-primary={s.tip === p} onclick={() => (s.tip = p)}>{p}%</button>
			{/each}
		</div>

		<div class="results-grid">
			<Result label="Tip" primary value={currency(tipAmount)} detail={s.people > 1 ? `${currency(tipPerPerson)} each` : undefined} />
			<Result label="Total" primary value={currency(roundedTotal)} />
			<Result label="Each person pays" value={s.people > 1 ? currency(perPerson) : currency(roundedTotal)} detail={s.people > 1 ? `Split ${s.people} ways` : 'Just you'} />
			<Result label="Effective tip rate" value={s.bill > 0 ? `${fmtLoose((tipAmount / s.bill) * 100, 1)}%` : '—'} detail="Against the printed bill" />
		</div>

		<details class="advanced">
			<summary>Tax handling</summary>
			<div class="field-row">
				<Field label="Sales tax already in the bill (%)" for="tip-tax" hint="Leave at 0 if the bill is pre-tax">
					<input id="tip-tax" type="number" min="0" max="30" step="0.1" bind:value={s.taxRate} />
				</Field>
				<div class="checks">
					<label class="check"><input type="checkbox" bind:checked={s.tipOnPreTax} /> Tip on the pre-tax amount</label>
					<label class="check"><input type="checkbox" bind:checked={s.roundUp} /> Round the total up to a whole amount</label>
				</div>
			</div>
			{#if s.taxRate > 0}
				<p class="small muted">
					Pre-tax subtotal {currency(preTax)}, tax {currency(s.bill - preTax)}. Tipping on
					{s.tipOnPreTax ? 'the subtotal' : 'the full bill'} at {s.tip}% gives {currency(rawTip)}.
				</p>
			{/if}
		</details>
	</div>

	<section class="card">
		<h2>Quick reference</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th class="num">Bill</th>{#each [15, 18, 20, 25] as p (p)}<th class="num">{p}%</th>{/each}</tr></thead>
				<tbody>
					{#each [10, 20, 25, 40, 50, 75, 100, 150] as amount (amount)}
						<tr>
							<td class="num">{currency(amount)}</td>
							{#each [15, 18, 20, 25] as p (p)}
								<td class="num">{currency(amount * (1 + p / 100))}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="small muted">Totals including the tip.</p>
	</section>

	{#snippet explainer()}
		<p>
			A tip is a straight percentage of the bill. The only genuine questions are what percentage, and
			whether it applies before or after sales tax.
		</p>
		<code class="formula">tip = bill × percentage ÷ 100</code>
		<h3>Pre-tax or post-tax?</h3>
		<p>
			Etiquette guides generally say tip on the pre-tax subtotal, since tax is not a service the
			restaurant provided. In practice most people tip on the total because it is easier, and the
			difference on a $50 bill at 8% tax is about 80 cents at a 20% tip. Both are defensible.
		</p>
		<h3>The doubling trick</h3>
		<p>
			For a 20% tip, double the bill and move the decimal point one place left — $84.50 becomes
			$169.00 becomes $16.90. For 15%, take 10% (move the decimal) and add half of it again.
		</p>
		<h3>Tipping varies enormously by country</h3>
		<p>
			15–20% is the US norm because tipped wages are lower by law. Much of Europe includes service
			and rounding up is sufficient; in Japan tipping can be actively unwelcome. This calculator does
			the arithmetic — the local convention is worth a moment's research before you travel.
		</p>
	{/snippet}
</ToolShell>

<style>
	.advanced summary {
		cursor: pointer;
		font-size: 0.88rem;
		font-weight: 550;
		color: var(--text-muted);
		padding: 0.35rem 0;
	}
	.advanced summary:hover {
		color: var(--accent);
	}
	.advanced > .field-row {
		margin-top: 0.6rem;
	}
	.checks {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		justify-content: flex-end;
		padding-bottom: 0.4rem;
	}
</style>
