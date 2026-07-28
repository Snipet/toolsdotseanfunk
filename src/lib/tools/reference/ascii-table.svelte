<script lang="ts">
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const CONTROL_NAMES = [
		['NUL', 'Null'], ['SOH', 'Start of heading'], ['STX', 'Start of text'], ['ETX', 'End of text'],
		['EOT', 'End of transmission'], ['ENQ', 'Enquiry'], ['ACK', 'Acknowledge'], ['BEL', 'Bell'],
		['BS', 'Backspace'], ['HT', 'Horizontal tab'], ['LF', 'Line feed'], ['VT', 'Vertical tab'],
		['FF', 'Form feed'], ['CR', 'Carriage return'], ['SO', 'Shift out'], ['SI', 'Shift in'],
		['DLE', 'Data link escape'], ['DC1', 'Device control 1 (XON)'], ['DC2', 'Device control 2'],
		['DC3', 'Device control 3 (XOFF)'], ['DC4', 'Device control 4'], ['NAK', 'Negative acknowledge'],
		['SYN', 'Synchronous idle'], ['ETB', 'End of block'], ['CAN', 'Cancel'], ['EM', 'End of medium'],
		['SUB', 'Substitute'], ['ESC', 'Escape'], ['FS', 'File separator'], ['GS', 'Group separator'],
		['RS', 'Record separator'], ['US', 'Unit separator']
	];

	const ESCAPES: Record<number, string> = { 0: '\\0', 7: '\\a', 8: '\\b', 9: '\\t', 10: '\\n', 11: '\\v', 12: '\\f', 13: '\\r', 27: '\\e' };

	interface Row {
		dec: number;
		hex: string;
		oct: string;
		bin: string;
		char: string;
		name: string;
		description: string;
		group: string;
	}

	const ROWS: Row[] = Array.from({ length: 128 }, (_, dec) => {
		const isControl = dec < 32 || dec === 127;
		const control = dec < 32 ? CONTROL_NAMES[dec] : dec === 127 ? ['DEL', 'Delete'] : null;
		return {
			dec,
			hex: dec.toString(16).toUpperCase().padStart(2, '0'),
			oct: dec.toString(8).padStart(3, '0'),
			bin: dec.toString(2).padStart(8, '0'),
			char: isControl ? (control?.[0] ?? '') : dec === 32 ? 'SP' : String.fromCharCode(dec),
			name: control?.[0] ?? String.fromCharCode(dec),
			description: control?.[1] ?? (dec === 32 ? 'Space' : ESCAPES[dec] ? `Escape ${ESCAPES[dec]}` : ''),
			group: isControl ? 'Control' : dec === 32 ? 'Whitespace' : dec < 48 || (dec > 57 && dec < 65) || (dec > 90 && dec < 97) || dec > 122 ? 'Punctuation' : dec < 58 ? 'Digit' : dec < 91 ? 'Uppercase' : 'Lowercase'
		};
	});

	let filter = $state('');
	let showControl = $state(true);

	const shown = $derived(
		ROWS.filter((row) => {
			if (!showControl && row.group === 'Control') return false;
			const q = filter.trim().toLowerCase();
			if (!q) return true;
			return (
				String(row.dec) === q ||
				row.hex.toLowerCase() === q.replace(/^0x/, '') ||
				row.char.toLowerCase() === q ||
				row.name.toLowerCase().includes(q) ||
				row.description.toLowerCase().includes(q)
			);
		})
	);
</script>

