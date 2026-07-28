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

<!-- `data-section` is set per card, so each one hovers in its own category's colour. -->
<a class="tool-card" class:compact {href} data-section={tool.category}>
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
		background: var(--surface-1);
		border: 1px solid var(--hairline);
		border-radius: var(--radius-3);
		text-decoration: none;
		color: var(--text);
		transition:
			border-color var(--dur-fast) var(--ease-out),
			box-shadow var(--dur-fast) var(--ease-out),
			transform var(--dur-fast) var(--ease-out);
		height: 100%;
	}

	/* The category's colour picks the card up on hover, the same way the sibling
	   site's cards answer to the section. */
	.tool-card:hover {
		border-color: var(--section);
		box-shadow: var(--shadow-3);
		transform: translateY(-2px);
		color: var(--text);
	}

	.title {
		font-weight: 590;
		font-size: 0.95rem;
		letter-spacing: -0.005em;
	}

	.tool-card:hover .title {
		color: var(--text);
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
