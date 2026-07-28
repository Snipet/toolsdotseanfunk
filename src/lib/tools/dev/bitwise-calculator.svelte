<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ a: 12, b: 10, shift: 2 });

	const OPERATIONS = [
		{ name: 'AND (a & b)', fn: (a: number, b: number) => a & b, note: 'Bit set only where both are set — masking' },
		{ name: 'OR (a | b)', fn: (a: number, b: number) => a | b, note: 'Bit set where either is set — combining flags' },
		{ name: 'XOR (a ^ b)', fn: (a: number, b: number) => a ^ b, note: 'Bit set where exactly one is set — toggling' },
		{ name: 'NOT a (~a)', fn: (a: number) => ~a, note: 'Every bit inverted — note the sign' },
		{ name: 'AND NOT (a & ~b)', fn: (a: number, b: number) => a & ~b, note: 'Clear the bits of b from a' }
	];

	const SHIFTS = [
		{ name: 'Left shift (a << n)', fn: (a: number, n: number) => a << n, note: 'Multiply by 2ⁿ' },
		{ name: 'Signed right shift (a >> n)', fn: (a: number, n: number) => a >> n, note: 'Divide by 2ⁿ, keeping the sign' },
		{ name: 'Unsigned right shift (a >>> n)', fn: (a: number, n: number) => a >>> n, note: 'Fills with zeros from the left' }
	];

	const bin = (n: number) => (n >>> 0).toString(2).padStart(32, '0').replace(/(.{8})(?=.)/g, '$1 ');
	const hex = (n: number) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');

	const bitsOf = (n: number) => Array.from({ length: 32 }, (_, i) => ((n >>> (31 - i)) & 1) === 1);

	function flip(which: 'a' | 'b', index: number) {
		const value = which === 'a' ? s.a : s.b;
		const next = value ^ (1 << (31 - index));
		if (which === 'a') s.a = next;
		else s.b = next;
	}

	const popcount = (n: number) => bitsOf(n).filter(Boolean).length;
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="a" for="bw-a"><input id="bw-a" type="number" bind:value={s.a} /></Field>
			<Field label="b" for="bw-b"><input id="bw-b" type="number" bind:value={s.b} /></Field>
			<Field label="Shift amount" for="bw-shift"><input id="bw-shift" type="number" min="0" max="31" bind:value={s.shift} /></Field>
		</div>

		<div class="bit-editor">
			<span class="label">a</span>
			<div class="bits">
				{#each bitsOf(s.a) as on, i (i)}
					<button type="button" class="bit" class:on onclick={() => flip('a', i)} aria-label="Bit {31 - i} of a">{on ? 1 : 0}</button>
				{/each}
			</div>
		</div>
		<div class="bit-editor">
			<span class="label">b</span>
			<div class="bits">
				{#each bitsOf(s.b) as on, i (i)}
					<button type="button" class="bit" class:on onclick={() => flip('b', i)} aria-label="Bit {31 - i} of b">{on ? 1 : 0}</button>
				{/each}
			</div>
		</div>

		<div class="results-grid">
			<Result label="a" value={String(s.a)} detail={`${hex(s.a)} · ${popcount(s.a)} bits set`} />
			<Result label="b" value={String(s.b)} detail={`${hex(s.b)} · ${popcount(s.b)} bits set`} />
		</div>
	</div>

	<section class="card">
		<h2>Operations</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th>Operation</th><th class="num">Decimal</th><th>Hex</th><th>Binary</th></tr></thead>
				<tbody>
					{#each OPERATIONS as op (op.name)}
						{@const result = op.fn(s.a, s.b)}
						<tr>
							<td>{op.name}<br /><span class="small muted">{op.note}</span></td>
							<td class="num">{result}</td>
							<td class="mono">{hex(result)}</td>
							<td class="mono small">{bin(result)}</td>
						</tr>
					{/each}
					{#each SHIFTS as op (op.name)}
						{@const result = op.fn(s.a, s.shift)}
						<tr>
							<td>{op.name.replace('n', String(s.shift))}<br /><span class="small muted">{op.note}</span></td>
							<td class="num">{result}</td>
							<td class="mono">{hex(result)}</td>
							<td class="mono small">{bin(result)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			JavaScript's bitwise operators convert their operands to 32-bit signed integers, act on the
			bits, and convert back. That conversion is why <code>~5</code> is −6 rather than a large
			positive number, and why values above 2³¹ behave unexpectedly.
		</p>
		<h3>Two's complement</h3>
		<p>
			Negative numbers are represented by inverting all bits and adding one. The top bit is the sign,
			so <code>0xFFFFFFFF</code> is −1 rather than 4,294,967,295. The unsigned right shift
			<code>&gt;&gt;&gt;</code> is the one operator that treats the value as unsigned, which is the
			standard way to coerce a number to a uint32.
		</p>
		<h3>Bit flags</h3>
		<p>
			Packing booleans into one integer is still the standard way to represent permission sets and
			feature flags:
		</p>
		<code class="formula">set:    flags |= FLAG
clear:  flags &= ~FLAG
toggle: flags ^= FLAG
test:   (flags & FLAG) !== 0</code>
		<h3>Shifts as arithmetic</h3>
		<p>
			<code>x &lt;&lt; n</code> multiplies by 2ⁿ and <code>x &gt;&gt; n</code> divides by it, rounding
			toward negative infinity. Compilers do this transformation themselves, so writing shifts for
			speed in high-level code buys nothing and costs readability.
		</p>
		<h3>XOR tricks</h3>
		<p>
			XOR is its own inverse: <code>a ^ b ^ b === a</code>. That underpins one-time-pad encryption,
			simple checksums, and the classic “find the non-duplicated element” puzzle — XOR every value in
			a list and the pairs cancel out.
		</p>
	{/snippet}
</ToolShell>

<style>
	.bit-editor {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.bit-editor .label {
		font-family: var(--font-mono);
		font-weight: 700;
		width: 1em;
	}
	.bits {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
	}
	.bit {
		width: 22px;
		height: 28px;
		border: 1px solid var(--border-strong);
		background: var(--bg-sunken);
		border-radius: 3px;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		cursor: pointer;
		color: var(--text-faint);
	}
	.bit.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
		font-weight: 700;
	}
	.bits .bit:nth-child(8n + 1) {
		margin-left: 6px;
	}
	.bits .bit:first-child {
		margin-left: 0;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
</style>
