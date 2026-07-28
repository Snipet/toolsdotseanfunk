<script lang="ts">
	import { formatFraction, fmtLoose, parseLooseNumber } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const SAMPLE = `2 cups all-purpose flour
1 1/2 tsp baking powder
3/4 cup granulated sugar
1/2 tsp salt
2 large eggs
1 cup whole milk
6 tbsp butter, melted`;

	const s = urlState({ from: 4, to: 6, text: '' });

	let recipe = $state(SAMPLE);
	// Recipe text is far too long for a query string, so it stays out of the
	// URL; the serving counts are shareable on their own.
	$effect(() => {
		if (s.text) recipe = s.text;
	});

	const factor = $derived(s.from > 0 ? s.to / s.from : 1);

	/**
	 * Scale the leading quantity of each line, leaving the rest of the text
	 * alone. Handles "2", "1 1/2", "3/4" and "1.5".
	 */
	const QUANTITY = /^(\s*)(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d*\.?\d+)(\s*)(.*)$/;

	// Teaspoons are the smallest unit worth writing, so a scaled tablespoon
	// that lands on an awkward value is re-expressed in teaspoons instead.
	const SMALLER: Record<string, { unit: string; per: number }> = {
		tbsp: { unit: 'tsp', per: 3 },
		tablespoon: { unit: 'tsp', per: 3 },
		tablespoons: { unit: 'tsp', per: 3 },
		cup: { unit: 'tbsp', per: 16 },
		cups: { unit: 'tbsp', per: 16 }
	};

	function tidy(value: number, rest: string): string {
		const unitMatch = /^([a-zA-Z]+)\b/.exec(rest.trim());
		const unit = unitMatch?.[1].toLowerCase();

		const asFraction = formatFraction(value, 8);
		const roundedBack = parseLooseNumber(asFraction.replace(/[½⅓⅔¼¾⅛⅜⅝⅞⅙⅚]/g, (m) =>
			({ '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8', '⅙': '1/6', '⅚': '5/6' })[m] ?? m
		));
		const cleanEnough = Math.abs(roundedBack - value) < value * 0.02;

		if (cleanEnough) return asFraction;

		// Not a clean fraction — try the next unit down.
		const smaller = unit ? SMALLER[unit] : undefined;
		if (smaller) {
			const converted = value * smaller.per;
			const convertedFraction = formatFraction(converted, 4);
			return `${convertedFraction} ${smaller.unit} of`;
		}
		return fmtLoose(value, 2);
	}

	const scaled = $derived(
		recipe.split('\n').map((line) => {
			const match = QUANTITY.exec(line);
			if (!match) return { original: line, scaled: line, changed: false };
			const [, lead, qty, space, rest] = match;
			const value = parseLooseNumber(qty);
			if (!Number.isFinite(value) || value === 0) return { original: line, scaled: line, changed: false };
			const next = value * factor;
			const tidied = tidy(next, rest);
			// "3/4 tbsp of" already carries the "of", so drop a duplicate unit.
			const replacedUnit = tidied.endsWith(' of');
			const tail = replacedUnit ? rest.replace(/^[a-zA-Z]+\b\s*/, '') : rest;
			return {
				original: line,
				scaled: `${lead}${tidied}${space}${tail}`,
				changed: true
			};
		})
	);

	const output = $derived(scaled.map((r) => r.scaled).join('\n'));

	const PRESETS = [0.5, 1.5, 2, 3];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="servings">
			<Field label="Original servings" for="rs-from">
				<input id="rs-from" type="number" min="0.25" step="0.25" bind:value={s.from} />
			</Field>
			<span class="arrow" aria-hidden="true">→</span>
			<Field label="New servings" for="rs-to">
				<input id="rs-to" type="number" min="0.25" step="0.25" bind:value={s.to} />
			</Field>
			<div class="factor">
				<span class="small muted">Scale factor</span>
				<strong class="num">×{fmtLoose(factor, 3)}</strong>
			</div>
		</div>

		<div class="presets no-print">
			{#each PRESETS as p (p)}
				<button type="button" class="btn btn-sm" onclick={() => (s.to = s.from * p)}>
					×{p}
				</button>
			{/each}
			<button type="button" class="btn btn-sm" onclick={() => (recipe = SAMPLE)}>Load example</button>
		</div>
	</div>

	<div class="tool-card-grid">
		<div class="card">
			<label for="rs-input">Your recipe — one ingredient per line</label>
			<textarea id="rs-input" bind:value={recipe} rows="12" spellcheck="false"></textarea>
		</div>

		<div class="card">
			<div class="out-head">
				<label for="rs-output">Scaled for {s.to} servings</label>
				<CopyButton value={() => output} label="Copy recipe" />
			</div>
			<output id="rs-output" class="output">
				{#each scaled as row, i (i)}
					<span class="line" class:changed={row.changed}>{row.scaled || ' '}</span>
				{/each}
			</output>
		</div>
	</div>

	<Note>
		<strong>What does not scale linearly:</strong> baking time, pan size, salt in a brine, and yeast in
		a long ferment. Doubling a cake batter needs a bigger pan and a longer, not doubled, bake. Spices
		and chilli are worth scaling by taste rather than arithmetic.
	</Note>

	{#snippet explainer()}
		<p>
			Scaling a recipe is one multiplication per ingredient — the hard part is presenting the answer
			in a form you can actually measure. This tool rounds to kitchen-friendly fractions, and when a
			result lands somewhere awkward it steps down a unit instead: 1⅓ tablespoons becomes 4
			teaspoons, which is a thing you can do with the spoons in your drawer.
		</p>
		<code class="formula">new amount = original × (new servings ÷ original servings)</code>
		<h3>What to watch when scaling up</h3>
		<ul>
			<li><strong>Pan size.</strong> Doubling batter needs double the pan volume, or the bake will overflow and stay raw in the middle. Use the pan converter for the swap.</li>
			<li><strong>Time and temperature.</strong> A larger, deeper mass takes longer at the same temperature, not proportionally longer. Check early and often.</li>
			<li><strong>Leavening.</strong> Baking soda and powder scale linearly up to about double; beyond that they can leave a metallic taste.</li>
			<li><strong>Salt and spice.</strong> Perception is not linear. Scale to about 75% and adjust at the end.</li>
			<li><strong>Pan surface.</strong> Browning depends on surface area, not volume. Doubling a stew in the same pot means less evaporation and a thinner result.</li>
		</ul>
		<h3>Scaling down</h3>
		<p>
			Halving works well until you hit a single egg. A large egg is about 50 g out of shell — weigh
			it, beat it, and use half. Same for a single tablespoon of a strong ingredient: measure the
			whole thing and divide it rather than eyeballing a half-spoon.
		</p>
	{/snippet}
</ToolShell>

<style>
	.servings {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.servings :global(.field) {
		width: 130px;
	}
	.arrow {
		padding-bottom: 0.6rem;
		color: var(--text-faint);
	}
	.factor {
		display: flex;
		flex-direction: column;
		padding-bottom: 0.25rem;
		margin-left: auto;
		text-align: right;
	}
	.factor strong {
		font-size: 1.2rem;
	}
	.presets {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.out-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.3rem;
	}
	.out-head label {
		margin-bottom: 0;
	}
	.output {
		display: block;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.6rem 0.7rem;
		min-height: 274px;
		font-size: 0.94rem;
		line-height: 1.55;
		white-space: pre-wrap;
	}
	.line {
		display: block;
	}
	.line.changed {
		color: var(--text);
	}
	.output .line:not(.changed) {
		color: var(--text-muted);
	}
</style>
