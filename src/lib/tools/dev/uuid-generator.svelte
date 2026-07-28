<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Field from '$lib/components/Field.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ kind: 'v4', count: 10, uppercase: false, braces: false, hyphens: true });

	let seed = $state(0);

	function randomBytes(n: number): Uint8Array {
		return crypto.getRandomValues(new Uint8Array(n));
	}

	function formatUuid(bytes: Uint8Array): string {
		const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	}

	function v4(): string {
		return crypto.randomUUID();
	}

	/**
	 * UUID v7: 48-bit big-endian Unix milliseconds, then version and variant
	 * bits, then randomness. Sorts lexicographically by creation time.
	 */
	function v7(): string {
		const bytes = randomBytes(16);
		const now = BigInt(Date.now());
		for (let i = 0; i < 6; i++) {
			bytes[i] = Number((now >> BigInt(8 * (5 - i))) & 0xffn);
		}
		bytes[6] = (bytes[6] & 0x0f) | 0x70;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;
		return formatUuid(bytes);
	}

	const NANOID_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

	function nanoid(size = 21): string {
		const bytes = randomBytes(size);
		return [...bytes].map((b) => NANOID_ALPHABET[b & 63]).join('');
	}

	const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

	/** Crockford base32: 10 characters of timestamp, 16 of randomness. */
	function ulid(): string {
		let time = Date.now();
		let out = '';
		for (let i = 9; i >= 0; i--) {
			out = ULID_ALPHABET[time % 32] + out;
			time = Math.floor(time / 32);
		}
		const bytes = randomBytes(16);
		for (let i = 0; i < 16; i++) out += ULID_ALPHABET[bytes[i] & 31];
		return out;
	}

	function token(): string {
		return [...randomBytes(32)].map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	const ids = $derived.by(() => {
		void seed; // regenerate on demand
		const n = Math.max(1, Math.min(500, s.count));
		return Array.from({ length: n }, () => {
			let id =
				s.kind === 'v4' ? v4()
				: s.kind === 'v7' ? v7()
				: s.kind === 'nanoid' ? nanoid()
				: s.kind === 'ulid' ? ulid()
				: token();

			if (s.kind === 'v4' || s.kind === 'v7') {
				if (!s.hyphens) id = id.replace(/-/g, '');
				if (s.uppercase) id = id.toUpperCase();
				if (s.braces) id = `{${id}}`;
			}
			return id;
		});
	});

	const all = () => ids.join('\n');
</script>

<ToolShell {tool}>
	<div class="card stack">
		<div class="field-row">
			<Field label="Format" for="uu-kind">
				<select id="uu-kind" bind:value={s.kind}>
					<option value="v4">UUID v4 — random</option>
					<option value="v7">UUID v7 — time-ordered</option>
					<option value="ulid">ULID — sortable, 26 chars</option>
					<option value="nanoid">nanoid — 21 chars, URL-safe</option>
					<option value="token">Secure token — 256-bit hex</option>
				</select>
			</Field>
			<Field label="How many" for="uu-count"><input id="uu-count" type="number" min="1" max="500" bind:value={s.count} /></Field>
		</div>

		{#if s.kind === 'v4' || s.kind === 'v7'}
			<div class="checks">
				<label class="check"><input type="checkbox" bind:checked={s.hyphens} /> Hyphens</label>
				<label class="check"><input type="checkbox" bind:checked={s.uppercase} /> Uppercase</label>
				<label class="check"><input type="checkbox" bind:checked={s.braces} /> Braces</label>
			</div>
		{/if}

		<div class="row">
			<button type="button" class="btn btn-primary" onclick={() => (seed += 1)}>
				<Icon name="reset" size={16} /> Generate new
			</button>
			<CopyButton value={all} label="Copy all {ids.length}" />
		</div>
	</div>

	<section class="card">
		<div class="list">
			{#each ids as id, i (i)}
				<div class="id">
					<code>{id}</code>
					<CopyButton value={id} compact label="Copy this ID" />
				</div>
			{/each}
		</div>
	</section>

	{#snippet explainer()}
		<p>
			All of these are generated with <code>crypto.getRandomValues</code>, the browser's
			cryptographically secure random source — not <code>Math.random</code>, which is predictable and
			unsuitable for identifiers that must not be guessable.
		</p>
		<h3>v4 versus v7</h3>
		<p>
			A <strong>v4</strong> UUID is 122 bits of randomness. Excellent for uniqueness, terrible as a
			database primary key: consecutive inserts land at random positions in the B-tree index, causing
			page splits and poor cache locality.
		</p>
		<p>
			<strong>v7</strong> (standardised in RFC 9562, 2024) puts a 48-bit millisecond timestamp in the
			leading bits, so new IDs sort after old ones and inserts append to the end of the index. It
			keeps 74 bits of randomness — still far more than enough — and is the better default for new
			systems. The trade-off is that it leaks creation time.
		</p>
		<h3>Collision odds</h3>
		<p>
			Generating a billion v4 UUIDs a second for a century gives roughly a 50% chance of one
			collision. In practice, uniqueness is not the thing to worry about.
		</p>
		<h3>ULID and nanoid</h3>
		<p>
			<strong>ULID</strong> is 26 Crockford-base32 characters, lexicographically sortable by time,
			with no ambiguous characters (no I, L, O or U). <strong>nanoid</strong> is 21 URL-safe
			characters with collision resistance comparable to a UUID in 40% less space — useful for short
			public URLs.
		</p>
		<h3>Do not use UUIDs as secrets</h3>
		<p>
			A v4 UUID is unguessable, but a v1 or v7 one is not — the timestamp is right there in the
			value. For session tokens, API keys and password-reset links, use the secure token option, which
			is 256 bits from the CSPRNG with no structure at all.
		</p>
	{/snippet}
</ToolShell>

<style>
	.checks {
		display: flex;
		gap: 1.25rem;
		flex-wrap: wrap;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 520px;
		overflow-y: auto;
	}
	.id {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.3rem 0.5rem;
		border-radius: var(--radius-sm);
	}
	.id:hover {
		background: var(--bg-sunken);
	}
	.id code {
		font-size: 0.86rem;
		word-break: break-all;
	}
	.id :global(.btn) {
		opacity: 0;
	}
	.id:hover :global(.btn) {
		opacity: 1;
	}
	@media (hover: none) {
		.id :global(.btn) {
			opacity: 1;
		}
	}
</style>
