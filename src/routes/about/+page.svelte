<script lang="ts">
	import { base } from '$app/paths';
	import { CATEGORIES, TOOLS, toolsIn } from '$lib/catalog';
</script>

<svelte:head>
	<title>About · The Everything Toolbox</title>
	<meta
		name="description"
		content="What this site is, how it handles your data, where its formulas come from, and what is coming next."
	/>
</svelte:head>

<article class="page prose-page">
	<h1>About</h1>

	<p class="lede">
		Calculator sites don't do files. File sites don't do calculators. Developer sites don't do
		cooking, and almost nobody does interactive teaching visualizers next to everyday utilities.
		This is an attempt at all of it in one place, with one design language and one search box.
	</p>

	<h2>The promises</h2>

	<dl class="promises">
		<dt>Nothing leaves your device</dt>
		<dd>
			Every tool here runs in your browser. There is no backend — the site is a folder of static
			files. Text you paste, numbers you type and images you drop are processed locally and are
			never transmitted anywhere.
		</dd>

		<dt>No account, no ads, no upsell</dt>
		<dd>
			Nothing is gated. Favourites and recent tools are stored in your own browser's local storage
			and can be cleared at any time from the home page.
		</dd>

		<dt>Every result is a link</dt>
		<dd>
			Tool inputs are encoded in the URL. Copy the address bar and you have shared the exact
			calculation, not just the tool. That makes results citable in a lesson plan, a bug report or a
			group chat.
		</dd>

		<dt>The work is shown</dt>
		<dd>
			Each tool states the formula it uses and links to the standard it came from. Where a formula
			is contested or approximate — body-fat estimates, sleep cycles, caffeine metabolism — that is
			said plainly rather than hidden behind a confident number.
		</dd>

		<dt>It stays fast</dt>
		<dd>
			Pages are prerendered and each tool is loaded as its own small chunk, so opening the tip
			calculator does not download the matrix solver.
		</dd>
	</dl>

	<h2>Correctness</h2>
	<p>
		Unit conversion factors follow <strong>NIST Special Publication 811</strong> and the BIPM SI
		Brochure. The converter engine is covered by a property test that round-trips every unit pair in
		every dimension, plus a table of hand-checked reference values (1 inch = 2.54 cm exactly, −40 °C
		= −40 °F, 1 acre = 43,560 ft², and so on). The expression parser, the omnibox and the Roman
		numeral converter have their own suites. Tests run on every build.
	</p>
	<p>
		Health and finance tools name the formula they implement — Mifflin–St Jeor for BMR, the US Navy
		tape method for body fat, Karvonen for heart-rate zones — because the choice of formula changes
		the answer, and you deserve to know which one you got.
	</p>
	<p>
		If something looks wrong, every tool page has a “Report an error” link at the bottom that opens
		a pre-filled issue.
	</p>

	<h2>What's here today</h2>
	<p>{TOOLS.length} tools across {CATEGORIES.length} categories:</p>
	<ul class="cat-list">
		{#each CATEGORIES as category (category.id)}
			<li>
				<a href="{base}/{category.id}">{category.name}</a>
				<span class="muted small"> — {toolsIn(category.id).length} tools</span>
			</li>
		{/each}
	</ul>

	<h2>What's next</h2>
	<p>
		The roadmap, roughly in order: the rest of the converter matrix; PDF and audio/video tools built
		on WebAssembly so they can stay client-side; the visualizer program expanding one subject per
		release (economics is first, then math, statistics, physics and computer science); embeddable
		widgets and a classroom presentation mode; offline support as an installable app; and a
		request-a-tool board so the roadmap writes itself.
	</p>
	<p>
		Deliberately not on the roadmap: interstitials, newsletter popups, and gating the answer behind a
		signup.
	</p>

	<h2>Disclaimers</h2>
	<p>
		Health, medical, legal, tax and financial tools are educational. They are not advice, they cannot
		see your circumstances, and they are not a substitute for a clinician, an accountant or a lawyer.
		Where a tool could plausibly be used for a decision that matters, it says so on the page.
	</p>
</article>

<style>
	.page {
		max-width: 68ch;
	}

	.lede {
		font-size: 1.05rem;
		color: var(--text-muted);
		margin-top: 1rem;
	}

	h2 {
		margin-top: 2.25rem;
		margin-bottom: 0.7rem;
	}

	p + p {
		margin-top: 0.8rem;
	}

	.prose-page p {
		color: var(--text-muted);
	}
	.prose-page strong {
		color: var(--text);
	}

	.promises {
		display: grid;
		gap: 0.9rem;
	}
	.promises dt {
		font-weight: 620;
		color: var(--text);
	}
	.promises dd {
		margin: 0.2rem 0 0;
		color: var(--text-muted);
	}

	.cat-list {
		columns: 2;
		column-gap: 2rem;
		padding-left: 1.1rem;
	}
	.cat-list li {
		break-inside: avoid;
		margin-bottom: 0.2rem;
	}
</style>
