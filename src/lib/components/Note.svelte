<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		tone?: 'info' | 'warning';
		children: Snippet;
	}

	let { tone = 'info', children }: Props = $props();
</script>

<aside class="note" data-tone={tone}>
	<Icon name={tone === 'warning' ? 'warning' : 'info'} size={16} />
	<div><!-- prettier-ignore -->{@render children()}</div>
</aside>

<style>
	.note {
		display: flex;
		gap: 0.55rem;
		align-items: flex-start;
		padding: 0.7rem 0.85rem;
		border-radius: var(--radius-sm);
		font-size: 0.87rem;
		line-height: 1.5;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		color: var(--text-muted);
	}
	.note :global(svg) {
		flex: none;
		margin-top: 2px;
	}
	.note[data-tone='warning'] {
		background: color-mix(in srgb, var(--warning) 9%, var(--bg-raised));
		border-color: color-mix(in srgb, var(--warning) 30%, var(--border));
		color: var(--text);
	}
	.note :global(p + p) {
		margin-top: 0.5rem;
	}
	.note :global(strong) {
		color: var(--text);
	}
</style>
