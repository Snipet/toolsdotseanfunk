<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { answer, type Answer } from '$lib/omnibox';
	import { searchTools, type SearchHit } from '$lib/search';
	import { CATEGORY_BY_ID } from '$lib/catalog';
	import CopyButton from './CopyButton.svelte';
	import Icon from './Icon.svelte';

	interface Props {
		variant?: 'hero' | 'header';
		placeholder?: string;
		/** Focus the field on mount. Applied imperatively, not via the attribute. */
		autofocus?: boolean;
	}

	let {
		variant = 'hero',
		placeholder = 'Try “3 tbsp to tsp”, “15% of 80”, “days until Dec 25”…',
		autofocus = false
	}: Props = $props();

	let query = $state('');
	let open = $state(false);
	let cursor = $state(-1);
	let input = $state<HTMLInputElement>();
	let root = $state<HTMLElement>();

	onMount(() => {
		if (autofocus) input?.focus();
	});

	const answers = $derived<Answer[]>(query.trim() ? answer(query) : []);
	const hits = $derived<SearchHit[]>(query.trim() ? searchTools(query, answers.length ? 6 : 10) : []);
	const total = $derived(answers.length + hits.length);
	const showPanel = $derived(open && query.trim().length > 0);

	// Reset the highlight whenever the result set changes underneath it.
	$effect(() => {
		void query;
		cursor = -1;
	});

	function activate(index: number) {
		if (index < answers.length) {
			void goto(base + answers[index].href);
		} else {
			const hit = hits[index - answers.length];
			if (hit) void goto(base + hit.path);
		}
		close();
	}

	function close() {
		open = false;
		cursor = -1;
		input?.blur();
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (query) query = '';
			else close();
			return;
		}
		if (!showPanel) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			cursor = total === 0 ? -1 : (cursor + 1) % total;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			cursor = total === 0 ? -1 : (cursor - 1 + total) % total;
		} else if (event.key === 'Enter') {
			event.preventDefault();
			// Enter with nothing highlighted follows the first result, which is
			// the instant answer when there is one.
			if (total > 0) activate(cursor >= 0 ? cursor : 0);
		}
	}

	function onWindowPointerDown(event: PointerEvent) {
		if (root && !root.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

<div class="omnibox" class:hero={variant === 'hero'} bind:this={root}>
	<div class="input-wrap">
		<Icon name="search" size={variant === 'hero' ? 20 : 16} />
		<input
			bind:this={input}
			bind:value={query}
			type="search"
			role="combobox"
			aria-expanded={showPanel}
			aria-controls="omnibox-results"
			aria-autocomplete="list"
			aria-label="Search tools or ask a question"
			autocomplete="off"
			spellcheck="false"
			{placeholder}
			onfocus={() => (open = true)}
			oninput={() => (open = true)}
			onkeydown={onKeydown}
		/>
		{#if query}
			<button type="button" class="clear" onclick={() => { query = ''; input?.focus(); }} aria-label="Clear search">
				<Icon name="close" size={15} />
			</button>
		{/if}
	</div>

	{#if showPanel}
		<div class="panel" id="omnibox-results" role="listbox">
			{#each answers as a, i (a.kind + a.value)}
				<div
					class="answer"
					class:cursor={cursor === i}
					role="option"
					aria-selected={cursor === i}
					tabindex="-1"
				>
					<div class="answer-head">
						<span class="kind">{a.kind}</span>
						<CopyButton value={a.value} compact label="Copy answer" />
					</div>
					<p class="question">{a.question}</p>
					<p class="answer-value num">{a.value}</p>
					{#if a.detail}
						<p class="answer-detail">{a.detail}</p>
					{/if}
					<a class="answer-link" href="{base}{a.href}" onclick={close}>
						{a.hrefLabel}
						<Icon name="chevron" size={13} />
					</a>
				</div>
			{/each}

			{#if hits.length}
				{#if answers.length}
					<p class="section-label">Tools</p>
				{/if}
				{#each hits as hit, i (hit.path)}
					{@const index = answers.length + i}
					<a
						class="hit"
						class:cursor={cursor === index}
						href="{base}{hit.path}"
						role="option"
						aria-selected={cursor === index}
						onclick={close}
						onmouseenter={() => (cursor = index)}
					>
						<span class="hit-title">{hit.tool.title}</span>
						<span class="hit-cat">{CATEGORY_BY_ID.get(hit.tool.category)?.name}</span>
					</a>
				{/each}
			{:else if !answers.length}
				<p class="empty">
					No tool matches “{query}”. <a href="{base}/all">Browse everything</a> or
					<a
						href="https://github.com/snipet/toolsdotseanfunk/issues/new?title={encodeURIComponent(
							`Tool request: ${query}`
						)}"
						target="_blank"
						rel="noreferrer noopener">request it</a
					>.
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.omnibox {
		position: relative;
		width: 100%;
	}

	.input-wrap {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0 0.7rem;
		background: var(--bg-raised);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		transition: border-color 0.12s ease, box-shadow 0.12s ease;
	}
	.input-wrap:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
	}
	.input-wrap :global(svg) {
		color: var(--text-faint);
		flex: none;
	}

	.hero .input-wrap {
		padding: 0.25rem 0.9rem;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow);
	}

	input {
		border: none !important;
		background: transparent !important;
		box-shadow: none !important;
		padding: 0.55rem 0 !important;
		min-height: 42px;
	}
	.hero input {
		font-size: 1.1rem;
		min-height: 54px;
	}
	input::-webkit-search-cancel-button {
		display: none;
	}

	.clear {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: var(--text-faint);
		display: flex;
		border-radius: 4px;
	}
	.clear:hover {
		color: var(--text);
		background: var(--bg-hover);
	}

	.panel {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		z-index: 60;
		background: var(--bg-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		max-height: min(70vh, 560px);
		overflow-y: auto;
		text-align: left;
	}

	.answer {
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--border);
		background: var(--accent-soft);
	}
	.answer.cursor {
		box-shadow: inset 3px 0 0 var(--accent);
	}

	.answer-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.kind {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--accent);
	}

	.question {
		font-size: 0.82rem;
		color: var(--text-muted);
	}

	.answer-value {
		font-size: 1.5rem;
		font-weight: 620;
		letter-spacing: -0.02em;
		line-height: 1.25;
		margin-top: 0.1rem;
		word-break: break-word;
	}

	.answer-detail {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin-top: 0.2rem;
		font-family: var(--font-mono);
	}

	.answer-link {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.82rem;
		font-weight: 550;
		margin-top: 0.5rem;
		text-decoration: none;
	}
	.answer-link:hover {
		text-decoration: underline;
	}

	.section-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-faint);
		padding: 0.6rem 1rem 0.25rem;
	}

	.hit {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.55rem 1rem;
		text-decoration: none;
		color: var(--text);
	}
	.hit.cursor,
	.hit:hover {
		background: var(--bg-hover);
		color: var(--text);
	}

	.hit-title {
		font-size: 0.92rem;
		font-weight: 500;
	}

	.hit-cat {
		font-size: 0.75rem;
		color: var(--text-faint);
		flex: none;
	}

	.empty {
		padding: 1rem;
		font-size: 0.88rem;
		color: var(--text-muted);
	}
</style>
