<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		/** Text to place on the clipboard. A function defers reading until click. */
		value: string | (() => string);
		label?: string;
		/** Icon-only rendering for tight spots. */
		compact?: boolean;
		class?: string;
	}

	let { value, label = 'Copy', compact = false, class: className = '' }: Props = $props();

	let copied = $state(false);
	let failed = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	async function copy() {
		const text = typeof value === 'function' ? value() : value;
		clearTimeout(timer);
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			failed = false;
		} catch {
			// Clipboard access can be blocked; fall back to a selectable prompt.
			failed = true;
			copied = false;
		}
		timer = setTimeout(() => {
			copied = false;
			failed = false;
		}, 1800);
	}
</script>

<button
	type="button"
	class="btn btn-sm {className}"
	class:copied
	onclick={copy}
	aria-label={compact ? label : undefined}
	title={label}
>
	<Icon name={copied ? 'check' : 'copy'} size={15} />
	{#if !compact}
		<span>{copied ? 'Copied' : failed ? 'Press ⌘C' : label}</span>
	{/if}
</button>

<style>
	.copied {
		color: var(--positive);
		border-color: color-mix(in srgb, var(--positive) 45%, var(--border-strong));
	}
</style>
