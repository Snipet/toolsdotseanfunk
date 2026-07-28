<script lang="ts">
	import { CASE_TRANSFORMS } from '$lib/text/text';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	let text = $state('the quick brown fox jumps over the lazy dog');

	const results = $derived(
		Object.entries(CASE_TRANSFORMS).map(([name, fn]) => {
			try {
				return { name, value: fn(text) };
			} catch {
				return { name, value: '' };
			}
		})
	);
</script>

<ToolShell {tool}>
	<div class="card">
		<label for="cc-text">Your text</label>
		<textarea id="cc-text" bind:value={text} rows="4" spellcheck="false"></textarea>
	</div>

	<div class="cases">
		{#each results as result (result.name)}
			<div class="case">
				<div class="case-head">
					<span class="case-name">{result.name}</span>
					<CopyButton value={result.value} compact label="Copy {result.name}" />
				</div>
				<output class="case-value">{result.value || '—'}</output>
			</div>
		{/each}
	</div>

	{#snippet explainer()}
		<p>
			Case conventions are not cosmetic — in code they carry meaning, and in prose they follow style
			guides that genuinely disagree with each other.
		</p>
		<h3>Programming cases</h3>
		<dl>
			<dt>camelCase</dt><dd>JavaScript and Java variables and functions.</dd>
			<dt>PascalCase</dt><dd>Class and type names in most languages; components in React and Svelte.</dd>
			<dt>snake_case</dt><dd>Python and Ruby variables, and SQL columns.</dd>
			<dt>kebab-case</dt><dd>URLs, CSS classes and custom HTML elements — which require a hyphen.</dd>
			<dt>CONSTANT_CASE</dt><dd>Environment variables and compile-time constants.</dd>
		</dl>
		<h3>Title case is not one rule</h3>
		<p>
			“Smart Title Case” above keeps short prepositions, articles and conjunctions lowercase unless
			they are the first or last word — the common denominator of the AP, Chicago and MLA styles.
			They differ in the details: Chicago lowercases all prepositions regardless of length, AP
			capitalises those of four letters or more. When it matters, check the specific guide.
		</p>
		<h3>Acronym handling</h3>
		<p>
			The tokeniser splits <code>HTTPServerError</code> into HTTP, Server and Error rather than
			mangling it into <code>h-t-t-p-server-error</code>, which is the case most naive converters get
			wrong.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 90px;
	}
	.cases {
		display: grid;
		gap: 0.6rem;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	}
	.case {
		background: var(--bg-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.7rem 0.85rem;
	}
	.case-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}
	.case-name {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 700;
		color: var(--text-muted);
	}
	.case-value {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.86rem;
		word-break: break-word;
		line-height: 1.5;
	}
</style>
