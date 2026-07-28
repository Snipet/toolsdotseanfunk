<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	/**
	 * Linear model:
	 *   demand  P = dIntercept − dSlope · Q
	 *   supply  P = sIntercept + sSlope · Q
	 *
	 * Everything downstream — equilibrium, surplus, tax incidence, deadweight
	 * loss — has a closed form, so the whole diagram recomputes on every
	 * pointer move without any numerical solving.
	 */
	const s = urlState({
		dIntercept: 100,
		dSlope: 1,
		sIntercept: 20,
		sSlope: 1,
		intervention: 'none',
		tax: 15,
		priceControl: 45,
		showSurplus: true,
		classroom: false
	});

	const AXIS_MAX_Q = 100;
	const AXIS_MAX_P = 120;

	// --- Model ---------------------------------------------------------------

	const equilibrium = $derived.by(() => {
		const q = (s.dIntercept - s.sIntercept) / (s.dSlope + s.sSlope);
		return { q, p: s.dIntercept - s.dSlope * q };
	});

	const demandAt = (q: number) => s.dIntercept - s.dSlope * q;
	const supplyAt = (q: number) => s.sIntercept + s.sSlope * q;

	/** Quantity where demand meets a given price. */
	const demandQuantity = (p: number) => (s.dIntercept - p) / s.dSlope;
	const supplyQuantity = (p: number) => (p - s.sIntercept) / s.sSlope;

	const outcome = $derived.by(() => {
		const { q: qStar, p: pStar } = equilibrium;

		if (s.intervention === 'tax' || s.intervention === 'subsidy') {
			// A subsidy is simply a negative tax.
			const t = s.intervention === 'tax' ? s.tax : -s.tax;
			const q = (s.dIntercept - s.sIntercept - t) / (s.dSlope + s.sSlope);
			const buyerPrice = demandAt(q);
			const sellerPrice = buyerPrice - t;
			return {
				kind: s.intervention,
				quantity: q,
				buyerPrice,
				sellerPrice,
				government: t * q,
				consumerSurplus: 0.5 * (s.dIntercept - buyerPrice) * q,
				producerSurplus: 0.5 * (sellerPrice - s.sIntercept) * q,
				deadweight: 0.5 * Math.abs(t) * Math.abs(qStar - q),
				consumerShare: t === 0 ? 0 : (buyerPrice - pStar) / t,
				shortage: 0,
				surplus: 0
			};
		}

		if (s.intervention === 'ceiling' || s.intervention === 'floor') {
			const controlBinds =
				s.intervention === 'ceiling' ? s.priceControl < pStar : s.priceControl > pStar;
			const price = controlBinds ? s.priceControl : pStar;
			const qd = demandQuantity(price);
			const qs = supplyQuantity(price);
			// The short side of the market determines what actually trades.
			const traded = Math.max(0, Math.min(qd, qs));
			return {
				kind: s.intervention,
				quantity: traded,
				buyerPrice: price,
				sellerPrice: price,
				government: 0,
				// With rationing, consumers who buy pay `price` but the marginal
				// unit is valued at demandAt(traded) — surplus is the trapezoid.
				consumerSurplus: traded > 0 ? 0.5 * (s.dIntercept - demandAt(traded)) * traded + (demandAt(traded) - price) * traded : 0,
				producerSurplus: traded > 0 ? 0.5 * (price - s.sIntercept) * traded + 0 : 0,
				deadweight: 0.5 * (demandAt(traded) - supplyAt(traded)) * Math.max(0, qStar - traded),
				consumerShare: 0,
				shortage: s.intervention === 'ceiling' && controlBinds ? qd - qs : 0,
				surplus: s.intervention === 'floor' && controlBinds ? qs - qd : 0,
				binds: controlBinds
			};
		}

		return {
			kind: 'none',
			quantity: qStar,
			buyerPrice: pStar,
			sellerPrice: pStar,
			government: 0,
			consumerSurplus: 0.5 * (s.dIntercept - pStar) * qStar,
			producerSurplus: 0.5 * (pStar - s.sIntercept) * qStar,
			deadweight: 0,
			consumerShare: 0,
			shortage: 0,
			surplus: 0
		};
	});

	const totalSurplus = $derived(outcome.consumerSurplus + outcome.producerSurplus + outcome.government);

	/** Point elasticities at the free-market equilibrium. */
	const elasticity = $derived.by(() => {
		const { q, p } = equilibrium;
		if (q <= 0) return { demand: NaN, supply: NaN };
		return { demand: -(1 / s.dSlope) * (p / q), supply: (1 / s.sSlope) * (p / q) };
	});

	const valid = $derived(equilibrium.q > 0 && equilibrium.p > 0);

	// --- Geometry ------------------------------------------------------------

	const W = 560;
	const H = 420;
	const PAD = { left: 56, right: 26, top: 22, bottom: 48 };
	const plotW = W - PAD.left - PAD.right;
	const plotH = H - PAD.top - PAD.bottom;

	const px = (q: number) => PAD.left + (q / AXIS_MAX_Q) * plotW;
	const py = (p: number) => PAD.top + plotH - (p / AXIS_MAX_P) * plotH;
	const qAt = (x: number) => ((x - PAD.left) / plotW) * AXIS_MAX_Q;
	const pAt = (y: number) => ((PAD.top + plotH - y) / plotH) * AXIS_MAX_P;

	/** Clip a line to the visible quadrant so curves never escape the axes. */
	function segment(intercept: number, slope: number, downward: boolean) {
		const qEnd = downward
			? Math.min(AXIS_MAX_Q, intercept / slope)
			: Math.min(AXIS_MAX_Q, (AXIS_MAX_P - intercept) / slope);
		const qStart = downward ? 0 : Math.max(0, -intercept / slope);
		return {
			x1: px(qStart),
			y1: py(downward ? intercept - slope * qStart : intercept + slope * qStart),
			x2: px(Math.max(qStart, qEnd)),
			y2: py(downward ? intercept - slope * qEnd : intercept + slope * qEnd)
		};
	}

	const demandLine = $derived(segment(s.dIntercept, s.dSlope, true));
	const supplyLine = $derived(segment(s.sIntercept, s.sSlope, false));
	const taxedSupplyLine = $derived(
		s.intervention === 'tax' || s.intervention === 'subsidy'
			? segment(s.sIntercept + (s.intervention === 'tax' ? s.tax : -s.tax), s.sSlope, false)
			: null
	);

	// --- Dragging ------------------------------------------------------------

	let svgEl = $state<SVGSVGElement>();
	let dragging = $state<null | 'demand' | 'supply' | 'demandRotate' | 'supplyRotate'>(null);

	function pointerPosition(event: PointerEvent) {
		if (!svgEl) return null;
		const rect = svgEl.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * W;
		const y = ((event.clientY - rect.top) / rect.height) * H;
		return { q: qAt(x), p: pAt(y) };
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		const point = pointerPosition(event);
		if (!point) return;
		event.preventDefault();

		const clampP = (v: number) => Math.max(0, Math.min(AXIS_MAX_P, v));

		if (dragging === 'demand') {
			// Parallel shift: move the intercept so the curve passes through
			// the cursor at its current slope.
			s.dIntercept = Math.round(clampP(point.p + s.dSlope * Math.max(0, point.q)));
		} else if (dragging === 'supply') {
			s.sIntercept = Math.round(clampP(point.p - s.sSlope * Math.max(0, point.q)));
		} else if (dragging === 'demandRotate') {
			// Rotate about the vertical intercept: pick the slope that puts the
			// curve through the cursor.
			const q = Math.max(4, point.q);
			s.dSlope = Math.max(0.1, Math.min(6, Number(((s.dIntercept - clampP(point.p)) / q).toFixed(2))));
		} else if (dragging === 'supplyRotate') {
			const q = Math.max(4, point.q);
			s.sSlope = Math.max(0.1, Math.min(6, Number(((clampP(point.p) - s.sIntercept) / q).toFixed(2))));
		}
	}

	function startDrag(which: typeof dragging, event: PointerEvent) {
		dragging = which;
		(event.target as Element).setPointerCapture?.(event.pointerId);
	}

	/** Keyboard equivalents, so the diagram is operable without a pointer. */
	function nudge(event: KeyboardEvent, target: 'dIntercept' | 'sIntercept' | 'dSlope' | 'sSlope') {
		const step = event.shiftKey ? 10 : 1;
		const slopeStep = event.shiftKey ? 0.5 : 0.1;
		const isSlope = target === 'dSlope' || target === 'sSlope';
		let delta = 0;
		if (event.key === 'ArrowUp' || event.key === 'ArrowRight') delta = isSlope ? slopeStep : step;
		else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') delta = isSlope ? -slopeStep : -step;
		else return;
		event.preventDefault();
		if (isSlope) s[target] = Math.max(0.1, Math.min(6, Number((s[target] + delta).toFixed(2))));
		else s[target] = Math.max(0, Math.min(AXIS_MAX_P, s[target] + delta));
	}

	// --- Presets -------------------------------------------------------------

	const SHIFTS = [
		{ label: 'Income rises', hint: 'Demand shifts right for a normal good', apply: () => (s.dIntercept = Math.min(AXIS_MAX_P, s.dIntercept + 20)) },
		{ label: 'Income falls', hint: 'Demand shifts left', apply: () => (s.dIntercept = Math.max(10, s.dIntercept - 20)) },
		{ label: 'Input costs fall', hint: 'Supply shifts right', apply: () => (s.sIntercept = Math.max(0, s.sIntercept - 15)) },
		{ label: 'Input costs rise', hint: 'Supply shifts left', apply: () => (s.sIntercept = Math.min(90, s.sIntercept + 15)) },
		{ label: 'New substitute appears', hint: 'Demand falls and becomes more elastic', apply: () => { s.dIntercept = Math.max(10, s.dIntercept - 10); s.dSlope = Math.max(0.2, s.dSlope - 0.3); } },
		{ label: 'Demand becomes inelastic', hint: 'A steeper demand curve', apply: () => (s.dSlope = Math.min(6, s.dSlope + 0.5)) },
		{ label: 'Supply becomes inelastic', hint: 'A steeper supply curve', apply: () => (s.sSlope = Math.min(6, s.sSlope + 0.5)) }
	];

	function reset() {
		s.dIntercept = 100;
		s.dSlope = 1;
		s.sIntercept = 20;
		s.sSlope = 1;
		s.intervention = 'none';
		s.tax = 15;
		s.priceControl = 45;
	}

	// --- Shaded regions ------------------------------------------------------

	const consumerRegion = $derived.by(() => {
		if (!valid || outcome.quantity <= 0) return '';
		const q = outcome.quantity;
		const p = outcome.buyerPrice;
		// Under the demand curve, above the price paid, up to the quantity traded.
		return `M${px(0)},${py(s.dIntercept)} L${px(q)},${py(demandAt(q))} L${px(q)},${py(p)} L${px(0)},${py(p)} Z`;
	});

	const producerRegion = $derived.by(() => {
		if (!valid || outcome.quantity <= 0) return '';
		const q = outcome.quantity;
		const p = outcome.sellerPrice;
		return `M${px(0)},${py(s.sIntercept)} L${px(q)},${py(supplyAt(q))} L${px(q)},${py(p)} L${px(0)},${py(p)} Z`;
	});

	const deadweightRegion = $derived.by(() => {
		if (!valid || outcome.deadweight <= 0.01) return '';
		const q = outcome.quantity;
		const qStar = equilibrium.q;
		if (qStar <= q) return '';
		return `M${px(q)},${py(demandAt(q))} L${px(qStar)},${py(equilibrium.p)} L${px(q)},${py(supplyAt(q))} Z`;
	});

	const ticks = [0, 20, 40, 60, 80, 100];
	const priceTicks = [0, 20, 40, 60, 80, 100, 120];
