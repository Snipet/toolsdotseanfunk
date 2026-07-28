<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ dpi: 300 });

	interface Paper {
		name: string;
		w: number;
		h: number;
		series: string;
		note?: string;
	}

	const PAPERS: Paper[] = [
		{ name: 'A0', w: 841, h: 1189, series: 'A series', note: 'Exactly one square metre' },
		{ name: 'A1', w: 594, h: 841, series: 'A series' },
		{ name: 'A2', w: 420, h: 594, series: 'A series' },
		{ name: 'A3', w: 297, h: 420, series: 'A series' },
		{ name: 'A4', w: 210, h: 297, series: 'A series', note: 'The world standard for documents' },
		{ name: 'A5', w: 148, h: 210, series: 'A series' },
		{ name: 'A6', w: 105, h: 148, series: 'A series', note: 'Postcard' },
		{ name: 'A7', w: 74, h: 105, series: 'A series' },
		{ name: 'A8', w: 52, h: 74, series: 'A series' },

		{ name: 'B4', w: 250, h: 353, series: 'B series' },
		{ name: 'B5', w: 176, h: 250, series: 'B series', note: 'Common for books' },
		{ name: 'B6', w: 125, h: 176, series: 'B series' },

		{ name: 'C4', w: 229, h: 324, series: 'C series', note: 'Envelope for an unfolded A4' },
		{ name: 'C5', w: 162, h: 229, series: 'C series', note: 'Envelope for A4 folded once' },
		{ name: 'C6', w: 114, h: 162, series: 'C series', note: 'Envelope for A4 folded twice' },
		{ name: 'DL', w: 110, h: 220, series: 'C series', note: 'The standard business envelope' },

		{ name: 'Letter', w: 215.9, h: 279.4, series: 'North America', note: '8.5 × 11 inches' },
		{ name: 'Legal', w: 215.9, h: 355.6, series: 'North America', note: '8.5 × 14 inches' },
		{ name: 'Tabloid / Ledger', w: 279.4, h: 431.8, series: 'North America', note: '11 × 17 inches' },
		{ name: 'Executive', w: 184.1, h: 266.7, series: 'North America' },
		{ name: 'Half Letter', w: 139.7, h: 215.9, series: 'North America' },

		{ name: 'Business card (ISO)', w: 85, h: 55, series: 'Cards' },
		{ name: 'Business card (US)', w: 88.9, h: 50.8, series: 'Cards', note: '3.5 × 2 inches' },
		{ name: 'Credit card (ID-1)', w: 85.6, h: 53.98, series: 'Cards', note: 'Also the size of a SIM carrier' },
		{ name: 'Photo 6 × 4', w: 152.4, h: 101.6, series: 'Photo' },
		{ name: 'Photo 7 × 5', w: 177.8, h: 127, series: 'Photo' },
		{ name: 'Photo 10 × 8', w: 254, h: 203.2, series: 'Photo' }
	];

	const SERIES = [...new Set(PAPERS.map((p) => p.series))];

	let filter = $state('');
	const shown = $derived(
		filter.trim() ? PAPERS.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())) : PAPERS
	);

	const mmToIn = (mm: number) => mm / 25.4;
	const mmToPx = (mm: number) => Math.round((mm / 25.4) * s.dpi);
	const mmToPt = (mm: number) => Math.round((mm / 25.4) * 72);

	const grouped = $derived(
		SERIES.map((series) => ({ series, items: shown.filter((p) => p.series === series) })).filter(
			(entry) => entry.items.length
		)
	);
</script>

