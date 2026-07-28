<script lang="ts">
	import { gcd, lcm } from '$lib/format';
	import { gcdSteps, primeFactors } from '$lib/math/numbers';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ input: '12, 18, 24' });

	const numbers = $derived(
		s.input
			.split(/[\s,;]+/)
			.map((x) => Number(x))
			.filter((x) => Number.isInteger(x) && x !== 0)
			.map(Math.abs)
	);

	const valid = $derived(numbers.length >= 2);
	const theGcd = $derived(valid ? numbers.reduce((a, b) => gcd(a, b)) : NaN);
	const theLcm = $derived(valid ? numbers.reduce((a, b) => lcm(a, b)) : NaN);
	const coprime = $derived(valid && theGcd === 1);

	const steps = $derived(numbers.length === 2 ? gcdSteps(numbers[0], numbers[1]) : []);

	const factorTable = $derived(
		valid
			? numbers.map((n) => ({
					n,
					factors: primeFactors(n)
						.map((f) => (f.exponent === 1 ? String(f.prime) : `${f.prime}^${f.exponent}`))
						.join(' × ')
				}))
			: []
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field label="Numbers" for="gl-input" hint="Separate with commas or spaces — two or more">
			<input id="gl-input" type="text" bind:value={s.input} autocomplete="off" />
		</Field>

		<div class="results-grid">
			<Result
				label="Greatest common divisor"
				primary
				value={valid ? theGcd.toLocaleString('en-US') : '—'}
				detail={coprime ? 'These numbers are coprime — they share no factor but 1' : undefined}
			/>
			<Result label="Least common multiple" primary value={valid ? theLcm.toLocaleString('en-US') : '—'} />
		</div>
	</div>

	{#if factorTable.length}
		<section class="card">
			<h2>Prime factorisations</h2>
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th class="num">Number</th><th>Prime factors</th></tr></thead>
					<tbody>
						{#each factorTable as row (row.n)}
							<tr><td class="num">{row.n.toLocaleString('en-US')}</td><td class="mono">{row.factors}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="small muted">
				The GCD takes the <em>lowest</em> power of each shared prime; the LCM takes the
				<em>highest</em> power of every prime that appears.
			</p>
		</section>
	{/if}

	{#if steps.length}
		<section class="card">
			<h2>Euclid's algorithm</h2>
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th>Step</th><th class="num">a</th><th class="num">b</th><th class="num">a mod b</th></tr></thead>
					<tbody>
						{#each steps as step, i (i)}
							<tr class:final={step.r === 0}>
								<td>{i + 1}</td>
								<td class="num">{step.a}</td>
								<td class="num">{step.b}</td>
								<td class="num">{step.r}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="small muted">
				When the remainder hits zero, the last non-zero divisor is the GCD: <strong>{theGcd}</strong>.
			</p>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			The <strong>greatest common divisor</strong> is the largest number that divides all of your
			inputs exactly. The <strong>least common multiple</strong> is the smallest number they all
			divide into. They are two views of the same prime factorisations.
		</p>
		<code class="formula">gcd(a, b) × lcm(a, b) = a × b</code>
		<h3>Euclid's algorithm</h3>
		<p>
			Replace the larger number with the remainder of dividing it by the smaller, and repeat. When
			the remainder reaches zero, the last divisor is the answer. It is over two thousand years old
			and still the method every computer uses, because it takes a handful of steps even for enormous
			numbers.
		</p>
		<h3>What each one is for</h3>
		<dl>
			<dt>GCD</dt>
			<dd>Simplifying fractions (divide top and bottom by it), cutting material into equal pieces with no waste, finding the largest tile that fits a floor exactly.</dd>
			<dt>LCM</dt>
			<dd>Adding fractions (it is the least common denominator), and any “when do these two cycles line up again?” question — buses, gears, planetary orbits.</dd>
		</dl>
		<h3>Coprime numbers</h3>
		<p>
			When the GCD is 1, the numbers share no factors and are called coprime. Their LCM is simply
			their product. This is the condition RSA key generation depends on, and the reason gear teeth
			counts are often chosen to be coprime — it spreads wear evenly instead of mating the same two
			teeth forever.
		</p>
	{/snippet}
</ToolShell>

<style>
	tr.final {
		background: var(--accent-soft);
		font-weight: 600;
	}
</style>
