<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ expr: '*/15 9-17 * * 1-5' });

	const FIELDS = [
		{ name: 'minute', min: 0, max: 59 },
		{ name: 'hour', min: 0, max: 23 },
		{ name: 'day of month', min: 1, max: 31 },
		{ name: 'month', min: 1, max: 12 },
		{ name: 'day of week', min: 0, max: 6 }
	];

	const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	const NAMED: Record<string, string> = {
		'@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *',
		'@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *'
	};

	const normalised = $derived(NAMED[s.expr.trim().toLowerCase()] ?? s.expr.trim());
	const parts = $derived(normalised.split(/\s+/).filter(Boolean));

	/** Expand one cron field into the set of values it matches. */
	function expand(spec: string, min: number, max: number): number[] | null {
		const out = new Set<number>();
		for (const chunk of spec.split(',')) {
			const [range, stepText] = chunk.split('/');
			const step = stepText === undefined ? 1 : Number(stepText);
			if (!Number.isInteger(step) || step < 1) return null;

			let lo: number;
			let hi: number;
			if (range === '*') {
				lo = min;
				hi = max;
			} else if (range.includes('-')) {
				const [a, b] = range.split('-').map(Number);
				if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
				lo = a;
				hi = b;
			} else {
				const v = Number(range);
				if (!Number.isInteger(v)) return null;
				lo = v;
				hi = stepText === undefined ? v : max;
			}
			if (lo < min || hi > max || lo > hi) return null;
			for (let v = lo; v <= hi; v += step) out.add(v);
		}
		return [...out].sort((a, b) => a - b);
	}

	const expanded = $derived(
		parts.length === 5 ? FIELDS.map((f, i) => expand(parts[i], f.min, f.max)) : null
	);
	const valid = $derived(Boolean(expanded && expanded.every((x) => x !== null && x.length)));

	function describeList(values: number[], all: number, formatter: (v: number) => string): string {
		if (values.length === all) return 'every';
		if (values.length === 1) return formatter(values[0]);
		if (values.length > 6) return `${values.length} values`;
		return values.map(formatter).join(', ');
	}

	const description = $derived.by(() => {
		if (!valid || !expanded) return 'Not a valid five-field cron expression.';
		const [minutes, hours, doms, months, dows] = expanded as number[][];

		const timeText =
			minutes.length === 60 && hours.length === 24
				? 'Every minute'
				: hours.length === 24
					? `At minute ${describeList(minutes, 60, String)} of every hour`
					: minutes.length === 1 && hours.length <= 6
						? `At ${hours.map((h) => `${String(h).padStart(2, '0')}:${String(minutes[0]).padStart(2, '0')}`).join(', ')}`
						: `At minute ${describeList(minutes, 60, String)} past hour ${describeList(hours, 24, String)}`;

		const dayText =
			doms.length === 31 && dows.length === 7
				? 'every day'
				: dows.length < 7 && doms.length === 31
					? `on ${describeList(dows, 7, (d) => DAYS[d % 7])}`
					: doms.length < 31 && dows.length === 7
						? `on day ${describeList(doms, 31, String)} of the month`
						: `on day ${describeList(doms, 31, String)} of the month and on ${describeList(dows, 7, (d) => DAYS[d % 7])}`;

		const monthText = months.length === 12 ? '' : `, in ${describeList(months, 12, (m) => MONTHS[m - 1])}`;

		return `${timeText}, ${dayText}${monthText}.`;
	});

	/** Next run times, found by scanning minute by minute. */
	const nextRuns = $derived.by(() => {
		if (!valid || !expanded) return [];
		const [minutes, hours, doms, months, dows] = expanded as number[][];
		const sets = [new Set(minutes), new Set(hours), new Set(doms), new Set(months), new Set(dows.map((d) => d % 7))];

		const out: Date[] = [];
		const cursor = new Date();
		cursor.setSeconds(0, 0);
		cursor.setMinutes(cursor.getMinutes() + 1);

		// A year of minutes is the worst case for a valid expression.
		for (let i = 0; i < 527040 && out.length < 6; i++) {
			const domMatch = sets[2].has(cursor.getDate());
			const dowMatch = sets[4].has(cursor.getDay());
			// Cron's quirk: when both day fields are restricted, either may match.
			const dayOk =
				doms.length === 31 || dows.length === 7 ? domMatch && dowMatch : domMatch || dowMatch;

			if (sets[0].has(cursor.getMinutes()) && sets[1].has(cursor.getHours()) && sets[3].has(cursor.getMonth() + 1) && dayOk) {
				out.push(new Date(cursor));
			}
			cursor.setMinutes(cursor.getMinutes() + 1);
		}
		return out;
	});

	const PRESETS = [
		{ label: 'Every minute', expr: '* * * * *' },
		{ label: 'Every 15 minutes', expr: '*/15 * * * *' },
		{ label: 'Hourly', expr: '0 * * * *' },
		{ label: 'Daily at 3am', expr: '0 3 * * *' },
		{ label: 'Weekdays at 9am', expr: '0 9 * * 1-5' },
		{ label: 'Every Monday', expr: '0 0 * * 1' },
		{ label: 'First of the month', expr: '0 0 1 * *' },
		{ label: 'Business hours, quarter-hourly', expr: '*/15 9-17 * * 1-5' }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="expr-row">
			<Field label="Cron expression" for="cr-expr" error={!valid && s.expr.trim() ? 'Not a valid five-field expression' : undefined}>
				<input id="cr-expr" class="mono expr" type="text" bind:value={s.expr} autocomplete="off" spellcheck="false" />
			</Field>
			<CopyButton value={() => normalised} label="Copy" />
		</div>

		<Result label="In English" primary value={description} tone={valid ? 'neutral' : 'negative'} copyable={valid} />

		{#if valid && expanded}
			<div class="fields">
				{#each FIELDS as field, i (field.name)}
					<div class="field-chip">
						<span class="chip-name">{field.name}</span>
						<span class="chip-value mono">{parts[i]}</span>
						<span class="chip-count small muted">{(expanded[i] as number[]).length} value{(expanded[i] as number[]).length === 1 ? '' : 's'}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if nextRuns.length}
		<section class="card">
			<h2>Next runs</h2>
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th class="num">#</th><th>Local time</th><th>Relative</th></tr></thead>
					<tbody>
						{#each nextRuns as run, i (i)}
							<tr>
								<td class="num">{i + 1}</td>
								<td>{run.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
								<td class="muted">
									{(() => {
										const mins = Math.round((run.getTime() - Date.now()) / 60000);
										if (mins < 60) return `in ${mins} min`;
										if (mins < 1440) return `in ${Math.round(mins / 60)} h`;
										return `in ${Math.round(mins / 1440)} days`;
									})()}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="small muted">Computed in your local time zone. Servers usually run cron in UTC.</p>
		</section>
	{/if}

	<section class="card">
		<h2>Presets</h2>
		<div class="presets">
			{#each PRESETS as preset (preset.expr)}
				<button type="button" class="preset" class:active={normalised === preset.expr} onclick={() => (s.expr = preset.expr)}>
					<span>{preset.label}</span>
					<code>{preset.expr}</code>
				</button>
			{/each}
		</div>
	</section>

	{#snippet explainer()}
		<p>
			A cron expression is five space-separated fields, each describing when a job should fire.
		</p>
		<code class="formula">┌───────── minute       (0–59)
│ ┌─────── hour         (0–23)
│ │ ┌───── day of month (1–31)
│ │ │ ┌─── month        (1–12)
│ │ │ │ ┌─ day of week  (0–6, Sunday = 0)
│ │ │ │ │
* * * * *</code>
		<h3>The syntax</h3>
		<dl>
			<dt><code>*</code></dt><dd>Every value.</dd>
			<dt><code>5</code></dt><dd>Exactly that value.</dd>
			<dt><code>1-5</code></dt><dd>An inclusive range.</dd>
			<dt><code>*/15</code></dt><dd>Every 15th value, starting from the field minimum.</dd>
			<dt><code>1,15,30</code></dt><dd>A list.</dd>
			<dt><code>9-17/2</code></dt><dd>Every second value within a range.</dd>
		</dl>
		<h3>The day-of-week trap</h3>
		<p>
			When <em>both</em> day-of-month and day-of-week are restricted, cron runs the job if
			<strong>either</strong> matches — not both. So <code>0 0 1 * 1</code> fires on the 1st of the
			month <em>and</em> on every Monday. If you want an “and”, you generally need to check the
			condition inside the job itself.
		</p>
		<h3>Time zones and DST</h3>
		<p>
			Cron uses the server's local time zone, which on most servers is UTC. Where it is not, a job
			scheduled at 02:30 may run twice or not at all on the day the clocks change. Scheduling in UTC
			avoids the whole problem.
		</p>
		<h3>Shorthands</h3>
		<p>
			Most implementations accept <code>@hourly</code>, <code>@daily</code>, <code>@weekly</code>,
			<code>@monthly</code> and <code>@yearly</code>. These are expanded above.
		</p>
	{/snippet}
</ToolShell>

<style>
	.expr-row {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
	}
	.expr-row :global(.field) {
		flex: 1;
	}
	.expr {
		font-size: 1.05rem;
		letter-spacing: 0.05em;
	}
	.fields {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
	}
	.field-chip {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.5rem 0.7rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	.chip-name {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		font-weight: 600;
	}
	.chip-value {
		font-size: 1rem;
		font-weight: 600;
	}
	.presets {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		margin-top: 0.75rem;
	}
	.preset {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		align-items: flex-start;
		padding: 0.6rem 0.75rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		font-size: 0.88rem;
	}
	.preset:hover {
		border-color: var(--accent-border);
	}
	.preset.active {
		background: var(--accent-soft);
		border-color: var(--accent-border);
	}
	.preset code {
		font-size: 0.78rem;
		color: var(--text-muted);
	}
</style>
