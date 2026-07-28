<script lang="ts">
	import type { Snippet } from 'svelte';
	import CopyButton from './CopyButton.svelte';

	interface Props {
		label: string;
		value: string;
		detail?: string;
		/** Emphasis: the headline answer on the page. */
		primary?: boolean;
		tone?: 'neutral' | 'positive' | 'negative' | 'warning';
		copyable?: boolean;
		children?: Snippet;
	}

	let {
		label,
		value,
		detail,
		primary = false,
		tone = 'neutral',
		copyable = true,
		children
	}: Props = $props();
</script>

<div class="result" class:primary data-tone={tone}>
	<div class="head">
		<span class="label">{label}</span>
		{#if copyable}
			<CopyButton {value} compact label="Copy result" class="copy no-print" />
		{/if}
	</div>
	<output class="value num">{value}</output>
	{#if detail}
		<p class="detail">{detail}</p>
	{/if}
	{@render children?.()}
</div>

<style>
	.result {
		background: var(--bg-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.85rem 1rem;
		min-width: 0;
	}

	.result.primary {
		background: var(--accent-soft);
		border-color: var(--accent-border);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.1rem;
		min-height: 24px;
	}

	.label {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.value {
		display: block;
		font-size: 1.35rem;
		font-weight: 620;
		letter-spacing: -0.02em;
		line-height: 1.25;
		word-break: break-word;
		font-variant-numeric: tabular-nums;
	}

	.primary .value {
		font-size: clamp(1.6rem, 1.1rem + 2vw, 2.2rem);
	}

	[data-tone='positive'] .value {
		color: var(--positive);
	}
	[data-tone='negative'] .value {
		color: var(--negative);
	}
	[data-tone='warning'] .value {
		color: var(--warning);
	}

	.detail {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin-top: 0.25rem;
	}

	:global(.result .copy) {
		opacity: 0;
		transition: opacity 0.12s ease;
	}
	.result:hover :global(.copy),
	.result:focus-within :global(.copy) {
		opacity: 1;
	}
	@media (hover: none) {
		:global(.result .copy) {
			opacity: 1;
		}
	}
</style>
