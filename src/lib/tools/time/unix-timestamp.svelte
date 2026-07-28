<script lang="ts">
	import { onMount } from 'svelte';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ value: '', unit: 'auto' });

	let liveNow = $state(Math.floor(Date.now() / 1000));
	onMount(() => {
		const timer = setInterval(() => (liveNow = Math.floor(Date.now() / 1000)), 1000);
		return () => clearInterval(timer);
	});

	const raw = $derived(s.value.trim());

	/**
	 * Guess the unit from magnitude: 10 digits is seconds, 13 milliseconds,
	 * 16 microseconds. Explicit selection overrides the guess.
	 */
	const detected = $derived.by(() => {
		const n = Number(raw);
		if (!raw || !Number.isFinite(n)) return 'seconds';
		const digits = Math.abs(Math.trunc(n)).toString().length;
		if (digits >= 16) return 'microseconds';
		if (digits >= 14) return 'nanoseconds';
		if (digits >= 12) return 'milliseconds';
		return 'seconds';
	});

	const unit = $derived(s.unit === 'auto' ? detected : s.unit);

	const date = $derived.by(() => {
		if (!raw) return null;
		const n = Number(raw);
		if (Number.isFinite(n)) {
			const factor = { seconds: 1000, milliseconds: 1, microseconds: 0.001, nanoseconds: 0.000001 }[unit] ?? 1000;
			const d = new Date(n * factor);
			return Number.isNaN(d.getTime()) ? null : d;
		}
		// Also accept an ISO string or anything Date can parse, for the reverse direction.
		const d = new Date(raw);
		return Number.isNaN(d.getTime()) ? null : d;
	});

	const asSeconds = $derived(date ? Math.floor(date.getTime() / 1000) : NaN);

	const rows = $derived(
		date
			? [
					{ label: 'Unix seconds', value: String(asSeconds) },
					{ label: 'Unix milliseconds', value: String(date.getTime()) },
					{ label: 'ISO 8601 (UTC)', value: date.toISOString() },
					{ label: 'RFC 2822', value: date.toUTCString() },
					{ label: 'Local time', value: date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' }) },
					{ label: 'UTC', value: date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long', timeZone: 'UTC' }) },
					{ label: 'Relative', value: relative(date) }
				]
			: []
	);

	function relative(d: Date): string {
		const diff = d.getTime() - Date.now();
		const abs = Math.abs(diff);
		const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [
			[31556952000, 'year'], [2629746000, 'month'], [604800000, 'week'],
			[86400000, 'day'], [3600000, 'hour'], [60000, 'minute'], [1000, 'second']
		];
		const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
		for (const [ms, name] of units) {
			if (abs >= ms) return rtf.format(Math.round(diff / ms), name);
		}
		return 'just now';
	}

	const NOTABLE = [
		{ label: 'Unix epoch', ts: 0 },
		{ label: 'Y2K', ts: 946684800 },
		{ label: '1 billion seconds', ts: 1000000000 },
		{ label: '32-bit signed overflow (Y2038)', ts: 2147483647 }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Timestamp or date" for="ts-value" hint="Paste a number, or an ISO date to go the other way">
				<input id="ts-value" class="mono" type="text" bind:value={s.value} placeholder={String(liveNow)} autocomplete="off" spellcheck="false" />
			</Field>
			<Field label="Interpret as" for="ts-unit">
				<select id="ts-unit" bind:value={s.unit}>
					<option value="auto">Auto ({detected})</option>
					<option value="seconds">Seconds</option>
					<option value="milliseconds">Milliseconds</option>
					<option value="microseconds">Microseconds</option>
					<option value="nanoseconds">Nanoseconds</option>
				</select>
			</Field>
		</div>

		<div class="row no-print">
			<button type="button" class="btn btn-sm" onclick={() => (s.value = String(Math.floor(Date.now() / 1000)))}>Now (seconds)</button>
			<button type="button" class="btn btn-sm" onclick={() => (s.value = String(Date.now()))}>Now (ms)</button>
			<button type="button" class="btn btn-sm" onclick={() => (s.value = new Date().toISOString())}>Now (ISO)</button>
		</div>

		{#if date}
			<Result label="Local time" primary value={date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })} detail={relative(date)} />
			<div class="results-grid">
				{#each rows as row (row.label)}
					<Result label={row.label} value={row.value} />
				{/each}
			</div>
		{:else}
			<Result label="Current Unix time" primary value={String(liveNow)} detail="Ticking live — click a button above to freeze it" />
		{/if}
	</div>

	<section class="card">
		<h2>Notable timestamps</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Moment</th><th class="num">Seconds</th><th>UTC</th></tr></thead>
				<tbody>
					{#each NOTABLE as row (row.ts)}
						<tr>
							<td><button type="button" class="pick" onclick={() => (s.value = String(row.ts))}>{row.label}</button></td>
							<td class="num">{row.ts.toLocaleString('en-US')}</td>
							<td class="muted">{new Date(row.ts * 1000).toUTCString()}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			A Unix timestamp counts seconds since 00:00:00 UTC on 1 January 1970 — the “epoch”. It is a
			single integer with no time zone, no daylight saving and no formatting ambiguity, which is why
			it is the standard way to store an instant.
		</p>
		<h3>Seconds, milliseconds, or something else</h3>
		<p>
			Unix tools and most APIs use seconds. JavaScript's <code>Date.now()</code> uses milliseconds.
			Some databases and tracing systems use microseconds or nanoseconds. The digit count gives it
			away: ten digits is seconds for any date in the current era, thirteen is milliseconds.
		</p>
		<h3>The year 2038 problem</h3>
		<p>
			A signed 32-bit integer runs out at 2,147,483,647 seconds — 03:14:07 UTC on 19 January 2038 —
			after which it wraps to 1901. Most systems have moved to 64-bit time, but embedded devices and
			old file formats have not, and the migration is genuinely ongoing.
		</p>
		<h3>Leap seconds</h3>
		<p>
			Unix time deliberately ignores leap seconds: it always assumes exactly 86,400 seconds per day.
			That makes date arithmetic simple and means Unix time is not, strictly, a count of elapsed SI
			seconds since the epoch — it is off by the number of leap seconds inserted since 1972.
		</p>
	{/snippet}
</ToolShell>

<style>
	.pick {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	.pick:hover {
		color: var(--accent);
		text-decoration: underline;
	}
</style>
