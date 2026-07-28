<script lang="ts">
	import { normalCdf, normalInv } from '$lib/math/stats';
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ nA: 1000, cA: 100, nB: 1000, cB: 125, confidence: 95, twoTailed: true });

	const pA = $derived(s.nA > 0 ? s.cA / s.nA : NaN);
	const pB = $derived(s.nB > 0 ? s.cB / s.nB : NaN);

	const valid = $derived(
		s.nA > 0 && s.nB > 0 && s.cA >= 0 && s.cB >= 0 && s.cA <= s.nA && s.cB <= s.nB
	);

	// Two-proportion z-test with a pooled standard error.
	const pooled = $derived((s.cA + s.cB) / (s.nA + s.nB));
	const se = $derived(Math.sqrt(pooled * (1 - pooled) * (1 / s.nA + 1 / s.nB)));
	const z = $derived(se > 0 ? (pB - pA) / se : NaN);
	const pValue = $derived(
		!Number.isFinite(z) ? NaN : s.twoTailed ? 2 * (1 - normalCdf(Math.abs(z))) : 1 - normalCdf(z)
	);

	const alpha = $derived(1 - s.confidence / 100);
	const significant = $derived(Number.isFinite(pValue) && pValue < alpha);

	const relativeLift = $derived(pA > 0 ? (pB - pA) / pA : NaN);
	const absoluteLift = $derived(pB - pA);

	// Unpooled SE for the confidence interval on the difference.
	const seDiff = $derived(
		Math.sqrt((pA * (1 - pA)) / s.nA + (pB * (1 - pB)) / s.nB)
	);
	const zCrit = $derived(normalInv(1 - alpha / (s.twoTailed ? 2 : 1)));
	const ciLow = $derived(absoluteLift - zCrit * seDiff);
	const ciHigh = $derived(absoluteLift + zCrit * seDiff);

	/** Sample size per arm needed to detect the observed lift at 80% power. */
	const requiredN = $derived.by(() => {
		if (!valid || absoluteLift === 0) return NaN;
		const zA = normalInv(1 - alpha / (s.twoTailed ? 2 : 1));
		const zB = normalInv(0.8);
		const pBar = (pA + pB) / 2;
		return Math.ceil(
			((zA * Math.sqrt(2 * pBar * (1 - pBar)) + zB * Math.sqrt(pA * (1 - pA) + pB * (1 - pB))) ** 2) /
				absoluteLift ** 2
		);
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="tool-card-grid">
			<fieldset>
				<legend class="legend">Variant A — control</legend>
				<div class="field-row">
					<Field label="Visitors" for="ab-nA"><input id="ab-nA" type="number" min="1" bind:value={s.nA} /></Field>
					<Field label="Conversions" for="ab-cA"><input id="ab-cA" type="number" min="0" bind:value={s.cA} /></Field>
				</div>
				<p class="rate">{valid ? `${fmtLoose(pA * 100, 3)}%` : '—'}</p>
			</fieldset>

			<fieldset>
				<legend class="legend">Variant B — challenger</legend>
				<div class="field-row">
					<Field label="Visitors" for="ab-nB"><input id="ab-nB" type="number" min="1" bind:value={s.nB} /></Field>
					<Field label="Conversions" for="ab-cB"><input id="ab-cB" type="number" min="0" bind:value={s.cB} /></Field>
				</div>
				<p class="rate">{valid ? `${fmtLoose(pB * 100, 3)}%` : '—'}</p>
			</fieldset>
		</div>

		<div class="field-row">
			<Field label="Confidence level" for="ab-conf">
				<select id="ab-conf" bind:value={s.confidence}>
					<option value={90}>90%</option>
					<option value={95}>95%</option>
					<option value={99}>99%</option>
				</select>
			</Field>
			<div class="check-wrap">
				<label class="check">
					<input type="checkbox" bind:checked={s.twoTailed} />
					Two-tailed (B could be worse, not just better)
				</label>
			</div>
		</div>

		{#if !valid}
			<Note tone="warning">Conversions cannot exceed visitors, and visitors must be at least 1.</Note>
		{:else}
			<Result
				label="Verdict"
				primary
				tone={significant ? (absoluteLift > 0 ? 'positive' : 'negative') : 'warning'}
				value={significant
					? absoluteLift > 0
						? `B wins — ${fmtLoose(relativeLift * 100, 2)}% lift`
						: `B loses — ${fmtLoose(relativeLift * 100, 2)}%`
					: 'Not significant yet'}
				detail={significant
					? `A difference this large would happen by chance about ${fmtLoose(pValue * 100, 2)}% of the time.`
					: `p = ${fmtLoose(pValue, 4)}, above the ${fmtLoose(alpha, 3)} threshold. Keep running, or accept there may be no real difference.`}
			/>

			<div class="results-grid">
				<Result label="p-value" value={fmtLoose(pValue, 6)} tone={significant ? 'positive' : 'neutral'} />
				<Result label="z-score" value={fmtLoose(z, 4)} />
				<Result label="Absolute lift" value={`${absoluteLift >= 0 ? '+' : ''}${fmtLoose(absoluteLift * 100, 3)} pp`} detail="Percentage points" />
				<Result label="Relative lift" value={`${relativeLift >= 0 ? '+' : ''}${fmtLoose(relativeLift * 100, 2)}%`} />
				<Result
					label="{s.confidence}% CI for the difference"
					value={`${fmtLoose(ciLow * 100, 3)} to ${fmtLoose(ciHigh * 100, 3)} pp`}
					detail={ciLow * ciHigh > 0 ? 'The interval excludes zero' : 'The interval includes zero — no reliable difference'}
				/>
				<Result
					label="Visitors needed per arm"
					value={Number.isFinite(requiredN) ? requiredN.toLocaleString('en-US') : '—'}
					detail="To detect this size of effect at 80% power"
					tone={Number.isFinite(requiredN) && requiredN > Math.min(s.nA, s.nB) ? 'warning' : 'neutral'}
				/>
			</div>
		{/if}
	</div>

	{#snippet explainer()}
		<p>
			An A/B test asks whether the difference you observed is bigger than the noise you would expect
			from random assignment alone. The two-proportion z-test answers that directly.
		</p>
		<code class="formula">p̂ = (cA + cB) / (nA + nB)
SE = √( p̂(1 − p̂) · (1/nA + 1/nB) )
z  = (pB − pA) / SE</code>
		<h3>What the p-value means — and what it does not</h3>
		<p>
			The p-value is the probability of seeing a difference at least this large <em>if the two
			variants were actually identical</em>. It is not the probability that B is better, and it is
			not the size of the effect. A tiny p-value on a 0.1% lift is still a 0.1% lift.
		</p>
		<h3>Stopping early is the classic mistake</h3>
		<p>
			Checking the p-value every day and stopping the moment it dips below 0.05 inflates the false
			positive rate dramatically — you are effectively running many tests and reporting the luckiest.
			Fix a sample size in advance and run to it. The “visitors needed” figure above is that number,
			for the effect size you are currently seeing.
		</p>
		<h3>Confidence interval over p-value</h3>
		<p>
			The interval tells you the range of true differences consistent with your data. If it spans
			zero, you cannot rule out “no difference”. If it runs from +0.1 to +8 percentage points, you
			have a winner but not much idea how big — which is itself useful to know.
		</p>
		<h3>Assumptions</h3>
		<p>
			The normal approximation needs a reasonable number of conversions in each arm — at least 5
			expected successes and 5 failures is the usual rule. Visitors must be assigned randomly and
			counted once each; repeat visits and shared devices break the arithmetic.
		</p>
	{/snippet}
</ToolShell>

<style>
	.legend {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}
	.rate {
		font-size: 1.4rem;
		font-weight: 650;
		margin-top: 0.5rem;
		font-variant-numeric: tabular-nums;
	}
	.check-wrap {
		display: flex;
		align-items: flex-end;
		padding-bottom: 0.6rem;
	}
</style>
