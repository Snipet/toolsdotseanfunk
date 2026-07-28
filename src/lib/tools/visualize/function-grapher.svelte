<script lang="ts">
	import { ExpressionError, compile } from '$lib/math/expression';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({
		f1: 'sin(x) * a',
		f2: 'x^2 / 10 - 5',
		f3: '',
		a: 3,
		b: 1,
		xMin: -10,
		xMax: 10,
		yMin: -10,
		yMax: 10
	});

	const COLORS = ['#b8481f', '#1f6fb8', '#2f6f43'];

	const W = 720;
	const H = 480;

	const px = (x: number) => ((x - s.xMin) / (s.xMax - s.xMin)) * W;
	const py = (y: number) => H - ((y - s.yMin) / (s.yMax - s.yMin)) * H;
	const xAt = (screenX: number) => s.xMin + (screenX / W) * (s.xMax - s.xMin);

	const functions = $derived(
		[s.f1, s.f2, s.f3].map((source, index) => {
			const trimmed = source.trim();
			if (!trimmed) return { index, source: trimmed, ok: true as const, path: '', error: '' };
			try {
				const compiled = compile(trimmed);
				const unknown = compiled.variables.filter((v) => !['x', 'a', 'b'].includes(v));
				if (unknown.length) {
					return { index, source: trimmed, ok: false as const, path: '', error: `Unknown variable: ${unknown.join(', ')}` };
				}

				// Sample at screen resolution, breaking the path at asymptotes and
				// undefined regions rather than drawing a false vertical line.
				const samples = 900;
				let d = '';
				let penDown = false;
				let previousY: number | null = null;
				const yRange = s.yMax - s.yMin;

				for (let i = 0; i <= samples; i++) {
					const x = s.xMin + ((s.xMax - s.xMin) * i) / samples;
					let y: number;
					try {
						y = compiled.evaluate({ x, a: s.a, b: s.b });
					} catch {
						y = NaN;
					}

					const offScale = !Number.isFinite(y) || y > s.yMax + yRange * 4 || y < s.yMin - yRange * 4;
					// A jump of more than the whole viewport between adjacent samples
					// is an asymptote, not a line.
					const jumped = previousY !== null && Math.abs(y - previousY) > yRange * 2;

					if (offScale || jumped) {
						penDown = false;
					} else {
						d += `${penDown ? 'L' : 'M'}${px(x).toFixed(2)},${py(y).toFixed(2)}`;
						penDown = true;
					}
					previousY = Number.isFinite(y) ? y : null;
				}

				return { index, source: trimmed, ok: true as const, path: d, error: '' };
			} catch (err) {
				return {
					index,
					source: trimmed,
					ok: false as const,
					path: '',
					error: err instanceof ExpressionError ? err.message : 'Could not parse'
				};
			}
		})
	);

	// --- Cursor readout ------------------------------------------------------

	let cursorX = $state<number | null>(null);
	let svgEl = $state<SVGSVGElement>();

	function onMove(event: PointerEvent) {
		if (!svgEl) return;
		const rect = svgEl.getBoundingClientRect();
		cursorX = xAt(((event.clientX - rect.left) / rect.width) * W);
	}

	const readout = $derived.by(() => {
		if (cursorX === null) return [];
		return [s.f1, s.f2, s.f3]
			.map((source, index) => {
				if (!source.trim()) return null;
				try {
					const y = compile(source).evaluate({ x: cursorX!, a: s.a, b: s.b });
					return Number.isFinite(y) ? { index, y } : null;
				} catch {
					return null;
				}
			})
			.filter((entry): entry is { index: number; y: number } => entry !== null);
	});

	// --- View controls -------------------------------------------------------

	function zoom(factor: number) {
		const cx = (s.xMin + s.xMax) / 2;
		const cy = (s.yMin + s.yMax) / 2;
		const halfX = ((s.xMax - s.xMin) / 2) * factor;
		const halfY = ((s.yMax - s.yMin) / 2) * factor;
		s.xMin = Number((cx - halfX).toFixed(3));
		s.xMax = Number((cx + halfX).toFixed(3));
		s.yMin = Number((cy - halfY).toFixed(3));
		s.yMax = Number((cy + halfY).toFixed(3));
	}

	function resetView() {
		s.xMin = -10;
		s.xMax = 10;
		s.yMin = -10;
		s.yMax = 10;
	}

	/** Gridline spacing that keeps roughly 10 lines visible at any zoom. */
	function gridStep(range: number): number {
		const rough = range / 10;
		const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
		const normalised = rough / magnitude;
		return (normalised >= 5 ? 5 : normalised >= 2 ? 2 : 1) * magnitude;
	}

	const xStep = $derived(gridStep(s.xMax - s.xMin));
	const yStep = $derived(gridStep(s.yMax - s.yMin));

	const xLines = $derived.by(() => {
		const out: number[] = [];
		for (let x = Math.ceil(s.xMin / xStep) * xStep; x <= s.xMax; x += xStep) out.push(Number(x.toFixed(6)));
		return out;
	});
	const yLines = $derived.by(() => {
		const out: number[] = [];
		for (let y = Math.ceil(s.yMin / yStep) * yStep; y <= s.yMax; y += yStep) out.push(Number(y.toFixed(6)));
		return out;
	});

	const EXAMPLES = [
		{ label: 'Sine wave', f1: 'sin(x) * a', f2: '', f3: '' },
		{ label: 'Parabola family', f1: 'a * x^2', f2: '', f3: '' },
		{ label: 'Damped oscillation', f1: 'exp(-x/a) * sin(b*x) * 5', f2: '', f3: '' },
		{ label: 'Trig trio', f1: 'sin(x)', f2: 'cos(x)', f3: 'tan(x)' },
		{ label: 'Asymptote', f1: '1/x', f2: '', f3: '' },
		{ label: 'Growth vs power', f1: 'exp(x/2)', f2: 'x^3', f3: '' }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="equations">
			{#each functions as fn (fn.index)}
				<div class="equation">
					<span class="swatch" style="background: {COLORS[fn.index]}"></span>
					<span class="prefix">y =</span>
					<input
						type="text"
						class="mono"
						value={[s.f1, s.f2, s.f3][fn.index]}
						oninput={(e) => {
							const value = e.currentTarget.value;
							if (fn.index === 0) s.f1 = value;
							else if (fn.index === 1) s.f2 = value;
							else s.f3 = value;
						}}
						placeholder={fn.index === 0 ? 'sin(x)' : 'another function (optional)'}
						aria-label="Function {fn.index + 1}"
						autocomplete="off"
						spellcheck="false"
					/>
					{#if !fn.ok}
						<span class="err small">{fn.error}</span>
					{/if}
				</div>
			{/each}
		</div>

		<div class="field-row">
			<Field label="a = {s.a}" for="fg-a" hint="Use a in any expression">
				<input id="fg-a" type="range" min="-10" max="10" step="0.1" bind:value={s.a} />
			</Field>
			<Field label="b = {s.b}" for="fg-b">
				<input id="fg-b" type="range" min="-10" max="10" step="0.1" bind:value={s.b} />
			</Field>
		</div>
	</div>

	<div class="card">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<svg
			bind:this={svgEl}
			viewBox="0 0 {W} {H}"
			class="plot"
			role="img"
			aria-label="Graph of the entered functions"
			onpointermove={onMove}
			onpointerleave={() => (cursorX = null)}
		>
			{#each xLines as x (x)}
				<line x1={px(x)} y1="0" x2={px(x)} y2={H} stroke="var(--border)" stroke-width={x === 0 ? 0 : 1} />
			{/each}
			{#each yLines as y (y)}
				<line x1="0" y1={py(y)} x2={W} y2={py(y)} stroke="var(--border)" stroke-width={y === 0 ? 0 : 1} />
			{/each}

			{#if s.yMin <= 0 && s.yMax >= 0}
				<line x1="0" y1={py(0)} x2={W} y2={py(0)} stroke="var(--text-muted)" stroke-width="1.5" />
			{/if}
			{#if s.xMin <= 0 && s.xMax >= 0}
				<line x1={px(0)} y1="0" x2={px(0)} y2={H} stroke="var(--text-muted)" stroke-width="1.5" />
			{/if}

			{#each xLines.filter((x) => Math.abs(x) > 1e-9) as x (x)}
				<text x={px(x)} y={Math.min(H - 4, Math.max(12, py(0) + 14))} text-anchor="middle" class="tick">
					{fmtLoose(x, 3)}
				</text>
			{/each}
			{#each yLines.filter((y) => Math.abs(y) > 1e-9) as y (y)}
				<text x={Math.max(4, Math.min(W - 30, px(0) + 6))} y={py(y) - 4} class="tick">{fmtLoose(y, 3)}</text>
			{/each}

			{#each functions as fn (fn.index)}
				{#if fn.path}
					<path d={fn.path} fill="none" stroke={COLORS[fn.index]} stroke-width="2.5" stroke-linejoin="round" />
				{/if}
			{/each}

			{#if cursorX !== null}
				<line x1={px(cursorX)} y1="0" x2={px(cursorX)} y2={H} stroke="var(--text-faint)" stroke-dasharray="4 3" />
				{#each readout as entry (entry.index)}
					<circle cx={px(cursorX)} cy={py(entry.y)} r="5" fill={COLORS[entry.index]} stroke="var(--bg-raised)" stroke-width="2" />
				{/each}
			{/if}
		</svg>

		<div class="readout small">
			{#if cursorX !== null}
				<span class="mono">x = {fmtLoose(cursorX, 4)}</span>
				{#each readout as entry (entry.index)}
					<span class="mono" style="color: {COLORS[entry.index]}">y{entry.index + 1} = {fmtLoose(entry.y, 4)}</span>
				{/each}
			{:else}
				<span class="muted">Move the pointer over the graph to read values.</span>
			{/if}
		</div>
	</div>

	<div class="card stack no-print">
		<div class="row">
			<button type="button" class="btn btn-sm" onclick={() => zoom(0.7)}><Icon name="plus" size={14} /> Zoom in</button>
			<button type="button" class="btn btn-sm" onclick={() => zoom(1.4)}><Icon name="minus" size={14} /> Zoom out</button>
			<button type="button" class="btn btn-sm" onclick={resetView}><Icon name="reset" size={14} /> Reset view</button>
		</div>

		<div class="field-row">
			<Field label="x from" for="fg-xmin"><input id="fg-xmin" type="number" step="any" bind:value={s.xMin} /></Field>
			<Field label="x to" for="fg-xmax"><input id="fg-xmax" type="number" step="any" bind:value={s.xMax} /></Field>
			<Field label="y from" for="fg-ymin"><input id="fg-ymin" type="number" step="any" bind:value={s.yMin} /></Field>
			<Field label="y to" for="fg-ymax"><input id="fg-ymax" type="number" step="any" bind:value={s.yMax} /></Field>
		</div>

		<div class="row">
			{#each EXAMPLES as example (example.label)}
				<button
					type="button"
					class="btn btn-sm"
					onclick={() => {
						s.f1 = example.f1;
						s.f2 = example.f2;
						s.f3 = example.f3;
					}}
				>
					{example.label}
				</button>
			{/each}
		</div>
	</div>

	<Note>
		Functions may use <code>x</code> plus the two slider parameters <code>a</code> and <code>b</code>.
		Available functions: sin, cos, tan and their inverses, sqrt, cbrt, abs, ln, log, exp, floor, ceil,
		round, min, max, mod — with <code>pi</code> and <code>e</code> as constants.
	</Note>

	{#snippet explainer()}
		<p>
			Each function is parsed once into a closure and then evaluated at 900 points across the visible
			range. That is why dragging a parameter slider updates instantly: no re-parsing happens, only
			arithmetic.
		</p>
		<h3>Why the curve breaks at asymptotes</h3>
		<p>
			Plot <code>1/x</code> and the line stops at the origin rather than shooting vertically across
			the screen. Naive plotters connect the last point before the asymptote to the first point after
			it, drawing a vertical line that does not exist. This one detects the jump — any step larger
			than twice the viewport height — and lifts the pen instead. The same logic handles
			<code>tan(x)</code>, which has an asymptote every π.
		</p>
		<h3>Parameters make it a family, not a curve</h3>
		<p>
			Writing <code>a * x^2</code> and dragging <em>a</em> shows the whole family of parabolas at
			once, which is a much better way to build intuition than plotting three of them separately. Try
			<code>exp(-x/a) * sin(b*x) * 5</code> and watch how <em>a</em> controls the decay envelope while
			<em>b</em> controls the frequency.
		</p>
		<h3>Sampling has limits</h3>
		<p>
			With 900 samples across the window, a function oscillating faster than that will alias — you
			will see a pattern that is an artefact of the sampling, not the function. Try
			<code>sin(100*x)</code> across a wide range and then zoom in to see the real behaviour. This is
			the same aliasing that makes wagon wheels appear to turn backwards on film.
		</p>
		<h3>Radians, always</h3>
		<p>
			Trigonometric functions take radians. For degrees, wrap the argument: <code>sin(rad(x))</code>
			gives you a sine wave with a period of 360 rather than 2π.
		</p>
	{/snippet}
</ToolShell>

<style>
	.equations {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.equation {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.swatch {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		flex: none;
	}
	.prefix {
		font-family: var(--font-mono);
		color: var(--text-muted);
		flex: none;
	}
	.err {
		color: var(--negative);
		flex: none;
		white-space: nowrap;
	}
	.plot {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		touch-action: none;
		cursor: crosshair;
	}
	.tick {
		font-size: 10px;
		fill: var(--text-faint);
	}
	.readout {
		display: flex;
		gap: 1.25rem;
		flex-wrap: wrap;
		margin-top: 0.5rem;
		min-height: 1.3em;
	}
	@media (max-width: 620px) {
		.equation .err {
			display: none;
		}
	}
</style>
