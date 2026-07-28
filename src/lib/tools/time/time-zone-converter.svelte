<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	const ZONES = [
		'Pacific/Auckland', 'Australia/Sydney', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai',
		'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/Moscow',
		'Europe/Istanbul', 'Africa/Johannesburg', 'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid',
		'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/London', 'Europe/Dublin', 'Europe/Lisbon',
		'Africa/Lagos', 'Africa/Cairo', 'America/Sao_Paulo', 'America/New_York', 'America/Toronto',
		'America/Chicago', 'America/Mexico_City', 'America/Denver', 'America/Phoenix',
		'America/Los_Angeles', 'America/Vancouver', 'America/Anchorage', 'Pacific/Honolulu', 'UTC'
	];

	const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');

	const s = urlState({
		date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
		time: `${pad(now.getHours())}:00`,
		base: ZONES.includes(localZone) ? localZone : 'UTC',
		zones: 'America/New_York,Europe/London,Asia/Tokyo'
	});

	const selected = $derived(s.zones.split(',').filter(Boolean));

	/**
	 * Interpret "wall clock time in zone Z" as an absolute instant.
	 * Search for the UTC instant whose rendering in Z matches the input —
	 * two passes converge because the offset is locally constant.
	 */
	const instant = $derived.by(() => {
		const [y, mo, d] = s.date.split('-').map(Number);
		const [h, mi] = s.time.split(':').map(Number);
		if (![y, mo, d, h, mi].every(Number.isFinite)) return null;

		let guess = Date.UTC(y, mo - 1, d, h, mi);
		for (let i = 0; i < 3; i++) {
			const rendered = partsIn(new Date(guess), s.base);
			const renderedUtc = Date.UTC(rendered.year, rendered.month - 1, rendered.day, rendered.hour, rendered.minute);
			const delta = Date.UTC(y, mo - 1, d, h, mi) - renderedUtc;
			if (delta === 0) break;
			guess += delta;
		}
		return new Date(guess);
	});

	function partsIn(date: Date, zone: string) {
		const fmt = new Intl.DateTimeFormat('en-US', {
			timeZone: zone,
			year: 'numeric', month: '2-digit', day: '2-digit',
			hour: '2-digit', minute: '2-digit', hour12: false
		});
		const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
		return {
			year: Number(parts.year),
			month: Number(parts.month),
			day: Number(parts.day),
			hour: Number(parts.hour) % 24,
			minute: Number(parts.minute)
		};
	}

	function render(date: Date, zone: string) {
		const parts = partsIn(date, zone);
		const label = new Intl.DateTimeFormat('en-US', {
			timeZone: zone, weekday: 'short', month: 'short', day: 'numeric'
		}).format(date);
		const abbrev = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
			.formatToParts(date)
			.find((p) => p.type === 'timeZoneName')?.value ?? '';
		const offsetMinutes =
			(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - date.getTime()) / 60000;
		return {
			hour: parts.hour,
			time: `${pad(parts.hour)}:${pad(parts.minute)}`,
			label,
			abbrev,
			offset: `UTC${offsetMinutes >= 0 ? '+' : '−'}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`
		};
	}

	const rows = $derived(
		instant ? [s.base, ...selected.filter((z) => z !== s.base)].map((zone) => ({ zone, ...render(instant, zone) })) : []
	);

	/** Working-hours overlay: 24 columns per zone, 9–17 highlighted. */
	const grid = $derived.by(() => {
		if (!instant) return [];
		return rows.map((row) => ({
			zone: row.zone,
			cells: Array.from({ length: 24 }, (_, i) => {
				const shifted = new Date(instant.getTime() + (i - row.hour) * 3600000);
				const hour = partsIn(shifted, row.zone).hour;
				return { hour, working: hour >= 9 && hour < 18, current: i === row.hour };
			})
		}));
	});

	function toggleZone(zone: string) {
		const set = new Set(selected);
		if (set.has(zone)) set.delete(zone);
		else set.add(zone);
		s.zones = [...set].join(',');
	}

	const summary = () => rows.map((r) => `${r.zone.split('/').pop()?.replace(/_/g, ' ')}: ${r.time} ${r.abbrev} (${r.label})`).join('\n');
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Date" for="tz-date"><input id="tz-date" type="date" bind:value={s.date} /></Field>
			<Field label="Time" for="tz-time"><input id="tz-time" type="time" bind:value={s.time} /></Field>
			<Field label="In this zone" for="tz-base">
				<select id="tz-base" bind:value={s.base}>
					{#each ZONES as zone (zone)}<option value={zone}>{zone.replace(/_/g, ' ')}</option>{/each}
				</select>
			</Field>
		</div>

		<div class="row no-print">
			<button type="button" class="btn btn-sm" onclick={() => { const n = new Date(); s.date = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; s.time = `${pad(n.getHours())}:${pad(n.getMinutes())}`; s.base = ZONES.includes(localZone) ? localZone : 'UTC'; }}>
				<Icon name="reset" size={14} /> Right now, here
			</button>
			{#if rows.length}<CopyButton value={summary} label="Copy all times" />{/if}
		</div>

		{#if rows.length}
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th>Zone</th><th class="num">Time</th><th>Date</th><th>Abbrev</th><th>Offset</th></tr></thead>
					<tbody>
						{#each rows as row, i (row.zone)}
							<tr class:base={i === 0}>
								<td>{row.zone.split('/').pop()?.replace(/_/g, ' ')} <span class="small muted">{row.zone.split('/')[0]}</span></td>
								<td class="num big">{row.time}</td>
								<td>{row.label}</td>
								<td class="muted">{row.abbrev}</td>
								<td class="muted num">{row.offset}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	{#if grid.length}
		<section class="card">
			<h2>Working-hours overlap</h2>
			<p class="small muted">Shaded blocks are 09:00–18:00 local. Look for a column shaded everywhere.</p>
			<div class="scroll-x">
				<div class="grid">
					{#each grid as row (row.zone)}
						<div class="grid-row">
							<span class="grid-label">{row.zone.split('/').pop()?.replace(/_/g, ' ')}</span>
							<div class="cells">
								{#each row.cells as cell, i (i)}
									<span class="cell" class:working={cell.working} class:current={cell.current} title="{pad(cell.hour)}:00">
										{cell.hour === 0 || cell.hour === 12 ? cell.hour : ''}
									</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<section class="card">
		<h2>Add zones</h2>
		<div class="zone-picker">
			{#each ZONES as zone (zone)}
				<button type="button" class="zone-chip" class:active={selected.includes(zone)} onclick={() => toggleZone(zone)}>
					{zone.split('/').pop()?.replace(/_/g, ' ')}
				</button>
			{/each}
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Time zones are political, not astronomical. Offsets change with daylight saving, governments
			revise them, and some are not whole hours — India is UTC+05:30, Nepal UTC+05:45, and the
			Chatham Islands UTC+12:45.
		</p>
		<h3>Why this uses zone names, not offsets</h3>
		<p>
			“UTC−5” is not the same as “New York”. New York is UTC−5 in winter and UTC−4 in summer, and the
			switch dates differ from Europe's by several weeks — so for two weeks each spring and autumn,
			the London-to-New-York gap is four hours rather than five. Using IANA zone identifiers means
			the browser's own time-zone database resolves all of that correctly for any date you pick.
		</p>
		<h3>Scheduling across zones</h3>
		<p>
			The overlap grid shows where everyone's working day intersects. When no column is shaded
			everywhere, someone is taking an early or late call — better to know that while scheduling
			than to discover it in the invite. For recurring meetings, remember that the overlap shifts
			when one region's clocks change and the other's do not.
		</p>
		<h3>UTC never changes</h3>
		<p>
			Coordinated Universal Time has no daylight saving, which is why logs, APIs and aviation use it.
			If you are storing a timestamp, store UTC and convert on display.
		</p>
	{/snippet}
</ToolShell>

<style>
	tr.base {
		background: var(--accent-soft);
	}
	td.big {
		font-size: 1.1rem;
		font-weight: 650;
	}
	.grid {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-top: 0.75rem;
		min-width: 560px;
	}
	.grid-row {
		display: grid;
		grid-template-columns: 130px 1fr;
		gap: 0.5rem;
		align-items: center;
	}
	.grid-label {
		font-size: 0.82rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cells {
		display: grid;
		grid-template-columns: repeat(24, 1fr);
		gap: 1px;
	}
	.cell {
		height: 24px;
		background: var(--bg-sunken);
		display: grid;
		place-items: center;
		font-size: 0.62rem;
		color: var(--text-faint);
		border-radius: 2px;
	}
	.cell.working {
		background: color-mix(in srgb, var(--positive) 45%, transparent);
		color: var(--text);
	}
	.cell.current {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}
	.zone-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.75rem;
	}
	.zone-chip {
		padding: 0.25rem 0.6rem;
		font-size: 0.82rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg-raised);
		cursor: pointer;
		color: var(--text-muted);
	}
	.zone-chip:hover {
		border-color: var(--accent-border);
	}
	.zone-chip.active {
		background: var(--accent-soft);
		border-color: var(--accent-border);
		color: var(--accent);
		font-weight: 550;
	}
</style>
