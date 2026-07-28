<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const MODES = [
		{ id: 'of', label: 'X% of Y', a: 'Percent', b: 'Of what' },
		{ id: 'isWhat', label: 'X is what % of Y', a: 'This number', b: 'Out of' },
		{ id: 'change', label: 'Percent change', a: 'From', b: 'To' },
		{ id: 'reverse', label: 'Reverse percentage', a: 'Result', b: 'Was what % of the original' },
		{ id: 'addSub', label: 'Add or subtract a %', a: 'Starting number', b: 'Percent to add' }
	] as const;

	const s = urlState({ mode: 'of', a: 15, b: 80 });

	const mode = $derived(MODES.find((m) => m.id === s.mode) ?? MODES[0]);

	const computed = $derived.by(() => {
		const { a, b } = s;
		switch (s.mode) {
			case 'of':
				return {
					headline: fmtLoose((a / 100) * b, 6),
					label: `${fmtLoose(a, 4)}% of ${fmtLoose(b, 4)}`,
					formula: `${fmtLoose(a, 4)} ÷ 100 × ${fmtLoose(b, 4)}`,
					extras: [
						{ label: 'The remainder', value: fmtLoose(b - (a / 100) * b, 6), detail: `The other ${fmtLoose(100 - a, 4)}%` },
						{ label: 'As a decimal', value: fmtLoose(a / 100, 6) },
						{ label: 'As a fraction of 100', value: `${fmtLoose(a, 4)}/100` }
					]
				};
			case 'isWhat':
				return {
					headline: `${fmtLoose((a / b) * 100, 6)}%`,
					label: `${fmtLoose(a, 4)} out of ${fmtLoose(b, 4)}`,
					formula: `${fmtLoose(a, 4)} ÷ ${fmtLoose(b, 4)} × 100`,
					extras: [
						{ label: 'As a decimal', value: fmtLoose(a / b, 6) },
						{ label: 'The rest', value: `${fmtLoose(100 - (a / b) * 100, 6)}%` },
						{ label: 'Ratio', value: `1 : ${fmtLoose(b / a, 4)}` }
					]
				};
			case 'change': {
				const change = ((b - a) / Math.abs(a)) * 100;
				return {
					headline: `${change >= 0 ? '+' : ''}${fmtLoose(change, 6)}%`,
					label: `${fmtLoose(a, 4)} → ${fmtLoose(b, 4)}`,
					formula: `(${fmtLoose(b, 4)} − ${fmtLoose(a, 4)}) ÷ |${fmtLoose(a, 4)}| × 100`,
					tone: change >= 0 ? ('positive' as const) : ('negative' as const),
					extras: [
						{ label: 'Absolute difference', value: fmtLoose(b - a, 6) },
						{ label: 'Multiplied by', value: `×${fmtLoose(b / a, 4)}` },
						{
							label: 'To reverse it',
							value: `${fmtLoose(((a - b) / Math.abs(b)) * 100, 4)}%`,
							detail: 'A 50% rise needs a 33% fall to undo'
						}
					]
				};
			}
			case 'reverse':
				return {
					headline: fmtLoose(a / (b / 100), 6),
					label: `${fmtLoose(a, 4)} is ${fmtLoose(b, 4)}% of…`,
					formula: `${fmtLoose(a, 4)} ÷ (${fmtLoose(b, 4)} ÷ 100)`,
					extras: [
						{ label: 'The difference', value: fmtLoose(a / (b / 100) - a, 6) },
						{ label: 'Check', value: `${fmtLoose(b, 4)}% × ${fmtLoose(a / (b / 100), 4)} = ${fmtLoose(a, 4)}` }
					]
				};
			default: {
				const added = a * (1 + b / 100);
				const removed = a * (1 - b / 100);
				return {
					headline: fmtLoose(added, 6),
					label: `${fmtLoose(a, 4)} plus ${fmtLoose(b, 4)}%`,
					formula: `${fmtLoose(a, 4)} × (1 + ${fmtLoose(b, 4)} ÷ 100)`,
					extras: [
						{ label: `Minus ${fmtLoose(b, 4)}%`, value: fmtLoose(removed, 6) },
						{ label: 'The amount added', value: fmtLoose(added - a, 6) },
						{
							label: 'Up then down is not neutral',
							value: fmtLoose(a * (1 + b / 100) * (1 - b / 100), 6),
							detail: `+${fmtLoose(b, 2)}% then −${fmtLoose(b, 2)}% lands below where you started`
						}
					]
				};
			}
		}
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="modes no-print" role="tablist" aria-label="Calculation type">
			{#each MODES as m (m.id)}
				<button
					type="button"
					role="tab"
					aria-selected={s.mode === m.id}
					class="btn btn-sm"
					class:btn-primary={s.mode === m.id}
					onclick={() => (s.mode = m.id)}
				>
					{m.label}
				</button>
			{/each}
		</div>

		<div class="field-row">
			<Field label={mode.a} for="pct-a">
				<input id="pct-a" type="number" step="any" bind:value={s.a} />
			</Field>
			<Field label={mode.b} for="pct-b">
				<input id="pct-b" type="number" step="any" bind:value={s.b} />
			</Field>
		</div>

		<Result
			label={computed.label}
			primary
			value={computed.headline}
			detail={computed.formula}
			tone={'tone' in computed ? computed.tone : 'neutral'}
		/>

		<div class="results-grid">
			{#each computed.extras as extra (extra.label)}
				<Result label={extra.label} value={extra.value} detail={'detail' in extra ? extra.detail : undefined} />
			{/each}
		</div>
	</div>

	{#snippet explainer()}
		<p>
			“Per cent” is Latin for “per hundred”, so a percentage is a fraction with 100 on the bottom.
			Every calculation on this page is that one idea rearranged.
		</p>
		<code class="formula">X% of Y          = X ÷ 100 × Y
X is what % of Y = X ÷ Y × 100
percent change   = (new − old) ÷ |old| × 100
reverse          = value ÷ (percent ÷ 100)</code>
		<h3>Percent change is not symmetric</h3>
		<p>
			Going from 100 to 150 is a 50% rise. Going back from 150 to 100 is a 33% fall. The base
			changes, so the two directions never match — which is exactly why a stock that drops 50% needs
			to double just to break even.
		</p>
		<h3>Percent versus percentage point</h3>
		<p>
			If a rate moves from 4% to 6%, that is a rise of <strong>two percentage points</strong> and a
			rise of <strong>50 percent</strong>. Both are true, and the difference is the most common way
			statistics get overstated in headlines.
		</p>
		<h3>Discounts do not stack the way people expect</h3>
		<p>
			“20% off, then another 10% off” is not 30% off. It is 0.8 × 0.9 = 0.72 of the original, so 28%
			off. The second discount applies to the already-reduced price.
		</p>
	{/snippet}
</ToolShell>

<style>
	.modes {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
</style>
