<script lang="ts">
	import { analyse } from '$lib/text/text';
	import { fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';

	let { tool }: { tool: Tool } = $props();

	let text = $state('');

	const stats = $derived(analyse(text));

	const LIMITS = [
		{ name: 'X / Twitter post', limit: 280 },
		{ name: 'Bluesky post', limit: 300 },
		{ name: 'Instagram caption', limit: 2200 },
		{ name: 'LinkedIn post', limit: 3000 },
		{ name: 'Meta title tag', limit: 60 },
		{ name: 'Meta description', limit: 160 }
	];

	/**
	 * SMS segments: 160 characters per message using the GSM-7 alphabet, or 70
	 * if any character falls outside it. Multi-part messages give up a few
	 * characters per segment to the concatenation header.
	 */
	const GSM7 = new Set(
		[
			...'@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?',
			...'¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
			...'^{}\\[~]|€\n\r'
		].join('')
	);
	const smsUnicode = $derived([...text].some((c) => !GSM7.has(c)));
	const smsSingleLimit = $derived(smsUnicode ? 70 : 160);
	const smsMultiLimit = $derived(smsUnicode ? 67 : 153);
	const smsSegments = $derived(
		stats.characters === 0
			? 0
			: stats.characters <= smsSingleLimit
				? 1
				: Math.ceil(stats.characters / smsMultiLimit)
	);

	const topWords = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const w of text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []) {
			counts.set(w, (counts.get(w) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
	});
</script>

<ToolShell {tool}>
	<div class="card">
		<label for="wc-text">Paste or type your text</label>
		<textarea id="wc-text" bind:value={text} rows="12" placeholder="Start typing…" spellcheck="false"></textarea>
	</div>

	<div class="results-grid">
		<Result label="Words" primary value={stats.words.toLocaleString('en-US')} />
		<Result
			label="Characters"
			primary
			value={stats.characters.toLocaleString('en-US')}
			detail={`${stats.charactersNoSpaces.toLocaleString('en-US')} without spaces`}
		/>
		<Result label="Sentences" value={stats.sentences.toLocaleString('en-US')} />
		<Result label="Paragraphs" value={stats.paragraphs.toLocaleString('en-US')} />
		<Result label="Lines" value={stats.lines.toLocaleString('en-US')} />
		<Result
			label="Unique words"
			value={stats.uniqueWords.toLocaleString('en-US')}
			detail={stats.words ? `${fmtLoose((stats.uniqueWords / stats.words) * 100, 1)}% of the total` : undefined}
		/>
		<Result
			label="Reading time"
			value={stats.words ? `${Math.max(1, Math.round(stats.readingMinutes))} min` : '—'}
			detail="At 238 words per minute"
		/>
		<Result
			label="Speaking time"
			value={stats.words ? `${Math.max(1, Math.round(stats.speakingMinutes))} min` : '—'}
			detail="At 150 words per minute"
		/>
		<Result label="Average word length" value={stats.words ? `${fmtLoose(stats.averageWordLength, 2)} chars` : '—'} />
		<Result label="Average sentence" value={stats.sentences ? `${fmtLoose(stats.averageSentenceLength, 1)} words` : '—'} />
		<Result label="Longest word" value={stats.longestWord || '—'} />
		<Result label="Syllables" value={stats.syllables.toLocaleString('en-US')} detail="Estimated" />
	</div>

	<section class="card">
		<h2>Platform limits</h2>
		<div class="limits">
			{#each LIMITS as limit (limit.name)}
				{@const used = Math.min(100, (stats.characters / limit.limit) * 100)}
				<div class="limit" class:over={stats.characters > limit.limit}>
					<div class="limit-head">
						<span>{limit.name}</span>
						<span class="num">{stats.characters} / {limit.limit}</span>
					</div>
					<div class="track"><span class="fill" style="width: {used}%"></span></div>
				</div>
			{/each}
			<div class="limit">
				<div class="limit-head">
					<span>SMS segments</span>
					<span class="num">
						{smsSegments}
						{smsUnicode ? '(Unicode — 70 per message)' : '(GSM-7 — 160 per message)'}
					</span>
				</div>
			</div>
		</div>
	</section>

	{#if topWords.length}
		<section class="card">
			<h2>Most frequent words</h2>
			<div class="freq">
				{#each topWords as [word, count] (word)}
					<span class="chip"><strong>{word}</strong> {count}</span>
				{/each}
			</div>
		</section>
	{/if}

	{#snippet explainer()}
		<p>Everything updates as you type, and nothing is sent anywhere — the text stays in this tab.</p>
		<h3>How words are counted</h3>
		<p>
			A word is a run of letters or digits, optionally containing apostrophes and hyphens. So
			“don't” is one word and “re-open” is one word, which matches how most editors count and how
			most people would. Unicode letters count, so “café” and “日本語” are handled properly.
		</p>
		<h3>Characters and emoji</h3>
		<p>
			Characters are counted by code point, not by JavaScript's internal 16-bit units — so an emoji
			counts as one, not two. Platforms differ: X counts most emoji as two characters, and some
			count a skin-tone or flag sequence as several.
		</p>
		<h3>SMS segments</h3>
		<p>
			A text message holds 160 characters using the GSM-7 alphabet. Introduce a single character
			outside it — a curly apostrophe, an em dash, an emoji — and the whole message switches to
			UCS-2 at 70 characters per segment. Multi-part messages lose a few characters per segment to
			concatenation headers, which is why the limits drop to 153 and 67.
		</p>
		<h3>Reading time</h3>
		<p>
			238 words per minute is the mean for silent reading of non-fiction in Brysbaert's 2019
			meta-analysis; speaking aloud is closer to 150. Both vary widely with material and reader.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 240px;
		font-size: 0.95rem;
	}
	.limits {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		margin-top: 0.75rem;
	}
	.limit-head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		font-size: 0.85rem;
		margin-bottom: 0.2rem;
	}
	.track {
		height: 6px;
		background: var(--bg-sunken);
		border-radius: 999px;
		overflow: hidden;
	}
	.fill {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.limit.over .fill {
		background: var(--negative);
	}
	.limit.over .limit-head {
		color: var(--negative);
	}
	.freq {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.75rem;
	}
	.chip {
		padding: 0.25rem 0.6rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: 999px;
		font-size: 0.82rem;
	}
	.chip strong {
		font-weight: 600;
	}
</style>
