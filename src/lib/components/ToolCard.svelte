<script lang="ts">
	import { base } from '$app/paths';
	import { CATEGORY_BY_ID, toolPath, type Tool } from '$lib/catalog';

	interface Props {
		tool: Tool;
		compact?: boolean;
		/** Show which category the tool belongs to (used in mixed listings). */
		showCategory?: boolean;
	}

	let { tool, compact = false, showCategory = false }: Props = $props();

	const href = $derived(base + toolPath(tool));
	const category = $derived(CATEGORY_BY_ID.get(tool.category));
</script>

<a class="tool-card" class:compact {href}>
	<span class="title">{tool.title}</span>
	{#if !compact}
		<span class="blurb">{tool.blurb}</span>
	{/if}
	{#if showCategory && category}
		<span class="cat">{category.name}</span>
	{/if}
</a>

<style>
	.tool-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.85rem 0.95rem;
		background: var(--bg-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		text-decoration: none;
		color: var(--text);
		transition: border-color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease;
		height: 100%;
	}

	.tool-card:hover {
		border-color: var(--accent-border);
		box-shadow: var(--shadow-sm);
		transform: translateY(-1px);
		color: var(--text);
	}

	.title {
		font-weight: 590;
		font-size: 0.95rem;
		letter-spacing: -0.005em;
	}

	.tool-card:hover .title {
		color: var(--accent);
	}

	.blurb {
		font-size: 0.84rem;
		color: var(--text-muted);
		line-height: 1.45;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.compact .title {
		font-size: 0.9rem;
	}

	.cat {
		font-size: 0.72rem;
		color: var(--text-faint);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 600;
		margin-top: auto;
		padding-top: 0.35rem;
	}
</style>
