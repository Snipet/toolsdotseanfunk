<script lang="ts">
	import { currency, fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ amount: 75000, period: 'year', hoursPerWeek: 40, weeksPerYear: 52, vacationDays: 0 });

	const paidWeeks = $derived(s.weeksPerYear);
	// Unpaid days off reduce the hours worked but not the annual salary.
	const workedWeeks = $derived(Math.max(0.1, s.weeksPerYear - s.vacationDays / 5));
	const annualHours = $derived(s.hoursPerWeek * workedWeeks);

	const annual = $derived.by(() => {
		switch (s.period) {
			case 'hour': return s.amount * annualHours;
			case 'day': return s.amount * (workedWeeks * 5);
			case 'week': return s.amount * paidWeeks;
			case 'biweek': return s.amount * 26;
			case 'semimonth': return s.amount * 24;
			case 'month': return s.amount * 12;
			default: return s.amount;
		}
	});

	const rows = $derived([
		{ label: 'Hourly', value: annualHours > 0 ? annual / annualHours : NaN, note: `${fmtLoose(annualHours, 0)} hours a year` },
		{ label: 'Daily', value: annual / (workedWeeks * 5), note: `${fmtLoose(workedWeeks * 5, 0)} working days` },
		{ label: 'Weekly', value: annual / paidWeeks },
		{ label: 'Every two weeks', value: annual / 26, note: '26 pay periods' },
		{ label: 'Twice a month', value: annual / 24, note: '24 pay periods' },
		{ label: 'Monthly', value: annual / 12 },
		{ label: 'Annually', value: annual }
	]);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Amount" for="sc-amount"><input id="sc-amount" type="number" min="0" step="100" bind:value={s.amount} /></Field>
			<Field label="Per" for="sc-period">
				<select id="sc-period" bind:value={s.period}>
					<option value="hour">Hour</option>
					<option value="day">Day</option>
					<option value="week">Week</option>
					<option value="biweek">Two weeks</option>
					<option value="semimonth">Half month</option>
					<option value="month">Month</option>
					<option value="year">Year</option>
				</select>
			</Field>
			<Field label="Hours per week" for="sc-hours"><input id="sc-hours" type="number" min="1" max="100" step="0.5" bind:value={s.hoursPerWeek} /></Field>
			<Field label="Unpaid days off per year" for="sc-vac" hint="Leave at 0 for salaried"><input id="sc-vac" type="number" min="0" max="120" bind:value={s.vacationDays} /></Field>
		</div>

		<div class="results-grid">
			{#each rows as row (row.label)}
				<Result
					label={row.label}
					primary={row.label === 'Annually' || row.label === 'Hourly'}
					value={Number.isFinite(row.value) ? currency(row.value) : '—'}
					detail={row.note}
				/>
			{/each}
		</div>
	</div>

	{#snippet explainer()}
		<p>
			Converting pay between periods is arithmetic, but the assumptions matter more than the maths.
			The two that trip people up are how many hours a year count as full-time, and how many pay
			periods there are.
		</p>
		<code class="formula">annual = hourly × hours per week × weeks per year
hourly = annual ÷ (hours per week × weeks worked)</code>
		<h3>2,080 hours</h3>
		<p>
			40 hours × 52 weeks is the standard US full-time year, which makes the shortcut “halve the
			hourly rate and read it as thousands” remarkably accurate: $25/hour ≈ $52,000. In the UK and
			much of Europe, statutory leave is paid, so the salary is unchanged but the hours worked are
			fewer — and the effective hourly rate is correspondingly higher.
		</p>
		<h3>Biweekly is not the same as twice a month</h3>
		<p>
			Paid every two weeks gives 26 cheques a year; paid on the 1st and 15th gives 24. The annual
			total is identical, but the individual cheques differ by about 8% — and biweekly pay produces
			two “three-cheque months” a year, which is a budgeting quirk worth planning around.
		</p>
		<h3>This is gross pay</h3>
		<p>
			Income tax, national insurance or FICA, pension contributions and health premiums all come out
			before you see it. Total compensation also includes employer pension matching, insurance and
			bonuses, which can add 20–30% on top of the salary line.
		</p>
	{/snippet}
</ToolShell>
