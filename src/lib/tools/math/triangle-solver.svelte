<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	// Blank fields are the interface: fill any three and the rest are solved.
	const s = urlState({ a: '3', b: '4', c: '5', A: '', B: '', C: '', degrees: true });

	const toRad = (deg: number) => (s.degrees ? (deg * Math.PI) / 180 : deg);
	const fromRad = (rad: number) => (s.degrees ? (rad * 180) / Math.PI : rad);

	const num = (v: string) => (v.trim() === '' ? null : Number(v));

	const solution = $derived.by(() => {
		let a = num(s.a);
		let b = num(s.b);
		let c = num(s.c);
		let A = num(s.A) === null ? null : toRad(num(s.A)!);
		let B = num(s.B) === null ? null : toRad(num(s.B)!);
		let C = num(s.C) === null ? null : toRad(num(s.C)!);

		const given = [a, b, c, A, B, C].filter((x) => x !== null).length;
		const sides = [a, b, c].filter((x) => x !== null).length;

		if (given < 3) return { error: 'Enter any three values — at least one must be a side.' };
		if (sides === 0) return { error: 'Three angles fix the shape but not the size. Give at least one side.' };
		if ([a, b, c].some((x) => x !== null && x <= 0)) return { error: 'Sides must be positive.' };
		if ([A, B, C].some((x) => x !== null && (x <= 0 || x >= Math.PI)))
			return { error: `Angles must be between 0 and ${s.degrees ? '180°' : 'π'}.` };

		let method = '';

		// Fill in the third angle whenever two are known.
		const fillAngle = () => {
			if (A !== null && B !== null && C === null) C = Math.PI - A - B;
			else if (A !== null && C !== null && B === null) B = Math.PI - A - C;
			else if (B !== null && C !== null && A === null) A = Math.PI - B - C;
		};
		fillAngle();
		if ([A, B, C].some((x) => x !== null && x <= 0)) return { error: 'Those angles add to 180° or more.' };

		if (sides === 3) {
			method = 'Law of cosines (SSS)';
			if (a! + b! <= c! || a! + c! <= b! || b! + c! <= a!)
				return { error: 'Those three lengths cannot close a triangle — any two sides must exceed the third.' };
			A = Math.acos((b! ** 2 + c! ** 2 - a! ** 2) / (2 * b! * c!));
			B = Math.acos((a! ** 2 + c! ** 2 - b! ** 2) / (2 * a! * c!));
			C = Math.PI - A - B;
		} else if (sides === 2) {
			// SAS if the known angle is between the sides; otherwise SSA.
			if (a !== null && b !== null && C !== null) {
				method = 'Law of cosines (SAS)';
				c = Math.sqrt(a ** 2 + b ** 2 - 2 * a * b * Math.cos(C));
				A = Math.asin((a * Math.sin(C)) / c);
				B = Math.PI - A - C;
			} else if (a !== null && c !== null && B !== null) {
				method = 'Law of cosines (SAS)';
				b = Math.sqrt(a ** 2 + c ** 2 - 2 * a * c * Math.cos(B));
				A = Math.asin((a * Math.sin(B)) / b);
				C = Math.PI - A - B;
			} else if (b !== null && c !== null && A !== null) {
				method = 'Law of cosines (SAS)';
				a = Math.sqrt(b ** 2 + c ** 2 - 2 * b * c * Math.cos(A));
				B = Math.asin((b * Math.sin(A)) / a);
				C = Math.PI - A - B;
			} else {
				method = 'Law of sines (SSA — the ambiguous case)';
				const pairs: Array<[number, number | null, number, number | null]> = [
					[a!, A, b!, B],
					[b!, B, c!, C],
					[a!, A, c!, C]
				];
				const known = pairs.find(([, ang]) => ang !== null);
				if (!known) return { error: 'Give an angle opposite one of the sides you entered.' };
				return { error: 'SSA can have two valid answers. Enter the angle between the two sides instead.' };
			}
		} else {
			method = 'Law of sines (ASA / AAS)';
			const ratio =
				a !== null && A !== null
					? a / Math.sin(A)
					: b !== null && B !== null
						? b / Math.sin(B)
						: c !== null && C !== null
							? c / Math.sin(C)
							: null;
			if (ratio === null) return { error: 'The side you gave must be paired with a known angle.' };
			a = a ?? ratio * Math.sin(A!);
			b = b ?? ratio * Math.sin(B!);
			c = c ?? ratio * Math.sin(C!);
		}

		const perimeter = a! + b! + c!;
		const sp = perimeter / 2;
		const area = Math.sqrt(sp * (sp - a!) * (sp - b!) * (sp - c!));

		return {
			a: a!, b: b!, c: c!,
			A: A!, B: B!, C: C!,
			perimeter,
			area,
			method,
			right: [A!, B!, C!].some((x) => Math.abs(x - Math.PI / 2) < 1e-9),
			equilateral: Math.abs(a! - b!) < 1e-9 && Math.abs(b! - c!) < 1e-9,
			isosceles:
				Math.abs(a! - b!) < 1e-9 || Math.abs(b! - c!) < 1e-9 || Math.abs(a! - c!) < 1e-9
		};
	});

	const ok = $derived(!('error' in solution));

	// Draw the solved triangle to scale, with A at the origin.
	const drawing = $derived.by(() => {
		if (!ok) return null;
		const t = solution as Extract<typeof solution, { a: number }>;
		const Ax = 0, Ay = 0;
		const Bx = t.c, By = 0;
		const Cx = t.b * Math.cos(t.A);
		const Cy = t.b * Math.sin(t.A);
		const xs = [Ax, Bx, Cx];
		const ys = [Ay, By, Cy];
		const w = Math.max(...xs) - Math.min(...xs) || 1;
		const h = Math.max(...ys) - Math.min(...ys) || 1;
		const scale = Math.min(520 / w, 240 / h);
		const ox = -Math.min(...xs) * scale + 40;
		const oy = 280 - -Math.min(...ys) * scale;
		return {
			points: [
				{ x: Ax * scale + ox, y: oy - Ay * scale, label: 'A' },
				{ x: Bx * scale + ox, y: oy - By * scale, label: 'B' },
				{ x: Cx * scale + ox, y: oy - Cy * scale, label: 'C' }
			]
		};
	});

	function clearAll() {
		s.a = ''; s.b = ''; s.c = ''; s.A = ''; s.B = ''; s.C = '';
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Note>
			Fill in any <strong>three</strong> values — at least one of them a side — and the rest are solved.
			Sides are lower-case; each angle is upper-case and sits opposite the side of the same letter.
		</Note>

		<div class="field-row">
			<Field label="Side a" for="tri-a"><input id="tri-a" type="number" step="any" bind:value={s.a} /></Field>
			<Field label="Side b" for="tri-b"><input id="tri-b" type="number" step="any" bind:value={s.b} /></Field>
			<Field label="Side c" for="tri-c"><input id="tri-c" type="number" step="any" bind:value={s.c} /></Field>
		</div>
		<div class="field-row">
			<Field label="Angle A" for="tri-A"><input id="tri-A" type="number" step="any" bind:value={s.A} /></Field>
			<Field label="Angle B" for="tri-B"><input id="tri-B" type="number" step="any" bind:value={s.B} /></Field>
			<Field label="Angle C" for="tri-C"><input id="tri-C" type="number" step="any" bind:value={s.C} /></Field>
		</div>

		<div class="row no-print">
			<label class="check"><input type="checkbox" bind:checked={s.degrees} /> Degrees</label>
			<button type="button" class="btn btn-sm" onclick={clearAll}>Clear all</button>
			<button type="button" class="btn btn-sm" onclick={() => { clearAll(); s.a = '3'; s.b = '4'; s.c = '5'; }}>3-4-5 example</button>
		</div>

		{#if !ok}
			<Note tone="warning">{(solution as { error: string }).error}</Note>
		{:else}
			{@const t = solution as Extract<typeof solution, { a: number }>}
			<div class="results-grid">
				<Result label="Side a" value={fmtLoose(t.a, 6)} />
				<Result label="Side b" value={fmtLoose(t.b, 6)} />
				<Result label="Side c" value={fmtLoose(t.c, 6)} />
				<Result label="Angle A" value={`${fmtLoose(fromRad(t.A), 4)}${s.degrees ? '°' : ' rad'}`} />
				<Result label="Angle B" value={`${fmtLoose(fromRad(t.B), 4)}${s.degrees ? '°' : ' rad'}`} />
				<Result label="Angle C" value={`${fmtLoose(fromRad(t.C), 4)}${s.degrees ? '°' : ' rad'}`} />
				<Result label="Area" primary value={fmtLoose(t.area, 6)} detail="Heron's formula" />
				<Result label="Perimeter" value={fmtLoose(t.perimeter, 6)} />
			</div>
			<p class="small muted">
				Solved by the {t.method}.
				{#if t.right}This is a right triangle.{/if}
				{#if t.equilateral}Equilateral.{:else if t.isosceles}Isosceles.{/if}
			</p>
		{/if}
	</div>

	{#if drawing}
		<section class="card">
			<h2>To scale</h2>
			<svg viewBox="0 0 600 320" class="plot" role="img" aria-label="Scale drawing of the solved triangle">
				<polygon
					points={drawing.points.map((p) => `${p.x},${p.y}`).join(' ')}
					fill="color-mix(in srgb, var(--accent) 12%, transparent)"
					stroke="var(--accent)"
					stroke-width="2.5"
					stroke-linejoin="round"
				/>
				{#each drawing.points as p (p.label)}
					<circle cx={p.x} cy={p.y} r="4" fill="var(--accent)" />
					<text x={p.x} y={p.y - 12} text-anchor="middle" fill="var(--text)" font-size="15" font-weight="600">
						{p.label}
					</text>
				{/each}
			</svg>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			Three independent measurements fix a triangle completely — with one famous exception. Which
			three you have determines which law does the work.
		</p>
		<code class="formula">Law of sines:   a / sin A = b / sin B = c / sin C
Law of cosines: c² = a² + b² − 2ab·cos C
Heron's area:   s = (a+b+c)/2,  area = √(s(s−a)(s−b)(s−c))</code>
		<h3>Which case is which</h3>
		<dl>
			<dt>SSS — three sides</dt>
			<dd>Law of cosines, rearranged to give each angle. Always exactly one triangle.</dd>
			<dt>SAS — two sides and the angle between them</dt>
			<dd>Law of cosines for the third side, then the law of sines. Always exactly one triangle.</dd>
			<dt>ASA / AAS — two angles and any side</dt>
			<dd>The third angle is 180° minus the other two; the law of sines gives the remaining sides.</dd>
			<dt>SSA — two sides and an angle <em>not</em> between them</dt>
			<dd>The ambiguous case: zero, one or two triangles can fit. This solver asks you to disambiguate rather than silently pick one.</dd>
		</dl>
		<h3>The triangle inequality</h3>
		<p>
			Any two sides must add to more than the third. 3, 4 and 8 cannot form a triangle — the short
			sides cannot reach across. The solver checks this before doing anything else.
		</p>
		<h3>Right triangles</h3>
		<p>
			When one angle is 90°, the law of cosines collapses to a² + b² = c², because cos 90° = 0.
			Pythagoras is the special case, not a separate rule.
		</p>
	{/snippet}
</ToolShell>

<style>
	.plot {
		width: 100%;
		height: auto;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		margin-top: 0.75rem;
	}
</style>
