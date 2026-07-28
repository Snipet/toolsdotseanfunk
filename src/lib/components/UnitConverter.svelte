<script lang="ts">
	import { untrack } from 'svelte';
	import { base } from '$app/paths';
	import {
		DIMENSION_BY_ID,
		DIMENSIONS,
		conversionFormula,
		convert,
		formatNumber,
		toSignificant,
		unitLabel,
		type Dimension,
		type Unit
	} from '$lib/units/units';
	import { formatFraction, parseLooseNumber } from '$lib/format';
	import { CONVERTER_PAIRS, TOOL_BY_PATH, type Tool } from '$lib/catalog';
	import { urlState } from '$lib/state/urlstate.svelte';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	interface Props {
		tool: Tool;
		/** Pair mode: a dedicated `/convert/x-to-y` page. */
		from?: string;
		to?: string;
		/** Dimension mode: the full `/convert/length` page. */
		dimensionId?: string;
	}

	let { tool, from, to, dimensionId }: Props = $props();

	function dimensionFor(unitId: string): Dimension {
		return DIMENSIONS.find((d) => d.units.some((u) => u.id === unitId))!;
	}

	/**
	 * These props come from the route and never change for a given page — a
	 * navigation creates a fresh component. untrack() records that the initial
	 * read is deliberate rather than a missed reactive dependency.
	 */
	const dimension: Dimension = untrack(() =>
		dimensionId ? DIMENSION_BY_ID.get(dimensionId)! : dimensionFor(from!)
	);

	const defaults = untrack(() => ({
		value: '1',
		from: from ?? dimension.units[0].id,
		to: to ?? dimension.units[1].id,
		precision: 8
	}));

	const s = urlState(defaults);

	const numericValue = $derived(parseLooseNumber(s.value));
	const fromUnit = $derived<Unit>(
		dimension.units.find((u) => u.id === s.from) ?? dimension.units[0]
	);
	const toUnit = $derived<Unit>(dimension.units.find((u) => u.id === s.to) ?? dimension.units[1]);

	const raw = $derived(Number.isFinite(numericValue) ? convert(numericValue, fromUnit, toUnit) : NaN);
	const result = $derived(Number.isFinite(raw) ? toSignificant(raw, s.precision) : NaN);
	const resultText = $derived(Number.isFinite(result) ? formatNumber(result, s.precision) : '—');

	/** Cooks and carpenters want a fraction, not 2.2500001. */
	const showFraction = $derived(
		(dimension.id === 'volume' || dimension.id === 'length') &&
			Number.isFinite(result) &&
			Math.abs(result) > 0 &&
			Math.abs(result) < 1000 &&
			Math.abs(result - Math.round(result)) > 1e-9
	);

	const allUnits = $derived(
		Number.isFinite(numericValue)
			? dimension.units.map((u) => ({
					unit: u,
					value: convert(numericValue, fromUnit, u)
				}))
			: []
	);

	/** A small "1, 2, 3…" table, the thing people screenshot. */
	const referenceRows = $derived.by(() => {
		const steps =
			dimension.id === 'temperature'
				? [-40, 0, 20, 32, 50, 68, 98.6, 100, 212].filter(() => true)
				: [1, 2, 3, 4, 5, 10, 25, 50, 100];
		return steps.map((n) => ({ n, converted: convert(n, fromUnit, toUnit) }));
	});

	const otherPairs = $derived(
		CONVERTER_PAIRS.filter(([f, t2]) => {
			const d = dimensionFor(f);
			return d.id === dimension.id && !(f === s.from && t2 === s.to);
		})
			.map(([f, t2]) => TOOL_BY_PATH.get(`convert/${f}-to-${t2}`))
			.filter((x): x is Tool => Boolean(x))
			.slice(0, 8)
	);

	function swap() {
		[s.from, s.to] = [s.to, s.from];
		if (Number.isFinite(result)) s.value = String(toSignificant(result, s.precision));
	}

	const title = $derived(
		from && to
			? `Convert ${fromUnit.plural ?? fromUnit.name + 's'} to ${toUnit.plural ?? toUnit.name + 's'}`
			: `${dimension.name} converter`
	);

	const copyAll = () =>
		allUnits.map(({ unit, value }) => `${formatNumber(value, s.precision)}\t${unit.symbol}`).join('\n');
