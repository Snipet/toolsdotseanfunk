<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ known: 'radius', value: 5, angle: 60 });

	const radius = $derived.by(() => {
		const v = s.value;
		switch (s.known) {
			case 'radius': return v;
			case 'diameter': return v / 2;
			case 'circumference': return v / (2 * Math.PI);
			default: return Math.sqrt(v / Math.PI);
		}
	});

	const valid = $derived(Number.isFinite(radius) && radius > 0);
	const diameter = $derived(radius * 2);
	const circumference = $derived(2 * Math.PI * radius);
	const area = $derived(Math.PI * radius ** 2);

	const rad = $derived((s.angle * Math.PI) / 180);
	const arcLength = $derived(radius * rad);
	const sectorArea = $derived(0.5 * radius ** 2 * rad);
	const chord = $derived(2 * radius * Math.sin(rad / 2));
	const segmentArea = $derived(0.5 * radius ** 2 * (rad - Math.sin(rad)));

	// Endpoint of the drawn arc, on a fixed 90px display circle centred at 110,110.
	const arcEnd = $derived({
		x: 110 + 90 * Math.cos(rad),
		y: 110 - 90 * Math.sin(rad)
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="I know the" for="circ-known">
				<select id="circ-known" bind:value={s.known}>
					<option value="radius">Radius</option>
					<option value="diameter">Diameter</option>
					<option value="circumference">Circumference</option>
					<option value="area">Area</option>
				</select>
			</Field>
			<Field label="Value" for="circ-value">
				<input id="circ-value" type="number" step="any" min="0" bind:value={s.value} />
			</Field>
		</div>

		<div class="results-grid">
			<Result label="Radius" primary={s.known !== 'radius'} value={valid ? fmtLoose(radius, 6) : '—'} />
			<Result label="Diameter" primary={s.known !== 'diameter' && s.known === 'radius'} value={valid ? fmtLoose(diameter, 6) : '—'} />
			<Result label="Circumference" value={valid ? fmtLoose(circumference, 6) : '—'} detail="2πr" />
			<Result label="Area" value={valid ? fmtLoose(area, 6) : '—'} detail="πr²" />
		</div>
	</div>

	<section class="card stack">
		<h2>Arc, sector, chord and segment</h2>
		<Field label="Central angle: {s.angle}°" for="circ-angle">
			<input id="circ-angle" type="range" min="1" max="359" bind:value={s.angle} />
		</Field>

		<div class="viz">
			<svg viewBox="0 0 220 220" role="img" aria-label="Circle showing the selected sector and chord">
				<circle cx="110" cy="110" r="90" fill="none" stroke="var(--border-strong)" stroke-width="2" />
				<path
					d="M110,110 L200,110 A90,90 0 {s.angle > 180 ? 1 : 0} 0 {arcEnd.x},{arcEnd.y} Z"
					fill="color-mix(in srgb, var(--accent) 18%, transparent)"
					stroke="var(--accent)"
					stroke-width="2"
				/>
				<line x1="200" y1="110" x2={arcEnd.x} y2={arcEnd.y} stroke="var(--text)" stroke-width="2" stroke-dasharray="4 3" />
				<circle cx="110" cy="110" r="3" fill="var(--text)" />
			</svg>

			<div class="results-grid grow">
				<Result label="Arc length" value={valid ? fmtLoose(arcLength, 6) : '—'} detail="rθ, θ in radians" />
				<Result label="Sector area" value={valid ? fmtLoose(sectorArea, 6) : '—'} detail="½r²θ" />
				<Result label="Chord length" value={valid ? fmtLoose(chord, 6) : '—'} detail="2r·sin(θ/2)" />
				<Result label="Segment area" value={valid ? fmtLoose(segmentArea, 6) : '—'} detail="½r²(θ − sin θ)" />
			</div>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Every property of a circle follows from one number — the radius — and the constant π, the
			ratio of any circle's circumference to its diameter.
		</p>
		<code class="formula">circumference = 2πr = πd
area          = πr²
arc length    = rθ          (θ in radians)
sector area   = ½r²θ
chord         = 2r·sin(θ/2)
segment area  = ½r²(θ − sin θ)</code>
		<h3>Radians make the formulas simple</h3>
		<p>
			Arc length is <em>rθ</em> only when θ is in radians — that is the definition of a radian: the
			angle that cuts an arc equal in length to the radius. In degrees you would need an extra
			π/180 in every formula, which is why calculus abandons degrees entirely.
		</p>
		<h3>Sector versus segment</h3>
		<p>
			A <strong>sector</strong> is the pizza slice: two radii plus the arc. A
			<strong>segment</strong> is what is left when you cut straight across on the chord — the sector
			minus the triangle. Hence the −sin θ term.
		</p>
		<h3>Doubling the radius quadruples the area</h3>
		<p>
			Area goes with r², so a 16-inch pizza has 78% more food than a 12-inch, not 33% more. It is the
			single most useful piece of geometry in everyday life.
		</p>
	{/snippet}
</ToolShell>

<style>
	.viz {
		display: flex;
		gap: 1.25rem;
		align-items: flex-start;
		flex-wrap: wrap;
	}
	.viz svg {
		width: 220px;
		flex: none;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	.grow {
		flex: 1;
		min-width: 260px;
	}
</style>
