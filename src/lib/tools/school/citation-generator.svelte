<script lang="ts">
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let type = $state<'book' | 'journal' | 'website'>('journal');
	let authors = $state('Lovelace, Ada; Babbage, Charles');
	let title = $state('Notes on the Analytical Engine');
	let container = $state('Scientific Memoirs');
	let publisher = $state('Richard and John E. Taylor');
	let year = $state('1843');
	let volume = $state('3');
	let issue = $state('');
	let pages = $state('666-731');
	let url = $state('https://example.org/notes');
	let doi = $state('10.1000/example');
	let accessed = $state(new Date().toISOString().slice(0, 10));

	const authorList = $derived(
		authors
			.split(';')
			.map((a) => a.trim())
			.filter(Boolean)
			.map((a) => {
				const [last, first] = a.split(',').map((p) => p.trim());
				return { last: last ?? a, first: first ?? '' };
			})
	);

	const initials = (first: string) =>
		first
			.split(/\s+/)
			.filter(Boolean)
			.map((part) => `${part[0].toUpperCase()}.`)
			.join(' ');

	/** APA 7 lists up to 20 authors, with an ampersand before the last. */
	function apaAuthors(): string {
		const names = authorList.map((a) => `${a.last}, ${initials(a.first)}`.trim().replace(/,$/, ''));
		if (names.length === 0) return '';
		if (names.length === 1) return names[0];
		if (names.length <= 20) return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
		return `${names.slice(0, 19).join(', ')}, ... ${names[names.length - 1]}`;
	}

	/** MLA 9 names the first author, then "et al." for three or more. */
	function mlaAuthors(): string {
		if (!authorList.length) return '';
		const first = `${authorList[0].last}, ${authorList[0].first}`.replace(/,\s*$/, '');
		if (authorList.length === 1) return first;
		if (authorList.length === 2) return `${first}, and ${authorList[1].first} ${authorList[1].last}`.trim();
		return `${first}, et al.`;
	}

	function chicagoAuthors(): string {
		if (!authorList.length) return '';
		const first = `${authorList[0].last}, ${authorList[0].first}`.replace(/,\s*$/, '');
		const rest = authorList.slice(1).map((a) => `${a.first} ${a.last}`.trim());
		return rest.length ? `${first}, and ${rest.join(', and ')}` : first;
	}

	function harvardAuthors(): string {
		const names = authorList.map((a) => `${a.last}, ${initials(a.first)}`.trim().replace(/,$/, ''));
		return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? '';
	}

	function ieeeAuthors(): string {
		return authorList.map((a) => `${initials(a.first)} ${a.last}`.trim()).join(', ');
	}

	const citations = $derived.by(() => {
		const doiPart = doi ? ` https://doi.org/${doi}` : url ? ` ${url}` : '';

		if (type === 'journal') {
			return [
				{
					style: 'APA 7',
					text: `${apaAuthors()} (${year}). ${title}. *${container}*, *${volume}*${issue ? `(${issue})` : ''}${pages ? `, ${pages}` : ''}.${doiPart}`
				},
				{
					style: 'MLA 9',
					text: `${mlaAuthors()}. "${title}." *${container}*, vol. ${volume}${issue ? `, no. ${issue}` : ''}, ${year}${pages ? `, pp. ${pages}` : ''}.${doi ? ` https://doi.org/${doi}.` : ''}`
				},
				{
					style: 'Chicago (author-date)',
					text: `${chicagoAuthors()}. ${year}. "${title}." *${container}* ${volume}${issue ? ` (${issue})` : ''}${pages ? `: ${pages}` : ''}.${doi ? ` https://doi.org/${doi}.` : ''}`
				},
				{
					style: 'Harvard',
					text: `${harvardAuthors()} (${year}) '${title}', *${container}*, ${volume}${issue ? `(${issue})` : ''}${pages ? `, pp. ${pages}` : ''}.${doi ? ` doi: ${doi}.` : ''}`
				},
				{
					style: 'IEEE',
					text: `${ieeeAuthors()}, "${title}," *${container}*, vol. ${volume}${issue ? `, no. ${issue}` : ''}${pages ? `, pp. ${pages}` : ''}, ${year}.`
				}
			];
		}

		if (type === 'book') {
			return [
				{ style: 'APA 7', text: `${apaAuthors()} (${year}). *${title}*. ${publisher}.` },
				{ style: 'MLA 9', text: `${mlaAuthors()}. *${title}*. ${publisher}, ${year}.` },
				{ style: 'Chicago (author-date)', text: `${chicagoAuthors()}. ${year}. *${title}*. ${publisher}.` },
				{ style: 'Harvard', text: `${harvardAuthors()} (${year}) *${title}*. ${publisher}.` },
				{ style: 'IEEE', text: `${ieeeAuthors()}, *${title}*. ${publisher}, ${year}.` }
			];
		}

		const accessedDate = new Date(accessed);
		const accessedLong = Number.isNaN(accessedDate.getTime())
			? accessed
			: accessedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

		return [
			{ style: 'APA 7', text: `${apaAuthors()} (${year}). ${title}. *${container}*. ${url}` },
			{ style: 'MLA 9', text: `${mlaAuthors()}. "${title}." *${container}*, ${year}, ${url}. Accessed ${accessedLong}.` },
			{ style: 'Chicago (author-date)', text: `${chicagoAuthors()}. ${year}. "${title}." *${container}*. Accessed ${accessedLong}. ${url}.` },
			{ style: 'Harvard', text: `${harvardAuthors()} (${year}) *${title}*. Available at: ${url} (Accessed: ${accessedLong}).` },
			{ style: 'IEEE', text: `${ieeeAuthors()}, "${title}," *${container}*, ${year}. [Online]. Available: ${url}` }
		];
	});

	/** Strip the markdown emphasis used to mark italics in the plain-text copy. */
	const plain = (text: string) => text.replace(/\*/g, '');
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field label="Source type" for="cg-type">
			<select id="cg-type" bind:value={type}>
				<option value="journal">Journal article</option>
				<option value="book">Book</option>
				<option value="website">Web page</option>
			</select>
		</Field>

		<Field label="Authors" for="cg-authors" hint="Last, First — separate multiple authors with a semicolon">
			<input id="cg-authors" type="text" bind:value={authors} autocomplete="off" />
		</Field>

		<div class="field-row">
			<Field label="Title" for="cg-title"><input id="cg-title" type="text" bind:value={title} /></Field>
			<Field label="Year" for="cg-year"><input id="cg-year" type="text" bind:value={year} /></Field>
		</div>

		{#if type === 'journal'}
			<div class="field-row">
				<Field label="Journal" for="cg-container"><input id="cg-container" type="text" bind:value={container} /></Field>
				<Field label="Volume" for="cg-volume"><input id="cg-volume" type="text" bind:value={volume} /></Field>
				<Field label="Issue" for="cg-issue"><input id="cg-issue" type="text" bind:value={issue} /></Field>
				<Field label="Pages" for="cg-pages"><input id="cg-pages" type="text" bind:value={pages} /></Field>
			</div>
			<Field label="DOI" for="cg-doi" hint="Without the https://doi.org/ prefix"><input id="cg-doi" type="text" bind:value={doi} /></Field>
		{:else if type === 'book'}
			<Field label="Publisher" for="cg-publisher"><input id="cg-publisher" type="text" bind:value={publisher} /></Field>
		{:else}
			<div class="field-row">
				<Field label="Website name" for="cg-site"><input id="cg-site" type="text" bind:value={container} /></Field>
				<Field label="URL" for="cg-url"><input id="cg-url" type="url" bind:value={url} /></Field>
				<Field label="Date accessed" for="cg-accessed"><input id="cg-accessed" type="date" bind:value={accessed} /></Field>
			</div>
		{/if}
	</div>

	{#each citations as citation (citation.style)}
		<section class="card">
			<div class="head">
				<h2>{citation.style}</h2>
				<CopyButton value={plain(citation.text)} label="Copy" />
			</div>
			<p class="citation">
				{#each citation.text.split('*') as part, i (i)}
					{#if i % 2 === 1}<em>{part}</em>{:else}{part}{/if}
				{/each}
			</p>
		</section>
	{/each}

	<Note>
		Italics are shown here and preserved as plain text on copy — you will need to re-apply them in
		your document. Always check the output against your institution's guide: style manuals are
		revised, and departments frequently add their own requirements.
	</Note>

	{#snippet explainer()}
		<p>
			Every citation style encodes the same facts — who, what, where, when — in a different order,
			with different punctuation. The differences look arbitrary because they largely are: each
			developed within a discipline that prioritised different information.
		</p>
		<h3>What each style is optimised for</h3>
		<dl>
			<dt>APA</dt><dd>Psychology and the social sciences. Author and date come first, because recency matters when knowledge is cumulative.</dd>
			<dt>MLA</dt><dd>Humanities. Author and page come first; the date is de-emphasised because a 1920 reading of a text is not superseded by a 2020 one.</dd>
			<dt>Chicago</dt><dd>History and publishing. Offers both an author-date system and a notes-and-bibliography system with footnotes.</dd>
			<dt>Harvard</dt><dd>Common in the UK and Australia. Similar to APA, but with no single governing authority — institutional variants abound.</dd>
			<dt>IEEE</dt><dd>Engineering and computer science. Numbered references in order of appearance, keeping the prose uncluttered.</dd>
		</dl>
		<h3>Prefer a DOI to a URL</h3>
		<p>
			A DOI is a permanent identifier that survives a publisher's site reorganisation. URLs rot —
			studies of legal and academic citations find substantial link death within a decade. Where a DOI
			exists, every modern style prefers it.
		</p>
		<h3>Access dates</h3>
		<p>
			MLA and Harvard want an access date for web sources because pages change. APA dropped the
			requirement for stable content, keeping it only for pages designed to change — a wiki, a live
			dataset.
		</p>
	{/snippet}
</ToolShell>

<style>
	h2 {
		font-size: 1rem;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}
	.citation {
		font-size: 0.94rem;
		line-height: 1.7;
		padding: 0.75rem;
		background: var(--bg-sunken);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		text-indent: -1.5rem;
		padding-left: 2.25rem;
	}
</style>
