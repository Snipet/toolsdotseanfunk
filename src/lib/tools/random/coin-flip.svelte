<script lang="ts">
	import { cryptoRandom } from '$lib/random/random';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ count: 1 });

	let flips = $state<boolean[]>([]);
	let flipping = $state(false);

	function flip() {
		const n = Math.max(1, Math.min(10000, s.count));
		flipping = true;
		const results = Array.from({ length: n }, () => cryptoRandom() < 0.5);
		flips = [...results, ...flips].slice(0, 10000);
		setTimeout(() => (flipping = false), 350);
	}

	const heads = $derived(flips.filter(Boolean).length);
	const tails = $derived(flips.length - heads);

	const longestStreak = $derived.by(() => {
		let best = 0;
		let bestSide = true;
		let run = 0;
		let side = flips[0];
		for (const flip of flips) {
			if (flip === side) run++;
			else {
				side = flip;
				run = 1;
			}
			if (run > best) {
				best = run;
				bestSide = side;
			}
		}
		return { length: best, side: bestSide };
	});

	const currentStreak = $derived.by(() => {
		if (!flips.length) return 0;
		let run = 0;
		for (const flip of flips) {
			if (flip === flips[0]) run++;
			else break;
		}
		return run;
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="coin-stage">
			<div class="coin" class:flipping class:tails={flips.length > 0 && !flips[0]}>
				<span class="face">{flips.length === 0 ? '?' : flips[0] ? 'H' : 'T'}</span>
			</div>
			<p class="verdict">
				{flips.length === 0 ? 'Ready' : flips[0] ? 'Heads' : 'Tails'}
			</p>
		</div>

		<div class="row centre">
			<button type="button" class="btn btn-primary big" onclick={flip}>
				<Icon name="reset" size={18} /> Flip
			</button>
			<Field label="Flip this many at once" for="cf-count">
				<input id="cf-count" type="number" min="1" max="10000" bind:value={s.count} />
			</Field>
			<button type="button" class="btn" onclick={() => (flips = [])} disabled={!flips.length}>
				<Icon name="trash" size={15} /> Reset
			</button>
		</div>
	</div>

	{#if flips.length}
		<div class="results-grid">
			<Result label="Heads" primary value={String(heads)} detail={`${fmtLoose((heads / flips.length) * 100, 2)}%`} copyable={false} />
			<Result label="Tails" primary value={String(tails)} detail={`${fmtLoose((tails / flips.length) * 100, 2)}%`} copyable={false} />
			<Result label="Total flips" value={String(flips.length)} copyable={false} />
			<Result label="Current streak" value={`${currentStreak} × ${flips[0] ? 'heads' : 'tails'}`} copyable={false} />
			<Result label="Longest streak" value={`${longestStreak.length} × ${longestStreak.side ? 'heads' : 'tails'}`} copyable={false} />
			<Result label="Deviation from even" value={`${heads > tails ? '+' : ''}${heads - tails}`} detail={`${fmtLoose(Math.abs(heads / flips.length - 0.5) * 100, 2)} percentage points`} copyable={false} />
		</div>

		<section class="card">
			<h2>Balance</h2>
			<div class="bar">
				<span class="seg heads" style="width: {(heads / flips.length) * 100}%">{heads > 0 ? 'Heads' : ''}</span>
				<span class="seg tails" style="width: {(tails / flips.length) * 100}%">{tails > 0 ? 'Tails' : ''}</span>
			</div>
		</section>

		{#if flips.length <= 400}
			<section class="card">
				<h2>Sequence</h2>
				<div class="sequence">
					{#each flips.slice(0, 400) as flip, i (i)}
						<span class="pip" class:h={flip}>{flip ? 'H' : 'T'}</span>
					{/each}
				</div>
				<p class="small muted">Most recent first.</p>
			</section>
		{/if}
	{/if}

	{#snippet explainer()}
		<p>
			Each flip is an independent draw from the browser's cryptographic random source. There is no
			memory: a coin that has come up heads five times running is still exactly 50% to come up heads
			next.
		</p>
		<h3>The gambler's fallacy</h3>
		<p>
			The belief that tails is “due” after a run of heads. It is not — the coin has no state. What
			<em>is</em> true is regression to the mean: as the number of flips grows, the
			<strong>proportion</strong> approaches 50% while the <strong>absolute</strong> difference
			between heads and tails tends to grow, not shrink. Both readouts are above so you can watch it
			happen.
		</p>
		<h3>Streaks are longer than intuition suggests</h3>
		<p>
			In 100 flips, a run of six or more of the same side is more likely than not. People asked to
			fake a random sequence almost always produce too few long streaks — which is exactly how
			fabricated data gets detected.
		</p>
		<h3>Real coins are not quite fair</h3>
		<p>
			Diaconis, Holmes and Montgomery showed in 2007 that a physically flipped coin lands on the same
			face it started on about 51% of the time, because it precesses rather than spinning cleanly.
			Spinning a coin on a table is worse still — the mass distribution around the rim can push it
			well away from even. This simulation has no such bias.
		</p>
	{/snippet}
</ToolShell>

<style>
	.coin-stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 1rem 0;
	}
	.coin {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: linear-gradient(145deg, #f5d98b, #c9a227);
		border: 4px solid #a8871f;
		box-shadow: var(--shadow);
		transition: transform 0.35s ease;
	}
	.coin.tails {
		background: linear-gradient(145deg, #dcdcd6, #a8a8a0);
		border-color: #8b8b83;
	}
	.coin.flipping {
		transform: rotateY(720deg);
	}
	.face {
		font-size: 3rem;
		font-weight: 800;
		color: #3a2f0b;
	}
	.verdict {
		font-size: 1.3rem;
		font-weight: 650;
	}
	.centre {
		justify-content: center;
		align-items: flex-end;
	}
	.centre :global(.field) {
		width: 150px;
	}
	.big {
		min-height: 48px;
		min-width: 130px;
		font-size: 1rem;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.bar {
		display: flex;
		height: 34px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		border: 1px solid var(--border);
		font-size: 0.78rem;
		font-weight: 600;
		color: #fff;
	}
	.seg {
		display: grid;
		place-items: center;
		overflow: hidden;
		white-space: nowrap;
	}
	.seg.heads {
		background: #c9a227;
	}
	.seg.tails {
		background: var(--text-faint);
	}
	.sequence {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
	}
	.pip {
		width: 22px;
		height: 22px;
		display: grid;
		place-items: center;
		border-radius: 4px;
		background: var(--bg-sunken);
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--text-muted);
	}
	.pip.h {
		background: color-mix(in srgb, #c9a227 35%, transparent);
		color: var(--text);
	}
</style>
