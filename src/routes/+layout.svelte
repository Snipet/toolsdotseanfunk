<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { CATEGORIES } from '$lib/catalog';
	import { prefs } from '$lib/state/prefs.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import Omnibox from '$lib/components/Omnibox.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { children } = $props();

	const isHome = $derived(page.url.pathname === '/');
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
		<a class="brand" href="/" aria-label="The Everything Toolbox — home">
			<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
				<rect x="2.5" y="7.5" width="19" height="12" rx="2.5" fill="var(--accent)" />
				<path
					d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5"
					fill="none"
					stroke="var(--accent)"
					stroke-width="2"
				/>
				<path d="M2.5 12.5h19" stroke="var(--bg)" stroke-width="1.6" />
				<rect x="10" y="10.6" width="4" height="3.8" rx="1" fill="var(--bg)" />
			</svg>
			<span class="wordmark">Everything <strong>Toolbox</strong></span>
		</a>

		{#if !isHome}
			<div class="header-search">
				<Omnibox variant="header" placeholder="Search or ask…" />
			</div>
		{/if}

		<nav class="primary" aria-label="Main">
			<a href="/all">All tools</a>
			<a href="/about">About</a>
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
				<a href="/{category.id}">{category.name}</a>
			{/each}
			<a href="/all">Everything</a>
			<a href="/about">About</a>
		</nav>
	{/if}
</header>

<main id="main">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="foot-inner">
		<div class="foot-brand">
			<p class="foot-title">The Everything Toolbox</p>
			<p class="small muted">
				Free, fast and private. Every tool on this site runs in your browser — nothing you type or
				upload is sent to a server.
			</p>
		</div>
		<nav class="foot-cats" aria-label="Categories">
			{#each CATEGORIES as category (category.id)}
				<a href="/{category.id}">{category.name}</a>
			{/each}
		</nav>
	</div>
	<div class="foot-legal">
		<span class="small muted">
			Health, finance and legal tools are educational — not professional advice.
		</span>
		<a class="small" href="/about">About &amp; sources</a>
	</div>
</footer>

<CommandPalette />

<style>
	.skip {
		position: absolute;
		left: -9999px;
		top: 0;
		z-index: 200;
		background: var(--bg-raised);
		padding: 0.6rem 1rem;
		border-radius: 0 0 var(--radius) 0;
		border: 1px solid var(--accent);
	}
	.skip:focus {
		left: 0;
	}

	.site-header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: color-mix(in srgb, var(--bg) 86%, transparent);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border);
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
	.wordmark {
		font-size: 0.98rem;
		font-weight: 450;
		letter-spacing: -0.01em;
		white-space: nowrap;
	}
	.wordmark strong {
		font-weight: 700;
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
		color: var(--accent);
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
		background: var(--bg-hover);
	}

	main {
		flex: 1;
		width: 100%;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 2rem 1.25rem 4rem;
	}

	.site-footer {
		border-top: 1px solid var(--border);
		background: var(--bg-sunken);
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
		font-weight: 650;
		margin-bottom: 0.35rem;
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
		color: var(--accent);
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
		.wordmark {
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
