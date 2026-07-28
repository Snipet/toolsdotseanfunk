<script lang="ts">
	import { shuffle } from '$lib/random/random';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ size: 40, speed: 40, arrangement: 'random' });

	interface Frame {
		array: number[];
		compare: [number, number] | null;
		swap: [number, number] | null;
		sorted: number[];
	}

	interface Algorithm {
		id: string;
		name: string;
		best: string;
		average: string;
		worst: string;
		space: string;
		stable: boolean;
		note: string;
		run: (input: number[]) => Frame[];
	}

	/** Each algorithm records a frame per significant step for the animation. */
	const ALGORITHMS: Algorithm[] = [
		{
			id: 'bubble',
			name: 'Bubble sort',
			best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true,
			note: 'Repeatedly swaps adjacent pairs. Only useful as a teaching example — and as the best case for nearly-sorted data.',
			run(input) {
				const a = [...input];
				const frames: Frame[] = [];
				const sorted: number[] = [];
				for (let i = 0; i < a.length - 1; i++) {
					let swapped = false;
					for (let j = 0; j < a.length - 1 - i; j++) {
						frames.push({ array: [...a], compare: [j, j + 1], swap: null, sorted: [...sorted] });
						if (a[j] > a[j + 1]) {
							[a[j], a[j + 1]] = [a[j + 1], a[j]];
							swapped = true;
							frames.push({ array: [...a], compare: null, swap: [j, j + 1], sorted: [...sorted] });
						}
					}
					sorted.push(a.length - 1 - i);
					if (!swapped) break;
				}
				frames.push({ array: [...a], compare: null, swap: null, sorted: a.map((_, i) => i) });
				return frames;
			}
		},
		{
			id: 'insertion',
			name: 'Insertion sort',
			best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true,
			note: 'How most people sort a hand of cards. Genuinely fast for small or nearly-sorted arrays, which is why real sorts fall back to it.',
			run(input) {
				const a = [...input];
				const frames: Frame[] = [];
				for (let i = 1; i < a.length; i++) {
					const key = a[i];
					let j = i - 1;
					frames.push({ array: [...a], compare: [i, j], swap: null, sorted: range(i) });
					while (j >= 0 && a[j] > key) {
						a[j + 1] = a[j];
						frames.push({ array: [...a], compare: null, swap: [j, j + 1], sorted: range(i) });
						j--;
					}
					a[j + 1] = key;
				}
				frames.push({ array: [...a], compare: null, swap: null, sorted: a.map((_, i) => i) });
				return frames;
			}
		},
		{
			id: 'selection',
			name: 'Selection sort',
			best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: false,
			note: 'Finds the minimum and puts it in place. Always n²/2 comparisons but at most n swaps — the choice when writing is far more expensive than reading.',
			run(input) {
				const a = [...input];
				const frames: Frame[] = [];
				for (let i = 0; i < a.length - 1; i++) {
					let min = i;
					for (let j = i + 1; j < a.length; j++) {
						frames.push({ array: [...a], compare: [min, j], swap: null, sorted: range(i) });
						if (a[j] < a[min]) min = j;
					}
					if (min !== i) {
						[a[i], a[min]] = [a[min], a[i]];
						frames.push({ array: [...a], compare: null, swap: [i, min], sorted: range(i) });
					}
				}
				frames.push({ array: [...a], compare: null, swap: null, sorted: a.map((_, i) => i) });
				return frames;
			}
		},
		{
			id: 'merge',
			name: 'Merge sort',
			best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', stable: true,
			note: 'Divide, sort each half, merge. Guaranteed n log n and stable, at the cost of extra memory. The basis of most library sorts.',
			run(input) {
				const a = [...input];
				const frames: Frame[] = [];

				const merge = (lo: number, mid: number, hi: number) => {
					const left = a.slice(lo, mid + 1);
					const right = a.slice(mid + 1, hi + 1);
					let i = 0;
					let j = 0;
					let k = lo;
					while (i < left.length && j < right.length) {
						frames.push({ array: [...a], compare: [lo + i, mid + 1 + j], swap: null, sorted: [] });
						a[k++] = left[i] <= right[j] ? left[i++] : right[j++];
						frames.push({ array: [...a], compare: null, swap: [k - 1, k - 1], sorted: [] });
					}
					while (i < left.length) {
						a[k++] = left[i++];
						frames.push({ array: [...a], compare: null, swap: [k - 1, k - 1], sorted: [] });
					}
					while (j < right.length) {
						a[k++] = right[j++];
						frames.push({ array: [...a], compare: null, swap: [k - 1, k - 1], sorted: [] });
					}
				};

				const sort = (lo: number, hi: number) => {
					if (lo >= hi) return;
					const mid = Math.floor((lo + hi) / 2);
					sort(lo, mid);
					sort(mid + 1, hi);
					merge(lo, mid, hi);
				};

				sort(0, a.length - 1);
				frames.push({ array: [...a], compare: null, swap: null, sorted: a.map((_, i) => i) });
				return frames;
			}
		},
		{
			id: 'quick',
			name: 'Quicksort',
			best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', stable: false,
			note: 'Partition around a pivot, recurse. Fastest in practice thanks to cache behaviour, but the worst case is quadratic on adversarial input.',
			run(input) {
				const a = [...input];
				const frames: Frame[] = [];
				const done: number[] = [];

				const partition = (lo: number, hi: number) => {
					const pivot = a[hi];
					let i = lo - 1;
					for (let j = lo; j < hi; j++) {
						frames.push({ array: [...a], compare: [j, hi], swap: null, sorted: [...done] });
						if (a[j] < pivot) {
							i++;
							[a[i], a[j]] = [a[j], a[i]];
							frames.push({ array: [...a], compare: null, swap: [i, j], sorted: [...done] });
						}
					}
					[a[i + 1], a[hi]] = [a[hi], a[i + 1]];
					frames.push({ array: [...a], compare: null, swap: [i + 1, hi], sorted: [...done] });
					return i + 1;
				};

				const sort = (lo: number, hi: number) => {
					if (lo >= hi) {
						if (lo === hi) done.push(lo);
						return;
					}
					const p = partition(lo, hi);
					done.push(p);
					sort(lo, p - 1);
					sort(p + 1, hi);
				};

				sort(0, a.length - 1);
				frames.push({ array: [...a], compare: null, swap: null, sorted: a.map((_, i) => i) });
				return frames;
			}
		}
	];

	function range(n: number): number[] {
		return Array.from({ length: n }, (_, i) => i);
	}

	function makeArray(): number[] {
		const size = Math.max(5, Math.min(80, s.size));
		const base = Array.from({ length: size }, (_, i) => i + 1);
		switch (s.arrangement) {
			case 'sorted':
				return base;
			case 'reversed':
				return [...base].reverse();
			case 'nearly':
				// Sorted, then a handful of adjacent swaps.
				{
					const a = [...base];
					for (let i = 0; i < Math.max(1, Math.floor(size / 12)); i++) {
						const j = Math.floor(Math.random() * (size - 1));
						[a[j], a[j + 1]] = [a[j + 1], a[j]];
					}
					return a;
				}
			case 'fewUnique':
				return base.map((v) => Math.ceil((v / size) * 5) * Math.floor(size / 5));
			default:
				return shuffle(base);
		}
	}

	let source = $state<number[]>([]);
	let runs = $state<Record<string, Frame[]>>({});
	let step = $state(0);
	let playing = $state(false);

	function generate() {
		playing = false;
		step = 0;
		// Build into a local first. Reading `source` back after assigning it
		// would make it a dependency of the effect that calls this, and writing
		// it in the same effect then loops forever.
		const array = makeArray();
		const next: Record<string, Frame[]> = {};
		for (const algorithm of ALGORITHMS) next[algorithm.id] = algorithm.run(array);
		source = array;
		runs = next;
	}

	// Rebuild whenever the array configuration changes.
	$effect(() => {
		void s.size;
		void s.arrangement;
		generate();
	});

	const maxSteps = $derived(Math.max(1, ...Object.values(runs).map((frames) => frames.length)));

	$effect(() => {
		if (!playing) return;
		const timer = setInterval(() => {
			step = Math.min(maxSteps - 1, step + Math.max(1, Math.round(s.speed / 8)));
			if (step >= maxSteps - 1) playing = false;
		}, 24);
		return () => clearInterval(timer);
	});

	function frameFor(id: string): Frame | null {
		const frames = runs[id];
		if (!frames?.length) return null;
		return frames[Math.min(step, frames.length - 1)];
	}

	const CHART_H = 130;
