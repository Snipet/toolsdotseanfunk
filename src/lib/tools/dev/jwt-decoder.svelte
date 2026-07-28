<script lang="ts">
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	// A sample token with an obviously-fake signature, so nobody pastes a real one to try it.
	let token = $state(
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImFkbWluIjp0cnVlLCJpYXQiOjE3NTM3MTIwMDAsImV4cCI6MTc4NTI0ODAwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
	);

	function decodeSegment(segment: string): unknown {
		let normalised = segment.replace(/-/g, '+').replace(/_/g, '/');
		while (normalised.length % 4) normalised += '=';
		const binary = atob(normalised);
		const codes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		return JSON.parse(new TextDecoder().decode(codes));
	}

	const parts = $derived(token.trim().split('.'));

	const decoded = $derived.by(() => {
		if (parts.length !== 3) return { ok: false as const, error: 'A JWT has three dot-separated parts.' };
		try {
			return {
				ok: true as const,
				header: decodeSegment(parts[0]) as Record<string, unknown>,
				payload: decodeSegment(parts[1]) as Record<string, unknown>,
				signature: parts[2]
			};
		} catch {
			return { ok: false as const, error: 'Could not decode — the header or payload is not valid Base64URL JSON.' };
		}
	});

	const CLAIM_NAMES: Record<string, string> = {
		iss: 'Issuer', sub: 'Subject', aud: 'Audience', exp: 'Expires at', nbf: 'Not valid before',
		iat: 'Issued at', jti: 'JWT ID', scope: 'Scope', azp: 'Authorised party', typ: 'Type'
	};

	const timeClaims = $derived.by(() => {
		if (!decoded.ok) return [];
		return ['exp', 'iat', 'nbf']
			.filter((claim) => typeof decoded.payload[claim] === 'number')
			.map((claim) => {
				const seconds = decoded.payload[claim] as number;
				const date = new Date(seconds * 1000);
				return {
					claim,
					name: CLAIM_NAMES[claim],
					date,
					relative: relative(date)
				};
			});
	});

	function relative(date: Date): string {
		const diff = date.getTime() - Date.now();
		const abs = Math.abs(diff);
		const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
		const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [
			[31556952000, 'year'], [2629746000, 'month'], [86400000, 'day'],
			[3600000, 'hour'], [60000, 'minute'], [1000, 'second']
		];
		for (const [ms, unit] of units) if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
		return 'now';
	}

	const expired = $derived.by(() => {
		if (!decoded.ok) return null;
		const exp = decoded.payload.exp;
		if (typeof exp !== 'number') return null;
		return exp * 1000 < Date.now();
	});
</script>

