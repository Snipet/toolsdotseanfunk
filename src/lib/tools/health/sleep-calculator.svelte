<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ mode: 'wake', time: '07:00', latency: 15, cycleMinutes: 90 });

	const parsed = $derived.by(() => {
		const [h, m] = s.time.split(':').map(Number);
		return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
	});

	const fmtTime = (minutes: number) => {
		const wrapped = ((minutes % 1440) + 1440) % 1440;
		const h = Math.floor(wrapped / 60);
		const m = Math.round(wrapped % 60);
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	};

	const options = $derived.by(() => {
		if (!Number.isFinite(parsed)) return [];
		return [6, 5, 4, 3].map((cycles) => {
			const sleepMinutes = cycles * s.cycleMinutes;
			const time =
				s.mode === 'wake'
					? parsed - sleepMinutes - s.latency // go to bed this early
					: parsed + s.latency + sleepMinutes; // wake at this time
			return {
				cycles,
				time: fmtTime(time),
				hours: sleepMinutes / 60,
				recommended: cycles === 5 || cycles === 6
			};
		});
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'wake'} onclick={() => (s.mode = 'wake')}>
				I need to wake up at…
			</button>
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'bed'} onclick={() => (s.mode = 'bed')}>
				I'm going to bed at…
			</button>
		</div>

		<div class="field-row">
			<Field label={s.mode === 'wake' ? 'Wake-up time' : 'Bedtime'} for="sl-time">
				<input id="sl-time" type="time" bind:value={s.time} />
			</Field>
			<Field label="Minutes to fall asleep" for="sl-latency" hint="15 minutes is average">
				<input id="sl-latency" type="number" min="0" max="60" step="5" bind:value={s.latency} />
			</Field>
			<Field label="Cycle length (minutes)" for="sl-cycle" hint="90 is typical; 80–110 is normal">
				<input id="sl-cycle" type="number" min="70" max="120" step="5" bind:value={s.cycleMinutes} />
			</Field>
		</div>

		<h2>{s.mode === 'wake' ? 'Go to bed at one of these times' : 'Set your alarm for one of these'}</h2>
		<div class="times">
			{#each options as option (option.cycles)}
				<div class="time-card" class:recommended={option.recommended}>
					<span class="time">{option.time}</span>
					<span class="meta small">
						{option.cycles} cycles · {option.hours} hours of sleep
					</span>
					{#if option.recommended}<span class="badge">Recommended</span>{/if}
				</div>
			{/each}
		</div>
	</div>

	<Note tone="warning">
		Sleep cycles are not metronomes. They run roughly 70–120 minutes, lengthen through the night, and
		differ between people and between nights. Treat these as approximate targets — total sleep time
		and consistency matter far more than landing precisely on a cycle boundary.
	</Note>

	{#snippet explainer()}
		<p>
			Sleep runs in repeating cycles through light sleep, deep sleep and REM. Waking at the end of a
			cycle — in light sleep — generally feels better than being pulled out of deep sleep, which
			produces the groggy, disoriented state called sleep inertia.
		</p>
		<code class="formula">bedtime = wake time − (cycles × cycle length) − time to fall asleep</code>
		<h3>Why 90 minutes is a rough average</h3>
		<p>
			The 90-minute figure comes from early sleep-lab work and is a population mean. Individuals
			range from about 70 to 120 minutes, and cycles lengthen as the night progresses — early cycles
			are deep-sleep heavy, later ones REM-heavy. That is why cutting the last two hours of sleep
			costs disproportionately much REM.
		</p>
		<h3>Total sleep beats cycle timing</h3>
		<p>
			Six cycles at 90 minutes is nine hours; five is seven and a half. Most adults need seven to
			nine hours, so the useful advice is usually “aim for five or six cycles” rather than
			“engineer the exact minute”. Four cycles is six hours — survivable, not sustainable.
		</p>
		<h3>What actually helps</h3>
		<p>
			A consistent wake time, seven days a week, does more for sleep quality than any bedtime
			calculation. Light in the morning, dark and cool in the evening, caffeine cut-off in the early
			afternoon, and no alcohol close to bed — those are the levers with real evidence behind them.
		</p>
	{/snippet}
</ToolShell>

<style>
	h2 {
		font-size: 1.05rem;
	}
	.times {
		display: grid;
		gap: 0.7rem;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	}
	.time-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 1rem 0.75rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		text-align: center;
	}
	.time-card.recommended {
		background: var(--accent-soft);
		border-color: var(--accent-border);
	}
	.time {
		font-size: 1.8rem;
		font-weight: 650;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}
	.meta {
		color: var(--text-muted);
	}
	.badge {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 700;
		color: var(--accent);
		margin-top: 0.2rem;
	}
</style>
