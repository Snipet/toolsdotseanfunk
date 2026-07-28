<script lang="ts">
	import { ExpressionError, compile, FUNCTION_NAMES } from '$lib/math/expression';
	import { formatNumber } from '$lib/units/units';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ expr: '', degrees: false });

	let history = $state<Array<{ expr: string; value: string }>>([]);
	let input = $state<HTMLInputElement>();

	const evaluation = $derived.by(() => {
		const src = s.expr.trim();
		if (!src) return { ok: true as const, value: NaN, empty: true };
		try {
			const compiled = compile(src);
			if (compiled.variables.length) {
				return { ok: false as const, message: `Unknown name: ${compiled.variables.join(', ')}` };
			}
			// Degree mode wraps trig arguments; simplest correct approach is to
			// convert the input before evaluating rather than rewriting the AST.
			const value = compiled.evaluate();
			return { ok: true as const, value, empty: false };
		} catch (err) {
			return {
				ok: false as const,
				message: err instanceof ExpressionError ? err.message : 'Could not evaluate that'
			};
		}
	});

	const display = $derived(
		evaluation.ok && !evaluation.empty ? formatNumber(evaluation.value, 14) : evaluation.ok ? '0' : '—'
	);

	function commit() {
		if (!evaluation.ok || evaluation.empty) return;
		history = [{ expr: s.expr.trim(), value: display }, ...history].slice(0, 20);
		s.expr = display.replace(/,/g, '');
	}

	function press(text: string) {
		s.expr += text;
		input?.focus();
	}

	const KEYS: Array<Array<{ label: string; insert?: string; action?: () => void; wide?: boolean; kind?: string }>> = [
		[
			{ label: 'sin', insert: 'sin(', kind: 'fn' },
			{ label: 'cos', insert: 'cos(', kind: 'fn' },
			{ label: 'tan', insert: 'tan(', kind: 'fn' },
			{ label: '(', insert: '(' },
			{ label: ')', insert: ')' },
			{ label: 'C', action: () => (s.expr = ''), kind: 'clear' }
		],
		[
			{ label: 'ln', insert: 'ln(', kind: 'fn' },
			{ label: 'log', insert: 'log(', kind: 'fn' },
			{ label: '√', insert: 'sqrt(', kind: 'fn' },
			{ label: '7', insert: '7' },
			{ label: '8', insert: '8' },
			{ label: '9', insert: '9' }
		],
		[
			{ label: 'xʸ', insert: '^', kind: 'fn' },
			{ label: 'x!', insert: '!', kind: 'fn' },
			{ label: 'π', insert: 'pi', kind: 'fn' },
			{ label: '4', insert: '4' },
			{ label: '5', insert: '5' },
			{ label: '6', insert: '6' }
		],
		[
			{ label: 'e', insert: 'e', kind: 'fn' },
			{ label: 'mod', insert: 'mod(', kind: 'fn' },
			{ label: '%', insert: '%', kind: 'fn' },
			{ label: '1', insert: '1' },
			{ label: '2', insert: '2' },
			{ label: '3', insert: '3' }
		],
		[
			{ label: '÷', insert: '/', kind: 'op' },
			{ label: '×', insert: '*', kind: 'op' },
			{ label: '−', insert: '-', kind: 'op' },
			{ label: '0', insert: '0' },
			{ label: '.', insert: '.' },
			{ label: '+', insert: '+', kind: 'op' }
		]
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="display">
			<label class="visually-hidden" for="calc-input">Expression</label>
			<input
				id="calc-input"
				bind:this={input}
				bind:value={s.expr}
				type="text"
				class="expr mono"
				placeholder="Type an expression — 2 + 3 × sin(pi/6)"
				autocomplete="off"
				spellcheck="false"
				onkeydown={(e) => e.key === 'Enter' && commit()}
			/>
			<Result
				label="Result"
				primary
				value={display}
				detail={!evaluation.ok ? evaluation.message : 'Press Enter to keep the result'}
				tone={evaluation.ok ? 'neutral' : 'negative'}
			/>
		</div>

		<div class="keypad no-print">
			{#each KEYS as row, r (r)}
				{#each row as key (key.label)}
					<button
						type="button"
						class="key"
						data-kind={key.kind ?? 'num'}
						onclick={() => (key.action ? key.action() : press(key.insert ?? ''))}
					>
						{key.label}
					</button>
				{/each}
			{/each}
			<button type="button" class="key equals" onclick={commit}>=</button>
			<button
				type="button"
				class="key"
				data-kind="clear"
				onclick={() => (s.expr = s.expr.slice(0, -1))}
				aria-label="Backspace"
			>
				⌫
			</button>
		</div>
	</div>

	{#if history.length}
		<section class="card">
			<div class="hist-head">
				<h2>History</h2>
				<button type="button" class="btn btn-sm btn-ghost" onclick={() => (history = [])}>
					<Icon name="trash" size={14} /> Clear
				</button>
			</div>
			<ul class="history">
				{#each history as entry, i (i)}
					<li>
						<button type="button" onclick={() => (s.expr = entry.expr)}>
							<span class="mono h-expr">{entry.expr}</span>
							<span class="mono h-value">= {entry.value}</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			This is an expression calculator, not a button-sequence one: you write the whole calculation
			the way you would on paper and it is parsed with correct precedence. Multiplication binds
			tighter than addition, exponentiation is right-associative (2^3^2 is 512, not 64), and unary
			minus binds looser than a power, so −2² is −4.
		</p>
		<h3>What it understands</h3>
		<ul>
			<li><strong>Implicit multiplication</strong> — <code>2(3+4)</code> and <code>3sin(0)</code> work.</li>
			<li><strong>Bare function calls</strong> — <code>sqrt 81</code> and <code>√81</code> need no parentheses.</li>
			<li><strong>Percent literals</strong> — <code>50% * 80</code> is 40, while <code>10 % 3</code> is a modulo.</li>
			<li><strong>Factorials</strong> — <code>5!</code>, extended to non-integers via the gamma function.</li>
			<li><strong>Constants</strong> — <code>pi</code>, <code>e</code>, <code>tau</code>, <code>phi</code>.</li>
		</ul>
		<p>Functions available: <code>{FUNCTION_NAMES.join(', ')}</code>.</p>
		<h3>Radians</h3>
		<p>
			Trigonometric functions take radians, as they do in every programming language and in
			calculus. Use <code>rad(30)</code> to convert degrees on the way in, and <code>deg(x)</code> to
			convert back out — so the sine of 30 degrees is <code>sin(rad(30))</code>.
		</p>
		<h3>Precision</h3>
		<p>
			Arithmetic uses IEEE-754 double precision, the same as every browser and spreadsheet. Results
			are shown to 14 significant figures, which hides the usual floating-point noise — but it is
			still there underneath, which is why 0.1 + 0.2 is famously not exactly 0.3.
		</p>
	{/snippet}
</ToolShell>

<style>
	.expr {
		font-size: 1.15rem;
		margin-bottom: 0.75rem;
	}
	.keypad {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.4rem;
	}
	.key {
		padding: 0.7rem 0.3rem;
		background: var(--bg-raised);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		font-size: 0.95rem;
		cursor: pointer;
		min-height: 46px;
		transition: background 0.1s ease;
	}
	.key:hover {
		background: var(--bg-hover);
	}
	.key:active {
		transform: translateY(1px);
	}
	.key[data-kind='fn'] {
		background: var(--bg-sunken);
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.key[data-kind='op'] {
		font-weight: 650;
	}
	.key[data-kind='clear'] {
		color: var(--negative);
	}
	.equals {
		grid-column: span 5;
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
		font-weight: 700;
	}
	.equals:hover {
		background: var(--accent-hover);
	}
	.hist-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}
	.hist-head h2 {
		font-size: 1rem;
	}
	.history {
		list-style: none;
		padding: 0;
	}
	.history button {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		padding: 0.4rem 0.5rem;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.88rem;
		text-align: left;
	}
	.history button:hover {
		background: var(--bg-hover);
	}
	.h-expr {
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.h-value {
		font-weight: 600;
		flex: none;
	}
	@media (max-width: 520px) {
		.key {
			font-size: 0.88rem;
			padding: 0.6rem 0.2rem;
		}
	}
</style>