</script>

<ToolShell {tool} {title}>
	<div class="converter card">
		<div class="inputs">
			<Field label="Value" for="conv-value">
				<input
					id="conv-value"
					type="text"
					inputmode="decimal"
					bind:value={s.value}
					aria-describedby="conv-result"
					autocomplete="off"
				/>
			</Field>

			<Field label="From" for="conv-from">
				<select id="conv-from" bind:value={s.from}>
					{#each dimension.units as unit (unit.id)}
						<option value={unit.id}>{unit.name} ({unit.symbol})</option>
					{/each}
				</select>
			</Field>

			<button type="button" class="btn swap" onclick={swap} aria-label="Swap units" title="Swap units">
				<Icon name="swap" size={17} />
			</button>

			<Field label="To" for="conv-to">
				<select id="conv-to" bind:value={s.to}>
					{#each dimension.units as unit (unit.id)}
						<option value={unit.id}>{unit.name} ({unit.symbol})</option>
					{/each}
				</select>
			</Field>
		</div>

		<div id="conv-result">
			<Result
				label="Result"
				primary
				value={Number.isFinite(result)
					? `${resultText} ${unitLabel(toUnit, result)}`
					: 'Enter a number'}
				detail={showFraction
					? `≈ ${formatFraction(result)} ${unitLabel(toUnit, result)}  ·  ${conversionFormula(fromUnit, toUnit)}`
					: conversionFormula(fromUnit, toUnit)}
			/>
		</div>

		{#if fromUnit.note || toUnit.note}
			<p class="notes small muted">
				{#if fromUnit.note}<span>{fromUnit.symbol}: {fromUnit.note}</span>{/if}
				{#if toUnit.note}<span>{toUnit.symbol}: {toUnit.note}</span>{/if}
			</p>
		{/if}

		<div class="precision no-print">
			<label for="conv-precision">Significant figures: {s.precision}</label>
			<input id="conv-precision" type="range" min="2" max="15" bind:value={s.precision} />
		</div>
	</div>

	<section class="card">
		<div class="section-head">
			<h2>All {dimension.name.toLowerCase()} units</h2>
			<CopyButton value={copyAll} label="Copy table" />
		</div>
		<div class="scroll-x">
			<table class="data">
				<thead>
					<tr>
						<th>Unit</th>
						<th class="num">Value</th>
						<th>Symbol</th>
					</tr>
				</thead>
				<tbody>
					{#each allUnits as row (row.unit.id)}
						<tr class:active={row.unit.id === s.to}>
							<td>
								<button type="button" class="unit-link" onclick={() => (s.to = row.unit.id)}>
									{row.unit.name}
								</button>
							</td>
							<td class="num">{formatNumber(row.value, s.precision)}</td>
							<td class="muted">{row.unit.symbol}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="card">
		<h2>
			{fromUnit.plural ?? fromUnit.name + 's'} to {toUnit.plural ?? toUnit.name + 's'} at a glance
		</h2>
		<div class="scroll-x">
			<table class="data">
				<thead>
					<tr>
						<th class="num">{fromUnit.symbol}</th>
						<th class="num">{toUnit.symbol}</th>
					</tr>
				</thead>
				<tbody>
					{#each referenceRows as row (row.n)}
						<tr>
							<td class="num">{formatNumber(row.n)}</td>
							<td class="num">{formatNumber(row.converted, 6)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#if otherPairs.length}
		<section class="pairs no-print">
			<h2>Other {dimension.name.toLowerCase()} conversions</h2>
			<div class="pair-links">
				{#each otherPairs as pair (pair.slug)}
					<a href="{base}/convert/{pair.slug}">{pair.title}</a>
				{/each}
			</div>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			Every unit in this dimension is defined as a ratio to one base unit — the
			<strong>{dimension.units.find((u) => u.id === dimension.base)?.name}</strong>. Converting is
			therefore two multiplications: into the base unit, then out of it.
		</p>
		<code class="formula">{conversionFormula(fromUnit, toUnit)}</code>
		{#if dimension.id === 'temperature'}
			<p>
				Temperature is the exception. Its scales have different zero points as well as different
				step sizes, so the conversion is affine (multiply <em>and</em> shift) rather than a single
				ratio. That is why −40 °C and −40 °F are the same temperature: it is the one point where
				the two lines cross.
			</p>
		{/if}
		{#if dimension.id === 'volume'}
			<h3>US, imperial and metric cups are not the same</h3>
			<p>
				A US cup is 236.588 mL, an imperial (UK) cup is 284.131 mL, and a metric cup — used in
				Australia and most modern recipe books — is exactly 250 mL. A recipe that says "1 cup" can
				mean any of the three, so this converter lists them separately rather than guessing.
			</p>
		{/if}
		{#if dimension.id === 'data'}
			<h3>Why your 1 TB drive shows up as 931 GB</h3>
			<p>
				Drive manufacturers use decimal units: 1 TB = 1,000,000,000,000 bytes. Operating systems
				have historically reported binary units, where 1 TiB = 1,099,511,627,776 bytes — but label
				them "GB". The disk is the size advertised; the two are just counting differently.
			</p>
		{/if}
		{#if dimension.id === 'fuel-economy'}
			<h3>Miles per gallon and L/100 km run in opposite directions</h3>
			<p>
				MPG measures distance per fuel; L/100 km measures fuel per distance. They are reciprocals,
				so a higher MPG is better while a <em>lower</em> L/100 km is better, and going from 15 to
				20 MPG saves far more fuel than going from 40 to 45.
			</p>
		{/if}
		<h3>Rounding</h3>
		<p>
			Results are rounded to {s.precision} significant figures, adjustable with the slider above. Exact
			factors are used internally, so chaining conversions does not accumulate error.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Conversion factors follow <strong>NIST Special Publication 811</strong> (Guide for the Use of the
			International System of Units) and the BIPM SI Brochure, 9th edition. Every factor is checked by
			an automated round-trip test on each build.
		</p>
	{/snippet}
</ToolShell>

<style>
	.converter {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.inputs {
		display: grid;
		grid-template-columns: minmax(110px, 0.8fr) 1fr auto 1fr;
		gap: 0.75rem;
		align-items: end;
	}

	.swap {
		height: 42px;
		width: 42px;
		padding: 0;
		flex: none;
	}

	.notes {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.precision label {
		margin-bottom: 0.15rem;
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	section.card h2 {
		font-size: 1.05rem;
		margin-bottom: 0.75rem;
	}
	.section-head h2 {
		margin-bottom: 0;
	}

	tr.active {
		background: var(--accent-soft);
	}

	.unit-link {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: inherit;
		font: inherit;
		text-align: left;
	}
	.unit-link:hover {
		color: var(--accent);
		text-decoration: underline;
	}

	.pairs h2 {
		font-size: 1.05rem;
		margin-bottom: 0.6rem;
	}

	.pair-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.pair-links a {
		font-size: 0.85rem;
		padding: 0.3rem 0.65rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg-raised);
		text-decoration: none;
		color: var(--text-muted);
	}
	.pair-links a:hover {
		border-color: var(--accent-border);
		color: var(--accent);
	}

	@media (max-width: 720px) {
		.inputs {
			grid-template-columns: 1fr 1fr;
		}
		.swap {
			grid-column: 2;
			justify-self: end;
		}
	}
</style>
