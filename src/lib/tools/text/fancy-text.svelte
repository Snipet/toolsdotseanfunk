<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ text: 'tools[dot]seanfunk' });

	const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const LOWER = 'abcdefghijklmnopqrstuvwxyz';
	const DIGITS = '0123456789';

	/** Map ASCII onto a contiguous Unicode block starting at these code points. */
	function mathMap(upperStart: number, lowerStart: number, digitStart?: number) {
		return (text: string) =>
			[...text]
				.map((c) => {
					const u = UPPER.indexOf(c);
					if (u >= 0) return String.fromCodePoint(upperStart + u);
					const l = LOWER.indexOf(c);
					if (l >= 0) return String.fromCodePoint(lowerStart + l);
					const d = DIGITS.indexOf(c);
					if (d >= 0 && digitStart) return String.fromCodePoint(digitStart + d);
					return c;
				})
				.join('');
	}

	/** Blocks with reserved holes need an explicit table. */
	function tableMap(upper: string, lower: string) {
		const upperChars = [...upper];
		const lowerChars = [...lower];
		return (text: string) =>
			[...text]
				.map((c) => {
					const u = UPPER.indexOf(c);
					if (u >= 0 && upperChars[u]) return upperChars[u];
					const l = LOWER.indexOf(c);
					if (l >= 0 && lowerChars[l]) return lowerChars[l];
					return c;
				})
				.join('');
	}

	const FLIP: Record<string, string> = {
		a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ',
		k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ',
		u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
		A: '∀', B: 'B', C: 'Ɔ', D: 'D', E: 'Ǝ', F: 'Ⅎ', G: 'פ', H: 'H', I: 'I', J: 'ſ',
		K: 'K', L: '˥', M: 'W', N: 'N', O: 'O', P: 'Ԁ', Q: 'Q', R: 'R', S: 'S', T: '┴',
		U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z',
		'1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8', '9': '6', '0': '0',
		'.': '˙', ',': "'", '?': '¿', '!': '¡', "'": ',', '"': '„', '(': ')', ')': '(', '[': ']', ']': '[', '_': '‾', '&': '⅋'
	};

	const STYLES: Array<{ name: string; fn: (t: string) => string; warn?: boolean }> = [
		{ name: 'Bold', fn: mathMap(0x1d400, 0x1d41a, 0x1d7ce) },
		{ name: 'Italic', fn: tableMap('𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍', '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧') },
		{ name: 'Bold italic', fn: mathMap(0x1d468, 0x1d482) },
		{ name: 'Script', fn: tableMap('𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵', '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏') },
		{ name: 'Bold script', fn: mathMap(0x1d4d0, 0x1d4ea) },
		{ name: 'Fraktur', fn: tableMap('𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ', '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷') },
		{ name: 'Double-struck', fn: tableMap('𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ', '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫') },
		{ name: 'Monospace', fn: mathMap(0x1d670, 0x1d68a, 0x1d7f6) },
		{ name: 'Sans-serif bold', fn: mathMap(0x1d5d4, 0x1d5ee, 0x1d7ec) },
		{ name: 'Circled', fn: mathMap(0x24b6, 0x24d0) },
		{ name: 'Squared', fn: (t) => [...t].map((c) => (UPPER.includes(c.toUpperCase()) && /[a-z]/i.test(c) ? String.fromCodePoint(0x1f130 + UPPER.indexOf(c.toUpperCase())) : c)).join('') },
		{ name: 'Full width', fn: (t) => [...t].map((c) => (c >= '!' && c <= '~' ? String.fromCodePoint(c.codePointAt(0)! + 0xfee0) : c === ' ' ? '　' : c)).join('') },
		{ name: 'Small caps', fn: tableMap('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘqʀꜱᴛᴜᴠᴡxʏᴢ') },
		{ name: 'Superscript', fn: tableMap('ᴬᴮꟲᴰᴱꟳᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾQᴿˢᵀᵁⱽᵂˣʸᶻ', 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ') },
		{ name: 'Upside down', fn: (t) => [...t].reverse().map((c) => FLIP[c] ?? c).join('') },
		{ name: 'Strikethrough', fn: (t) => [...t].map((c) => c + '̶').join('') },
		{ name: 'Underline', fn: (t) => [...t].map((c) => c + '̲').join('') },
		{ name: 'Spaced out', fn: (t) => [...t].join(' ') },
		{ name: 'Mocking case', fn: (t) => [...t].map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join('') }
	];

	const results = $derived(
		STYLES.map((style) => {
			try {
				return { name: style.name, value: style.fn(s.text) };
			} catch {
				return { name: style.name, value: s.text };
			}
		})
	);
</script>

<ToolShell {tool}>
	<div class="card">
		<label for="ft-text">Your text</label>
		<input id="ft-text" type="text" bind:value={s.text} autocomplete="off" />
	</div>

	<Note tone="warning">
		These are not fonts — they are separate Unicode characters that happen to look like styled
		letters. Screen readers announce them character by character or skip them entirely, and search
		engines cannot match them to ordinary text. Fine for a username or a one-off post; never use them
		for body copy, headings or anything that needs to be found or read aloud.
	</Note>

	<div class="styles">
		{#each results as result (result.name)}
			<div class="style">
				<div class="style-head">
					<span class="style-name">{result.name}</span>
					<CopyButton value={result.value} compact label="Copy {result.name}" />
				</div>
				<output class="style-value">{result.value}</output>
			</div>
		{/each}
	</div>

	{#snippet explainer()}
		<p>
			Unicode contains blocks of mathematical alphanumeric symbols — bold, italic, script, Fraktur,
			double-struck — intended for mathematical notation, where the distinction between
			<em>x</em> and <strong>x</strong> carries meaning that plain formatting cannot survive in plain
			text. Social platforms strip formatting, so people repurpose these characters to fake it.
		</p>
		<h3>Why the letters look inconsistent</h3>
		<p>
			The blocks have holes. Several italic and script letters were encoded earlier as individual
			“letterlike symbols” — ℯ, ℊ, ℋ, ℛ — so the ranges skip those positions and reuse the older
			code points. That is why this tool uses explicit tables for those styles rather than simple
			arithmetic, and why some styles render inconsistently across fonts.
		</p>
		<h3>The accessibility cost is real</h3>
		<p>
			A screen reader encountering 𝓱𝓮𝓵𝓵𝓸 may read “mathematical bold script small h, mathematical
			bold script small e…” or say nothing at all. Text search will not find it. Auto-translation
			fails on it. This is a genuine barrier, not a stylistic preference.
		</p>
		<h3>Combining characters</h3>
		<p>
			Strikethrough and underline work differently: they append a combining mark after each
			character, so the base letters remain ordinary and searchable. Those two are the safest of the
			set — though they can still render oddly depending on the font.
		</p>
	{/snippet}
</ToolShell>

<style>
	.styles {
		display: grid;
		gap: 0.6rem;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	}
	.style {
		background: var(--bg-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.7rem 0.85rem;
	}
	.style-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.2rem;
	}
	.style-name {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 700;
		color: var(--text-muted);
	}
	.style-value {
		display: block;
		font-size: 1.05rem;
		line-height: 1.6;
		word-break: break-word;
	}
</style>
