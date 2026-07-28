<script lang="ts">
	import { base } from '$app/paths';
	import { pageTitle } from '$lib/brand';
	import ToolCard from '$lib/components/ToolCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let filter = $state('');

	const shown = $derived(
		filter.trim()
			? data.tools.filter((tool) => {
					const q = filter.trim().toLowerCase();
					return (
						tool.title.toLowerCase().includes(q) ||
						tool.blurb.toLowerCase().includes(q) ||
						(tool.keywords ?? []).some((k) => k.toLowerCase().includes(q))
					);
				})
			: data.tools
	);
</script>

<svelte:head>
	<title>{pageTitle(`${data.category.name} tools`)}</title>
	<meta name="description" content={data.category.blurb} />
</svelte:head>

<header class="head">
	<nav class="crumbs" aria-label="Breadcrumb"><a href="{base}/">Tools</a></nav>
	<h1>{data.category.name}</h1>
	<p class="blurb">{data.category.blurb}</p>
	<label class="visually-hidden" for="cat-filter">Filter {data.category.name} tools</label>
	<input
		id="cat-filter"
		type="search"
		bind:value={filter}
		placeholder="Filter {data.tools.length} tools…"
		autocomplete="off"
	/>
</header>

{#if shown.length}
	<div class="grid">
		{#each shown as tool (tool.slug)}
			<ToolCard {tool} />
		{/each}
	</div>
{:else}
	<p class="muted empty">Nothing here matches “{filter}”. <a href="{base}/all">Search everything</a>.</p>
{/if}

<style>
	.head {
		margin-bottom: 1.75rem;
		max-width: 640px;
	}
	.crumbs {
		font-size: 0.83rem;
		margin-bottom: 0.5rem;
	}
	.crumbs a {
		color: var(--text-muted);
		text-decoration: none;
	}
	.crumbs a:hover {
		color: var(--accent);
	}
	.blurb {
		color: var(--text-muted);
		margin: 0.4rem 0 1.1rem;
	}
	.grid {
		display: grid;
		gap: 0.7rem;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
	}
	.empty {
		padding: 2rem 0;
	}
</style>
