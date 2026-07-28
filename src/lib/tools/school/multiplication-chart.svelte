<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ size: 12, blank: false, highlight: true, start: 1 });

	const range = $derived(
		Array.from({ length: Math.max(1, Math.min(20, s.size)) }, (_, i) => i + Math.max(0, s.start))
	);

	let hoverRow = $state<number | null>(null);
	let hoverCol = $state<number | null>(null);
</script>

<ToolShell {tool}>
	<div class="card stack no-print">
		<div class="field-row">
			<Field label="Table size: {s.size} × {s.size}" for="mc-size">
				<input id="mc-size" type="range" min="5" max="20" bind:value={s.size} />
			</Field>
			<Field label="Starting number" for="mc-start">
				<input id="mc-start" type="number" min="0" max="20" bind:value={s.start} />
			</Field>
			<div class="checks">
				<label class="check"><input type="checkbox" bind:checked={s.blank} /> Blank — for practice</label>
				<label class="check"><input type="checkbox" bind:checked={s.highlight} /> Highlight on hover</label>
			</div>
		</div>
		<button type="button" class="btn btn-primary" onclick={() => window.print()}>
			<Icon name="print" size={16} /> Print this chart
		</button>
	</div>

	<div class="chart-wrap scroll-x">
		<table class="chart" class:blank={s.blank}>
			<caption class="visually-hidden">Multiplication table from {range[0]} to {range[range.length - 1]}</caption>
			<thead>
				<tr>
					<th scope="col" class="corner">×</th>
					{#each range as col (col)}
						<th scope="col" class:hot={s.highlight && hoverCol === col}>{col}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each range as row (row)}
					<tr>
						<th scope="row" class:hot={s.highlight && hoverRow === row}>{row}</th>
						{#each range as col (col)}
							<td
								class:diagonal={row === col}
								class:crosshair={s.highlight && (hoverRow === row || hoverCol === col)}
								class:target={s.highlight && hoverRow === row && hoverCol === col}
								onmouseenter={() => {
									hoverRow = row;
									hoverCol = col;
								}}
								onmouseleave={() => {
									hoverRow = null;
									hoverCol = null;
								}}
							>
								{s.blank ? '' : row * col}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#snippet explainer()}
		<p>
			A multiplication table is the multiplication operation laid out as a grid: the cell at row
			<em>a</em>, column <em>b</em> holds <em>a</em> × <em>b</em>.
		</p>
		<h3>It is symmetric, which halves the work</h3>
		<p>
			Multiplication is commutative, so the table mirrors along the diagonal — 7 × 8 and 8 × 7 are
			the same cell reflected. A learner memorising the 12 × 12 table has 144 cells but only 78
			distinct facts, and rather fewer once the easy rows are accounted for.
		</p>
		<h3>The rows worth learning first</h3>
		<ul>
			<li><strong>1 and 10</strong> are free.</li>
			<li><strong>2, 4, 8</strong> are repeated doubling.</li>
			<li><strong>5</strong> ends in 0 or 5, and is half of the 10 row.</li>
			<li><strong>9</strong> has the digit trick: the digits of each answer sum to 9, and the tens digit is one less than the multiplier.</li>
			<li><strong>11</strong> up to 9 is just the digit repeated.</li>
		</ul>
		<p>
			That leaves a genuinely small set of hard facts — 6×7, 6×8, 7×8, 7×9 and a handful of others.
			Naming them explicitly is more effective than drilling the whole grid.
		</p>
		<h3>The diagonal</h3>
		<p>
			The highlighted diagonal is the perfect squares: 1, 4, 9, 16, 25. The gaps between consecutive
			squares are the odd numbers — 3, 5, 7, 9 — which is a neat visual proof that the sum of the
			first n odd numbers is n².
		</p>
	{/snippet}
</ToolShell>

<style>
	.chart-wrap {
		display: flex;
		justify-content: center;
	}
	table.chart {
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
		background: var(--bg-raised);
	}
	table.chart th,
	table.chart td {
		border: 1px solid var(--border);
		text-align: center;
		padding: 0.4rem 0.5rem;
		min-width: 44px;
		font-size: 0.88rem;
	}
	table.chart th {
		background: var(--bg-sunken);
		font-weight: 700;
	}
	.corner {
		background: var(--accent-soft);
		color: var(--accent);
	}
	td.diagonal {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		font-weight: 600;
	}
	td.crosshair {
		background: color-mix(in srgb, var(--accent) 18%, transparent);
	}
	td.target {
		background: var(--accent);
		color: #fff;
		font-weight: 700;
	}
	th.hot {
		background: var(--accent-soft);
		color: var(--accent);
	}
	table.blank td {
		height: 38px;
	}
	.checks {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		justify-content: flex-end;
		padding-bottom: 0.4rem;
	}
	@media print {
		table.chart th,
		table.chart td {
			border-color: #999;
		}
		td.diagonal,
		td.crosshair,
		td.target {
			background: none;
			color: #000;
		}
	}
</style>
