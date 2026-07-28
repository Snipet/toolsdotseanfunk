<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	const FLAVOURS: Record<string, string[]> = {
		Classic: 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' '),
		Cupcake: 'cupcake ipsum dolor sit amet chocolate bar halvah carrot cake donut sugar plum tart gingerbread pastry jujubes marzipan croissant caramels toffee icing cotton candy soufflé jelly beans liquorice macaroon brownie danish oat cake bonbon fruitcake sesame snaps wafer topping powder biscuit apple pie lollipop marshmallow cheesecake muffin'.split(' '),
		Pirate: 'ahoy matey avast ye scallywag booty doubloon gangway hornswaggle jolly roger keelhaul landlubber marooned pieces of eight plunder quarterdeck scurvy shiver me timbers swab yardarm bilge rat black spot buccaneer cutlass grog heave ho parley privateer rum sloop treasure walk the plank'.split(' '),
		Corporate: 'synergy leverage paradigm actionable bandwidth deliverable ecosystem holistic ideate iterate scalable stakeholder streamline touchpoint alignment optimise robust seamless strategic value-add pivot disrupt agile roadmap north star low-hanging fruit circle back deep dive move the needle bleeding edge'.split(' '),
		Tech: 'kubernetes container microservice endpoint latency throughput cache invalidation deployment pipeline repository middleware serverless idempotent asynchronous webhook payload schema migration observability telemetry orchestration immutable declarative rollback canary sharding replication eventual consistency backpressure'.split(' ')
	};

	const s = urlState({ flavour: 'Classic', kind: 'paragraphs', count: 3, minWords: 12, maxWords: 24, startClassic: true, html: false });

	// A tiny seeded PRNG so the same settings regenerate the same text until
	// you press the button — stable output, but not a fixed lorem block.
	let seed = $state(1);

	function makeRandom(initial: number) {
		let state = initial >>> 0 || 1;
		return () => {
			state ^= state << 13;
			state ^= state >>> 17;
			state ^= state << 5;
			return ((state >>> 0) % 100000) / 100000;
		};
	}

	const generated = $derived.by(() => {
		const rand = makeRandom(seed * 2654435761);
		const vocabulary = FLAVOURS[s.flavour] ?? FLAVOURS.Classic;
		const pick = () => vocabulary[Math.floor(rand() * vocabulary.length)];

		const sentence = () => {
			const length = Math.max(3, Math.floor(s.minWords + rand() * Math.max(1, s.maxWords - s.minWords)));
			const parts = Array.from({ length }, pick);
			// Sprinkle commas the way real prose does, roughly every 8 words.
			for (let i = 5; i < parts.length - 2; i += 5 + Math.floor(rand() * 5)) parts[i] += ',';
			const body = parts.join(' ');
			return body.charAt(0).toUpperCase() + body.slice(1) + (rand() > 0.94 ? '?' : '.');
		};

		const paragraph = (index: number) => {
			const count = 3 + Math.floor(rand() * 3);
			let out = Array.from({ length: count }, sentence).join(' ');
			if (index === 0 && s.startClassic && s.flavour === 'Classic') {
				out = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' + out;
			}
			return out;
		};

		const n = Math.max(1, Math.min(50, s.count));

		if (s.kind === 'words') {
			const wordsOut = Array.from({ length: Math.min(2000, s.count) }, pick).join(' ');
			return wordsOut.charAt(0).toUpperCase() + wordsOut.slice(1) + '.';
		}
		if (s.kind === 'sentences') {
			return Array.from({ length: n }, sentence).join(' ');
		}
		if (s.kind === 'list') {
			const items = Array.from({ length: n }, () =>
				Array.from({ length: 3 + Math.floor(rand() * 4) }, pick).join(' ')
			);
			return s.html
				? `<ul>\n${items.map((i) => `  <li>${i}</li>`).join('\n')}\n</ul>`
				: items.map((i) => `• ${i}`).join('\n');
		}

		const paragraphs = Array.from({ length: n }, (_, i) => paragraph(i));
		return s.html ? paragraphs.map((p) => `<p>${p}</p>`).join('\n\n') : paragraphs.join('\n\n');
	});

	const wordCount = $derived(generated.split(/\s+/).filter(Boolean).length);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Flavour" for="li-flavour">
				<select id="li-flavour" bind:value={s.flavour}>
					{#each Object.keys(FLAVOURS) as flavour (flavour)}<option value={flavour}>{flavour}</option>{/each}
				</select>
			</Field>
			<Field label="Generate" for="li-kind">
				<select id="li-kind" bind:value={s.kind}>
					<option value="paragraphs">Paragraphs</option>
					<option value="sentences">Sentences</option>
					<option value="words">Words</option>
					<option value="list">List items</option>
				</select>
			</Field>
			<Field label="How many" for="li-count"><input id="li-count" type="number" min="1" max="50" bind:value={s.count} /></Field>
		</div>

		<div class="row">
			<label class="check"><input type="checkbox" bind:checked={s.html} /> Wrap in HTML tags</label>
			{#if s.flavour === 'Classic'}
				<label class="check"><input type="checkbox" bind:checked={s.startClassic} /> Start with “Lorem ipsum dolor sit amet”</label>
			{/if}
			<button type="button" class="btn btn-sm" onclick={() => (seed = Math.floor(Math.random() * 1e9))}>Regenerate</button>
		</div>
	</div>

	<section class="card">
		<div class="out-head">
			<h2>{wordCount} words</h2>
			<CopyButton value={() => generated} label="Copy" />
		</div>
		<output class="output">{generated}</output>
	</section>

	{#snippet explainer()}
		<p>
			Placeholder text exists so that a layout can be judged on its shape rather than its content.
			Real copy pulls the eye into reading; nonsense Latin does not, which is precisely the point.
		</p>
		<h3>Where lorem ipsum comes from</h3>
		<p>
			It is a scrambled extract from Cicero's <em>De Finibus Bonorum et Malorum</em>, written in
			45 BC. The opening “Lorem ipsum” is a fragment of <em>dolorem ipsum</em> — “pain itself”. It has
			been used by typesetters since at least the 1500s, and the modern form spread via Letraset
			sheets and then PageMaker.
		</p>
		<h3>Why not just type “asdf asdf”</h3>
		<p>
			Lorem ipsum has roughly Latin-like word-length distribution, which produces a realistic
			greyness on the page and realistic line-break behaviour. Repeated keyboard mashing does not,
			and neither does English text, which designers cannot help reading.
		</p>
		<h3>A caution</h3>
		<p>
			Placeholder text has a habit of shipping. Search your codebase for “lorem” before release —
			it has appeared on production sites, in printed annual reports, and at least once on a
			billboard.
		</p>
	{/snippet}
</ToolShell>

<style>
	.out-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.out-head h2 {
		font-size: 1rem;
		color: var(--text-muted);
	}
	.output {
		display: block;
		white-space: pre-wrap;
		line-height: 1.65;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 1rem;
		max-height: 500px;
		overflow-y: auto;
	}
</style>
