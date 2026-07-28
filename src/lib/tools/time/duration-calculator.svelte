<script lang="ts">
	import { clock, fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	interface Entry {
		id: number;
		text: string;
		sign: 1 | -1;
	}

	let nextId = 4;
	let entries = $state<Entry[]>([
		{ id: 1, text: '1:23:45', sign: 1 },
		{ id: 2, text: '0:45:30', sign: 1 },
		{ id: 3, text: '0:15:00', sign: -1 }
	]);

	/** Parse "1:23:45", "23:45", "90" (minutes) or "1h 30m" into seconds. */
	function parseDuration(text: string): number {
		const clean = text.trim().toLowerCase();
		if (!clean) return 0;

		const hms = /^(\d+):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?$/.exec(clean);
		if (hms) {
			return hms[3] !== undefined
				? Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3])
				: Number(hms[1]) * 60 + Number(hms[2]);
		}

		const units = /(\d+(?:\.\d+)?)\s*(h|hr|hours?|m|min|minutes?|s|sec|seconds?)/g;
		let total = 0;
		let matched = false;
		let match: RegExpExecArray | null;
		while ((match = units.exec(clean))) {
			matched = true;
			const value = Number(match[1]);
			const unit = match[2][0];
			total += unit === 'h' ? value * 3600 : unit === 'm' ? value * 60 : value;
		}
		if (matched) return total;

		const bare = Number(clean);
		return Number.isFinite(bare) ? bare * 60 : 0;
	}

	const parsed = $derived(entries.map((e) => ({ ...e, seconds: parseDuration(e.text) * e.sign })));
	const total = $derived(parsed.reduce((sum, e) => sum + e.seconds, 0));

	function add() {
		entries = [...entries, { id: nextId++, text: '', sign: 1 }];
	}
	function remove(id: number) {
		entries = entries.filter((e) => e.id !== id);
	}
	function flip(id: number) {
		entries = entries.map((e) => (e.id === id ? { ...e, sign: (e.sign === 1 ? -1 : 1) as 1 | -1 } : e));
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<p class="small muted">
			Accepts <code>1:23:45</code>, <code>23:45</code>, <code>1h 30m</code>, or a bare number of
			minutes. Use the ± button to subtract.
		</p>

		<div class="entries">
			{#each entries as entry, i (entry.id)}
				<div class="entry">
					<button type="button" class="btn btn-sm sign" class:minus={entry.sign === -1} onclick={() => flip(entry.id)} aria-label="Toggle add or subtract">
						{entry.sign === 1 ? '+' : '−'}
					</button>
					<input type="text" class="mono" bind:value={entry.text} placeholder="0:00:00" aria-label="Duration {i + 1}" autocomplete="off" />
					<span class="parsed small muted num">{clock(Math.abs(parsed[i]?.seconds ?? 0), true)}</span>
					<button type="button" class="btn btn-sm btn-ghost" onclick={() => remove(entry.id)} disabled={entries.length <= 1} aria-label="Remove duration {i + 1}">
						<Icon name="trash" size={15} />
					</button>
				</div>
			{/each}
		</div>

		<button type="button" class="btn btn-sm no-print" onclick={add}><Icon name="plus" size={15} /> Add another</button>

		<Result label="Total" primary value={clock(total, true)} tone={total < 0 ? 'negative' : 'neutral'} detail={total < 0 ? 'Negative — you subtracted more than you added' : undefined} />

		<div class="results-grid">
			<Result label="In hours" value={fmtLoose(total / 3600, 4)} detail="Decimal hours, for timesheets" />
			<Result label="In minutes" value={fmtLoose(total / 60, 2)} />
			<Result label="In seconds" value={fmtLoose(total, 0)} />
			<Result label="In days" value={fmtLoose(total / 86400, 4)} />
		</div>
	</div>

	{#snippet explainer()}
		<p>
			Durations are base-60, which is why adding them by hand goes wrong so often — 45 minutes plus
			30 minutes is 1:15, not 0:75. Everything here is converted to seconds, summed, then formatted
			back.
		</p>
		<h3>Decimal hours for timesheets</h3>
		<p>
			Payroll systems almost always want decimal hours, not hours and minutes: 7 hours 45 minutes is
			7.75, not 7.45. That conversion is the single most common source of payroll disputes, and it is
			the second result above.
		</p>
		<h3>What the parser accepts</h3>
		<dl>
			<dt><code>1:23:45</code></dt><dd>Hours, minutes, seconds.</dd>
			<dt><code>23:45</code></dt><dd>Minutes and seconds — two parts are always read as m:s.</dd>
			<dt><code>1h 30m</code></dt><dd>Unit suffixes, in any order.</dd>
			<dt><code>90</code></dt><dd>A bare number is read as minutes.</dd>
		</dl>
		<h3>Video and audio work</h3>
		<p>
			For frame-accurate work, seconds are not enough — you need the frame rate, since 00:00:01;00 at
			29.97 fps drop-frame is not one second of wall clock. Use a timecode calculator for that.
		</p>
	{/snippet}
</ToolShell>

<style>
	.entries {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.entry {
		display: grid;
		grid-template-columns: 44px 1fr 90px auto;
		gap: 0.5rem;
		align-items: center;
	}
	.sign {
		font-size: 1.1rem;
		font-weight: 700;
		min-width: 0;
	}
	.sign.minus {
		color: var(--negative);
		border-color: color-mix(in srgb, var(--negative) 40%, var(--border-strong));
	}
	.parsed {
		text-align: right;
	}
</style>
