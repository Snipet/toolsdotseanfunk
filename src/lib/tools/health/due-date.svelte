<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const today = new Date();
	const iso = (d: Date) => d.toISOString().slice(0, 10);

	const s = urlState({ method: 'lmp', date: iso(new Date(today.getTime() - 60 * 86400000)), cycle: 28 });

	const startDate = $derived(new Date(`${s.date}T00:00:00`));
	const valid = $derived(!Number.isNaN(startDate.getTime()));

	/**
	 * Naegele's rule: due date is 280 days after the last menstrual period,
	 * adjusted when the cycle is not 28 days. From conception it is 266 days.
	 */
	const dueDate = $derived.by(() => {
		if (!valid) return null;
		const days = s.method === 'lmp' ? 280 + (s.cycle - 28) : 266;
		return new Date(startDate.getTime() + days * 86400000);
	});

	const conceptionDate = $derived(
		valid && dueDate ? new Date(dueDate.getTime() - 266 * 86400000) : null
	);

	const daysPregnant = $derived(
		valid && dueDate ? Math.floor((today.getTime() - (dueDate.getTime() - 280 * 86400000)) / 86400000) : 0
	);
	const weeks = $derived(Math.floor(daysPregnant / 7));
	const extraDays = $derived(daysPregnant % 7);
	const daysRemaining = $derived(dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / 86400000) : 0);

	const trimester = $derived(weeks < 13 ? 'First' : weeks < 27 ? 'Second' : 'Third');

	const fmtDate = (d: Date) =>
		d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

	const MILESTONES = [
		{ week: 12, label: 'End of the first trimester' },
		{ week: 20, label: 'Halfway — anatomy scan around now' },
		{ week: 24, label: 'Viability threshold' },
		{ week: 28, label: 'Third trimester begins' },
		{ week: 37, label: 'Full term begins' },
		{ week: 40, label: 'Due date' },
		{ week: 42, label: 'Post-term' }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Calculate from" for="dd-method">
				<select id="dd-method" bind:value={s.method}>
					<option value="lmp">First day of last period</option>
					<option value="conception">Known conception date</option>
				</select>
			</Field>
			<Field label="Date" for="dd-date"><input id="dd-date" type="date" bind:value={s.date} /></Field>
			{#if s.method === 'lmp'}
				<Field label="Average cycle length (days)" for="dd-cycle" hint="28 is the standard assumption">
					<input id="dd-cycle" type="number" min="20" max="45" bind:value={s.cycle} />
				</Field>
			{/if}
		</div>

		{#if dueDate}
			<Result label="Estimated due date" primary value={fmtDate(dueDate)} detail={daysRemaining > 0 ? `${daysRemaining} days away` : `${-daysRemaining} days past`} />

			<div class="results-grid">
				<Result label="How far along" value={daysPregnant >= 0 ? `${weeks} weeks ${extraDays} day${extraDays === 1 ? '' : 's'}` : 'Not yet'} detail={daysPregnant >= 0 ? `${trimester} trimester` : undefined} />
				<Result label="Estimated conception" value={conceptionDate ? conceptionDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'} />
				<Result label="Full term begins" value={new Date(dueDate.getTime() - 21 * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} detail="37 weeks" />
			</div>
		{/if}

		<Note tone="warning">
			Only about 4% of babies arrive on their due date, and roughly 80% arrive within two weeks
			either side. Ultrasound dating in the first trimester is more accurate than any calculation
			from dates, and is what your clinician will use.
		</Note>
	</div>

	{#if dueDate}
		<section class="card">
			<h2>Milestones</h2>
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th class="num">Week</th><th>Milestone</th><th class="num">Date</th></tr></thead>
					<tbody>
						{#each MILESTONES as m (m.week)}
							{@const date = new Date(dueDate.getTime() - (40 - m.week) * 7 * 86400000)}
							<tr class:past={date < today}>
								<td class="num">{m.week}</td>
								<td>{m.label}</td>
								<td class="num">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			Pregnancy is dated from the first day of the last menstrual period, not from conception —
			which means the first two weeks of a “pregnancy” precede it. That convention exists because
			the period is a date people can report reliably and ovulation is not.
		</p>
		<code class="formula">Naegele's rule: due date = LMP + 280 days
                (adjusted by cycle length − 28)
From conception: due date = conception + 266 days</code>
		<h3>Cycle length matters</h3>
		<p>
			Naegele's rule assumes ovulation on day 14 of a 28-day cycle. Someone with a 35-day cycle
			typically ovulates around day 21, pushing the due date a week later. This calculator adjusts
			for that; many do not.
		</p>
		<h3>Term is a range, not a date</h3>
		<p>
			Since 2013, obstetric guidance has split the old “term” into early term (37–38 weeks), full
			term (39–40), late term (41) and post-term (42+). Outcomes are best in the full-term window,
			which is why elective delivery before 39 weeks is now discouraged without a medical reason.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Naegele's rule as described in standard obstetric practice; term definitions from the
			<strong>American College of Obstetricians and Gynecologists</strong> (ACOG) Committee Opinion
			579, reaffirmed. This is an educational estimate — clinical dating supersedes it.
		</p>
	{/snippet}
</ToolShell>

<style>
	tr.past {
		color: var(--text-faint);
	}
</style>
