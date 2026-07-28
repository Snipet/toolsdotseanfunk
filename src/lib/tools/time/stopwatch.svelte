<script lang="ts">
	import { onMount } from 'svelte';
	import { clock } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	let running = $state(false);
	let elapsed = $state(0);
	let startedAt = 0;
	let laps = $state<number[]>([]);

	onMount(() => {
		let frame: number;
		const tick = () => {
			// Derive elapsed from wall-clock rather than accumulating frame deltas,
			// so a backgrounded tab does not lose time.
			if (running) elapsed = performance.now() - startedAt;
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	function toggle() {
		if (running) {
			elapsed = performance.now() - startedAt;
			running = false;
		} else {
			startedAt = performance.now() - elapsed;
			running = true;
		}
	}

	function lap() {
		if (running) laps = [elapsed, ...laps];
	}

	function reset() {
		running = false;
		elapsed = 0;
		laps = [];
	}

	function onKeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
		if (event.code === 'Space') {
			event.preventDefault();
			toggle();
		} else if (event.key === 'l' || event.key === 'L') {
			lap();
		} else if (event.key === 'r' || event.key === 'R') {
			reset();
		}
	}

	const display = $derived(() => {
		const total = elapsed / 1000;
		const hundredths = Math.floor((elapsed % 1000) / 10);
		return `${clock(total, true)}.${String(hundredths).padStart(2, '0')}`;
	});

	const lapRows = $derived(
		laps.map((time, i) => ({
			number: laps.length - i,
			total: time,
			split: time - (laps[i + 1] ?? 0)
		}))
	);

	const fastest = $derived(lapRows.length > 1 ? Math.min(...lapRows.map((l) => l.split)) : NaN);
	const slowest = $derived(lapRows.length > 1 ? Math.max(...lapRows.map((l) => l.split)) : NaN);

	const lapText = () =>
		lapRows.map((l) => `${l.number}\t${clock(l.split / 1000, true)}\t${clock(l.total / 1000, true)}`).join('\n');
</script>

<svelte:window onkeydown={onKeydown} />

<ToolShell {tool}>
	<div class="card watch">
		<output class="display num" aria-live="off">{display()}</output>

		<div class="controls">
			<button type="button" class="btn btn-primary big-btn" onclick={toggle}>
				<Icon name={running ? 'pause' : 'play'} size={18} />
				{running ? 'Stop' : elapsed > 0 ? 'Resume' : 'Start'}
			</button>
			<button type="button" class="btn big-btn" onclick={lap} disabled={!running}>
				<Icon name="plus" size={16} /> Lap
			</button>
			<button type="button" class="btn big-btn" onclick={reset} disabled={elapsed === 0}>
				<Icon name="reset" size={16} /> Reset
			</button>
		</div>

		<p class="small muted hint no-print">
			<kbd>Space</kbd> start/stop · <kbd>L</kbd> lap · <kbd>R</kbd> reset
		</p>
	</div>

	{#if lapRows.length}
		<section class="card">
			<div class="head">
				<h2>{lapRows.length} lap{lapRows.length === 1 ? '' : 's'}</h2>
				<CopyButton value={lapText} label="Copy laps" />
			</div>
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th class="num">Lap</th><th class="num">Split</th><th class="num">Total</th></tr></thead>
					<tbody>
						{#each lapRows as row (row.number)}
							<tr class:fast={row.split === fastest} class:slow={row.split === slowest}>
								<td class="num">{row.number}</td>
								<td class="num">{clock(row.split / 1000, true)}.{String(Math.floor((row.split % 1000) / 10)).padStart(2, '0')}</td>
								<td class="num">{clock(row.total / 1000, true)}.{String(Math.floor((row.total % 1000) / 10)).padStart(2, '0')}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if lapRows.length > 1}
				<p class="small muted">Fastest lap highlighted green, slowest red.</p>
			{/if}
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			Elapsed time is measured with <code>performance.now()</code>, a monotonic clock that is not
			affected by the system clock changing, and it is recomputed from the start timestamp on every
			frame rather than accumulated. That means a backgrounded tab — where browsers throttle timers —
			resumes with the correct total instead of having silently lost seconds.
		</p>
		<h3>Splits versus totals</h3>
		<p>
			The <strong>split</strong> is the time for that lap alone; the <strong>total</strong> is
			elapsed time since the start. Runners usually care about splits, and lap consistency is a
			better predictor of a good race than any single fast lap.
		</p>
		<h3>Accuracy</h3>
		<p>
			Browsers deliberately reduce timer resolution as a defence against timing side-channel attacks,
			so treat the hundredths as indicative rather than certified. For anything official, use
			purpose-built timing equipment.
		</p>
	{/snippet}
</ToolShell>

<style>
	.watch {
		text-align: center;
		padding: 2rem 1rem;
	}
	.display {
		display: block;
		font-family: var(--font-mono);
		font-size: clamp(2.4rem, 11vw, 5rem);
		font-weight: 600;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.controls {
		display: flex;
		justify-content: center;
		gap: 0.6rem;
		margin-top: 1.75rem;
		flex-wrap: wrap;
	}
	.big-btn {
		min-width: 120px;
		min-height: 48px;
	}
	.hint {
		margin-top: 1.25rem;
	}
	kbd {
		background: var(--bg-sunken);
		border: 1px solid var(--border-strong);
		border-radius: 4px;
		padding: 0.05em 0.35em;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.head h2 {
		font-size: 1.05rem;
	}
	tr.fast td {
		color: var(--positive);
		font-weight: 600;
	}
	tr.slow td {
		color: var(--negative);
	}
</style>
