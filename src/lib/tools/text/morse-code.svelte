<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	const MORSE: Record<string, string> = {
		A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
		I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
		Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
		Y: '-.--', Z: '--..',
		'0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
		'5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
		'.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
		'/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
		';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
		'"': '.-..-.', '$': '...-..-', '@': '.--.-.'
	};

	const REVERSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

	const s = urlState({ text: 'SOS', mode: 'encode', wpm: 15 });

	const encoded = $derived(
		s.text
			.toUpperCase()
			.split('')
			.map((c) => (c === ' ' ? '/' : (MORSE[c] ?? '')))
			.filter(Boolean)
			.join(' ')
	);

	const decoded = $derived(
		s.text
			.trim()
			.split(/\s*\/\s*|\s{3,}/)
			.map((word) =>
				word
					.trim()
					.split(/\s+/)
					.map((code) => REVERSE[code] ?? '')
					.join('')
			)
			.join(' ')
	);

	const output = $derived(s.mode === 'encode' ? encoded : decoded);

	// PARIS standard: a dit is 1200/wpm milliseconds.
	const ditMs = $derived(1200 / s.wpm);
	let playing = $state(false);

	async function play() {
		if (playing) return;
		playing = true;
		const sequence = s.mode === 'encode' ? encoded : s.text;
		try {
			const ctx = new AudioContext();
			let when = ctx.currentTime + 0.05;
			const unit = ditMs / 1000;

			for (const symbol of sequence) {
				if (symbol === '.' || symbol === '-') {
					const duration = symbol === '.' ? unit : unit * 3;
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.frequency.value = 600;
					osc.connect(gain);
					gain.connect(ctx.destination);
					// Short ramps avoid the click you get from a hard gate.
					gain.gain.setValueAtTime(0.0001, when);
					gain.gain.exponentialRampToValueAtTime(0.25, when + 0.005);
					gain.gain.setValueAtTime(0.25, when + duration - 0.005);
					gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
					osc.start(when);
					osc.stop(when + duration);
					when += duration + unit;
				} else if (symbol === ' ') {
					when += unit * 2;
				} else if (symbol === '/') {
					when += unit * 4;
				}
			}
			const total = (when - ctx.currentTime) * 1000;
			setTimeout(() => {
				ctx.close();
				playing = false;
			}, total + 200);
		} catch {
			playing = false;
		}
	}

	const rows = $derived(Object.entries(MORSE).slice(0, 36));
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'encode'} onclick={() => (s.mode = 'encode')}>Text → Morse</button>
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'decode'} onclick={() => (s.mode = 'decode')}>Morse → Text</button>
		</div>

		<Field
			label={s.mode === 'encode' ? 'Your text' : 'Morse code'}
			for="mc-text"
			hint={s.mode === 'decode' ? 'Space between letters, / between words' : undefined}
		>
			<textarea id="mc-text" bind:value={s.text} rows="4" spellcheck="false" class={s.mode === 'decode' ? 'mono' : ''}></textarea>
		</Field>

		<Result label={s.mode === 'encode' ? 'Morse code' : 'Decoded text'} primary value={output || '—'} />

		<div class="row">
			<button type="button" class="btn" onclick={play} disabled={playing || !output}>
				<Icon name="play" size={16} /> {playing ? 'Playing…' : 'Play audio'}
			</button>
			<div class="speed">
				<label for="mc-wpm">Speed: {s.wpm} WPM</label>
				<input id="mc-wpm" type="range" min="5" max="40" bind:value={s.wpm} />
			</div>
		</div>
	</div>

	<section class="card">
		<h2>The alphabet</h2>
		<div class="chart">
			{#each rows as [char, code] (char)}
				<div class="entry">
					<span class="char">{char}</span>
					<span class="code mono">{code}</span>
				</div>
			{/each}
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Morse code encodes each character as a sequence of short and long signals — dits and dahs.
			Samuel Morse and Alfred Vail assigned the shortest codes to the most common English letters,
			which is why E is a single dit and Q is four symbols. It is a hand-built variable-length
			code, arrived at a century before Huffman coding formalised the idea.
		</p>
		<h3>The timing is the code</h3>
		<p>
			Everything is measured in one unit, the dit:
		</p>
		<code class="formula">dit          = 1 unit
dah          = 3 units
gap in a letter  = 1 unit
gap between letters = 3 units
gap between words   = 7 units</code>
		<p>
			Speed is quoted in words per minute against the standard word “PARIS”, which is exactly 50
			units long — so one unit is 1200/WPM milliseconds. At 15 WPM a dit is 80 ms.
		</p>
		<h3>SOS is not an acronym</h3>
		<p>
			It stands for nothing. <code>... --- ...</code> was chosen in 1906 purely because it is
			unmistakable and easy to send under stress. “Save Our Souls” was invented afterwards.
		</p>
		<h3>Still in use</h3>
		<p>
			Amateur radio operators use it daily, aviation navigation beacons identify themselves in Morse,
			and it remains usable when nothing else is — a torch, a mirror, or tapping on a pipe all carry
			it fine.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 90px;
	}
	.speed {
		flex: 1;
		min-width: 200px;
	}
	.speed label {
		margin-bottom: 0.1rem;
	}
	.chart {
		display: grid;
		gap: 0.35rem;
		grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
		margin-top: 0.75rem;
	}
	.entry {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0.35rem 0.6rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	.char {
		font-weight: 700;
		width: 1em;
	}
	.code {
		color: var(--accent);
		letter-spacing: 0.1em;
	}
</style>
