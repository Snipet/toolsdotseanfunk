<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ value: '350', unit: 'f' });

	const input = $derived(Number(s.value));
	const valid = $derived(Number.isFinite(input) && s.value.trim() !== '');

	const celsius = $derived(
		!valid ? NaN : s.unit === 'f' ? ((input - 32) * 5) / 9 : s.unit === 'c' ? input : gasToC(input)
	);
	const fahrenheit = $derived((celsius * 9) / 5 + 32);

	// UK gas marks: mark 1 is 275 °F, and each mark is 25 °F.
	function gasToC(mark: number): number {
		return (((mark - 1) * 25 + 275 - 32) * 5) / 9;
	}
	function cToGas(c: number): number {
		return ((c * 9) / 5 + 32 - 275) / 25 + 1;
	}

	const gasMark = $derived(cToGas(celsius));
	/** Convection ovens run hotter; the standard advice is 25 °F / ~15 °C less. */
	const fanC = $derived(celsius - 20);
	const fanF = $derived(fahrenheit - 25);

	const CHART = [
		{ f: 225, label: 'Very cool' },
		{ f: 250, label: 'Very cool' },
		{ f: 275, label: 'Cool' },
		{ f: 300, label: 'Cool' },
		{ f: 325, label: 'Warm' },
		{ f: 350, label: 'Moderate' },
		{ f: 375, label: 'Moderate' },
		{ f: 400, label: 'Moderately hot' },
		{ f: 425, label: 'Hot' },
		{ f: 450, label: 'Hot' },
		{ f: 475, label: 'Very hot' },
		{ f: 500, label: 'Very hot' }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Temperature" for="oven-value">
				<input id="oven-value" type="number" bind:value={s.value} autocomplete="off" />
			</Field>
			<Field label="Scale" for="oven-unit">
				<select id="oven-unit" bind:value={s.unit}>
					<option value="f">Fahrenheit (°F)</option>
					<option value="c">Celsius (°C)</option>
					<option value="gas">Gas mark</option>
				</select>
			</Field>
		</div>

		<div class="results-grid">
			<Result label="Fahrenheit" primary={s.unit !== 'f'} value={valid ? `${Math.round(fahrenheit)} °F` : '—'} />
			<Result label="Celsius" primary={s.unit !== 'c'} value={valid ? `${Math.round(celsius)} °C` : '—'} />
			<Result
				label="Gas mark"
				value={valid && gasMark >= 0.25 ? String(Math.round(gasMark * 2) / 2) : '—'}
				detail={valid && gasMark < 1 ? 'Below gas mark 1 (¼ and ½ marks exist)' : undefined}
			/>
			<Result
				label="Fan / convection"
				value={valid ? `${Math.round(fanC / 5) * 5} °C · ${Math.round(fanF / 5) * 5} °F` : '—'}
				detail="Roughly 20 °C lower"
			/>
		</div>

		<Note>
			<strong>Fan ovens run hot.</strong> A convection fan moves air across the food, so heat transfers
			faster than the thermostat reading suggests. Drop the set temperature by about 20 °C (25 °F), or
			keep the temperature and cut the time by roughly a quarter — but not both.
		</Note>
	</div>

	<section class="card">
		<h2>Oven temperature chart</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th class="num">°F</th><th class="num">°C</th><th class="num">Fan °C</th><th class="num">Gas</th><th>Description</th></tr></thead>
				<tbody>
					{#each CHART as row (row.f)}
						{@const c = ((row.f - 32) * 5) / 9}
						<tr>
							<td class="num">{row.f}</td>
							<td class="num">{Math.round(c / 5) * 5}</td>
							<td class="num">{Math.round((c - 20) / 5) * 5}</td>
							<td class="num">{row.f < 275 ? (row.f === 250 ? '½' : '¼') : Math.round(cToGas(c) * 2) / 2}</td>
							<td class="muted">{row.label}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#snippet explainer()}
		<p>
			Oven conversions are just temperature conversions, with two wrinkles: gas marks, and fans.
		</p>
		<code class="formula">°C = (°F − 32) × 5/9        gas mark = (°F − 275) ÷ 25 + 1</code>
		<h3>Gas marks</h3>
		<p>
			The UK gas mark scale starts at mark 1 = 275 °F and adds 25 °F per mark, with fractional marks
			¼ and ½ below it for very slow cooking. It is a coarse scale on purpose — gas ovens swing far
			more than the numbers suggest.
		</p>
		<h3>Rounding is fine here</h3>
		<p>
			Recipes are written in round numbers because domestic ovens are routinely 10–15 °C off and
			cycle around their setpoint. 350 °F converts to 176.7 °C, but every European recipe writes 180.
			An oven thermometer tells you more than another decimal place ever will.
		</p>
		<h3>Altitude</h3>
		<p>
			Above about 3,000 ft, lower pressure means water boils cooler and leavening expands faster.
			The usual adjustment is to raise the oven by 15–25 °F and shorten the bake slightly, plus a
			little extra liquid.
		</p>
	{/snippet}
</ToolShell>
