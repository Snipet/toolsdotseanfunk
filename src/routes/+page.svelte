<script lang="ts">
	import { CATEGORIES, FEATURED, TOOLS, TOOL_BY_PATH, toolsIn, type Tool } from '$lib/catalog';
	import { prefs } from '$lib/state/prefs.svelte';
	import Omnibox from '$lib/components/Omnibox.svelte';
	import ToolCard from '$lib/components/ToolCard.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const featured = FEATURED.map((p) => TOOL_BY_PATH.get(p)).filter((x): x is Tool => Boolean(x));

	const pinned = $derived(
		[...prefs.favorites, ...prefs.recents.filter((p) => !prefs.favorites.includes(p))]
			.map((p) => TOOL_BY_PATH.get(p.replace(/^\//, '')))
			.filter((x): x is Tool => Boolean(x))
			.slice(0, 8)
	);

	const examples = [
		'3 tbsp to tsp',
		'15% of 80',
		'days until Dec 25',
		'72F in C',
		'255 in hex',
		'1994 to roman'
	];

	function randomTool() {
		const tool = TOOLS[Math.floor(Math.random() * TOOLS.length)];
		return `/${tool.category}/${tool.slug}`;
	}
</script>

<svelte:head>
	<title>The Everything Toolbox — free, fast, private web tools</title>
	<meta
		name="description"
		content="Converters, calculators, generators, visualizers and file tools — {TOOLS.length} of them, all free, all instant, all running in your browser."
	/>
</svelte:head>

<section class="hero">
	<h1>Whatever the small task is, it's here.</h1>
	<p class="tagline">
		Converting, calculating, generating, checking, visualizing — {TOOLS.length} tools, no signup, no
		ads, nothing sent to a server.
	</p>

	<div class="search-wrap">
		<Omnibox variant="hero" />
	</div>

	<div class="examples">
		<span class="small muted">Try asking:</span>
		{#each examples as example (example)}
			<a class="example" href="/all?q={encodeURIComponent(example)}">{example}</a>
		{/each}
	</div>

	<p class="hint small muted">
		Press <kbd>/</kbd> or <kbd>⌘</kbd><kbd>K</kbd> anywhere to jump to a tool.
	</p>
</section>

{#if pinned.length}
	<section class="block">
		<div class="block-head">
			<h2>Your tools</h2>
			{#if prefs.recents.length}
				<button type="button" class="btn btn-sm btn-ghost" onclick={() => prefs.clearRecents()}>
					Clear history
				</button>
			{/if}
		</div>
		<div class="grid">
			{#each pinned as tool (tool.category + tool.slug)}
				<ToolCard {tool} compact showCategory />
			{/each}
		</div>
	</section>
{/if}

<section class="block">
	<div class="block-head">
		<h2>Start here</h2>
		<a class="small" href={randomTool()} data-sveltekit-reload>Random tool →</a>
	</div>
	<div class="grid">
		{#each featured as tool (tool.category + tool.slug)}
			<ToolCard {tool} showCategory />
		{/each}
	</div>
</section>

<section class="block">
	<h2>Browse by category</h2>
	<div class="cats">
		{#each CATEGORIES as category (category.id)}
			<a class="cat" href="/{category.id}">
				<span class="cat-icon" aria-hidden="true">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
						<path d={category.icon} />
					</svg>
				</span>
				<span class="cat-body">
					<span class="cat-name">{category.name}</span>
					<span class="cat-blurb">{category.blurb}</span>
				</span>
				<span class="cat-count">{toolsIn(category.id).length}</span>
			</a>
		{/each}
	</div>
</section>

<section class="block pitch">
	<div class="pitch-grid">
		<div>
			<h3><Icon name="check" size={16} /> It never leaves your device</h3>
			<p class="small muted">
				Text, numbers, images — everything is processed in your browser. There is no upload step
				because there is nowhere to upload to.
			</p>
		</div>
		<div>
			<h3><Icon name="check" size={16} /> Every result is a link</h3>
			<p class="small muted">
				Inputs live in the URL, so any answer can be bookmarked, shared, or dropped into a lesson
				plan exactly as you left it.
			</p>
		</div>
		<div>
			<h3><Icon name="check" size={16} /> It shows the work</h3>
			<p class="small muted">
				Each tool states the formula it used and cites where the formula comes from. Converters are
				round-trip tested against NIST factors on every build.
			</p>
		</div>
	</div>
</section>

<style>
	.hero {
		text-align: center;
		padding: clamp(1.5rem, 5vw, 3.5rem) 0 2.5rem;
		max-width: 760px;
		margin: 0 auto;
	}

	.hero h1 {
		font-size: clamp(1.9rem, 1.2rem + 3vw, 3rem);
		letter-spacing: -0.03em;
	}

	.tagline {
		color: var(--text-muted);
		margin: 0.85rem auto 0;
		max-width: 56ch;
		font-size: 1.02rem;
	}

	.search-wrap {
		margin: 1.75rem auto 0;
	}

	.examples {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		justify-content: center;
		align-items: center;
		margin-top: 1rem;
	}

	.example {
		font-size: 0.82rem;
		font-family: var(--font-mono);
		padding: 0.25rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg-raised);
		text-decoration: none;
		color: var(--text-muted);
	}
	.example:hover {
		border-color: var(--accent-border);
		color: var(--accent);
	}

	.hint {
		margin-top: 1.1rem;
	}

	kbd {
		background: var(--bg-raised);
		border: 1px solid var(--border-strong);
		border-bottom-width: 2px;
		border-radius: 4px;
		padding: 0.05em 0.35em;
		font-size: 0.85em;
	}

	.block {
		margin-top: 2.75rem;
	}

	.block-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.9rem;
	}
	.block-head h2,
	.block > h2 {
		font-size: 1.15rem;
	}
	.block > h2 {
		margin-bottom: 0.9rem;
	}

	.grid {
		display: grid;
		gap: 0.7rem;
		grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
	}

	.cats {
		display: grid;
		gap: 0.7rem;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	}

	.cat {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.9rem 1rem;
		background: var(--bg-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		text-decoration: none;
		color: var(--text);
		transition: border-color 0.12s ease, transform 0.12s ease;
	}
	.cat:hover {
		border-color: var(--accent-border);
		transform: translateY(-1px);
		color: var(--text);
	}

	.cat-icon {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		flex: none;
		border-radius: var(--radius-sm);
		background: var(--accent-soft);
		color: var(--accent);
	}

	.cat-body {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.cat-name {
		font-weight: 590;
		font-size: 0.95rem;
	}

	.cat-blurb {
		font-size: 0.8rem;
		color: var(--text-muted);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.cat-count {
		margin-left: auto;
		font-size: 0.78rem;
		color: var(--text-faint);
		font-variant-numeric: tabular-nums;
		flex: none;
	}

	.pitch {
		border-top: 1px solid var(--border);
		padding-top: 2rem;
	}

	.pitch-grid {
		display: grid;
		gap: 1.5rem;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	}

	.pitch h3 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.95rem;
		margin-bottom: 0.35rem;
	}
	.pitch h3 :global(svg) {
		color: var(--positive);
		flex: none;
	}
</style>
