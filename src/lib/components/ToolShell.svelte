<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { pageTitle } from '$lib/brand';
	import { page } from '$app/state';
	import { CATEGORY_BY_ID, TOOL_BY_PATH, toolPath, toolsIn, type Tool } from '$lib/catalog';
	import { prefs } from '$lib/state/prefs.svelte';
	import Icon from './Icon.svelte';
	import ToolCard from './ToolCard.svelte';

	interface Props {
		tool: Tool;
		/** Overrides the catalog title, for generated converter pages. */
		title?: string;
		blurb?: string;
		children: Snippet;
		/** "Show the work": formula, worked example, common mistakes. */
		explainer?: Snippet;
		/** Sources and last-updated stamps for data that can go stale. */
		sources?: Snippet;
	}

	let { tool, title, blurb, children, explainer, sources }: Props = $props();

	const path = $derived(toolPath(tool));
	const category = $derived(CATEGORY_BY_ID.get(tool.category));
	const heading = $derived(title ?? tool.title);
	const description = $derived(blurb ?? tool.blurb);

	const related = $derived.by(() => {
		const explicit = (tool.related ?? [])
			.map((p) => TOOL_BY_PATH.get(p))
			.filter((x): x is Tool => Boolean(x));
		const siblings = toolsIn(tool.category).filter(
			(x) => x.slug !== tool.slug && !explicit.some((e) => e.slug === x.slug)
		);
		return [...explicit, ...siblings].slice(0, 6);
	});

	let copiedLink = $state(false);

	onMount(() => prefs.noteVisit(path));

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			copiedLink = true;
			setTimeout(() => (copiedLink = false), 1800);
		} catch {
			/* clipboard blocked */
		}
	}
</script>

<svelte:head>
	<title>{pageTitle(heading)}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={heading} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
</svelte:head>

<article class="tool-page">
	<header class="head">
		<nav class="crumbs" aria-label="Breadcrumb">
			<a href="{base}/">Tools</a>
			<Icon name="chevron" size={13} />
			<a href="{base}/{tool.category}">{category?.name ?? tool.category}</a>
		</nav>

		<div class="title-row">
			<h1>{heading}</h1>
			<div class="actions no-print">
				<button
					type="button"
					class="btn btn-sm"
					class:active={prefs.isFavorite(path)}
					onclick={() => prefs.toggleFavorite(path)}
					aria-pressed={prefs.isFavorite(path)}
					title={prefs.isFavorite(path) ? 'Remove from favourites' : 'Save to favourites'}
				>
					<Icon name="star" size={15} fill={prefs.isFavorite(path)} />
					<span class="btn-text">{prefs.isFavorite(path) ? 'Saved' : 'Save'}</span>
				</button>
				<button type="button" class="btn btn-sm" onclick={copyLink} title="Copy a link to these exact inputs">
					<Icon name={copiedLink ? 'check' : 'link'} size={15} />
					<span class="btn-text">{copiedLink ? 'Copied' : 'Share'}</span>
				</button>
				<button
					type="button"
					class="btn btn-sm print-btn"
					onclick={() => browser && window.print()}
					title="Print this page"
				>
					<Icon name="print" size={15} />
				</button>
			</div>
		</div>

		<p class="blurb">{description}</p>

		{#if tool.disclaimer}
			<p class="disclaimer">
				<Icon name="info" size={14} />
				{tool.disclaimer}
			</p>
		{/if}
	</header>

	<div class="body">
		{@render children()}
	</div>

	{#if explainer}
		<section class="explainer" aria-labelledby="how-it-works">
			<h2 id="how-it-works">How it works</h2>
			<div class="prose">{@render explainer()}</div>
		</section>
	{/if}

	{#if sources}
		<section class="sources">
			<h2>Sources</h2>
			<div class="prose small">{@render sources()}</div>
		</section>
	{/if}

	{#if related.length}
		<section class="related no-print" aria-labelledby="related-heading">
			<h2 id="related-heading">Related tools</h2>
			<div class="related-grid">
				{#each related as item (item.slug)}
					<ToolCard tool={item} compact />
				{/each}
			</div>
		</section>
	{/if}

	<footer class="page-foot no-print">
		<a href="{base}/{tool.category}">← All {category?.name.toLowerCase() ?? 'tools'}</a>
		<a
			href="https://github.com/snipet/toolsdotseanfunk/issues/new?title={encodeURIComponent(
				`Problem with ${heading}`
			)}&body={encodeURIComponent(`Page: ${page.url.pathname}\n\nWhat looks wrong:\n`)}"
			rel="noreferrer noopener"
			target="_blank"
		>
			Report an error on this page
		</a>
	</footer>
</article>

<style>
	.tool-page {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	.crumbs {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.83rem;
		color: var(--text-muted);
		margin-bottom: 0.5rem;
	}
	.crumbs a {
		color: var(--text-muted);
		text-decoration: none;
	}
	.crumbs a:hover {
		color: var(--text);
		text-decoration: underline;
	}
	/* The category crumb carries the category's colour. */
	.crumbs a:last-child {
		color: var(--section);
	}

	.title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.actions {
		display: flex;
		gap: 0.4rem;
		flex: none;
	}
	.actions .active {
		color: var(--accent);
		border-color: var(--accent-border);
		background: var(--accent-soft);
	}

	.blurb {
		color: var(--text-muted);
		max-width: 68ch;
		margin-top: 0.4rem;
	}

	.disclaimer {
		display: flex;
		gap: 0.4rem;
		align-items: flex-start;
		margin-top: 0.7rem;
		font-size: 0.83rem;
		color: var(--warning);
		max-width: 70ch;
	}
	.disclaimer :global(svg) {
		flex: none;
		margin-top: 3px;
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.explainer,
	.sources,
	.related {
		border-top: 1px solid var(--border);
		padding-top: 1.5rem;
	}

	.explainer h2,
	.sources h2,
	.related h2 {
		margin-bottom: 0.85rem;
	}

	.related-grid {
		display: grid;
		gap: 0.65rem;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
	}

	.page-foot {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		font-size: 0.85rem;
		border-top: 1px solid var(--border);
		padding-top: 1.25rem;
	}
	.page-foot a {
		color: var(--text-muted);
		text-decoration: none;
	}
	.page-foot a:hover {
		color: var(--accent);
		text-decoration: underline;
	}

	@media (max-width: 560px) {
		.btn-text {
			display: none;
		}
		.print-btn {
			display: none;
		}
	}
</style>
