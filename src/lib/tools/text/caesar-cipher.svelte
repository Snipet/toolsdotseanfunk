<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ text: 'Attack at dawn', shift: 3, mode: 'caesar', key: 'lemon' });

	function caesar(text: string, shift: number): string {
		const n = ((shift % 26) + 26) % 26;
		return text.replace(/[a-z]/gi, (c) => {
			const base = c === c.toUpperCase() ? 65 : 97;
			return String.fromCharCode(((c.charCodeAt(0) - base + n) % 26) + base);
		});
	}

	function atbash(text: string): string {
		return text.replace(/[a-z]/gi, (c) => {
			const base = c === c.toUpperCase() ? 65 : 97;
			return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base));
		});
	}

	function vigenere(text: string, key: string, decrypt = false): string {
		const cleanKey = key.toLowerCase().replace(/[^a-z]/g, '');
		if (!cleanKey) return text;
		let i = 0;
		return text.replace(/[a-z]/gi, (c) => {
			const base = c === c.toUpperCase() ? 65 : 97;
			const shift = cleanKey.charCodeAt(i % cleanKey.length) - 97;
			i++;
			const offset = decrypt ? 26 - shift : shift;
			return String.fromCharCode(((c.charCodeAt(0) - base + offset) % 26) + base);
		});
	}

	const output = $derived.by(() => {
		switch (s.mode) {
			case 'caesar': return caesar(s.text, s.shift);
			case 'rot13': return caesar(s.text, 13);
			case 'atbash': return atbash(s.text);
			case 'vigenere': return vigenere(s.text, s.key);
			default: return vigenere(s.text, s.key, true);
		}
	});

	/**
	 * Brute force: all 25 shifts, scored by how English-like the result is.
	 * Frequency scoring beats nothing, and for a Caesar cipher it is enough.
	 */
	const COMMON = ['the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but', 'his', 'from', 'they', 'attack', 'dawn'];

	const cracked = $derived(
		Array.from({ length: 26 }, (_, shift) => {
			const candidate = caesar(s.text, -shift);
			const lower = candidate.toLowerCase();
			const score = COMMON.reduce((acc, word) => acc + (lower.includes(word) ? word.length : 0), 0);
			return { shift, candidate, score };
		}).sort((a, b) => b.score - a.score || a.shift - b.shift)
	);
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field label="Cipher" for="cc-mode">
			<select id="cc-mode" bind:value={s.mode}>
				<option value="caesar">Caesar (shift)</option>
				<option value="rot13">ROT13</option>
				<option value="atbash">Atbash (reverse alphabet)</option>
				<option value="vigenere">Vigenère — encrypt</option>
				<option value="vigenere-decrypt">Vigenère — decrypt</option>
			</select>
		</Field>

		{#if s.mode === 'caesar'}
			<Field label="Shift: {s.shift}" for="cc-shift">
				<input id="cc-shift" type="range" min="-25" max="25" bind:value={s.shift} />
			</Field>
		{:else if s.mode.startsWith('vigenere')}
			<Field label="Keyword" for="cc-key" hint="Letters only; repeated across the message">
				<input id="cc-key" type="text" bind:value={s.key} autocomplete="off" spellcheck="false" />
			</Field>
		{/if}

		<Field label="Text" for="cc-text">
			<textarea id="cc-text" bind:value={s.text} rows="4" spellcheck="false"></textarea>
		</Field>

		<Result label="Output" primary value={output || '—'} />

		<div class="row no-print">
			<button type="button" class="btn btn-sm" onclick={() => (s.text = output)}>Use output as input</button>
			<CopyButton value={() => output} label="Copy output" />
		</div>

		<Note tone="warning">
			These are historical ciphers with no security value whatsoever. A Caesar cipher has 25 possible
			keys and is broken by inspection; Vigenère fell to Kasiski analysis in the 1860s. Use them for
			puzzles and teaching, never for anything you need kept private.
		</Note>
	</div>

	{#if s.mode === 'caesar' || s.mode === 'rot13'}
		<section class="card">
			<h2>Brute-force cracker</h2>
			<p class="small muted">All 26 shifts, most English-looking first.</p>
			<div class="scroll-x">
				<table class="data">
					<thead><tr><th class="num">Shift</th><th>Plaintext</th></tr></thead>
					<tbody>
						{#each cracked as row (row.shift)}
							<tr class:likely={row.score > 0 && row === cracked[0]}>
								<td class="num">{row.shift}</td>
								<td class="mono">
									<button type="button" class="pick" onclick={() => { s.mode = 'caesar'; s.shift = -row.shift; }}>
										{row.candidate}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			A substitution cipher replaces each letter with another. The Caesar cipher shifts every letter
			by a fixed amount — Suetonius records Julius Caesar using a shift of three for military
			correspondence.
		</p>
		<code class="formula">encrypt: E(x) = (x + k) mod 26
decrypt: D(x) = (x − k) mod 26</code>
		<h3>ROT13 is its own inverse</h3>
		<p>
			With a shift of 13 — exactly half the alphabet — encrypting twice returns the original. That
			is why one function serves both directions, and why Usenet adopted it for hiding spoilers and
			punchlines. It was never meant as encryption.
		</p>
		<h3>Atbash</h3>
		<p>
			An older scheme still: A becomes Z, B becomes Y, and so on. It appears in the Hebrew Bible,
			and like ROT13 it is self-inverse.
		</p>
		<h3>Vigenère was “le chiffre indéchiffrable”</h3>
		<p>
			Using a keyword to vary the shift letter by letter defeats simple frequency analysis, because
			the same plaintext letter encrypts differently depending on its position. It held its
			reputation for three centuries until Kasiski published a method for finding the key length
			from repeated patterns in the ciphertext — after which it fell quickly.
		</p>
		<h3>Why frequency analysis works</h3>
		<p>
			English letter frequencies are stable and lopsided: E is about 12% of all letters, T about 9%,
			and Z under 0.1%. Any cipher that maps each letter to exactly one other letter preserves those
			frequencies, so the pattern gives it away with only a paragraph of text.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 100px;
	}
	tr.likely {
		background: var(--accent-soft);
		font-weight: 600;
	}
	.pick {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: inherit;
		cursor: pointer;
		text-align: left;
	}
	.pick:hover {
		color: var(--accent);
	}
</style>
