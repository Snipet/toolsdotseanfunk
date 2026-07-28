<script lang="ts">
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let source = $state(`# The Everything Toolbox

A **small** but _complete_ Markdown renderer, written from scratch.

## What it supports

- Headings, lists and blockquotes
- \`inline code\` and fenced blocks
- [Links](https://example.com) and images
- Tables and horizontal rules

1. Ordered lists work too
2. With nested content

> Everything runs in your browser.
> Nothing is uploaded.

\`\`\`js
const greeting = 'hello';
console.log(greeting);
\`\`\`

| Tool | Category |
| --- | --- |
| QR code | Developer |
| Tip calculator | Finance |

---

That is the whole demo.`);

	/** Escape first, so no input can inject markup into the preview. */
	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function inline(text: string): string {
		return escapeHtml(text)
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) =>
				/^https?:\/\//.test(src) ? `<img src="${src}" alt="${alt}" />` : `[${alt}]`
			)
			.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) =>
				// Only http(s) and mailto links render as links; anything else
				// (javascript:, data:) becomes plain text.
				/^(https?:\/\/|mailto:|#|\/)/.test(href)
					? `<a href="${href}" rel="noreferrer noopener">${label}</a>`
					: `${label} (${href})`
			)
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/__([^_]+)__/g, '<strong>$1</strong>')
			.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
			.replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>')
			.replace(/~~([^~]+)~~/g, '<del>$1</del>');
	}

	const html = $derived.by(() => {
		const lines = source.split('\n');
		const out: string[] = [];
		let inCode = false;
		let codeLanguage = '';
		let codeBuffer: string[] = [];
		let listType: 'ul' | 'ol' | null = null;
		let inQuote = false;
		let tableBuffer: string[] = [];

		const closeList = () => {
			if (listType) {
				out.push(`</${listType}>`);
				listType = null;
			}
		};
		const closeQuote = () => {
			if (inQuote) {
				out.push('</blockquote>');
				inQuote = false;
			}
		};
		const flushTable = () => {
			if (!tableBuffer.length) return;
			const rows = tableBuffer.map((row) =>
				row.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())
			);
			// A separator row of dashes marks the preceding row as the header.
			const hasHeader = rows.length > 1 && /^[\s|:-]+$/.test(tableBuffer[1]);
			out.push('<table>');
			if (hasHeader) {
				out.push('<thead><tr>' + rows[0].map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead>');
				out.push('<tbody>');
				for (const row of rows.slice(2)) {
					out.push('<tr>' + row.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
				}
				out.push('</tbody>');
			} else {
				out.push('<tbody>');
				for (const row of rows) out.push('<tr>' + row.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
				out.push('</tbody>');
			}
			out.push('</table>');
			tableBuffer = [];
		};

		for (const raw of lines) {
			const line = raw.replace(/\s+$/, '');

			const fence = /^```(\w*)/.exec(line);
			if (fence) {
				if (inCode) {
					out.push(
						`<pre><code${codeLanguage ? ` class="language-${codeLanguage}"` : ''}>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`
					);
					codeBuffer = [];
					inCode = false;
				} else {
					closeList();
					closeQuote();
					flushTable();
					inCode = true;
					codeLanguage = fence[1];
				}
				continue;
			}
			if (inCode) {
				codeBuffer.push(raw);
				continue;
			}

			if (line.includes('|') && line.trim().startsWith('|')) {
				closeList();
				closeQuote();
				tableBuffer.push(line.trim());
				continue;
			}
			flushTable();

			if (!line.trim()) {
				closeList();
				closeQuote();
				continue;
			}

			const heading = /^(#{1,6})\s+(.*)$/.exec(line);
			if (heading) {
				closeList();
				closeQuote();
				out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
				continue;
			}

			if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
				closeList();
				closeQuote();
				out.push('<hr />');
				continue;
			}

			const quote = /^>\s?(.*)$/.exec(line);
			if (quote) {
				closeList();
				if (!inQuote) {
					out.push('<blockquote>');
					inQuote = true;
				}
				out.push(`<p>${inline(quote[1])}</p>`);
				continue;
			}
			closeQuote();

			const unordered = /^\s*[-*+]\s+(.*)$/.exec(line);
			if (unordered) {
				if (listType !== 'ul') {
					closeList();
					out.push('<ul>');
					listType = 'ul';
				}
				out.push(`<li>${inline(unordered[1])}</li>`);
				continue;
			}

			const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
			if (ordered) {
				if (listType !== 'ol') {
					closeList();
					out.push('<ol>');
					listType = 'ol';
				}
				out.push(`<li>${inline(ordered[1])}</li>`);
				continue;
			}

			closeList();
			out.push(`<p>${inline(line)}</p>`);
		}

		closeList();
		closeQuote();
		flushTable();
		if (inCode && codeBuffer.length) {
			out.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
		}

		return out.join('\n');
	});
</script>

<ToolShell {tool}>
	<div class="tool-card-grid">
		<div class="card">
			<label for="md-source">Markdown</label>
			<textarea id="md-source" bind:value={source} rows="24" spellcheck="false" class="mono"></textarea>
		</div>
		<div class="card">
			<div class="out-head">
				<span class="label-like">Preview</span>
				<CopyButton value={() => html} label="Copy HTML" />
			</div>
			<div class="rendered">
				{@html html}
			</div>
		</div>
	</div>

	<section class="card">
		<div class="out-head">
			<label for="md-html">Generated HTML</label>
			<CopyButton value={() => html} label="Copy" />
		</div>
		<textarea id="md-html" value={html} rows="10" readonly spellcheck="false" class="mono"></textarea>
	</section>

	<Note>
		All input is HTML-escaped before any Markdown syntax is applied, and only
		<code>http</code>, <code>https</code>, <code>mailto</code> and relative links are rendered as
		links — so pasting untrusted Markdown here cannot inject scripts.
	</Note>

	{#snippet explainer()}
		<p>
			Markdown was created by John Gruber in 2004 with a simple goal: a plain-text format that reads
			naturally as-is and converts cleanly to HTML. Its success is why it now underpins README files,
			documentation sites, chat apps and note-taking tools.
		</p>
		<h3>What this renderer covers</h3>
		<p>
			Headings, bold, italic, strikethrough, inline and fenced code, links, images, ordered and
			unordered lists, blockquotes, horizontal rules and pipe tables. That is the intersection of
			CommonMark and GitHub Flavored Markdown that people actually use day to day.
		</p>
		<h3>What it does not</h3>
		<p>
			Nested lists, reference-style links, footnotes, task lists and inline HTML are not supported.
			A full CommonMark implementation is a genuinely large piece of software — the specification runs
			to hundreds of edge cases — and this is deliberately a preview tool, not a publishing pipeline.
		</p>
		<h3>Escaping order matters</h3>
		<p>
			The escaping happens <em>before</em> the Markdown patterns are applied, not after. Doing it the
			other way round would escape the tags the renderer just produced. Getting this backwards is the
			classic way homegrown Markdown renderers end up with cross-site scripting holes.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 460px;
		font-size: 0.86rem;
	}
	.out-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.3rem;
	}
	.out-head label,
	.label-like {
		margin-bottom: 0;
		font-size: 0.82rem;
		font-weight: 550;
		color: var(--text-muted);
	}
	.rendered {
		min-height: 460px;
		max-height: 620px;
		overflow-y: auto;
		padding: 0.75rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: 0.94rem;
		line-height: 1.65;
	}
	.rendered :global(h1) {
		font-size: 1.5rem;
		margin: 0.75rem 0 0.5rem;
	}
	.rendered :global(h2) {
		font-size: 1.2rem;
		margin: 1rem 0 0.4rem;
	}
	.rendered :global(h3) {
		font-size: 1.02rem;
		margin: 0.85rem 0 0.35rem;
	}
	.rendered :global(p) {
		margin: 0.6rem 0;
	}
	.rendered :global(ul),
	.rendered :global(ol) {
		margin: 0.6rem 0;
		padding-left: 1.4rem;
	}
	.rendered :global(li) {
		margin: 0.2rem 0;
	}
	.rendered :global(blockquote) {
		border-left: 3px solid var(--accent);
		padding-left: 0.85rem;
		margin: 0.75rem 0;
		color: var(--text-muted);
	}
	.rendered :global(pre) {
		background: var(--bg-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.7rem;
		overflow-x: auto;
		margin: 0.75rem 0;
	}
	.rendered :global(code) {
		background: var(--bg-raised);
		border: 1px solid var(--border);
		border-radius: 3px;
		padding: 0.05em 0.3em;
		font-size: 0.88em;
	}
	.rendered :global(pre code) {
		background: none;
		border: none;
		padding: 0;
	}
	.rendered :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: 0.75rem 0;
		font-size: 0.88rem;
	}
	.rendered :global(th),
	.rendered :global(td) {
		border: 1px solid var(--border);
		padding: 0.35rem 0.6rem;
		text-align: left;
	}
	.rendered :global(th) {
		background: var(--bg-raised);
		font-weight: 600;
	}
	.rendered :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 1rem 0;
	}
	.rendered :global(img) {
		max-width: 100%;
		border-radius: var(--radius-sm);
	}
</style>