<ToolShell {tool}>
	<div class="card no-print">
		<div class="row">
			<label class="visually-hidden" for="ps-filter">Filter paper sizes</label>
			<input id="ps-filter" type="search" bind:value={filter} placeholder="Filter — try “A4”, “letter”, “card”…" autocomplete="off" />
			<Field label="Pixel resolution" for="ps-dpi">
				<select id="ps-dpi" bind:value={s.dpi}>
					<option value={72}>72 DPI — screen / PDF points</option>
					<option value={96}>96 DPI — CSS pixels</option>
					<option value={150}>150 DPI — draft print</option>
					<option value={300}>300 DPI — quality print</option>
					<option value={600}>600 DPI — fine print</option>
				</select>
			</Field>
			<button type="button" class="btn" onclick={() => window.print()}><Icon name="print" size={16} /> Print</button>
		</div>
	</div>

	{#each grouped as { series, items } (series)}
		<section class="card">
			<h2>{series}</h2>
			<div class="scroll-x">
				<table class="data">
					<thead>
						<tr>
							<th>Size</th><th class="num">Millimetres</th><th class="num">Inches</th>
							<th class="num">Pixels at {s.dpi} DPI</th><th class="num">Points</th><th>Note</th>
						</tr>
					</thead>
					<tbody>
						{#each items as paper (paper.name)}
							<tr>
								<td><strong>{paper.name}</strong></td>
								<td class="num">{fmtLoose(paper.w, 1)} × {fmtLoose(paper.h, 1)}</td>
								<td class="num">{fmtLoose(mmToIn(paper.w), 2)} × {fmtLoose(mmToIn(paper.h), 2)}</td>
								<td class="num">{mmToPx(paper.w)} × {mmToPx(paper.h)}</td>
								<td class="num">{mmToPt(paper.w)} × {mmToPt(paper.h)}</td>
								<td class="muted small">{paper.note ?? ''}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/each}

	<section class="card">
		<h2>The A series, to scale</h2>
		<div class="nest">
			{#each [0, 1, 2, 3, 4, 5, 6] as n (n)}
				{@const paper = PAPERS.find((p) => p.name === `A${n}`)}
				{#if paper}
					<div class="sheet" style="width: {(paper.w / 841) * 100}%; aspect-ratio: {paper.w} / {paper.h}; z-index: {10 - n}">
						<span>A{n}</span>
					</div>
				{/if}
			{/each}
		</div>
		<p class="small muted">Each size is exactly half the previous one, folded across the long side.</p>
	</section>

	{#snippet explainer()}
		<p>
			The ISO 216 A series is built on one elegant constraint: every sheet has the same aspect ratio,
			and halving it across the long edge produces the next size down with that ratio preserved.
		</p>
		<code class="formula">ratio = √2 ≈ 1.4142

A0 = 841 × 1189 mm = 1.000 m²
A(n+1) = A(n) halved across the long side</code>
		<h3>Why √2 is the only possible answer</h3>
		<p>
			For a sheet of width w and height h to keep its proportions when halved, h/w must equal
			w/(h/2). Solving gives h/w = √2. No other ratio has this property, which is why the standard
			is not arbitrary — it is the unique solution.
		</p>
		<h3>What that buys you</h3>
		<p>
			Scaling between sizes never distorts anything: printing A4 content onto A3 is exactly 141%,
			and A4 onto A5 is 71%, with no cropping or letterboxing. Those two numbers are on every
			photocopier in the world outside North America.
		</p>
		<h3>Paper weights come free too</h3>
		<p>
			A0 is exactly one square metre, so an A0 sheet of 80 gsm paper weighs 80 grams — and an A4
			sheet, being one sixteenth of it, weighs exactly 5 grams. That is why postal weight
			calculations are trivial in metric countries: a letter is simply five grams per sheet.
		</p>
		<h3>US Letter has no such logic</h3>
		<p>
			8.5 × 11 inches gives a ratio of 1.294, which does not survive halving. Scaling between Letter
			and Legal or Tabloid always crops or leaves margins. The origin is disputed — the most-repeated
			explanation involves the span of a vatman's arms in early paper-making, though the historical
			evidence for it is thin.
		</p>
		<h3>C series envelopes</h3>
		<p>
			The C series is the geometric mean of A and B, sized so that an A-series sheet fits inside the
			same-numbered C envelope. C4 takes an unfolded A4; C5 takes it folded once; C6 folded twice. DL
			is the odd one out — it predates the standard and takes an A4 folded into thirds.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Dimensions from <strong>ISO 216</strong> (A and B series), <strong>ISO 269</strong> (C series
			envelopes), and <strong>ISO/IEC 7810</strong> for the ID-1 card format. North American sizes
			follow ANSI/ASME Y14.1.
		</p>
	{/snippet}
</ToolShell>

<style>
	.row input[type='search'] {
		flex: 1;
		min-width: 180px;
	}
	.row :global(.field) {
		width: 220px;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.nest {
		position: relative;
		width: 100%;
		max-width: 460px;
		aspect-ratio: 841 / 1189;
		margin: 0.75rem auto;
	}
	.sheet {
		position: absolute;
		bottom: 0;
		left: 0;
		border: 1px solid var(--accent);
		background: color-mix(in srgb, var(--accent) 8%, var(--bg-raised));
		display: flex;
		align-items: flex-start;
		justify-content: flex-end;
		padding: 0.2rem 0.35rem;
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--accent);
	}
</style>
