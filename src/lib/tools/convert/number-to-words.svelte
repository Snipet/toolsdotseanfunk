<script lang="ts">
	import { currencyToWords, integerToWords, numberToWords } from '$lib/math/numbers';
	import { ordinal } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ value: '1234.56' });

	const n = $derived(Number(s.value.replace(/[, $]/g, '')));
	const valid = $derived(Number.isFinite(n) && Math.abs(n) < 1e18);

	const sentence = $derived(valid ? numberToWords(n) : '');
	const capitalised = $derived(sentence ? sentence.charAt(0).toUpperCase() + sentence.slice(1) : '—');
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field label="Number" for="ntw" error={s.value && !valid ? 'Enter a number below 10^18' : undefined}>
			<input id="ntw" type="text" inputmode="decimal" bind:value={s.value} autocomplete="off" />
		</Field>

		<Result label="In words" primary value={capitalised} />

		<div class="results-grid">
			<Result label="Cheque / check style" value={valid ? currencyToWords(n) : '—'} />
			<Result label="Whole number only" value={valid ? integerToWords(Math.trunc(n)) : '—'} />
			<Result
				label="Ordinal"
				value={valid && Number.isInteger(n) ? ordinal(n) : '—'}
				detail={valid && Number.isInteger(n) ? `${integerToWords(n)}th-style position` : 'Whole numbers only'}
			/>
			<Result label="Grouped digits" value={valid ? n.toLocaleString('en-US') : '—'} />
		</div>
	</div>

	{#snippet explainer()}
		<p>
			English writes numbers in groups of three, each group followed by its scale word — thousand,
			million, billion. Within a group you say the hundreds, then the tens and units, hyphenated
			when they combine: <code>twenty-one</code>, not <code>twenty one</code>.
		</p>
		<h3>Writing a cheque</h3>
		<p>
			The banking convention is the whole amount in words followed by the cents as a fraction over
			100 — “One thousand two hundred thirty-four and 56/100 dollars”. Cents are never spelled out,
			and the line is usually ruled off afterwards so nothing can be added.
		</p>
		<h3>“And” or no “and”?</h3>
		<p>
			British English inserts “and” before the final part of a number: <em>one hundred and five</em>.
			American English omits it: <em>one hundred five</em>. Cheque-writing guides on both sides use
			“and” only to separate the whole amount from the fraction, which is the convention used here.
		</p>
		<h3>Short scale vs long scale</h3>
		<p>
			This tool uses the short scale, where a billion is 10⁹. Several European languages use the long
			scale, where a billion is 10¹² and 10⁹ is a “milliard” — a genuine source of translation bugs
			in financial documents.
		</p>
	{/snippet}
</ToolShell>
