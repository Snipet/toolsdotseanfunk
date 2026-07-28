<script lang="ts">
	import { addBusinessDays, businessDaysBetween, daysBetween, isWeekend, isoDate, parseIsoDate } from '$lib/math/dates';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const year = new Date().getFullYear();

	/** Federal-style US holidays, computed rather than hard-coded per year. */
	function nthWeekday(y: number, month: number, weekday: number, n: number): Date {
		if (n > 0) {
			const first = new Date(y, month, 1);
			const offset = (weekday - first.getDay() + 7) % 7;
			return new Date(y, month, 1 + offset + (n - 1) * 7);
		}
		const last = new Date(y, month + 1, 0);
		const offset = (last.getDay() - weekday + 7) % 7;
		return new Date(y, month + 1, -offset);
	}

	function usHolidays(y: number): Array<{ name: string; date: Date }> {
		return [
			{ name: "New Year's Day", date: new Date(y, 0, 1) },
			{ name: 'Martin Luther King Jr. Day', date: nthWeekday(y, 0, 1, 3) },
			{ name: "Presidents' Day", date: nthWeekday(y, 1, 1, 3) },
			{ name: 'Memorial Day', date: nthWeekday(y, 4, 1, -1) },
			{ name: 'Juneteenth', date: new Date(y, 5, 19) },
			{ name: 'Independence Day', date: new Date(y, 6, 4) },
			{ name: 'Labor Day', date: nthWeekday(y, 8, 1, 1) },
			{ name: 'Columbus Day', date: nthWeekday(y, 9, 1, 2) },
			{ name: 'Veterans Day', date: new Date(y, 10, 11) },
			{ name: 'Thanksgiving', date: nthWeekday(y, 10, 4, 4) },
			{ name: 'Christmas Day', date: new Date(y, 11, 25) }
		];
	}

	const s = urlState({
		mode: 'between',
		from: isoDate(new Date()),
		to: isoDate(new Date(new Date().setMonth(new Date().getMonth() + 1))),
		days: 10,
		useHolidays: true,
		extra: ''
	});

	const holidayList = $derived(
		s.useHolidays ? [...usHolidays(year), ...usHolidays(year + 1)].map((h) => h.date) : []
	);
	const extraHolidays = $derived(
		s.extra
			.split(/[\s,]+/)
			.map((x) => parseIsoDate(x))
			.filter((x): x is Date => x !== null)
	);
	const allHolidays = $derived([...holidayList, ...extraHolidays]);

	const fromDate = $derived(parseIsoDate(s.from));
	const toDate = $derived(parseIsoDate(s.to));

	const workDays = $derived(fromDate && toDate ? businessDaysBetween(fromDate, toDate, allHolidays) : 0);
	const calendarDays = $derived(fromDate && toDate ? daysBetween(fromDate, toDate) : 0);
	const skipped = $derived(Math.abs(calendarDays) - Math.abs(workDays));

	const target = $derived(fromDate ? addBusinessDays(fromDate, s.days, allHolidays) : null);

	const upcoming = $derived(
		usHolidays(year)
			.concat(usHolidays(year + 1))
			.filter((h) => h.date >= new Date(new Date().setHours(0, 0, 0, 0)))
			.slice(0, 8)
	);

	const fmt = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'between'} onclick={() => (s.mode = 'between')}>Count between dates</button>
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'add'} onclick={() => (s.mode = 'add')}>Add business days</button>
		</div>

		{#if s.mode === 'between'}
			<div class="field-row">
				<Field label="From" for="bd-from"><input id="bd-from" type="date" bind:value={s.from} /></Field>
				<Field label="To" for="bd-to"><input id="bd-to" type="date" bind:value={s.to} /></Field>
			</div>

			<Result label="Business days" primary value={Math.abs(workDays).toLocaleString('en-US')} detail={`${Math.abs(calendarDays)} calendar days, ${skipped} skipped as weekends or holidays`} />

			<div class="results-grid">
				<Result label="Calendar days" value={Math.abs(calendarDays).toLocaleString('en-US')} />
				<Result label="Weekend and holiday days" value={skipped.toLocaleString('en-US')} />
				<Result label="Working weeks" value={(Math.abs(workDays) / 5).toFixed(1)} />
			</div>
		{:else}
			<div class="field-row">
				<Field label="Start date" for="bd-start"><input id="bd-start" type="date" bind:value={s.from} /></Field>
				<Field label="Business days to add" for="bd-days" hint="Negative to go backwards">
					<input id="bd-days" type="number" min="-500" max="500" bind:value={s.days} />
				</Field>
			</div>

			{#if target && fromDate}
				<Result label="Result" primary value={fmt(target)} detail={`${Math.abs(daysBetween(fromDate, target))} calendar days later`} />
			{/if}
		{/if}

		<div class="options no-print">
			<label class="check"><input type="checkbox" bind:checked={s.useHolidays} /> Skip US federal holidays</label>
			<Field label="Extra holidays (ISO dates, comma separated)" for="bd-extra">
				<input id="bd-extra" type="text" bind:value={s.extra} placeholder="2026-12-24, 2026-12-31" autocomplete="off" />
			</Field>
		</div>

		{#if fromDate && isWeekend(fromDate)}
			<Note>The start date falls on a weekend. Counting begins from the next working day.</Note>
		{/if}
	</div>

	<section class="card">
		<h2>Upcoming US federal holidays</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Holiday</th><th>Date</th><th>Falls on</th></tr></thead>
				<tbody>
					{#each upcoming as holiday (holiday.name + holiday.date.getFullYear())}
						<tr>
							<td>{holiday.name}</td>
							<td>{holiday.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
							<td class="muted">{holiday.date.toLocaleDateString('en-US', { weekday: 'long' })}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="small muted">
			Holidays falling on a weekend are usually observed on the adjacent Friday or Monday; that
			observed date is not applied automatically — add it to the extra holidays field if it matters.
		</p>
	</section>

	{#snippet explainer()}
		<p>
			Business-day counting excludes Saturdays and Sundays, and usually public holidays too. The
			count is <em>inclusive of the start date and exclusive of the end date</em>, which is the
			convention contracts and SLAs generally use.
		</p>
		<h3>Why holidays have to be supplied</h3>
		<p>
			Public holidays are national, sometimes regional, and change from year to year — Easter moves,
			UK bank holidays shift when they fall on a weekend, and some countries have holidays fixed to
			a lunar calendar. The US federal set is computed here because its rules are stable and
			algorithmic; anything else needs the extra-holidays field.
		</p>
		<h3>Rules like “within 10 business days”</h3>
		<p>
			Almost always means the tenth working day after the trigger, not counting the trigger day
			itself. Use “add business days” with the start date set to the trigger. Regulations occasionally
			define it differently, so it is worth reading the exact wording when a deadline is binding.
		</p>
	{/snippet}
</ToolShell>

<style>
	.options {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
</style>
