<script lang="ts">
	import { fmtLoose, formatFraction, parseLooseNumber } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	// One US stick of butter: 1/2 cup, 8 tbsp, 4 oz, 113.4 g.
	const GRAMS_PER_STICK = 113.398093;

	const UNITS = [
		{ id: 'stick', name: 'sticks', perStick: 1 },
		{ id: 'tbsp', name: 'tablespoons', perStick: 8 },
		{ id: 'tsp', name: 'teaspoons', perStick: 24 },
		{ id: 'cup', name: 'cups', perStick: 0.5 },
		{ id: 'gram', name: 'grams', perStick: GRAMS_PER_STICK },
		{ id: 'ounce', name: 'ounces', perStick: 4 },
		{ id: 'pound', name: 'pounds', perStick: 0.25 },
		{ id: 'block-uk', name: 'UK 250 g blocks', perStick: GRAMS_PER_STICK / 250 }
	];

	const s = urlState({ amount: '1', unit: 'stick' });

	const amount = $derived(parseLooseNumber(s.amount));
	const unit = $derived(UNITS.find((u) => u.id === s.unit) ?? UNITS[0]);
	const sticks = $derived(Number.isFinite(amount) ? amount / unit.perStick : NaN);
	const valid = $derived(Number.isFinite(sticks));
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Amount" for="bc-amount" hint="Fractions like 1 1/2 work">
				<input id="bc-amount" type="text" inputmode="decimal" bind:value={s.amount} autocomplete="off" />
			</Field>
			<Field label="Unit" for="bc-unit">
				<select id="bc-unit" bind:value={s.unit}>
					{#each UNITS as u (u.id)}
						<option value={u.id}>{u.name}</option>
					{/each}
				</select>
			</Field>
		</div>

		<div class="results-grid">
			{#each UNITS.filter((u) => u.id !== s.unit) as u (u.id)}
				{@const value = sticks * u.perStick}
				<Result
					label={u.name}
					primary={u.id === 'gram'}
					value={valid ? (u.id === 'gram' ? `${fmtLoose(value, 1)} g` : formatFraction(value, 16)) : '—'}
					detail={valid && u.id !== 'gram' ? fmtLoose(value, 3) : undefined}
				/>
			{/each}
		</div>
	</div>

	<section class="card">
		<h2>The stick, at a glance</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Butter</th><th class="num">Sticks</th><th class="num">Tbsp</th><th class="num">Cups</th><th class="num">Grams</th></tr></thead>
				<tbody>
					{#each [0.25, 0.5, 1, 1.5, 2, 3, 4] as n (n)}
						<tr>
							<td>{formatFraction(n)} stick{n === 1 ? '' : 's'}</td>
							<td class="num">{formatFraction(n)}</td>
							<td class="num">{formatFraction(n * 8)}</td>
							<td class="num">{formatFraction(n * 0.5)}</td>
							<td class="num">{Math.round(n * GRAMS_PER_STICK)} g</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			A US stick of butter is a quarter-pound: 4 oz, 113 g, half a cup, or 8 tablespoons. The
			wrapper is printed with tablespoon marks, which is why American recipes cheerfully call for “6
			tablespoons of butter” — you just cut on the line.
		</p>
		<code class="formula">1 stick = 1/2 cup = 8 tbsp = 4 oz = 113.4 g</code>
		<h3>Outside the US</h3>
		<p>
			Most of the world sells butter in 250 g or 500 g blocks with no markings, so recipes specify
			weight instead. A 250 g block is about 2.2 US sticks — which is why halving an American recipe
			with a European block usually means reaching for the scale.
		</p>
		<h3>East-coast vs west-coast sticks</h3>
		<p>
			Both weigh 4 oz, but they are shaped differently: “Elgin” sticks (eastern US) are long and thin,
			western sticks are short and stubby. The weight and the tablespoon markings are identical, so
			any recipe works with either.
		</p>
	{/snippet}
</ToolShell>
