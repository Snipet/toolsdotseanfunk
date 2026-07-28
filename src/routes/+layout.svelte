<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { BRAND, TAGLINE } from '$lib/brand';
	import { CATEGORIES, CATEGORY_BY_ID } from '$lib/catalog';
	import { prefs } from '$lib/state/prefs.svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import Omnibox from '$lib/components/Omnibox.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Wordmark from '$lib/components/Wordmark.svelte';

	let { children } = $props();

	const path = $derived(page.url.pathname.slice(base.length) || '/');
	const isHome = $derived(path === '/');

	/**
	 * The category owns the chrome's colour. The first path segment is the
	 * category on every tool and category page; everywhere else falls back to the
	 * accent, which is what `--section` already is.
	 */
	const section = $derived.by(() => {
		const first = path.split('/').filter(Boolean)[0];
		return first && CATEGORY_BY_ID.has(first) ? first : undefined;
	});

	// The body's wash reads `--section` from the root, so it has to live there.
	$effect(() => {
		const root = document.documentElement;
		if (section) root.setAttribute('data-section', section);
		else root.removeAttribute('data-section');
	});
	let navOpen = $state(false);

	const themeIcon = $derived(
		prefs.theme === 'light' ? 'sun' : prefs.theme === 'dark' ? 'moon' : 'monitor'
	);

	onMount(() => prefs.load());

	// Close the mobile nav whenever the route changes.
	$effect(() => {
		void page.url.pathname;
		navOpen = false;
	});
</script>

<a class="skip" href="#main">Skip to content</a>

<header class="site-header">
	<div class="bar">
		<a class="brand" href="{base}/" aria-label="{BRAND} — home">
			<BrandMark />
			<Wordmark size="md" sectioned />
		</a>

		{#if !isHome}
			<div class="header-search">
				<Omnibox variant="header" placeholder="Search or ask…" />
			</div>
		{/if}

		<nav class="primary" aria-label="Main">
			<a href="{base}/all">All tools</a>
			<a href="{base}/about">About</a>
		</nav>

		<div class="header-actions">
			<button
				type="button"
				class="btn btn-sm btn-ghost"
				onclick={() => prefs.cycleTheme()}
				title="Theme: {prefs.theme}"
				aria-label="Switch theme (currently {prefs.theme})"
			>
				<Icon name={themeIcon} size={17} />
			</button>
			<button
				type="button"
				class="btn btn-sm nav-toggle"
				onclick={() => (navOpen = !navOpen)}
				aria-expanded={navOpen}
				aria-label="Categories"
			>
				<Icon name={navOpen ? 'close' : 'grid'} size={17} />
			</button>
		</div>
	</div>

	{#if navOpen}
		<nav class="drawer" aria-label="Categories">
			{#each CATEGORIES as category (category.id)}
				<a href="{base}/{category.id}" data-section={category.id}>{category.name}</a>
			{/each}
			<a href="{base}/all">Everything</a>
			<a href="{base}/about">About</a>
		</nav>
	{/if}
</header>

<main id="main">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="foot-inner">
		<div class="foot-brand">
			<p class="foot-title"><Wordmark size="sm" /></p>
			<p class="small muted">
				{TAGLINE} Every tool runs in your browser — nothing you type or upload is sent to a server.
			</p>
		</div>
		<nav class="foot-cats" aria-label="Categories">
			{#each CATEGORIES as category (category.id)}
				<a href="{base}/{category.id}" data-section={category.id}>{category.name}</a>
			{/each}
		</nav>
	</div>
	<div class="foot-legal">
		<span class="small muted">
			Health, finance and legal tools are educational — not professional advice.
		</span>
		<a class="small" href="{base}/about">About &amp; sources</a>
	</div>
</footer>

<CommandPalette />

<style>
	.skip {
		position: absolute;
		left: -9999px;
		top: 0;
		z-index: 200;
		background: var(--accent);
		color: var(--accent-contrast);
		font-weight: 600;
		padding: 0.6rem 1rem;
		border-radius: 0 0 var(--radius-2) 0;
	}
	.skip:focus {
		left: 0;
	}

	.site-header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: color-mix(in oklab, var(--bg) 88%, transparent);
		backdrop-filter: blur(14px) saturate(1.4);
		border-bottom: 1px solid var(--hairline);
		/* The category colour bleeds into the header's edge, so where you are is
		   legible before you read a label. */
		box-shadow: inset 0 -1px 0 var(--section-edge);
	}

	.bar {
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 0.55rem 1.25rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--text);
		flex: none;
	}

	.header-search {
		flex: 1;
		max-width: 460px;
		margin: 0 auto;
	}

	.primary {
		display: flex;
		gap: 1rem;
		margin-left: auto;
		font-size: 0.9rem;
	}
	.primary a {
		color: var(--text-muted);
		text-decoration: none;
		font-weight: 500;
	}
	.primary a:hover {
		color: var(--text);
	}

	.header-actions {
		display: flex;
		gap: 0.25rem;
		flex: none;
	}

	.drawer {
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 0.25rem 1.25rem 0.9rem;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.15rem;
	}
	.drawer a {
		padding: 0.45rem 0.6rem;
		border-radius: var(--radius-sm);
		text-decoration: none;
		color: var(--text);
		font-size: 0.9rem;
	}
	.drawer a:hover {
		background: var(--surface-2);
		box-shadow: inset 2px 0 0 var(--section);
	}

	main {
		flex: 1;
		width: 100%;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 2rem 1.25rem 4rem;
	}

	.site-footer {
		border-top: 1px solid var(--hairline);
		background: color-mix(in oklab, var(--bg-deep) 60%, transparent);
		margin-top: auto;
	}

	.foot-inner {
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 2rem 1.25rem 1.5rem;
		display: grid;
		gap: 2rem;
		grid-template-columns: minmax(240px, 1fr) 2fr;
	}

	.foot-title {
		margin-bottom: 0.45rem;
	}

	.foot-brand p.small {
		max-width: 40ch;
	}

	.foot-cats {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.35rem 1rem;
		align-content: start;
	}
	.foot-cats a {
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.88rem;
	}
	.foot-cats a:hover {
		color: var(--section);
	}

	.foot-legal {
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 1rem 1.25rem 2rem;
		border-top: 1px solid var(--border);
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	@media (max-width: 860px) {
		.primary {
			display: none;
		}
		.header-search {
			max-width: none;
		}
		/* Narrow screens keep the mark and drop the name, so the search box wins
		   the space. The selector reaches into the Wordmark component. */
		.brand :global(.wordmark) {
			display: none;
		}
		.foot-inner {
			grid-template-columns: 1fr;
		}
	}

	@media (min-width: 861px) {
		.nav-toggle {
			display: none;
		}
	}
</style>
