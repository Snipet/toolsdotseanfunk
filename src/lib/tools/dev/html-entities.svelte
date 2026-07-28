<script lang="ts">
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	let text = $state('<script>alert("Tom & Jerry\'s <b>café</b>")</' + 'script>');
	let mode = $state<'encode' | 'decode'>('encode');
	let encodeAll = $state(false);

	const NAMED: Record<string, string> = {
		'&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos', ' ': 'nbsp',
		'©': 'copy', '®': 'reg', '™': 'trade', '€': 'euro', '£': 'pound', '¥': 'yen',
		'¢': 'cent', '§': 'sect', '¶': 'para', '†': 'dagger', '‡': 'Dagger', '•': 'bull',
		'…': 'hellip', '–': 'ndash', '—': 'mdash', '‘': 'lsquo', '’': 'rsquo',
		'“': 'ldquo', '”': 'rdquo', '«': 'laquo', '»': 'raquo', '°': 'deg', '±': 'plusmn',
		'×': 'times', '÷': 'divide', '¼': 'frac14', '½': 'frac12', '¾': 'frac34',
		'≈': 'asymp', '≠': 'ne', '≤': 'le', '≥': 'ge', '←': 'larr', '→': 'rarr',
		'↑': 'uarr', '↓': 'darr', '↔': 'harr', 'α': 'alpha', 'β': 'beta', 'π': 'pi',
		'Σ': 'sigma', 'Ω': 'Omega', '∞': 'infin', '√': 'radic', '∑': 'sum'
	};

	const encoded = $derived(
		[...text]
			.map((c) => {
				const name = NAMED[c];
				if (name && (encodeAll || '&<>"\''.includes(c))) return `&${name};`;
				if (encodeAll && c.codePointAt(0)! > 127) return `&#${c.codePointAt(0)};`;
				return c;
			})
			.join('')
	);

	const decoded = $derived.by(() => {
		// Decoding via the DOM parser handles every named entity the browser knows,
		// without ever inserting the markup into the live document.
		if (typeof DOMParser === 'undefined') return text;
		try {
			const doc = new DOMParser().parseFromString(`<!doctype html><body>${text}`, 'text/html');
			return doc.body.textContent ?? '';
		} catch {
			return text;
		}
	});

	const output = $derived(mode === 'encode' ? encoded : decoded);

	const reference = $derived(Object.entries(NAMED));
	let filter = $state('');
	const filtered = $derived(
		filter
			? reference.filter(([char, name]) => name.includes(filter.toLowerCase()) || char.includes(filter))
			: reference
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={mode === 'encode'} onclick={() => (mode = 'encode')}>Encode</button>
			<button type="button" class="btn btn-sm" class:btn-primary={mode === 'decode'} onclick={() => (mode = 'decode')}>Decode</button>
			{#if mode === 'encode'}
				<label class="check"><input type="checkbox" bind:checked={encodeAll} /> Encode every non-ASCII character</label>
			{/if}
		</div>

		<Field label={mode === 'encode' ? 'Text or markup' : 'Encoded HTML'} for="he-input">
			<textarea id="he-input" bind:value={text} rows="6" spellcheck="false" class="mono"></textarea>
		</Field>

		<div class="out-head">
			<label for="he-output">{mode === 'encode' ? 'Escaped' : 'Decoded'}</label>
			<CopyButton value={() => output} label="Copy" />
		</div>
		<textarea id="he-output" value={output} rows="6" readonly spellcheck="false" class="mono"></textarea>
	</div>

	<section class="card">
		<h2>Entity reference</h2>
		<label class="visually-hidden" for="he-filter">Filter entities</label>
		<input id="he-filter" type="search" bind:value={filter} placeholder="Filter…" autocomplete="off" />
		<div class="entities">
			{#each filtered as [char, name] (name)}
				<div class="entity">
					<span class="glyph">{char}</span>
					<code>&amp;{name};</code>
					<code class="muted">&amp;#{char.codePointAt(0)};</code>
				</div>
			{/each}
		</div>
	</section>

	{#snippet explainer()}
		<p>
			HTML entities let you write characters that would otherwise be interpreted as markup, or that
			are hard to type. <code>&amp;lt;</code> renders as a literal less-than sign instead of opening
			a tag.
		</p>
		<h3>The five that matter</h3>
		<p>
			<code>&amp;</code>, <code>&lt;</code>, <code>&gt;</code>, <code>"</code> and <code>'</code>.
			Escaping these before inserting user content into a page is the foundational defence against
			cross-site scripting. Everything else is convenience.
		</p>
		<h3>Escaping is context-dependent</h3>
		<p>
			HTML-escaping is correct inside element content and attribute values. It is <em>not</em>
			sufficient inside a <code>&lt;script&gt;</code> block, a URL, or a CSS value — each needs its
			own escaping. This is why hand-rolled escaping keeps producing vulnerabilities, and why
			templating engines that escape by context are worth using.
		</p>
		<h3>Named, decimal and hex</h3>
		<p>
			<code>&amp;copy;</code>, <code>&amp;#169;</code> and <code>&amp;#x00A9;</code> all produce ©.
			HTML5 defines over two thousand named entities; numeric references work for any code point and
			need no lookup table.
		</p>
		<h3>You usually do not need entities for accents</h3>
		<p>
			With a UTF-8 charset declared — which every modern page has — you can write <code>café</code>
			directly. Entities for accented characters are a holdover from the days of ambiguous encodings.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 130px;
		font-size: 0.85rem;
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
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.6rem;
	}
	.entities {
		display: grid;
		gap: 0.4rem;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		margin-top: 0.75rem;
		max-height: 400px;
		overflow-y: auto;
	}
	.entity {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.5rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: 0.76rem;
	}
	.glyph {
		font-size: 1.1rem;
		min-width: 1.2em;
		text-align: center;
	}
</style>
