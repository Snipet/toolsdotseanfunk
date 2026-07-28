<script lang="ts">
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let mode = $state<'toJson' | 'toCsv'>('toJson');
	let csv = $state('name,role,years\nAda Lovelace,Mathematician,12\n"Hopper, Grace",Rear Admiral,44\nAlan Turing,Cryptanalyst,15');
	let json = $state('[\n  { "name": "Ada Lovelace", "role": "Mathematician", "years": 12 }\n]');
	let delimiter = $state(',');
	let hasHeader = $state(true);
	let typed = $state(true);

	/** RFC 4180 parser: handles quoted fields, escaped quotes and embedded newlines. */
	function parseCsv(text: string, sep: string): string[][] {
		const rows: string[][] = [];
		let row: string[] = [];
		let field = '';
		let inQuotes = false;

		for (let i = 0; i < text.length; i++) {
			const c = text[i];
			if (inQuotes) {
				if (c === '"') {
					if (text[i + 1] === '"') {
						field += '"';
						i++;
					} else {
						inQuotes = false;
					}
				} else {
					field += c;
				}
			} else if (c === '"') {
				inQuotes = true;
			} else if (c === sep) {
				row.push(field);
				field = '';
			} else if (c === '\n') {
				row.push(field);
				rows.push(row);
				row = [];
				field = '';
			} else if (c !== '\r') {
				field += c;
			}
		}
		if (field || row.length) {
			row.push(field);
			rows.push(row);
		}
		return rows.filter((r) => r.some((cell) => cell !== ''));
	}

	function coerce(value: string): unknown {
		if (!typed) return value;
		const trimmed = value.trim();
		if (trimmed === '') return null;
		if (trimmed === 'true') return true;
		if (trimmed === 'false') return false;
		if (trimmed === 'null') return null;
		// Only treat it as a number when the round trip is lossless, so that
		// leading-zero codes and long IDs survive as strings.
		const n = Number(trimmed);
		if (Number.isFinite(n) && String(n) === trimmed) return n;
		return value;
	}

	const detectedDelimiter = $derived.by(() => {
		const firstLine = csv.split('\n')[0] ?? '';
		const counts = [',', ';', '\t', '|'].map((d) => ({ d, n: firstLine.split(d).length }));
		return counts.sort((a, b) => b.n - a.n)[0]?.d ?? ',';
	});

	const jsonOutput = $derived.by(() => {
		try {
			const rows = parseCsv(csv, delimiter === 'auto' ? detectedDelimiter : delimiter);
			if (!rows.length) return '[]';
			if (hasHeader) {
				const [header, ...body] = rows;
				return JSON.stringify(
					body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), coerce(r[i] ?? '')]))),
					null,
					2
				);
			}
			return JSON.stringify(rows.map((r) => r.map(coerce)), null, 2);
		} catch (err) {
			return `Error: ${err instanceof Error ? err.message : 'could not parse'}`;
		}
	});

	function escapeCsv(value: unknown, sep: string): string {
		const text = value === null || value === undefined ? '' : String(value);
		return /["\n\r]/.test(text) || text.includes(sep) ? `"${text.replace(/"/g, '""')}"` : text;
	}

	const csvOutput = $derived.by(() => {
		try {
			const data = JSON.parse(json);
			const sep = delimiter === 'auto' ? ',' : delimiter;
			if (!Array.isArray(data)) return 'Error: the top level must be an array of objects.';
			if (!data.length) return '';
			const columns = [...new Set(data.flatMap((row) => (row && typeof row === 'object' ? Object.keys(row) : [])))];
			const lines = [columns.map((c) => escapeCsv(c, sep)).join(sep)];
			for (const row of data) {
				lines.push(columns.map((c) => escapeCsv((row as Record<string, unknown>)?.[c], sep)).join(sep));
			}
			return lines.join('\n');
		} catch (err) {
			return `Error: ${err instanceof Error ? err.message : 'invalid JSON'}`;
		}
	});

	const output = $derived(mode === 'toJson' ? jsonOutput : csvOutput);
	const rowCount = $derived(mode === 'toJson' ? parseCsv(csv, delimiter === 'auto' ? detectedDelimiter : delimiter).length : csvOutput.split('\n').length);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={mode === 'toJson'} onclick={() => (mode = 'toJson')}>CSV → JSON</button>
			<button type="button" class="btn btn-sm" class:btn-primary={mode === 'toCsv'} onclick={() => (mode = 'toCsv')}>JSON → CSV</button>
		</div>

		<div class="field-row">
			<Field label="Delimiter" for="cj-delim" hint={delimiter === 'auto' ? `Detected: ${detectedDelimiter === '\t' ? 'tab' : detectedDelimiter}` : undefined}>
				<select id="cj-delim" bind:value={delimiter}>
					<option value="auto">Detect automatically</option>
					<option value=",">Comma</option>
					<option value=";">Semicolon</option>
					<option value={'\t'}>Tab</option>
					<option value="|">Pipe</option>
				</select>
			</Field>
			<div class="checks">
				{#if mode === 'toJson'}
					<label class="check"><input type="checkbox" bind:checked={hasHeader} /> First row is a header</label>
					<label class="check"><input type="checkbox" bind:checked={typed} /> Convert numbers and booleans</label>
				{/if}
			</div>
		</div>
	</div>

	<div class="tool-card-grid">
		<div class="card">
			<label for="cj-input">{mode === 'toJson' ? 'CSV' : 'JSON'}</label>
			{#if mode === 'toJson'}
				<textarea id="cj-input" bind:value={csv} rows="16" spellcheck="false" class="mono"></textarea>
			{:else}
				<textarea id="cj-input" bind:value={json} rows="16" spellcheck="false" class="mono"></textarea>
			{/if}
		</div>
		<div class="card">
			<div class="out-head">
				<label for="cj-output">{mode === 'toJson' ? 'JSON' : 'CSV'} — {rowCount} rows</label>
				<CopyButton value={() => output} label="Copy" />
			</div>
			<textarea id="cj-output" value={output} rows="16" readonly spellcheck="false" class="mono"></textarea>
		</div>
	</div>

	<Note>
		The parser follows RFC 4180: fields containing a delimiter, a quote or a newline are wrapped in
		double quotes, and a literal quote inside a field is written twice. That is why
		<code>"Hopper, Grace"</code> stays one field.
	</Note>

	{#snippet explainer()}
		<p>
			CSV looks trivial and is not. Splitting on commas breaks the moment a field contains one, and
			real-world exports contain quoted fields, embedded newlines and inconsistent line endings.
		</p>
		<h3>Type coercion is opt-in for a reason</h3>
		<p>
			Converting <code>"007"</code> to the number 7 destroys data — the same goes for phone numbers,
			postcodes and product codes with leading zeros. This tool only converts a value when the
			number round-trips to exactly the same string, so <code>007</code> and <code>1.50</code> stay
			as text while <code>42</code> becomes a number.
		</p>
		<h3>Semicolons and locale</h3>
		<p>
			In locales that use a comma as the decimal separator, Excel exports CSV with semicolons
			instead. That is why a file that opens cleanly for a colleague can arrive as one long column
			for you — pick the right delimiter above rather than assuming the file is broken.
		</p>
		<h3>JSON → CSV flattens</h3>
		<p>
			The column set is the union of all keys across all rows, so heterogeneous objects produce empty
			cells rather than misaligned columns. Nested objects and arrays are stringified — CSV has no
			way to represent structure.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 380px;
		font-size: 0.85rem;
	}
	.checks {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		justify-content: flex-end;
		padding-bottom: 0.4rem;
	}
	.out-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.3rem;
	}
	.out-head label {
		margin-bottom: 0;
	}
</style>
