<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';

	let { tool }: { tool: Tool } = $props();

	const NATO: Record<string, string> = {
		A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf',
		H: 'Hotel', I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November',
		O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform',
		V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
		'0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
		'5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine',
		'.': 'Point', '-': 'Dash', '@': 'At', '/': 'Slash', '_': 'Underscore'
	};

	const s = urlState({ text: 'Sean42', showCase: true });

	const spelled = $derived(
		[...s.text].map((raw) => {
			const key = raw.toUpperCase();
			const word = NATO[key];
			if (!word) return { raw, word: raw === ' ' ? '(space)' : raw, known: false };
			const cased = s.showCase && /[a-z]/.test(raw) ? `${word} (lower)` : word;
			return { raw, word: cased, known: true };
		})
	);

	const line = $derived(spelled.map((x) => x.word).join(' — '));
	const letters = $derived(Object.entries(NATO).slice(0, 26));
	const digits = $derived(Object.entries(NATO).slice(26, 36));
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field label="What are you spelling?" for="np-text">
			<input id="np-text" type="text" bind:value={s.text} autocomplete="off" spellcheck="false" />
		</Field>

		<label class="check"><input type="checkbox" bind:checked={s.showCase} /> Note lower-case letters</label>

		<Result label="Say this" primary value={line || '—'} />

		<div class="spelled">
			{#each spelled as item, i (i)}
				<div class="item" class:unknown={!item.known}>
					<span class="raw">{item.raw === ' ' ? '␣' : item.raw}</span>
					<span class="word">{item.word}</span>
				</div>
			{/each}
		</div>
	</div>

	<section class="card">
		<h2>The alphabet</h2>
		<div class="chart">
			{#each letters as [letter, word] (letter)}
				<div class="entry"><span class="key">{letter}</span> {word}</div>
			{/each}
		</div>
		<h2 class="second">Numbers</h2>
		<div class="chart">
			{#each digits as [digit, word] (digit)}
				<div class="entry"><span class="key">{digit}</span> {word}</div>
			{/each}
		</div>
	</section>

	{#snippet explainer()}
		<p>
			The NATO phonetic alphabet — properly the International Radiotelephony Spelling Alphabet — exists
			because “B”, “D”, “P”, “T” and “V” are nearly indistinguishable over a noisy channel. Each code
			word was chosen so that no two sound alike even when badly degraded.
		</p>
		<h3>The odd spellings are deliberate</h3>
		<p>
			<strong>Alfa</strong> and <strong>Juliett</strong> are spelled that way on purpose: “Alpha”
			invites a silent “ph” for French and Spanish speakers, and “Juliet” invites a silent final “t”.
			The alphabet was tested across many native languages before adoption in 1956.
		</p>
		<h3>Numbers too</h3>
		<p>
			Aviation says “niner” for 9 to avoid confusion with the German “nein”, and “tree” for 3 to
			avoid the “th” sound that many languages lack. Those are aviation conventions rather than part
			of the formal alphabet.
		</p>
		<h3>Everyday use</h3>
		<p>
			Reading a reference number, a postcode or an email address over the phone is much faster with
			it than without — and when the other person also knows it, you stop having to invent
			“B for… bicycle?” on the spot.
		</p>
	{/snippet}
</ToolShell>

<style>
	.spelled {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		padding: 0.4rem 0.65rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		min-width: 62px;
	}
	.item.unknown {
		opacity: 0.55;
	}
	.raw {
		font-family: var(--font-mono);
		font-size: 1.1rem;
		font-weight: 700;
	}
	.word {
		font-size: 0.78rem;
		color: var(--text-muted);
	}
	.chart {
		display: grid;
		gap: 0.3rem;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		margin-top: 0.6rem;
	}
	.entry {
		font-size: 0.88rem;
		padding: 0.25rem 0.5rem;
	}
	.key {
		display: inline-block;
		width: 1.4em;
		font-weight: 700;
		color: var(--accent);
	}
	.second {
		margin-top: 1.25rem;
	}
</style>
