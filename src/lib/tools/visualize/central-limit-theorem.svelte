<script lang="ts">
	import { cryptoRandom } from '$lib/random/random';
	import { normalPdf, summarize } from '$lib/math/stats';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ population: 'exponential', sampleSize: 5, speed: 25 });

	/** Deliberately non-normal populations, all scaled roughly to [0, 10]. */
	const POPULATIONS: Record<string, { label: string; draw: () => number; note: string }> = {
		uniform: {
			label: 'Uniform — a flat die',
			draw: () => cryptoRandom() * 10,
			note: 'Every value equally likely. No peak at all.'
		},
		exponential: {
			label: 'Exponential — waiting times',
			draw: () => Math.min(10, -Math.log(1 - cryptoRandom()) * 2),
			note: 'Strongly right-skewed. Most values small, a long tail of large ones.'
		},
		bimodal: {
			label: 'Bimodal — two clusters',
			draw: () => (cryptoRandom() < 0.5 ? cryptoRandom() * 2.5 + 1 : cryptoRandom() * 2.5 + 6.5),
			note: 'Two humps and a hole in the middle — as far from a bell curve as it gets.'
		},
		skewedLeft: {
			label: 'Left-skewed',
			draw: () => 10 - Math.min(10, Math.pow(cryptoRandom(), 3) * 10),
			note: 'The mirror image of the exponential.'
		},
		bernoulli: {
			label: 'Coin flip — only two values',
			draw: () => (cryptoRandom() < 0.5 ? 0 : 10),
			note: 'Discrete and maximally un-bell-shaped: nothing but 0 and 10.'
		}
	};

	const population = $derived(POPULATIONS[s.population] ?? POPULATIONS.exponential);

	let sampleMeans = $state<number[]>([]);
	let lastSample = $state<number[]>([]);
	let running = $state(false);

	function drawOne() {
		const sample = Array.from({ length: s.sampleSize }, () => population.draw());
		lastSample = sample;
		sampleMeans = [...sampleMeans, sample.reduce((a, b) => a + b, 0) / sample.length];
		if (sampleMeans.length > 20000) sampleMeans = sampleMeans.slice(-20000);
	}

	function drawMany(n: number) {
		const batch: number[] = [];
		for (let i = 0; i < n; i++) {
			const sample = Array.from({ length: s.sampleSize }, () => population.draw());
			if (i === n - 1) lastSample = sample;
			batch.push(sample.reduce((a, b) => a + b, 0) / sample.length);
		}
		sampleMeans = [...sampleMeans, ...batch].slice(-20000);
	}

	function reset() {
		sampleMeans = [];
		lastSample = [];
		running = false;
	}

	// Changing the population or sample size invalidates everything collected.
	$effect(() => {
		void s.population;
		void s.sampleSize;
		reset();
	});

	$effect(() => {
		if (!running) return;
		const timer = setInterval(() => drawMany(Math.max(1, Math.round(s.speed / 5))), 60);
		return () => clearInterval(timer);
	});

	// --- Histograms ----------------------------------------------------------

	const BINS = 40;
	const W = 520;
	const H = 210;

	function histogram(values: number[], min: number, max: number) {
		const counts = new Array(BINS).fill(0);
		for (const value of values) {
			const index = Math.min(BINS - 1, Math.max(0, Math.floor(((value - min) / (max - min)) * BINS)));
			counts[index]++;
		}
		return counts;
	}

	/** A large reference draw, so the population shape is visible immediately. */
	const populationSample = $derived.by(() => {
		void s.population;
		return Array.from({ length: 20000 }, () => population.draw());
	});

	const populationBins = $derived(histogram(populationSample, 0, 10));
	const populationMax = $derived(Math.max(...populationBins, 1));

	const meansStats = $derived(sampleMeans.length ? summarize(sampleMeans) : null);
	const populationStats = $derived(summarize(populationSample));

	const meansBins = $derived(sampleMeans.length ? histogram(sampleMeans, 0, 10) : []);
	const meansMax = $derived(Math.max(...meansBins, 1));

	/** The normal curve the CLT predicts: same mean, sd divided by root n. */
	const predicted = $derived.by(() => {
		if (!populationStats) return null;
		return {
			mean: populationStats.mean,
			sd: populationStats.sdPopulation / Math.sqrt(s.sampleSize)
		};
	});

	const predictedCurve = $derived.by(() => {
		if (!predicted || !sampleMeans.length) return '';
		const binWidth = 10 / BINS;
		return Array.from({ length: 200 }, (_, i) => {
			const x = (i / 199) * 10;
			// Scale the density to the histogram's pixel height.
			const density = normalPdf(x, predicted.mean, predicted.sd) * sampleMeans.length * binWidth;
			const y = H - (density / meansMax) * H;
			return `${i ? 'L' : 'M'}${((x / 10) * W).toFixed(1)},${Math.max(0, y).toFixed(1)}`;
		}).join('');
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Population shape" for="clt-pop">
				<select id="clt-pop" bind:value={s.population}>
					{#each Object.entries(POPULATIONS) as [id, item] (id)}<option value={id}>{item.label}</option>{/each}
				</select>
			</Field>
			<Field label="Sample size n = {s.sampleSize}" for="clt-n" hint="How many values are averaged for each dot">
				<input id="clt-n" type="range" min="1" max="50" bind:value={s.sampleSize} />
			</Field>
			<Field label="Speed" for="clt-speed">
				<input id="clt-speed" type="range" min="5" max="200" bind:value={s.speed} />
			</Field>
		</div>

		<div class="row">
			<button type="button" class="btn btn-sm" onclick={drawOne}>Draw one sample</button>
			<button type="button" class="btn btn-sm" onclick={() => drawMany(100)}>+100</button>
			<button type="button" class="btn btn-sm" onclick={() => drawMany(1000)}>+1,000</button>
			<button type="button" class="btn btn-primary" onclick={() => (running = !running)}>
				<Icon name={running ? 'pause' : 'play'} size={16} />
				{running ? 'Stop' : 'Run'}
			</button>
			<button type="button" class="btn btn-sm" onclick={reset}><Icon name="reset" size={14} /> Reset</button>
		</div>

		<p class="small muted">{population.note}</p>
	</div>

	<div class="charts">
		<section class="card">
			<h2>The population</h2>
			<p class="small muted">What individual values look like. This is not a bell curve.</p>
			<svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Histogram of the population distribution">
				{#each populationBins as count, i (i)}
					<rect
						x={(i / BINS) * W}
						y={H - (count / populationMax) * H}
						width={W / BINS - 1}
						height={(count / populationMax) * H}
						fill="var(--text-faint)"
					/>
				{/each}
			</svg>
			{#if populationStats}
				<div class="stats small">
					<span>Mean {fmtLoose(populationStats.mean, 2)}</span>
					<span>SD {fmtLoose(populationStats.sdPopulation, 2)}</span>
					<span>Skew {fmtLoose(populationStats.skewness, 2)}</span>
				</div>
			{/if}
		</section>

		<section class="card">
			<h2>The sample means</h2>
			<p class="small muted">
				Each bar counts averages of {s.sampleSize} draw{s.sampleSize === 1 ? '' : 's'}.
				{sampleMeans.length.toLocaleString('en-US')} collected.
			</p>
			<svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Histogram of the sample means">
				{#each meansBins as count, i (i)}
					<rect
						x={(i / BINS) * W}
						y={H - (count / meansMax) * H}
						width={W / BINS - 1}
						height={(count / meansMax) * H}
						fill="var(--accent)"
					/>
				{/each}
				{#if predictedCurve}
					<path d={predictedCurve} fill="none" stroke="var(--positive)" stroke-width="2.5" />
				{/if}
			</svg>
			{#if meansStats && predicted}
				<div class="stats small">
					<span>Mean {fmtLoose(meansStats.mean, 3)}</span>
					<span>SD {fmtLoose(meansStats.sdPopulation, 3)}</span>
					<span class="predicted">Predicted SD {fmtLoose(predicted.sd, 3)}</span>
				</div>
			{/if}
		</section>
	</div>

	{#if lastSample.length}
		<section class="card">
			<h2>The most recent sample</h2>
			<div class="sample">
				{#each lastSample as value, i (i)}
					<span class="value">{fmtLoose(value, 2)}</span>
				{/each}
				<span class="arrow">→</span>
				<span class="mean">mean {fmtLoose(lastSample.reduce((a, b) => a + b, 0) / lastSample.length, 3)}</span>
			</div>
		</section>
	{/if}

	{#if meansStats && predicted && sampleMeans.length > 200}
		<div class="results-grid">
			<Result label="Mean of the sample means" value={fmtLoose(meansStats.mean, 4)} detail={`Population mean is ${fmtLoose(populationStats?.mean ?? 0, 4)}`} copyable={false} />
			<Result label="Observed standard error" value={fmtLoose(meansStats.sdPopulation, 4)} copyable={false} />
			<Result label="Predicted standard error" value={fmtLoose(predicted.sd, 4)} detail="σ ÷ √n" tone="positive" copyable={false} />
			<Result
				label="Skewness of the means"
				value={fmtLoose(meansStats.skewness, 3)}
				detail={`Population skew was ${fmtLoose(populationStats?.skewness ?? 0, 2)} — it shrinks toward zero`}
				copyable={false}
			/>
		</div>
	{/if}

	<Note>
		The green curve is not fitted to the data. It is the normal distribution the central limit theorem
		<em>predicts</em>, drawn from the population's own mean and standard deviation before any samples
		were taken. The histogram converging onto it is the theorem being demonstrated, not assumed.
	</Note>

	{#snippet explainer()}
		<p>
			The central limit theorem says that if you take samples of size <em>n</em> from almost any
			population and average each sample, the distribution of those averages approaches a normal
			distribution as <em>n</em> grows — regardless of the population's shape.
		</p>
		<code class="formula">mean of the sample means → μ
standard error         → σ / √n
shape                  → normal, as n grows</code>
		<h3>Try the coin flip</h3>
		<p>
			Set the population to the coin flip: individual values are only ever 0 or 10, about as far from
			a bell curve as a distribution can be. With n = 1 the means histogram shows the same two spikes.
			Raise n to 5 and a shape appears. At n = 30 it is convincingly normal. Nothing about the coin
			changed — only how many of them you average.
		</p>
		<h3>Why √n</h3>
		<p>
			Averaging cancels errors, but not linearly. Independent variances add, and standard deviation is
			the square root of variance, so the spread of the mean falls as √n. This is the reason polling
			precision is expensive: halving the margin of error requires quadrupling the sample. Going from
			1,000 to 2,000 respondents only improves precision by about 29%.
		</p>
		<h3>Why this matters</h3>
		<p>
			It is the reason nearly all of classical statistics works. Confidence intervals, t-tests and
			regression standard errors all rely on the sampling distribution of an estimate being
			approximately normal — and the CLT delivers that even when the underlying data is nothing of
			the sort. You never needed the population to be normal; you needed the <em>estimate</em> to be.
		</p>
		<h3>When it fails</h3>
		<p>
			The theorem requires finite variance and independent draws. Heavy-tailed distributions such as
			the Cauchy have no finite variance, and their sample means never settle down — the average of a
			million draws is no more reliable than a single one. Dependence between observations (time
			series, clustered survey data) breaks it too, which is why those need their own machinery.
		</p>
		<p>
			The common “n ≥ 30 is enough” rule of thumb is a rough guide, not a theorem. Strongly skewed
			populations need considerably more; the exponential population above is a good place to see
			that for yourself.
		</p>
	{/snippet}
</ToolShell>

<style>
	.charts {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	}
	h2 {
		font-size: 1rem;
		margin-bottom: 0.15rem;
	}
	.chart {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		margin-top: 0.6rem;
	}
	.stats {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 0.4rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
	.predicted {
		color: var(--positive);
	}
	.sample {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-items: center;
		margin-top: 0.6rem;
	}
	.value {
		padding: 0.2rem 0.5rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.8rem;
	}
	.arrow {
		color: var(--text-faint);
	}
	.mean {
		padding: 0.2rem 0.6rem;
		background: var(--accent-soft);
		border: 1px solid var(--accent-border);
		border-radius: 4px;
		font-weight: 650;
		font-size: 0.85rem;
		color: var(--accent);
	}
</style>
