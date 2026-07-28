<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		/** Small helper text under the control. */
		hint?: string;
		/** Set when the current input is invalid; announced to screen readers. */
		error?: string;
		for?: string;
		children: Snippet;
	}

	let { label, hint, error, for: htmlFor, children }: Props = $props();
</script>

<div class="field">
	<label for={htmlFor}>{label}</label>
	{@render children()}
	{#if error}
		<p class="msg error" role="alert">{error}</p>
	{:else if hint}
		<p class="msg">{hint}</p>
	{/if}
</div>

<style>
	.field {
		min-width: 0;
	}
	.msg {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin-top: 0.25rem;
	}
	.error {
		color: var(--negative);
	}
</style>
