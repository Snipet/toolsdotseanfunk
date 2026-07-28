<script lang="ts">
	import { cryptoRandom } from '$lib/random/random';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ items: 'Pizza\nSushi\nTacos\nCurry\nPasta\nSalad', eliminate: false });

	let rotation = $state(0);
	let spinning = $state(false);
	let winner = $state<string | null>(null);
	let removed = $state<string[]>([]);

	const entries = $derived(
		s.items
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
			.filter((item) => !removed.includes(item))
	);

	const COLORS = ['#b8481f', '#2f6f43', '#1f6fb8', '#8a6100', '#7a3f9d', '#b3261e', '#0f7b7b', '#96591f'];

	const slice = $derived(entries.length ? 360 / entries.length : 360);

	function spin() {
		if (spinning || entries.length < 2) return;
		spinning = true;
		winner = null;

		const index = Math.floor(cryptoRandom() * entries.length);
		// Land the chosen slice's centre under the pointer at the top, after
		// several full turns for the animation.
		const target = 360 * 6 + (360 - (index * slice + slice / 2));
		rotation = rotation - (rotation % 360) + target;

		setTimeout(() => {
			winner = entries[index];
			spinning = false;
			if (s.eliminate) removed = [...removed, entries[index]];
		}, 4200);
	}

	function reset() {
		removed = [];
		winner = null;
	}

	/** SVG path for one wedge of the wheel. */
	function wedge(index: number): string {
		const start = (index * slice - 90) * (Math.PI / 180);
		const end = ((index + 1) * slice - 90) * (Math.PI / 180);
		const x1 = 100 + 95 * Math.cos(start);
		const y1 = 100 + 95 * Math.sin(start);
		const x2 = 100 + 95 * Math.cos(end);
		const y2 = 100 + 95 * Math.sin(end);
		return `M100,100 L${x1},${y1} A95,95 0 ${slice > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
	}
</script>

<ToolShell {tool}>
	<div class="layout">
		<div class="card wheel-card">
			<div class="wheel-wrap">
				<div class="pointer" aria-hidden="true"></div>
				<svg
					viewBox="0 0 200 200"
					class="wheel"
					style="transform: rotate({rotation}deg); transition: transform {spinning ? '4s cubic-bezier(0.17, 0.67, 0.16, 1)' : '0s'}"
					role="img"
					aria-label="Spinning wheel with {entries.length} options"
				>
					{#each entries as item, i (item)}
						<path d={wedge(i)} fill={COLORS[i % COLORS.length]} stroke="var(--bg-raised)" stroke-width="1" />
						<text
							x="100"
							y="100"
							fill="#fff"
							font-size={entries.length > 12 ? 6 : 8}
							font-weight="600"
							text-anchor="end"
							transform="rotate({i * slice + slice / 2 - 90} 100 100) translate(88 3)"
						>
							{item.length > 16 ? item.slice(0, 15) + '…' : item}
						</text>
					{/each}
					<circle cx="100" cy="100" r="14" fill="var(--bg-raised)" stroke="var(--border-strong)" stroke-width="2" />
				</svg>
			</div>

			<button type="button" class="btn btn-primary spin" onclick={spin} disabled={spinning || entries.length < 2}>
				{spinning ? 'Spinning…' : 'Spin'}
			</button>

			{#if winner}
				<Result label="Winner" primary value={winner} />
			{/if}
		</div>

		<div class="card stack">
			<label for="ws-items">Options — one per line</label>
			<textarea id="ws-items" bind:value={s.items} rows="12" spellcheck="false"></textarea>
			<p class="small muted">{entries.length} option{entries.length === 1 ? '' : 's'} on the wheel</p>

			<label class="check">
				<input type="checkbox" bind:checked={s.eliminate} /> Elimination mode — remove the winner after each spin
			</label>

			{#if removed.length}
				<div class="removed">
					<p class="small muted">Removed: {removed.join(', ')}</p>
					<button type="button" class="btn btn-sm" onclick={reset}><Icon name="reset" size={14} /> Put them all back</button>
				</div>
			{/if}
		</div>
	</div>

	{#if entries.length < 2}
		<Note tone="warning">Add at least two options to spin.</Note>
	{/if}

	{#snippet explainer()}
		<p>
			The winner is chosen first, using the browser's cryptographic random source, and then the wheel
			is animated to land on it. That ordering matters: the outcome cannot be influenced by the
			animation, the timing of your click, or how long you hold the button.
		</p>
		<h3>Every slice is equally likely</h3>
		<p>
			The wheel is drawn with equal wedges and the choice is a uniform draw over the list, so a
			six-option wheel gives each option exactly 1 in 6. If you want weighted odds, add an option
			more than once — three entries for “pizza” out of nine total makes it a 1 in 3 chance.
		</p>
		<h3>Elimination mode</h3>
		<p>
			Removing each winner turns the wheel into a random ordering of the whole list — useful for
			presentation order, turn order, or drawing several prizes without anyone winning twice.
		</p>
		<h3>Shareable</h3>
		<p>
			The option list lives in the URL, so a wheel you set up can be sent to a classroom or a team
			and everyone opens the same one.
		</p>
	{/snippet}
</ToolShell>

<style>
	.layout {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		align-items: start;
	}
	.wheel-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	.wheel-wrap {
		position: relative;
		width: min(100%, 340px);
	}
	.wheel {
		width: 100%;
		height: auto;
		filter: drop-shadow(0 2px 8px rgb(0 0 0 / 0.15));
	}
	.pointer {
		position: absolute;
		top: -6px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 12px solid transparent;
		border-right: 12px solid transparent;
		border-top: 22px solid var(--text);
		z-index: 2;
	}
	.spin {
		min-width: 140px;
		min-height: 48px;
		font-size: 1rem;
	}
	textarea {
		min-height: 280px;
	}
	.removed {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		align-items: flex-start;
	}
	@media (max-width: 780px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}
</style>