<ToolShell {tool}>
	<div class="card stack">
		<label for="jwt-input">Token</label>
		<textarea id="jwt-input" bind:value={token} rows="5" spellcheck="false" class="mono"></textarea>

		{#if parts.length === 3}
			<p class="segments mono small">
				<span class="seg header">{parts[0]}</span><span class="dot">.</span><span class="seg payload">{parts[1]}</span><span class="dot">.</span><span class="seg signature">{parts[2]}</span>
			</p>
		{/if}

		<Note tone="warning">
			Decoding happens entirely in this tab — the token is never sent anywhere. Even so, a JWT is a
			bearer credential: anyone holding it can act as you until it expires. Prefer a test token, and
			revoke anything you paste into any online decoder.
		</Note>
	</div>

	{#if !decoded.ok}
		<Note tone="warning">{decoded.error}</Note>
	{:else}
		<div class="results-grid">
			<Result label="Algorithm" primary value={String(decoded.header.alg ?? 'unknown')} tone={decoded.header.alg === 'none' ? 'negative' : 'neutral'} />
			<Result label="Type" value={String(decoded.header.typ ?? '—')} />
			{#if expired !== null}
				<Result label="Status" primary value={expired ? 'Expired' : 'Not expired'} tone={expired ? 'negative' : 'positive'} />
			{/if}
			{#if decoded.header.kid}<Result label="Key ID" value={String(decoded.header.kid)} />{/if}
		</div>

		{#if timeClaims.length}
			<section class="card">
				<h2>Timestamps</h2>
				<div class="scroll-x">
					<table class="data">
						<thead><tr><th>Claim</th><th>Meaning</th><th>Value</th><th>When</th></tr></thead>
						<tbody>
							{#each timeClaims as claim (claim.claim)}
								<tr>
									<td class="mono">{claim.claim}</td>
									<td>{claim.name}</td>
									<td>{claim.date.toLocaleString('en-US')}</td>
									<td class="muted">{claim.relative}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}

		<div class="tool-card-grid">
			<section class="card">
				<h2 class="header-title">Header</h2>
				<pre class="json">{JSON.stringify(decoded.header, null, 2)}</pre>
			</section>
			<section class="card">
				<h2 class="payload-title">Payload</h2>
				<pre class="json">{JSON.stringify(decoded.payload, null, 2)}</pre>
			</section>
		</div>

		<section class="card">
			<h2 class="signature-title">Signature</h2>
			<p class="small muted">
				Verifying this requires the signing key, which is not something to paste into a web page.
				Verify server-side, with the algorithm pinned.
			</p>
			<pre class="json sig">{decoded.signature}</pre>
		</section>
	{/if}

	{#snippet explainer()}
		<p>
			A JSON Web Token is three Base64URL segments joined by dots: a header saying how it was signed,
			a payload of claims, and a signature over the first two.
		</p>
		<code class="formula">signature = HMACSHA256(base64url(header) + "." + base64url(payload), secret)</code>
		<h3>The payload is not secret</h3>
		<p>
			Base64 is encoding, not encryption. Anyone with the token can read every claim in it — as this
			page just demonstrated. Never put anything confidential in a JWT payload. The signature
			guarantees the claims have not been <em>altered</em>; it does not hide them.
		</p>
		<h3>The <code>alg: none</code> attack</h3>
		<p>
			The specification permits an “unsecured” token with no signature. Several early libraries
			accepted such a token as valid, letting an attacker strip the signature and forge any claims
			they liked. Always pin the expected algorithm server-side rather than trusting the header.
		</p>
		<h3>Registered claims</h3>
		<dl>
			<dt>iss, sub, aud</dt><dd>Who issued it, who it is about, who it is for.</dd>
			<dt>exp, nbf, iat</dt><dd>Expiry, not-before and issued-at, all as Unix seconds.</dd>
			<dt>jti</dt><dd>A unique ID, used for revocation lists and replay prevention.</dd>
		</dl>
		<h3>Expiry does not equal revocation</h3>
		<p>
			A signed JWT stays valid until <code>exp</code> passes, whatever happens on the server. If you
			need to revoke access immediately, you need short expiry times plus a refresh-token flow, or a
			server-side denylist keyed on <code>jti</code>.
		</p>
	{/snippet}
</ToolShell>

<style>
	textarea {
		min-height: 110px;
		font-size: 0.82rem;
		word-break: break-all;
	}
	.segments {
		word-break: break-all;
		line-height: 1.7;
	}
	.seg.header {
		color: var(--negative);
	}
	.seg.payload {
		color: var(--accent);
	}
	.seg.signature {
		color: var(--positive);
	}
	.dot {
		color: var(--text-faint);
	}
	h2 {
		font-size: 1rem;
		margin-bottom: 0.6rem;
	}
	.header-title {
		color: var(--negative);
	}
	.payload-title {
		color: var(--accent);
	}
	.signature-title {
		color: var(--positive);
	}
	.json {
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
		overflow-x: auto;
		font-size: 0.82rem;
		line-height: 1.6;
		margin: 0;
	}
	.sig {
		word-break: break-all;
		white-space: pre-wrap;
		margin-top: 0.5rem;
	}
</style>
