<script lang="ts">
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({ cidr: '192.168.1.130/26' });

	function parseIp(text: string): number | null {
		const parts = text.trim().split('.');
		if (parts.length !== 4) return null;
		let value = 0;
		for (const part of parts) {
			if (!/^\d{1,3}$/.test(part)) return null;
			const octet = Number(part);
			if (octet > 255) return null;
			value = (value * 256) + octet;
		}
		return value;
	}

	const formatIp = (value: number) =>
		[24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');

	const parsed = $derived.by(() => {
		const [ipText, prefixText] = s.cidr.trim().split('/');
		const ip = parseIp(ipText ?? '');
		const prefix = prefixText === undefined ? 32 : Number(prefixText);
		if (ip === null) return { ok: false as const, error: 'Enter a valid IPv4 address, e.g. 192.168.1.1' };
		if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
			return { ok: false as const, error: 'The prefix must be between 0 and 32' };
		}

		// Shifting by 32 is undefined in JS, so build the mask arithmetically.
		const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
		const network = (ip & mask) >>> 0;
		const broadcast = (network | (~mask >>> 0)) >>> 0;
		const total = Math.pow(2, 32 - prefix);
		const usable = prefix >= 31 ? (prefix === 31 ? 2 : 1) : total - 2;

		return {
			ok: true as const,
			ip, prefix, mask, network, broadcast, total, usable,
			first: prefix >= 31 ? network : network + 1,
			last: prefix >= 31 ? broadcast : broadcast - 1,
			wildcard: (~mask >>> 0)
		};
	});

	const isPrivate = $derived.by(() => {
		if (!parsed.ok) return false;
		const ip = parsed.ip;
		return (
			(ip >>> 24) === 10 ||
			((ip >>> 20) === 0xac1) ||
			((ip >>> 16) === 0xc0a8) ||
			((ip >>> 24) === 127
		));
	});

	const ipClass = $derived.by(() => {
		if (!parsed.ok) return '';
		const first = parsed.ip >>> 24;
		if (first < 128) return 'A';
		if (first < 192) return 'B';
		if (first < 224) return 'C';
		if (first < 240) return 'D (multicast)';
		return 'E (reserved)';
	});

	const binary = (value: number) =>
		[24, 16, 8, 0].map((shift) => ((value >>> shift) & 255).toString(2).padStart(8, '0')).join('.');

	const PREFIXES = [8, 16, 20, 22, 24, 25, 26, 27, 28, 29, 30];
</script>

<ToolShell {tool}>
	<div class="card stack">
		<Field label="IPv4 address with prefix" for="sn-cidr" error={!parsed.ok ? parsed.error : undefined}>
			<input id="sn-cidr" type="text" class="mono big" bind:value={s.cidr} autocomplete="off" spellcheck="false" />
		</Field>

		{#if parsed.ok}
			<div class="results-grid">
				<Result label="Network address" primary value={formatIp(parsed.network)} detail={`/${parsed.prefix}`} />
				<Result label="Broadcast address" primary value={formatIp(parsed.broadcast)} />
				<Result label="Usable host range" value={parsed.usable > 0 ? `${formatIp(parsed.first)} – ${formatIp(parsed.last)}` : 'None'} />
				<Result label="Usable hosts" value={parsed.usable.toLocaleString('en-US')} detail={`${parsed.total.toLocaleString('en-US')} addresses total`} />
				<Result label="Subnet mask" value={formatIp(parsed.mask)} />
				<Result label="Wildcard mask" value={formatIp(parsed.wildcard)} detail="Used in ACLs and OSPF" />
				<Result label="Class" value={ipClass} />
				<Result label="Scope" value={isPrivate ? 'Private / loopback' : 'Public'} tone={isPrivate ? 'neutral' : 'warning'} />
			</div>

			<div class="binary">
				<div class="bin-row"><span class="bin-label">Address</span><code>{binary(parsed.ip)}</code></div>
				<div class="bin-row"><span class="bin-label">Mask</span><code class="mask">{binary(parsed.mask)}</code></div>
				<div class="bin-row"><span class="bin-label">Network</span><code>{binary(parsed.network)}</code></div>
			</div>
		{/if}
	</div>

	<section class="card">
		<h2>Prefix reference</h2>
		<div class="scroll-x">
			<table class="data">
				<thead><tr><th class="num">Prefix</th><th>Mask</th><th class="num">Addresses</th><th class="num">Usable hosts</th></tr></thead>
				<tbody>
					{#each PREFIXES as prefix (prefix)}
						{@const mask = (0xffffffff << (32 - prefix)) >>> 0}
						<tr class:active={parsed.ok && parsed.prefix === prefix}>
							<td class="num">/{prefix}</td>
							<td class="mono">{formatIp(mask)}</td>
							<td class="num">{Math.pow(2, 32 - prefix).toLocaleString('en-US')}</td>
							<td class="num">{(Math.pow(2, 32 - prefix) - 2).toLocaleString('en-US')}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<Note>
		Private ranges — <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code> and
		<code>192.168.0.0/16</code> — are reserved by RFC 1918 for internal networks and are never routed
		on the public internet.
	</Note>

	{#snippet explainer()}
		<p>
			An IPv4 address is 32 bits. CIDR notation splits it with a slash: the prefix says how many
			leading bits identify the <em>network</em>, and the rest identify the <em>host</em> within it.
		</p>
		<code class="formula">192.168.1.130/26
  mask      = 26 ones then 6 zeros = 255.255.255.192
  network   = address AND mask     = 192.168.1.128
  broadcast = network OR ~mask     = 192.168.1.191
  hosts     = 2^(32−26) − 2        = 62</code>
		<h3>Why two addresses are unusable</h3>
		<p>
			The all-zeros host address identifies the network itself, and the all-ones address is the
			broadcast. Neither can be assigned to a device, which is why a /24 gives 254 usable addresses
			rather than 256.
		</p>
		<h3>The /31 and /32 exceptions</h3>
		<p>
			RFC 3021 allows /31 on point-to-point links, where both addresses are usable because there is
			nobody to broadcast to. A /32 is a single host route, used for loopbacks and specific-host
			firewall rules.
		</p>
		<h3>Reading a prefix quickly</h3>
		<p>
			Each bit you take from the host portion halves the number of addresses. /24 is 256, /25 is 128,
			/26 is 64, /27 is 32. Going the other way, /23 is two /24s, /22 is four. Most subnetting
			questions are that doubling and halving.
		</p>
		<h3>Classes are historical</h3>
		<p>
			Class A, B and C were the pre-1993 allocation scheme, replaced by CIDR precisely because fixed
			class boundaries wasted enormous numbers of addresses. The class is shown above because it
			still appears in documentation and exams, not because it affects routing.
		</p>
	{/snippet}
</ToolShell>

<style>
	.big {
		font-size: 1.15rem;
	}
	.binary {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.75rem;
		background: var(--bg-sunken);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		overflow-x: auto;
	}
	.bin-row {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		font-size: 0.82rem;
	}
	.bin-label {
		width: 70px;
		flex: none;
		color: var(--text-muted);
	}
	.mask {
		color: var(--accent);
	}
	tr.active {
		background: var(--accent-soft);
		font-weight: 600;
	}
	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.7rem;
	}
</style>
