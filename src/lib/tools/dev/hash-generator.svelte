<script lang="ts">
	import { bytes } from '$lib/format';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;

	let text = $state('tools[dot]seanfunk');
	let hashes = $state<Record<string, string>>({});
	let fileInfo = $state<{ name: string; size: number } | null>(null);
	let compareTo = $state('');
	let busy = $state(false);

	function toHex(buffer: ArrayBuffer): string {
		return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	async function hashData(data: BufferSource) {
		const out: Record<string, string> = {};
		for (const algorithm of ALGORITHMS) {
			out[algorithm] = toHex(await crypto.subtle.digest(algorithm, data));
		}
		hashes = out;
	}

	// Recompute whenever the text changes; SubtleCrypto is async so this
	// cannot be a plain derived value.
	$effect(() => {
		const value = text;
		fileInfo = null;
		void hashData(new TextEncoder().encode(value));
	});

	async function onFile(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;
		busy = true;
		try {
			const buffer = await file.arrayBuffer();
			fileInfo = { name: file.name, size: file.size };
			await hashData(buffer);
		} finally {
			busy = false;
		}
	}

	const comparison = $derived.by(() => {
		const target = compareTo.trim().toLowerCase();
		if (!target) return null;
		const match = Object.entries(hashes).find(([, value]) => value === target);
		return match ? { ok: true as const, algorithm: match[0] } : { ok: false as const };
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<label for="hg-text">Text to hash</label>
		<textarea id="hg-text" bind:value={text} rows="4" spellcheck="false"></textarea>

		<div class="row">
			<label class="file-btn btn btn-sm">
				Hash a file instead
				<input type="file" onchange={onFile} class="visually-hidden" />
			</label>
			{#if fileInfo}
				<span class="small muted">{fileInfo.name} — {bytes(fileInfo.size)}</span>
			{/if}
			{#if busy}<span class="small muted">Hashing…</span>{/if}
		</div>
	</div>

	<div class="hashes">
		{#each ALGORITHMS as algorithm (algorithm)}
			<div class="hash" class:match={comparison?.ok && comparison.algorithm === algorithm}>
				<div class="hash-head">
					<span class="hash-name">{algorithm}</span>
					<CopyButton value={hashes[algorithm] ?? ''} compact label="Copy {algorithm}" />
				</div>
				<output class="hash-value mono">{hashes[algorithm] ?? '…'}</output>
			</div>
		{/each}
	</div>

	<section class="card stack">
		<label for="hg-compare">Compare against a known hash</label>
		<input id="hg-compare" type="text" class="mono" bind:value={compareTo} placeholder="Paste a checksum to verify" autocomplete="off" spellcheck="false" />
		{#if comparison}
			{#if comparison.ok}
				<p class="verdict good">✓ Matches the {comparison.algorithm} hash.</p>
			{:else}
				<p class="verdict bad">✗ No match against any of the four algorithms.</p>
			{/if}
		{/if}
	</section>

	<Note>
		Hashing uses the browser's built-in Web Crypto implementation, so files never leave your machine —
		which is exactly what you want when verifying a download.
	</Note>

	{#snippet explainer()}
		<p>
			A cryptographic hash turns any input into a fixed-length fingerprint. The same input always
			produces the same output, a one-character change produces a completely different one, and
			working backwards from the hash to the input is computationally infeasible.
		</p>
		<h3>Verifying a download</h3>
		<p>
			Projects publish the SHA-256 of their release files. Hash the file you downloaded and compare:
			a match means the bytes are exactly what was published, ruling out both corruption and
			tampering in transit. Paste the published checksum above and the tool will tell you which
			algorithm it matches.
		</p>
		<h3>SHA-1 and MD5 are broken</h3>
		<p>
			Both have practical collision attacks — Google demonstrated a SHA-1 collision on two different
			PDFs in 2017. SHA-1 is included here because legacy systems still use it, not because it should
			be chosen for anything new. MD5 is not offered at all; browsers do not implement it in Web
			Crypto, which is a reasonable signal.
		</p>
		<h3>Do not hash passwords with these</h3>
		<p>
			SHA-256 is designed to be fast, which is exactly wrong for password storage — it lets an
			attacker try billions of guesses per second. Password hashing needs a deliberately slow,
			salted algorithm: <strong>Argon2id</strong>, <strong>scrypt</strong> or <strong>bcrypt</strong>.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 100px;
	}
	.file-btn {
		cursor: pointer;
	}
	.hashes {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.hash {
		background: var(--bg-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.7rem 0.85rem;
	}
	.hash.match {
		border-color: var(--positive);
		background: color-mix(in srgb, var(--positive) 8%, var(--bg-raised));
	}
	.hash-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.2rem;
	}
	.hash-name {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 700;
		color: var(--text-muted);
	}
	.hash-value {
		display: block;
		font-size: 0.82rem;
		word-break: break-all;
		line-height: 1.6;
	}
	.verdict {
		font-weight: 600;
		font-size: 0.92rem;
	}
	.verdict.good {
		color: var(--positive);
	}
	.verdict.bad {
		color: var(--negative);
	}
</style>
