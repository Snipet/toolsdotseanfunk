<script lang="ts">
	import { analyse, readability } from '$lib/text/text';
	import { fmtLoose } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	let text = $state(
		'The quick brown fox jumps over the lazy dog. This sentence is short and easy to read. Notwithstanding the aforementioned considerations, the implementation of comprehensive organisational restructuring necessitates methodical evaluation of interdependent operational variables.'
	);

	const stats = $derived(analyse(text));
	const scores = $derived(readability(text));

	function easeLabel(score: number): { label: string; grade: string; tone: 'positive' | 'warning' | 'negative' } {
		if (score >= 90) return { label: 'Very easy', grade: '5th grade', tone: 'positive' };
		if (score >= 80) return { label: 'Easy', grade: '6th grade', tone: 'positive' };
		if (score >= 70) return { label: 'Fairly easy', grade: '7th grade', tone: 'positive' };
		if (score >= 60) return { label: 'Plain English', grade: '8th–9th grade', tone: 'positive' };
		if (score >= 50) return { label: 'Fairly difficult', grade: '10th–12th grade', tone: 'warning' };
		if (score >= 30) return { label: 'Difficult', grade: 'College', tone: 'warning' };
		return { label: 'Very difficult', grade: 'College graduate', tone: 'negative' };
	}

	const verdict = $derived(scores ? easeLabel(scores.fleschReadingEase) : null);

	const longSentences = $derived(
		text
			.split(/(?<=[.!?])\s+/)
			.map((sentence) => ({ sentence: sentence.trim(), words: (sentence.match(/[\p{L}\p{N}]+/gu) ?? []).length }))
			.filter((x) => x.words > 25)
			.sort((a, b) => b.words - a.words)
			.slice(0, 5)
	);
</script>

<ToolShell {tool}>
	<div class="card">
		<label for="rd-text">Your text</label>
		<textarea id="rd-text" bind:value={text} rows="10" spellcheck="false"></textarea>
		<p class="small muted">{stats.words} words · {stats.sentences} sentences</p>
	</div>

	{#if !scores}
		<Note tone="warning">Paste at least one complete sentence.</Note>
	{:else if verdict}
		<Result
			label="Flesch reading ease"
			primary
			value={`${fmtLoose(scores.fleschReadingEase, 1)} — ${verdict.label}`}
			tone={verdict.tone}
			detail={`Comfortable for a reader at ${verdict.grade} level`}
		/>

		<div class="results-grid">
			<Result label="Flesch–Kincaid grade" value={fmtLoose(scores.fleschKincaidGrade, 1)} detail="US school grade level" />
			<Result label="Gunning fog index" value={fmtLoose(scores.gunningFog, 1)} detail="Years of education needed" />
			<Result label="SMOG index" value={fmtLoose(scores.smog, 1)} detail="Favoured for health materials" />
			<Result label="Coleman–Liau index" value={fmtLoose(scores.colemanLiau, 1)} detail="Uses characters, not syllables" />
			<Result label="Automated readability index" value={fmtLoose(scores.automatedReadability, 1)} />
			<Result label="Average grade level" value={fmtLoose(scores.averageGrade, 1)} primary />
		</div>

		<section class="card">
			<h2>What is driving the score</h2>
			<div class="results-grid">
				<Result label="Average sentence length" value={`${fmtLoose(stats.averageSentenceLength, 1)} words`} tone={stats.averageSentenceLength > 20 ? 'warning' : 'positive'} detail={stats.averageSentenceLength > 20 ? 'Long — consider splitting some sentences' : 'Comfortable'} />
				<Result label="Syllables per word" value={fmtLoose(stats.syllables / Math.max(1, stats.words), 2)} tone={stats.syllables / Math.max(1, stats.words) > 1.8 ? 'warning' : 'positive'} />
				<Result label="Longest word" value={stats.longestWord || '—'} />
			</div>
		</section>

		{#if longSentences.length}
			<section class="card">
				<h2>Longest sentences</h2>
				<ul class="long-list">
					{#each longSentences as item, i (i)}
						<li><span class="count">{item.words} words</span> {item.sentence}</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}

	{#snippet explainer()}
		<p>
			Readability formulas all work the same way: they count sentence length and word complexity,
			then map the result onto a school grade. None of them read your text — they cannot tell whether
			it is coherent, only whether it is dense.
		</p>
		<code class="formula">Flesch reading ease = 206.835 − 1.015 × (words/sentence) − 84.6 × (syllables/word)
Flesch–Kincaid grade = 0.39 × (words/sentence) + 11.8 × (syllables/word) − 15.59</code>
		<h3>The scale</h3>
		<dl>
			<dt>90–100</dt><dd>Very easy. Children's books.</dd>
			<dt>60–70</dt><dd>Plain English. Most newspapers and good business writing sit here.</dd>
			<dt>30–50</dt><dd>Difficult. Academic and technical prose.</dd>
			<dt>Below 30</dt><dd>Very difficult. Legal and insurance documents.</dd>
		</dl>
		<h3>Why several formulas</h3>
		<p>
			They disagree, and the disagreement is informative. Coleman–Liau and ARI count characters
			rather than syllables, so they are immune to syllable-estimation error but blind to the
			difference between “through” and “thought”. SMOG counts polysyllabic words and is the standard
			for health materials. When all five agree, the score is trustworthy.
		</p>
		<h3>What to actually do with a bad score</h3>
		<p>
			Split long sentences. Replace nominalisations with verbs (“make a decision” → “decide”). Cut
			qualifiers. Choose the shorter word where it means the same thing. Every one of those makes
			the text genuinely clearer — which is why the score moves.
		</p>
		<h3>Do not optimise the number</h3>
		<p>
			These are heuristics, and they are gameable: chopping every sentence in half improves the score
			while making the writing worse. Use them to find the passages worth rereading, not as a target.
		</p>
	{/snippet}

	{#snippet sources()}
		<p>
			Flesch R, “A new readability yardstick”, 1948. Kincaid JP et al., US Navy technical report,
			1975. Gunning R, <em>The Technique of Clear Writing</em>, 1952. McLaughlin GH, “SMOG grading”,
			1969. Coleman M &amp; Liau TL, 1975. Syllable counts here are heuristic, so scores may differ
			by a fraction from dictionary-based implementations.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 200px;
	}
	.long-list {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.long-list li {
		padding: 0.55rem 0.75rem;
		background: var(--bg-sunken);
		border-radius: var(--radius-sm);
		font-size: 0.88rem;
		color: var(--text-muted);
	}
	.count {
		display: inline-block;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--warning);
		margin-right: 0.5rem;
	}
</style>
