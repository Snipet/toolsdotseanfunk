<script lang="ts">
	import { fromBaseString, toBaseString } from '$lib/math/numbers';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ value: '255', base: 10, customBase: 36 });

	const decimal = $derived(fromBaseString(s.value, s.base));
	const valid = $derived(Number.isFinite(decimal));
	const isInteger = $derived(valid && Number.isInteger(decimal));

	const COMMON = [
		{ base: 2, name: 'Binary', prefix: '0b' },
		{ base: 8, name: 'Octal', prefix: '0o' },
		{ base: 10, name: 'Decimal', prefix: '' },
		{ base: 16, name: 'Hexadecimal', prefix: '0x' }
	];

	// 32 bits is the widest view that stays readable; anything larger falls
	// back to the plain binary string above.
	const bits = $derived(
		isInteger && decimal >= 0 && decimal < 2 ** 32
			? Array.from({ length: 32 }, (_, i) => ((decimal >>> (31 - i)) & 1) === 1)
			: null
	);

	function toggleBit(index: number) {
		if (!bits) return;
		const next = decimal ^ (1 << (31 - index));
		s.value = toBaseString(next >>> 0, s.base);
	}
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Value" for="nb-value" error={s.value && !valid ? `Not a valid base-${s.base} number` : undefined}>
				<input id="nb-value" class="mono" type="text" bind:value={s.value} autocomplete="off" spellcheck="false" />
			</Field>
			<Field label="Input base" for="nb-base">
				<select id="nb-base" bind:value={s.base}>
					{#each Array.from({ length: 35 }, (_, i) => i + 2) as base (base)}
						<option value={base}>
							Base {base}{base === 2 ? ' (binary)' : base === 8 ? ' (octal)' : base === 10 ? ' (decimal)' : base === 16 ? ' (hex)' : ''}
						</option>
					{/each}
				</select>
			</Field>
		</div>

		<div class="results-grid">
			{#each COMMON as row (row.base)}
				<Result
					label={row.name}
					primary={row.base === 16}
					value={valid ? row.prefix + toBaseString(decimal, row.base) : '—'}
					detail="base {row.base}"
				/>
			{/each}
		</div>

		<div class="field-row">
			<Field label="Any other base: {s.customBase}" for="nb-custom">
				<input id="nb-custom" type="range" min="2" max="36" bind:value={s.customBase} />
			</Field>
			<Result label="Base {s.customBase}" value={valid ? toBaseString(decimal, s.customBase) : '—'} />
		</div>
	</div>

	{#if bits}
		<section class="card">
			<h2>32-bit view</h2>
			<p class="small muted">Click any bit to flip it.</p>
			<div class="bits">
				{#each bits as on, i (i)}
					<button
						type="button"
						class="bit"
						class:on
						onclick={() => toggleBit(i)}
						aria-label="Bit {31 - i}, currently {on ? 1 : 0}"
					>
						{on ? 1 : 0}
					</button>
					{#if (i + 1) % 8 === 0 && i < 31}<span class="gap"></span>{/if}
				{/each}
			</div>
			<p class="small muted bit-labels">
				<span>bit 31</span><span>bit 0</span>
			</p>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			A number base is just how many digits you count with before rolling over. Decimal uses ten
			(0–9); binary uses two; hexadecimal uses sixteen, borrowing A–F for the values ten to fifteen.
			The <em>value</em> never changes — 255, 0xFF and 0b11111111 are the same quantity written three
			ways.
		</p>
		<code class="formula">value = Σ digit(i) × base^i</code>
		<h3>Why hexadecimal shows up everywhere in computing</h3>
		<p>
			One hex digit is exactly four bits, so a byte is always exactly two hex digits. That makes hex
			a compact, lossless shorthand for binary — which is why colors (<code>#FF8800</code>), memory
			addresses and hashes are written that way.
		</p>
		<h3>Fractions</h3>
		<p>
			Fractional values are supported and shown to twelve digits. Note that a fraction which
			terminates in one base may repeat forever in another — 0.1 in decimal is a repeating binary
			fraction, which is the root cause of floating-point surprises.
		</p>
	{/snippet}
</ToolShell>

<style>
	.bits {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		margin-top: 0.75rem;
	}
	.bit {
		width: 26px;
		height: 32px;
		border: 1px solid var(--border-strong);
		background: var(--bg-sunken);
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		cursor: pointer;
		color: var(--text-faint);
	}
	.bit.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
		font-weight: 700;
	}
	.gap {
		width: 8px;
	}
	.bit-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 0.35rem;
	}
</style>
