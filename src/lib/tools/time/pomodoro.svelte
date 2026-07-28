<script lang="ts">
	import { onMount } from 'svelte';
	import { clock } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ work: 25, shortBreak: 5, longBreak: 15, untilLong: 4, autoStart: false });

	type Phase = 'work' | 'short' | 'long';

	let phase = $state<Phase>('work');
	let running = $state(false);
	let remaining = $state(25 * 60 * 1000);
	let completed = $state(0);
	let endsAt = 0;

	const phaseMinutes = $derived(phase === 'work' ? s.work : phase === 'short' ? s.shortBreak : s.longBreak);
	const phaseMs = $derived(phaseMinutes * 60000);
	const progress = $derived(phaseMs > 0 ? 1 - remaining / phaseMs : 0);

	// Reset the clock whenever the phase or its configured length changes.
	$effect(() => {
		void phase;
		void phaseMs;
		if (!running) remaining = phaseMs;
	});

	onMount(() => {
		const timer = setInterval(() => {
			if (!running) return;
			remaining = Math.max(0, endsAt - Date.now());
			if (remaining === 0) finish();
		}, 200);
		return () => clearInterval(timer);
	});

	function chime() {
		try {
			const ctx = new AudioContext();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.frequency.value = phase === 'work' ? 880 : 660;
			gain.gain.setValueAtTime(0.0001, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
			osc.start();
			osc.stop(ctx.currentTime + 1.2);
			setTimeout(() => ctx.close(), 1500);
		} catch {
			// Audio may be blocked before any user gesture; silence is acceptable.
		}
	}

	function finish() {
		running = false;
		chime();
		if (phase === 'work') {
			completed += 1;
			phase = completed % s.untilLong === 0 ? 'long' : 'short';
		} else {
			phase = 'work';
		}
		remaining = phaseMs;
		if (s.autoStart) start();
	}

	function start() {
		endsAt = Date.now() + remaining;
		running = true;
	}

	function toggle() {
		if (running) {
			remaining = Math.max(0, endsAt - Date.now());
			running = false;
		} else {
			start();
		}
	}

	function skip() {
		running = false;
		remaining = 0;
		finish();
	}

	function reset() {
		running = false;
		remaining = phaseMs;
	}

	const PHASE_LABEL = { work: 'Focus', short: 'Short break', long: 'Long break' } as const;
	const CIRCUMFERENCE = 2 * Math.PI * 88;
</script>

<ToolShell {tool}>
	<div class="card timer" data-phase={phase}>
		<p class="phase">{PHASE_LABEL[phase]}</p>

		<div class="dial">
			<svg viewBox="0 0 200 200" role="img" aria-label="{PHASE_LABEL[phase]} timer, {clock(remaining / 1000)} remaining">
				<circle cx="100" cy="100" r="88" fill="none" stroke="var(--bg-sunken)" stroke-width="12" />
				<circle
					cx="100" cy="100" r="88" fill="none"
					stroke="currentColor" stroke-width="12" stroke-linecap="round"
					stroke-dasharray={CIRCUMFERENCE}
					stroke-dashoffset={CIRCUMFERENCE * (1 - progress)}
					transform="rotate(-90 100 100)"
				/>
			</svg>
			<output class="display num">{clock(Math.ceil(remaining / 1000))}</output>
		</div>

		<div class="controls">
			<button type="button" class="btn btn-primary big-btn" onclick={toggle}>
				<Icon name={running ? 'pause' : 'play'} size={18} />
				{running ? 'Pause' : 'Start'}
			</button>
			<button type="button" class="btn big-btn" onclick={skip}>Skip</button>
			<button type="button" class="btn big-btn" onclick={reset}><Icon name="reset" size={16} /> Reset</button>
		</div>

		<p class="sessions">
			{completed} session{completed === 1 ? '' : 's'} completed
			{#if completed > 0}· {Math.round((completed * s.work) / 60 * 10) / 10} hours of focus{/if}
		</p>
		<div class="dots">
			{#each Array.from({ length: s.untilLong }, (_, i) => i) as i (i)}
				<span class="dot" class:filled={completed % s.untilLong > i || (completed > 0 && completed % s.untilLong === 0)}></span>
			{/each}
		</div>
	</div>

	<div class="card stack no-print">
		<h2>Settings</h2>
		<div class="field-row">
			<Field label="Focus (minutes)" for="pm-work"><input id="pm-work" type="number" min="1" max="120" bind:value={s.work} /></Field>
			<Field label="Short break" for="pm-short"><input id="pm-short" type="number" min="1" max="60" bind:value={s.shortBreak} /></Field>
			<Field label="Long break" for="pm-long"><input id="pm-long" type="number" min="1" max="60" bind:value={s.longBreak} /></Field>
			<Field label="Sessions before a long break" for="pm-until"><input id="pm-until" type="number" min="2" max="10" bind:value={s.untilLong} /></Field>
		</div>
		<label class="check"><input type="checkbox" bind:checked={s.autoStart} /> Start the next phase automatically</label>
	</div>

	{#snippet explainer()}
		<p>
			The Pomodoro Technique, devised by Francesco Cirillo in the late 1980s, alternates fixed
			blocks of focused work with short breaks — classically 25 minutes on, 5 off, with a longer
			break after four rounds.
		</p>
		<h3>Why fixed blocks help</h3>
		<p>
			The value is less in the specific numbers than in the commitment device. A 25-minute block is
			short enough that starting feels cheap, and firm enough that “I'll check that after the
			timer” becomes an easy way to defer an interruption. The break is not optional — it is what
			makes the next block sustainable.
		</p>
		<h3>Adjust the length</h3>
		<p>
			25 minutes suits work that fragments easily. Deep work that needs a long ramp-up — writing,
			debugging, mathematics — often works better at 50 minutes on and 10 off, which is why the
			lengths above are editable. What matters is that the block is defined in advance.
		</p>
		<h3>The timer keeps time in the background</h3>
		<p>
			The remaining time is computed from an absolute end timestamp, not counted down tick by tick,
			so switching tabs does not slow the timer. The chime may not sound if the tab has never
			received a click, since browsers block audio until a user gesture.
		</p>
	{/snippet}
</ToolShell>

<style>
	.timer {
		text-align: center;
		padding: 2rem 1rem;
		color: var(--accent);
	}
	.timer[data-phase='short'],
	.timer[data-phase='long'] {
		color: var(--positive);
	}
	.phase {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 700;
	}
	.dial {
		position: relative;
		width: min(260px, 70vw);
		margin: 1rem auto;
	}
	.dial svg {
		width: 100%;
		height: auto;
	}
	.display {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		font-size: clamp(2rem, 9vw, 3rem);
		font-weight: 650;
		letter-spacing: -0.02em;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.controls {
		display: flex;
		justify-content: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.big-btn {
		min-width: 110px;
		min-height: 46px;
	}
	.sessions {
		margin-top: 1.25rem;
		font-size: 0.88rem;
		color: var(--text-muted);
	}
	.dots {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
		margin-top: 0.5rem;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid currentColor;
	}
	.dot.filled {
		background: currentColor;
	}
	h2 {
		font-size: 1.05rem;
	}
</style>
