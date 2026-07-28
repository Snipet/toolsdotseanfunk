<script lang="ts">
	import { combinations, factorial, permutations } from '$lib/math/stats';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ n: 52, r: 5 });

	const big = (v: number) =>
		!Number.isFinite(v) ? '—' : v > 1e15 ? v.toExponential(6) : Math.round(v).toLocaleString('en-US');

	const nCr = $derived(combinations(s.n, s.r));
	const nPr = $derived(permutations(s.n, s.r));
	const withRepetitionOrdered = $derived(s.n ** s.r);
	const withRepetitionUnordered = $derived(combinations(s.n + s.r - 1, s.r));

	const EXAMPLES = [
		{ label: 'Poker hand from a deck', n: 52, r: 5 },
		{ label: 'UK Lotto (6 from 59)', n: 59, r: 6 },
		{ label: 'Powerball white balls', n: 69, r: 5 },
		{ label: 'Pizza toppings, 3 from 12', n: 12, r: 3 },
		{ label: 'Podium from 8 runners', n: 8, r: 3 }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="n — how many to choose from" for="cp-n">
				<input id="cp-n" type="number" min="0" max="2000" bind:value={s.n} />
			</Field>
			<Field label="r — how many you pick" for="cp-r" error={s.r > s.n ? 'r cannot exceed n' : undefined}>
				<input id="cp-r" type="number" min="0" max="2000" bind:value={s.r} />
			</Field>
		</div>

		<div class="results-grid">
			<Result
				label="Combinations — nCr"
				primary
				value={big(nCr)}
				detail="Order does not matter, no repeats"
			/>
			<Result
				label="Permutations — nPr"
				primary
				value={big(nPr)}
				detail="Order matters, no repeats"
			/>
			<Result label="With repetition, ordered" value={big(withRepetitionOrdered)} detail="nʳ — like a PIN" />
			<Result label="With repetition, unordered" value={big(withRepetitionUnordered)} detail="Multiset: C(n+r−1, r)" />
			<Result label="n!" value={big(factorial(s.n))} />
			<Result label="Odds of one specific combination" value={Number.isFinite(nCr) && nCr > 0 ? `1 in ${big(nCr)}` : '—'} />
		</div>

		<div class="row no-print">
			<span class="small muted">Try:</span>
			{#each EXAMPLES as ex (ex.label)}
				<button type="button" class="btn btn-sm" onclick={() => { s.n = ex.n; s.r = ex.r; }}>{ex.label}</button>
			{/each}
		</div>
	</div>

	{#snippet explainer()}
		<p>
			The only question that matters is whether order counts. Choosing three people for a committee
			is a combination — the same three people in any order is the same committee. Choosing gold,
			silver and bronze is a permutation, because swapping two of them is a different outcome.
		</p>
		<code class="formula">nPr = n! / (n − r)!
nCr = n! / (r! · (n − r)!)  =  nPr / r!</code>
		<h3>Why combinations divide by r!</h3>
		<p>
			Every unordered selection of r items can be arranged in r! ways. Permutations count all of
			those separately, so dividing by r! collapses them back into one. That single division is the
			whole difference between the two formulas.
		</p>
		<h3>The four cases</h3>
		<dl>
			<dt>Order matters, no repeats</dt>
			<dd>nPr — race finishes, seating arrangements, passwords with distinct characters.</dd>
			<dt>Order does not matter, no repeats</dt>
			<dd>nCr — lottery tickets, poker hands, committees.</dd>
			<dt>Order matters, repeats allowed</dt>
			<dd>nʳ — PINs, dice rolls in sequence, license plates.</dd>
			<dt>Order does not matter, repeats allowed</dt>
			<dd>C(n+r−1, r) — scoops of ice cream, coin denominations in a handful.</dd>
		</dl>
		<h3>How fast these grow</h3>
		<p>
			52 cards choose 5 is about 2.6 million. Choose 26 instead and it exceeds 495 trillion. A
			shuffled deck has 52! orderings — a number with 68 digits, larger than the estimated count of
			atoms in our galaxy. Any deck you shuffle properly has, in all likelihood, never existed before.
		</p>
	{/snippet}
</ToolShell>