</script>

<ToolShell {tool}>
	<div class="card stack no-print">
		<div class="field-row">
			<Field label="Array size: {s.size}" for="sa-size">
				<input id="sa-size" type="range" min="5" max="80" bind:value={s.size} />
			</Field>
			<Field label="Starting arrangement" for="sa-arrangement">
				<select id="sa-arrangement" bind:value={s.arrangement}>
					<option value="random">Random</option>
					<option value="nearly">Nearly sorted</option>
					<option value="reversed">Reverse sorted</option>
					<option value="sorted">Already sorted</option>
					<option value="fewUnique">Few unique values</option>
				</select>
			</Field>
			<Field label="Speed" for="sa-speed">
				<input id="sa-speed" type="range" min="4" max="200" bind:value={s.speed} />
			</Field>
		</div>

		<div class="row">
			<button type="button" class="btn btn-primary" onclick={() => (playing = !playing)}>
				<Icon name={playing ? 'pause' : 'play'} size={16} />
				{playing ? 'Pause' : 'Race'}
			</button>
			<button type="button" class="btn btn-sm" onclick={() => (step = Math.min(maxSteps - 1, step + 1))}>Step</button>
			<button type="button" class="btn btn-sm" onclick={() => { step = 0; playing = false; }}>
				<Icon name="reset" size={14} /> Rewind
			</button>
			<button type="button" class="btn btn-sm" onclick={generate}>New array</button>
			<span class="small muted">Step {step.toLocaleString('en-US')} of {(maxSteps - 1).toLocaleString('en-US')}</span>
		</div>

		<label class="visually-hidden" for="sa-scrub">Scrub through the animation</label>
		<input id="sa-scrub" type="range" min="0" max={maxSteps - 1} bind:value={step} />
	</div>

	<div class="race">
		{#each ALGORITHMS as algorithm (algorithm.id)}
			{@const frame = frameFor(algorithm.id)}
			{@const total = runs[algorithm.id]?.length ?? 1}
			{@const finished = step >= total - 1}
			<section class="card algo" class:finished>
				<div class="algo-head">
					<h2>{algorithm.name}</h2>
					<span class="steps small" class:done={finished}>
						{finished ? `Done in ${(total - 1).toLocaleString('en-US')} steps` : `${Math.min(step, total - 1).toLocaleString('en-US')} steps`}
					</span>
				</div>

				<svg viewBox="0 0 {Math.max(1, source.length)} {CHART_H}" class="bars" preserveAspectRatio="none" role="img" aria-label="{algorithm.name} in progress">
					{#if frame}
						{#each frame.array as value, i (i)}
							{@const isCompare = frame.compare?.includes(i)}
							{@const isSwap = frame.swap?.includes(i)}
							{@const isSorted = finished || frame.sorted.includes(i)}
							<rect
								x={i}
								y={CHART_H - (value / Math.max(1, source.length)) * CHART_H}
								width="0.86"
								height={(value / Math.max(1, source.length)) * CHART_H}
								fill={isSwap ? 'var(--negative)' : isCompare ? 'var(--warning)' : isSorted ? 'var(--positive)' : 'var(--accent)'}
							/>
						{/each}
					{/if}
				</svg>

				<dl class="complexity small">
					<div><dt>Best</dt><dd>{algorithm.best}</dd></div>
					<div><dt>Average</dt><dd>{algorithm.average}</dd></div>
					<div><dt>Worst</dt><dd>{algorithm.worst}</dd></div>
					<div><dt>Space</dt><dd>{algorithm.space}</dd></div>
					<div><dt>Stable</dt><dd>{algorithm.stable ? 'Yes' : 'No'}</dd></div>
				</dl>
				<p class="note small muted">{algorithm.note}</p>
			</section>
		{/each}
	</div>

	<Note>
		Step counts are directly comparable — every algorithm records one step per comparison and one per
		move. They are not wall-clock times, so they measure algorithmic work rather than the constant
		factors that make quicksort win in practice.
	</Note>

	{#snippet explainer()}
		<p>
			Colours mark what the algorithm is doing: <span class="key compare">amber</span> for a
			comparison, <span class="key swap">red</span> for a move, <span class="key sorted">green</span>
			for elements in their final position.
		</p>

		<h3>Try “already sorted”</h3>
		<p>
			Bubble and insertion sort finish almost immediately — they detect that nothing needs moving and
			stop. Selection sort takes exactly as long as always, because it scans for the minimum
			regardless. Quicksort with a last-element pivot hits its <em>worst</em> case here, degrading to
			O(n²), which is precisely why real implementations choose the pivot more carefully.
		</p>

		<h3>What O(n log n) buys you</h3>
		<p>
			At 40 elements the quadratic sorts are merely slower. At 10,000 the difference is roughly 100
			million operations against 130,000 — the difference between a stalled interface and an instant
			one. Asymptotic complexity matters exactly when the data grows.
		</p>

		<h3>Stability</h3>
		<p>
			A stable sort preserves the relative order of equal elements. Sort a table by name, then by
			department: with a stable sort the names remain alphabetical within each department. With an
			unstable sort they scramble. This is why JavaScript's <code>Array.sort</code> has been required
			to be stable since ES2019.
		</p>

		<h3>What is actually used</h3>
		<p>
			Nobody ships a textbook algorithm. Modern engines use hybrids: <strong>Timsort</strong> (Python,
			Java for objects, and most JavaScript engines) is merge sort that detects already-sorted runs
			and switches to insertion sort on small pieces. <strong>Introsort</strong> (C++
			<code>std::sort</code>) runs quicksort but switches to heapsort when the recursion goes too
			deep, capping the worst case at n log n. Both exploit the same insight visible above: insertion
			sort is genuinely the fastest option on small or nearly-ordered data.
		</p>

		<h3>The n log n lower bound</h3>
		<p>
			No comparison-based sort can beat O(n log n) in the worst case. There are n! possible orderings
			and each comparison gives one bit, so you need at least log₂(n!) ≈ n log n comparisons to
			distinguish them. Faster sorts exist — counting sort, radix sort — but they work by not
			comparing at all, which requires knowing something about the values in advance.
		</p>
	{/snippet}
</ToolShell>

<style>
	.race {
		display: grid;
		gap: 0.8rem;
		grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
	}
	.algo {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.algo.finished {
		border-color: color-mix(in srgb, var(--positive) 45%, var(--border));
	}
	.algo-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}
	h2 {
		font-size: 1rem;
	}
	.steps {
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
	.steps.done {
		color: var(--positive);
		font-weight: 600;
	}
	.bars {
		width: 100%;
		height: 130px;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	.complexity {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
		gap: 0.35rem;
		margin: 0;
	}
	.complexity dt {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-faint);
		font-weight: 600;
	}
	.complexity dd {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.76rem;
	}
	.note {
		line-height: 1.5;
	}
	:global(.key) {
		font-weight: 600;
	}
	:global(.key.compare) {
		color: var(--warning);
	}
	:global(.key.swap) {
		color: var(--negative);
	}
	:global(.key.sorted) {
		color: var(--positive);
	}
</style>
