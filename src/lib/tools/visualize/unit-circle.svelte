<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ degrees: 30, showSine: true, showCosine: true, showTangent: false, radians: false });

	const angle = $derived(((s.degrees % 360) + 360) % 360);
	const rad = $derived((angle * Math.PI) / 180);

	const sin = $derived(Math.sin(rad));
	const cos = $derived(Math.cos(rad));
	const tan = $derived(Math.abs(cos) < 1e-10 ? NaN : sin / cos);

	/** Exact values at the angles every trig course expects you to know. */
	const EXACT: Record<number, { sin: string; cos: string; tan: string }> = {
		0: { sin: '0', cos: '1', tan: '0' },
		30: { sin: '1/2', cos: '√3/2', tan: '√3/3' },
		45: { sin: '√2/2', cos: '√2/2', tan: '1' },
		60: { sin: '√3/2', cos: '1/2', tan: '√3' },
		90: { sin: '1', cos: '0', tan: 'undefined' },
		120: { sin: '√3/2', cos: '−1/2', tan: '−√3' },
		135: { sin: '√2/2', cos: '−√2/2', tan: '−1' },
		150: { sin: '1/2', cos: '−√3/2', tan: '−√3/3' },
		180: { sin: '0', cos: '−1', tan: '0' },
		210: { sin: '−1/2', cos: '−√3/2', tan: '√3/3' },
		225: { sin: '−√2/2', cos: '−√2/2', tan: '1' },
		240: { sin: '−√3/2', cos: '−1/2', tan: '√3' },
		270: { sin: '−1', cos: '0', tan: 'undefined' },
		300: { sin: '−√3/2', cos: '1/2', tan: '−√3' },
		315: { sin: '−√2/2', cos: '√2/2', tan: '−1' },
		330: { sin: '−1/2', cos: '√3/2', tan: '−√3/3' }
	};

	const exact = $derived(EXACT[angle] ?? null);
	const specialAngles = $derived(Object.keys(EXACT).map(Number).sort((a, b) => a - b));

	/** Angle as a fraction of π, when it lands on a nice multiple. */
	const radianLabel = $derived.by(() => {
		const twelfths = Math.round((angle / 180) * 12);
		if (Math.abs((twelfths / 12) * 180 - angle) > 0.01) return `${fmtLoose(rad, 4)}`;
		if (twelfths === 0) return '0';
		const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
		const g = gcd(Math.abs(twelfths), 12);
		const numerator = twelfths / g;
		const denominator = 12 / g;
		if (denominator === 1) return numerator === 1 ? 'π' : `${numerator}π`;
		return `${numerator === 1 ? '' : numerator}π/${denominator}`;
	});

	const quadrant = $derived(angle < 90 ? 'I' : angle < 180 ? 'II' : angle < 270 ? 'III' : 'IV');

	// --- Geometry ------------------------------------------------------------

	const CIRCLE = { cx: 150, cy: 150, r: 118 };
	const pointX = $derived(CIRCLE.cx + CIRCLE.r * cos);
	const pointY = $derived(CIRCLE.cy - CIRCLE.r * sin);

	const WAVE_W = 420;
	const WAVE_H = 260;
	const waveMid = WAVE_H / 2;
	const waveScale = 100;

	const wavePath = (fn: (t: number) => number) =>
		Array.from({ length: 361 }, (_, i) => {
			const x = (i / 360) * WAVE_W;
			const y = waveMid - fn((i * Math.PI) / 180) * waveScale;
			return `${i ? 'L' : 'M'}${x.toFixed(1)},${Math.max(-50, Math.min(WAVE_H + 50, y)).toFixed(1)}`;
		}).join('');

	const sinePath = wavePath(Math.sin);
	const cosinePath = wavePath(Math.cos);

	/** Tangent needs breaking at its asymptotes. */
	const tangentPath = $derived.by(() => {
		let d = '';
		let pen = false;
		for (let i = 0; i <= 720; i++) {
			const deg = i / 2;
			const value = Math.tan((deg * Math.PI) / 180);
			const x = (deg / 360) * WAVE_W;
			const y = waveMid - value * waveScale;
			if (!Number.isFinite(value) || Math.abs(value) > 3) {
				pen = false;
				continue;
			}
			d += `${pen ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
			pen = true;
		}
		return d;
	});

	const markerX = $derived((angle / 360) * WAVE_W);

	// --- Dragging ------------------------------------------------------------

	let circleEl = $state<SVGSVGElement>();
	let dragging = $state(false);

	function angleFromPointer(event: PointerEvent) {
		if (!circleEl) return;
		const rect = circleEl.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * 300 - CIRCLE.cx;
		const y = CIRCLE.cy - ((event.clientY - rect.top) / rect.height) * 300;
		const degrees = (Math.atan2(y, x) * 180) / Math.PI;
		s.degrees = Math.round(((degrees % 360) + 360) % 360);
	}

	function onKeydown(event: KeyboardEvent) {
		const step = event.shiftKey ? 15 : 1;
		if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
			event.preventDefault();
			s.degrees = (s.degrees + step) % 360;
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
			event.preventDefault();
			s.degrees = (s.degrees - step + 360) % 360;
		}
	}
</script>

<svelte:window
	onpointermove={(e) => dragging && angleFromPointer(e)}
	onpointerup={() => (dragging = false)}
/>

<ToolShell {tool}>
	<div class="layout">
		<div class="card circle-card">
			<svg
				bind:this={circleEl}
				viewBox="0 0 300 300"
				class="circle"
				role="slider"
				tabindex="0"
				aria-label="Angle on the unit circle"
				aria-valuenow={angle}
				aria-valuemin="0"
				aria-valuemax="359"
				aria-valuetext="{angle} degrees"
				onpointerdown={(e) => {
					dragging = true;
					angleFromPointer(e);
				}}
				onkeydown={onKeydown}
			>
				<line x1="20" y1={CIRCLE.cy} x2="280" y2={CIRCLE.cy} stroke="var(--border-strong)" />
				<line x1={CIRCLE.cx} y1="20" x2={CIRCLE.cx} y2="280" stroke="var(--border-strong)" />
				<circle cx={CIRCLE.cx} cy={CIRCLE.cy} r={CIRCLE.r} fill="none" stroke="var(--text-muted)" stroke-width="2" />

				{#each specialAngles as special (special)}
					{@const r2 = (special * Math.PI) / 180}
					<circle
						cx={CIRCLE.cx + CIRCLE.r * Math.cos(r2)}
						cy={CIRCLE.cy - CIRCLE.r * Math.sin(r2)}
						r="3"
						fill="var(--text-faint)"
					/>
				{/each}

				<!-- The swept angle -->
				<path
					d="M{CIRCLE.cx},{CIRCLE.cy} L{CIRCLE.cx + 40},{CIRCLE.cy} A40,40 0 {angle > 180 ? 1 : 0} 0 {CIRCLE.cx + 40 * cos},{CIRCLE.cy - 40 * sin} Z"
					fill="color-mix(in srgb, var(--accent) 20%, transparent)"
				/>

				<!-- Cosine (horizontal) and sine (vertical) legs -->
				{#if s.showCosine}
					<line x1={CIRCLE.cx} y1={CIRCLE.cy} x2={pointX} y2={CIRCLE.cy} stroke="#1f6fb8" stroke-width="3" />
				{/if}
				{#if s.showSine}
					<line x1={pointX} y1={CIRCLE.cy} x2={pointX} y2={pointY} stroke="#2f6f43" stroke-width="3" />
				{/if}

				<line x1={CIRCLE.cx} y1={CIRCLE.cy} x2={pointX} y2={pointY} stroke="var(--accent)" stroke-width="2.5" />
				<circle cx={pointX} cy={pointY} r="8" fill="var(--accent)" stroke="var(--bg-raised)" stroke-width="2.5" />

				<text x={CIRCLE.cx + 46} y={CIRCLE.cy - 8} class="angle-label">{angle}°</text>
				<text x="285" y={CIRCLE.cy - 8} text-anchor="end" class="axis-tick">1</text>
				<text x={CIRCLE.cx + 6} y="30" class="axis-tick">1</text>
			</svg>

			<p class="small muted no-print">
				Drag the point, or focus the circle and use the arrow keys (hold shift for 15° steps).
			</p>
		</div>

		<div class="panel">
			<div class="card stack">
				<Field label="Angle: {angle}°" for="uc-angle">
					<input id="uc-angle" type="range" min="0" max="359" bind:value={s.degrees} />
				</Field>

				<div class="results-grid tight">
					<Result label="Radians" primary value={radianLabel} detail={fmtLoose(rad, 5)} copyable={false} />
					<Result label="Quadrant" value={quadrant} copyable={false} />
					<Result label="sin θ" value={fmtLoose(sin, 5)} detail={exact ? `exactly ${exact.sin}` : undefined} copyable={false} />
					<Result label="cos θ" value={fmtLoose(cos, 5)} detail={exact ? `exactly ${exact.cos}` : undefined} copyable={false} />
					<Result label="tan θ" value={Number.isFinite(tan) ? fmtLoose(tan, 5) : 'undefined'} detail={exact ? `exactly ${exact.tan}` : undefined} copyable={false} />
					<Result label="Coordinates" value={`(${fmtLoose(cos, 3)}, ${fmtLoose(sin, 3)})`} detail="(cos θ, sin θ)" copyable={false} />
				</div>
			</div>

			<div class="card stack">
				<div class="checks">
					<label class="check"><input type="checkbox" bind:checked={s.showSine} /> <span class="dot sine"></span> Sine</label>
					<label class="check"><input type="checkbox" bind:checked={s.showCosine} /> <span class="dot cosine"></span> Cosine</label>
					<label class="check"><input type="checkbox" bind:checked={s.showTangent} /> <span class="dot tangent"></span> Tangent</label>
				</div>

				<svg viewBox="0 0 {WAVE_W} {WAVE_H}" class="wave" role="img" aria-label="Sine and cosine waves with the current angle marked">
					<line x1="0" y1={waveMid} x2={WAVE_W} y2={waveMid} stroke="var(--border-strong)" />
					{#each [0, 90, 180, 270, 360] as tick (tick)}
						<line x1={(tick / 360) * WAVE_W} y1="10" x2={(tick / 360) * WAVE_W} y2={WAVE_H - 10} stroke="var(--border)" />
						<text x={(tick / 360) * WAVE_W} y={WAVE_H - 2} text-anchor="middle" class="axis-tick">{tick}°</text>
					{/each}

					{#if s.showTangent}
						<path d={tangentPath} fill="none" stroke="#8a6100" stroke-width="2" opacity="0.85" />
					{/if}
					{#if s.showCosine}
						<path d={cosinePath} fill="none" stroke="#1f6fb8" stroke-width="2.5" />
					{/if}
					{#if s.showSine}
						<path d={sinePath} fill="none" stroke="#2f6f43" stroke-width="2.5" />
					{/if}

					<line x1={markerX} y1="10" x2={markerX} y2={WAVE_H - 10} stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3" />
					{#if s.showSine}
						<circle cx={markerX} cy={waveMid - sin * waveScale} r="5" fill="#2f6f43" stroke="var(--bg-raised)" stroke-width="2" />
					{/if}
					{#if s.showCosine}
						<circle cx={markerX} cy={waveMid - cos * waveScale} r="5" fill="#1f6fb8" stroke="var(--bg-raised)" stroke-width="2" />
					{/if}
				</svg>
			</div>
		</div>
	</div>

	<section class="card no-print">
		<h2>Jump to a special angle</h2>
		<div class="angles">
			{#each specialAngles as special (special)}
				<button type="button" class="angle-btn" class:active={angle === special} onclick={() => (s.degrees = special)}>
					{special}°
				</button>
			{/each}
		</div>
	</section>

	<Note>
		The green vertical leg <em>is</em> sin θ and the blue horizontal leg <em>is</em> cos θ — not a
		representation of them. The unit circle has radius 1, so the coordinates of the point are exactly
		(cos θ, sin θ). Every trigonometric identity is a statement about this picture.
	</Note>

	{#snippet explainer()}
		<p>
			The unit circle is the circle of radius 1 centred on the origin. Rotate a point around it by an
			angle θ from the positive x-axis, and its coordinates are (cos θ, sin θ). That is the
			definition — everything else follows.
		</p>
		<h3>Why sin² + cos² = 1</h3>
		<p>
			The radius is 1, and the point sits at (cos θ, sin θ), so Pythagoras on the right triangle
			formed by the two legs gives cos²θ + sin²θ = 1² immediately. The most fundamental trigonometric
			identity is just the theorem you already knew, applied to this diagram.
		</p>
		<h3>Where the waves come from</h3>
		<p>
			Trace the point around the circle and plot its <em>height</em> against the angle: that curve is
			the sine wave. Plot its horizontal position and you get cosine. They are the same shape shifted
			by 90°, because moving a quarter turn around the circle swaps the roles of the two legs.
		</p>
		<h3>Why tangent has asymptotes</h3>
		<p>
			tan θ = sin θ / cos θ. At 90° and 270° the cosine is zero, so the tangent is undefined and the
			curve shoots to infinity. Geometrically, tan θ is the length of the tangent segment from the
			point to the x-axis — which becomes infinite when the radius is vertical.
		</p>
		<h3>Radians are the natural unit</h3>
		<p>
			One radian is the angle that cuts an arc equal in length to the radius, so a full circle is 2π
			radians. Degrees are a Babylonian convention with no mathematical significance. Radians are
			what makes d/dx sin x = cos x true; in degrees that derivative carries an ugly π/180 factor.
		</p>
		<h3>The values worth memorising</h3>
		<p>
			Only three: 30°, 45° and 60°, with values 1/2, √2/2 and √3/2. Everything else is one of those
			with a sign determined by the quadrant. The mnemonic “All Students Take Calculus” gives which
			functions are positive in quadrants I, II, III and IV — all, sine, tangent, cosine.
		</p>
	{/snippet}
</ToolShell>

<style>
	.layout {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
		align-items: start;
	}
	.circle-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.circle {
		width: 100%;
		max-width: 340px;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		touch-action: none;
		cursor: grab;
	}
	.circle:active {
		cursor: grabbing;
	}
	.circle:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.angle-label {
		font-size: 13px;
		fill: var(--accent);
		font-weight: 700;
	}
	.axis-tick {
		font-size: 10px;
		fill: var(--text-faint);
	}
	.wave {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	.checks {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.dot {
		display: inline-block;
		width: 11px;
		height: 11px;
		border-radius: 2px;
	}
	.dot.sine {
		background: #2f6f43;
	}
	.dot.cosine {
		background: #1f6fb8;
	}
	.dot.tangent {
		background: #8a6100;
	}
	.results-grid.tight {
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.5rem;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.angles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.angle-btn {
		padding: 0.3rem 0.6rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}
	.angle-btn:hover {
		border-color: var(--accent-border);
	}
	.angle-btn.active {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
		font-weight: 600;
	}
	@media (max-width: 860px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}
</style>
