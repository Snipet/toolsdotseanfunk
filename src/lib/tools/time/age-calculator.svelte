<script lang="ts">
	import { calendarDiff, daysBetween, isoDate, parseIsoDate } from '$lib/math/dates';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ birth: '1990-06-15', on: isoDate(new Date()) });

	const birthDate = $derived(parseIsoDate(s.birth));
	const onDate = $derived(parseIsoDate(s.on));
	const valid = $derived(Boolean(birthDate && onDate && birthDate! <= onDate!));

	const age = $derived(valid ? calendarDiff(birthDate!, onDate!) : null);
	const totalDays = $derived(valid ? daysBetween(birthDate!, onDate!) : 0);

	/** Next birthday, accounting for 29 February birthdays in common years. */
	const nextBirthday = $derived.by(() => {
		if (!birthDate || !onDate) return null;
		let year = onDate.getFullYear();
		let next = new Date(year, birthDate.getMonth(), birthDate.getDate());
		if (next.getMonth() !== birthDate.getMonth()) next = new Date(year, birthDate.getMonth() + 1, 0);
		if (next < onDate) {
			year++;
			next = new Date(year, birthDate.getMonth(), birthDate.getDate());
			if (next.getMonth() !== birthDate.getMonth()) next = new Date(year, birthDate.getMonth() + 1, 0);
		}
		return next;
	});

	const daysToBirthday = $derived(nextBirthday && onDate ? daysBetween(onDate, nextBirthday) : 0);

	// Korean age: everyone is 1 at birth and gains a year each 1 January.
	const koreanAge = $derived(
		valid ? onDate!.getFullYear() - birthDate!.getFullYear() + 1 : 0
	);

	const halfBirthday = $derived.by(() => {
		if (!birthDate) return null;
		const d = new Date(birthDate);
		d.setMonth(d.getMonth() + 6);
		return d;
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Date of birth" for="ag-birth"><input id="ag-birth" type="date" bind:value={s.birth} /></Field>
			<Field label="Age on" for="ag-on" hint="Defaults to today"><input id="ag-on" type="date" bind:value={s.on} /></Field>
		</div>

		{#if age && valid}
			<Result
				label="Age"
				primary
				value={`${age.years} year${age.years === 1 ? '' : 's'}, ${age.months} month${age.months === 1 ? '' : 's'}, ${age.days} day${age.days === 1 ? '' : 's'}`}
				detail={`Born on a ${birthDate!.toLocaleDateString('en-US', { weekday: 'long' })}`}
			/>

			<div class="results-grid">
				<Result label="In months" value={age.totalMonths.toLocaleString('en-US')} />
				<Result label="In weeks" value={Math.floor(totalDays / 7).toLocaleString('en-US')} />
				<Result label="In days" value={totalDays.toLocaleString('en-US')} />
				<Result label="In hours" value={(totalDays * 24).toLocaleString('en-US')} />
				<Result label="Next birthday" value={nextBirthday ? nextBirthday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—'} detail={daysToBirthday === 0 ? 'Today!' : `${daysToBirthday} days away`} />
				<Result label="Turning" value={`${age.years + 1}`} />
				<Result label="Half birthday" value={halfBirthday ? halfBirthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '—'} />
				<Result label="Korean age" value={String(koreanAge)} detail="Everyone is 1 at birth, +1 each new year" />
			</div>
		{:else}
			<p class="muted">Enter a birth date on or before the comparison date.</p>
		{/if}
	</div>

	{#snippet explainer()}
		<p>
			Age is the calendar difference between two dates, expressed in years, months and days. The
			only subtlety is what happens when the day of the month does not exist in the target month.
		</p>
		<h3>29 February birthdays</h3>
		<p>
			In a common year there is no 29 February, so a leapling's birthday falls on 28 February by
			most conventions — which is what this tool uses for the “next birthday” date. Legally it
			varies: some jurisdictions specify 28 February, others 1 March.
		</p>
		<h3>Korean age</h3>
		<p>
			Traditional East Asian age reckoning counted a newborn as one year old and added a year at
			each lunar new year, making someone born in December two years old within weeks. South Korea
			formally moved to international age reckoning in June 2023, though the traditional count is
			still used socially.
		</p>
		<h3>Age on a specific date</h3>
		<p>
			Setting the second field to a future or past date answers questions like “how old will they be
			at the wedding” or “was she 18 when the contract was signed” — the second being the reason
			this is a surprisingly common legal query.
		</p>
	{/snippet}
</ToolShell>
