<script lang="ts">
	import { encodeQr, maxBytes, toSvg, type ErrorCorrection } from '$lib/qr/qr';
	import { urlState } from '$lib/state/urlstate.svelte';
	import type { Tool } from '$lib/catalog';
	import ToolShell from '$lib/components/ToolShell.svelte';
	import Result from '$lib/components/Result.svelte';
	import Field from '$lib/components/Field.svelte';
	import Note from '$lib/components/Note.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { tool }: { tool: Tool } = $props();

	const s = urlState({
		text: 'https://github.com/snipet/toolsdotseanfunk',
		ec: 'M',
		dark: '#191917',
		light: '#ffffff',
		scale: 8,
		margin: 4
	});

	const result = $derived.by(() => {
		if (!s.text) return { ok: false as const, error: 'Enter some text or a URL.' };
		try {
			return { ok: true as const, code: encodeQr(s.text, s.ec as ErrorCorrection) };
		} catch (err) {
			return { ok: false as const, error: err instanceof Error ? err.message : 'Could not encode' };
		}
	});

	const svg = $derived(
		result.ok ? toSvg(result.code, { dark: s.dark, light: s.light, margin: s.margin }) : ''
	);

	const byteLength = $derived(new TextEncoder().encode(s.text).length);

	function downloadSvg() {
		const blob = new Blob([svg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'qr-code.svg';
		a.click();
		URL.revokeObjectURL(url);
	}

	function downloadPng() {
		if (!result.ok) return;
		const code = result.code;
		const total = code.size + s.margin * 2;
		const pixels = total * s.scale;
		const canvas = document.createElement('canvas');
		canvas.width = pixels;
		canvas.height = pixels;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.fillStyle = s.light;
		ctx.fillRect(0, 0, pixels, pixels);
		ctx.fillStyle = s.dark;
		for (let r = 0; r < code.size; r++) {
			for (let c = 0; c < code.size; c++) {
				if (code.modules[r][c]) {
					ctx.fillRect((c + s.margin) * s.scale, (r + s.margin) * s.scale, s.scale, s.scale);
				}
			}
		}
		canvas.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'qr-code.png';
			a.click();
			URL.revokeObjectURL(url);
		});
	}

	const PRESETS = [
		{ label: 'Website', value: 'https://example.com' },
		{ label: 'Email', value: 'mailto:hello@example.com?subject=Hello' },
		{ label: 'Phone', value: 'tel:+15551234567' },
		{ label: 'SMS', value: 'sms:+15551234567?body=Hi' },
		{ label: 'Wi-Fi', value: 'WIFI:T:WPA;S:MyNetwork;P:MyPassword;;' },
		{ label: 'Contact card', value: 'BEGIN:VCARD\nVERSION:3.0\nN:Lovelace;Ada\nTEL:+15551234567\nEMAIL:ada@example.com\nEND:VCARD' },
		{ label: 'Location', value: 'geo:51.5007,-0.1246' }
	];

	const EC_LEVELS: Array<{ value: ErrorCorrection; label: string; recovery: string }> = [
		{ value: 'L', label: 'Low', recovery: '~7% recoverable' },
		{ value: 'M', label: 'Medium', recovery: '~15% recoverable' },
		{ value: 'Q', label: 'Quartile', recovery: '~25% recoverable' },
		{ value: 'H', label: 'High', recovery: '~30% recoverable' }
	];
</script>