<ToolShell {tool}>
	<div class="card no-print">
		<div class="row">
			<label class="visually-hidden" for="at-filter">Filter</label>
			<input id="at-filter" type="search" bind:value={filter} placeholder="Search by character, code or name — try “65”, “0x41”, “tab”…" autocomplete="off" />
			<label class="check"><input type="checkbox" bind:checked={showControl} /> Show control characters</label>
			<button type="button" class="btn" onclick={() => window.print()}><Icon name="print" size={16} /> Print</button>
		</div>
	</div>

	<section class="card">
		<div class="scroll-x">
			<table class="data ascii">
				<thead>
					<tr><th class="num">Dec</th><th class="num">Hex</th><th class="num">Oct</th><th class="num">Binary</th><th>Char</th><th>Name</th><th>Description</th></tr>
				</thead>
				<tbody>
					{#each shown as row (row.dec)}
						<tr data-group={row.group}>
							<td class="num">{row.dec}</td>
							<td class="num mono">0x{row.hex}</td>
							<td class="num mono">{row.oct}</td>
							<td class="num mono small">{row.bin}</td>
							<td class="char">{row.char}</td>
							<td class="mono">{row.name}</td>
							<td class="muted small">{row.description}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="card">
		<h2>Useful arithmetic</h2>
		<dl class="facts">
			<div><dt>'A' = 65, 'a' = 97</dt><dd>The difference is 32 — a single bit. <code>c ^ 32</code> flips the case of any ASCII letter.</dd></div>
			<div><dt>'0' = 48</dt><dd><code>c − 48</code> converts a digit character to its value, which is <code>c − '0'</code> in C.</dd></div>
			<div><dt>Digits are 0x30–0x39</dt><dd>The low nibble <em>is</em> the digit: 0x37 is '7'. This is why hex dumps of numeric text are readable at a glance.</dd></div>
			<div><dt>Uppercase is 0x41–0x5A</dt><dd>Lowercase is 0x61–0x7A. Bit 5 is the case bit.</dd></div>
			<div><dt>Space = 32, DEL = 127</dt><dd>Everything printable sits between them.</dd></div>
		</dl>
	</section>

	{#snippet explainer()}
		<p>
			ASCII — the American Standard Code for Information Interchange — was standardised in 1963 and
			assigns a number from 0 to 127 to each character. Seven bits, which is why the eighth bit was
			free for parity on the teletypes it was designed for.
		</p>
		<h3>The layout is deliberate</h3>
		<p>
			Nothing about the ordering is accidental. Digits are consecutive so arithmetic works. Uppercase
			and lowercase are separated by exactly 32 so case conversion is one bit flip. Control
			characters come first so they sort before printable text. These decisions still shape how
			string code is written sixty years later.
		</p>
		<h3>The control characters that survived</h3>
		<p>
			Most of the first 32 codes were for controlling physical teletypes and are now historical. A
			few remain essential: <strong>LF</strong> (10) and <strong>CR</strong> (13) for line endings,
			<strong>HT</strong> (9) for tab, <strong>ESC</strong> (27) which begins every terminal escape
			sequence, and <strong>BEL</strong> (7) which still makes many terminals beep. <strong>DC1</strong>
			and <strong>DC3</strong> are XON and XOFF — the reason Ctrl-S freezes some terminals.
		</p>
		<h3>Why line endings differ</h3>
		<p>
			A teletype needed two operations to start a new line: carriage return to move the head back,
			line feed to advance the paper. Unix chose LF alone, classic Mac OS chose CR alone, and DOS
			kept both as CRLF. Windows inherited CRLF, which is why files still move between systems with
			mismatched line endings.
		</p>
		<h3>ASCII is a subset of UTF-8</h3>
		<p>
			UTF-8 was designed so that every ASCII byte means exactly the same thing in UTF-8. Any
			ASCII-only file is already valid UTF-8 — a compatibility decision that is a large part of why
			UTF-8 won over the alternatives.
		</p>
	{/snippet}
</ToolShell>

<style>
	.row input[type='search'] {
		flex: 1;
		min-width: 200px;
	}
	table.ascii td {
		padding: 0.3rem 0.6rem;
	}
	.char {
		font-family: var(--font-mono);
		font-size: 1rem;
		font-weight: 600;
	}
	tr[data-group='Control'] {
		color: var(--text-muted);
	}
	tr[data-group='Digit'] .char,
	tr[data-group='Uppercase'] .char,
	tr[data-group='Lowercase'] .char {
		color: var(--accent);
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.facts {
		display: grid;
		gap: 0.6rem;
	}
	.facts dt {
		font-family: var(--font-mono);
		font-weight: 650;
		font-size: 0.88rem;
	}
	.facts dd {
		margin: 0.1rem 0 0;
		color: var(--text-muted);
		font-size: 0.9rem;
	}
</style>
