<script lang="ts">
	import { bytes } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let input = $state('{"name":"tools[dot]seanfunk","tools":[{"id":1,"slug":"json-formatter"},{"id":2,"slug":"base64"}],"private":true,"server":null}');
	let indent = $state('2');
	let sortKeys = $state(false);

	const parsed = $derived.by(() => {
		const text = input.trim();
		if (!text) return { ok: true as const, value: undefined };
		try {
			return { ok: true as const, value: JSON.parse(text) as unknown };
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Invalid JSON';
			// Turn the engine's character offset into a line and column.
			const match = /position (\d+)/.exec(message);
			let location = '';
			if (match) {
				const offset = Number(match[1]);
				const before = text.slice(0, offset);
				const line = before.split('\n').length;
				const column = offset - before.lastIndexOf('\n');
				location = ` — line ${line}, column ${column}`;
			}
			return { ok: false as const, message: message + location };
		}
	});

	function sortDeep(value: unknown): unknown {
		if (Array.isArray(value)) return value.map(sortDeep);
		if (value && typeof value === 'object') {
			return Object.fromEntries(
				Object.entries(value as Record<string, unknown>)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([k, v]) => [k, sortDeep(v)])
			);
		}
		return value;
	}

	const prepared = $derived(parsed.ok && parsed.value !== undefined ? (sortKeys ? sortDeep(parsed.value) : parsed.value) : undefined);

	const formatted = $derived.by(() => {
		if (prepared === undefined) return '';
		const space = indent === 'tab' ? '\t' : Number(indent);
		try {
			return JSON.stringify(prepared, null, space);
		} catch {
			return '';
		}
	});

	const minified = $derived(prepared === undefined ? '' : JSON.stringify(prepared));

	const stats = $derived.by(() => {
		if (prepared === undefined) return null;
		let keys = 0;
		let arrays = 0;
		let objects = 0;
		let depth = 0;
		const walk = (value: unknown, level: number) => {
			depth = Math.max(depth, level);
			if (Array.isArray(value)) {
				arrays++;
				value.forEach((v) => walk(v, level + 1));
			} else if (value && typeof value === 'object') {
				objects++;
				for (const [, v] of Object.entries(value)) {
					keys++;
					walk(v, level + 1);
				}
			}
		};
		walk(prepared, 1);
		return { keys, arrays, objects, depth };
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Indentation" for="jf-indent">
				<select id="jf-indent" bind:value={indent}>
					<option value="2">2 spaces</option>
					<option value="4">4 spaces</option>
					<option value="tab">Tab</option>
					<option value="0">Minified</option>
				</select>
			</Field>
			<div class="checks">
				<label class="check"><input type="checkbox" bind:checked={sortKeys} /> Sort keys alphabetically</label>
			</div>
		</div>

		{#if !parsed.ok}
			<Note tone="warning"><strong>Invalid JSON:</strong> {parsed.message}</Note>
		{:else if stats}
			<div class="results-grid">
				<Result label="Valid" primary value="Yes" tone="positive" copyable={false} />
				<Result label="Keys" value={stats.keys.toLocaleString('en-US')} copyable={false} />
				<Result label="Objects / arrays" value={`${stats.objects} / ${stats.arrays}`} copyable={false} />
				<Result label="Maximum depth" value={String(stats.depth)} copyable={false} />
				<Result label="Formatted size" value={bytes(new Blob([formatted]).size)} copyable={false} />
				<Result label="Minified size" value={bytes(new Blob([minified]).size)} detail={formatted.length ? `${Math.round((1 - minified.length / formatted.length) * 100)}% smaller` : undefined} copyable={false} />
			</div>
		{/if}
	</div>

	<div class="tool-card-grid">
		<div class="card">
			<label for="jf-input">Input</label>
			<textarea id="jf-input" bind:value={input} rows="18" spellcheck="false" class="mono"></textarea>
		</div>
		<div class="card">
			<div class="out-head">
				<label for="jf-output">Output</label>
				<div class="row">
					<CopyButton value={() => formatted} label="Copy" />
					<CopyButton value={() => minified} label="Copy minified" />
				</div>
			</div>
			<textarea id="jf-output" value={indent === '0' ? minified : formatted} rows="18" readonly spellcheck="false" class="mono"></textarea>
		</div>
	</div>

	{#snippet explainer()}
		<p>
			Parsing and formatting both happen in your browser using the native JSON engine — the same one
			your code will use. Nothing is transmitted, which matters when the payload you are debugging
			contains tokens or customer data.
		</p>
		<h3>Common causes of “invalid JSON”</h3>
		<ul>
			<li><strong>Trailing commas.</strong> Legal in JavaScript, illegal in JSON.</li>
			<li><strong>Single quotes.</strong> JSON strings must use double quotes.</li>
			<li><strong>Unquoted keys.</strong> <code>{'{name: 1}'}</code> is a JavaScript object literal, not JSON.</li>
			<li><strong>Comments.</strong> JSON has none. JSON5 and JSONC do; plain JSON does not.</li>
			<li><strong>NaN and Infinity.</strong> Not representable — they must be null or a string.</li>
		</ul>
		<h3>Key order</h3>
		<p>
			JSON objects are unordered by specification, but every real parser preserves insertion order,
			and diffs care about it. Sorting keys makes two payloads comparable when they were serialised
			by different systems.
		</p>
		<h3>Number precision</h3>
		<p>
			JSON numbers are parsed as IEEE-754 doubles, so integers beyond 2⁵³ lose precision silently —
			a real hazard with 64-bit database IDs and Twitter-style snowflake identifiers. APIs that
			return large IDs should send them as strings.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 420px;
		font-size: 0.85rem;
	}
	.checks {
		display: flex;
		align-items: flex-end;
		padding-bottom: 0.6rem;
	}
	.out-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.3rem;
		flex-wrap: wrap;
	}
	.out-head label {
		margin-bottom: 0;
	}
</style>