</script>

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={() => (dragging = null)}
	onpointercancel={() => (dragging = null)}
/>

<ToolShell {tool}>
	<div class="layout" class:classroom={s.classroom}>
		<div class="card graph-card">
			<svg
				bind:this={svgEl}
				viewBox="0 0 {W} {H}"
				class="graph"
				class:grabbing={dragging !== null}
				role="img"
				aria-label="Supply and demand diagram. Equilibrium at quantity {fmtLoose(equilibrium.q, 1)} and price {fmtLoose(equilibrium.p, 1)}."
			>
				<!-- Grid -->
				{#each ticks as q (q)}
					<line x1={px(q)} y1={PAD.top} x2={px(q)} y2={PAD.top + plotH} stroke="var(--border)" stroke-width="1" />
					<text x={px(q)} y={PAD.top + plotH + 18} text-anchor="middle" class="tick">{q}</text>
				{/each}
				{#each priceTicks as p (p)}
					<line x1={PAD.left} y1={py(p)} x2={PAD.left + plotW} y2={py(p)} stroke="var(--border)" stroke-width="1" />
					<text x={PAD.left - 8} y={py(p) + 4} text-anchor="end" class="tick">{p}</text>
				{/each}

				<!-- Shaded surplus regions -->
				{#if s.showSurplus}
					<path d={consumerRegion} fill="color-mix(in srgb, #1f6fb8 22%, transparent)" />
					<path d={producerRegion} fill="color-mix(in srgb, #2f6f43 22%, transparent)" />
					<path d={deadweightRegion} fill="color-mix(in srgb, #b3261e 32%, transparent)" />
				{/if}

				<!-- Axes -->
				<line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="var(--text)" stroke-width="1.5" />
				<line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="var(--text)" stroke-width="1.5" />
				<text x={PAD.left - 40} y={PAD.top + plotH / 2} class="axis-label" transform="rotate(-90 {PAD.left - 40} {PAD.top + plotH / 2})">Price</text>
				<text x={PAD.left + plotW / 2} y={H - 8} text-anchor="middle" class="axis-label">Quantity</text>

				<!-- Shifted supply, when there is a tax or subsidy -->
				{#if taxedSupplyLine}
					<line
						x1={taxedSupplyLine.x1}
						y1={taxedSupplyLine.y1}
						x2={taxedSupplyLine.x2}
						y2={taxedSupplyLine.y2}
						stroke="#2f6f43"
						stroke-width="2.5"
						stroke-dasharray="6 4"
					/>
				{/if}

				<!-- Curves. The wide transparent line is the drag target. -->
				<line
					x1={demandLine.x1} y1={demandLine.y1} x2={demandLine.x2} y2={demandLine.y2}
					stroke="transparent" stroke-width="20" class="handle"
					role="slider"
					tabindex="0"
					aria-label="Demand curve position — drag to shift demand"
					aria-valuenow={s.dIntercept}
					aria-valuemin="20"
					aria-valuemax="120"
					aria-valuetext="Demand intercept {s.dIntercept}"
					onpointerdown={(e) => startDrag('demand', e)}
					onkeydown={(e) => nudge(e, 'dIntercept')}
				/>
				<line x1={demandLine.x1} y1={demandLine.y1} x2={demandLine.x2} y2={demandLine.y2} stroke="#1f6fb8" stroke-width="3" />

				<line
					x1={supplyLine.x1} y1={supplyLine.y1} x2={supplyLine.x2} y2={supplyLine.y2}
					stroke="transparent" stroke-width="20" class="handle"
					role="slider"
					tabindex="0"
					aria-label="Supply curve position — drag to shift supply"
					aria-valuenow={s.sIntercept}
					aria-valuemin="0"
					aria-valuemax="90"
					aria-valuetext="Supply intercept {s.sIntercept}"
					onpointerdown={(e) => startDrag('supply', e)}
					onkeydown={(e) => nudge(e, 'sIntercept')}
				/>
				<line x1={supplyLine.x1} y1={supplyLine.y1} x2={supplyLine.x2} y2={supplyLine.y2} stroke="#2f6f43" stroke-width="3" />

				<!-- Rotation handles at each curve's far end -->
				<circle
					cx={demandLine.x2} cy={demandLine.y2} r="9"
					fill="#1f6fb8" stroke="var(--bg-raised)" stroke-width="2" class="handle rotate"
					role="slider"
					tabindex="0"
					aria-label="Demand curve steepness"
					aria-valuenow={s.dSlope}
					aria-valuemin="0.1"
					aria-valuemax="6"
					onpointerdown={(e) => startDrag('demandRotate', e)}
					onkeydown={(e) => nudge(e, 'dSlope')}
				/>
				<circle
					cx={supplyLine.x2} cy={supplyLine.y2} r="9"
					fill="#2f6f43" stroke="var(--bg-raised)" stroke-width="2" class="handle rotate"
					role="slider"
					tabindex="0"
					aria-label="Supply curve steepness"
					aria-valuenow={s.sSlope}
					aria-valuemin="0.1"
					aria-valuemax="6"
					onpointerdown={(e) => startDrag('supplyRotate', e)}
					onkeydown={(e) => nudge(e, 'sSlope')}
				/>

				<!-- Curve labels -->
				<text x={demandLine.x2 - 14} y={demandLine.y2 - 14} class="curve-label demand">D</text>
				<text x={supplyLine.x2 - 14} y={supplyLine.y2 + 22} class="curve-label supply">S</text>
				{#if taxedSupplyLine}
					<text x={taxedSupplyLine.x2 - 30} y={taxedSupplyLine.y2 + 22} class="curve-label supply">
						S{s.intervention === 'tax' ? '+tax' : '−sub'}
					</text>
				{/if}

				<!-- Price control line -->
				{#if s.intervention === 'ceiling' || s.intervention === 'floor'}
					<line
						x1={PAD.left} y1={py(s.priceControl)} x2={PAD.left + plotW} y2={py(s.priceControl)}
						stroke="#b3261e" stroke-width="2.5" stroke-dasharray="8 4"
					/>
					<text x={PAD.left + plotW - 4} y={py(s.priceControl) - 7} text-anchor="end" class="control-label">
						{s.intervention === 'ceiling' ? 'Price ceiling' : 'Price floor'}
					</text>
				{/if}

				<!-- Equilibrium marker -->
				{#if valid}
					<line x1={px(equilibrium.q)} y1={py(equilibrium.p)} x2={px(equilibrium.q)} y2={PAD.top + plotH} stroke="var(--text-faint)" stroke-dasharray="4 3" />
					<line x1={PAD.left} y1={py(equilibrium.p)} x2={px(equilibrium.q)} y2={py(equilibrium.p)} stroke="var(--text-faint)" stroke-dasharray="4 3" />
					<circle cx={px(equilibrium.q)} cy={py(equilibrium.p)} r="6" fill="var(--text)" stroke="var(--bg-raised)" stroke-width="2" />
					<text x={px(equilibrium.q) + 12} y={py(equilibrium.p) - 10} class="eq-label">
						P* {fmtLoose(equilibrium.p, 1)}, Q* {fmtLoose(equilibrium.q, 1)}
					</text>
				{/if}

				<!-- Post-intervention prices -->
				{#if outcome.kind !== 'none' && valid && outcome.quantity > 0}
					<circle cx={px(outcome.quantity)} cy={py(outcome.buyerPrice)} r="5" fill="#1f6fb8" stroke="var(--bg-raised)" stroke-width="2" />
					{#if Math.abs(outcome.buyerPrice - outcome.sellerPrice) > 0.5}
						<circle cx={px(outcome.quantity)} cy={py(outcome.sellerPrice)} r="5" fill="#2f6f43" stroke="var(--bg-raised)" stroke-width="2" />
						<line
							x1={px(outcome.quantity)} y1={py(outcome.buyerPrice)}
							x2={px(outcome.quantity)} y2={py(outcome.sellerPrice)}
							stroke="var(--warning)" stroke-width="3"
						/>
					{/if}
				{/if}
			</svg>

			<p class="hint small muted no-print">
				<Icon name="info" size={14} />
				Drag either curve to shift it, or the round handle at its end to change its steepness.
				Everything is keyboard-operable: tab to a curve and use the arrow keys, with shift for
				larger steps.
			</p>
		</div>

		<div class="panel">
			<div class="card stack">
				<h2>Market outcome</h2>
				<div class="results-grid tight">
					<Result label="Equilibrium price" primary value={valid ? fmtLoose(equilibrium.p, 2) : '—'} copyable={false} />
					<Result label="Equilibrium quantity" primary value={valid ? fmtLoose(equilibrium.q, 2) : '—'} copyable={false} />
					{#if outcome.kind === 'tax' || outcome.kind === 'subsidy'}
						<Result label="Buyers pay" value={fmtLoose(outcome.buyerPrice, 2)} copyable={false} />
						<Result label="Sellers receive" value={fmtLoose(outcome.sellerPrice, 2)} copyable={false} />
						<Result label="Quantity traded" value={fmtLoose(outcome.quantity, 2)} copyable={false} />
						<Result
							label={outcome.kind === 'tax' ? 'Tax revenue' : 'Subsidy cost'}
							value={fmtLoose(Math.abs(outcome.government), 1)}
							tone={outcome.kind === 'tax' ? 'neutral' : 'warning'}
							copyable={false}
						/>
					{:else if outcome.kind === 'ceiling' || outcome.kind === 'floor'}
						<Result label="Price" value={fmtLoose(outcome.buyerPrice, 2)} detail={outcome.binds ? 'The control binds' : 'Not binding — the market clears'} copyable={false} />
						<Result label="Quantity traded" value={fmtLoose(outcome.quantity, 2)} copyable={false} />
						{#if outcome.shortage > 0}
							<Result label="Shortage" value={fmtLoose(outcome.shortage, 2)} tone="negative" detail="Quantity demanded exceeds quantity supplied" copyable={false} />
						{/if}
						{#if outcome.surplus > 0}
							<Result label="Surplus" value={fmtLoose(outcome.surplus, 2)} tone="negative" detail="Quantity supplied exceeds quantity demanded" copyable={false} />
						{/if}
					{/if}
				</div>
			</div>

			<div class="card stack">
				<h2>Welfare</h2>
				<div class="results-grid tight">
					<Result label="Consumer surplus" value={fmtLoose(outcome.consumerSurplus, 1)} copyable={false} />
					<Result label="Producer surplus" value={fmtLoose(outcome.producerSurplus, 1)} copyable={false} />
					<Result label="Total surplus" value={fmtLoose(totalSurplus, 1)} copyable={false} />
					{#if outcome.deadweight > 0.01}
						<Result label="Deadweight loss" value={fmtLoose(outcome.deadweight, 1)} tone="negative" detail="Value destroyed by the intervention" copyable={false} />
					{/if}
					{#if outcome.kind === 'tax' && Number.isFinite(outcome.consumerShare)}
						<Result
							label="Consumers bear"
							value={`${fmtLoose(Math.max(0, Math.min(1, outcome.consumerShare)) * 100, 0)}%`}
							detail="Of the tax — the rest falls on sellers"
							copyable={false}
						/>
					{/if}
				</div>
			</div>

			<div class="card stack">
				<h2>Elasticity at equilibrium</h2>
				<div class="results-grid tight">
					<Result
						label="Price elasticity of demand"
						value={valid ? fmtLoose(elasticity.demand, 2) : '—'}
						detail={Math.abs(elasticity.demand) > 1 ? 'Elastic — quantity responds strongly' : Math.abs(elasticity.demand) < 1 ? 'Inelastic — quantity barely moves' : 'Unit elastic'}
						copyable={false}
					/>
					<Result
						label="Price elasticity of supply"
						value={valid ? fmtLoose(elasticity.supply, 2) : '—'}
						detail={elasticity.supply > 1 ? 'Elastic' : elasticity.supply < 1 ? 'Inelastic' : 'Unit elastic'}
						copyable={false}
					/>
				</div>
			</div>
		</div>
	</div>

	<div class="card stack no-print">
		<h2>Controls</h2>

		<div class="field-row">
			<Field label="Intervention" for="sd-intervention">
				<select id="sd-intervention" bind:value={s.intervention}>
					<option value="none">Free market</option>
					<option value="tax">Per-unit tax</option>
					<option value="subsidy">Per-unit subsidy</option>
					<option value="ceiling">Price ceiling</option>
					<option value="floor">Price floor</option>
				</select>
			</Field>

			{#if s.intervention === 'tax' || s.intervention === 'subsidy'}
				<Field label="{s.intervention === 'tax' ? 'Tax' : 'Subsidy'} per unit: {s.tax}" for="sd-tax">
					<input id="sd-tax" type="range" min="0" max="60" bind:value={s.tax} />
				</Field>
			{:else if s.intervention === 'ceiling' || s.intervention === 'floor'}
				<Field label="Price set at: {s.priceControl}" for="sd-control">
					<input id="sd-control" type="range" min="0" max="110" bind:value={s.priceControl} />
				</Field>
			{/if}
		</div>

		<div class="field-row">
			<Field label="Demand intercept: {s.dIntercept}" for="sd-di">
				<input id="sd-di" type="range" min="20" max="120" bind:value={s.dIntercept} />
			</Field>
			<Field label="Demand steepness: {s.dSlope}" for="sd-ds">
				<input id="sd-ds" type="range" min="0.1" max="6" step="0.1" bind:value={s.dSlope} />
			</Field>
			<Field label="Supply intercept: {s.sIntercept}" for="sd-si">
				<input id="sd-si" type="range" min="0" max="90" bind:value={s.sIntercept} />
			</Field>
			<Field label="Supply steepness: {s.sSlope}" for="sd-ss">
				<input id="sd-ss" type="range" min="0.1" max="6" step="0.1" bind:value={s.sSlope} />
			</Field>
		</div>

		<div class="row">
			<label class="check"><input type="checkbox" bind:checked={s.showSurplus} /> Shade the surplus regions</label>
			<label class="check"><input type="checkbox" bind:checked={s.classroom} /> Classroom mode — larger diagram</label>
			<button type="button" class="btn btn-sm" onclick={reset}><Icon name="reset" size={14} /> Reset</button>
		</div>

		<div>
			<p class="small muted shift-label">Shift presets</p>
			<div class="shifts">
				{#each SHIFTS as shift (shift.label)}
					<button type="button" class="shift" onclick={shift.apply} title={shift.hint}>
						<span>{shift.label}</span>
						<span class="shift-hint small muted">{shift.hint}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>

	{#if !valid}
		<Note tone="warning">
			These curves do not cross in the positive quadrant — there is no equilibrium with a positive
			price and quantity. Raise the demand intercept above the supply intercept.
		</Note>
	{/if}

	{#snippet explainer()}
		<p>
			Both curves here are linear, which is the standard teaching simplification. Demand slopes down
			because buyers want less as price rises; supply slopes up because sellers offer more.
		</p>
		<code class="formula">demand:  P = a − bQ
supply:  P = c + dQ

equilibrium: Q* = (a − c) / (b + d),  P* = a − bQ*</code>

		<h3>Shifts versus movements</h3>
		<p>
			This is the distinction students lose marks on most often. A change in the good's
			<em>own price</em> is a <strong>movement along</strong> a curve. A change in anything else —
			income, the price of a substitute, input costs, technology, expectations, the number of buyers —
			<strong>shifts the whole curve</strong>. Dragging a curve here is a shift; the equilibrium then
			moves along the other curve to meet it.
		</p>

		<h3>Consumer and producer surplus</h3>
		<p>
			The blue triangle is <strong>consumer surplus</strong>: the gap between what buyers were
			willing to pay (the demand curve) and what they actually paid. The green triangle is
			<strong>producer surplus</strong>: the gap between the price received and the minimum sellers
			would have accepted (the supply curve). Together they measure the total gains from trade, which
			at the free-market equilibrium are as large as they can possibly be.
		</p>

		<h3>Tax incidence does not depend on who pays it</h3>
		<p>
			Switch on a per-unit tax and watch the wedge open between what buyers pay and what sellers
			receive. Now change the steepness of the two curves. The burden falls mainly on whichever side
			is <em>less</em> elastic — less able to walk away. This is why taxes on cigarettes fall almost
			entirely on smokers, and why a payroll tax split “equally” between employer and employee is
			not, economically, split equally at all. The legal incidence is irrelevant; only the
			elasticities matter.
		</p>

		<h3>Deadweight loss</h3>
		<p>
			The red triangle is trade that would have created value and no longer happens. Every unit
			between the taxed quantity and the free-market quantity was one where a buyer valued the good
			more than it cost to produce — a mutually beneficial trade the tax prevented. Nobody captures
			that value; it simply disappears. Its size grows with the <em>square</em> of the tax, which is
			the core argument for broad taxes at low rates rather than narrow ones at high rates.
		</p>

		<h3>Price controls</h3>
		<p>
			A ceiling below the equilibrium price creates a <strong>shortage</strong>: at the lower price
			buyers want more and sellers offer less. Rent control and petrol price caps are the standard
			examples, and the queues, waiting lists and quality decline that follow are the market
			rationing by something other than price. A floor above equilibrium creates a
			<strong>surplus</strong> — agricultural price supports produce butter mountains, and a minimum
			wage above the market-clearing wage produces unemployment in this model.
		</p>
		<p>
			Note that a control on the wrong side of equilibrium does nothing at all: a ceiling above the
			market price never binds. Drag the control line past the equilibrium and watch the effects
			vanish.
		</p>

		<h3>Elasticity</h3>
		<p>
			Elasticity is the percentage change in quantity for a one percent change in price. It is
			<em>not</em> the slope: a straight demand curve has constant slope but elasticity that varies
			continuously along it — elastic at the top, inelastic at the bottom, unit elastic at the
			midpoint. That is why the figures above are quoted at the equilibrium point specifically.
		</p>
		<p>
			When demand is inelastic (|Ed| &lt; 1), a price rise increases total revenue. When it is
			elastic, a price rise reduces it. This single fact drives an enormous amount of real pricing
			strategy.
		</p>

		<h3>What this model leaves out</h3>
		<p>
			Perfect competition, perfect information, no externalities, no market power, and linear curves.
			Real markets violate all five. The model is still worth knowing because it is the baseline
			against which those violations are measured — you cannot describe what monopoly or pollution
			does to a market without first knowing what the market would have done without them.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			The model is the standard partial-equilibrium treatment found in any introductory
			microeconomics text — Mankiw's <em>Principles of Economics</em>, Varian's
			<em>Intermediate Microeconomics</em>, or Krugman &amp; Wells. Surplus areas, tax incidence and
			deadweight loss are computed from the closed-form geometry of the linear case, so the figures
			are exact for this model rather than numerically approximated.
		</p>
	{/snippet}
</ToolShell>

<style>
	.layout {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		align-items: start;
	}
	.layout.classroom {
		grid-template-columns: 1fr;
	}
	.graph-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.graph {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		touch-action: none;
		user-select: none;
	}
	.graph.grabbing {
		cursor: grabbing;
	}
	.handle {
		cursor: grab;
	}
	.handle:active {
		cursor: grabbing;
	}
	.handle:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}
	.tick {
		font-size: 11px;
		fill: var(--text-faint);
	}
	.axis-label {
		font-size: 13px;
		fill: var(--text-muted);
		font-weight: 600;
		text-anchor: middle;
	}
	.curve-label {
		font-size: 17px;
		font-weight: 700;
	}
	.curve-label.demand {
		fill: #1f6fb8;
	}
	.curve-label.supply {
		fill: #2f6f43;
	}
	.control-label {
		font-size: 11px;
		fill: #b3261e;
		font-weight: 600;
	}
	.eq-label {
		font-size: 12px;
		fill: var(--text);
		font-weight: 600;
	}
	.hint {
		display: flex;
		align-items: flex-start;
		gap: 0.35rem;
	}
	.hint :global(svg) {
		flex: none;
		margin-top: 2px;
	}
	.panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.classroom .panel {
		flex-direction: row;
		flex-wrap: wrap;
	}
	.classroom .panel > .card {
		flex: 1;
		min-width: 240px;
	}
	h2 {
		font-size: 1rem;
	}
	.results-grid.tight {
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.5rem;
	}
	.shift-label {
		margin-bottom: 0.4rem;
	}
	.shifts {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	}
	.shift {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.1rem;
		padding: 0.55rem 0.7rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		font-size: 0.88rem;
	}
	.shift:hover {
		border-color: var(--accent-border);
	}
	.shift-hint {
		line-height: 1.3;
	}
	@media (max-width: 900px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}
</style>
