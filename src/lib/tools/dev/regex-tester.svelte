<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({
		pattern: '(\\w+)@(\\w+\\.\\w+)',
		flags: 'gi',
		replacement: '$1 at $2'
	});

	let text = $state(`Contact ada@example.com or grace@navy.mil for details.
Invalid: not-an-email, @nope.com
Also try alan@bletchley.uk today.`);

	const FLAGS = [
		{ flag: 'g', label: 'global — find all matches' },
		{ flag: 'i', label: 'ignore case' },
		{ flag: 'm', label: 'multiline — ^ and $ match line boundaries' },
		{ flag: 's', label: 'dotall — . matches newlines' },
		{ flag: 'u', label: 'unicode' },
		{ flag: 'y', label: 'sticky' }
	];

	const compiled = $derived.by(() => {
		if (!s.pattern) return { ok: true as const, regex: null };
		try {
			return { ok: true as const, regex: new RegExp(s.pattern, s.flags) };
		} catch (err) {
			return { ok: false as const, error: err instanceof Error ? err.message : 'Invalid pattern' };
		}
	});

	const matches = $derived.by(() => {
		if (!compiled.ok || !compiled.regex) return [];
		const regex = compiled.regex;
		try {
			if (regex.global) return [...text.matchAll(regex)];
			const single = regex.exec(text);
			return single ? [single] : [];
		} catch {
			return [];
		}
	});

	const highlighted = $derived.by(() => {
		if (!matches.length) return [{ text, hit: false }];
		const parts: Array<{ text: string; hit: boolean }> = [];
		let cursor = 0;
		for (const m of matches) {
			const index = m.index ?? 0;
			// A zero-length match would loop forever if we advanced by its length.
			if (index > cursor) parts.push({ text: text.slice(cursor, index), hit: false });
			if (m[0].length) parts.push({ text: m[0], hit: true });
			cursor = index + Math.max(1, m[0].length);
		}
		if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
		return parts;
	});

	const replaced = $derived.by(() => {
		if (!compiled.ok || !compiled.regex) return text;
		try {
			return text.replace(compiled.regex, s.replacement);
		} catch {
			return text;
		}
	});

	function toggleFlag(flag: string) {
		s.flags = s.flags.includes(flag) ? s.flags.replace(flag, '') : s.flags + flag;
	}

	const CHEATSHEET = [
		{ token: '.', meaning: 'Any character except a newline' },
		{ token: '\\d \\w \\s', meaning: 'Digit, word character, whitespace' },
		{ token: '\\D \\W \\S', meaning: 'The negation of each' },
		{ token: '[abc]', meaning: 'Any one of a, b or c' },
		{ token: '[^abc]', meaning: 'Any character except those' },
		{ token: '[a-z]', meaning: 'A range' },
		{ token: '*  +  ?', meaning: 'Zero or more, one or more, optional' },
		{ token: '{2,5}', meaning: 'Between two and five times' },
		{ token: '*? +?', meaning: 'Lazy — match as little as possible' },
		{ token: '^  $', meaning: 'Start and end of string (or line with m)' },
		{ token: '\\b', meaning: 'Word boundary' },
		{ token: '(...)', meaning: 'Capture group' },
		{ token: '(?:...)', meaning: 'Group without capturing' },
		{ token: '(?<name>...)', meaning: 'Named capture group' },
		{ token: 'a|b', meaning: 'Either a or b' },
		{ token: '(?=...)', meaning: 'Positive lookahead' },
		{ token: '(?!...)', meaning: 'Negative lookahead' },
		{ token: '(?<=...)', meaning: 'Positive lookbehind' }
	];

	const LIBRARY = [
		{ name: 'Email (pragmatic)', pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.-]+" },
		{ name: 'URL', pattern: 'https?://[\\w.-]+(?:/[\\w./?%&=-]*)?' },
		{ name: 'IPv4 address', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b' },
		{ name: 'Hex colour', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b' },
		{ name: 'ISO date', pattern: '\\d{4}-\\d{2}-\\d{2}' },
		{ name: 'Duplicate words', pattern: '\\b(\\w+)\\s+\\1\\b' },
		{ name: 'Trailing whitespace', pattern: '[ \\t]+$' },
		{ name: 'HTML tag', pattern: '</?[a-zA-Z][^>]*>' }
	];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field label="Pattern" for="rt-pattern" error={!compiled.ok ? compiled.error : undefined}>
			<div class="pattern-row">
				<span class="delim">/</span>
				<input id="rt-pattern" type="text" class="mono" bind:value={s.pattern} autocomplete="off" spellcheck="false" />
				<span class="delim">/{s.flags}</span>
			</div>
		</Field>

		<div class="flags">
			{#each FLAGS as item (item.flag)}
				<button type="button" class="flag" class:active={s.flags.includes(item.flag)} onclick={() => toggleFlag(item.flag)} title={item.label}>
					{item.flag}
				</button>
			{/each}
		</div>

		<Result label="Matches" primary value={String(matches.length)} tone={matches.length ? 'positive' : 'neutral'} copyable={false} />
	</div>

	<div class="card">
		<label for="rt-text">Test string</label>
		<textarea id="rt-text" bind:value={text} rows="7" spellcheck="false" class="mono"></textarea>
		<div class="preview" aria-hidden="true">
			{#each highlighted as part, i (i)}<span class:hit={part.hit}>{part.text}</span>{/each}
		</div>
	</div>

	{#if matches.length}
		<section class="card">
			<h2>Match details</h2>
			<div class="scroll-x">
				<table class="data">
					<thead>
						<tr><th class="num">#</th><th class="num">Index</th><th>Match</th><th>Groups</th></tr>
					</thead>
					<tbody>
						{#each matches.slice(0, 100) as match, i (i)}
							<tr>
								<td class="num">{i + 1}</td>
								<td class="num">{match.index}</td>
								<td class="mono">{match[0]}</td>
								<td class="mono small">
									{#if match.length > 1}
										{#each match.slice(1) as group, g (g)}
											<span class="group">${g + 1}: {group ?? '(none)'}</span>
										{/each}
									{:else}
										—
									{/if}
									{#if match.groups}
										{#each Object.entries(match.groups) as [name, value] (name)}
											<span class="group">{name}: {value ?? '(none)'}</span>
										{/each}
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if matches.length > 100}
				<p class="small muted">Showing the first 100 of {matches.length} matches.</p>
			{/if}
		</section>
	{/if}

	<section class="card stack">
		<h2>Replace</h2>
		<Field label="Replacement" for="rt-replacement" hint="$1 for a capture group, $& for the whole match">
			<input id="rt-replacement" type="text" class="mono" bind:value={s.replacement} autocomplete="off" spellcheck="false" />
		</Field>
		<div class="out-head">
			<label for="rt-result">Result</label>
			<CopyButton value={() => replaced} label="Copy" />
		</div>
		<textarea id="rt-result" value={replaced} rows="5" readonly spellcheck="false" class="mono"></textarea>
	</section>

	<section class="card">
		<h2>Pattern library</h2>
		<div class="library">
			{#each LIBRARY as item (item.name)}
				<button type="button" class="lib" onclick={() => (s.pattern = item.pattern)}>
					<span>{item.name}</span>
					<code>{item.pattern}</code>
				</button>
			{/each}
		</div>
	</section>

	<section class="card">
		<h2>Cheat sheet</h2>
		<div class="cheat">
			{#each CHEATSHEET as row (row.token)}
				<div class="cheat-row">
					<code>{row.token}</code>
					<span>{row.meaning}</span>
				</div>
			{/each}
		</div>
	</section>

	<Note>
		This uses the browser's own JavaScript engine, so behaviour matches what your code will do.
		Other flavours differ: PCRE, Python's <code>re</code>, Go's RE2 and POSIX all have their own
		quirks, and RE2 deliberately omits backreferences and lookbehind.
	</Note>

	{#snippet explainer()}
		<p>
			A regular expression describes a pattern of characters. The engine walks your test string
			looking for the shortest path through the pattern that succeeds — which is why understanding
			greediness matters more than memorising syntax.
		</p>
		<h3>Greedy versus lazy</h3>
		<p>
			<code>&lt;.*&gt;</code> on <code>&lt;a&gt;text&lt;/a&gt;</code> matches the whole string, because
			<code>*</code> takes as much as it can and then backtracks only enough to succeed. Adding
			<code>?</code> makes it lazy: <code>&lt;.*?&gt;</code> matches just <code>&lt;a&gt;</code>.
			This single distinction accounts for a large share of “why does my regex match too much”.
		</p>
		<h3>Catastrophic backtracking</h3>
		<p>
			Nested quantifiers like <code>(a+)+b</code> can take exponential time on a non-matching input,
			because the engine tries every possible split. This is a real denial-of-service vector when
			patterns run on user input. Avoid nesting quantifiers, or use an engine like RE2 that
			guarantees linear time.
		</p>
		<h3>Do not parse HTML with regex</h3>
		<p>
			HTML is not a regular language — nesting is unbounded, so no regular expression can match
			balanced tags correctly. Use a parser. The pattern in the library above is for finding tags in
			plain text, not for understanding a document.
		</p>
		<h3>Email is harder than it looks</h3>
		<p>
			The fully RFC 5322 compliant email pattern is several thousand characters and still accepts
			addresses no mail server will deliver to. The pragmatic pattern above catches typos; the only
			real validation is sending a confirmation message.
		</p>
	{/snippet}
</ToolShell>

<style>
	.pattern-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.delim {
		font-family: var(--font-mono);
		font-size: 1.1rem;
		color: var(--text-faint);
	}
	.flags {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}
	.flag {
		width: 36px;
		height: 36px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--bg-raised);
		font-family: var(--font-mono);
		font-weight: 600;
		cursor: pointer;
	}
	.flag.active {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	textarea {
		min-height: 140px;
		font-size: 0.86rem;
	}
	.preview {
		margin-top: 0.6rem;
		padding: 0.6rem 0.7rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: 0.84rem;
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 200px;
		overflow-y: auto;
	}
	.hit {
		background: color-mix(in srgb, var(--accent) 38%, transparent);
		border-radius: 2px;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
	.group {
		display: inline-block;
		background: var(--bg-sunken);
		border-radius: 3px;
		padding: 0.05rem 0.35rem;
		margin-right: 0.3rem;
	}
	.out-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.3rem;
	}
	.out-head label {
		margin-bottom: 0;
	}
	.library {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	}
	.lib {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2rem;
		padding: 0.55rem 0.7rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		font-size: 0.86rem;
	}
	.lib:hover {
		border-color: var(--accent-border);
	}
	.lib code {
		font-size: 0.74rem;
		color: var(--text-muted);
		word-break: break-all;
	}
	.cheat {
		display: grid;
		gap: 0.3rem 1rem;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	}
	.cheat-row {
		display: flex;
		gap: 0.6rem;
		font-size: 0.85rem;
		align-items: baseline;
	}
	.cheat-row code {
		flex: none;
		min-width: 92px;
		color: var(--accent);
	}
	.cheat-row span {
		color: var(--text-muted);
	}
</style>
