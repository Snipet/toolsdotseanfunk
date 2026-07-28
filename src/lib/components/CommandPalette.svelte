<script lang="ts">
	import { goto } from '$app/navigation';
	import { TOOL_BY_PATH, TOOLS, toolPath } from '$lib/catalog';
	import { searchTools } from '$lib/search';
	import { answer } from '$lib/omnibox';
	import { prefs } from '$lib/state/prefs.svelte';
	import Icon from './Icon.svelte';

	let open = $state(false);
	let query = $state('');
	let cursor = $state(0);
	let input = $state<HTMLInputElement>();
	let listEl = $state<HTMLElement>();

	const answers = $derived(query.trim() ? answer(query) : []);

	const results = $derived.by(() => {
		if (query.trim()) return searchTools(query, 40).map((h) => h.tool);
		// Empty query: favourites, then recents, then a sample of everything.
		const pinned = [...prefs.favorites, ...prefs.recents]
			.map((p) => TOOL_BY_PATH.get(p.replace(/^\//, '')))
			.filter((x) => x !== undefined);
		const seen = new Set(pinned.map(toolPath));
		return [...pinned, ...TOOLS.filter((x) => !seen.has(toolPath(x)))].slice(0, 40);
	});

	$effect(() => {
		void query;
		cursor = 0;
	});

	function toggle(next = !open) {
		open = next;
		if (open) {
			query = '';
			cursor = 0;
			queueMicrotask(() => input?.focus());
		}
	}

	function choose(index: number) {
		if (answers.length && index === 0) {
			void goto(answers[0].href);
		} else {
			const tool = results[answers.length ? index - 1 : index];
			if (tool) void goto(toolPath(tool));
		}
		open = false;
	}

	function onKeydown(event: KeyboardEvent) {
		const isToggle = (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);
		if (isToggle) {
			event.preventDefault();
			toggle();
			return;
		}
		// "/" opens the palette, unless the user is typing somewhere already.
		const target = event.target as HTMLElement | null;
		const typing =
			target &&
			(target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.tagName === 'SELECT' ||
				target.isContentEditable);
		if (!open && event.key === '/' && !typing) {
			event.preventDefault();
			toggle(true);
			return;
		}
		if (!open) return;

		const count = results.length + (answers.length ? 1 : 0);
		if (event.key === 'Escape') {
			event.preventDefault();
			open = false;
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			cursor = count ? (cursor + 1) % count : 0;
			scrollCursorIntoView();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			cursor = count ? (cursor - 1 + count) % count : 0;
			scrollCursorIntoView();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			choose(cursor);
		}
	}

	function scrollCursorIntoView() {
		queueMicrotask(() => {
			listEl?.querySelector('[data-cursor="true"]')?.scrollIntoView({ block: 'nearest' });
		});
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="scrim" onclick={() => (open = false)}></div>
	<div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
		<div class="search">
			<Icon name="search" size={17} />
			<input
				bind:this={input}
				bind:value={query}
				type="text"
				placeholder="Search every tool, or ask a question…"
				aria-label="Search tools"
				autocomplete="off"
				spellcheck="false"
			/>
			<kbd>esc</kbd>
		</div>

		<div class="list" bind:this={listEl}>
			{#if answers.length}
				<button
					type="button"
					class="item answer"
					class:cursor={cursor === 0}
					data-cursor={cursor === 0}
					onclick={() => choose(0)}
					onmouseenter={() => (cursor = 0)}
				>
					<span class="answer-value num">{answers[0].value}</span>
					<span class="answer-kind">{answers[0].kind}</span>
				</button>
			{/if}

			{#if !query.trim() && (prefs.favorites.length || prefs.recents.length)}
				<p class="group">Your tools</p>
			{/if}

			{#each results as tool, i (toolPath(tool))}
				{@const index = answers.length ? i + 1 : i}
				<button
					type="button"
					class="item"
					class:cursor={cursor === index}
					data-cursor={cursor === index}
					onclick={() => choose(index)}
					onmouseenter={() => (cursor = index)}
				>
					<span class="title">{tool.title}</span>
					<span class="path">{toolPath(tool)}</span>
				</button>
			{:else}
				{#if !answers.length}
					<p class="empty">Nothing matches “{query}”.</p>
				{/if}
			{/each}
		</div>

		<div class="foot">
			<span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
			<span><kbd>↵</kbd> open</span>
			<span><kbd>/</kbd> or <kbd>⌘</kbd><kbd>K</kbd> anywhere</span>
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 0.35);
		z-index: 90;
		backdrop-filter: blur(2px);
	}

	.palette {
		position: fixed;
		top: 12vh;
		left: 50%;
		transform: translateX(-50%);
		width: min(620px, calc(100vw - 2rem));
		max-height: 70vh;
		display: flex;
		flex-direction: column;
		background: var(--bg-raised);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		z-index: 100;
		overflow: hidden;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0 0.9rem;
		border-bottom: 1px solid var(--border);
	}
	.search :global(svg) {
		color: var(--text-faint);
		flex: none;
	}
	.search input {
		border: none !important;
		background: transparent !important;
		box-shadow: none !important;
		padding: 0.9rem 0 !important;
		font-size: 1rem;
	}

	.list {
		overflow-y: auto;
		padding: 0.35rem;
		flex: 1;
	}

	.item {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		padding: 0.5rem 0.65rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.92rem;
	}
	.item.cursor {
		background: var(--bg-hover);
	}

	.title {
		font-weight: 500;
	}

	.path {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--text-faint);
		flex: none;
	}

	.answer {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.1rem;
		background: var(--accent-soft);
		margin-bottom: 0.35rem;
	}
	.answer-value {
		font-size: 1.2rem;
		font-weight: 620;
	}
	.answer-kind {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		font-weight: 700;
		color: var(--accent);
	}

	.group {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-faint);
		padding: 0.5rem 0.65rem 0.2rem;
	}

	.empty {
		padding: 1.25rem 0.65rem;
		color: var(--text-muted);
		font-size: 0.9rem;
		text-align: center;
	}

	.foot {
		display: flex;
		gap: 1rem;
		padding: 0.5rem 0.9rem;
		border-top: 1px solid var(--border);
		font-size: 0.75rem;
		color: var(--text-faint);
		background: var(--bg-sunken);
		flex-wrap: wrap;
	}

	kbd {
		background: var(--bg-raised);
		border: 1px solid var(--border-strong);
		border-bottom-width: 2px;
		border-radius: 4px;
		padding: 0.05em 0.35em;
		font-size: 0.9em;
		color: var(--text-muted);
	}
</style>
