<script lang="ts">
	import { gcd, lcm } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ aw: 0, an: 1, ad: 2, op: '+', bw: 0, bn: 1, bd: 3 });

	/** Mixed number → improper numerator, preserving the sign of the whole part. */
	function improper(whole: number, num: number, den: number): [number, number] {
		const sign = whole < 0 ? -1 : 1;
		return [sign * (Math.abs(whole) * Math.abs(den) + Math.abs(num)), Math.abs(den)];
	}

	function simplify(n: number, d: number): [number, number] {
		if (d === 0) return [NaN, NaN];
		const g = gcd(Math.abs(n), Math.abs(d)) || 1;
		const sign = d < 0 ? -1 : 1;
		return [(sign * n) / g, (sign * d) / g];
	}

	const a = $derived(improper(s.aw, s.an, s.ad));
	const b = $derived(improper(s.bw, s.bn, s.bd));

	const raw = $derived.by<[number, number]>(() => {
		const [an, ad] = a;
		const [bn, bd] = b;
		switch (s.op) {
			case '+':
				return [an * bd + bn * ad, ad * bd];
			case '-':
				return [an * bd - bn * ad, ad * bd];
			case '*':
				return [an * bn, ad * bd];
			default:
				return [an * bd, ad * bn];
		}
	});

	const [rn, rd] = $derived(simplify(raw[0], raw[1]));
	const valid = $derived(Number.isFinite(rn) && Number.isFinite(rd) && rd !== 0);
	const decimal = $derived(rn / rd);

	const whole = $derived(Math.trunc(rn / rd));
	const remainder = $derived(Math.abs(rn % rd));

	const mixed = $derived(
		!valid
			? '—'
			: remainder === 0
				? String(whole)
				: whole === 0
					? `${rn < 0 ? '−' : ''}${Math.abs(rn)}/${rd}`
					: `${whole} ${remainder}/${rd}`
	);

	// The steps a teacher wants to see: common denominator, then combine.
	const commonDenominator = $derived(lcm(a[1], b[1]));
	const aScaled = $derived((a[0] * commonDenominator) / a[1]);
	const bScaled = $derived((b[0] * commonDenominator) / b[1]);

	const fmtFrac = (n: number, d: number) => (d === 1 ? String(n) : `${n}/${d}`);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="equation">
			<fieldset class="frac-input">
				<legend class="visually-hidden">First fraction</legend>
				<input type="number" bind:value={s.aw} aria-label="First whole number" class="whole" />
				<div class="stack-frac">
					<input type="number" bind:value={s.an} aria-label="First numerator" />
					<span class="bar"></span>
					<input type="number" bind:value={s.ad} aria-label="First denominator" min="1" />
				</div>
			</fieldset>

			<select bind:value={s.op} aria-label="Operation" class="op">
				<option value="+">+</option>
				<option value="-">−</option>
				<option value="*">×</option>
				<option value="/">÷</option>
			</select>

			<fieldset class="frac-input">
				<legend class="visually-hidden">Second fraction</legend>
				<input type="number" bind:value={s.bw} aria-label="Second whole number" class="whole" />
				<div class="stack-frac">
					<input type="number" bind:value={s.bn} aria-label="Second numerator" />
					<span class="bar"></span>
					<input type="number" bind:value={s.bd} aria-label="Second denominator" min="1" />
				</div>
			</fieldset>
		</div>

		<div class="results-grid">
			<Result label="Simplified" primary value={valid ? fmtFrac(rn, rd) : '—'} />
			<Result label="Mixed number" value={mixed} />
			<Result label="Decimal" value={valid ? String(Number(decimal.toPrecision(12))) : '—'} />
			<Result label="Percent" value={valid ? `${Number((decimal * 100).toPrecision(10))}%` : '—'} />
		</div>
	</div>

	{#if valid}
		<section class="card">
			<h2>Step by step</h2>
			<ol class="steps">
				<li>
					<span class="step-label">Write both as improper fractions</span>
					<code>{fmtFrac(a[0], a[1])} {s.op === '*' ? '×' : s.op === '/' ? '÷' : s.op === '-' ? '−' : '+'} {fmtFrac(b[0], b[1])}</code>
				</li>
				{#if s.op === '+' || s.op === '-'}
					<li>
						<span class="step-label">Find the least common denominator</span>
						<code>LCD({a[1]}, {b[1]}) = {commonDenominator}</code>
					</li>
					<li>
						<span class="step-label">Rewrite over that denominator</span>
						<code>{aScaled}/{commonDenominator} {s.op === '-' ? '−' : '+'} {bScaled}/{commonDenominator}</code>
					</li>
					<li>
						<span class="step-label">Combine the numerators</span>
						<code>{s.op === '-' ? aScaled - bScaled : aScaled + bScaled}/{commonDenominator}</code>
					</li>
				{:else if s.op === '*'}
					<li>
						<span class="step-label">Multiply across the top and the bottom</span>
						<code>({a[0]} × {b[0]}) / ({a[1]} × {b[1]}) = {raw[0]}/{raw[1]}</code>
					</li>
				{:else}
					<li>
						<span class="step-label">Multiply by the reciprocal of the second fraction</span>
						<code>{fmtFrac(a[0], a[1])} × {fmtFrac(b[1], b[0])} = {raw[0]}/{raw[1]}</code>
					</li>
				{/if}
				<li>
					<span class="step-label">Divide top and bottom by their GCD</span>
					<code>GCD({Math.abs(raw[0])}, {Math.abs(raw[1])}) = {gcd(Math.abs(raw[0]), Math.abs(raw[1])) || 1} → {fmtFrac(rn, rd)}</code>
				</li>
			</ol>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			Fractions only add and subtract when they are cut into the same size pieces — that is what a
			common denominator is for. Multiplication and division need no such setup, which is why they
			are, counter-intuitively, the easier operations.
		</p>
		<code class="formula">a/b + c/d = (ad + cb) / bd
a/b × c/d = ac / bd
a/b ÷ c/d = a/b × d/c</code>
		<h3>Why dividing flips the second fraction</h3>
		<p>
			Dividing by a number is the same as multiplying by its reciprocal. “How many halves are in
			3?” is 3 ÷ ½, and the answer is 6 — because you are asking how many times the smaller piece
			fits, which multiplication by 2 answers directly.
		</p>
		<h3>Lowest terms</h3>
		<p>
			A fraction is simplified when the numerator and denominator share no factor but 1. Dividing
			both by their greatest common divisor does it in one step, which is what the last step above
			shows.
		</p>
	{/snippet}
</ToolShell>

<style>
	.equation {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.frac-input {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.whole {
		width: 68px;
		text-align: center;
	}
	.stack-frac {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
	}
	.stack-frac input {
		width: 68px;
		text-align: center;
		min-height: 38px;
	}
	.bar {
		width: 68px;
		height: 2px;
		background: var(--text);
	}
	.op {
		width: 62px;
		text-align: center;
		font-size: 1.2rem;
		flex: none;
	}
	.steps {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		margin: 0.75rem 0 0;
		padding-left: 1.2rem;
	}
	.step-label {
		display: block;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.steps code {
		display: inline-block;
		margin-top: 0.2rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 0.15rem 0.45rem;
	}
</style>
