<script lang="ts">
	import { DIMENSIONS, convert, findUnit } from '$lib/units/units';
	import { currency, fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	interface Option {
		id: number;
		label: string;
		price: number;
		size: number;
		unit: string;
	}

	// Only the dimensions people buy things in, plus a bare "items" count.
	const UNIT_CHOICES = [
		{ id: 'count', name: 'items' },
		...['gram', 'kilogram', 'ounce', 'pound', 'milliliter', 'liter', 'fluid-ounce', 'gallon', 'quart', 'sheet'].flatMap((id) => {
			const found = findUnit(id);
			return found ? [{ id, name: found.unit.plural ?? found.unit.name + 's' }] : [];
		})
	];

	let nextId = 4;
	let options = $state<Option[]>([
		{ id: 1, label: 'Small', price: 3.49, size: 500, unit: 'gram' },
		{ id: 2, label: 'Family size', price: 5.99, size: 1, unit: 'kilogram' },
		{ id: 3, label: 'Bulk', price: 12.5, size: 2.5, unit: 'kilogram' }
	]);

	/** Normalise everything to a shared base so mixed units compare honestly. */
	function baseAmount(option: Option): number {
		if (option.unit === 'count' || option.unit === 'sheet') return option.size;
		const found = findUnit(option.unit);
		if (!found) return option.size;
		const base = DIMENSIONS.find((d) => d.id === found.dimension.id)!;
		const baseUnit = base.units.find((u) => u.id === base.base)!;
		return convert(option.size, found.unit, baseUnit);
	}

	const dimensionOf = (unit: string) =>
		unit === 'count' || unit === 'sheet' ? unit : (findUnit(unit)?.dimension.id ?? unit);

	const mixed = $derived(new Set(options.map((o) => dimensionOf(o.unit))).size > 1);

	const scored = $derived(
		options
			.map((option) => {
				const amount = baseAmount(option);
				return { ...option, amount, perBase: amount > 0 ? option.price / amount : Infinity };
			})
			.sort((a, b) => a.perBase - b.perBase)
	);

	const best = $derived(scored[0]);
	const worst = $derived(scored[scored.length - 1]);

	const baseUnitName = $derived.by(() => {
		const d = dimensionOf(options[0]?.unit ?? 'count');
		if (d === 'count' || d === 'sheet') return d === 'sheet' ? 'sheet' : 'item';
		const dim = DIMENSIONS.find((x) => x.id === d);
		return dim?.units.find((u) => u.id === dim.base)?.symbol ?? 'unit';
	});

	function add() {
		options = [...options, { id: nextId++, label: `Option ${options.length + 1}`, price: 0, size: 1, unit: options[0]?.unit ?? 'gram' }];
	}
	function remove(id: number) {
		options = options.filter((o) => o.id !== id);
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<p class="small muted">
			Enter each package's price and size. Mixed units are converted automatically, so grams and
			kilograms compare correctly.
		</p>

		<div class="options">
			{#each options as option, i (option.id)}
				<div class="option">
					<input type="text" bind:value={option.label} placeholder="Label" aria-label="Label for option {i + 1}" autocomplete="off" />
					<input type="number" min="0" step="0.01" bind:value={option.price} aria-label="Price of option {i + 1}" />
					<input type="number" min="0" step="any" bind:value={option.size} aria-label="Size of option {i + 1}" />
					<select bind:value={option.unit} aria-label="Unit for option {i + 1}">
						{#each UNIT_CHOICES as choice (choice.id)}
							<option value={choice.id}>{choice.name}</option>
						{/each}
					</select>
					<button type="button" class="btn btn-sm btn-ghost" onclick={() => remove(option.id)} disabled={options.length <= 2} aria-label="Remove option {i + 1}">
						<Icon name="trash" size={15} />
					</button>
				</div>
			{/each}
		</div>

		<button type="button" class="btn btn-sm no-print" onclick={add}><Icon name="plus" size={15} /> Add option</button>

		{#if best && Number.isFinite(best.perBase)}
			<Result
				label="Best value"
				primary
				tone="positive"
				value={best.label || 'Option 1'}
				detail={`${currency(best.perBase)} per ${baseUnitName} — ${worst && worst.perBase > best.perBase ? `${fmtLoose(((worst.perBase - best.perBase) / worst.perBase) * 100, 1)}% cheaper than the worst option` : 'the only option priced'}`}
			/>
		{/if}
	</div>

	<section class="card">
		<h2>Ranked</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Option</th><th class="num">Price</th><th class="num">Size</th><th class="num">Per {baseUnitName}</th><th class="num">vs best</th></tr></thead>
				<tbody>
					{#each scored as row, i (row.id)}
						<tr class:best={i === 0}>
							<td>{row.label || `Option ${i + 1}`}{i === 0 ? ' ✓' : ''}</td>
							<td class="num">{currency(row.price)}</td>
							<td class="num">{fmtLoose(row.size, 3)} {UNIT_CHOICES.find((c) => c.id === row.unit)?.name}</td>
							<td class="num">{Number.isFinite(row.perBase) ? currency(row.perBase) : '—'}</td>
							<td class="num">{i === 0 ? '—' : `+${fmtLoose(((row.perBase - best.perBase) / best.perBase) * 100, 1)}%`}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if mixed}
			<p class="small muted">Units were normalised before comparison.</p>
		{/if}
	</section>

	{#snippet explainer()}
		<p>
			Unit price is total price divided by total quantity. The only difficulty is that packages are
			deliberately sized to make that division awkward — 375 g against 1.2 kg, 6 rolls against 9
			double rolls.
		</p>
		<code class="formula">unit price = price ÷ quantity (in a common unit)</code>
		<h3>Bigger is not always cheaper</h3>
		<p>
			The “bulk discount” is a strong convention, not a rule. Promotions, loss-leaders and
			multi-buys regularly make the small pack cheaper per unit, and studies of supermarket shelves
			find the large size costs more per unit surprisingly often. The arithmetic takes ten seconds
			and is worth doing.
		</p>
		<h3>Unit price is not the whole answer</h3>
		<p>
			Cheaper per gram is worthless if half of it spoils. For perishables, weigh the unit price
			against what you will realistically use. For storage-hungry items, the shelf space has a cost
			too.
		</p>
	{/snippet}
</ToolShell>

<style>
	.options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.option {
		display: grid;
		grid-template-columns: 1.4fr 100px 100px 130px auto;
		gap: 0.5rem;
		align-items: center;
	}
	tr.best {
		background: color-mix(in srgb, var(--positive) 12%, transparent);
		font-weight: 600;
	}
	@media (max-width: 700px) {
		.option {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
