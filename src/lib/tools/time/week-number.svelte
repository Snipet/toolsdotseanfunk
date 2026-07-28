<script lang="ts">
	import { dayOfYear, daysInYear, isLeapYear, isoDate, isoWeek, isoWeekYear, parseIsoDate } from '$lib/math/dates';
	import { fmtLoose, ordinal } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ date: isoDate(new Date()) });

	const date = $derived(parseIsoDate(s.date));
	const valid = $derived(Boolean(date));

	const doy = $derived(valid ? dayOfYear(date!) : 0);
	const total = $derived(valid ? daysInYear(date!.getFullYear()) : 365);
	const remaining = $derived(total - doy);
	const quarter = $derived(valid ? Math.floor(date!.getMonth() / 3) + 1 : 0);
	const progress = $derived((doy / total) * 100);

	/** Monday–Sunday bounds of the ISO week containing this date. */
	const weekRange = $derived.by(() => {
		if (!date) return null;
		const day = date.getDay() || 7;
		const monday = new Date(date);
		monday.setDate(date.getDate() - day + 1);
		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);
		return { monday, sunday };
	});

	const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Date" for="wk-date"><input id="wk-date" type="date" bind:value={s.date} /></Field>
			<div class="quick no-print">
				<button type="button" class="btn btn-sm" onclick={() => (s.date = isoDate(new Date()))}>Today</button>
			</div>
		</div>

		{#if valid}
			<Result
				label="ISO week"
				primary
				value={`Week ${isoWeek(date!)} of ${isoWeekYear(date!)}`}
				detail={weekRange ? `${fmt(weekRange.monday)} – ${fmt(weekRange.sunday)}` : undefined}
			/>

			<div class="results-grid">
				<Result label="Day of the year" value={`${doy} of ${total}`} detail={`${ordinal(doy)} day`} />
				<Result label="Days remaining" value={String(remaining)} />
				<Result label="Quarter" value={`Q${quarter}`} />
				<Result label="Day of the week" value={date!.toLocaleDateString('en-US', { weekday: 'long' })} />
				<Result label="Leap year?" value={isLeapYear(date!.getFullYear()) ? 'Yes' : 'No'} detail={`${date!.getFullYear()} has ${total} days`} />
				<Result label="Year progress" value={`${fmtLoose(progress, 1)}%`} />
			</div>

			<div class="progress" role="img" aria-label="{fmtLoose(progress, 0)} percent through the year">
				<span class="fill" style="width: {progress}%"></span>
			</div>
		{/if}
	</div>

	{#snippet explainer()}
		<p>
			ISO 8601 defines week numbering precisely, which matters because the intuitive definitions
			disagree at year boundaries.
		</p>
		<h3>The two rules</h3>
		<ul>
			<li>Weeks run <strong>Monday to Sunday</strong>.</li>
			<li>Week 1 is the week containing the <strong>first Thursday</strong> of the year — equivalently, the week containing 4 January.</li>
		</ul>
		<p>
			The consequence is that up to three days at either end of a calendar year belong to a
			neighbouring ISO year. 1 January 2021 was a Friday, so it fell in week 53 of ISO year 2020.
			This tool reports the ISO year alongside the week for exactly that reason.
		</p>
		<h3>53-week years</h3>
		<p>
			Most years have 52 ISO weeks; some have 53. A year has 53 when it starts on a Thursday, or when
			it is a leap year starting on a Wednesday. Retail and payroll calendars built on 52 weeks have
			to absorb an extra week periodically, which is why some companies report a “53-week year”.
		</p>
		<h3>Other conventions exist</h3>
		<p>
			North American business calendars often start weeks on Sunday and define week 1 as the one
			containing 1 January. That numbering can differ from ISO by one for much of the year — worth
			checking before quoting a week number to someone in a different country.
		</p>
	{/snippet}
</ToolShell>

<style>
	.quick {
		display: flex;
		align-items: flex-end;
		padding-bottom: 0.25rem;
	}
	.progress {
		height: 12px;
		background: var(--bg-sunken);
		border-radius: 999px;
		overflow: hidden;
		border: 1px solid var(--border);
	}
	.fill {
		display: block;
		height: 100%;
		background: var(--accent);
	}
</style>
