<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { CATEGORIES, TOOLS, toolsIn } from '$lib/catalog';
	import { searchTools } from '$lib/search';
	import { answer } from '$lib/omnibox';
	import ToolCard from '$lib/components/ToolCard.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let query = $state('');
	let input = $state<HTMLInputElement>();

	// Seeded from ?q= so the home page's example chips deep-link into a search.
	onMount(() => {
		const q = new URLSearchParams(window.location.search).get('q');
		if (q) query = q;
		input?.focus();
	});

	const answers = $derived(query.trim() ? answer(query) : []);
	const hits = $derived(query.trim() ? searchTools(query, 60) : []);
</script>

<svelte:head>
	<title>All {TOOLS.length} tools · The Everything Toolbox</title>
	<meta name="description" content="The complete index of every tool on the site." />
</svelte:head>

<header class="head">
	<h1>All {TOOLS.length} tools</h1>
	<p class="muted">
		Search by name, by task, or just ask a question — “3 tbsp to tsp” answers right here.
	</p>
	<label class="visually-hidden" for="all-search">Search all tools</label>
	<input
		id="all-search"
		bind:this={input}
		bind:value={query}
		type="search"
		placeholder="Search everything…"
		autocomplete="off"
		spellcheck="false"
	/>
</header>

{#if answers.length}
	<div class="answers">
		{#each answers as a (a.kind + a.value)}
			<div class="answer">
				<div class="answer-head">
					<span class="kind">{a.kind}</span>
					<CopyButton value={a.value} label="Copy" />
				</div>
				<p class="small muted">{a.question}</p>
				<p class="answer-value num">{a.value}</p>
				{#if a.detail}<p class="answer-detail">{a.detail}</p>{/if}
				<a href="{base}{a.href}">{a.hrefLabel} →</a>
			</div>
		{/each}
	</div>
{/if}

{#if query.trim()}
	<section>
		<h2 class="section-title">
			{hits.length}
			{hits.length === 1 ? 'tool' : 'tools'} matching “{query}”
		</h2>
		{#if hits.length}
			<div class="grid">
				{#each hits as hit (hit.path)}
					<ToolCard tool={hit.tool} showCategory />
				{/each}
			</div>
		{:else}
			<p class="muted">
				Nothing yet. <a
					href="https://github.com/snipet/toolsdotseanfunk/issues/new?title={encodeURIComponent(
						`Tool request: ${query}`
					)}"
					target="_blank"
					rel="noreferrer noopener">Request this tool</a
				> and it goes on the roadmap.
			</p>
		{/if}
	</section>
{:else}
	{#each CATEGORIES as category (category.id)}
		<section class="cat-block">
			<h2 class="section-title">
				<a href="{base}/{category.id}">{category.name}</a>
				<span class="count">{toolsIn(category.id).length}</span>
			</h2>
			<div class="grid">
				{#each toolsIn(category.id) as tool (tool.slug)}
					<ToolCard {tool} compact />
				{/each}
			</div>
		</section>
	{/each}
{/if}

<style>
	.head {
		max-width: 640px;
		margin-bottom: 2rem;
	}
	.head p {
		margin: 0.4rem 0 1.1rem;
	}

	.answers {
		display: grid;
		gap: 0.7rem;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		margin-bottom: 2rem;
	}

	.answer {
		background: var(--accent-soft);
		border: 1px solid var(--accent-border);
		border-radius: var(--radius);
		padding: 1rem;
	}

	.answer-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.2rem;
	}

	.kind {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--accent);
	}

	.answer-value {
		font-size: 1.6rem;
		font-weight: 620;
		letter-spacing: -0.02em;
		line-height: 1.2;
		word-break: break-word;
	}

	.answer-detail {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--text-muted);
		margin: 0.2rem 0 0.5rem;
	}

	.answer a {
		font-size: 0.85rem;
		font-weight: 550;
		text-decoration: none;
	}
	.answer a:hover {
		text-decoration: underline;
	}

	.cat-block + .cat-block {
		margin-top: 2.25rem;
	}

	.section-title {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 1.1rem;
		margin-bottom: 0.8rem;
	}
	.section-title a {
		text-decoration: none;
		color: var(--text);
	}
	.section-title a:hover {
		color: var(--accent);
	}
	.count {
		font-size: 0.8rem;
		color: var(--text-faint);
		font-weight: 450;
	}

	.grid {
		display: grid;
		gap: 0.6rem;
		grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
	}
</style>
