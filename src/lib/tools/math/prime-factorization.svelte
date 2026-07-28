<script lang="ts">
	import { divisors, isPrime, primeFactors } from '$lib/math/numbers';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ value: 360 });

	// Above 2^53 the integer arithmetic stops being exact, so refuse politely.
	const n = $derived(Math.trunc(Math.abs(s.value)));
	const valid = $derived(Number.isInteger(n) && n >= 2 && n <= Number.MAX_SAFE_INTEGER);
	const tooBig = $derived(n > 1e15);

	const factors = $derived(valid && !tooBig ? primeFactors(n) : []);
	const prime = $derived(valid && isPrime(n));
	const divs = $derived(valid && n <= 1e7 ? divisors(n) : []);

	const expanded = $derived(
		factors.flatMap((f) => Array.from({ length: f.exponent }, () => f.prime)).join(' × ')
	);
	const exponential = $derived(
		factors.map((f) => (f.exponent === 1 ? String(f.prime) : `${f.prime}^${f.exponent}`)).join(' × ')
	);

	const divisorCount = $derived(factors.reduce((acc, f) => acc * (f.exponent + 1), 1));
	const divisorSum = $derived(
		factors.reduce((acc, f) => acc * ((f.prime ** (f.exponent + 1) - 1) / (f.prime - 1)), 1)
	);
	const isPerfect = $derived(valid && divisorSum - n === n);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field
			label="Number"
			for="pf-value"
			error={!valid && s.value ? 'Enter a whole number of 2 or more' : tooBig ? 'Too large to factor quickly here' : undefined}
		>
			<input id="pf-value" type="number" min="2" step="1" bind:value={s.value} />
		</Field>

		<Result
			label="Prime factorisation"
			primary
			value={prime ? `${n} is prime` : exponential || '—'}
			detail={!prime && expanded !== exponential ? expanded : undefined}
			tone={prime ? 'positive' : 'neutral'}
		/>

		<div class="results-grid">
			<Result label="Is it prime?" value={valid ? (prime ? 'Yes' : 'No') : '—'} tone={prime ? 'positive' : 'neutral'} />
			<Result label="Number of divisors" value={valid ? String(divisorCount) : '—'} detail="Product of (exponent + 1)" />
			<Result label="Sum of divisors" value={valid && divisorSum < 1e15 ? divisorSum.toLocaleString('en-US') : '—'} />
			<Result
				label="Classification"
				value={!valid ? '—' : isPerfect ? 'Perfect' : divisorSum - n > n ? 'Abundant' : 'Deficient'}
				detail="Comparing the sum of proper divisors to the number itself"
			/>
		</div>
	</div>

	{#if factors.length > 1 || (factors.length === 1 && factors[0].exponent > 1)}
		<section class="card">
			<h2>Factor tree</h2>
			<div class="tree">
				{#each factors as f (f.prime)}
					<div class="branch">
						<span class="prime">{f.prime}</span>
						<span class="small muted">× {f.exponent}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if divs.length}
		<section class="card">
			<h2>All {divs.length} divisors</h2>
			<div class="divisors">
				{#each divs as d (d)}
					<button type="button" class="divisor" onclick={() => (s.value = d)}>{d.toLocaleString('en-US')}</button>
				{/each}
			</div>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			Every integer greater than 1 is either prime or a product of primes, and that product is unique
			apart from the order of the factors. This is the fundamental theorem of arithmetic, and it is
			why primes are called the building blocks of the integers.
		</p>
		<code class="formula">360 = 2³ × 3² × 5</code>
		<h3>How the divisor count works</h3>
		<p>
			Once you have the prime factorisation, you get the number of divisors for free. Each divisor
			picks an exponent for every prime, from zero up to its full power — so 2³ × 3² × 5¹ has
			(3+1)(2+1)(1+1) = 24 divisors, without listing a single one.
		</p>
		<h3>Perfect, abundant and deficient</h3>
		<p>
			Add up a number's proper divisors (everything below itself). If they sum to exactly the number,
			it is <strong>perfect</strong> — 6 = 1+2+3, and 28 = 1+2+4+7+14. More than the number is
			<strong>abundant</strong>, less is <strong>deficient</strong>. Only 51 perfect numbers are known,
			and nobody has ever found an odd one.
		</p>
		<h3>Why this is slow for big numbers</h3>
		<p>
			This tool divides by candidate factors up to √n, which is fast for anything you can type but
			hopeless for the hundreds-of-digits numbers used in cryptography. RSA rests entirely on that
			asymmetry: multiplying two large primes is instant, and undoing it is not.
		</p>
	{/snippet}
</ToolShell>

<style>
	.tree {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 0.75rem;
	}
	.branch {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		padding: 0.5rem 0.8rem;
		background: var(--accent-soft);
		border: 1px solid var(--accent-border);
		border-radius: var(--radius-sm);
	}
	.prime {
		font-size: 1.2rem;
		font-weight: 650;
		font-family: var(--font-mono);
	}
	.divisors {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.75rem;
		max-height: 220px;
		overflow-y: auto;
	}
	.divisor {
		padding: 0.2rem 0.5rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		cursor: pointer;
	}
	.divisor:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
</style>
