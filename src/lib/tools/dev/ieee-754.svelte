<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ value: '0.1', precision: 'double' });

	const input = $derived(Number(s.value));
	const valid = $derived(Number.isFinite(input) || s.value.trim() === 'Infinity' || s.value.trim() === 'NaN');

	const inspection = $derived.by(() => {
		const isDouble = s.precision === 'double';
		const buffer = new ArrayBuffer(8);
		const view = new DataView(buffer);

		if (isDouble) view.setFloat64(0, input);
		else view.setFloat32(0, input);

		const bits = isDouble
			? view.getBigUint64(0).toString(2).padStart(64, '0')
			: view.getUint32(0).toString(2).padStart(32, '0');

		const exponentBits = isDouble ? 11 : 8;
		const mantissaBits = isDouble ? 52 : 23;
		const bias = isDouble ? 1023 : 127;

		const sign = bits[0];
		const exponent = bits.slice(1, 1 + exponentBits);
		const mantissa = bits.slice(1 + exponentBits);

		const rawExponent = parseInt(exponent, 2);
		const stored = isDouble ? view.getFloat64(0) : view.getFloat32(0);

		let category = 'normal';
		if (rawExponent === 0) category = parseInt(mantissa, 2) === 0 ? 'zero' : 'subnormal';
		else if (rawExponent === (1 << exponentBits) - 1) {
			category = parseInt(mantissa, 2) === 0 ? 'infinity' : 'NaN';
		}

		return {
			bits, sign, exponent, mantissa,
			rawExponent,
			actualExponent: category === 'normal' ? rawExponent - bias : category === 'subnormal' ? 1 - bias : 0,
			hex: isDouble
				? view.getBigUint64(0).toString(16).toUpperCase().padStart(16, '0')
				: view.getUint32(0).toString(16).toUpperCase().padStart(8, '0'),
			stored,
			exact: stored.toPrecision(isDouble ? 20 : 12),
			category,
			error: Math.abs(stored - input),
			bytes: isDouble ? 8 : 4
		};
	});

	const EXAMPLES = [
		{ label: '0.1', value: '0.1' },
		{ label: '0.2', value: '0.2' },
		{ label: '0.1 + 0.2', value: String(0.1 + 0.2) },
		{ label: '1/3', value: String(1 / 3) },
		{ label: 'Max safe integer', value: String(Number.MAX_SAFE_INTEGER) },
		{ label: 'Beyond safe', value: '9007199254740993' },
		{ label: 'Smallest subnormal', value: String(Number.MIN_VALUE) },
		{ label: 'Infinity', value: 'Infinity' }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Number" for="fl-value">
				<input id="fl-value" type="text" class="mono" bind:value={s.value} autocomplete="off" spellcheck="false" />
			</Field>
			<Field label="Precision" for="fl-precision">
				<select id="fl-precision" bind:value={s.precision}>
					<option value="double">64-bit double (JavaScript number, C double)</option>
					<option value="single">32-bit single (C float, GLSL)</option>
				</select>
			</Field>
		</div>

		<div class="row no-print">
			{#each EXAMPLES as example (example.label)}
				<button type="button" class="btn btn-sm" onclick={() => (s.value = example.value)}>{example.label}</button>
			{/each}
		</div>

		{#if valid}
			<div class="bits" role="img" aria-label="Bit layout of the floating point value">
				<span class="group sign" title="Sign bit">{inspection.sign}</span>
				<span class="group exponent" title="Exponent">{inspection.exponent}</span>
				<span class="group mantissa" title="Mantissa">{inspection.mantissa}</span>
			</div>
			<div class="legend small">
				<span><span class="swatch sign"></span> Sign (1 bit)</span>
				<span><span class="swatch exponent"></span> Exponent ({inspection.exponent.length} bits)</span>
				<span><span class="swatch mantissa"></span> Mantissa ({inspection.mantissa.length} bits)</span>
			</div>

			<div class="results-grid">
				<Result label="Value actually stored" primary value={inspection.exact} detail={inspection.error > 0 ? `Off by ${inspection.error.toExponential(3)}` : 'Exactly representable'} tone={inspection.error > 0 ? 'warning' : 'positive'} />
				<Result label="Hex" value={`0x${inspection.hex}`} />
				<Result label="Sign" value={inspection.sign === '1' ? 'Negative' : 'Positive'} />
				<Result label="Exponent" value={`${inspection.rawExponent} (biased) → 2^${inspection.actualExponent}`} />
				<Result label="Category" value={inspection.category} />
				<Result label="Size" value={`${inspection.bytes} bytes`} />
			</div>
		{/if}
	</div>

	<Note>
		<strong>0.1 + 0.2 = 0.30000000000000004</strong> because neither 0.1 nor 0.2 can be written
		exactly in binary — just as 1/3 cannot be written exactly in decimal. Each is stored as the
		nearest representable value, and the two tiny errors do not cancel.
	</Note>

	{#snippet explainer()}
		<p>
			IEEE-754 stores a number as a sign, an exponent and a fraction — binary scientific notation.
			The value is reconstructed as:
		</p>
		<code class="formula">value = (−1)^sign × 1.mantissa × 2^(exponent − bias)

double: 1 sign + 11 exponent + 52 mantissa bits, bias 1023
single: 1 sign +  8 exponent + 23 mantissa bits, bias  127</code>
		<h3>Why 0.1 is not 0.1</h3>
		<p>
			In binary, 0.1 is the repeating fraction 0.0001100110011… Just as 1/3 has no exact decimal
			expansion, 1/10 has no exact binary one. The stored value is the nearest double, about
			0.1000000000000000055511151231257827. Every arithmetic operation starts from that.
		</p>
		<h3>The implicit leading 1</h3>
		<p>
			Normalised numbers always have a leading 1 before the binary point, so it is not stored — you
			get 53 bits of precision from 52 stored bits. Subnormal numbers, where the exponent field is
			all zeros, drop that assumption to represent values closer to zero at reduced precision.
		</p>
		<h3>Integers are exact up to 2⁵³</h3>
		<p>
			Every integer up to 9,007,199,254,740,991 is representable exactly. Beyond that, consecutive
			integers start sharing a representation: 2⁵³ and 2⁵³+1 are the same double. This is why 64-bit
			database IDs must be sent as strings in JSON, and why <code>BigInt</code> exists.
		</p>
		<h3>Never compare floats with ==</h3>
		<p>
			Compare against a tolerance instead: <code>Math.abs(a − b) &lt; 1e-9</code>. For money, do not
			use floats at all — store integer minor units (cents, pence) or use a decimal library.
		</p>
		<h3>NaN is not equal to itself</h3>
		<p>
			<code>NaN === NaN</code> is false, by specification — which is why <code>Number.isNaN</code>
			exists. There are also two zeros, <code>+0</code> and <code>−0</code>, which compare equal but
			behave differently: <code>1/0</code> is Infinity and <code>1/−0</code> is −Infinity.
		</p>
	{/snippet}
</ToolShell>

<style>
	.bits {
		display: flex;
		flex-wrap: wrap;
		font-family: var(--font-mono);
		font-size: 0.9rem;
		letter-spacing: 0.12em;
		word-break: break-all;
		line-height: 1.8;
	}
	.group {
		padding: 0.1rem 0.2rem;
		border-radius: 3px;
	}
	.sign {
		background: color-mix(in srgb, var(--negative) 25%, transparent);
	}
	.exponent {
		background: color-mix(in srgb, var(--accent) 25%, transparent);
	}
	.mantissa {
		background: color-mix(in srgb, var(--positive) 22%, transparent);
	}
	.legend {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		color: var(--text-muted);
	}
	.swatch {
		display: inline-block;
		width: 11px;
		height: 11px;
		border-radius: 2px;
		margin-right: 0.25rem;
	}
	.swatch.sign {
		background: color-mix(in srgb, var(--negative) 45%, transparent);
	}
	.swatch.exponent {
		background: color-mix(in srgb, var(--accent) 45%, transparent);
	}
	.swatch.mantissa {
		background: color-mix(in srgb, var(--positive) 45%, transparent);
	}
</style>
