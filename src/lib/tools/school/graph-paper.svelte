<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({
		type: 'square',
		spacing: 5,
		paper: 'a4',
		color: '#7a9bc4',
		weight: 0.4,
		major: 5,
		margin: 10
	});

	const PAPERS: Record<string, { label: string; w: number; h: number }> = {
		a4: { label: 'A4 (210 × 297 mm)', w: 210, h: 297 },
		a3: { label: 'A3 (297 × 420 mm)', w: 297, h: 420 },
		a5: { label: 'A5 (148 × 210 mm)', w: 148, h: 210 },
		letter: { label: 'US Letter (216 × 279 mm)', w: 215.9, h: 279.4 },
		legal: { label: 'US Legal (216 × 356 mm)', w: 215.9, h: 355.6 }
	};

	const paper = $derived(PAPERS[s.paper] ?? PAPERS.a4);
	const inner = $derived({
		x: s.margin,
		y: s.margin,
		w: paper.w - s.margin * 2,
		h: paper.h - s.margin * 2
	});

	/** Build the SVG for the chosen paper type, in millimetre units. */
	const svg = $derived.by(() => {
		const parts: string[] = [];
		const { x, y, w, h } = inner;
		const step = Math.max(1, s.spacing);
		const thin = s.weight;
		const thick = s.weight * 2.2;

		const line = (x1: number, y1: number, x2: number, y2: number, strokeWidth: number) =>
			`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${s.color}" stroke-width="${strokeWidth}" />`;

		if (s.type === 'square' || s.type === 'graph') {
			for (let i = 0; x + i * step <= x + w + 0.001; i++) {
				const major = s.major > 0 && i % s.major === 0;
				parts.push(line(x + i * step, y, x + i * step, y + h, major ? thick : thin));
			}
			for (let i = 0; y + i * step <= y + h + 0.001; i++) {
				const major = s.major > 0 && i % s.major === 0;
				parts.push(line(x, y + i * step, x + w, y + i * step, major ? thick : thin));
			}
		} else if (s.type === 'dot') {
			for (let cx = x; cx <= x + w + 0.001; cx += step) {
				for (let cy = y; cy <= y + h + 0.001; cy += step) {
					parts.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(thin * 1.6).toFixed(2)}" fill="${s.color}" />`);
				}
			}
		} else if (s.type === 'lined') {
			for (let cy = y + step; cy <= y + h + 0.001; cy += step) {
				parts.push(line(x, cy, x + w, cy, thin));
			}
			// The traditional red margin rule.
			parts.push(line(x + 25, y, x + 25, y + h, thick) .replace(`stroke="${s.color}"`, 'stroke="#d97a7a"'));
		} else if (s.type === 'isometric') {
			// Three families of lines at 0°, 60° and 120°.
			const dy = step * Math.sqrt(3);
			for (let cy = y; cy <= y + h + dy; cy += dy) parts.push(line(x, cy, x + w, cy, thin));
			const tan60 = Math.tan((60 * Math.PI) / 180);
			for (let offset = -h * 2; offset <= w + h * 2; offset += step * 2) {
				parts.push(line(x + offset, y, x + offset + h / tan60, y + h, thin));
				parts.push(line(x + offset, y, x + offset - h / tan60, y + h, thin));
			}
		} else if (s.type === 'polar') {
			const cx = x + w / 2;
			const cy = y + h / 2;
			const maxR = Math.min(w, h) / 2;
			for (let r = step; r <= maxR + 0.001; r += step) {
				const major = s.major > 0 && Math.round(r / step) % s.major === 0;
				parts.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="none" stroke="${s.color}" stroke-width="${major ? thick : thin}" />`);
			}
			for (let angle = 0; angle < 180; angle += 15) {
				const rad = (angle * Math.PI) / 180;
				parts.push(line(cx - maxR * Math.cos(rad), cy - maxR * Math.sin(rad), cx + maxR * Math.cos(rad), cy + maxR * Math.sin(rad), angle % 45 === 0 ? thick : thin));
			}
		} else if (s.type === 'music') {
			// Five-line staves with a gap between systems.
			const staffGap = step;
			const systemGap = step * 4;
			let cy = y;
			while (cy + staffGap * 4 <= y + h) {
				for (let i = 0; i < 5; i++) parts.push(line(x, cy + i * staffGap, x + w, cy + i * staffGap, thin));
				cy += staffGap * 4 + systemGap;
			}
		}

		return `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.w}mm" height="${paper.h}mm" viewBox="0 0 ${paper.w} ${paper.h}"><rect width="${paper.w}" height="${paper.h}" fill="#ffffff"/>${parts.join('')}</svg>`;
	});

	function downloadSvg() {
		const blob = new Blob([svg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${s.type}-paper-${s.spacing}mm-${s.paper}.svg`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const TYPES = [
		{ id: 'square', label: 'Square grid' },
		{ id: 'dot', label: 'Dot grid' },
		{ id: 'lined', label: 'Lined' },
		{ id: 'isometric', label: 'Isometric' },
		{ id: 'polar', label: 'Polar' },
		{ id: 'music', label: 'Music staves' }
	];
</script>

<ToolShell {tool}>
	<div class="card stack no-print">
		<div class="field-row">
			<Field label="Paper type" for="gp-type">
				<select id="gp-type" bind:value={s.type}>
					{#each TYPES as type (type.id)}<option value={type.id}>{type.label}</option>{/each}
				</select>
			</Field>
			<Field label="Paper size" for="gp-paper">
				<select id="gp-paper" bind:value={s.paper}>
					{#each Object.entries(PAPERS) as [id, info] (id)}<option value={id}>{info.label}</option>{/each}
				</select>
			</Field>
			<Field label="Spacing: {s.spacing} mm" for="gp-spacing">
				<input id="gp-spacing" type="range" min="2" max="25" bind:value={s.spacing} />
			</Field>
		</div>

		<div class="field-row">
			<Field label="Line colour" for="gp-color"><input id="gp-color" type="color" bind:value={s.color} /></Field>
			<Field label="Line weight: {s.weight} mm" for="gp-weight">
				<input id="gp-weight" type="range" min="0.1" max="1" step="0.05" bind:value={s.weight} />
			</Field>
			{#if s.type === 'square' || s.type === 'polar'}
				<Field label="Heavy line every" for="gp-major" hint="0 for none">
					<input id="gp-major" type="number" min="0" max="20" bind:value={s.major} />
				</Field>
			{/if}
			<Field label="Margin: {s.margin} mm" for="gp-margin">
				<input id="gp-margin" type="range" min="0" max="30" bind:value={s.margin} />
			</Field>
		</div>

		<div class="row">
			<button type="button" class="btn btn-primary" onclick={() => window.print()}>
				<Icon name="print" size={16} /> Print
			</button>
			<button type="button" class="btn" onclick={downloadSvg}>
				<Icon name="download" size={16} /> Download SVG
			</button>
		</div>
	</div>

	<div class="sheet-wrap">
		<div class="sheet" style="aspect-ratio: {paper.w} / {paper.h}">
			{@html svg}
		</div>
	</div>

	<Note>
		The <strong>Print</strong> button prints the sheet alone — the rest of the page is hidden by the
		print stylesheet. Set your printer to 100% scale (not “fit to page”) or the millimetre spacing
		will be wrong.
	</Note>

	{#snippet explainer()}
		<p>
			Every sheet is generated as SVG at true physical dimensions in millimetres, so a 5 mm grid
			prints as exactly 5 mm — provided you print at 100% scale. Vector output means it stays crisp
			at any printer resolution.
		</p>
		<h3>Which grid for what</h3>
		<dl>
			<dt>Square, 5 mm</dt><dd>The general-purpose maths and science default across Europe.</dd>
			<dt>Square, 1/4 inch</dt><dd>The US equivalent — set the spacing to 6 mm for a close match.</dd>
			<dt>Dot grid</dt><dd>Structure without visual noise. Popular for bullet journals, sketching and wireframes, because the dots disappear behind your work.</dd>
			<dt>Isometric</dt><dd>Three axes at 60°, for drawing 3D objects without perspective distortion. Standard for engineering sketches and pixel-art planning.</dd>
			<dt>Polar</dt><dd>Concentric circles and radial lines, for plotting angles, phasors and polar functions.</dd>
			<dt>Music staves</dt><dd>Five-line systems. The gap between staves leaves room for lyrics or chord symbols.</dd>
		</dl>
		<h3>Heavy lines every fifth square</h3>
		<p>
			The convention exists because counting in fives is much faster than counting in ones. It is why
			engineering paper and most graph paper mark a heavier line at regular intervals — set it to 0
			above if you prefer a uniform grid.
		</p>
	{/snippet}
</ToolShell>

<style>
	.sheet-wrap {
		display: flex;
		justify-content: center;
	}
	.sheet {
		width: 100%;
		max-width: 640px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: #fff;
		box-shadow: var(--shadow);
	}
	.sheet :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}
	@media print {
		.sheet-wrap {
			display: block;
		}
		.sheet {
			max-width: none;
			border: none;
			border-radius: 0;
			box-shadow: none;
			width: 100%;
		}
	}
</style>
