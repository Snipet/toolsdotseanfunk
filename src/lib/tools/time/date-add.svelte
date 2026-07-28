<script lang="ts">
	import { addBusinessDays, addDays, addMonths, isoDate, parseIsoDate } from '$lib/math/dates';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ start: isoDate(new Date()), amount: 90, unit: 'days', direction: 1, businessOnly: false });

	const startDate = $derived(parseIsoDate(s.start));
	const valid = $derived(Boolean(startDate));

	const result = $derived.by(() => {
		if (!startDate) return null;
		const signed = s.amount * s.direction;
		if (s.businessOnly && s.unit === 'days') return addBusinessDays(startDate, signed);
		switch (s.unit) {
			case 'days': return addDays(startDate, signed);
			case 'weeks': return addDays(startDate, signed * 7);
			case 'months': return addMonths(startDate, signed);
			default: return addMonths(startDate, signed * 12);
		}
	});

	const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

	const QUICK = [
		{ label: '30 days', amount: 30, unit: 'days' },
		{ label: '60 days', amount: 60, unit: 'days' },
		{ label: '90 days', amount: 90, unit: 'days' },
		{ label: '6 months', amount: 6, unit: 'months' },
		{ label: '1 year', amount: 1, unit: 'years' }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Start date" for="da-start"><input id="da-start" type="date" bind:value={s.start} /></Field>
			<Field label="Direction" for="da-dir">
				<select id="da-dir" bind:value={s.direction}>
					<option value={1}>Add</option>
					<option value={-1}>Subtract</option>
				</select>
			</Field>
			<Field label="Amount" for="da-amount"><input id="da-amount" type="number" min="0" max="100000" bind:value={s.amount} /></Field>
			<Field label="Unit" for="da-unit">
				<select id="da-unit" bind:value={s.unit}>
					<option value="days">Days</option>
					<option value="weeks">Weeks</option>
					<option value="months">Months</option>
					<option value="years">Years</option>
				</select>
			</Field>
		</div>

		{#if s.unit === 'days'}
			<label class="check"><input type="checkbox" bind:checked={s.businessOnly} /> Count business days only (skip weekends)</label>
		{/if}

		<div class="row no-print">
			{#each QUICK as q (q.label)}
				<button type="button" class="btn btn-sm" onclick={() => { s.amount = q.amount; s.unit = q.unit; }}>{q.label}</button>
			{/each}
			<button type="button" class="btn btn-sm" onclick={() => (s.start = isoDate(new Date()))}>Today</button>
		</div>

		{#if result && valid}
			<Result label="Result" primary value={fmtDate(result)} detail={isoDate(result)} />
			<div class="results-grid">
				<Result label="Day of the week" value={result.toLocaleDateString('en-US', { weekday: 'long' })} />
				<Result label="ISO format" value={isoDate(result)} />
				<Result label="US format" value={result.toLocaleDateString('en-US')} />
				<Result label="UK format" value={result.toLocaleDateString('en-GB')} />
			</div>
		{/if}
	</div>

	{#snippet explainer()}
		<p>
			Adding days is simple counting. Adding months is not, because months have different lengths —
			so the answer depends on a convention.
		</p>
		<h3>Month-end clamping</h3>
		<p>
			31 January plus one month is 28 February (29 in a leap year), not 3 March. This tool clamps to
			the last valid day of the target month, which is what banks, subscriptions and legal deadlines
			generally do. The consequence is that the operation is not reversible: 31 Jan + 1 month − 1
			month gives 28 Jan.
		</p>
		<h3>Business days</h3>
		<p>
			With business days selected, weekends are skipped entirely — Friday plus one business day is
			Monday. Public holidays are not included, since they depend on your country; the business days
			calculator lets you supply them.
		</p>
		<h3>Common uses</h3>
		<p>
			“90 days from today” for notice periods and returns windows; “6 months from signing” for
			contract terms; “−14 days” for working backwards from a deadline.
		</p>
	{/snippet}
</ToolShell>
