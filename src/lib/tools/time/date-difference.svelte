<script lang="ts">
	import { businessDaysBetween, calendarDiff, daysBetween, isoDate, parseIsoDate } from '$lib/math/dates';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const today = new Date();
	const s = urlState({ from: isoDate(today), to: isoDate(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())) });

	const fromDate = $derived(parseIsoDate(s.from));
	const toDate = $derived(parseIsoDate(s.to));
	const valid = $derived(Boolean(fromDate && toDate));

	const diff = $derived(valid ? calendarDiff(fromDate!, toDate!) : null);
	const totalDays = $derived(valid ? daysBetween(fromDate!, toDate!) : 0);
	const workDays = $derived(valid ? businessDaysBetween(fromDate!, toDate!) : 0);
	const weekendDays = $derived(Math.abs(totalDays) - Math.abs(workDays));

	const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

	function shift(days: number) {
		if (!toDate) return;
		const next = new Date(toDate);
		next.setDate(next.getDate() + days);
		s.to = isoDate(next);
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="From" for="dd-from" error={s.from && !fromDate ? 'Not a valid date' : undefined}>
				<input id="dd-from" type="date" bind:value={s.from} />
			</Field>
			<Field label="To" for="dd-to" error={s.to && !toDate ? 'Not a valid date' : undefined}>
				<input id="dd-to" type="date" bind:value={s.to} />
			</Field>
		</div>

		<div class="row no-print">
			<button type="button" class="btn btn-sm" onclick={() => (s.from = isoDate(new Date()))}>From today</button>
			<button type="button" class="btn btn-sm" onclick={() => (s.to = isoDate(new Date()))}>To today</button>
			<button type="button" class="btn btn-sm" onclick={() => shift(7)}>+1 week</button>
			<button type="button" class="btn btn-sm" onclick={() => shift(30)}>+30 days</button>
			<button type="button" class="btn btn-sm" onclick={() => { const t = s.from; s.from = s.to; s.to = t; }}>Swap</button>
		</div>

		{#if diff && valid}
			<Result
				label="Difference"
				primary
				value={`${Math.abs(diff.years)} year${Math.abs(diff.years) === 1 ? '' : 's'}, ${Math.abs(diff.months)} month${Math.abs(diff.months) === 1 ? '' : 's'}, ${Math.abs(diff.days)} day${Math.abs(diff.days) === 1 ? '' : 's'}`}
				detail={`${fmtDate(fromDate!)} → ${fmtDate(toDate!)}${totalDays < 0 ? ' (backwards)' : ''}`}
			/>

			<div class="results-grid">
				<Result label="Total days" primary value={Math.abs(totalDays).toLocaleString('en-US')} />
				<Result label="Weeks" value={fmtLoose(Math.abs(totalDays) / 7, 2)} detail={`${Math.floor(Math.abs(totalDays) / 7)} whole weeks and ${Math.abs(totalDays) % 7} days`} />
				<Result label="Months" value={fmtLoose(Math.abs(diff.totalMonths), 0)} detail="Whole calendar months" />
				<Result label="Working days" value={Math.abs(workDays).toLocaleString('en-US')} detail="Weekends excluded" />
				<Result label="Weekend days" value={weekendDays.toLocaleString('en-US')} />
				<Result label="Hours" value={(Math.abs(totalDays) * 24).toLocaleString('en-US')} />
				<Result label="Minutes" value={(Math.abs(totalDays) * 1440).toLocaleString('en-US')} />
				<Result label="Seconds" value={(Math.abs(totalDays) * 86400).toLocaleString('en-US')} />
			</div>
		{:else}
			<Note tone="warning">Enter two valid dates.</Note>
		{/if}
	</div>

	{#snippet explainer()}
		<p>
			There are two honest ways to answer “how far apart are these dates”, and they disagree.
			<strong>Total days</strong> is unambiguous. <strong>Years, months and days</strong> depends on
			how you handle months of different lengths.
		</p>
		<h3>Why month arithmetic is ambiguous</h3>
		<p>
			From 31 January to 1 March is either “1 month and 1 day” or “29 days”, depending on what you
			mean. This tool counts whole months first — 31 January plus one month is 28 February — then
			adds the leftover days. That is the convention most calendar software follows, and it is why
			monthly subscriptions billed on the 31st charge on the 28th in February.
		</p>
		<h3>Working days</h3>
		<p>
			The working-day count excludes Saturdays and Sundays but knows nothing about public holidays,
			which vary by country and by year. Use the business days calculator for a count with holidays
			you specify.
		</p>
		<h3>Daylight saving</h3>
		<p>
			Day counts are taken at midnight local time, so a clock change never produces a fractional
			day. The hour count above therefore assumes 24-hour days; across a DST boundary the true
			elapsed time differs by an hour.
		</p>
	{/snippet}
</ToolShell>