<ToolShell {tool}>
	<div class="layout">
		<div class="card stack controls">
			<Field label="Content" for="qr-text" error={!result.ok ? result.error : undefined}>
				<textarea id="qr-text" bind:value={s.text} rows="4" spellcheck="false"></textarea>
			</Field>

			<div class="presets no-print">
				{#each PRESETS as preset (preset.label)}
					<button type="button" class="btn btn-sm" onclick={() => (s.text = preset.value)}>{preset.label}</button>
				{/each}
			</div>

			<Field label="Error correction" for="qr-ec">
				<select id="qr-ec" bind:value={s.ec}>
					{#each EC_LEVELS as level (level.value)}
						<option value={level.value}>{level.value} — {level.label} ({level.recovery})</option>
					{/each}
				</select>
			</Field>

			<div class="field-row">
				<Field label="Foreground" for="qr-dark"><input id="qr-dark" type="color" bind:value={s.dark} /></Field>
				<Field label="Background" for="qr-light"><input id="qr-light" type="color" bind:value={s.light} /></Field>
			</div>

			<div class="field-row">
				<Field label="Module size: {s.scale}px" for="qr-scale">
					<input id="qr-scale" type="range" min="2" max="24" bind:value={s.scale} />
				</Field>
				<Field label="Quiet zone: {s.margin}" for="qr-margin" hint="4 modules is the specified minimum">
					<input id="qr-margin" type="range" min="0" max="10" bind:value={s.margin} />
				</Field>
			</div>
		</div>

		<div class="card preview">
			{#if result.ok}
				<div class="qr-wrap">
					{@html svg}
				</div>
				<div class="meta">
					<Result label="Version" value={`${result.code.version} (${result.code.size}×${result.code.size})`} copyable={false} />
					<Result label="Data" value={`${byteLength} bytes`} detail={`Up to ${maxBytes(s.ec as ErrorCorrection).toLocaleString('en-US')} at level ${s.ec}`} copyable={false} />
				</div>
				<div class="row no-print">
					<button type="button" class="btn btn-primary" onclick={downloadPng}><Icon name="download" size={16} /> PNG</button>
					<button type="button" class="btn" onclick={downloadSvg}><Icon name="download" size={16} /> SVG</button>
				</div>
			{:else}
				<p class="muted">{result.error}</p>
			{/if}
		</div>
	</div>

	<Note>
		The code is generated in this tab by an encoder written from ISO/IEC 18004 — nothing is sent to a
		QR service, so whatever you encode (a Wi-Fi password, a private link) stays on your machine.
	</Note>

	{#snippet explainer()}
		<p>
			A QR code stores data as a grid of light and dark modules, wrapped in enough redundancy that it
			still reads when part of it is damaged, dirty or obscured.
		</p>
		<h3>Error correction is why they survive</h3>
		<p>
			Reed–Solomon coding adds check symbols so the reader can reconstruct missing data. Level L
			tolerates about 7% loss, level H about 30% — which is what makes it possible to place a logo in
			the middle of a code and still have it scan. Higher correction costs capacity: the same text at
			level H needs a physically larger code than at level L.
		</p>
		<h3>Versions</h3>
		<p>
			Version 1 is 21×21 modules; each version adds 4 modules per side up to version 40 at 177×177.
			This tool picks the smallest version that fits your data at the chosen level.
		</p>
		<h3>The quiet zone matters</h3>
		<p>
			The specification requires four modules of blank margin on every side. Scanners use it to find
			the code's boundary, and codes printed flush against other artwork frequently fail to read for
			exactly this reason. Do not set it below 4 for anything you intend to print.
		</p>
		<h3>Contrast and inversion</h3>
		<p>
			Most scanners expect dark modules on a light background. Inverting the colours, or using a
			low-contrast pair, breaks a surprising number of readers. Keep the foreground genuinely dark
			and test on more than one phone before printing a thousand of them.
		</p>
		<h3>Useful content formats</h3>
		<dl>
			<dt><code>WIFI:T:WPA;S:name;P:password;;</code></dt><dd>Joins a network on scan.</dd>
			<dt><code>mailto:</code>, <code>tel:</code>, <code>sms:</code></dt><dd>Open the relevant app pre-filled.</dd>
			<dt><code>geo:lat,long</code></dt><dd>Opens a map pin.</dd>
			<dt>vCard</dt><dd>Adds a contact. Keep it short — vCards get big fast, and a dense code is harder to scan.</dd>
		</dl>
	{/snippet}

	{#snippet sources()}
		<p>
			Implemented from <strong>ISO/IEC 18004</strong> (QR Code bar code symbology specification):
			byte-mode encoding, Reed–Solomon over GF(256) with primitive polynomial 0x11D, block
			interleaving, and mask selection by the four penalty rules. Verified by a round-trip decode and
			a syndrome check in the test suite.
		</p>
	{/snippet}
</ToolShell>

<style>
	.layout {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
		align-items: start;
	}
	.preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		position: sticky;
		top: 5rem;
	}
	.qr-wrap {
		width: min(100%, 320px);
	}
	.qr-wrap :global(svg) {
		width: 100%;
		height: auto;
		border-radius: var(--radius-sm);
	}
	.meta {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: 1fr 1fr;
		width: 100%;
	}
	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	textarea {
		min-height: 100px;
		font-size: 0.9rem;
	}
	@media (max-width: 820px) {
		.layout {
			grid-template-columns: 1fr;
		}
		.preview {
			position: static;
		}
	}
</style>
