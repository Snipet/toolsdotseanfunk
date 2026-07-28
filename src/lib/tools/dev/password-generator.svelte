<script lang="ts">
	import { fmtLoose } from '$lib/format';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({
		mode: 'random',
		length: 20,
		lower: true,
		upper: true,
		digits: true,
		symbols: true,
		excludeAmbiguous: false,
		wordCount: 5,
		separator: '-',
		capitalise: false,
		count: 5
	});

	let seed = $state(0);

	const LOWER = 'abcdefghijklmnopqrstuvwxyz';
	const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const DIGITS = '0123456789';
	const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?';
	const AMBIGUOUS = 'Il1O0o';

	/**
	 * A compact diceware-style list. Real diceware uses 7,776 words; this is a
	 * 256-word subset, so each word contributes 8 bits rather than 12.9.
	 */
	const WORDS = (
		'able acid aged also area army away baby back ball band bank base bath bear beat been beer bell belt bend best bike bird blue boat body bold bone book boot born both bowl bulk burn bush busy cake calm came camp card care cart case cash cast cell chat chip city clay clip club coal coat code cold come cook cool cope copy cord core corn cost crew crop cure cute damp dark data date dawn days dead deal dear debt deck deep deer desk dial diet dirt dish disk dive dock does dome done door dose down draw drop drum dual duck dust duty each earn ease east easy edge exit face fact fade fail fair fall fame farm fast fate fear feed feel feet fell felt file fill film find fine fire firm fish five flag flat flew flip flow foam fold folk food foot ford form fort four free frog from fuel full fund gain game gate gave gear gene gift girl give glad glow goal goat gold golf gone good gray grew grid grin grip grow gulf hair half hall halt hand hang hard harm hate have hawk head heal heap hear heat held hell helm help herb herd here hero hide high hill hint hire hold hole holy home hood hook hope horn hose host hour huge hunt hurt icon idea idle inch iron item jazz join joke jump jury just keen keep kept kick kind king kiss kite knee knew knot know lack lady lake lamb lamp land lane last late lawn lazy lead leaf lean leap left lend lens less lift like limb lime line link lion list live load loan lock loft logo long look loop lord lose loss lost loud love luck lump lung made mail main make male mall many mark mask mass mast mate math meal mean meat meet melt memo mend menu mesh mile milk mill mind mine mint miss mist mode mold mole monk mood moon more moss most moth move much mule name near neat neck need nest news next nice nine node none noon norm nose note noun oath obey odds oily okay omit once only onto open oral oven over pace pack page paid pain pair pale palm park part pass past path peak pear peer pens pest pick pier pile pine pink pipe pity plan play plot plug plum plus poem poet pole poll pond pool poor pork port pose post pour pull pump pure push quit quiz race rack rage raid rail rain rake ramp rank rare rate read real reef reel rely rent rest rice rich ride ring riot rise risk road roam robe rock role roll roof room root rope rose rout rule rush rust safe sage sail salt same sand save scan seal seat seed seek seem seen self sell send sent shed ship shoe shop shot show shut side sign silk sing sink site size skin skip slab slam sled slid slim slip slot slow snap snow soap sock soft soil sold sole solo some song soon sort soul soup sour span spin spot spun spur star stay stem step stir stop stub such suit sump sung sunk sure surf swan swap swim tail take tale talk tall tank tape task team tear tell tend tent term test text than that them then they thin this thus tide tidy tile till time tint tiny tips tire toad toll tomb tone took tool torn toss tour town trap tray tree trim trip true tube tuck tune turn twin type unit upon urge used user vain vary vast verb very vest view vine visa void volt vote wade wage wait wake walk wall want ward warm warn wash wasp wave wear weed week well went were west what when whip whom wide wife wild will wind wine wing wipe wire wise wish with wolf wood wool word wore work worm worn wrap yard yarn yeah year yell your zeal zero zinc zone zoom'
	).split(' ');

	const alphabet = $derived.by(() => {
		let chars = '';
		if (s.lower) chars += LOWER;
		if (s.upper) chars += UPPER;
		if (s.digits) chars += DIGITS;
		if (s.symbols) chars += SYMBOLS;
		if (s.excludeAmbiguous) chars = [...chars].filter((c) => !AMBIGUOUS.includes(c)).join('');
		return chars;
	});

	/** Rejection sampling — modulo would bias toward the earlier characters. */
	function pick(pool: string): string {
		const limit = Math.floor(256 / pool.length) * pool.length;
		const buffer = new Uint8Array(1);
		for (;;) {
			crypto.getRandomValues(buffer);
			if (buffer[0] < limit) return pool[buffer[0] % pool.length];
		}
	}

	function makeRandom(): string {
		if (!alphabet) return '';
		return Array.from({ length: s.length }, () => pick(alphabet)).join('');
	}

	function makePassphrase(): string {
		const parts = Array.from({ length: s.wordCount }, () => {
			const word = WORDS[crypto.getRandomValues(new Uint32Array(1))[0] % WORDS.length];
			return s.capitalise ? word.charAt(0).toUpperCase() + word.slice(1) : word;
		});
		if (s.digits) parts.push(String(crypto.getRandomValues(new Uint32Array(1))[0] % 100).padStart(2, '0'));
		return parts.join(s.separator);
	}

	const passwords = $derived.by(() => {
		void seed;
		return Array.from({ length: Math.max(1, Math.min(20, s.count)) }, () =>
			s.mode === 'random' ? makeRandom() : makePassphrase()
		);
	});

	const entropy = $derived(
		s.mode === 'random'
			? alphabet.length > 1 ? s.length * Math.log2(alphabet.length) : 0
			: s.wordCount * Math.log2(WORDS.length) + (s.digits ? Math.log2(100) : 0)
	);

	const strength = $derived(
		entropy >= 128 ? { label: 'Excellent', tone: 'positive' as const }
		: entropy >= 80 ? { label: 'Strong', tone: 'positive' as const }
		: entropy >= 60 ? { label: 'Reasonable', tone: 'warning' as const }
		: entropy >= 40 ? { label: 'Weak', tone: 'warning' as const }
		: { label: 'Very weak', tone: 'negative' as const }
	);

	/** Offline attack at 10^12 guesses per second — a well-funded adversary. */
	const crackTime = $derived.by(() => {
		const seconds = Math.pow(2, entropy - 1) / 1e12;
		if (seconds < 1) return 'instantly';
		const units: Array<[number, string]> = [
			[1, 'second'], [60, 'minute'], [3600, 'hour'], [86400, 'day'],
			[31557600, 'year'], [31557600e3, 'thousand years'], [31557600e6, 'million years'],
			[31557600e9, 'billion years']
		];
		let chosen = units[0];
		for (const unit of units) if (seconds >= unit[0]) chosen = unit;
		const value = seconds / chosen[0];
		return `${value > 1e6 ? value.toExponential(2) : fmtLoose(value, 1)} ${chosen[1]}${value === 1 || chosen[1].includes(' ') ? '' : 's'}`;
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="row no-print">
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'random'} onclick={() => (s.mode = 'random')}>Random characters</button>
			<button type="button" class="btn btn-sm" class:btn-primary={s.mode === 'passphrase'} onclick={() => (s.mode = 'passphrase')}>Passphrase</button>
		</div>

		{#if s.mode === 'random'}
			<Field label="Length: {s.length} characters" for="pw-length">
				<input id="pw-length" type="range" min="6" max="64" bind:value={s.length} />
			</Field>
			<div class="checks">
				<label class="check"><input type="checkbox" bind:checked={s.lower} /> a–z</label>
				<label class="check"><input type="checkbox" bind:checked={s.upper} /> A–Z</label>
				<label class="check"><input type="checkbox" bind:checked={s.digits} /> 0–9</label>
				<label class="check"><input type="checkbox" bind:checked={s.symbols} /> Symbols</label>
				<label class="check"><input type="checkbox" bind:checked={s.excludeAmbiguous} /> Exclude lookalikes (Il1O0o)</label>
			</div>
		{:else}
			<div class="field-row">
				<Field label="Words: {s.wordCount}" for="pw-words">
					<input id="pw-words" type="range" min="3" max="10" bind:value={s.wordCount} />
				</Field>
				<Field label="Separator" for="pw-sep">
					<select id="pw-sep" bind:value={s.separator}>
						<option value="-">Hyphen</option>
						<option value=".">Dot</option>
						<option value="_">Underscore</option>
						<option value=" ">Space</option>
					</select>
				</Field>
			</div>
			<div class="checks">
				<label class="check"><input type="checkbox" bind:checked={s.capitalise} /> Capitalise words</label>
				<label class="check"><input type="checkbox" bind:checked={s.digits} /> Append digits</label>
			</div>
		{/if}

		<div class="results-grid">
			<Result label="Entropy" primary value={`${fmtLoose(entropy, 1)} bits`} tone={strength.tone} detail={strength.label} copyable={false} />
			<Result label="Time to crack offline" value={crackTime} detail="At 10¹² guesses a second" copyable={false} />
			<Result label="Alphabet size" value={s.mode === 'random' ? `${alphabet.length} characters` : `${WORDS.length} words`} copyable={false} />
		</div>

		<div class="row">
			<button type="button" class="btn btn-primary" onclick={() => (seed += 1)}><Icon name="reset" size={16} /> Generate new</button>
			<Field label="How many" for="pw-count"><input id="pw-count" type="number" min="1" max="20" bind:value={s.count} /></Field>
		</div>
	</div>

	<section class="card">
		<div class="list">
			{#each passwords as password, i (i)}
				<div class="pw">
					<code>{password}</code>
					<CopyButton value={password} compact label="Copy password" />
				</div>
			{/each}
		</div>
	</section>

	<Note>
		Passwords are generated locally with <code>crypto.getRandomValues</code> and never leave this
		tab. They are not stored, logged or transmitted — reloading the page loses them, so copy what you
		need into a password manager.
	</Note>

	{#snippet explainer()}
		<p>
			Password strength is measured in bits of entropy — the base-2 logarithm of how many equally
			likely passwords the generator could have produced.
		</p>
		<code class="formula">random:     entropy = length × log₂(alphabet size)
passphrase: entropy = words  × log₂(wordlist size)</code>
		<h3>Length beats complexity</h3>
		<p>
			A 20-character lowercase-only password carries 94 bits. A 10-character password using every
			symbol on the keyboard carries 65. Adding characters multiplies the search space far faster
			than adding character classes does — which is why every modern guideline, including NIST
			SP 800-63B, favours length and has dropped mandatory complexity rules.
		</p>
		<h3>Passphrases</h3>
		<p>
			Randomly chosen words are memorable and long. The critical word is <em>randomly</em>: a
			phrase you invented yourself carries far less entropy than the word count suggests, because
			human word choice is highly predictable. This generator picks each word with the CSPRNG.
		</p>
		<p>
			Note that this uses a 256-word list, so each word contributes 8 bits. Standard EFF diceware
			uses 7,776 words at 12.9 bits each — five diceware words give about 65 bits, six about 77.
		</p>
		<h3>Reading the crack time</h3>
		<p>
			The estimate assumes an offline attack against a fast hash at a trillion guesses a second. It
			does not apply to a well-implemented site using bcrypt or Argon2 with rate limiting, where the
			realistic rate is many orders of magnitude lower. It also assumes the attacker knows your
			generation scheme, which is the conservative assumption.
		</p>
		<h3>Reuse is the real risk</h3>
		<p>
			Most account compromises come from credential stuffing — a password leaked from one breached
			site tried everywhere else. A unique password per site, stored in a password manager, plus
			multi-factor authentication, matters far more than the last ten bits of entropy.
		</p>
	{/snippet}
</ToolShell>

<style>
	.checks {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.pw {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.4rem 0.5rem;
		border-radius: var(--radius-sm);
	}
	.pw:hover {
		background: var(--bg-sunken);
	}
	.pw code {
		font-size: 1rem;
		word-break: break-all;
		letter-spacing: 0.02em;
	}
	.row :global(.field) {
		width: 110px;
	}
</style>
