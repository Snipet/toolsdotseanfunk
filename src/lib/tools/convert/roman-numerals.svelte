<script lang="ts">
	import { fromRoman, toRoman } from '$lib/omnibox';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ value: '2026', roman: '' });

	const asNumber = $derived(Number(s.value.replace(/,/g, '')));
	const numberValid = $derived(Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 3999999);
	const romanOut = $derived(numberValid ? toRoman(asNumber) : '');

	const romanIn = $derived(s.roman.trim());
	const romanValue = $derived(romanIn ? fromRoman(romanIn) : NaN);
	// Round-tripping is the honest validity check: MMXXVI is well-formed,
	// IIII and MCMC are not, even though both "parse".
	const romanValid = $derived(
		Boolean(romanIn) && romanValue > 0 && toRoman(romanValue).toUpperCase() === romanIn.toUpperCase()
	);

	const SYMBOLS = [
		{ symbol: 'I', value: 1 },
		{ symbol: 'V', value: 5 },
		{ symbol: 'X', value: 10 },
		{ symbol: 'L', value: 50 },
		{ symbol: 'C', value: 100 },
		{ symbol: 'D', value: 500 },
		{ symbol: 'M', value: 1000 }
	];

	const YEARS = [1000, 1500, 1776, 1900, 1969, 1984, 2000, 2026];
</script>

<ToolShell {tool}>
	<div class="tool-card-grid">
		<div class="card stack">
			<h2>Number → Roman</h2>
			<Field
				label="Number (1–3,999,999)"
				for="rn-number"
				error={s.value && !numberValid ? 'Enter a whole number from 1 to 3,999,999' : undefined}
			>
				<input id="rn-number" type="text" inputmode="numeric" bind:value={s.value} autocomplete="off" />
			</Field>
			<Result label="Roman numeral" primary value={romanOut || '—'} detail={numberValid && asNumber > 3999 ? 'An overline multiplies a numeral by 1,000' : undefined} />
		</div>

		<div class="card stack">
			<h2>Roman → Number</h2>
			<Field
				label="Roman numeral"
				for="rn-roman"
				error={romanIn && !romanValid ? 'Not a well-formed Roman numeral' : undefined}
			>
				<input
					id="rn-roman"
					type="text"
					class="mono"
					bind:value={s.roman}
					placeholder="MCMXCIV"
					autocomplete="off"
					spellcheck="false"
					style="text-transform: uppercase"
				/>
			</Field>
			<Result label="Value" primary value={romanValid ? romanValue.toLocaleString('en-US') : '—'} />
		</div>
	</div>

	<section class="card">
		<h2>The seven symbols</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Symbol</th><th class="num">Value</th></tr></thead>
				<tbody>
					{#each SYMBOLS as row (row.symbol)}
						<tr><td class="mono">{row.symbol}</td><td class="num">{row.value.toLocaleString('en-US')}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="card">
		<h2>Common years</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th class="num">Year</th><th>Roman</th></tr></thead>
				<tbody>
					{#each YEARS as year (year)}
						<tr>
							<td class="num">{year}</td>
							<td class="mono">{toRoman(year)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Roman numerals are additive, read left to right, with one twist: a smaller symbol placed
			<em>before</em> a larger one is subtracted instead of added. That is why 4 is IV (5 − 1) rather
			than IIII, and 9 is IX rather than VIIII.
		</p>
		<h3>The subtractive rules</h3>
		<ul>
			<li>Only I, X and C are ever subtracted — never V, L or D.</li>
			<li>I subtracts only from V and X; X only from L and C; C only from D and M.</li>
			<li>No symbol repeats more than three times in a row.</li>
		</ul>
		<p>
			Those rules make the notation unambiguous, which is why this tool validates by converting your
			input back to a number and then to a numeral again: if the two do not match, the numeral is
			malformed.
		</p>
		<h3>Numbers above 3,999</h3>
		<p>
			Classical Roman numerals stop at MMMCMXCIX (3,999) because you would need four Ms for 4,000.
			The standard extension is the <em>vinculum</em>: an overline multiplies a numeral by a thousand,
			so V̅ is 5,000. This tool uses combining overlines so the result copies as real text.
		</p>
		<h3>Clock faces</h3>
		<p>
			Watch dials traditionally show IIII rather than IV, for visual balance against the VIII
			opposite. It is a stylistic convention, not a numbering system, so it is not accepted here.
		</p>
	{/snippet}
</ToolShell>

<style>
	h2 {
		font-size: 1rem;
	}
</style>
